import {
  type Checker,
  ObjectFlags,
  SymbolFlags,
  type Type,
  TypeFlags,
  type TypeReference,
} from "@typescript/native/unstable/sync";

const propertyKey = (name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));

const literalSchema = (value: string | number | boolean): string => `z.literal(${JSON.stringify(value)})`;

export type ZodSchemaConverter = (type: Type) => string;

/**
 * Creates a converter from resolved TypeScript wire types to equivalent generated Zod schemas.
 * Conversions are memoized by type id, so types shared between contracts are converted once.
 *
 * @param checker - Checker of the program the types belong to
 * @returns A function converting a type to Zod schema source
 */
export const createZodSchemaConverter = (checker: Checker): ZodSchemaConverter => {
  const memo = new Map<number, string>();
  const inProgress = new Set<number>();

  const objectSchema = (type: Type): string => {
    const properties = checker.getPropertiesOfType(type);
    if (properties.length === 0) {
      const stringIndex = checker
        .getIndexInfosOfType(type)
        .find(({ keyType }) => (keyType.flags & TypeFlags.String) !== 0);
      if (stringIndex) return `z.record(z.string(), ${convert(stringIndex.valueType)})`;
    }

    const propertyTypes = properties.length > 0 ? checker.getTypeOfSymbol(properties) : [];
    const fields = properties.map((property, index) => {
      const propertyType = propertyTypes[index];
      if (!propertyType) throw new Error(`Cannot resolve the type of property ${property.name}`);
      try {
        const schema =
          property.flags & SymbolFlags.Optional ? `${definedSchema(propertyType)}.optional()` : convert(propertyType);
        return `${propertyKey(property.name)}: ${schema}`;
      } catch (error) {
        throw new Error(`Cannot generate a Zod schema for property ${property.name}`, { cause: error });
      }
    });
    return `z.strictObject({ ${fields.join(", ")} })`;
  };

  /** Schema for an optional property's type, without the `undefined` its optionality adds. */
  const definedSchema = (type: Type): string => {
    const definedTypes = type.isUnionType()
      ? type.getTypes().filter((member) => !(member.flags & TypeFlags.Undefined))
      : [type];
    const nonNullType =
      definedTypes.length === 2 && definedTypes.some((member) => member.flags & TypeFlags.Null)
        ? definedTypes.find((member) => !(member.flags & TypeFlags.Null))
        : undefined;
    if (nonNullType) return `${convert(nonNullType)}.nullable()`;
    if (definedTypes.length === 1 && definedTypes[0]) return convert(definedTypes[0]);
    return `z.union([${definedTypes.map(convert).join(", ")}])`;
  };

  const convertUncached = (type: Type): string => {
    const { flags } = type;
    if (flags & TypeFlags.String) return "z.string()";
    if (flags & TypeFlags.Number) return "z.number()";
    if (flags & TypeFlags.Boolean) return "z.boolean()";
    if (type.isStringLiteralType() || type.isNumberLiteralType()) return literalSchema(type.value);
    if (type.isBooleanLiteralType()) return literalSchema(type.value);
    if (flags & TypeFlags.Null) return "z.null()";
    if (flags & TypeFlags.Undefined) return "z.undefined()";
    if (flags & TypeFlags.Never) return "z.never()";
    if (flags & TypeFlags.Unknown) return "z.unknown()";
    if (flags & TypeFlags.Any) throw new Error(`Cannot generate a Zod schema for any: ${checker.typeToString(type)}`);

    if (type.isUnionType()) {
      const members = type.getTypes();
      if (members.length === 2) {
        const defined = members.find((member) => !(member.flags & TypeFlags.Undefined));
        if (defined && members.some((member) => member.flags & TypeFlags.Undefined)) {
          return `${convert(defined)}.optional()`;
        }
        const nonNull = members.find((member) => !(member.flags & TypeFlags.Null));
        if (nonNull && members.some((member) => member.flags & TypeFlags.Null)) return `${convert(nonNull)}.nullable()`;
      }
      return `z.union([${members.map(convert).join(", ")}])`;
    }

    if (type.isIntersectionType()) {
      return type
        .getTypes()
        .map(convert)
        .reduce((left, right) => `z.intersection(${left}, ${right})`);
    }

    if (type.isObjectType()) {
      // Each checker call is a round trip, so only named and generic types are inspected further.
      const { objectFlags } = type;
      if (objectFlags & (ObjectFlags.ClassOrInterface | ObjectFlags.Reference)) {
        const name = type.getSymbol()?.name;
        if (name === "Date" || name === "NativeDate") return "z.date()";
        if (name === "ObjectId") return "z.string()";
      }
      if (objectFlags & ObjectFlags.Reference) {
        if (checker.isTupleType(type)) {
          return `z.tuple([${checker
            .getTypeArguments(type as TypeReference)
            .map(convert)
            .join(", ")}])`;
        }
        if (checker.isArrayType(type)) {
          const [element] = checker.getTypeArguments(type as TypeReference);
          if (element) return `z.array(${convert(element)})`;
        }
      }
      return objectSchema(type);
    }

    throw new Error(`Cannot generate a Zod schema for type: ${checker.typeToString(type)}`);
  };

  const convert = (type: Type): string => {
    const cached = memo.get(type.id);
    if (cached !== undefined) return cached;
    if (inProgress.has(type.id)) {
      throw new Error(`Cannot generate a Zod schema for recursive type: ${checker.typeToString(type)}`);
    }
    inProgress.add(type.id);
    try {
      const schema = convertUncached(type);
      memo.set(type.id, schema);
      return schema;
    } finally {
      inProgress.delete(type.id);
    }
  };

  return convert;
};
