# HyperMill Configuration Module - AI Agent Continuation Guide

**Date**: December 16, 2025  
**Project**: BRK CNC System - HyperMill Configuration Module  
**Status**: Initial Setup Complete, Ready for Implementation

---

## 🎯 PROJECT OVERVIEW

This is the **BRK_CNC_hyperMillConfig** module, a microservice within the BRK CNC System that manages **sharing and distribution** of HyperMill CAM software files (macros, automations, configurations) across team members.

### Purpose
The module solves the problem of sharing HyperMill files across the team. Instead of copy-pasting macros and automations manually between PCs, this system:

1. **Scans & Tracks** - Monitors what HyperMill files each user has on their PC
2. **Shared Pool** - Provides a central repository where users can upload/download macros and automations
3. **Easy Distribution** - Automatically downloads and installs shared files to the correct locations on user PCs
4. **Company Standards** - Tracks which files are official company-approved vs user-contributed
5. **Version Management** - Keeps track of file versions and updates

**Key Concept**: This is NOT for creating/generating macros - it's for **managing, sharing, and distributing** existing HyperMill files that users create on their own PCs.

---

## 📁 PROJECT STRUCTURE

```
BRK_CNC_hyperMillConfig/
├── config.js              # Main configuration (PORT: 3009)
├── package.json           # Dependencies (Express, Winston, etc.)
├── README.md              # Basic project documentation
├── HYPERMILL_CONFIG_RESEARCH.md  # HyperMill research & notes
├── data/                  # File storage
│   ├── pool/              # Shared pool of uploaded files
│   │   ├── macros/        # Shared macros
│   │   ├── automations/   # Shared automation scripts
│   │   └── configs/       # Shared configurations
│   ├── company/           # Official company-approved files
│   └── metadata/          # File metadata, versions, tracking
├── logs/                  # Application logs
├── src/
│   ├── server.js          # Express server (basic setup)
│   ├── routes/            # API endpoints (to be created)
│   ├── services/          # Business logic (to be created)
│   │   ├── ScannerService.js    # Scan user's local HyperMill files
│   │   ├── PoolService.js       # Manage shared file pool
│   │   ├── DistributionService.js # Handle file downloads/installation
│   │   └── TrackingService.js   # Track user files and versions
│   └── utils/
│       └── Logger.js      # Winston logger utility
```

---

## 🔧 CURRENT STATE

### ✅ Completed
1. **Project Initialization**
   - npm packages installed (Express, Winston, CORS, dotenv)
   - Basic folder structure created
   - Logger utility implemented
   - Express server skeleton created
   - Git repository initialized and pushed

2. **Configuration**
   - Server port: 3009
   - Logging configured with Winston
   - Basic CORS setup ready

3. **Research Documentation**
   - HyperMill configuration research documented in `HYPERMILL_CONFIG_RESEARCH.md`
   - File formats and structure analyzed

### 🚧 Not Yet Implemented
1. **API Routes** - Need to create endpoints for:
   - GET `/api/scan` - Scan user's local HyperMill directory
   - GET `/api/pool/list` - List all available files in shared pool
   - POST `/api/pool/upload` - Upload a file to the shared pool
   - GET `/api/pool/download/:fileId` - Download a file from pool
   - POST `/api/pool/install/:fileId` - Download and auto-install to correct location
   - GET `/api/company/files` - List company-approved files
   - GET `/api/tracking/user/:userId` - Get user's installed files
   - POST `/api/tracking/sync` - Sync local files with server tracking

2. **Services Layer**
   - **ScannerService** - Scan user's PC for HyperMill files (macros, automations, configs)
   - **PoolService** - Manage shared file pool (upload, download, metadata)
   - **DistributionService** - Handle file installation to correct HyperMill directories
   - **TrackingService** - Track what files each user has, versions, source (company vs user)
   - **FileValidationService** - Validate HyperMill files before upload

3. **Data Management**
   - File storage structure for pool and company files
   - Metadata database (file info, uploader, version, downloads, ratings)
   - User file tracking (who has what, versions)
   - Company approval workflow

4. **Integration**
   - Connect to BRK_CNC_Dashboard
   - API client in dashboard (`src/services/hyperMillAPI.ts` needs updating)
   - File upload/download UI components

---

## 🔗 SYSTEM INTEGRATION

### Related Modules
1. **BRK_CNC_Dashboard** (Port: 5173/5174)
   - Main UI where HyperMill configs will be managed
   - Has `hyperMillAPI.ts` service ready for integration
   - Located: `../BRK_CNC_Dashboard/`

2. **BRK_CNC_CORE**
   - Central configuration and shared utilities
   - Located: `../BRK_CNC_CORE/`

3. **BRK_CNC_ToolManager** (Port: 3006)
   - Tool data that may be referenced in macros
   - Located: `../BRK_CNC_ToolManager/`

