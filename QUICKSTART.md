# Quick Start Guide - HyperMILL Settings Parser

## Installation & Setup

### 1. Dependencies Already Installed
```bash
cd BRK_CNC_hyperMillConfig
npm install  # xml2js, extract-zip, multer, express, cors
```

### 2. Start the Server
```bash
node src/server.js
# Server running on port 3009
```

## Usage Workflow

### Step 1: Export Settings from HyperMILL

In HyperMILL Configuration Center:
1. Go to **Tools** → **Export Settings**
2. Select **Export to File**
3. Save as `mySettings.omSettings`
4. File size: ~272MB (complete configuration backup)

### Step 2: Upload Settings File

**Using curl:**
```bash
curl -X POST \
  -F "settingsFile=@mySettings.omSettings" \
  http://localhost:3009/api/profiles/szborok/settings
```

**Expected response:**
```json
{
  "success": true,
  "message": "Settings file uploaded successfully",
  "savedPath": "data/user-profiles/szborok/settings/user-settings-1765909817253.omSettings",
  "latestPath": "data/user-profiles/szborok/settings/latest.omSettings"
}
```

### Step 3: Parse the Settings

**Using curl:**
```bash
curl -X POST \
  http://localhost:3009/api/profiles/szborok/parse
```

**Expected response:**
```json
{
  "success": true,
  "message": "Settings parsed successfully",
  "config": {
    "version": { "name": "2024.1", "major": "33", "minor": "0" },
    "machines": [],
    "databases": { "tool": [], "macro": [] },
    "userSettings": {
      "userDirectories": [
        { "key": "AutomationCenter", "path": "[APPDATA]\\OPEN MIND\\Automation Center" },
        { "key": "AutomationCenterUser", "path": "[USER_CFG]\\USERS\\[USER]\\AutomationCenter" },
        ...
      ]
    }
  }
}
```

### Step 4: Generate Scanner Configuration

**Using curl:**
```bash
curl -X POST \
  http://localhost:3009/api/profiles/szborok/generate-scan-config
```

**Expected response:**
```json
{
  "success": true,
  "message": "Scanner configuration generated",
  "scanConfig": {
    "username": "szborok",
    "pathsToScan": [
      {
        "path": "C:\\Users\\szborok\\AppData\\Roaming\\OPEN MIND\\Automation Center",
        "type": "automation-center",
        "key": "AutomationCenter"
      },
      {
        "path": "C:\\Users\\szborok\\AppData\\Roaming\\USERS\\szborok\\AutomationCenter",
        "type": "automation-center",
        "key": "AutomationCenterUser"
      },
      {
        "path": "C:\\Users\\szborok\\AppData\\Roaming\\USERS\\szborok\\hmDoc.cfg",
        "type": "user-config-file",
        "key": "hmDoc.cfg"
      },
      ...
    ]
  }
}
```

### Step 5: Get Profile Summary

**Using curl:**
```bash
curl -X GET \
  http://localhost:3009/api/profiles/szborok
```

**Expected response:**
```json
{
  "found": true,
  "username": "szborok",
  "profileDirectory": "D:\\Borok\\Private\\_CODING\\BRK_CNC_System\\BRK_CNC_hyperMillConfig\\data\\user-profiles\\szborok",
  "hasSettings": true,
  "settingsFile": "data/user-profiles/szborok/settings/latest.omSettings",
  "hasParsedConfig": true,
  "hasAutomationPaths": true,
  "createdAt": "2025-12-16T18:33:08.000Z",
  "lastModified": "2025-12-16T18:33:08.000Z"
}
```

## Testing

### Run the Test Script
```bash
cd BRK_CNC_hyperMillConfig
node test-settings-parser.js
```

This script:
1. ✅ Parses the .omSettings file from test-data
2. ✅ Extracts configuration
3. ✅ Saves to user profile
4. ✅ Generates scanner config
5. ✅ Shows all mapped paths
6. ✅ Displays profile summary

### Test Output
```
🧪 Testing HyperMILL .omSettings Parser

✅ Parse successful!

📊 Configuration Summary:
   Name: 2024.1
   Major: 33
   Minor: 0

✅ Settings saved: data/user-profiles/szborok/settings/...
✅ Parsed config saved: data/user-profiles/szborok/parsed/config.json
✅ Scanner config saved: data/user-profiles/szborok/scanner-config/scan-paths.json

📍 Scan Paths to Monitor:
   [automation-center] C:\Users\szborok\AppData\Roaming\OPEN MIND\Automation Center
   [tool-database] C:\Users\szborok\AppData\Roaming\OPEN MIND\Tool Database\33.0
   [automation-center] C:\Users\szborok\AppData\Roaming\USERS\szborok\AutomationCenter
   [configuration] C:\Users\szborok\AppData\Roaming\USERS\szborok\inch.cfg
   [configuration] C:\Users\szborok\AppData\Roaming\USERS\szborok\metric.cfg
   [user-config-file] C:\Users\szborok\AppData\Roaming\OPEN MIND\hyperVIEW\33.0\hyperVIEW.cfg
   [user-config-file] C:\Users\szborok\AppData\Roaming\USERS\szborok\hmDoc.cfg
   ... and more
```

