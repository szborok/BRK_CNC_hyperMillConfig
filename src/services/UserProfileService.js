const fs = require('fs');
const path = require('path');

/**
 * UserProfileService - Manages per-user HyperMILL profiles and settings
 * Stores .omSettings files and parsed configuration per user
 */
class UserProfileService {
  constructor(profilesDir) {
    this.profilesDir = profilesDir || path.join(__dirname, '../../data/user-profiles');
    this.ensureProfilesDir();
  }

  /**
   * Ensure profiles directory exists
   */
  ensureProfilesDir() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  /**
   * Get user profile directory
   */
  getUserProfileDir(username) {
    return path.join(this.profilesDir, username);
  }

  /**
   * Create user profile directory structure
   */
  createUserProfile(username) {
    const userDir = this.getUserProfileDir(username);
    const dirs = [
      userDir,
      path.join(userDir, 'settings'),
      path.join(userDir, 'parsed'),
      path.join(userDir, 'scanner-config'),
      path.join(userDir, 'backups')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    return userDir;
  }

  /**
   * Save .omSettings file for user
   */
  saveUserSettings(username, settingsFilePath) {
    try {
      if (!fs.existsSync(settingsFilePath)) {
        throw new Error(`Settings file not found: ${settingsFilePath}`);
      }

      const userDir = this.createUserProfile(username);
      const fileName = `user-settings-${Date.now()}.omSettings`;
      const destPath = path.join(userDir, 'settings', fileName);

      fs.copyFileSync(settingsFilePath, destPath);

      // Update symlink to latest
      const latestLink = path.join(userDir, 'settings', 'latest.omSettings');
      if (fs.existsSync(latestLink)) {
        fs.unlinkSync(latestLink);
      }
      fs.copyFileSync(settingsFilePath, latestLink);

      return {
        success: true,
        savedPath: destPath,
        latestPath: latestLink,
        filename: fileName
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get latest user settings file
   */
  getLatestUserSettings(username) {
    const latestPath = path.join(
      this.getUserProfileDir(username),
      'settings',
      'latest.omSettings'
    );

    if (fs.existsSync(latestPath)) {
      const stats = fs.statSync(latestPath);
      return {
        found: true,
        path: latestPath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      };
    }

    return { found: false };
  }

  /**
   * Save parsed configuration for user
   */
  saveParsedConfig(username, configObject) {
    try {
      const userDir = this.createUserProfile(username);
      const configPath = path.join(userDir, 'parsed', 'config.json');
      
      fs.writeFileSync(
        configPath,
        JSON.stringify(configObject, null, 2),
        'utf-8'
      );

      return {
        success: true,
        path: configPath,
        savedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get parsed configuration for user
   */
  getParsedConfig(username) {
    try {
      const configPath = path.join(
        this.getUserProfileDir(username),
        'parsed',
        'config.json'
      );

      if (!fs.existsSync(configPath)) {
        return { found: false };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        found: true,
        config,
        path: configPath
      };
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Save scanner configuration (paths to scan for this user)
   */
  saveScannerConfig(username, scannerConfig) {
    try {
      const userDir = this.createUserProfile(username);
      const configPath = path.join(userDir, 'scanner-config', 'scan-paths.json');
      
      fs.writeFileSync(
        configPath,
        JSON.stringify(scannerConfig, null, 2),
        'utf-8'
      );

      return {
        success: true,
        path: configPath,
        savedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get scanner configuration for user
   */
  getScannerConfig(username) {
    try {
      const configPath = path.join(
        this.getUserProfileDir(username),
        'scanner-config',
        'scan-paths.json'
      );

      if (!fs.existsSync(configPath)) {
        return { found: false };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        found: true,
        config,
        path: configPath
      };
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Generate scanner configuration from parsed HyperMILL config
   */
  generateScannerConfig(username, parsedConfig) {
    try {
      // Generate token map for this user
      const tokenMap = this.generateTokenMap(username);

      const scanConfig = {
        username,
        generatedAt: new Date().toISOString(),
        sourceScan: 'hyperMILL-omSettings',
        tokenMap,
        pathsToScan: []
      };

      // Add user-specific directories with mapped paths
      if (parsedConfig.userSettings && parsedConfig.userSettings.userDirectories) {
        parsedConfig.userSettings.userDirectories.forEach(dir => {
          const mappedPath = this.mapPathTokens(dir.path, tokenMap);
          
          // Skip company-wide configs for now (they're templates)
          if (dir.key.includes('company')) {
            return;
          }

          scanConfig.pathsToScan.push({
            path: mappedPath,
            pathTemplate: dir.path,
            type: this.categorizePathType(dir.key),
            description: `HyperMILL ${dir.key}`,
            key: dir.key
          });
        });
      }

      // Add user files
      if (parsedConfig.userSettings && parsedConfig.userSettings.userFiles) {
        parsedConfig.userSettings.userFiles.forEach(file => {
          const mappedPath = this.mapPathTokens(file.path, tokenMap);
          
          // Skip company files and focus on user-specific files
          if (!file.key.includes('company')) {
            scanConfig.pathsToScan.push({
              path: mappedPath,
              pathTemplate: file.path,
              type: 'user-config-file',
              description: `HyperMILL user file: ${file.key}`,
              key: file.key,
              isFile: true
            });
          }
        });
      }

      // Add machines from settings
      if (parsedConfig.machines && parsedConfig.machines.length > 0) {
        scanConfig.machines = parsedConfig.machines.map(m => ({
          name: m.name,
          mdfPath: m.mdfPath,
          postProcessor: m.postProcessor,
          isNetworkPath: m.mdfPath && (m.mdfPath.startsWith('\\\\') || m.mdfPath.startsWith('Y:\\'))
        }));
      }

      // Add databases
      if (parsedConfig.databases) {
        scanConfig.databases = {
          toolDatabases: (parsedConfig.databases.tool || []).map(db => ({
            path: db.path,
            type: db.type,
            isNetworkPath: db.path && (db.path.startsWith('\\\\') || db.path.startsWith('Y:\\'))
          })),
          macroDatabases: (parsedConfig.databases.macro || []).map(db => ({
            path: db.path,
            type: db.type,
            isNetworkPath: db.path && (db.path.startsWith('\\\\') || db.path.startsWith('Y:\\'))
          }))
        };
      }

      // Add shared network paths found
      if (parsedConfig.networkShares && parsedConfig.networkShares.length > 0) {
        scanConfig.networkShares = parsedConfig.networkShares.map(share => ({
          name: share.name,
          path: share.path,
          isAccessible: null // To be determined during scan
        }));
      }

      return scanConfig;
    } catch (error) {
      throw new Error(`Failed to generate scanner config: ${error.message}`);
    }
  }

  /**
   * Categorize path type from key name
   */
  categorizePathType(key) {
    if (key.includes('Automation')) return 'automation-center';
    if (key.includes('Tool')) return 'tool-database';
    if (key.includes('cfg')) return 'configuration';
    if (key.includes('Database')) return 'database';
    return 'other';
  }

  /**
   * Map token placeholders to actual paths
   * Tokens: [HYPERMILL], [APPDATA], [USER_CFG], [TOOLDB], [VERSION], [USER]
   */
  mapPathTokens(pathString, tokenMap) {
    if (!pathString) return pathString;

    let mapped = pathString;
    Object.entries(tokenMap).forEach(([token, value]) => {
      const regex = new RegExp(`\\[${token}\\]`, 'g');
      mapped = mapped.replace(regex, value);
    });

    return mapped;
  }

  /**
   * Generate token map for a user based on system information
   */
  generateTokenMap(username) {
    // These are the default token mappings based on HyperMILL installation
    const userAppDataPath = `C:\\Users\\${username}\\AppData\\Roaming`;
    
    return {
      HYPERMILL: 'C:\\Program Files\\OPEN MIND\\hyperMILL\\33.0',
      TOOLDB: 'C:\\Program Files\\OPEN MIND\\Tool Database\\33.0',
      APPDATA: userAppDataPath,
      USER_CFG: userAppDataPath,
      VERSION: '33.0',
      USER: username,
      MAJOR_VERSION: '33',
      GWS: 'C:\\Users\\Public\\Documents\\OPEN MIND',
      PUBLICDOCUMENTS: 'C:\\Users\\Public\\Documents',
      COMMON_APPDATA: 'C:\\ProgramData',
      SWTEMPPATH: `${userAppDataPath}\\OPEN MIND\\temp\\`
    };
  }

  /**
   * Get user profile summary
   */
  getUserProfileSummary(username) {
    try {
      const userDir = this.getUserProfileDir(username);
      
      if (!fs.existsSync(userDir)) {
        return { found: false };
      }

      const settingsResult = this.getLatestUserSettings(username);
      const parsedResult = this.getParsedConfig(username);
      const scannerResult = this.getScannerConfig(username);

      return {
        found: true,
        username,
        profileDirectory: userDir,
        hasSettings: settingsResult.found,
        settingsFile: settingsResult.found ? settingsResult.path : null,
        hasParsedConfig: parsedResult.found,
        hasAutomationPaths: scannerResult.found,
        createdAt: this.getProfileCreatedAt(userDir),
        lastModified: this.getProfileLastModified(userDir)
      };
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Get profile creation date
   */
  getProfileCreatedAt(userDir) {
    try {
      const stats = fs.statSync(userDir);
      return stats.birthtime.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Get profile last modified date
   */
  getProfileLastModified(userDir) {
    try {
      const stats = fs.statSync(userDir);
      return stats.mtime.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * List all user profiles
   */
  listProfiles() {
    try {
      if (!fs.existsSync(this.profilesDir)) {
        return { found: false, profiles: [] };
      }

      const dirs = fs.readdirSync(this.profilesDir);
      const profiles = dirs
        .filter(d => fs.statSync(path.join(this.profilesDir, d)).isDirectory())
        .map(username => this.getUserProfileSummary(username))
        .filter(p => p.found);

      return {
        found: true,
        count: profiles.length,
        profiles
      };
    } catch (error) {
      return {
        found: false,
        error: error.message,
        profiles: []
      };
    }
  }

  /**
   * Delete user profile
   */
  deleteProfile(username) {
    try {
      const userDir = this.getUserProfileDir(username);
      
      if (!fs.existsSync(userDir)) {
        return { success: false, error: 'Profile not found' };
      }

      fs.rmSync(userDir, { recursive: true, force: true });

      return {
        success: true,
        deletedProfile: username
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = UserProfileService;
