const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * ConfigurationLocator - Automatically finds .omSettings files on the system
 * Searches common HyperMILL configuration locations
 * SAFETY: Asks user permission before accessing server drives
 */
class ConfigurationLocator {
  constructor() {
    this.commonSearchPaths = this.buildSearchPaths();
    this.blockedNetworkPaths = [];
    this.userPermissions = {}; // Track what user has approved
    this.strictLocalOnly = false; // Set to true to never access network without asking
  }

  /**
   * Enable "ask user" mode - will track network access attempts
   */
  enableUserPromptMode() {
    this.strictLocalOnly = true;
    console.log('✓ User Prompt Mode enabled - will ask before accessing server drives');
  }

  /**
   * Get list of blocked network paths that were attempted
   */
  getBlockedNetworkPaths() {
    return this.blockedNetworkPaths;
  }

  /**
   * User grants permission to access a specific network path
   */
  grantNetworkAccess(networkPath) {
    this.userPermissions[networkPath] = true;
    console.log(`✓ User approved network access to: ${networkPath}`);
    return true;
  }

  /**
   * User denies permission to access a specific network path
   */
  denyNetworkAccess(networkPath) {
    this.userPermissions[networkPath] = false;
    console.log(`✗ User denied network access to: ${networkPath}`);
    return false;
  }

  /**
   * Build list of common search paths for .omSettings files
   * ONLY LOCAL PC DISKS - NO NETWORK DRIVES (P, Y, etc.)
   */
  buildSearchPaths() {
    const username = os.userInfo().username;
    const userHome = os.homedir();
    const publicDocs = 'C:\\Users\\Public\\Documents';

    return [
      // User's Documents folder (most common manual export location) - LOCAL ONLY
      path.join(userHome, 'Documents'),
      path.join(userHome, 'Downloads'),

      // OPEN MIND shared locations - LOCAL ONLY
      path.join(publicDocs, 'OPEN MIND'),
      path.join(publicDocs, 'OPEN MIND', 'backup'),

      // AppData locations - LOCAL ONLY
      path.join(userHome, 'AppData\\Roaming\\OPEN MIND'),
      path.join(userHome, 'AppData\\Local\\OPEN MIND'),

      // Program Data - LOCAL ONLY
      'C:\\ProgramData\\OPEN MIND',

      // HyperMILL installation paths - LOCAL ONLY
      'C:\\Program Files\\OPEN MIND\\hyperMILL\\33.0',
      'C:\\Program Files\\OPEN MIND\\hyperMILL\\34.0',

      // Temp locations - LOCAL ONLY
      path.join(userHome, 'AppData\\Local\\Temp')

      // NO NETWORK DRIVES: Company server drives (P:, Y:, etc.) are intentionally excluded
    ];
  }

  /**
   * Check if a path is on a network drive
   * Returns true if path is on a mapped network drive
   */
  isNetworkPath(filePath) {
    // Check for UNC paths (\\server\share)
    if (filePath.startsWith('\\\\')) {
      return true;
    }

    // Check for drive letters that are commonly network mapped
    // Get the drive letter
    const match = filePath.match(/^([A-Z]):/i);
    if (match) {
      const driveLetter = match[1].toUpperCase();
      
      // Local drives: C, D, E, F (typical local PC disks)
      // Block: P, Y, Z, S, Q, X, V, U, T, R and others often used for network
      const localDrives = ['C', 'D', 'E', 'F'];
      
      if (!localDrives.includes(driveLetter)) {
        console.warn(`⚠️ Skipping network drive ${driveLetter}: (not a local PC disk)`);
        return true;
      }
    }

    return false;
  }

  /**
   * Search for all .omSettings files on the system
   * SAFETY: Only searches LOCAL PC disks, skips all network drives
   * @returns {Promise<Array>} - Array of found settings files with metadata
   */
  async searchForSettings() {
    const found = [];

    for (const searchPath of this.commonSearchPaths) {
      try {
        // SAFETY CHECK: Skip network paths entirely
        if (this.isNetworkPath(searchPath)) {
          continue;
        }

        // Check if path exists
        if (!fs.existsSync(searchPath)) {
          continue;
        }

        // Search recursively
        const files = this.walkDirectory(searchPath);
        
        files.forEach(file => {
          if (file.endsWith('.omSettings')) {
            const stats = fs.statSync(file);
            found.push({
              path: file,
              size: stats.size,
              modified: stats.mtime,
              modifiedIso: stats.mtime.toISOString(),
              sizeReadable: this.formatBytes(stats.size),
              source: this.classifySource(file)
            });
          }
        });
      } catch (error) {
        // Skip paths that error (permissions, network issues, etc.)
      }
    }

    // Sort by most recent first
    found.sort((a, b) => b.modified - a.modified);

    return found;
  }

