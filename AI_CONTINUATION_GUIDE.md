# HyperMill Configuration Module - AI Agent Continuation Guide

**Date**: December 16, 2025  
**Project**: BRK CNC System - HyperMill Configuration Module  
**Status**: Initial Setup Complete, Ready for Implementation

---

## 🎯 PROJECT OVERVIEW

This is the **BRK_CNC_hyperMillConfig** module, a microservice within the BRK CNC System that manages HyperMill CAM software configurations, macros, and automation workflows.

### Purpose
- Manage HyperMill configuration files and templates
- Handle macro generation and customization
- Provide API for configuration retrieval and updates
- Integrate with the main BRK CNC Dashboard

---

## 📁 PROJECT STRUCTURE

```
BRK_CNC_hyperMillConfig/
├── config.js              # Main configuration (PORT: 3009)
├── package.json           # Dependencies (Express, Winston, etc.)
├── README.md              # Basic project documentation
├── HYPERMILL_CONFIG_RESEARCH.md  # HyperMill research & notes
├── data/                  # Storage for configs & macros
│   └── .gitkeep
├── logs/                  # Application logs
├── src/
│   ├── server.js          # Express server (basic setup)
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
   - GET `/api/config` - Retrieve HyperMill configurations
   - POST `/api/config` - Update configurations
   - GET `/api/macros` - List available macros
   - POST `/api/macros/generate` - Generate custom macros
   - GET `/api/templates` - Get configuration templates

2. **Services Layer**
   - ConfigService - Handle .hconfig file parsing/generation
   - MacroService - Manage HyperMill macros
   - TemplateService - Manage configuration templates

3. **Data Management**
   - File storage structure for configs
   - Configuration validation
   - Version control for configurations

4. **Integration**
   - Connect to BRK_CNC_Dashboard
   - API client in dashboard (`src/services/hyperMillAPI.ts` exists)

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

### Priority 1: Core API Implementation
1. Create route handlers in `src/routes/`:
   - `configRoutes.js` - Configuration endpoints
   - `macroRoutes.js` - Macro management endpoints
   - `templateRoutes.js` - Template endpoints

2. Implement services in `src/services/`:
   - `ConfigService.js` - Parse/write .hconfig files
   - `MacroService.js` - Generate and manage macros
   - `TemplateService.js` - Handle configuration templates

3. Add middleware in `src/middleware/`:
   - Error handling
   - Request validation
   - File upload handling (if needed)

### Priority 2: Data Layer
1. Define data storage structure in `data/`:
   ```
   data/
   ├── configs/          # Saved HyperMill configurations
   ├── macros/           # Generated macros
   ├── templates/        # Configuration templates
   └── backups/          # Configuration backups
   ```

2. Implement file I/O utilities for HyperMill formats

### Priority 3: Dashboard Integration
1. Complete the API client in Dashboard:
   - File: `BRK_CNC_Dashboard/src/services/hyperMillAPI.ts`
   - Add methods for all endpoints

2. Create UI components for:
   - Configuration management interface
   - Macro generation wizard
   - Template selection

### Priority 4: Testing & Documentation
1. Add unit tests
2. Integration tests with Dashboard
3. Update README with API documentation
4. Create usage examples

---

## 🔑 KEY TECHNICAL DETAILS

### HyperMill Configuration Format
- **File Extension**: `.hconfig`
- **Format**: XML-based configuration files
- **Key Elements**:
  - Tool definitions
  - Operation parameters
  - Post-processor settings
  - Machine configurations

### Macro Requirements
- Language: HyperMill Script (similar to VBScript)
- Common use cases:
  - Automated tool path generation
  - Batch processing
  - Custom post-processing
  - Parameter validation

### API Design Principles
- RESTful architecture
- JSON request/response
- Proper error handling with status codes
- Logging all operations
- CORS enabled for dashboard integration

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

- [ ] Implement all API routes
- [ ] Create service layer for business logic
- [ ] Set up data storage structure
- [ ] Integrate with Dashboard UI
- [ ] Add error handling and validation
- [ ] Write tests
- [ ] Document API endpoints
- [ ] Test with actual HyperMill files
- [ ] Implement configuration backup system
- [ ] Add macro generation wizard

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

**Start by implementing the core API structure:**

1. Create `src/routes/configRoutes.js` with basic CRUD endpoints
2. Create `src/services/ConfigService.js` with placeholder methods
3. Wire up routes in `src/server.js`
4. Test endpoints with Postman/curl
5. Integrate with Dashboard's `hyperMillAPI.ts`

This will establish the foundation for all further HyperMill functionality.

---

**Good luck! The module is ready for your implementation. All dependencies are installed and the basic structure is in place.**
