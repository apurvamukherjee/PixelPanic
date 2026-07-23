const tag = (level: string) => `[pixelpanic:${level}]`;

export const logger = {
  info: (...args: unknown[]) => console.log(tag("info"), ...args),
  warn: (...args: unknown[]) => console.warn(tag("warn"), ...args),
  error: (...args: unknown[]) => console.error(tag("error"), ...args),
};
