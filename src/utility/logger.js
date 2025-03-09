import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../../config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.resolve(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Get log level from config or environment
const logLevel = config.logging?.level || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const maxSize = config.logging?.fileRotationSize || 5242880; // 5MB
const maxFiles = config.logging?.maxFiles || 5;

// Create the logger
const logger = winston.createLogger({
  level: logLevel,
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport - general log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'anubis.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
    }),
    // Error log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: maxSize,
      maxFiles: maxFiles,
    })
  ],
});

// Create a child logger with context
const createChildLogger = (context) => {
  const childLoggerMethods = {};
  
  ['error', 'warn', 'info', 'http', 'debug'].forEach(level => {
    childLoggerMethods[level] = (message, meta = {}) => 
      logger[level](message, { ...meta, context });
  });
  
  return childLoggerMethods;
};

// Express middleware for request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
};

// Helper methods for different log levels
export default {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  createChildLogger,
  requestLogger,
};