const path = require('path');

/**
 * PATHS_CONFIG - Central configuration for all cache and storage locations
 * All server file copies are stored in a fixed, easy-to-find location on D: root
 */
const PATHS_CONFIG = {
  // Main server files cache directory
  // Located at root of D: drive for easy access
  serverFilesCacheDir: path.join('D:', 'BRK_CNC_System_Server_Copy'),

  // Subdirectories within the cache
  subdirs: {
    // Currently used server files (active copies)
    current: 'current',
    
    // Backups of previous versions before updates
    backups: 'backups',
    
    // Metadata and mapping files
    metadata: 'metadata',
    
    // File version history
    history: 'history',
    
    // Sync logs
    logs: 'logs'
  },

  // File mapping and metadata
  fileMapping: {
    // Where to store the file mapping index
    file: 'metadata/file-mapping.json',
    
    // Where to store sync history
    history: 'metadata/sync-history.json'
  },

  /**
   * Get full path to a subdirectory
   */
  getSubdir(subdir) {
    const full = path.join(this.serverFilesCacheDir, this.subdirs[subdir]);
    return full;
  },

  /**
   * Get full path to file mapping
   */
  getFileMappingPath() {
    return path.join(this.serverFilesCacheDir, this.fileMapping.file);
  },

  /**
   * Get full path to sync history
   */
  getSyncHistoryPath() {
    return path.join(this.serverFilesCacheDir, this.fileMapping.history);
  },

  /**
   * Get directory for current active copies
   */
  getCurrentFilesDir() {
    return this.getSubdir('current');
  },

  /**
   * Get directory for backups
   */
  getBackupsDir() {
    return this.getSubdir('backups');
  },

  /**
   * Get directory for metadata
   */
  getMetadataDir() {
    return this.getSubdir('metadata');
  },

  /**
   * Get directory for history
   */
  getHistoryDir() {
    return this.getSubdir('history');
  },

  /**
   * Get directory for logs
   */
  getLogsDir() {
    return this.getSubdir('logs');
  }
};

module.exports = PATHS_CONFIG;
