const fs = require('fs');
const path = require('path');
const os = require('os');
const PATHS_CONFIG = require('../config/PATHS_CONFIG');

/**
 * ServerFileMonitor - Tracks server file versions and notifies of updates
 * STRATEGY: Copy server files to local → use local → monitor for updates
 * User approves before syncing newer versions
 * 
 * All files stored in: D:\Borok\Private\_CODING\BRK_CNC_System\hyperMill_ServerFile_Copies\
 */
class ServerFileMonitor {
  constructor() {
    this.localCacheDir = PATHS_CONFIG.getCurrentFilesDir();
    this.backupsDir = PATHS_CONFIG.getBackupsDir();
    this.versionFile = path.join(PATHS_CONFIG.getMetadataDir(), 'file-versions.json');
    this.updateNotifications = [];
    this.serverFileMap = {}; // Maps local files to their server origins
    
    // Load existing version history if available
    this.loadVersionHistory();
  }

  /**
   * Load version tracking history
   */
  loadVersionHistory() {
    try {
      if (fs.existsSync(this.versionFile)) {
        const data = fs.readFileSync(this.versionFile, 'utf8');
        this.serverFileMap = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load version history:', error.message);
      this.serverFileMap = {};
    }
  }

  /**
   * Save version tracking history
   */
  saveVersionHistory() {
    try {
      fs.writeFileSync(this.versionFile, JSON.stringify(this.serverFileMap, null, 2));
    } catch (error) {
      console.error('Error saving version history:', error);
    }
  }

  /**
   * Copy file from server path to local cache
   * @param {string} serverPath - Original server path (P:\, Y:\, etc.)
   * @param {string} filename - Filename to cache
   * @returns {object} - { success, localPath, cached, size, sourceServer }
   */
  copyFromServerToLocal(serverPath, filename) {
    try {
      // Validate it's a server path
      if (!this.isServerPath(serverPath)) {
        return {
          success: false,
          error: `Not a server path: ${serverPath}`
        };
      }

      // Verify source file exists
      if (!fs.existsSync(serverPath)) {
        return {
          success: false,
          error: `Server file not found: ${serverPath}`
        };
      }

      // Generate cache filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      const cachedFilename = `${basename}_${timestamp}${ext}`;
      const localPath = path.join(this.localCacheDir, cachedFilename);

      // Copy file to local cache
      fs.copyFileSync(serverPath, localPath);
      const stats = fs.statSync(localPath);

      // Track the mapping
      this.serverFileMap[localPath] = {
        filename: filename,
        originalServer: serverPath,
        cachedAt: new Date().toISOString(),
        size: stats.size,
        serverModified: fs.statSync(serverPath).mtime.toISOString(),
        cached: true,
        approved: true
      };

      this.saveVersionHistory();

      return {
        success: true,
        cached: true,
        localPath: localPath,
        filename: filename,
        size: this.formatBytes(stats.size),
        originalServer: serverPath,
        cachedAt: new Date().toISOString(),
        message: `✓ Copied from server to local cache`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to cache server file: ${error.message}`
      };
    }
  }

  /**
   * Check if a file on server is newer than our local cached version
   * @param {string} serverPath - Server file path
   * @param {string} localPath - Local cached file path
   * @returns {object} - { hasUpdate, serverNewer, serverModified, localModified, diffTime }
   */
  checkForUpdates(serverPath, localPath) {
    try {
      // Verify paths
      if (!fs.existsSync(serverPath)) {
        return {
          hasUpdate: false,
          error: `Server file not found: ${serverPath}`
        };
      }

      if (!fs.existsSync(localPath)) {
        return {
          hasUpdate: false,
          error: `Local cache file not found: ${localPath}`
        };
      }

      const serverStats = fs.statSync(serverPath);
      const localStats = fs.statSync(localPath);

      const serverModified = serverStats.mtime.getTime();
      const localModified = localStats.mtime.getTime();
      const diffTime = serverModified - localModified;

      return {
        hasUpdate: diffTime > 0,
        serverNewer: diffTime > 0,
        serverModified: serverStats.mtime.toISOString(),
        localModified: localStats.mtime.toISOString(),
        diffMs: Math.abs(diffTime),
        diffDays: Math.round(Math.abs(diffTime) / (1000 * 60 * 60 * 24)),
        serverSize: this.formatBytes(serverStats.size),
        localSize: this.formatBytes(localStats.size),
        sizeChanged: serverStats.size !== localStats.size
      };
    } catch (error) {
      return {
        hasUpdate: false,
        error: `Error checking updates: ${error.message}`
      };
    }
  }

  /**
   * Create an update notification
   * @param {string} serverPath - Server file path
   * @param {string} localPath - Local cached file path
   */
  createUpdateNotification(serverPath, localPath) {
    try {
      const updateInfo = this.checkForUpdates(serverPath, localPath);

      if (!updateInfo.hasUpdate) {
        return {
          success: false,
          message: 'Server file is not newer than local cache'
        };
      }

      const notification = {
        id: `update-${Date.now()}`,
        createdAt: new Date().toISOString(),
        type: 'server-update-available',
        serverPath: serverPath,
        localPath: localPath,
        serverModified: updateInfo.serverModified,
        localModified: updateInfo.localModified,
        diffDays: updateInfo.diffDays,
        serverSize: updateInfo.serverSize,
        localSize: updateInfo.localSize,
        sizeChanged: updateInfo.sizeChanged,
        approved: false,
        synced: false,
        message: `⚠️ Server file is ${updateInfo.diffDays} day(s) newer`
      };

      this.updateNotifications.push(notification);

      return {
        success: true,
        notification: notification,
        message: `Update notification created - waiting for user approval`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all pending update notifications
   */
  getPendingUpdates() {
    return this.updateNotifications.filter(n => !n.approved && !n.synced);
  }

  /**
   * Get notification by ID
   */
  getNotification(notificationId) {
    return this.updateNotifications.find(n => n.id === notificationId);
  }

  /**
   * User approves an update - sync the newer server file to local
   * @param {string} notificationId - Notification ID to approve
   */
  approveUpdate(notificationId) {
    try {
      const notification = this.getNotification(notificationId);

      if (!notification) {
        return {
          success: false,
          error: `Notification not found: ${notificationId}`
        };
      }

      if (!fs.existsSync(notification.serverPath)) {
        return {
          success: false,
          error: `Server file no longer exists: ${notification.serverPath}`
        };
      }

      // Backup the old local file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${notification.localPath}.backup.${timestamp}`;
      fs.copyFileSync(notification.localPath, backupPath);

      // Copy new version from server
      fs.copyFileSync(notification.serverPath, notification.localPath);

      // Update notification
      notification.approved = true;
      notification.synced = true;
      notification.syncedAt = new Date().toISOString();
      notification.backupPath = backupPath;

      // Update version tracking
      if (this.serverFileMap[notification.localPath]) {
        this.serverFileMap[notification.localPath].lastSyncedAt = new Date().toISOString();
        this.serverFileMap[notification.localPath].lastBackup = backupPath;
        this.saveVersionHistory();
      }

      return {
        success: true,
        message: `✓ Updated local cache from server`,
        notification: notification,
        backupCreated: backupPath
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to sync update: ${error.message}`
      };
    }
  }

  /**
   * User rejects an update
   * @param {string} notificationId - Notification ID to reject
   */
  rejectUpdate(notificationId) {
    try {
      const notification = this.getNotification(notificationId);

      if (!notification) {
        return {
          success: false,
          error: `Notification not found: ${notificationId}`
        };
      }

      notification.approved = false;
      notification.synced = false;
      notification.rejectedAt = new Date().toISOString();

      return {
        success: true,
        message: `✓ Update rejected - continuing with local cache`,
        notification: notification
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if path is a server drive
   */
  isServerPath(filePath) {
    if (filePath.startsWith('\\\\')) return true; // UNC path
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
   * Get local cache directory
   */
  getLocalCacheDir() {
    return this.localCacheDir;
  }

  /**
   * Get file tracking info
   */
  getFileTrackingInfo() {
    return {
      cacheDir: this.localCacheDir,
      totalCachedFiles: Object.keys(this.serverFileMap).length,
      files: this.serverFileMap,
      pendingUpdates: this.getPendingUpdates().length
    };
  }
}

module.exports = ServerFileMonitor;