## File Structure After Setup

```
BRK_CNC_hyperMillConfig/
├── src/
│   ├── server.js
│   ├── services/
│   │   ├── SettingsParser.js      ← Parse .omSettings files
│   │   ├── UserProfileService.js  ← Manage user profiles
│   │   └── ScannerService.js
│   └── routes/
│       ├── profileRoutes.js       ← API endpoints
│       └── scanRoutes.js
├── data/
│   └── user-profiles/
│       └── {username}/
│           ├── settings/          ← .omSettings files
│           ├── parsed/            ← config.json (extracted)
│           ├── scanner-config/    ← scan-paths.json (ready for scan)
│           └── backups/
├── test-settings-parser.js
├── SETTINGS_PARSER_README.md
├── ARCHITECTURE.md
└── USER_SCAN_CONFIG.md
```

## Common Tasks

### List All User Profiles
```bash
curl -X GET http://localhost:3009/api/profiles
```

### Get Parsed Configuration for User
```bash
curl -X GET http://localhost:3009/api/profiles/szborok/config
```

### Get Scanner Configuration for User
```bash
curl -X GET http://localhost:3009/api/profiles/szborok/scan-config
```

### Delete User Profile
```bash
curl -X DELETE http://localhost:3009/api/profiles/szborok
```

## What Gets Extracted

### User Automation Paths
Where the user's custom automation workflows (like VASUT_Apoz_SZABI) are stored:
- `C:\Users\{username}\AppData\Roaming\USERS\{username}\AutomationCenter`
- Version history: stored with 20+ backups each

### Configuration Files
- `hmDoc.cfg` - Document configuration
- `hmDoc.cfb` - Document backup
- `metric.cfg` / `inch.cfg` - Unit system configs
- `AutomationCenter33.cfg` - Automation specific config
- `licLoad.ini` - License information

### Company Shared Resources (Referenced)
- Machine definitions: `\\effs1\CAM\PM_SETUP\Westcam_hyperMILL\MDF\`
- Post-processors: `Y:\Westcam_hyperMILL\Postprozessor\`
- Tool database: `Y:\Westcam_hyperMILL\Datenbanken\eur-20231130.db`
- Macro database: `Y:\hyperMILL\_Hypercad_beallitasok\Pascu Dávid\MAKRO\`

## Path Token Reference

Tokens are automatically replaced:

| Token | Replaced With | Example |
|-------|---------------|---------|
| [APPDATA] | User's AppData\Roaming | C:\Users\szborok\AppData\Roaming |
| [USER_CFG] | User's AppData\Roaming | C:\Users\szborok\AppData\Roaming |
| [USER] | Username | szborok |
| [VERSION] | HyperMILL version | 33.0 |
| [MAJOR_VERSION] | Major version | 33 |

## Troubleshooting

### Port Already in Use
```bash
# Use different port by modifying config.js
PORT=3010 node src/server.js
```

### Settings File Too Large
- Max file size: 500MB
- Check available disk space
- Try with smaller export if needed

### ZIP Extraction Error
- Ensure .omSettings file is valid (saved from HyperMILL Configuration Center)
- Check file permissions
- Verify file isn't corrupted

### Path Mapping Issues
- Ensure username matches Windows username exactly
- Token map should show correct AppData path
- Check if paths actually exist on system

## Next Steps

1. **Monitor Paths**: Use ScannerService with generated scan-paths.json
2. **Track Changes**: Implement file monitoring on extracted paths
3. **Store Metadata**: Save file information to database
4. **Share Automations**: Upload user scripts to company pool
5. **Create Dashboard**: Build UI for profile management

## References

- [SETTINGS_PARSER_README.md](SETTINGS_PARSER_README.md) - Detailed documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design overview
- [USER_SCAN_CONFIG.md](USER_SCAN_CONFIG.md) - Example for user szborok

---

**Quick Commands:**

```bash
# Start server
node src/server.js

# Test parsing
node test-settings-parser.js

# Check health
curl http://localhost:3009/health
```
