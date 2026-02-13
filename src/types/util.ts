/** Utility type to convert kebab-case to camelCase */
export type CamelCase<S extends string> = S extends `${infer First}-${infer Rest}`
  ? `${Lowercase<First>}${Capitalize<CamelCase<Rest>>}`
  : S;

export type MaybeArray<T> = T | T[];
