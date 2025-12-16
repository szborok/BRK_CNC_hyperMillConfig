# hyperMILL Configuration Management System - Research & Implementation Guide

## Executive Summary

hyperMILL is a CAM (Computer-Aided Manufacturing) software by OPEN MIND Technologies. Your app will manage **all configuration files** for logged-in users, including:

1. **Macro Files** (VBScript/Python automation scripts)
2. **AUTOMATION Center Scripts** (.hma workflow files)
3. **Global Configuration** (Tool Database, Macro Database, Color Tables, Post Processors)
4. **User-Specific Settings** (Preferences, custom toolbars, templates)

## hyperMILL File System Architecture

### Database Projects Structure

hyperMILL uses **database projects** that contain three main components:
- **Tool Database** (`ToolDB.db`) - Tool definitions and parameters
- **Macro Database** (`MacroDB.db`) - Reusable macro programs  
- **Color Table** (`Color_table.xml`) - Color scheme definitions

**Three Types of Database Projects:**

1. **Application Database** - Default project for the application
2. **Global Database** - Company-wide shared database (suffix `<G>`)
3. **User Database** - User-specific database project

These are managed via `hyperMILL → Setup → Settings → Database` tab

### Critical Configuration Paths

#### 1. AUTOMATION Center Default Path
**Company-wide location** (typically on server):
`hyperMILL → Setup → Settings → Application → Default paths → AUTOMATION Center`

```
[AUTOMATION Center Path]/
├── Apps/                    # Scripts from OPEN MIND or custom
├── CLAMPS/                  # Fixtures by machine/system
│   └── [FixtureSystem]/
├── COMPONENTS/              # Exported components
├── DATABASE/                # Global databases
│   ├── Color_table.xml
│   ├── MacroDB.db
│   ├── ToolDB.db
│   └── Virtual_tool.vtx
├── EXPORTED/                # Compressed scripts for backup/exchange
├── FEATURE/                 # Exported feature files
├── LIBRARY/                 # CAD model libraries
│   └── [Category]/
├── MULTIOFFSET/             # Multiple allowance configs
├── REPORTS/                 # XSL report templates
├── STOCKS/                  # Stock definition files
│   └── [Category]/*.cfg
├── variants/                # Global automation scripts
│   └── [ScriptName]/
│       ├── *.hma           # Script definition (XML)
│       └── *.xml           # Additional configs
├── VB SCRIPTS/              # VBScript automation
│   └── [Category]/
│       └── *.vbs
└── PYTHON SCRIPTS/          # Python automation
    └── [Category]/
        └── *.py
```

#### 2. Local User Path
```
C:\Users\Public\Documents\OPEN MIND\USERS\[Username]\AutomationCenter\
└── variants/                # User's local scripts (synced from global)
```

#### 3. User Preferences Path
```
%APPDATA%\OPEN MIND\hyperMILL\
```
Contains user-specific settings, preferences, custom toolbars

#### 4. Additional Default Paths

Set under `hyperMILL → Setup → Settings → Application → Default paths`:

- **Global working space** - General workspace directory
- **Projects** - Project-specific data
- **Toolpath** - Calculated toolpaths
- **3DF files** - 3D feature data
- **NC files** - Generated NC code output
- **Temporary files** - Temp processing files
- **Hmrep files** - Report output files

## File Type Reference

### 1. Automation Center Scripts (.hma)
- **Format**: XML-based script definition
- **Location**: `variants/[ScriptName]/`
- **Purpose**: Define automated workflows combining CAD/CAM operations
- **Features**:
  - Template commands for CAD operations
  - CAM job creation and modification
  - External automation integration
  - Decision logic and loops
  - Database operations

### 2. Macro Files (MacroDB.db)
- **Format**: SQLite database
- **Location**: `DATABASE/MacroDB.db`
- **Purpose**: Store reusable macro programs
- **Access Modes**:
  - Application mode
  - Global mode (company-wide)
  - User mode (personal macros)
- **Integration**: Referenced by AUTOMATION Center scripts

### 3. VBScript Files (.vbs)
- **Location**: `VB SCRIPTS/[Category]/`
- **Purpose**: External automation via VBScript
- **Usage**: Called from AUTOMATION Center using "Execute VBS script" function
- **Organization**: Categorized in subfolders

