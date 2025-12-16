const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const extract = require('extract-zip');

/**
 * SettingsParser - Extracts configuration from .omSettings export file
 * .omSettings is a ZIP archive containing XSREGISTER.XML with all user HyperMILL settings
 */
class SettingsParser {
  constructor() {
    this.xmlParser = new xml2js.Parser({ explicitArray: false });
    this.xmlBuilder = new xml2js.Builder();
  }

  /**
   * Parse .omSettings file and extract critical configuration
   * @param {string} omSettingsPath - Path to .omSettings file
   * @returns {Promise<Object>} - Parsed configuration object
   */
  async parseSettings(omSettingsPath) {
    try {
      // Check if file exists
      if (!fs.existsSync(omSettingsPath)) {
        throw new Error(`Settings file not found: ${omSettingsPath}`);
      }

      // Verify it's a ZIP file
      const header = fs.readFileSync(omSettingsPath, { flag: 'r' }).slice(0, 4);
      if (header[0] !== 0x50 || header[1] !== 0x4b) {
        throw new Error('File is not a valid ZIP archive');
      }

      // Create temporary extraction directory
      const tmpDir = path.join(path.dirname(omSettingsPath), `.tmp_${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        // Extract ZIP
        await extract(omSettingsPath, { dir: tmpDir });

        // Find and parse XSREGISTER.XML
        const xsRegisterPath = path.join(tmpDir, 'XSREGISTER.XML');
        if (!fs.existsSync(xsRegisterPath)) {
          throw new Error('XSREGISTER.XML not found in archive');
        }

        const xmlContent = fs.readFileSync(xsRegisterPath, 'utf-8');
        const parsedXml = await this.xmlParser.parseStringPromise(xmlContent);

        // Extract configuration
        const config = this.extractConfiguration(parsedXml);

        return {
          success: true,
          config,
          source: omSettingsPath,
          extractedAt: new Date().toISOString(),
          tempDir: tmpDir
        };
      } catch (error) {
        // Cleanup on error
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        source: omSettingsPath
      };
    }
  }

  /**
   * Extract configuration from parsed XML structure
   */
  extractConfiguration(xmlObj) {
    const config = {
      version: {},
      paths: {
        shared: {},
        user: {},
        company: {}
      },
      machines: [],
      databases: {
        tool: [],
        macro: [],
        project: []
      },
      userSettings: {},
      automationPaths: [],
      networkShares: []
    };

    try {
      const hm = xmlObj.hyperMILL;

      // Extract version info
      if (hm.$ && hm.$.Name) {
        config.version.name = hm.$.Name;
        config.version.major = hm.$.MajorVersion;
        config.version.minor = hm.$.MinorVersion;
      }

      // Extract all settings recursively
      const settingsObj = hm['hyperMILL.Settings'];
      if (settingsObj && settingsObj.Settings) {
        const settingsArray = Array.isArray(settingsObj.Settings) ? settingsObj.Settings : [settingsObj.Settings];
        
        settingsArray.forEach(settings => {
          if (settings['Settings.AdminSettings']) {
            const adminSettings = settings['Settings.AdminSettings'];
            this.extractPathsRecursively(adminSettings, config);
          }
          
          if (settings['Settings.UserSettings']) {
            const userSettings = settings['Settings.UserSettings'];
            this.extractUserSettingsRecursively(userSettings, config);
          }
        });
      }

      return config;
    } catch (error) {
      console.error('Error extracting configuration:', error);
      return config;
    }
  }

  /**
   * Recursively extract all paths from admin settings
   */
  extractPathsRecursively(obj, config) {
    if (!obj) return;

    // Handle AdminSettings
    if (obj.AdminSettings) {
      const adminSettings = Array.isArray(obj.AdminSettings) ? obj.AdminSettings : [obj.AdminSettings];
      adminSettings.forEach(as => {
        if (as.AdminSettings && as.AdminSettings.Settings) {
          const settings = Array.isArray(as.AdminSettings.Settings)
            ? as.AdminSettings.Settings
            : [as.AdminSettings.Settings];
          
          settings.forEach(setting => {
            this.extractSettingPath(setting, config);
          });
        }
      });
    }
  }

  /**
   * Extract individual setting path
   */
  extractSettingPath(setting, config) {
    if (!setting.$ || !setting.$.Key) return;

    const key = setting.$.Key;

    // Extract registry values
    if (setting.ConfigRegistry) {
      const cfgReg = Array.isArray(setting.ConfigRegistry)
        ? setting.ConfigRegistry[0]
        : setting.ConfigRegistry;
      
      config.paths.shared[key] = {
        value: cfgReg.$.Value,
        default: cfgReg.$.Default,
        registryPath: cfgReg.$.Path
      };

      // Extract network shares
      if (cfgReg.$.Value && cfgReg.$.Value.startsWith('\\\\')) {
        config.networkShares.push({
          name: key,
          path: cfgReg.$.Value
        });
      }

      // Extract automation paths
      if (key.includes('Automation') || key.includes('automation')) {
        config.automationPaths.push({
          name: key,
          path: cfgReg.$.Value
        });
      }
    }

    // Extract MDF (Machine Definition Files)
    if (setting.ConfigMDF && key === 'MDF') {
      const mdf = Array.isArray(setting.ConfigMDF)
        ? setting.ConfigMDF[0]
        : setting.ConfigMDF;
      
      if (mdf['ConfigMDF.MDFiles']) {
        const mdFiles = Array.isArray(mdf['ConfigMDF.MDFiles'].MDFiles)
          ? mdf['ConfigMDF.MDFiles'].MDFiles
          : [mdf['ConfigMDF.MDFiles'].MDFiles];

        mdFiles.forEach(mdFile => {
          if (mdFile.MachineDefinition) {
            const machDef = mdFile.MachineDefinition;
            config.machines.push({
              name: machDef.$.Name,
              mdfPath: machDef.$.Path,
              postProcessor: machDef.$.PostProcessor,
              machineModel: machDef.$.MachineModel
            });

            // Extract network paths from machine definitions
            if (machDef.$.Path && machDef.$.Path.startsWith('\\\\')) {
              config.networkShares.push({
                name: `MDF-${machDef.$.Name}`,
                path: machDef.$.Path
              });
            }
            if (machDef.$.PostProcessor && machDef.$.PostProcessor.startsWith('Y:\\')) {
              config.networkShares.push({
                name: `PostProcessor-${machDef.$.Name}`,
                path: machDef.$.PostProcessor
              });
            }
          }
        });
      }
    }

    // Extract database projects
    if (setting.ConfigGlobalDatabaseProjectsPath && key === 'DBProjects') {
      const dbConfig = setting.ConfigGlobalDatabaseProjectsPath;
      
      if (dbConfig['ConfigGlobalDatabaseProjectsPath.GlobalDatabaseProjects']) {
        const globalDb = dbConfig['ConfigGlobalDatabaseProjectsPath.GlobalDatabaseProjects'];
        
        if (globalDb.GlobalDatabaseProjects) {
          const appDb = globalDb.GlobalDatabaseProjects['GlobalDatabaseProjects.ApplicationDB'];
          if (appDb && appDb.DatabaseProject) {
            const dp = appDb.DatabaseProject;
            
            if (dp['DatabaseProject.ToolDatabase']) {
              const toolDbs = Array.isArray(dp['DatabaseProject.ToolDatabase'].ToolDatabase)
                ? dp['DatabaseProject.ToolDatabase'].ToolDatabase
                : [dp['DatabaseProject.ToolDatabase'].ToolDatabase];
              
              toolDbs.forEach(td => {
                if (td && td.$.Path) {
                  config.databases.tool.push({
                    path: td.$.Path,
                    type: 'global'
                  });

                  // Extract network paths
                  if (td.$.Path.startsWith('Y:\\') || td.$.Path.startsWith('\\\\')) {
                    config.networkShares.push({
                      name: `ToolDB-${td.$.Path.split('\\').pop()}`,
                      path: td.$.Path
                    });
                  }
                }
              });
            }
            
            if (dp['DatabaseProject.MacroDatabase']) {
              const macroDbs = Array.isArray(dp['DatabaseProject.MacroDatabase'].MacroDatabase)
                ? dp['DatabaseProject.MacroDatabase'].MacroDatabase
                : [dp['DatabaseProject.MacroDatabase'].MacroDatabase];
              
              macroDbs.forEach(md => {
                if (md && md.$.Path) {
                  config.databases.macro.push({
                    path: md.$.Path,
                    type: 'global'
                  });

                  // Extract network paths
                  if (md.$.Path.startsWith('Y:\\') || md.$.Path.startsWith('\\\\')) {
                    config.networkShares.push({
                      name: `MacroDB-${md.$.Path.split('\\').pop()}`,
                      path: md.$.Path
                    });
                  }
                }
              });
            }
          }
        }
      }
    }
  }

  /**
   * Extract user settings recursively
   */
  extractUserSettingsRecursively(obj, config) {
    if (!obj) return;

    if (obj.UserSettings) {
      const userSettings = Array.isArray(obj.UserSettings) ? obj.UserSettings : [obj.UserSettings];
      
      userSettings.forEach(us => {
        // Extract user working directories
        if (us.UserSettings && us.UserSettings.Settings) {
          const settings = Array.isArray(us.UserSettings.Settings)
            ? us.UserSettings.Settings
            : [us.UserSettings.Settings];

          settings.forEach(setting => {
            if (setting.$ && setting.$.Key && setting.ConfigRegistry) {
              const cfgReg = Array.isArray(setting.ConfigRegistry)
                ? setting.ConfigRegistry[0]
                : setting.ConfigRegistry;
              
              config.userSettings[setting.$.Key] = {
                value: cfgReg.$.Value,
                default: cfgReg.$.Default
              };
            }
          });
        }

        // Extract user directories
        if (us['UserSettings.UserDirectories']) {
          const udirs = us['UserSettings.UserDirectories'].UserDirectories;
          const udArray = Array.isArray(udirs) ? udirs : [udirs];
          
          udArray.forEach(udir => {
            if (udir.PackageDirectory) {
              const pd = Array.isArray(udir.PackageDirectory)
                ? udir.PackageDirectory[0]
                : udir.PackageDirectory;
              
              if (!config.userSettings.userDirectories) {
                config.userSettings.userDirectories = [];
              }
              
              config.userSettings.userDirectories.push({
                key: udir.$.Key,
                path: pd.$.Path
              });
            }
          });
        }

        // Extract user files
        if (us['UserSettings.UserFiles']) {
          const ufiles = us['UserSettings.UserFiles'].UserFiles;
          const ufArray = Array.isArray(ufiles) ? ufiles : [ufiles];
          
          ufArray.forEach(ufile => {
            if (ufile.FilePath) {
              const fp = Array.isArray(ufile.FilePath)
                ? ufile.FilePath[0]
                : ufile.FilePath;
              
              if (!config.userSettings.userFiles) {
                config.userSettings.userFiles = [];
              }
              
              config.userSettings.userFiles.push({
                key: ufile.$.Key,
                path: fp.$.Path
              });
            }
          });
        }
      });
    }
  }

  /**
   * Map token placeholders to actual paths
   * Tokens: [HYPERMILL], [APPDATA], [USER_CFG], [TOOLDB], [VERSION], [USER]
   */
  mapPathTokens(path, tokenMap) {
    let mapped = path;
    
    Object.entries(tokenMap).forEach(([token, value]) => {
      mapped = mapped.replace(`[${token}]`, value);
    });

    return mapped;
  }

  /**
   * Generate token map for a user based on extracted config
   */
  generateTokenMap(config, username) {
    const hyperMillInstall = config.paths.shared.hyperMillInstall?.value || 
                             'C:\\Program Files\\OPEN MIND\\hyperMILL\\33.0\\';
    
    return {
      HYPERMILL: hyperMillInstall,
      TOOLDB: 'C:\\Program Files\\OPEN MIND\\Tool Database\\33.0',
      APPDATA: `C:\\Users\\${username}\\AppData\\Roaming`,
      USER_CFG: `C:\\Users\\${username}\\AppData\\Roaming`,
      VERSION: '33.0',
      USER: username,
      GWS: 'C:\\Users\\Public\\Documents\\OPEN MIND',
      PUBLICDOCUMENTS: 'C:\\Users\\Public\\Documents',
      COMMON_APPDATA: 'C:\\ProgramData'
    };
  }

  /**
   * Cleanup temporary extraction directory
   */
  async cleanup(tempDir) {
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { success: true };
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    return { success: false };
  }
}

module.exports = SettingsParser;
