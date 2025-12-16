const path = require('path');
const SettingsParser = require('./src/services/SettingsParser');
const UserProfileService = require('./src/services/UserProfileService');

/**
 * Test script to validate .omSettings parsing
 */
async function testParseSettings() {
  console.log('🧪 Testing HyperMILL .omSettings Parser\n');

  const parser = new SettingsParser();
  const profileService = new UserProfileService();

  try {
    // Path to the .omSettings file (in BRK_CNC_CORE project)
    const settingsPath = path.join(__dirname, '../BRK_CNC_CORE/test-data/hyperMill_config_data/mySettings.omSettings');

    console.log(`📁 Parsing settings from: ${settingsPath}\n`);

    // Parse the settings
    const result = await parser.parseSettings(settingsPath);

    if (!result.success) {
      console.error('❌ Parse failed:', result.error);
      return;
    }

    console.log('✅ Parse successful!\n');
    console.log('📊 Configuration Summary:');
    console.log('=======================');
    
    const config = result.config;

    // Version info
    console.log('\n🔹 Version Information:');
    console.log(`   Name: ${config.version.name}`);
    console.log(`   Major: ${config.version.major}`);
    console.log(`   Minor: ${config.version.minor}`);

    // Shared paths
    console.log('\n🔹 Shared Paths:');
    Object.entries(config.paths.shared).forEach(([key, value]) => {
      if (value && value.value) {
        console.log(`   ${key}: ${value.value}`);
      }
    });

    // Machines
    console.log(`\n🔹 Machines (${config.machines.length} found):`);
    config.machines.slice(0, 5).forEach(m => {
      console.log(`   - ${m.name}`);
      console.log(`     Path: ${m.mdfPath}`);
    });
    if (config.machines.length > 5) {
      console.log(`   ... and ${config.machines.length - 5} more`);
    }

    // Databases
    console.log('\n🔹 Databases:');
    console.log(`   Tool DBs: ${config.databases.tool.length}`);
    config.databases.tool.forEach(db => {
      console.log(`     - ${db.path}`);
    });
    console.log(`   Macro DBs: ${config.databases.macro.length}`);
    config.databases.macro.forEach(db => {
      console.log(`     - ${db.path}`);
    });

    // User directories
    console.log('\n🔹 User Directories:');
    if (config.userSettings.userDirectories) {
      config.userSettings.userDirectories.forEach(dir => {
        console.log(`   ${dir.key}: ${dir.path}`);
      });
    }

    // User working directories
    console.log('\n🔹 User Working Directories:');
    if (config.userSettings) {
      Object.entries(config.userSettings).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.value) {
          console.log(`   ${key}: ${value.value}`);
        }
      });
    }

    // Network shares
    if (config.networkShares && config.networkShares.length > 0) {
      console.log(`\n🔹 Network Shares (${config.networkShares.length} found):`);
      config.networkShares.slice(0, 10).forEach(share => {
        console.log(`   [${share.name}] ${share.path}`);
      });
      if (config.networkShares.length > 10) {
        console.log(`   ... and ${config.networkShares.length - 10} more`);
      }
    }

    // Automation paths
    if (config.automationPaths && config.automationPaths.length > 0) {
      console.log(`\n🔹 Automation Paths (${config.automationPaths.length} found):`);
      config.automationPaths.forEach(ap => {
        console.log(`   [${ap.name}] ${ap.path}`);
      });
    }

    // Now save to user profile
    console.log('\n\n💾 Saving to user profile...\n');
    
    const username = 'szborok';
    
    // Save settings file
    const settingsSave = profileService.saveUserSettings(username, settingsPath);
    console.log('✅ Settings saved:', settingsSave.savedPath);

    // Save parsed config
    const configSave = profileService.saveParsedConfig(username, config);
    console.log('✅ Parsed config saved:', configSave.path);

    // Generate and save scanner config
    const scanConfig = profileService.generateScannerConfig(username, config);
    const scanSave = profileService.saveScannerConfig(username, scanConfig);
    console.log('✅ Scanner config saved:', scanSave.path);

    // Get profile summary
    const summary = profileService.getUserProfileSummary(username);
    console.log('\n📋 Profile Summary:');
    console.log(`   Username: ${summary.username}`);
    console.log(`   Has Settings: ${summary.hasSettings}`);
    console.log(`   Has Config: ${summary.hasParsedConfig}`);
    console.log(`   Has Scan Paths: ${summary.hasAutomationPaths}`);

    // Show scan config paths
    console.log('\n📍 Scan Paths to Monitor:');
    if (scanConfig.pathsToScan) {
      scanConfig.pathsToScan.forEach(p => {
        console.log(`   [${p.type}] ${p.path}`);
      });
    }

    // Cleanup temp directory
    if (result.tempDir) {
      await parser.cleanup(result.tempDir);
      console.log('\n🧹 Cleaned up temporary extraction directory');
    }

    console.log('\n✨ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testParseSettings();
