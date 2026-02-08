import { camelCase } from "lodash-es";

/**
 * Format a string to PascalCase
 *
 * @param str - The input string to format
 * @returns The formatted string in PascalCase
 */
export const pascalCase = (str: string): string => {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

/**
 * Wrap a string with the specified wrapper
 *
 * @param str - The input string to wrap
 * @param wrapper - The wrapper string (e.g., quote character)
 * @returns The wrapped string
 */
export const wrapString = (str: string, wrapper: string): string => [wrapper, str, wrapper].join("");

/**
 * Wrap a string with double quotes
 *
 * @param str - The input string to wrap
 * @returns The wrapped string
 */
export const wrapDoubleQuotes = (str: string): string => wrapString(str, '"');
