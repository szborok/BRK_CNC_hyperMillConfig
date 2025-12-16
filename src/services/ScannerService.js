const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

/**
 * ScannerService - Scans the PC for HyperMill files and configurations
 * Finds:
 * - HyperMill installation paths
 * - AUTOMATION Center locations
 * - Local user macros and automations
 * - Configuration files
 * - User preferences
 */
class ScannerService {
  constructor() {
    this.commonPaths = {
      programFiles: 'C:\\Program Files',
      programFilesX86: 'C:\\Program Files (x86)',
      publicDocs: 'C:\\ProgramData\\OPEN MIND',
      userDocs: path.join(process.env.USERPROFILE || 'C:\\Users\\Public', 'Documents\\OPEN MIND'),
      appData: path.join(process.env.APPDATA || '', 'OPEN MIND\\hyperMILL'),
      openMindRoot: 'C:\\ProgramData\\OPEN MIND'
    };
  }

  /**
   * Main scan function - scans the entire PC for HyperMill files
   */
  async scanPC() {
    console.log('🔍 Starting HyperMill PC scan...');
    
    const scanResults = {
      timestamp: new Date().toISOString(),
      hyperMillInstallation: null,
      automationCenterPaths: [],
      userFiles: {
        macros: [],
        automations: [],
        configurations: [],
        other: []
      },
      userPreferences: null,
      databases: [],
      summary: {},
      errors: []
    };

    try {
      // 1. Find HyperMill installation
      scanResults.hyperMillInstallation = await this.findHyperMillInstallation();

      // 2. Find AUTOMATION Center paths
      scanResults.automationCenterPaths = await this.findAutomationCenterPaths();

      // 3. Scan user files
      scanResults.userFiles = await this.scanUserFiles();

      // 4. Find user preferences
      scanResults.userPreferences = await this.findUserPreferences();

      // 5. Find databases
      scanResults.databases = await this.findDatabases();

      // Generate summary
      scanResults.summary = this.generateSummary(scanResults);

      console.log('✅ PC scan completed successfully');
      return scanResults;

    } catch (error) {
      console.error('❌ Error during PC scan:', error);
      scanResults.errors.push({
        phase: 'general',
        message: error.message,
        stack: error.stack
      });
      return scanResults;
    }
  }