### 4. Python Scripts (.py)
- **Location**: `PYTHON SCRIPTS/[Category]/`
- **Purpose**: External automation via Python
- **Usage**: Called from AUTOMATION Center using "Execute Python script" function
- **Organization**: Categorized in subfolders

### 5. Tool Database (ToolDB.db)
- **Format**: SQLite database
- **Location**: `DATABASE/ToolDB.db`
- **Purpose**: Tool definitions, cutting parameters, holder assemblies
- **Sync**: Can sync between databases
- **Reports**: Generates reports to `[tooldbReport]` directory

### 6. Stock Configuration (.cfg)
- **Location**: `STOCKS/[Category]/`
- **Purpose**: Define stock material shapes and dimensions
- **Format**: Configuration text files

### 7. Fixture Definitions
- **Location**: `CLAMPS/[FixtureSystem]/`
- **Purpose**: Define clamping fixtures by machine system
- **Organization**: Organized by fixture system type

### 8. Color Table (Color_table.xml)
- **Location**: `DATABASE/Color_table.xml`
- **Purpose**: Define color schemes for UI and visualization

### 9. Post Processors
- **Location**: Defined in application settings
- **Purpose**: Convert toolpaths to machine-specific NC code
- **Format**: Various (depends on machine controller)

## User Data That Needs to Be Saved

### Per-User Configuration:
1. **Active Database Project** selection (Application/Global/User)
2. **Custom Toolbar** configurations
3. **Personal Macros** in User database
4. **User Preferences** from `%APPDATA%`
5. **Local Script** variants
6. **Recently Used** items and history
7. **Custom Templates** and presets

### Company-Wide Configuration (Admin managed):
1. **Global Database** (Tool/Macro/Color)
2. **Global AUTOMATION Center** scripts
3. **Shared VB/Python Scripts**
4. **Fixture Libraries**
5. **Stock Definitions**
6. **CAD Model Libraries**
7. **Report Templates**

## Implementation Strategy

### Backend Service Architecture (BRK_CNC_hyperMillConfig)

```
BRK_CNC_hyperMillConfig/
├── config/
│   └── paths.json              # Default path configurations
├── src/
│   ├── services/
│   │   ├── ConfigScanner.js    # Scan hyperMILL installations
│   │   ├── DatabaseManager.js  # Manage Tool/Macro DBs
│   │   ├── ScriptManager.js    # .hma/.vbs/.py management
│   │   ├── BackupService.js    # Backup/restore operations
│   │   └── SyncService.js      # User config sync
│   ├── routes/
│   │   ├── config.js           # Config endpoints
│   │   ├── macros.js           # Macro management
│   │   ├── scripts.js          # Script management
│   │   ├── backup.js           # Backup/restore
│   │   └── upload.js           # File upload handling
│   └── server.js               # Express server
├── utils/
│   ├── FileSystemHelper.js     # File operations
│   ├── DatabaseHelper.js       # SQLite operations
│   └── Logger.js               # Structured logging
└── data/
    └── user-configs/           # Stored user configurations
        └── [username]/
            ├── databases/
            ├── scripts/
            └── preferences/
```

### Key Features to Implement

#### 1. Configuration Discovery
- Scan system for hyperMILL installations
- Read `hyperMILL → Setup → Settings` paths
- Map all AUTOMATION Center folders
- Identify active database projects

#### 2. User Configuration Backup
```javascript
// Per-user backup structure
{
  userId: "username",
  timestamp: "2025-12-12T10:00:00Z",
  config: {
    databaseProject: "GlobalProject<G>",
    automationScripts: [...],
    vbScripts: [...],
    pythonScripts: [...],
    toolbarSettings: {...},
    preferences: {...},
    macros: [...]  // From MacroDB
  }
}
```

#### 3. Macro Library (Community Sharing)
- Allow users to upload personal macros
- Tag and categorize macros
- Rating/review system
- Search and filter
- One-click copy to user's system

#### 4. Script Library (Community Sharing)
- Share VBScript/Python automation
- Share AUTOMATION Center scripts (.hma)
- Version control
- Documentation and usage examples

#### 5. Global Config Management (Admin)
- Manage Tool Database entries
- Manage Macro Database (company-wide)
- Configure fixtures and stocks
- Post processor management
- Backup/restore company-wide config

### API Endpoint Design

