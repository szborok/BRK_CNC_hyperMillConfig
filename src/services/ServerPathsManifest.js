const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * ServerPathsManifest - Tracks which paths in omSettings are server-based
 * This file lives on the server and is synced locally for reference
 * Helps identify which files must be accessed from server vs local copy
 */
class ServerPathsManifest {
  constructor() {
    this.manifestFileName = 'omSettings-server-paths.json';
    this.localManifestDir = path.join(os.homedir(), 'AppData\\Local\\BRK_CNC_hyperMillConfig\\manifests');
    
    // Ensure manifest directory exists
    if (!fs.existsSync(this.localManifestDir)) {
      fs.mkdirSync(this.localManifestDir, { recursive: true });
    }
  }

  /**
   * Analyze omSettings config and categorize paths
   * @param {object} parsedConfig - Parsed omSettings configuration
   * @returns {object} - Categorized paths with analysis
   */
  analyzePathsFromConfig(parsedConfig) {
    const analysis = {
      generatedAt: new Date().toISOString(),
      totalPaths: 0,
      serverPaths: [],
      localPaths: [],
      unreachablePaths: [],
      unclearPaths: []
    };

    if (!parsedConfig || typeof parsedConfig !== 'object') {
      return analysis;
    }

    // Recursively extract all path-like strings from config
    const extractPaths = (obj, depth = 0) => {
      if (depth > 10) return; // Prevent infinite recursion
      
      if (typeof obj === 'string') {
        if (this.isLikelyPath(obj)) {
          analysis.totalPaths++;
          const classification = this.classifyPath(obj);
          
          if (classification.type === 'server') {
            analysis.serverPaths.push({
              path: obj,
              drive: classification.drive,
              isUNC: classification.isUNC,
              category: classification.category
            });
          } else if (classification.type === 'local') {
            analysis.localPaths.push({
              path: obj,
              drive: classification.drive,
              category: classification.category
            });
          } else if (classification.type === 'unreachable') {
            analysis.unreachablePaths.push({
              path: obj,
              reason: classification.reason
            });
          } else {
            analysis.unclearPaths.push({
              path: obj,
              note: classification.note
            });
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => extractPaths(item, depth + 1));
      } else if (typeof obj === 'object') {
        Object.values(obj).forEach(value => extractPaths(value, depth + 1));
      }
    };

    extractPaths(parsedConfig);
    return analysis;
  }

  /**
   * Check if a string looks like a file path
   */
  isLikelyPath(str) {
    if (typeof str !== 'string' || str.length < 3) return false;
    
    // Starts with drive letter + colon
    if (/^[A-Z]:\\/i.test(str)) return true;
    
    // UNC path
    if (/^\\\\[^\\]+\\/.test(str)) return true;
    
    // Unix/forward slash path (sometimes in configs)
    if (str.startsWith('/') && str.length > 3) return true;
    
    return false;
  }

  /**
   * Classify a path as server, local, unreachable, or unclear
   */
  classifyPath(pathStr) {
    // UNC network path
    if (pathStr.startsWith('\\\\')) {
      return {
        type: 'server',
        isUNC: true,
        drive: 'network-share',
        category: 'UNC-network-share'
      };
    }

    // Drive letter paths
    const match = pathStr.match(/^([A-Z]):/i);
    if (match) {
      const drive = match[1].toUpperCase();
      const localDrives = ['C', 'D', 'E', 'F'];

      if (localDrives.includes(drive)) {
        return {
          type: 'local',
          drive: drive,
          category: `local-drive-${drive}`
        };
      } else {
        // Server drives: P, Y, Z, S, Q, X, V, U, T, R, etc.
        return {
          type: 'server',
          drive: drive,
          category: `server-drive-${drive}`
        };
      }
    }

    // Network drive letters sometimes show as paths
    if (/^[A-Z]:$/.test(pathStr)) {
      const drive = pathStr[0].toUpperCase();
      const localDrives = ['C', 'D', 'E', 'F'];
      
      if (!localDrives.includes(drive)) {
        return {
          type: 'server',
          drive: drive,
          category: `server-drive-${drive}`
        };
      }
    }

    // Unix paths
    if (pathStr.startsWith('/')) {
      return {
        type: 'unclear',
        drive: 'unix-path',
        note: 'Unix-style path - context dependent'
      };
    }

    // Can't determine
    return {
      type: 'unclear',
      drive: 'unknown',
      note: 'Path format not recognized'
    };
  }

  /**
   * Create manifest file showing which paths are server-based
   * @param {object} pathAnalysis - Result from analyzePathsFromConfig()
   * @param {string} username - Username this manifest is for
   * @returns {object} - { success, manifestPath, manifestContent }
   */
  createManifest(pathAnalysis, username = 'all-users') {
    try {
      const manifest = {
        formatVersion: '1.0',
        description: 'Server paths manifest - lists which omSettings paths must be accessed from server',
        generatedAt: new Date().toISOString(),
        generatedFor: username,
        generatedBy: os.userInfo().username,
        machineHostname: os.hostname(),
        
        summary: {
          totalPaths: pathAnalysis.totalPaths,
          serverPaths: pathAnalysis.serverPaths.length,
          localPaths: pathAnalysis.localPaths.length,
          unreachablePaths: pathAnalysis.unreachablePaths.length,
          unclearPaths: pathAnalysis.unclearPaths.length
        },

        serverPaths: {
          description: 'These paths MUST be accessed from server drives (P:, Y:, Z:, etc.)',
          count: pathAnalysis.serverPaths.length,
          paths: pathAnalysis.serverPaths,
          serverDrivesUsed: [...new Set(pathAnalysis.serverPaths.map(p => p.drive))]
        },

        localPaths: {
          description: 'These paths are on local PC drives (C:, D:, etc.)',
          count: pathAnalysis.localPaths.length,
          paths: pathAnalysis.localPaths,
          localDrivesUsed: [...new Set(pathAnalysis.localPaths.map(p => p.drive))]
        },

        unreachablePaths: {
          description: 'These paths cannot be reached or are invalid',
          count: pathAnalysis.unreachablePaths.length,
          paths: pathAnalysis.unreachablePaths
        },

        unclearPaths: {
          description: 'These paths format is unclear - may need manual review',
          count: pathAnalysis.unclearPaths.length,
          paths: pathAnalysis.unclearPaths
        },

        instructions: {
          'sync-strategy': 'Copy server paths locally for faster access, but sync from server if file is updated',
          'cache-priority': 'Server paths should be cached locally when possible',
          'update-check': 'Check server periodically for updates to these paths',
          'read-only': 'Server paths are read-only - modifications must be done on server'
        }
      };

      const manifestPath = path.join(
        this.localManifestDir,
        `${username}-${this.manifestFileName}`
      );

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      return {
        success: true,
        manifestPath: manifestPath,
        manifestContent: manifest,
        message: `✓ Manifest created: ${pathAnalysis.serverPaths.length} server paths identified`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create manifest: ${error.message}`
      };
    }
  }

  /**
   * Load manifest for a user
   */
  loadManifest(username = 'all-users') {
    try {
      const manifestPath = path.join(
        this.localManifestDir,
        `${username}-${this.manifestFileName}`
      );

      if (!fs.existsSync(manifestPath)) {
        return {
          success: false,
          error: `Manifest not found for user: ${username}`,
          manifestPath: manifestPath
        };
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      return {
        success: true,
        manifest: manifest,
        manifestPath: manifestPath
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load manifest: ${error.message}`
      };
    }
  }

  /**
   * Get all server paths from manifest
   */
  getServerPathsFromManifest(username = 'all-users') {
    try {
      const result = this.loadManifest(username);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          serverPaths: []
        };
      }

      return {
        success: true,
        serverPaths: result.manifest.serverPaths.paths,
        count: result.manifest.serverPaths.count,
        serverDrives: result.manifest.serverPaths.serverDrivesUsed
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        serverPaths: []
      };
    }
  }

  /**
   * Get manifest directory
   */
  getManifestDir() {
    return this.localManifestDir;
  }

  /**
   * List all available manifests
   */
  listManifests() {
    try {
      if (!fs.existsSync(this.localManifestDir)) {
        return {
          success: true,
          manifests: [],
          count: 0
        };
      }

      const files = fs.readdirSync(this.localManifestDir)
        .filter(f => f.includes(this.manifestFileName))
        .map(f => ({
          filename: f,
          path: path.join(this.localManifestDir, f),
          modified: fs.statSync(path.join(this.localManifestDir, f)).mtime
        }));

      return {
        success: true,
        manifests: files,
        count: files.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        manifests: []
      };
    }
  }
}

module.exports = ServerPathsManifest;
