const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to copy GoogleService-Info.plist to iOS project
 * This ensures the Firebase config file is copied during prebuild
 */
const withIosFirebaseConfig = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      
      // Path to GoogleService-Info.plist in project root
      const sourcePlistPath = path.join(projectRoot, 'GoogleService-Info.plist');
      
      // Check if source file exists
      if (!fs.existsSync(sourcePlistPath)) {
        console.warn('⚠️  GoogleService-Info.plist not found in project root. Firebase may not work correctly.');
        return config;
      }
      
      // Find the app directory in iOS project
      // Expo prebuild creates a directory with the app name (usually from bundleIdentifier or slug)
      const iosDirContents = fs.readdirSync(platformProjectRoot, { withFileTypes: true });
      let appDir = null;
      
      // Look for .xcodeproj to find the project name
      for (const item of iosDirContents) {
        if (item.isDirectory() && item.name.endsWith('.xcodeproj')) {
          const projectName = item.name.replace('.xcodeproj', '');
          const potentialAppDir = path.join(platformProjectRoot, projectName);
          if (fs.existsSync(potentialAppDir) && fs.statSync(potentialAppDir).isDirectory()) {
            appDir = potentialAppDir;
            break;
          }
        }
      }
      
      // Fallback: try to find directory with Info.plist
      if (!appDir) {
        for (const item of iosDirContents) {
          if (item.isDirectory()) {
            const potentialAppDir = path.join(platformProjectRoot, item.name);
            const infoPlistPath = path.join(potentialAppDir, 'Info.plist');
            if (fs.existsSync(infoPlistPath)) {
              appDir = potentialAppDir;
              break;
            }
          }
        }
      }
      
      if (!appDir) {
        console.warn('⚠️  Could not find app directory in iOS project. Skipping GoogleService-Info.plist copy.');
        return config;
      }
      
      const destPlistPath = path.join(appDir, 'GoogleService-Info.plist');
      
      // Copy the file
      try {
        fs.copyFileSync(sourcePlistPath, destPlistPath);
        console.log(`✅ Copied GoogleService-Info.plist to ${path.relative(platformProjectRoot, destPlistPath)}`);
      } catch (error) {
        console.error('❌ Error copying GoogleService-Info.plist:', error);
      }
      
      return config;
    },
  ]);
};

module.exports = withIosFirebaseConfig;
