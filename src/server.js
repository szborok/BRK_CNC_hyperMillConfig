const express = require('express');
const cors = require('cors');
const config = require('../config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BRK_CNC_hyperMillConfig',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/scan', require('./routes/scanRoutes'));
app.use('/api/profiles', require('./routes/profileRoutes'));
app.use('/api/discover', require('./routes/discoveryRoutes'));
// app.use('/api/v1/pool', require('./routes/pool'));
// app.use('/api/v1/company', require('./routes/company'));
// app.use('/api/v1/tracking', require('./routes/tracking'));
// app.use('/api/v1/distribution', require('./routes/distribution'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`✅ hyperMILL Config Service started on port ${PORT}`);
});

module.exports = app;
