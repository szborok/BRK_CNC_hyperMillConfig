# HyperMILL Settings Parser & User Profile Manager

## Overview

The HyperMILL Config module now has a complete settings parsing and user profile management system. It can:

1. **Parse .omSettings files** - Exported HyperMILL configuration archives (ZIP format)
2. **Extract configuration** - Pull out paths, machines, databases, and user settings
3. **Map path tokens** - Convert templated paths to actual system paths per user
4. **Generate scanner config** - Create specific scan configurations for each user's HyperMILL installation
5. **Manage user profiles** - Store and track settings per logged-in user

## Architecture

### Core Services

#### 1. SettingsParser (`src/services/SettingsParser.js`)
**Purpose**: Extract and parse HyperMILL configuration from .omSettings files

**Key Methods**:
- `parseSettings(omSettingsPath)` - Main entry point, handles ZIP extraction and XML parsing
- `extractConfiguration(xmlObj)` - Recursively extracts all paths and settings
- `extractPathsRecursively(obj, config)` - Finds all registry paths and configurations
- `extractSettingPath(setting, config)` - Processes individual settings
- `extractMachineDefinitions()` - Finds all machine definitions
- `extractDatabases()` - Locates tool and macro databases
- `mapPathTokens(path, tokenMap)` - Replaces [TOKENS] with actual paths
- `generateTokenMap(username)` - Creates default token mappings

**Dependencies**:
- `xml2js` - XML parsing
- `extract-zip` - ZIP extraction
- Node.js `fs`, `path` built-ins

**Data Extracted**:
- Version info (HyperMILL 33.0, etc.)
- Shared paths (installation, tooldb, etc.)
- User directories (automation center, tool database, config files)
- Machine definitions (names, MDF paths, post-processors)
- Tool and macro databases (network shares)
- Network shared paths (\\effs1\CAM\PM_SETUP\Westcam_hyperMILL\, Y:\Westcam_hyperMILL\, etc.)
- Automation paths and configurations

#### 2. UserProfileService (`src/services/UserProfileService.js`)
**Purpose**: Manage per-user HyperMILL configuration and profiles

**Key Methods**:
- `saveUserSettings(username, settingsFilePath)` - Store .omSettings file for user
- `getLatestUserSettings(username)` - Retrieve most recent settings file
- `saveParsedConfig(username, configObject)` - Store parsed configuration
- `getParsedConfig(username)` - Load parsed configuration
- `saveScannerConfig(username, scannerConfig)` - Store scanner configuration
- `getScannerConfig(username)` - Load scanner configuration
- `generateScannerConfig(username, parsedConfig)` - Create user-specific scan paths
- `mapPathTokens(pathString, tokenMap)` - Replace tokens with actual paths
- `generateTokenMap(username)` - Create token mappings for user
- `categorizePathType(key)` - Classify paths by type
- `getUserProfileSummary(username)` - Get profile overview
- `listProfiles()` - List all user profiles
- `deleteProfile(username)` - Remove user profile

**Directory Structure**:
```
data/user-profiles/
  {username}/
    settings/
      latest.omSettings          # Symlink to latest settings file
      user-settings-[timestamp].omSettings
    parsed/
      config.json                # Extracted configuration
    scanner-config/
      scan-paths.json            # Mapped paths ready for scanner
    backups/
```

**Token Mapping Example**:
```javascript
{
  HYPERMILL: "C:\\Program Files\\OPEN MIND\\hyperMILL\\33.0",
  TOOLDB: "C:\\Program Files\\OPEN MIND\\Tool Database\\33.0",
  APPDATA: "C:\\Users\\{username}\\AppData\\Roaming",
  USER_CFG: "C:\\Users\\{username}\\AppData\\Roaming",
  VERSION: "33.0",
  USER: "{username}",
  MAJOR_VERSION: "33",
  GWS: "C:\\Users\\Public\\Documents\\OPEN MIND",
  PUBLICDOCUMENTS: "C:\\Users\\Public\\Documents",
  COMMON_APPDATA: "C:\\ProgramData"
}
```

### API Endpoints

#### Profile Routes (`src/routes/profileRoutes.js`)

**POST /api/profiles/{username}/settings**
- Upload user .omSettings file
- Stores in user profile directory

**POST /api/profiles/{username}/parse**
- Parse uploaded .omSettings file
- Extracts and saves configuration

**POST /api/profiles/{username}/generate-scan-config**
- Generate scanner configuration from parsed settings
- Maps paths for user's system

**GET /api/profiles/{username}**
- Get user profile summary
- Shows profile status and file locations

**GET /api/profiles/{username}/settings**
- Get latest settings file info

**GET /api/profiles/{username}/config**
- Get parsed configuration

**GET /api/profiles/{username}/scan-config**
- Get scanner configuration with mapped paths

**GET /api/profiles**
- List all user profiles

**DELETE /api/profiles/{username}**
- Remove user profile

### Data Flow

```
1. User exports settings from HyperMILL Configuration Center
   → mySettings.omSettings (272MB ZIP file)

2. Upload via API: POST /api/profiles/szborok/settings
   → Stored in: data/user-profiles/szborok/settings/

3. Parse settings: POST /api/profiles/szborok/parse
   → Extract XML from ZIP
   → Recursively extract paths, machines, databases
   → Save to: data/user-profiles/szborok/parsed/config.json

4. Generate scan config: POST /api/profiles/szborok/generate-scan-config
   → Map tokens: [USER_CFG] → C:\Users\szborok\AppData\Roaming
   → Create list of paths to monitor for user
   → Save to: data/user-profiles/szborok/scanner-config/scan-paths.json

5. Scanner uses config
   → Scans all paths in scan-paths.json
   → Monitors for file changes
   → Tracks automation scripts, macros, configurations
```