  /**
   * Find HyperMill installation directory
   */
  async findHyperMillInstallation() {
    console.log('Searching for HyperMill installation...');
    
    const searchPaths = [
      this.commonPaths.programFiles,
      this.commonPaths.programFilesX86
    ];

    for (const basePath of searchPaths) {
      try {
        const entries = await fs.readdir(basePath);
        const hyperMillDir = entries.find(entry => 
          entry.toLowerCase().includes('open mind') || 
          entry.toLowerCase().includes('hypermill')
        );

        if (hyperMillDir) {
          const fullPath = path.join(basePath, hyperMillDir);
          console.log(`✓ Found HyperMill at: ${fullPath}`);
          return {
            path: fullPath,
            found: true,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.debug(`Could not read ${basePath}: ${error.message}`);
      }
    }

    console.warn('⚠ HyperMill installation not found in standard locations');
    return {
      path: null,
      found: false,
      note: 'Check HKEY_LOCAL_MACHINE\\Software\\OPEN MIND for installation path'
    };
  }

  /**
   * Find all AUTOMATION Center paths
   */
  async findAutomationCenterPaths() {
    console.log('Searching for AUTOMATION Center paths...');
    
    const paths = [];
    const searchLocations = [
      this.commonPaths.publicDocs,
      this.commonPaths.openMindRoot,
      path.join(process.env.USERPROFILE || 'C:\\Users\\Public', 'Documents'),
      'D:\\' // Check D: drive for network shares
    ];

    for (const location of searchLocations) {
      try {
        if (!await this.pathExists(location)) continue;

        const entries = await fs.readdir(location, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(location, entry.name);
            // Look for AUTOMATION Center or variants directory
            if (entry.name.toLowerCase().includes('automation') || 
                entry.name.toLowerCase().includes('variants') ||
                entry.name === 'USERS') {
              
              const details = await this.analyzeAutomationCenterPath(fullPath);
              if (details.filesFound > 0) {
                paths.push(details);
                console.log(`✓ Found AUTOMATION Center: ${fullPath}`);
              }
            }
          }
        }
      } catch (error) {
        console.debug(`Error scanning ${location}: ${error.message}`);
      }
    }

    return paths;
  }

  /**
   * Analyze a potential AUTOMATION Center path
   */
  async analyzeAutomationCenterPath(basePath) {
    const result = {
      path: basePath,
      filesFound: 0,
      categories: {
        macros: 0,
        automations: 0,
        scripts: 0,
        configs: 0,
        other: 0
      },
      subdirs: []
    };

    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          result.subdirs.push(entry.name);
          const fileCount = await this.countFilesInDir(fullPath);
          result.filesFound += fileCount;
        } else if (entry.isFile()) {
          result.filesFound++;
          const ext = path.extname(entry.name).toLowerCase();
          
          if (ext === '.hma') result.categories.automations++;
          else if (ext === '.vbs' || ext === '.py') result.categories.scripts++;
          else if (ext === '.xml' || ext === '.db') result.categories.configs++;
          else if (ext === '.cfg') result.categories.macros++;
          else result.categories.other++;
        }
      }
    } catch (error) {
      console.debug(`Error analyzing ${basePath}: ${error.message}`);
    }

    return result;
  }

  /**
   * Scan user files (macros, automations, configs)
   */
  async scanUserFiles() {
    console.log('Scanning user HyperMill files...');
    
    const userFiles = {
      macros: [],
      automations: [],
      configurations: [],
      scripts: [],
      other: []
    };

    const userPath = this.commonPaths.userDocs;
    
    try {
      if (!await this.pathExists(userPath)) {
        console.warn(`User documents path not found: ${userPath}`);
        return userFiles;
      }

      const allFiles = await this.getAllFiles(userPath);
      
      for (const file of allFiles) {
        const ext = path.extname(file).toLowerCase();
        const relPath = path.relative(userPath, file);
        
        const fileInfo = {
          name: path.basename(file),
          path: file,
          relativePath: relPath,
          size: await this.getFileSize(file),
          modified: await this.getFileModified(file)
        };

        if (ext === '.vbs') userFiles.scripts.push(fileInfo);
        else if (ext === '.py') userFiles.scripts.push(fileInfo);
        else if (ext === '.hma') userFiles.automations.push(fileInfo);
        else if (ext === '.cfg' || ext === '.xml') userFiles.configurations.push(fileInfo);
        else if (ext === '.db') userFiles.configurations.push(fileInfo);
        else if (ext === '.mac') userFiles.macros.push(fileInfo);
        else userFiles.other.push(fileInfo);
      }

      console.log(`✓ Found ${allFiles.length} user files`);
    } catch (error) {
      console.error(`Error scanning user files: ${error.message}`);
    }

    return userFiles;
  }

  /**
   * Find user preferences and settings
   */
  async findUserPreferences() {
    console.log('Scanning user preferences...');
    
    const appDataPath = this.commonPaths.appData;
    const prefs = {
      path: appDataPath,
      exists: false,
      files: [],
      size: 0
    };

    try {
      if (!await this.pathExists(appDataPath)) {
        console.warn(`AppData path not found: ${appDataPath}`);
        return prefs;
      }

      prefs.exists = true;
      const files = await this.getAllFiles(appDataPath);
      
      for (const file of files) {
        const size = await this.getFileSize(file);
        prefs.files.push({
          name: path.basename(file),
          path: file,
          relativePath: path.relative(appDataPath, file),
          size: size
        });
        prefs.size += size;
      }

      console.log(`✓ Found preferences at: ${appDataPath}`);
    } catch (error) {
      console.error(`Error scanning preferences: ${error.message}`);
    }

    return prefs;
  }

  /**
   * Find HyperMill databases
   */
  async findDatabases() {
    console.log('Searching for HyperMill databases...');
    
    const databases = [];
    const searchPaths = [
      this.commonPaths.publicDocs,
      this.commonPaths.userDocs,
      path.join(process.env.USERPROFILE || 'C:\\Users\\Public', 'Documents\\OPEN MIND')
    ];

    for (const searchPath of searchPaths) {
      try {
        if (!await this.pathExists(searchPath)) continue;

        const files = await this.getAllFiles(searchPath);
        const dbFiles = files.filter(f => 
          path.basename(f).toLowerCase().includes('db') && 
          (path.extname(f) === '.db' || path.extname(f) === '')
        );

        for (const dbFile of dbFiles) {
          databases.push({
            name: path.basename(dbFile),
            path: dbFile,
            size: await this.getFileSize(dbFile),
            modified: await this.getFileModified(dbFile)
          });
        }
      } catch (error) {
        console.debug(`Error searching for databases in ${searchPath}: ${error.message}`);
      }
    }

    console.log(`✓ Found ${databases.length} database files`);
    return databases;
  }

  /**
   * Helper: Check if path exists
   */
  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Get all files in directory recursively
   */
  async getAllFiles(dir, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        try {
          if (entry.isDirectory()) {
            // Skip system directories
            if (!entry.name.startsWith('.')) {
              await this.getAllFiles(fullPath, files);
            }
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        } catch (err) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      console.debug(`Error reading directory ${dir}: ${error.message}`);
    }

    return files;
  }

  /**
   * Helper: Count files in directory
   */
  async countFilesInDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter(e => e.isFile()).length;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Get file modification date
   */
  async getFileModified(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime;
    } catch {
      return null;
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(scanResults) {
    let totalFiles = 0;
    let totalSize = 0;

    const addSize = (arr) => {
      return arr.reduce((sum, f) => sum + (f.size || 0), 0);
    };

    totalFiles += scanResults.userFiles.macros.length;
    totalFiles += scanResults.userFiles.automations.length;
    totalFiles += scanResults.userFiles.configurations.length;
    totalFiles += scanResults.userFiles.scripts.length;
    totalFiles += scanResults.userFiles.other.length;

    totalSize += addSize(scanResults.userFiles.macros);
    totalSize += addSize(scanResults.userFiles.automations);
    totalSize += addSize(scanResults.userFiles.configurations);
    totalSize += addSize(scanResults.userFiles.scripts);
    totalSize += addSize(scanResults.userFiles.other);

    if (scanResults.userPreferences) {
      totalSize += scanResults.userPreferences.size;
    }

    return {
      totalFilesFound: totalFiles + scanResults.databases.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      automationCenterCount: scanResults.automationCenterPaths.length,
      databasesFound: scanResults.databases.length,
      hyperMillInstalled: scanResults.hyperMillInstallation?.found || false,
      scanCompletedAt: new Date().toISOString()
    };
  }
}

module.exports = ScannerService;
