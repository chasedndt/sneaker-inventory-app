// src/utils/logger.ts
// Safe logging utility that respects production environment

export const safeLog = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(...args);
    }
  }
};

// For production, we only log critical errors
export const productionSafeLog = {
  error: (...args: any[]) => {
    // Always log errors, but sanitize them
    const sanitizedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Remove sensitive fields from objects
        const sanitized = { ...arg };
        const sensitiveFields = ['token', 'password', 'uid', 'email', 'apiKey'];
        sensitiveFields.forEach(field => {
          if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
          }
        });
        return sanitized;
      }
      return arg;
    });
    console.error(...sanitizedArgs);
  }
}; 