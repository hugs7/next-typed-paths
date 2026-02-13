import { MaybeArray } from "../types";

/**
 * Ensures the provided value is returned as an array.
 * If the value is already an array, it is returned as-is.
 * Otherwise, the value is wrapped in a new array.
 *
 * @template T - The type of the value or array elements.
 * @param value - The value to ensure as an array. Can be a single value or an array of values.
 * @returns An array containing the provided value(s).
 */
export const ensureArray = <T>(value: MaybeArray<T>): T[] => {
  if (Array.isArray(value)) return value;
  return [value];
};
