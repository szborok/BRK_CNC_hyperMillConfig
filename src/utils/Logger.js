const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

class Logger {
  constructor(context = 'App') {
    this.context = context;
    
    // Ensure logs directory exists
    const logsDir = config.logging.dir;
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'BRK_CNC_hyperMillConfig', context },
      transports: [
        // Write to file
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 7
        })
      ]
    });

    // Console output in development
    if (config.env !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, context: this.context });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, context: this.context });
  }

  error(message, meta = {}) {
    this.logger.error(message, { ...meta, context: this.context });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, context: this.context });
  }
}

module.exports = Logger;
