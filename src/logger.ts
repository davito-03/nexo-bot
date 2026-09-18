const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);

export const logger = {
  info: (...args: unknown[]) => console.log(`[${stamp()}] [INFO]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${stamp()}] [WARN]`, ...args),
  error: (...args: unknown[]) => console.error(`[${stamp()}] [ERROR]`, ...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG) console.debug(`[${stamp()}] [DEBUG]`, ...args);
  },
};
