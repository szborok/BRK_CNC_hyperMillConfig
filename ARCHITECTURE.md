# HyperMILL Config Module - Complete Architecture

## 🎯 Mission

Build a system to:
1. **Import** user HyperMILL configurations (.omSettings files)
2. **Parse** complex XML configuration structures
3. **Extract** automation paths, machine definitions, and databases
4. **Map** paths dynamically per-user with token substitution
5. **Generate** scanner configurations for file monitoring
6. **Manage** user profiles and their settings

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interface Layer                        │
│  (Upload .omSettings, View Profiles, Manage Automations)         │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────────────┐
│                      REST API Layer                              │
│  /api/profiles/* - Profile management and configuration handling │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────────────┐
│                    Service Layer                                 │
│  ┌──────────────────┐  ┌────────────────────┐                   │
│  │ SettingsParser   │  │ UserProfileService │                   │
│  │ - Parse ZIP      │  │ - Manage profiles  │                   │
│  │ - Extract XML    │  │ - Store configs    │                   │
│  │ - Map tokens     │  │ - Generate scans   │                   │
│  └──────────────────┘  └────────────────────┘                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────────────┐
│                  Data Storage Layer                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ data/user-profiles/                                     │    │
│  │  └─ {username}/                                         │    │
│  │      ├─ settings/ (mySettings.omSettings files)        │    │
│  │      ├─ parsed/ (config.json)                          │    │
│  │      ├─ scanner-config/ (scan-paths.json)              │    │
│  │      └─ backups/ (version history)                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
         ┌──────────────────┐
         │ ScannerService   │
         │ (Monitoring)     │
         └──────────────────┘
```

## 🔄 Data Flow

### Import Phase
```
.omSettings File (ZIP)
    │
    ▼
SettingsParser.parseSettings()
    │
    ├─→ Validate ZIP format (magic bytes 50 4B)
    ├─→ Extract to temp directory
    ├─→ Parse XSREGISTER.XML
    └─→ Recursively extract configuration
    │
    ▼
Parsed Configuration Object
    │
    ├─ version: { name, major, minor }
    ├─ paths: { shared: {}, user: {}, company: {} }
    ├─ machines: [{ name, mdfPath, postProcessor, ... }]
    ├─ databases: { tool: [], macro: [] }
    ├─ userSettings: { userDirectories[], userFiles[] }
    ├─ automationPaths: []
    └─ networkShares: []
```

### Storage Phase
```
UserProfileService.saveParsedConfig()
    │
    ▼
data/user-profiles/szborok/parsed/config.json
    └─ Complete extracted configuration (for reference)

UserProfileService.saveUserSettings()
    │
    ▼
data/user-profiles/szborok/settings/latest.omSettings
    └─ Original .omSettings file (for re-parsing if needed)
```

### Mapping Phase
```
UserProfileService.generateScannerConfig()
    │
    ├─→ Generate token map for username
    │   [APPDATA] → C:\Users\szborok\AppData\Roaming
    │   [USER_CFG] → C:\Users\szborok\AppData\Roaming
    │   [USER] → szborok
    │   [VERSION] → 33.0
    │   etc.
    │
    ├─→ Iterate through user directories
    │   For each: Map tokens in path
    │   [USER_CFG]\USERS\[USER]\AutomationCenter
    │   → C:\Users\szborok\AppData\Roaming\USERS\szborok\AutomationCenter
    │
    ├─→ Iterate through user files
    │   For each: Map tokens in file paths
    │
    └─→ Categorize by type
        automation-center, tool-database, configuration, etc.
```

### Scanner Integration Phase
```
data/user-profiles/szborok/scanner-config/scan-paths.json
    │
    ▼
ScannerService (Future)
    │
    ├─ Monitor C:\Users\szborok\AppData\Roaming\...
    │  └─ Track automation center changes
    │  └─ Detect new macros/scripts
    │  └─ Monitor config file modifications
    │
    └─ Index all found files
       └─ Prepare for sharing to company file pool
```

## 📁 Data Structures

### .omSettings File Structure (Inside ZIP)
```
mySettings.omSettings (ZIP Archive)
├── XSREGISTER.XML                    ← Configuration manifest
├── [Content_Types].xml               ← Package metadata
├── UUID-folder/                      ← Configuration containers
│   ├── hmDoc.cfg
│   ├── hmCc.cfg
│   ├── hmCurv.cfg
│   └── ... (60+ config files)
├── VARIANTS/                         ← CRITICAL: User automations
│   ├── 30-FCS-KERES+ (RUNTIME)/
│   ├── 50-FCS-M8-398x398-_100P2.../
│   ├── VASUT_Apoz_SZABI/            ← User workflow #1
│   │   ├── Bookmark.pw
│   │   ├── Data.prot
│   │   ├── Structure.pw
│   │   ├── backup/                  ← 21+ version backups
│   │   └── ...
│   └── VASUT_Bpoz_SZABI/            ← User workflow #2
├── MACHINE_DIN_ISO.cfg
├── MACHINE_DMU+100P.cfg
├── omToolDB.cfg
├── omTdbIfx.cfg
├── hyperMILL+SHOP+Viewer.7z         ← Compressed modules
├── *.omb, *.omcpf, *.omt files       ← Project archives
└── ... (1000+ files/folders total)
```

### Parsed Configuration (config.json)
```json
{
  "version": {
    "name": "2024.1",
    "major": "33",
    "minor": "0"
  },
  "paths": {
    "shared": {},
    "user": {},
    "company": {}
  },
  "machines": [
    {
      "name": "DMU 100P duoblock",
      "mdfPath": "\\effs1\\CAM\\PM_SETUP\\...",
      "postProcessor": "Y:\\Westcam_hyperMILL\\...",
      "machineModel": "Y:\\Westcam_hyperMILL\\..."
    }
  ],
  "databases": {
    "tool": [
      { "path": "Y:\\Westcam_hyperMILL\\...", "type": "global" }
    ],
    "macro": [
      { "path": "Y:\\hyperMILL\\_Hypercad_beallitasok\\...", "type": "global" }
    ]
  },
  "userSettings": {
    "userDirectories": [
      {
        "key": "AutomationCenterUser",
        "path": "[USER_CFG]\\USERS\\[USER]\\AutomationCenter"
      }
    ],
    "userFiles": [
      {
        "key": "hmDoc.cfg",
        "path": "[USER_CFG]\\USERS\\[USER]\\hmDoc.cfg"
      }
    ]
  },
  "automationPaths": [],
  "networkShares": []
}
```

### Scanner Configuration (scan-paths.json)
```json
{
  "username": "szborok",
  "generatedAt": "2025-12-16T18:33:08.104Z",
  "sourceScan": "hyperMILL-omSettings",
  "tokenMap": {
    "APPDATA": "C:\\Users\\szborok\\AppData\\Roaming",
    "USER": "szborok",
    "VERSION": "33.0"
  },
  "pathsToScan": [
    {
      "path": "C:\\Users\\szborok\\AppData\\Roaming\\OPEN MIND\\Automation Center",
      "pathTemplate": "[APPDATA]\\OPEN MIND\\Automation Center",
      "type": "automation-center",
      "key": "AutomationCenter"
    },
    {
      "path": "C:\\Users\\szborok\\AppData\\Roaming\\USERS\\szborok\\AutomationCenter",
      "pathTemplate": "[USER_CFG]\\USERS\\[USER]\\AutomationCenter",
      "type": "automation-center",
      "key": "AutomationCenterUser"
    }
  ]
}
```

## 🔑 Key Insights

### About .omSettings Files
- **Format**: ZIP archive (272MB for complete export)
- **Contents**: Complete HyperMILL user profile
- **Key Folders**:
  - `VARIANTS/` - User automation workflows (CRITICAL)
  - `USERS/*` - User-specific configurations
  - `Datenbanken/` - Database references
  - Machine definitions and post-processors
- **Important**: Stores 20+ backups per automation workflow

### Token Substitution Strategy
- Paths in XSREGISTER.XML use tokens: `[APPDATA]`, `[USER_CFG]`, `[USER]`, etc.
- Allows same config to work for different users
- Essential for multi-user environment (different home directories)

### Network Share Discovery
- Extracts network paths from machine definitions
- Finds shared automation resources: `\\effs1\CAM\PM_SETUP\...`
- Locates tool databases: `Y:\Westcam_hyperMILL\Datenbanken\...`
- Can be used to sync with company file pool

## 🚀 API Usage Example

### Step 1: Upload Settings
```bash
curl -X POST \
  -F "settingsFile=@mySettings.omSettings" \
  http://localhost:3009/api/profiles/szborok/settings
```

### Step 2: Parse Settings
```bash
curl -X POST \
  http://localhost:3009/api/profiles/szborok/parse
```

### Step 3: Generate Scanner Config
```bash
curl -X POST \
  http://localhost:3009/api/profiles/szborok/generate-scan-config
```

### Step 4: Get Scanner Config
```bash
curl -X GET \
  http://localhost:3009/api/profiles/szborok/scan-config
```

Response includes:
- All paths to monitor
- Token mappings
- Machines and databases
- Network shares to access

## 📈 Future Enhancements

1. **File Monitoring Service**
   - Watch all paths in scan-paths.json
   - Detect changes in real-time
   - Track modification history

2. **Automation Library Management**
   - Index all found automations
   - Store metadata (name, date, version)
   - Enable sharing with team

3. **Configuration Sync**
   - Sync changes back to company shared pool
   - Version control for automations
   - Backup and recovery

4. **User Interface**
   - Profile dashboard
   - Upload wizard
   - Automation browser
   - Settings editor

5. **Advanced Analytics**
   - Most used automations
   - Dependency analysis
   - Conflict detection

## 📦 Dependencies

- **xml2js** - Parse XML configuration from .omSettings
- **extract-zip** - Extract ZIP archives
- **multer** - Handle file uploads
- **express** - REST API framework
- **cors** - Cross-origin requests
- **winston** - Logging (future)

## 🔒 Security Considerations

- File upload validation (only .omSettings)
- File size limits (500MB for .omSettings, 50MB per file)
- User profile isolation (data per username)
- Network path validation before access
- Cleanup of temporary extraction directories

## 📊 Current Implementation Status

✅ **Completed**
- SettingsParser service (full extraction logic)
- UserProfileService (profile management)
- API routes (upload, parse, generate, retrieve)
- Token mapping system
- Path categorization

🔄 **Planned**
- File monitoring and change detection
- Database schema for tracking
- Automation indexing
- Company file pool integration
- Web UI dashboard

## 🎓 Learning Outcomes

- HyperMILL configuration structure and hierarchy
- ZIP-based configuration export format
- XML parsing with recursive structure handling
- Token-based dynamic path mapping
- Multi-user profile management patterns
- REST API design for configuration services

---

**Module Location**: `BRK_CNC_hyperMillConfig/`
**Server Port**: 3009
**Documentation**: See SETTINGS_PARSER_README.md and USER_SCAN_CONFIG.md
