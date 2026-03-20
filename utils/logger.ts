export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.error(...args); // Errors are usually kept for debugging in production
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  }
};