```javascript
// Configuration
GET    /api/config/discover         // Find hyperMILL installations
GET    /api/config/status/:userId   // Get user's current config
POST   /api/config/sync/:userId     // Sync from hyperMILL
POST   /api/config/export/:userId   // Export config
POST   /api/config/import/:userId   // Import config

// Macros (Database)
GET    /api/macros/:userId          // List user's macros
GET    /api/macros/global           // List global macros
POST   /api/macros                  // Create new macro
PUT    /api/macros/:id              // Update macro
DELETE /api/macros/:id              // Delete macro

// Community Macro Library
GET    /api/library/macros          // Browse shared macros
POST   /api/library/macros/upload   // Share macro
POST   /api/library/macros/:id/copy // Copy to user system
GET    /api/library/macros/search   // Search macros

// Scripts (VBS/Python/HMA)
GET    /api/scripts/:userId         // List user's scripts
POST   /api/scripts                 // Upload new script
PUT    /api/scripts/:id             // Update script
DELETE /api/scripts/:id             // Delete script

// Community Script Library
GET    /api/library/scripts         // Browse shared scripts
POST   /api/library/scripts/upload  // Share script
POST   /api/library/scripts/:id/copy // Copy to user system

// AUTOMATION Center
GET    /api/automation/scripts/:userId  // List automation scripts
POST   /api/automation/execute      // Execute script
GET    /api/automation/history      // Execution history

// Backup/Restore
POST   /api/backup/create/:userId   // Create backup
GET    /api/backup/list/:userId     // List backups
POST   /api/backup/restore/:id      // Restore backup
GET    /api/backup/download/:id     // Download backup zip
POST   /api/backup/upload           // Upload backup

// Tool Database
GET    /api/tooldb/status           // Tool database info
POST   /api/tooldb/sync             // Sync tool database
GET    /api/tooldb/tools            // List tools
POST   /api/tooldb/export           // Export tool data

// Admin Global Config
POST   /api/admin/config/global     // Update global config
POST   /api/admin/backup/company    // Company-wide backup
```

### Database Schema (for your app's tracking)

```sql
-- User Configurations
CREATE TABLE user_configs (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  config_name TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  active BOOLEAN DEFAULT true,
  database_project TEXT,
  automation_path TEXT,
  config_data JSON
);

-- Shared Macros
CREATE TABLE shared_macros (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  author_id TEXT,
  uploaded_at DATETIME,
  downloads INTEGER DEFAULT 0,
  rating REAL,
  file_path TEXT,
  tags TEXT
);

-- Shared Scripts  
CREATE TABLE shared_scripts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'vbs', 'py', 'hma'
  description TEXT,
  category TEXT,
  author_id TEXT,
  uploaded_at DATETIME,
  downloads INTEGER DEFAULT 0,
  rating REAL,
  file_path TEXT,
  tags TEXT
);

-- Backups
CREATE TABLE backups (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  backup_name TEXT,
  created_at DATETIME,
  backup_size INTEGER,
  file_path TEXT,
  backup_type TEXT -- 'full', 'partial'
);

-- Execution History
CREATE TABLE execution_history (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  script_id TEXT,
  script_type TEXT,
  executed_at DATETIME,
  status TEXT,
  duration_ms INTEGER,
  error_message TEXT
);
```

## Security Considerations

1. **File Path Validation**: Sanitize all file paths to prevent directory traversal
2. **Database Access**: Limit direct database modifications
3. **User Isolation**: Each user's config in separate directory
4. **Backup Encryption**: Encrypt backup files
5. **Admin Privileges**: Separate admin vs user permissions
6. **File Upload Limits**: Size and type restrictions
7. **Virus Scanning**: Scan uploaded scripts

## Next Steps

1. **Phase 1: Discovery**
   - Implement config scanner
   - Read hyperMILL installation paths
   - Map all AUTOMATION Center folders

2. **Phase 2: User Config Backup**
   - Scan user's current config
   - Export to structured format
   - Store in app database

3. **Phase 3: Community Library**
   - Build macro sharing platform
   - Implement search/filter
   - Add rating system

4. **Phase 4: Full Integration**
   - One-click deploy to user system
   - Sync tracking
   - Automated backups

## References

- hyperMILL v34.0 Documentation (in `BRK_CNC_CORE/train-data/`)
- AUTOMATION Center Manual (PDF/HTML5)
- SQL Tool Database Manual
- SQL Macro Database Manual
- CONFIGURATION Center documentation