## Configuration Structure

### Extracted Configuration (config.json)
```javascript
{
  version: {
    name: "2024.1",
    major: "33",
    minor: "0"
  },
  paths: {
    shared: {},    // Registry-based shared paths
    user: {},      // User-specific paths
    company: {}    // Company-wide paths
  },
  machines: [      // Machine definitions from MDF
    {
      name: "DMU 100P duoblock",
      mdfPath: "\\effs1\\CAM\\...",
      postProcessor: "Y:\\Westcam_hyperMILL\\...",
      machineModel: "Y:\\Westcam_hyperMILL\\..."
    }
  ],
  databases: {
    tool: [        // Tool databases
      { path: "Y:\\Westcam_hyperMILL\\...", type: "global" }
    ],
    macro: [       // Macro databases  
      { path: "Y:\\hyperMILL\\_Hypercad_beallitasok\\...", type: "global" }
    ]
  },
  userSettings: {
    userDirectories: [
      {
        key: "AutomationCenterUser",
        path: "[USER_CFG]\\USERS\\[USER]\\AutomationCenter"
      },
      // ... more directories
    ],
    userFiles: [
      {
        key: "hmDoc.cfg",
        path: "[USER_CFG]\\USERS\\[USER]\\hmDoc.cfg"
      },
      // ... more files
    ]
  },
  automationPaths: [],
  networkShares: []  // Extracted network paths
}
```

### Scanner Configuration (scan-paths.json)
```javascript
{
  username: "szborok",
  generatedAt: "2025-12-16T18:33:08.104Z",
  sourceScan: "hyperMILL-omSettings",
  tokenMap: {
    // Token mappings
  },
  pathsToScan: [
    {
      path: "C:\\Users\\szborok\\AppData\\Roaming\\OPEN MIND\\Automation Center",
      pathTemplate: "[APPDATA]\\OPEN MIND\\Automation Center",
      type: "automation-center",
      description: "HyperMILL AutomationCenter",
      key: "AutomationCenter"
    },
    // ... more paths
  ],
  machines: [],
  databases: {
    toolDatabases: [],
    macroDatabases: []
  },
  networkShares: []
}
```

## Key Features

### 1. ZIP-based Settings File Support
- Reads .omSettings files exported from HyperMILL Configuration Center
- Validates ZIP format and structure
- Extracts XSREGISTER.XML and configuration files

### 2. Deep Configuration Extraction
- Recursively parses XML structure
- Handles nested registry configurations
- Extracts machine definitions with post-processors
- Finds database references (tool, macro, project databases)
- Identifies network shares and automation paths

### 3. Token-based Path Mapping
- Supports dynamic path placeholders: [APPDATA], [USER_CFG], [USER], [VERSION], etc.
- Maps tokens to actual system paths per user
- Allows configuration to work across different user accounts

### 4. Per-User Profile Management
- Stores .omSettings files per user
- Tracks multiple versions (timestamped)
- Maintains parsed config and scanner config
- Enables multi-user scenario (different users, different configs)

### 5. Scanner Integration
- Generated scan-paths.json can be directly used by ScannerService
- Includes:
  - User automation center directories
  - Configuration files
  - Working directories
  - Tool and macro databases
  - Network share locations

## Testing

Run test with:
```bash
node test-settings-parser.js
```

Output shows:
- Version information extracted
- Configuration structure
- Sample paths that will be scanned
- Profile creation and file storage

## Next Steps

1. **Update ScannerService** to use generated scan-paths.json
2. **Implement file monitoring** for changes in scanned paths
3. **Add database schema** for tracking files and changes
4. **Create UI** for user profile management
5. **Add automation tracking** - detect new macros/scripts
6. **Implement sharing mechanism** - upload to company file pool

## Usage Example

```javascript
const SettingsParser = require('./src/services/SettingsParser');
const UserProfileService = require('./src/services/UserProfileService');

const parser = new SettingsParser();
const profileService = new UserProfileService();

// Parse user settings
const result = await parser.parseSettings('/path/to/mySettings.omSettings');

// Save to user profile
profileService.saveParsedConfig('szborok', result.config);

// Generate scanner config
const scanConfig = profileService.generateScannerConfig('szborok', result.config);

// Get all paths to scan
console.log(scanConfig.pathsToScan);
// [
//   { path: "C:\Users\szborok\AppData\Roaming\OPEN MIND\Automation Center", ... },
//   { path: "C:\Users\szborok\AppData\Roaming\USERS\szborok\AutomationCenter", ... },
//   ...
// ]
```

## Files Modified/Created

- ✅ `src/services/SettingsParser.js` - NEW
- ✅ `src/services/UserProfileService.js` - NEW
- ✅ `src/routes/profileRoutes.js` - NEW
- ✅ `src/server.js` - Updated (added profile routes)
- ✅ `test-settings-parser.js` - NEW
- ✅ `package.json` - Dependencies: xml2js, extract-zip, multer

## Dependencies

```json
{
  "xml2js": "^0.6.x",        // XML parsing
  "extract-zip": "^2.0.x",   // ZIP extraction
  "multer": "^1.4.x",        // File upload handling
  "express": "^4.x",         // Web framework
  "cors": "^2.x"             // CORS middleware
}
```
