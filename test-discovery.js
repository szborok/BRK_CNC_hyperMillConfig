const ConfigurationLocator = require('./src/services/ConfigurationLocator');
const UserProfileService = require('./src/services/UserProfileService');

/**
 * Test script - Discover .omSettings files and auto-import
 */
async function testDiscovery() {
  console.log('🔍 Testing HyperMILL Configuration Discovery\n');

  const locator = new ConfigurationLocator();
  const profileService = new UserProfileService();

  try {
    // 1. Search for all .omSettings files
    console.log('🔎 Searching for .omSettings files on system...\n');
    const info = await locator.getSettingsInfo();

    console.log(`✅ Found ${info.found} .omSettings file(s)\n`);

    if (info.all.length === 0) {
      console.log('⚠️  No .omSettings files found!');
      console.log('\nSearched locations:');
      info.searchPaths.forEach(p => console.log(`  - ${p}`));
      return;
    }

    // Show all found files
    console.log('📋 All .omSettings Files Found:');
    console.log('================================');
    info.all.forEach((file, index) => {
      console.log(`\n${index + 1}. ${file.path}`);
      console.log(`   Size: ${file.sizeReadable}`);
      console.log(`   Modified: ${file.modifiedIso}`);
      console.log(`   Source: ${file.source}`);
    });

    // Show latest
    console.log('\n\n🏆 Most Recent File:');
    console.log('====================');
    const latest = info.latest;
    console.log(`Path: ${latest.path}`);
    console.log(`Size: ${latest.sizeReadable}`);
    console.log(`Modified: ${latest.modifiedIso}`);
    console.log(`Source: ${latest.source}`);

    // Show configuration center paths
    console.log('\n\n📍 HyperMILL Configuration Center Paths:');
    console.log('========================================');
    Object.entries(info.configurationCenterPaths).forEach(([key, value]) => {
      const exists = require('fs').existsSync(value);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${key}: ${value}`);
    });

    // Simulate auto-import
    console.log('\n\n⏳ Simulating auto-import for user "szborok"...\n');

    const SettingsParser = require('./src/services/SettingsParser');
    const parser = new SettingsParser();

    const parseResult = await parser.parseSettings(latest.path);

    if (!parseResult.success) {
      console.log('❌ Parse failed:', parseResult.error);
      return;
    }

    // Save to profile
    const saveResult = profileService.saveUserSettings('szborok', latest.path);
    console.log('✅ Settings file saved:', saveResult.savedPath);

    const configSave = profileService.saveParsedConfig('szborok', parseResult.config);
    console.log('✅ Parsed config saved:', configSave.path);

    const scanConfig = profileService.generateScannerConfig('szborok', parseResult.config);
    const scanSave = profileService.saveScannerConfig('szborok', scanConfig);
    console.log('✅ Scanner config saved:', scanSave.path);

    // Get profile summary
    const summary = profileService.getUserProfileSummary('szborok');
    console.log('\n\n👤 User Profile Summary:');
    console.log('========================');
    console.log(`Username: ${summary.username}`);
    console.log(`Has Settings: ${summary.hasSettings}`);
    console.log(`Has Config: ${summary.hasParsedConfig}`);
    console.log(`Has Scan Paths: ${summary.hasAutomationPaths}`);
    console.log(`Profile Created: ${summary.createdAt}`);

    console.log('\n\n📍 Scan Paths to Monitor:');
    console.log('==========================');
    scanConfig.pathsToScan.slice(0, 5).forEach(p => {
      console.log(`  [${p.type}] ${p.path}`);
    });
    if (scanConfig.pathsToScan.length > 5) {
      console.log(`  ... and ${scanConfig.pathsToScan.length - 5} more paths`);
    }

    // Cleanup
    if (parseResult.tempDir) {
      await parser.cleanup(parseResult.tempDir);
      console.log('\n🧹 Cleaned up temporary extraction directory');
    }

    console.log('\n✨ Discovery test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDiscovery();