### Port Allocation
- **3009** - HyperMill Config API (this module)
- 3005 - Clamping Plate Manager
- 3006 - Tool Manager
- 3007 - JSON Analyzer
- 3008 - JSON Scanner
- 5173/5174 - Dashboard (Vite dev server)

---

## 📋 NEXT STEPS FOR AI AGENT

### Priority 1: File Scanner Implementation
1. **Create ScannerService** (`src/services/ScannerService.js`):
   - Detect HyperMill installation directory on user's PC
   - Scan for macro files (.mac, .mcr files)
   - Scan for automation scripts
   - Scan for configuration files (.hconfig, .xml)
   - Extract metadata (file name, size, date modified, hash)
   - Return structured list of found files

2. **Create API endpoint** for scanning:
   - POST `/api/scan/local` - Trigger scan of user's HyperMill directory
   - GET `/api/scan/results/:scanId` - Get scan results

### Priority 2: Shared Pool System
1. **Create PoolService** (`src/services/PoolService.js`):
   - Upload file to pool with metadata
   - Store file categorized by type (macro/automation/config)
   - Track uploader, upload date, version
   - List available pool files with filters
   - Download file from pool
   - Track download counts

2. **Create API endpoints**:
   - GET `/api/pool/files` - List all shared files (with filters)
   - POST `/api/pool/upload` - Upload file to pool
   - GET `/api/pool/download/:fileId` - Download specific file
   - GET `/api/pool/file/:fileId/info` - Get file metadata

3. **Implement data structure** in `data/`:
   ```
   data/
   ├── pool/
   │   ├── macros/
   │   │   └── user_contributed/
   │   ├── automations/
   │   │   └── user_contributed/
   │   └── configs/
   │       └── user_contributed/
   ├── company/
   │   ├── macros/
   │   ├── automations/
   │   └── configs/
   └── metadata/
       ├── pool_index.json      # All pool files metadata
       ├── company_index.json   # Company files metadata
       └── user_tracking.json   # User installed files tracking
   ```

### Priority 3: Distribution & Installation
1. **Create DistributionService** (`src/services/DistributionService.js`):
   - Detect user's HyperMill installation paths
   - Determine correct installation location by file type
   - Copy file to appropriate directory
   - Validate installation success
   - Rollback on failure

2. **Create API endpoints**:
   - POST `/api/install/:fileId` - Download and install file
   - GET `/api/install/paths` - Get HyperMill installation paths
   - POST `/api/install/paths/configure` - Set custom installation paths

### Priority 4: Tracking & Company Files
1. **Create TrackingService** (`src/services/TrackingService.js`):
   - Track which files each user has installed
   - Track file versions
   - Mark files as company-approved or user-contributed
   - Detect outdated files
   - Suggest updates

2. **Create API endpoints**:
   - GET `/api/tracking/user/:userId` - Get user's file inventory
   - POST `/api/tracking/sync` - Sync user's local files with server
   - GET `/api/company/files` - List company-approved files
   - POST `/api/company/approve/:fileId` - Mark file as company-approved (admin only)

### Priority 5: Dashboard Integration
1. **Update Dashboard API client**:
   - File: `BRK_CNC_Dashboard/src/services/hyperMillAPI.ts`
   - Add methods for all endpoints

2. **Create UI components**:
   - File browser for shared pool
   - Upload wizard
   - Download/install interface
   - User file inventory view
   - Company files section
   - Search and filter functionality

---

## 🔑 KEY TECHNICAL DETAILS

### HyperMill File Types to Manage
1. **Macros** (`.mac`, `.mcr`)
   - Automated sequences for common operations
   - Custom tool paths
   - Batch processing scripts

2. **Automation Scripts**
   - VBScript/HyperMill Script files
   - Workflow automation
   - Custom post-processors

3. **Configuration Files** (`.hconfig`, `.xml`)
   - Machine configurations
   - Tool library settings
   - User preferences
   - Post-processor configurations

### File Discovery Strategy
- **Windows**: Common paths to scan:
  - `C:\ProgramData\OPEN MIND\hyperMILL\`
  - `%APPDATA%\OPEN MIND\hyperMILL\`
  - User-configured custom paths
  
- **File metadata to collect**:
  - File name and extension
  - File size and hash (MD5/SHA256)
  - Last modified date
  - File type/category
  - Description (if embedded in file)

### Shared Pool Features
1. **File Upload**:
   - Accept file upload with description
   - Validate file type and format
   - Generate unique file ID
   - Store metadata (uploader, date, category, description)
   - Calculate file hash to prevent duplicates

2. **File Download**:
   - Stream file to user
   - Track download count
   - Log who downloaded what

3. **File Organization**:
   - Categorize by type (macro/automation/config)
   - Tag system for searchability
   - Rating/feedback system
   - Version tracking

### Installation Automation
- Detect HyperMill installation directory
- Map file types to correct subdirectories
- Backup existing file before overwrite
- Validate installation
- Provide rollback capability

### Company vs User Files
- **Company Files**: Marked as official, higher trust level, may be required
- **User Files**: Contributed by team members, optional
- Approval workflow for promoting user files to company files

### API Design Principles
- RESTful architecture
- Multipart form-data for file uploads
- JSON for metadata
- Proper error handling
- File streaming for downloads
- Authentication for uploads (future)
- Admin role for company file management

---

## 🛠️ DEVELOPMENT COMMANDS

```bash
# Navigate to module
cd "/Users/sovi/Library/Mobile Documents/com~apple~CloudDocs/Data/personal_Fun/Coding/Projects/BRK CNC System/BRK_CNC_hyperMillConfig"

