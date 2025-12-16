# hyperMILL Configuration Management Service

Microservice for managing hyperMILL CAM software configuration, including:
- AUTOMATION Center scripts (.hma, .vbs, .py)
- Macro Database management
- Tool Database configuration
- User configuration backup/restore
- Community macro/script library

## Features

### Configuration Management
- Discover hyperMILL installations
- Scan AUTOMATION Center folders
- Track database projects (Tool/Macro/Color)
- Export/import user configurations

### Macro Management
- Personal macro library
- Community macro sharing
- Search and filter macros
- Copy macros to user system

### Script Management
- VBScript (.vbs) management
- Python script (.py) management  
- AUTOMATION Center scripts (.hma)
- Community script library

### Backup & Restore
- Full user configuration backup
- Selective restore
- Automated backup scheduling
- Compressed backup archives

## Architecture

See `HYPERMILL_CONFIG_RESEARCH.md` for detailed architecture and implementation guide.

## API Documentation

All endpoints are prefixed with `/api/v1`

### Configuration Endpoints
- `GET /config/discover` - Find hyperMILL installations
- `GET /config/status/:userId` - Get user config status
- `POST /config/sync/:userId` - Sync from hyperMILL
- `POST /config/export/:userId` - Export configuration
- `POST /config/import/:userId` - Import configuration

### Macro Endpoints
- `GET /macros/:userId` - List user macros
- `GET /macros/global` - List global macros
- `POST /macros` - Create macro
- `PUT /macros/:id` - Update macro
- `DELETE /macros/:id` - Delete macro

### Script Endpoints
- `GET /scripts/:userId` - List user scripts
- `POST /scripts` - Upload script
- `PUT /scripts/:id` - Update script
- `DELETE /scripts/:id` - Delete script

### Community Library Endpoints
- `GET /library/macros` - Browse shared macros
- `POST /library/macros/upload` - Share macro
- `POST /library/macros/:id/copy` - Copy to user system
- `GET /library/scripts` - Browse shared scripts
- `POST /library/scripts/upload` - Share script

### Backup Endpoints
- `POST /backup/create/:userId` - Create backup
- `GET /backup/list/:userId` - List backups
- `POST /backup/restore/:id` - Restore backup
- `GET /backup/download/:id` - Download backup

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

```
PORT=3005
HYPERMILL_DEFAULT_PATH=C:/Program Files/OPEN MIND/hyperMILL
AUTOMATION_CENTER_PATH=<server_path>/AutomationCenter
DATA_DIR=./data
BACKUP_DIR=./data/backups
LOG_LEVEL=info
```

## Part of BRK CNC System

This service is part of the BRK CNC Management System.
