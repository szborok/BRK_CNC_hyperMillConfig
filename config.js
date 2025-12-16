module.exports = {
  // Server Configuration
  port: process.env.PORT || 3005,
  env: process.env.NODE_ENV || 'production',

  // hyperMILL Paths (will be auto-discovered or configured)
  hyperMill: {
    // Default installation path (Windows)
    installPath: process.env.HYPERMILL_DEFAULT_PATH || 'C:\\Program Files\\OPEN MIND\\hyperMILL',
    
    // AUTOMATION Center default path (typically on server)
    automationCenterPath: process.env.AUTOMATION_CENTER_PATH || '',
    
    // Local user path pattern
    localUserPathPattern: 'C:\\Users\\Public\\Documents\\OPEN MIND\\USERS\\{username}\\AutomationCenter',
    
    // User preferences path pattern
    userPrefsPathPattern: '%APPDATA%\\OPEN MIND\\hyperMILL'
  },

  // Data Storage
  dataDir: process.env.DATA_DIR || './data',
  backupDir: process.env.BACKUP_DIR || './data/backups',
  userConfigsDir: './data/user-configs',
  communityLibraryDir: './data/community-library',
  
  // Database
  database: {
    path: './data/hypermill-config.db'
  },

  // File Upload Limits
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxBackupSize: 500 * 1024 * 1024, // 500MB
    allowedScriptTypes: ['.vbs', '.py', '.hma', '.xml'],
    allowedMacroTypes: ['.mac', '.mcr', '.txt']
  },

  // Backup Configuration
  backup: {
    retention: {
      days: 30, // Keep backups for 30 days
      maxCount: 10 // Keep max 10 backups per user
    },
    autoBackup: {
      enabled: true,
      intervalHours: 24
    },
    compression: true
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: './logs',
    maxFiles: 7,
    maxSize: '10m'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  },

  // Folder Structure Templates
  automationCenterFolders: [
    'Apps',
    'CLAMPS',
    'COMPONENTS',
    'DATABASE',
    'EXPORTED',
    'FEATURE',
    'LIBRARY',
    'MULTIOFFSET',
    'REPORTS',
    'STOCKS',
    'variants',
    'VB SCRIPTS',
    'PYTHON SCRIPTS'
  ],

  // Database files to track
  databaseFiles: [
    'Color_table.xml',
    'MacroDB.db',
    'ToolDB.db',
    'Virtual_tool.vtx'
  ]
};