# Install dependencies (already done)
npm install

# Start development server
npm start

# Run with auto-reload (add nodemon)
npm install -D nodemon
npx nodemon src/server.js
```

---

## 📚 IMPORTANT FILES TO REVIEW

1. **HYPERMILL_CONFIG_RESEARCH.md** - Contains detailed research on HyperMill
2. **config.js** - Module configuration settings
3. **BRK_CNC_Dashboard/src/services/hyperMillAPI.ts** - Dashboard API client
4. **BRK_CNC_Dashboard/HYPERMILL_IMPLEMENTATION.md** - Dashboard integration notes

---

## 🎨 DASHBOARD CONTEXT

The main dashboard has been updated with a HyperMill API service file. The dashboard is built with:
- **Framework**: Vue 3 + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **State Management**: Pinia (likely)

The HyperMill module should provide data to be displayed in a dedicated section of the dashboard UI.

---

## ⚠️ IMPORTANT NOTES

1. **File Paths**: On macOS, ensure proper handling of cloud sync folder paths
2. **Port Conflicts**: Verify port 3009 is available before starting
3. **Git**: Each module has its own git repository
4. **Synchronization**: When making changes, test integration with Dashboard
5. **Logging**: All operations should be logged using the Logger utility

---

## 🤝 INTEGRATION CHECKLIST

- [ ] Implement file scanner service
- [ ] Create shared pool upload/download system
- [ ] Set up file metadata management
- [ ] Build distribution/installation service
- [ ] Add user file tracking
- [ ] Implement company file approval system
- [ ] Integrate with Dashboard UI
- [ ] Add file search and filtering
- [ ] Create file browser interface
- [ ] Implement automatic installation
- [ ] Add version tracking
- [ ] Write tests
- [ ] Document API endpoints
- [ ] Add user authentication (future)
- [ ] Implement file backup before overwrite

---

## 📞 RESOURCES

### Project Context
- **User's OS**: macOS
- **Project Root**: `/Users/sovi/Library/Mobile Documents/com~apple~CloudDocs/Data/personal_Fun/Coding/Projects/BRK CNC System`
- **Git Remote**: https://github.com/szborok/BRK_CNC_hyperMillConfig.git

### External Documentation Needed
- HyperMill API documentation
- HyperMill scripting guide
- HyperMill file format specifications

---

## 🎯 IMMEDIATE NEXT ACTION

**Start by implementing the file scanner and shared pool:**

1. **Create ScannerService** (`src/services/ScannerService.js`):
   - Implement local file system scanning
   - Detect HyperMill installation paths
   - Extract file metadata
   - Return structured file list

2. **Create PoolService** (`src/services/PoolService.js`):
   - File upload handling with multer
   - File storage in organized structure
   - Metadata management (JSON index files)
   - File download/retrieval

3. **Create API routes** (`src/routes/`):
   - `scanRoutes.js` - Local file scanning
   - `poolRoutes.js` - Shared pool operations
   
4. **Wire up in server.js**:
   - Add multer middleware for file uploads
   - Mount route handlers
   - Configure CORS for dashboard

5. **Test endpoints** with Postman:
   - Upload a test macro file
   - List pool files
   - Download file
   - Scan local directory (mock for now)

6. **Create data directories**:
   ```bash
   mkdir -p data/pool/{macros,automations,configs}
   mkdir -p data/company/{macros,automations,configs}
   mkdir -p data/metadata
   ```

This establishes the core file management functionality that everything else builds upon.

---

## 💡 USER WORKFLOW EXAMPLE

**Scenario**: User has created a useful macro and wants to share it

1. User opens HyperMill section in Dashboard
2. Clicks "Share My Files"
3. System scans their local HyperMill directory
4. Displays list of their macros/automations
5. User selects macro, adds description, clicks "Upload to Pool"
6. File uploaded to shared pool with metadata
7. Other users can now browse pool, see this macro
8. They click "Install" and it downloads + installs to their HyperMill directory automatically

**Scenario**: Company adds new official macro

1. Admin uploads macro to pool
2. Marks it as "Company Approved"
3. All users see notification of new company file
4. Users can view description and install with one click
5. System tracks who has installed it

---

**Good luck! Focus on getting the file upload/download pool working first, then add the scanning and installation features.**
