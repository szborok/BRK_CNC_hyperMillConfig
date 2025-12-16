const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const SettingsParser = require('../services/SettingsParser');
const UserProfileService = require('../services/UserProfileService');

// Initialize services
const settingsParser = new SettingsParser();
const profileService = new UserProfileService();

// Setup multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../data/uploads'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.omSettings')) {
      cb(null, true);
    } else {
      cb(new Error('Only .omSettings files are accepted'));
    }
  }
});

/**
 * POST /api/profiles/:username/settings
 * Upload user .omSettings file
 */
router.post('/:username/settings', upload.single('settingsFile'), async (req, res) => {
  try {
    const { username } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: 'No settings file provided'
      });
    }

    // Save the uploaded file to user profile
    const result = profileService.saveUserSettings(username, req.file.path);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Clean up temporary upload file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Settings file uploaded successfully',
      ...result
    });
  } catch (error) {
    console.error('Error uploading settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/profiles/:username/parse
 * Parse .omSettings file and extract configuration
 */
router.post('/:username/parse', async (req, res) => {
  try {
    const { username } = req.params;

    // Get latest settings file
    const settingsFile = profileService.getLatestUserSettings(username);

    if (!settingsFile.found) {
      return res.status(404).json({
        error: 'No settings file found for this user. Please upload a settings file first.'
      });
    }

    // Parse the settings file
    const parseResult = await settingsParser.parseSettings(settingsFile.path);

    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }

    // Save parsed configuration
    const saveResult = profileService.saveParsedConfig(username, parseResult.config);

    if (!saveResult.success) {
      return res.status(400).json(saveResult);
    }

    // Cleanup temporary extraction directory
    if (parseResult.tempDir) {
      await settingsParser.cleanup(parseResult.tempDir);
    }

    res.json({
      success: true,
      message: 'Settings parsed successfully',
      config: parseResult.config,
      savedAt: saveResult.path
    });
  } catch (error) {
    console.error('Error parsing settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/profiles/:username/generate-scan-config
 * Generate scanner configuration from parsed settings
 */
router.post('/:username/generate-scan-config', async (req, res) => {
  try {
    const { username } = req.params;

    // Get parsed configuration
    const parsedResult = profileService.getParsedConfig(username);

    if (!parsedResult.found) {
      return res.status(404).json({
        error: 'No parsed configuration found. Please parse settings file first.'
      });
    }

    // Generate scanner configuration
    const scanConfig = profileService.generateScannerConfig(username, parsedResult.config);

    // Save scanner configuration
    const saveResult = profileService.saveScannerConfig(username, scanConfig);

    if (!saveResult.success) {
      return res.status(400).json(saveResult);
    }

    res.json({
      success: true,
      message: 'Scanner configuration generated',
      scanConfig,
      savedAt: saveResult.path
    });
  } catch (error) {
    console.error('Error generating scan config:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/profiles/:username
 * Get user profile summary
 */
router.get('/:username', (req, res) => {
  try {
    const { username } = req.params;
    const summary = profileService.getUserProfileSummary(username);

    if (!summary.found) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/profiles/:username/settings
 * Get latest settings file info
 */
router.get('/:username/settings', (req, res) => {
  try {
    const { username } = req.params;
    const result = profileService.getLatestUserSettings(username);

    if (!result.found) {
      return res.status(404).json({
        error: 'Settings file not found'
      });
    }

    res.json({
      found: true,
      settingsFile: result
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/profiles/:username/config
 * Get parsed configuration
 */
router.get('/:username/config', (req, res) => {
  try {
    const { username } = req.params;
    const result = profileService.getParsedConfig(username);

    if (!result.found) {
      return res.status(404).json({
        error: 'Parsed configuration not found'
      });
    }

    res.json({
      found: true,
      config: result.config
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/profiles/:username/scan-config
 * Get scanner configuration
 */
router.get('/:username/scan-config', (req, res) => {
  try {
    const { username } = req.params;
    const result = profileService.getScannerConfig(username);

    if (!result.found) {
      return res.status(404).json({
        error: 'Scanner configuration not found'
      });
    }

    res.json({
      found: true,
      config: result.config
    });
  } catch (error) {
    console.error('Error getting scan config:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/profiles
 * List all user profiles
 */
router.get('/', (req, res) => {
  try {
    const result = profileService.listProfiles();
    res.json(result);
  } catch (error) {
    console.error('Error listing profiles:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * DELETE /api/profiles/:username
 * Delete user profile
 */
router.delete('/:username', (req, res) => {
  try {
    const { username } = req.params;
    const result = profileService.deleteProfile(username);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
