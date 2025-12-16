# Auto-Discovery API Reference

The system can now automatically find and import `.omSettings` files without manual export.

## Quick API Usage

### 1. Discover All .omSettings Files
```bash
curl -X GET http://localhost:3009/api/discover/settings
```

**Response:**
```json
{
  "success": true,
  "currentUser": "szborok",
  "discovered": 2,
  "latest": {
    "path": "C:\\Users\\Public\\Documents\\OPEN MIND\\backup\\backup.omSettings",
    "size": 66278321,
    "modified": "2025-09-01T09:49:11.089Z",
    "sizeReadable": "63.21 MB",
    "source": "shared-backup"
  },
  "all": [
    { ... },
    { ... }
  ]
}
```

### 2. Get Latest .omSettings File
```bash
curl -X GET http://localhost:3009/api/discover/latest
```

**Response:**
```json
{
  "success": true,
  "found": true,
  "currentUser": "szborok",
  "settings": {
    "path": "C:\\Users\\Public\\Documents\\OPEN MIND\\backup\\backup.omSettings",
    "size": 66278321,
    "modified": "2025-09-01T09:49:11.089Z",
    "sizeReadable": "63.21 MB",
    "source": "shared-backup"
  }
}
```

### 3. Auto-Import Latest Settings (For Current User)
```bash
curl -X POST http://localhost:3009/api/discover/auto-import
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-imported settings for szborok",
  "importedFrom": "C:\\Users\\Public\\Documents\\OPEN MIND\\backup\\backup.omSettings",
  "importedSource": "shared-backup",
  "fileSize": "63.21 MB",
  "importedAt": "2025-12-16T18:33:08.104Z",
  "pathsToScan": 11,
  "profile": {
    "found": true,
    "username": "szborok",
    "hasSettings": true,
    "hasParsedConfig": true,
    "hasAutomationPaths": true
  }
}
```

### 4. Import From Specific File Path
```bash
curl -X POST http://localhost:3009/api/discover/import-file \
  -H "Content-Type: application/json" \
  -d '{"filePath": "C:\\Users\\Public\\Documents\\OPEN MIND\\backup\\backup.omSettings"}'
```

### 5. Get Configuration Center Paths
```bash
curl -X GET http://localhost:3009/api/discover/locations
```

**Response:**
```json
{
  "success": true,
  "currentUser": "szborok",
  "configurationCenterPaths": {
    "userAppData": "C:\\Users\\szborok\\AppData\\Roaming\\OPEN MIND",
    "publicDocs": "C:\\Users\\Public\\Documents\\OPEN MIND",
    "backupPath": "C:\\Users\\Public\\Documents\\OPEN MIND\\backup"
  },
  "commonLocations": {
    "User Documents": "C:\\Users\\szborok\\Documents",
    "User Downloads": "C:\\Users\\szborok\\Downloads",
    "Public Documents": "C:\\Users\\Public\\Documents\\OPEN MIND",
    "Public Backup": "C:\\Users\\Public\\Documents\\OPEN MIND\\backup",
    "User AppData": "C:\\Users\\szborok\\AppData\\Roaming\\OPEN MIND"
  }
}
```

### 6. Get Current User Information
```bash
curl -X GET http://localhost:3009/api/discover/current-user
```

**Response:**
```json
{
  "success": true,
  "username": "szborok",
  "homeDirectory": "C:\\Users\\szborok",
  "documentsFolder": "C:\\Users\\szborok\\Documents",
  "downloadsFolder": "C:\\Users\\szborok\\Downloads",
  "appDataFolder": "C:\\Users\\szborok\\AppData\\Roaming"
}
```

## Where Files Are Found

The discovery system searches these locations automatically:

1. **User Documents** - `C:\Users\{username}\Documents`
2. **User Downloads** - `C:\Users\{username}\Downloads`
3. **OPEN MIND Shared** - `C:\Users\Public\Documents\OPEN MIND`
4. **OPEN MIND Backup** - `C:\Users\Public\Documents\OPEN MIND\backup` ✅ (Found here)
5. **User AppData** - `C:\Users\{username}\AppData\Roaming\OPEN MIND`
6. **Program Data** - `C:\ProgramData\OPEN MIND`
7. **Temp Folder** - `C:\Users\{username}\AppData\Local\Temp`

## Discovery Flow

```
┌─────────────────────────────────┐
│ GET /api/discover/settings      │ ← Search for all files
└──────────────┬──────────────────┘
               │
               ▼
        Found 2 files
               │
               ├─→ C:\Users\Public\Documents\OPEN MIND\backup\backup.omSettings
               │
               ▼
┌─────────────────────────────────┐
│ POST /api/discover/auto-import  │ ← Import latest
└──────────────┬──────────────────┘
               │
               ├─→ Copy to: data/user-profiles/szborok/settings/
               ├─→ Parse XML configuration
               ├─→ Save to: data/user-profiles/szborok/parsed/config.json
               ├─→ Generate scanner config
               └─→ Save to: data/user-profiles/szborok/scanner-config/scan-paths.json
               │
               ▼
        11 paths ready to scan
```

## No More Manual Export Needed!

**Before**: Export from HyperMILL Configuration Center → Save file → Upload → Parse

**Now**: 
```bash
curl -X POST http://localhost:3009/api/discover/auto-import
```

Done! Settings automatically discovered, imported, parsed, and ready for scanning.

## Key Features

✅ **Automatic User Detection** - Uses current Windows user (szborok)
✅ **Multiple Search Locations** - Checks common HyperMILL paths
✅ **Smart Source Classification** - Identifies if file is backup, manual export, etc.
✅ **Most Recent Selection** - Always picks newest file
✅ **One-Step Import** - Single API call handles everything
✅ **Path Validation** - Verifies files exist and are valid .omSettings

## Using with Current User

All endpoints automatically detect and use the current logged-in user:

```bash
# This uses szborok (current user) automatically
curl -X POST http://localhost:3009/api/discover/auto-import

# Override with query parameter if needed
curl -X POST "http://localhost:3009/api/discover/auto-import?username=otheruser"
```

## Next Steps

1. **Start Server**: `node src/server.js`
2. **Discover Files**: `GET /api/discover/settings`
3. **Auto-Import**: `POST /api/discover/auto-import`
4. **Verify Profile**: `GET /api/profiles/szborok`
5. **Start Scanning**: Use scanner with generated scan-paths.json
