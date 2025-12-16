const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');

const ConfigurationLocator = require('../services/ConfigurationLocator');
const UserProfileService = require('../services/UserProfileService');
const SettingsParser = require('../services/SettingsParser');
const ServerFileMonitor = require('../services/ServerFileMonitor');
const ServerPathsManifest = require('../services/ServerPathsManifest');
const FileMapping = require('../services/FileMapping');
const PATHS_CONFIG = require('../config/PATHS_CONFIG');

const locator = new ConfigurationLocator();
const profileService = new UserProfileService();
const parser = new SettingsParser();
const fileMonitor = new ServerFileMonitor();
const pathsManifest = new ServerPathsManifest();
const fileMapping = new FileMapping();

/**
 * Get current logged-in username
 */
function getCurrentUsername() {
  return os.userInfo().username;
}

/**
 * POST /api/discover/init
 * Initialize storage directories
 */
router.post('/init', (req, res) => {
  try {
    fileMapping.ensureDirectories();
    
    res.json({
      success: true,
      message: 'Storage directories initialized',
      baseDir: PATHS_CONFIG.serverFilesCacheDir
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/settings
 * Find all .omSettings files on the system
 */
router.get('/settings', async (req, res) => {
  try {
    const info = await locator.getSettingsInfo();
    res.json({
      success: true,
      currentUser: getCurrentUsername(),
      discovered: info.found,
      latest: info.latest,
      all: info.all,
      searchedPaths: info.searchPaths
    });
  } catch (error) {
    console.error('Error discovering settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/latest
 * Get the most recent .omSettings file
 */
router.get('/latest', async (req, res) => {
  try {
    const latest = await locator.findLatestSettings();

    if (!latest) {
      return res.status(404).json({
        error: 'No .omSettings files found on system'
      });
    }

    res.json({
      success: true,
      found: true,
      currentUser: getCurrentUsername(),
      settings: latest
    });
  } catch (error) {
    console.error('Error finding latest settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/auto-import
 * Auto-import the latest .omSettings file for the current user
 * Optional: ?username=override to import for different user
 */
router.post('/auto-import', async (req, res) => {
  try {
    // Get username from query param or use current user
    const username = req.query.username || getCurrentUsername();

    // Find latest settings
    const latest = await locator.findLatestSettings();

    if (!latest) {
      return res.status(404).json({
        error: 'No .omSettings files found on system to import'
      });
    }

    console.log(`📥 Auto-importing settings for ${username} from: ${latest.path}`);

    // Save to user profile
    const saveResult = profileService.saveUserSettings(username, latest.path);

    if (!saveResult.success) {
      return res.status(400).json(saveResult);
    }

    // Parse the settings
    const parseResult = await parser.parseSettings(latest.path);

    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }

    // Save parsed config
    const configSave = profileService.saveParsedConfig(username, parseResult.config);

    // Generate scanner config
    const scanConfig = profileService.generateScannerConfig(username, parseResult.config);
    const scanSave = profileService.saveScannerConfig(username, scanConfig);

    // Cleanup
    if (parseResult.tempDir) {
      await parser.cleanup(parseResult.tempDir);
    }

    res.json({
      success: true,
      message: `Auto-imported settings for ${username}`,
      importedFrom: latest.path,
      importedSource: latest.source,
      fileSize: latest.sizeReadable,
      importedAt: new Date().toISOString(),
      pathsToScan: scanConfig.pathsToScan.length,
      profile: profileService.getUserProfileSummary(username)
    });
  } catch (error) {
    console.error('Error auto-importing:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/locations
 * Get HyperMILL Configuration Center paths and locations for current user
 */
router.get('/locations', (req, res) => {
  try {
    const username = getCurrentUsername();
    const locations = locator.getConfigurationCenterPaths();
    res.json({
      success: true,
      currentUser: username,
      configurationCenterPaths: locations,
      commonLocations: {
        'User Documents': `C:\\Users\\${username}\\Documents`,
        'User Downloads': `C:\\Users\\${username}\\Downloads`,
        'Public Documents': 'C:\\Users\\Public\\Documents\\OPEN MIND',
        'Public Backup': 'C:\\Users\\Public\\Documents\\OPEN MIND\\backup',
        'User AppData': `C:\\Users\\${username}\\AppData\\Roaming\\OPEN MIND`
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/import-file
 * Import settings from a specific file path for current user
 * Body: { filePath: "path/to/file.omSettings" }
 * Optional: ?username=override to import for different user
 */
router.post('/import-file', async (req, res) => {
  try {
    const username = req.query.username || getCurrentUsername();
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: 'filePath is required in request body'
      });
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: `File not found: ${filePath}`
      });
    }

    // Verify it's an .omSettings file
    if (!filePath.endsWith('.omSettings')) {
      return res.status(400).json({
        error: 'File must be a .omSettings file'
      });
    }

    console.log(`📥 Importing settings for ${username} from: ${filePath}`);

    // Save to user profile
    const saveResult = profileService.saveUserSettings(username, filePath);

    if (!saveResult.success) {
      return res.status(400).json(saveResult);
    }

    // Parse the settings
    const parseResult = await parser.parseSettings(filePath);

    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }

    // Save parsed config
    const configSave = profileService.saveParsedConfig(username, parseResult.config);

    // Generate scanner config
    const scanConfig = profileService.generateScannerConfig(username, parseResult.config);
    const scanSave = profileService.saveScannerConfig(username, scanConfig);

    // Cleanup
    if (parseResult.tempDir) {
      await parser.cleanup(parseResult.tempDir);
    }

    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      message: `Imported settings for ${username}`,
      importedFrom: filePath,
      fileSize: (stats.size / 1024 / 1024).toFixed(1) + ' MB',
      importedAt: new Date().toISOString(),
      pathsToScan: scanConfig.pathsToScan.length,
      profile: profileService.getUserProfileSummary(username)
    });
  } catch (error) {
    console.error('Error importing file:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/watch/start
 * Start watching for new .omSettings files for current user
 * Optional: ?username=override to watch for different user
 */
router.get('/watch/start', (req, res) => {
  try {
    const username = req.query.username || getCurrentUsername();

    // Start watcher (in production, would use persistence)
    const watcher = locator.watchForNewSettings((file) => {
      console.log(`🔔 New .omSettings detected for ${username}:`, file);
      // Could emit via WebSocket or store notification
    });

    res.json({
      success: true,
      message: `Started watching for .omSettings files for user: ${username}`,
      watching: true,
      watchedPaths: [
        `C:\\Users\\${username}\\Documents`,
        `C:\\Users\\${username}\\Downloads`,
        'C:\\Users\\Public\\Documents\\OPEN MIND\\backup'
      ],
      note: 'Watcher will run until server restarts. Use WebSockets for production.'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/current-user
 * Get information about the current logged-in user
 */
router.get('/current-user', (req, res) => {
  try {
    const username = getCurrentUsername();
    const userHome = os.homedir();
    const userInfo = os.userInfo();

    res.json({
      success: true,
      username: username,
      uid: userInfo.uid,
      gid: userInfo.gid,
      shell: userInfo.shell,
      homeDirectory: userHome,
      documentsFolder: path.join(userHome, 'Documents'),
      downloadsFolder: path.join(userHome, 'Downloads'),
      appDataFolder: path.join(userHome, 'AppData\\Roaming')
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;

/**
 * GET /api/discover/settings
 * Find all .omSettings files on the system
 */
router.get('/settings', async (req, res) => {
  try {
    const info = await locator.getSettingsInfo();
    res.json({
      success: true,
      discovered: info.found,
      latest: info.latest,
      all: info.all,
      searchedPaths: info.searchPaths
    });
  } catch (error) {
    console.error('Error discovering settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/latest
 * Get the most recent .omSettings file
 */
router.get('/latest', async (req, res) => {
  try {
    const latest = await locator.findLatestSettings();

    if (!latest) {
      return res.status(404).json({
        error: 'No .omSettings files found on system'
      });
    }

    res.json({
      success: true,
      found: true,
      settings: latest
    });
  } catch (error) {
    console.error('Error finding latest settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/auto-import/:username
 * Auto-import the latest .omSettings file for a user
 */
router.post('/auto-import/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find latest settings
    const latest = await locator.findLatestSettings();

    if (!latest) {
      return res.status(404).json({
        error: 'No .omSettings files found on system to import'
      });
    }

    console.log(`📥 Auto-importing settings for ${username} from: ${latest.path}`);

    // Save to user profile
    const saveResult = profileService.saveUserSettings(username, latest.path);

    if (!saveResult.success) {
      return res.status(400).json(saveResult);
    }

    // Parse the settings
    const parseResult = await parser.parseSettings(latest.path);

    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }

    // Save parsed config
    const configSave = profileService.saveParsedConfig(username, parseResult.config);

    // Generate scanner config
    const scanConfig = profileService.generateScannerConfig(username, parseResult.config);
    const scanSave = profileService.saveScannerConfig(username, scanConfig);

    // Cleanup
    if (parseResult.tempDir) {
      await parser.cleanup(parseResult.tempDir);
    }

    res.json({
      success: true,
      message: `Auto-imported settings for ${username}`,
      importedFrom: latest.path,
      importedSource: latest.source,
      fileSize: latest.sizeReadable,
      importedAt: new Date().toISOString(),
      profile: profileService.getUserProfileSummary(username)
    });
  } catch (error) {
    console.error('Error auto-importing:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/locations
 * Get HyperMILL Configuration Center paths and locations
 */
router.get('/locations', (req, res) => {
  try {
    const locations = locator.getConfigurationCenterPaths();
    res.json({
      success: true,
      configurationCenterPaths: locations,
      commonLocations: {
        'User Documents': `C:\\Users\\${require('os').userInfo().username}\\Documents`,
        'User Downloads': `C:\\Users\\${require('os').userInfo().username}\\Downloads`,
        'Public Documents': 'C:\\Users\\Public\\Documents\\OPEN MIND',
        'Public Backup': 'C:\\Users\\Public\\Documents\\OPEN MIND\\backup',
        'User AppData': `C:\\Users\\${require('os').userInfo().username}\\AppData\\Roaming\\OPEN MIND`
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/import-file/:username
 * Import settings from a specific file path
 */
router.post('/import-file/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: 'filePath is required'
      });
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: `File not found: ${filePath}`
      });
    }

    // Verify it's an .omSettings file
    if (!filePath.endsWith('.omSettings')) {
      return res.status(400).json({
        error: 'File must be a .omSettings file'
      });
    }

    console.log(`📥 Importing settings for ${username} from: ${filePath}`);

    // Save to user profile
    const saveResult = profileService.saveUserSettings(username, filePath);

    if (!saveResult.success) {
      return res.status(400).json(saveResult);
    }

    // Parse the settings
    const parseResult = await parser.parseSettings(filePath);

    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }

    // Save parsed config
    const configSave = profileService.saveParsedConfig(username, parseResult.config);

    // Generate scanner config
    const scanConfig = profileService.generateScannerConfig(username, parseResult.config);
    const scanSave = profileService.saveScannerConfig(username, scanConfig);

    // Cleanup
    if (parseResult.tempDir) {
      await parser.cleanup(parseResult.tempDir);
    }

    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      message: `Imported settings for ${username}`,
      importedFrom: filePath,
      fileSize: (stats.size / 1024 / 1024).toFixed(1) + ' MB',
      importedAt: new Date().toISOString(),
      profile: profileService.getUserProfileSummary(username)
    });
  } catch (error) {
    console.error('Error importing file:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/watch/start/:username
 * Start watching for new .omSettings files
 * TODO: Implement persistent watching with socket.io or similar
 */
router.get('/watch/start/:username', (req, res) => {
  try {
    const { username } = req.params;

    // Start watcher (in production, would use persistence)
    const watcher = locator.watchForNewSettings((file) => {
      console.log(`🔔 New .omSettings detected:`, file);
      // Could emit via WebSocket or store notification
    });

    res.json({
      success: true,
      message: `Started watching for .omSettings files for user: ${username}`,
      watching: true,
      watchedPaths: [
        `C:\\Users\\${require('os').userInfo().username}\\Documents`,
        `C:\\Users\\${require('os').userInfo().username}\\Downloads`,
        'C:\\Users\\Public\\Documents\\OPEN MIND\\backup'
      ],
      note: 'Watcher will run until server restarts. Use WebSockets for production.'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/network-access
 * Get list of blocked network paths that were attempted
 * User can review what was blocked before granting access
 */
router.get('/network-access', (req, res) => {
  try {
    const blocked = locator.getBlockedNetworkPaths();
    res.json({
      success: true,
      blockedAttempts: blocked,
      message: blocked.length === 0 ? 'No network access attempts blocked' : `${blocked.length} network paths blocked`,
      note: 'These paths require explicit user permission before access'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/network-access/approve
 * User approves access to a specific network path
 * Body: { networkPath: "path/to/network/share" }
 */
router.post('/network-access/approve', (req, res) => {
  try {
    const { networkPath } = req.body;

    if (!networkPath) {
      return res.status(400).json({
        error: 'networkPath is required in request body'
      });
    }

    const username = getCurrentUsername();
    locator.grantNetworkAccess(networkPath);

    res.json({
      success: true,
      message: `Network access approved for: ${networkPath}`,
      approvedBy: username,
      approvedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/network-access/deny
 * User denies access to a specific network path
 * Body: { networkPath: "path/to/network/share" }
 */
router.post('/network-access/deny', (req, res) => {
  try {
    const { networkPath } = req.body;

    if (!networkPath) {
      return res.status(400).json({
        error: 'networkPath is required in request body'
      });
    }

    const username = getCurrentUsername();
    locator.denyNetworkAccess(networkPath);

    res.json({
      success: true,
      message: `Network access denied for: ${networkPath}`,
      deniedBy: username,
      deniedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/prompt-mode
 * Enable "ask user" mode - system will ask before accessing server drives
 */
router.post('/prompt-mode', (req, res) => {
  try {
    locator.enableUserPromptMode();
    
    res.json({
      success: true,
      message: 'User Prompt Mode enabled',
      behavior: 'System will now ask for permission before accessing network drives (P:, Y:, etc.)',
      note: 'Any network access attempts will be tracked and require your approval'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/file-sync/cache-from-server
 * Copy a file from server drive to local cache
 * Body: { serverPath: "P:\\path\\to\\file.omSettings" }
 */
router.post('/file-sync/cache-from-server', (req, res) => {
  try {
    const { serverPath } = req.body;

    if (!serverPath) {
      return res.status(400).json({
        error: 'serverPath is required in request body'
      });
    }

    const result = fileMonitor.copyFromServerToLocal(serverPath, path.basename(serverPath));

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-sync/check-updates
 * Check if server files are newer than local cached versions
 * Query: ?serverPath=P:\\file.omSettings&localPath=C:\\cache\\file.omSettings
 */
router.get('/file-sync/check-updates', (req, res) => {
  try {
    const { serverPath, localPath } = req.query;

    if (!serverPath || !localPath) {
      return res.status(400).json({
        error: 'Both serverPath and localPath query parameters are required'
      });
    }

    const updateInfo = fileMonitor.checkForUpdates(serverPath, localPath);

    res.json({
      success: true,
      updateInfo: updateInfo,
      message: updateInfo.hasUpdate ? '⚠️ Server file is newer' : '✓ Local cache is up to date'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-sync/pending-updates
 * Get all pending update notifications waiting for user approval
 */
router.get('/file-sync/pending-updates', (req, res) => {
  try {
    const pending = fileMonitor.getPendingUpdates();

    res.json({
      success: true,
      pendingCount: pending.length,
      updates: pending,
      message: pending.length === 0 ? 'No pending updates' : `${pending.length} update(s) awaiting approval`
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/file-sync/create-update-notification
 * Create a notification for an updated server file
 * Body: { serverPath: "P:\\file.omSettings", localPath: "C:\\cache\\file.omSettings" }
 */
router.post('/file-sync/create-update-notification', (req, res) => {
  try {
    const { serverPath, localPath } = req.body;

    if (!serverPath || !localPath) {
      return res.status(400).json({
        error: 'Both serverPath and localPath are required in request body'
      });
    }

    const result = fileMonitor.createUpdateNotification(serverPath, localPath);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/file-sync/approve-update
 * User approves an update - sync newer server file to local cache
 * Body: { notificationId: "update-1234567890" }
 */
router.post('/file-sync/approve-update', (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        error: 'notificationId is required in request body'
      });
    }

    const result = fileMonitor.approveUpdate(notificationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: result.message,
      notification: result.notification,
      backupCreated: result.backupCreated
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/file-sync/reject-update
 * User rejects an update - keep using current local cache
 * Body: { notificationId: "update-1234567890" }
 */
router.post('/file-sync/reject-update', (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        error: 'notificationId is required in request body'
      });
    }

    const result = fileMonitor.rejectUpdate(notificationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-sync/cache-info
 * Get information about cached files and pending updates
 */
router.get('/file-sync/cache-info', (req, res) => {
  try {
    const info = fileMonitor.getFileTrackingInfo();

    res.json({
      success: true,
      cacheInfo: info,
      cacheLocation: fileMonitor.getLocalCacheDir()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/manifest/analyze
 * Analyze omSettings config and identify which paths are server-based
 * Body: { parsedConfig: {...omSettings parsed object...}, username: "szborok" }
 */
router.post('/manifest/analyze', (req, res) => {
  try {
    const { parsedConfig, username } = req.body;

    if (!parsedConfig) {
      return res.status(400).json({
        error: 'parsedConfig is required - pass the parsed omSettings object'
      });
    }

    // Analyze the config
    const analysis = pathsManifest.analyzePathsFromConfig(parsedConfig);

    // Create manifest
    const manifestResult = pathsManifest.createManifest(
      analysis,
      username || getCurrentUsername()
    );

    if (!manifestResult.success) {
      return res.status(400).json(manifestResult);
    }

    res.json({
      success: true,
      analysis: analysis,
      manifest: manifestResult.manifestContent,
      manifestPath: manifestResult.manifestPath,
      message: manifestResult.message
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/manifest/load
 * Load a previously created manifest for a user
 * Query: ?username=szborok
 */
router.get('/manifest/load', (req, res) => {
  try {
    const username = req.query.username || getCurrentUsername();

    const result = pathsManifest.loadManifest(username);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      manifest: result.manifest,
      manifestPath: result.manifestPath
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/manifest/server-paths
 * Get only the server-based paths from a manifest
 * Query: ?username=szborok
 */
router.get('/manifest/server-paths', (req, res) => {
  try {
    const username = req.query.username || getCurrentUsername();

    const result = pathsManifest.getServerPathsFromManifest(username);

    res.json({
      success: result.success,
      message: result.success 
        ? `Found ${result.count} server paths`
        : result.error,
      serverPaths: result.serverPaths,
      count: result.count,
      serverDrives: result.serverDrives
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/manifest/list
 * List all available manifests
 */
router.get('/manifest/list', (req, res) => {
  try {
    const result = pathsManifest.listManifests();

    res.json({
      success: true,
      manifests: result.manifests,
      count: result.count,
      manifestDir: pathsManifest.getManifestDir()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/file-mapping/add
 * Add a new file mapping (server ↔ local)
 * Body: { serverPath: "P:\\file.omSettings", localPath: "C:\\cache\\file.omSettings", fileType: "config" }
 */
router.post('/file-mapping/add', (req, res) => {
  try {
    const { serverPath, localPath, fileType } = req.body;

    if (!serverPath || !localPath) {
      return res.status(400).json({
        error: 'Both serverPath and localPath are required'
      });
    }

    const result = fileMapping.addMapping(serverPath, localPath, fileType || 'other');

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-mapping/all
 * Get all file mappings
 */
router.get('/file-mapping/all', (req, res) => {
  try {
    const result = fileMapping.getAllMappings();

    res.json({
      success: true,
      count: result.count,
      mappings: result.mappings
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-mapping/by-status
 * Get mappings by status (synced, outdated, unmapped, error)
 * Query: ?status=outdated
 */
router.get('/file-mapping/by-status', (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({
        error: 'status query parameter is required (synced, outdated, unmapped, error)'
      });
    }

    const result = fileMapping.getMappingsByStatus(status);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-mapping/check-update
 * Check if a server file has been updated
 * Query: ?localPath=C:\\cache\\file.omSettings
 */
router.get('/file-mapping/check-update', (req, res) => {
  try {
    const { localPath } = req.query;

    if (!localPath) {
      return res.status(400).json({
        error: 'localPath query parameter is required'
      });
    }

    const result = fileMapping.checkForServerUpdate(localPath);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/discover/file-mapping/mark-synced
 * Mark a file as synced after copying from server
 * Body: { localPath: "C:\\cache\\file.omSettings" }
 */
router.post('/file-mapping/mark-synced', (req, res) => {
  try {
    const { localPath } = req.body;

    if (!localPath) {
      return res.status(400).json({
        error: 'localPath is required'
      });
    }

    const result = fileMapping.markAsSynced(localPath);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-mapping/statistics
 * Get statistics about all file mappings
 */
router.get('/file-mapping/statistics', (req, res) => {
  try {
    const stats = fileMapping.getStatistics();

    res.json({
      success: true,
      statistics: stats,
      mappingFile: fileMapping.getMappingFilePath()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/file-mapping/get
 * Get a specific file mapping
 * Query: ?localPath=C:\\cache\\file.omSettings
 */
router.get('/file-mapping/get', (req, res) => {
  try {
    const { localPath } = req.query;

    if (!localPath) {
      return res.status(400).json({
        error: 'localPath query parameter is required'
      });
    }

    const result = fileMapping.getMapping(localPath);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * DELETE /api/discover/file-mapping/remove
 * Remove a file mapping
 * Query: ?localPath=C:\\cache\\file.omSettings
 */
router.delete('/file-mapping/remove', (req, res) => {
  try {
    const { localPath } = req.query;

    if (!localPath) {
      return res.status(400).json({
        error: 'localPath query parameter is required'
      });
    }

    const result = fileMapping.removeMapping(localPath);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/discover/storage-config
 * Get the centralized storage configuration and directory structure
 */
router.get('/storage-config', (req, res) => {
  try {
    const config = {
      success: true,
      baseDirectory: PATHS_CONFIG.serverFilesCacheDir,
      structure: {
        'current/': {
          path: PATHS_CONFIG.getCurrentFilesDir(),
          description: 'Currently active server file copies'
        },
        'backups/': {
          path: PATHS_CONFIG.getBackupsDir(),
          description: 'Backup versions before updates'
        },
        'metadata/': {
          path: PATHS_CONFIG.getMetadataDir(),
          description: 'Mapping index and metadata files'
        },
        'history/': {
          path: PATHS_CONFIG.getHistoryDir(),
          description: 'Sync history and version tracking'
        },
        'logs/': {
          path: PATHS_CONFIG.getLogsDir(),
          description: 'Sync operation logs'
        }
      },
      files: {
        'file-mapping.json': {
          path: PATHS_CONFIG.getFileMappingPath(),
          description: 'Server ↔ Local file mapping index'
        },
        'sync-history.json': {
          path: PATHS_CONFIG.getSyncHistoryPath(),
          description: 'History of all sync operations'
        }
      },
      diskUsage: this.calculateDiskUsage()
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Helper function to calculate disk usage
 */
function calculateDiskUsage() {
  try {
    const calculateDir = (dir) => {
      if (!fs.existsSync(dir)) return 0;
      
      let size = 0;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      files.forEach(file => {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          size += calculateDir(fullPath);
        } else {
          size += fs.statSync(fullPath).size;
        }
      });
      
      return size;
    };

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const baseDir = PATHS_CONFIG.serverFilesCacheDir;
    const totalSize = calculateDir(baseDir);
    const currentSize = calculateDir(PATHS_CONFIG.getCurrentFilesDir());
    const backupsSize = calculateDir(PATHS_CONFIG.getBackupsDir());

    return {
      totalSize: formatBytes(totalSize),
      totalBytes: totalSize,
      currentFiles: formatBytes(currentSize),
      backups: formatBytes(backupsSize)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * GET /api/discover/storage-contents
 * List what files are currently stored in the cache
 */
router.get('/storage-contents', (req, res) => {
  try {
    const baseDir = PATHS_CONFIG.serverFilesCacheDir;

    if (!fs.existsSync(baseDir)) {
      return res.json({
        success: true,
        message: 'Cache directory not yet created',
        baseDir: baseDir,
        contents: []
      });
    }

    const getFileTree = (dir, level = 0) => {
      if (level > 3) return [];
      
      const items = [];
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        files.forEach(file => {
          const fullPath = path.join(dir, file.name);
          const stat = fs.statSync(fullPath);
          
          const item = {
            name: file.name,
            type: file.isDirectory() ? 'directory' : 'file',
            path: fullPath,
            size: stat.size,
            modified: stat.mtime.toISOString()
          };

          if (file.isDirectory()) {
            item.contents = getFileTree(fullPath, level + 1);
          }

          items.push(item);
        });
      } catch (error) {
        console.error(`Error reading ${dir}:`, error.message);
      }

      return items;
    };

    const tree = getFileTree(baseDir);

    res.json({
      success: true,
      baseDir: baseDir,
      contents: tree
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
