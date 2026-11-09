import { API } from "@typescript/native/unstable/sync";
import { join } from "path";

import { createZodSchemaConverter } from "./zodSchema";

/** Converts the `Wire` type alias declared in a virtual module. */
const wireToZodSchema = (source: string): string => {
  const directory = join(import.meta.dirname, "..", "test");
  const filePath = join(directory, "wire.virtual.ts");
  const configPath = join(directory, "tsconfig.wire.virtual.json");
  const config = JSON.stringify({ compilerOptions: { strict: true }, files: [filePath] });
  const api = new API({
    cwd: directory,
    fs: { readFile: (fileName) => (fileName === filePath ? source : fileName === configPath ? config : undefined) },
  });
  try {
    const { checker } = api.updateSnapshot({ openProjects: [configPath] }).getProject(configPath)!;
    const type = checker.getTypeAtPosition(filePath, source.indexOf("Wire"))!;
    return createZodSchemaConverter(checker)(type);
  } finally {
    api.close();
  }
};

describe("createZodSchemaConverter", () => {
  it("preserves nested wire types, dates, records, tuples, nulls, and optional fields", () => {
    const schema = wireToZodSchema(
      `type Wire = {
        createdAt: Date;
        label?: string | null;
        values: [number, boolean];
        metadata: Record<string, never>;
      };`,
    );

    expect(schema).toBe(
      "z.strictObject({ createdAt: z.date(), label: z.string().nullable().optional(), values: z.tuple([z.number(), z.boolean()]), metadata: z.record(z.string(), z.never()) })",
    );
  });

  it("represents MongoDB ObjectIds as JSON strings", () => {
    const schema = wireToZodSchema("type Wire = { id: ObjectId }; declare class ObjectId {}");

    expect(schema).toBe("z.strictObject({ id: z.string() })");
  });
});
