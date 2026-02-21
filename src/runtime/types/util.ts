/** Utility type to convert kebab-case to camelCase */
export type CamelCase<S extends string> = S extends `${infer First}-${infer Rest}`
  ? `${Lowercase<First>}${Capitalize<CamelCase<Rest>>}`
  : S;

export type MaybeArray<T> = T | T[];

/** Remove all occurrences of a character `C` from string `S` */
export type RemoveChar<
  S extends string,
  C extends string
> = S extends `${infer A}${C}${infer B}` ? RemoveChar<`${A}${B}`, C> : S;

/** Strip parentheses characters '(' and ')' from a string */
export type StripParentheses<S extends string> = RemoveChar<RemoveChar<S, '('>, ')'>;