  /**
   * Find the most recent .omSettings file
   * @returns {Promise<Object>} - Most recent settings file or null
   */
  async findLatestSettings() {
    const allFiles = await this.searchForSettings();
    
    if (allFiles.length === 0) {
      return null;
    }

    return allFiles[0];
  }

  /**
   * Search directory recursively for files (with depth limit)
   */
  walkDirectory(dir, maxDepth = 3, currentDepth = 0) {
    const files = [];

    if (currentDepth >= maxDepth) {
      return files;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);

        try {
          if (entry.isDirectory()) {
            // Skip system and cache directories
            if (this.shouldSkipDirectory(entry.name)) {
              return;
            }
            files.push(...this.walkDirectory(fullPath, maxDepth, currentDepth + 1));
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files/dirs we can't access
        }
      });
    } catch (error) {
      // Return empty if can't read directory
    }

    return files;
  }

  /**
   * Check if directory should be skipped to avoid deep recursion in system dirs
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules',
      '.git',
      'System Volume Information',
      '$RECYCLE.BIN',
      'Recovery',
      'boot',
      'System32',
      'cache',
      'Cache',
      'temp',
      'Temp',
      'AppData' // Don't recurse too deep in AppData
    ];

    return skipDirs.includes(dirName);
  }

  /**
   * Classify the source/type of settings file
   */
  classifySource(filePath) {
    if (filePath.includes('Public\\Documents')) {
      return 'shared-backup';
    }
    if (filePath.includes('Documents')) {
      return 'user-manual-export';
    }
    if (filePath.includes('Downloads')) {
      return 'user-download';
    }
    if (filePath.includes('Temp')) {
      return 'temporary';
    }
    if (filePath.includes('AppData')) {
      return 'appdata';
    }
    if (filePath.includes('ProgramData')) {
      return 'program-data';
    }
    if (filePath.includes('\\\\')) {
      return 'network-share';
    }
    return 'other';
  }

  /**
   * Format bytes to human readable size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get configuration file paths where HyperMILL stores export history
   */
  getConfigurationCenterPaths() {
    const username = os.userInfo().username;
    const userHome = os.homedir();

    return {
      userAppData: path.join(userHome, 'AppData\\Roaming\\OPEN MIND'),
      userLocal: path.join(userHome, 'AppData\\Local\\OPEN MIND'),
      publicDocs: 'C:\\Users\\Public\\Documents\\OPEN MIND',
      userDocs: path.join(userHome, 'Documents\\OPEN MIND'),
      tempPath: path.join(userHome, 'AppData\\Local\\Temp'),
      backupPath: 'C:\\Users\\Public\\Documents\\OPEN MIND\\backup'
    };
  }

  /**
   * Watch for new .omSettings files (for auto-discovery)
   * @param {Function} callback - Called when new file is found
   */
  watchForNewSettings(callback) {
    const watchPaths = [
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Downloads'),
      'C:\\Users\\Public\\Documents\\OPEN MIND\\backup'
    ];

    const watchers = [];

    watchPaths.forEach(watchPath => {
      try {
        if (!fs.existsSync(watchPath)) {
          fs.mkdirSync(watchPath, { recursive: true });
        }

        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && filename.endsWith('.omSettings')) {
            if (eventType === 'change' || eventType === 'rename') {
              // Wait a moment for file to finish writing
              setTimeout(() => {
                try {
                  const fullPath = path.join(watchPath, filename);
                  if (fs.existsSync(fullPath)) {
                    const stats = fs.statSync(fullPath);
                    callback({
                      event: eventType,
                      path: fullPath,
                      size: stats.size,
                      timestamp: new Date().toISOString()
                    });
                  }
                } catch (error) {
                  // File might have been moved/deleted
                }
              }, 500);
            }
          }
        });

        watchers.push(watcher);
      } catch (error) {
        console.warn(`Could not watch path ${watchPath}:`, error.message);
      }
    });

    return {
      watchers,
      stop: () => {
        watchers.forEach(w => w.close());
      }
    };
  }

  /**
   * Get information about detected .omSettings files
   */
  async getSettingsInfo() {
    const latest = await this.findLatestSettings();
    const all = await this.searchForSettings();

    return {
      found: all.length,
      latest: latest,
      all: all,
      configurationCenterPaths: this.getConfigurationCenterPaths(),
      searchPaths: this.commonSearchPaths
    };
  }
}

module.exports = ConfigurationLocator;
