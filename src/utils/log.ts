/**
 * @file log.ts
 * @description Dev-only logger. No-ops in production builds.
 *              Use instead of `console.*` so production bundles stay quiet
 *              while dev still gets full diagnostics.
 */

const DEV = import.meta.env.DEV;

export const log = (...args: unknown[]): void => {
  if (DEV) console.log(...args);
};

export const warn = (...args: unknown[]): void => {
  if (DEV) console.warn(...args);
};

export const error = (...args: unknown[]): void => {
  if (DEV) console.error(...args);
};
