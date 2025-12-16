# User szborok - HyperMILL Scan Configuration

Generated from exported .omSettings file analysis.

## Configuration Summary

- **Username**: szborok
- **HyperMILL Version**: 33.0 (2024.1)
- **Settings Source**: mySettings.omSettings (272MB export)
- **Generated**: 2025-12-16

## Paths to Monitor

The following paths will be scanned for this user's HyperMILL automation and configuration files:

### 1. Automation Centers
```
C:\Users\szborok\AppData\Roaming\OPEN MIND\Automation Center
  └─ Global automation scripts and templates
  
C:\Users\szborok\AppData\Roaming\USERS\szborok\AutomationCenter
  └─ User-specific automation workflows
  └─ This is where VASUT_Apoz_SZABI, VASUT_Bpoz_SZABI will be located
```

### 2. Tool Database
```
C:\Users\szborok\AppData\Roaming\OPEN MIND\Tool Database\33.0
  └─ User's tool database directory
```

### 3. Configuration Files
```
C:\Users\szborok\AppData\Roaming\USERS\szborok\hmDoc.cfg
  └─ User document configuration

C:\Users\szborok\AppData\Roaming\USERS\szborok\hmDoc.cfb
  └─ User document configuration backup

C:\Users\szborok\AppData\Roaming\USERS\szborok\metric.cfg
  └─ Metric system configuration

C:\Users\szborok\AppData\Roaming\USERS\szborok\inch.cfg
  └─ Inch system configuration

C:\Users\szborok\AppData\Roaming\USERS\szborok\AutomationCenter33.cfg
  └─ Automation center specific configuration

C:\Users\szborok\AppData\Roaming\USERS\szborok\licLoad.ini
  └─ License loading configuration
```

### 4. Feature Technology
```
C:\Users\szborok\AppData\Roaming\USERS\featTech
  └─ Feature technology configurations and macros
```

### 5. HyperVIEW Configuration
```
C:\Users\szborok\AppData\Roaming\OPEN MIND\hyperVIEW\33.0\hyperVIEW.cfg
  └─ Viewer configuration
```

## Company Shared Resources (Available but not scanned for user)

These paths are available from the user's settings but are company-wide resources:

### Machine Definitions
- **Server**: \\effs1\CAM\PM_SETUP\Westcam_hyperMILL\Globales MDF\MDF
- **Content**: All machine definition files (.mdf) for:
  - DMC 100 V Linear
  - DMC 105 V Linear
  - DMU 100P duoblock
  - DMU 60T monoblock
  - OPS Ingersoll SPEED HAWK
  - TRIMILL VU 3019
  - And 10+ more machines

### Post-Processors
- **Server**: Y:\Westcam_hyperMILL\Postprozessor\
- **Content**: Machine-specific post-processors with versions
  - 3x DMG DMC 100V hi-dyn
  - 3x DMG DMC 105V linear
  - 5x DMG DMU 100P duoBLOCK
  - 5x DMG DMU 60T monoBLOCK
  - And more...

### Tool Databases
- **Path**: Y:\Westcam_hyperMILL\Datenbanken\Werkzeugdatenbank\20231130\eur-20231130.db
- **Type**: Shared tool database (Euro tools, updated Nov 30, 2023)

### Macro Databases
- **Path**: Y:\hyperMILL\_Hypercad_beallitasok\Pascu Dávid\MAKRO\dpascu_macro_database.db
- **Type**: Shared macro database

### Additional Resources
- Color tables: Y:\Westcam_hyperMILL\Datenbanken\Farbtabelle\
- Virtual tools: Y:\Westcam_hyperMILL\Datenbanken\VirtualTool\
- Machine models: Y:\Westcam_hyperMILL\Maschinenmodell\

## What Gets Tracked

### In User Automation Center
The scanner will find and track:
- ✅ User automation workflows (VASUT_Apoz_SZABI, VASUT_Bpoz_SZABI, etc.)
- ✅ Custom macros and scripts
- ✅ Version history and backups
- ✅ Configuration files (.pw, .prot files)
- ✅ Workflow definitions

### In Configuration Files
- ✅ Document settings and preferences
- ✅ Unit system preferences (metric/inch)
- ✅ Automation center configuration
- ✅ Feature technology settings
- ✅ License information

### In Feature Technology
- ✅ Custom feature definitions
- ✅ Technology files
- ✅ Macro collections

## Integration with Scanner Service

The ScannerService can use this configuration to:

1. **Monitor for changes** in all scanned paths
2. **Detect new automations** when VASUT_Apoz_SZABI, etc. are modified
3. **Track configuration updates** when .cfg files change
4. **Index user files** for sharing with team
5. **Generate backups** of important configurations

## Token Reference

The following tokens are automatically mapped for this user:

| Token | Value |
|-------|-------|
| [APPDATA] | C:\Users\szborok\AppData\Roaming |
| [USER_CFG] | C:\Users\szborok\AppData\Roaming |
| [USER] | szborok |
| [HYPERMILL] | C:\Program Files\OPEN MIND\hyperMILL\33.0 |
| [TOOLDB] | C:\Program Files\OPEN MIND\Tool Database\33.0 |
| [VERSION] | 33.0 |
| [MAJOR_VERSION] | 33 |
| [GWS] | C:\Users\Public\Documents\OPEN MIND |
| [PUBLICDOCUMENTS] | C:\Users\Public\Documents |
| [COMMON_APPDATA] | C:\ProgramData |

## Files in scan-paths.json

Location: `data\user-profiles\szborok\scanner-config\scan-paths.json`

Contains:
- ✅ 11 total paths to scan
- ✅ Token mappings for this user
- ✅ Path types categorized (automation-center, tool-database, configuration, etc.)
- ✅ Machine definitions (0 found in user scope)
- ✅ Database references (0 found in user scope - company shared)

## How to Use with Scanner

```javascript
// Load user's scan configuration
const UserProfileService = require('./src/services/UserProfileService');
const profileService = new UserProfileService();
const scanConfig = profileService.getScannerConfig('szborok');

// Pass to Scanner
const ScannerService = require('./src/services/ScannerService');
const scanner = new ScannerService();

// Scan only user's configured paths
for (const pathEntry of scanConfig.config.pathsToScan) {
  const files = scanner.getAllFiles(pathEntry.path);
  // Process files, track changes, etc.
}
```

## Next Steps

1. Implement file monitoring on these paths
2. Track file creation, modification, deletion events
3. Store file metadata in database
4. Generate reports of user's automation changes
5. Create UI to show tracked automations
6. Implement sharing mechanism for team automation library
