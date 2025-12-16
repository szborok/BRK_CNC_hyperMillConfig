const express = require('express');
const cors = require('cors');
const config = require('../config');
const Logger = require('./utils/Logger');

const app = express();
const logger = new Logger('Server');

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BRK_CNC_hyperMillConfig',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes (to be implemented)
// app.use('/api/v1/config', require('./routes/config'));
// app.use('/api/v1/macros', require('./routes/macros'));
// app.use('/api/v1/scripts', require('./routes/scripts'));
// app.use('/api/v1/library', require('./routes/library'));
// app.use('/api/v1/backup', require('./routes/backup'));
// app.use('/api/v1/automation', require('./routes/automation'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`hyperMILL Config Service started on port ${PORT}`, {
    env: config.env,
    dataDir: config.dataDir
  });
});

module.exports = app;
