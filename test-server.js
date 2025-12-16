try {
  console.log('Loading config...');
  const config = require('./config');
  console.log('Config loaded, port:', config.port);

  console.log('Loading Logger...');
  const Logger = require('./src/utils/Logger');
  console.log('Logger loaded');

  console.log('Loading Express...');
  const express = require('express');
  console.log('Express loaded');

  console.log('Creating app...');
  const app = express();
  console.log('App created');

  console.log('Starting server on port', config.port);
  app.listen(config.port, () => {
    console.log('✅ Server running on port', config.port);
  });
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
