const fs = require('fs');
const path = require('path');
const os = require('os');
const PATHS_CONFIG = require('../config/PATHS_CONFIG');

/**
 * FileMapping - Persistent storage of server ↔ local file mappings
 * Single source of truth for which files are on server vs local
 * Used for continuous monitoring and auto-sync
 * 
 * Stores all files in: D:\Borok\Private\_CODING\BRK_CNC_System\hyperMill_ServerFile_Copies\
 */
class FileMapping {
  constructor() {
    this.mapDir = PATHS_CONFIG.getMetadataDir();
    this.mapFile = PATHS_CONFIG.getFileMappingPath();
    this.currentFilesDir = PATHS_CONFIG.getCurrentFilesDir();
    this.backupsDir = PATHS_CONFIG.getBackupsDir();
    this.mappings = {}; // { localPath: { serverPath, status, lastChecked, lastServerModified, lastLocalModified } }
    
    // Load existing mappings if available
    this.loadMappings();
  }

  /**
   * Ensure all required directories exist
   */
  ensureDirectories() {
    const dirs = [
      PATHS_CONFIG.serverFilesCacheDir,
      this.mapDir,
      this.currentFilesDir,
      this.backupsDir,
      PATHS_CONFIG.getHistoryDir(),
      PATHS_CONFIG.getLogsDir()
    ];

    dirs.forEach(dir => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`✓ Created directory: ${dir}`);
        }
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error.message);
      }
    });
  }

  /**
   * Load existing mappings from file
   */
  loadMappings() {
    try {
      if (fs.existsSync(this.mapFile)) {
        const data = fs.readFileSync(this.mapFile, 'utf8');
        this.mappings = JSON.parse(data);
        console.log(`✓ Loaded ${Object.keys(this.mappings).length} file mappings`);
      }
    } catch (error) {
      console.warn('Could not load mappings:', error.message);
      this.mappings = {};
    }
  }

  /**
   * Save mappings to file
   */
  saveMappings() {
    try {
      fs.writeFileSync(this.mapFile, JSON.stringify(this.mappings, null, 2));
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  }

  /**
   * Add a new file mapping
   * @param {string} serverPath - Where file lives on server (P:\, Y:\, etc.)
   * @param {string} localPath - Where file is cached locally (C:\cache\)
   * @param {string} fileType - Type: 'config', 'tool-db', 'automation', etc.
   */
  addMapping(serverPath, localPath, fileType = 'other') {
    try {
      if (!this.isServerPath(serverPath)) {
        return {
          success: false,
          error: `Not a server path: ${serverPath}`
        };
      }

      // Check if server file exists
      if (!fs.existsSync(serverPath)) {
        return {
          success: false,
          error: `Server file not found: ${serverPath}`
        };
      }

      const serverStats = fs.statSync(serverPath);

      this.mappings[localPath] = {
        serverPath: serverPath,
        fileType: fileType,
        status: 'unmapped', // Will be 'synced', 'outdated', 'new', 'error'
        createdAt: new Date().toISOString(),
        lastChecked: null,
        lastServerModified: serverStats.mtime.toISOString(),
        lastServerSize: serverStats.size,
        lastLocalModified: null,
        lastLocalSize: null,
        syncHistory: [],
        checkCount: 0,
        syncCount: 0
      };

      this.saveMappings();

      return {
        success: true,
        message: `✓ Mapping added`,
        mapping: this.mappings[localPath]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if server file has been updated since last check
   * @param {string} localPath - Local path key
   */
  checkForServerUpdate(localPath) {
    try {
      const mapping = this.mappings[localPath];

      if (!mapping) {
        return {
          success: false,
          error: `No mapping found for: ${localPath}`
        };
      }

      if (!fs.existsSync(mapping.serverPath)) {
        return {
          success: true,
          hasUpdate: false,
          status: 'server-file-missing',
          error: `Server file missing: ${mapping.serverPath}`
        };
      }

      const serverStats = fs.statSync(mapping.serverPath);
      const currentServerModified = serverStats.mtime.getTime();
      const lastServerModified = new Date(mapping.lastServerModified).getTime();

      const hasUpdate = currentServerModified > lastServerModified;

      // Update check info
      mapping.lastChecked = new Date().toISOString();
      mapping.checkCount = (mapping.checkCount || 0) + 1;

      if (hasUpdate) {
        mapping.status = 'outdated';
        mapping.serverUpdateDetected = new Date().toISOString();
      } else {
        mapping.status = 'current';
      }

      this.saveMappings();

      return {
        success: true,
        hasUpdate: hasUpdate,
        status: mapping.status,
        serverPath: mapping.serverPath,
        localPath: localPath,
        serverModified: serverStats.mtime.toISOString(),
        lastKnownModified: mapping.lastServerModified,
        diffMs: currentServerModified - lastServerModified,
        diffDays: Math.round((currentServerModified - lastServerModified) / (1000 * 60 * 60 * 24)),
        serverSize: this.formatBytes(serverStats.size),
        lastKnownSize: this.formatBytes(mapping.lastServerSize),
        sizeChanged: serverStats.size !== mapping.lastServerSize
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark file as synced (after copying from server to local)
   * @param {string} localPath - Local path key
   */
  markAsSynced(localPath) {
    try {
      const mapping = this.mappings[localPath];

      if (!mapping) {
        return {
          success: false,
          error: `No mapping found: ${localPath}`
        };
      }

      if (!fs.existsSync(mapping.serverPath)) {
        return {
          success: false,
          error: `Server file missing: ${mapping.serverPath}`
        };
      }

      const serverStats = fs.statSync(mapping.serverPath);

      mapping.status = 'synced';
      mapping.lastServerModified = serverStats.mtime.toISOString();
      mapping.lastServerSize = serverStats.size;
      mapping.lastSyncedAt = new Date().toISOString();
      mapping.syncCount = (mapping.syncCount || 0) + 1;

      // Track sync history (keep last 10)
      if (!mapping.syncHistory) {
        mapping.syncHistory = [];
      }
      mapping.syncHistory.push({
        syncedAt: new Date().toISOString(),
        serverModified: mapping.lastServerModified,
        serverSize: serverStats.size
      });
      if (mapping.syncHistory.length > 10) {
        mapping.syncHistory = mapping.syncHistory.slice(-10);
      }

      this.saveMappings();

      return {
        success: true,
        message: `✓ Marked as synced`,
        mapping: mapping
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all mappings with a specific status
   * @param {string} status - 'synced', 'outdated', 'unmapped', 'error'
   */
  getMappingsByStatus(status) {
    const results = Object.entries(this.mappings)
      .filter(([_, mapping]) => mapping.status === status)
      .map(([localPath, mapping]) => ({ localPath, ...mapping }));

    return {
      success: true,
      status: status,
      count: results.length,
      mappings: results
    };
  }

  /**
   * Get all mappings
   */
  getAllMappings() {
    return {
      success: true,
      count: Object.keys(this.mappings).length,
      mappings: Object.entries(this.mappings).map(([localPath, mapping]) => ({
        localPath,
        ...mapping
      }))
    };
  }

  /**
   * Get statistics about all mappings
   */
  getStatistics() {
    const stats = {
      totalMappings: Object.keys(this.mappings).length,
      bySynced: 0,
      byOutdated: 0,
      byUnmapped: 0,
      byError: 0,
      totalChecks: 0,
      totalSyncs: 0,
      averageCheckInterval: null,
      lastCheckTimes: []
    };

    Object.values(this.mappings).forEach(mapping => {
      stats[`by${mapping.status.charAt(0).toUpperCase()}${mapping.status.slice(1)}`] = 
        (stats[`by${mapping.status.charAt(0).toUpperCase()}${mapping.status.slice(1)}`] || 0) + 1;
      
      stats.totalChecks += mapping.checkCount || 0;
      stats.totalSyncs += mapping.syncCount || 0;

      if (mapping.lastChecked) {
        stats.lastCheckTimes.push(new Date(mapping.lastChecked).getTime());
      }
    });

    // Fix the key names
    stats.bySynced = stats.bySynced || (Object.values(this.mappings).filter(m => m.status === 'synced').length);
    stats.byOutdated = stats.byOutdated || (Object.values(this.mappings).filter(m => m.status === 'outdated').length);
    stats.byUnmapped = stats.byUnmapped || (Object.values(this.mappings).filter(m => m.status === 'unmapped').length);

    if (stats.lastCheckTimes.length > 0) {
      const timeDiffs = [];
      for (let i = 1; i < stats.lastCheckTimes.length; i++) {
        timeDiffs.push(stats.lastCheckTimes[i] - stats.lastCheckTimes[i - 1]);
      }
      stats.averageCheckInterval = timeDiffs.length > 0
        ? Math.round(timeDiffs.reduce((a, b) => a + b) / timeDiffs.length / 1000 / 60) + ' min'
        : 'N/A';
    }

    return stats;
  }

  /**
   * Get mapping by local path
   */
  getMapping(localPath) {
    const mapping = this.mappings[localPath];
    return mapping ? { success: true, mapping } : { success: false, error: 'Not found' };
  }

  /**
   * Remove a mapping
   */
  removeMapping(localPath) {
    if (this.mappings[localPath]) {
      delete this.mappings[localPath];
      this.saveMappings();
      return { success: true, message: 'Mapping removed' };
    }
    return { success: false, error: 'Mapping not found' };
  }

  /**
   * Check if path is on server drive
   */
  isServerPath(filePath) {
    if (filePath.startsWith('\\\\')) return true;
    const match = filePath.match(/^([A-Z]):/i);
    if (match) {
      const drive = match[1].toUpperCase();
      const localDrives = ['C', 'D', 'E', 'F'];
      return !localDrives.includes(drive);
    }
    return false;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get mapping file path
   */
  getMappingFilePath() {
    return this.mapFile;
  }
}

module.exports = FileMapping;
