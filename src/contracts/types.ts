import type { z } from "zod";

import { HTTP_METHODS } from "./http";

/**
 * Prettifies a type by removing any unnecessary intersections or unions, making it
 * easier to read and understand.
 *
 * @template T - The type to be prettified.
 * @example
 * type ComplexType = { a: number; } & { b: string; };
 * type PrettifiedType = Prettify<ComplexType>; // Result: { a: number; b: string; }
 */
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type RouteRequestSchemas = {
  body?: z.ZodType;
  formData?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

export type JsonResponseDefinition<Schema extends z.ZodType = z.ZodType> = {
  contentType: "application/json";
  schema: Schema;
};

export type NoContentResponseDefinition = {
  contentType: null;
};

export type RouteResponseDefinition = JsonResponseDefinition | NoContentResponseDefinition;

type ExclusiveRequestBody = { body?: never; formData?: z.ZodType } | { body?: z.ZodType; formData?: never };

export type RouteMethodContract = Prettify<
  Omit<RouteRequestSchemas, "body" | "formData"> &
    ExclusiveRequestBody & {
      responses: Record<number, RouteResponseDefinition>;
    }
>;

export type RouteContract = Partial<Record<HttpMethod, RouteMethodContract>>;

/** Generated request and response schemas emitted for client-only consumers. */
export type ResolvedRouteMethodContract = {
  request: z.ZodType;
  responses: Record<number, z.ZodType>;
};

/** Method-keyed route contract generated from portable runtime schemas. */
export type ResolvedRouteContract = Partial<Record<HttpMethod, ResolvedRouteMethodContract>>;

export type AnyRouteMethodContract = RouteMethodContract | ResolvedRouteMethodContract;
export type AnyRouteContract = RouteContract | ResolvedRouteContract;

type RequestSchemaKey = keyof RouteRequestSchemas;

type SchemaAt<Contract, Key extends RequestSchemaKey> =
  Contract extends Record<Key, infer Schema extends z.ZodType> ? Schema : never;

type ConfiguredRequestKey<Contract> = {
  [Key in RequestSchemaKey]: Contract extends Record<Key, z.ZodType> ? Key : never;
}[RequestSchemaKey];

type OptionalInputKey<Contract> = {
  [Key in ConfiguredRequestKey<Contract>]: undefined extends z.input<SchemaAt<Contract, Key>> ? Key : never;
}[ConfiguredRequestKey<Contract>];

type OptionalOutputKey<Contract> = {
  [Key in ConfiguredRequestKey<Contract>]: undefined extends z.output<SchemaAt<Contract, Key>> ? Key : never;
}[ConfiguredRequestKey<Contract>];

type Simplify<Value> = {
  [Key in keyof Value]: Value[Key];
};

export type RouteInput<Contract extends RouteMethodContract> = Simplify<
  {
    [Key in Exclude<ConfiguredRequestKey<Contract>, OptionalOutputKey<Contract>>]: z.output<SchemaAt<Contract, Key>>;
  } & {
    [Key in OptionalOutputKey<Contract>]?: z.output<SchemaAt<Contract, Key>>;
  }
>;

export type RouteRequest<Contract extends AnyRouteMethodContract> = Contract extends ResolvedRouteMethodContract
  ? z.input<Contract["request"]>
  : Contract extends RouteMethodContract
    ? Simplify<
        {
          [Key in Exclude<ConfiguredRequestKey<Contract>, OptionalInputKey<Contract>>]: z.input<
            SchemaAt<Contract, Key>
          >;
        } & {
          [Key in OptionalInputKey<Contract>]?: z.input<SchemaAt<Contract, Key>>;
        }
      >
    : never;

export type RouteResponseStatus<Contract extends AnyRouteMethodContract> = keyof Contract["responses"] & number;

export type JsonRouteResponseStatus<Contract extends RouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: Contract["responses"][Status] extends JsonResponseDefinition
    ? Status
    : never;
}[RouteResponseStatus<Contract>];

export type NoContentRouteResponseStatus<Contract extends RouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: Contract["responses"][Status] extends NoContentResponseDefinition
    ? Status
    : never;
}[RouteResponseStatus<Contract>];

type ResponseData<Definition extends RouteResponseDefinition> =
  Definition extends JsonResponseDefinition<infer Schema> ? z.output<Schema> : undefined;

export type RouteResponseData<
  Contract extends AnyRouteMethodContract,
  Status extends RouteResponseStatus<Contract>,
> = Contract extends ResolvedRouteMethodContract
  ? z.output<Contract["responses"][Status]>
  : Contract extends RouteMethodContract
    ? ResponseData<Contract["responses"][Status]>
    : never;

export type RouteResponse<Contract extends AnyRouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: {
    data: RouteResponseData<Contract, Status>;
    status: Status;
  };
}[RouteResponseStatus<Contract>];
