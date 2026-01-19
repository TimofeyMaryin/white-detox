/**
 * Expo Config Plugin for ScreenTimeReportExtension
 * 
 * This plugin adds the DeviceActivityReport extension target to the Xcode project
 * using Expo's official config plugin API.
 */

const { withXcodeProject, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const EXTENSION_NAME = 'ScreenTimeReportExtension';
const EXTENSION_BUNDLE_ID = 'com.danielian.selfcontrol.dopaminedetox.ScreenTimeReport';
const APP_GROUP = 'group.com.danielian.selfcontrol.dopaminedetox';

/**
 * Main plugin function
 */
function withScreenTimeReportExtension(config) {
  // Add App Group to main app entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return config;
  });

  // Add extension to Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    
    // Check if extension already exists
    const targets = xcodeProject.pbxNativeTargetSection();
    let extensionExists = false;
    
    for (const key in targets) {
      if (targets[key] && targets[key].name === EXTENSION_NAME) {
        extensionExists = true;
        console.log(`✅ ${EXTENSION_NAME} target already exists`);
        break;
      }
    }
    
    if (!extensionExists) {
      console.log(`➕ Adding ${EXTENSION_NAME} target...`);
      
      // Create extension directory in ios/
      const extensionDir = path.join(platformProjectRoot, EXTENSION_NAME);
      if (!fs.existsSync(extensionDir)) {
        fs.mkdirSync(extensionDir, { recursive: true });
      }
      
      // Copy Swift files from targets/ to ios/
      const sourceDir = path.join(projectRoot, 'targets', EXTENSION_NAME);
      const swiftFiles = ['ScreenTimeReportExtension.swift', 'TotalActivityReport.swift', 'TotalActivityView.swift'];
      
      for (const file of swiftFiles) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(extensionDir, file);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`  ✅ Copied ${file}`);
        }
      }
      
      // Create Info.plist for extension
      const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Screen Time Report</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.deviceactivityui.report-extension</string>
    </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extensionDir, 'Info.plist'), infoPlistContent);
      console.log('  ✅ Created Info.plist');
      
      // Create entitlements for extension
      const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.family-controls</key>
    <true/>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extensionDir, `${EXTENSION_NAME}.entitlements`), entitlementsContent);
      console.log('  ✅ Created entitlements');
      
      // Add extension target to Xcode project
      const target = xcodeProject.addTarget(
        EXTENSION_NAME,
        'app_extension',
        EXTENSION_NAME,
        EXTENSION_BUNDLE_ID
      );
      
      if (target) {
        console.log(`  ✅ Added target: ${target.uuid}`);
        
        // Create PBXGroup for extension files with correct paths
        const groupFiles = swiftFiles.map(f => f);
        groupFiles.push('Info.plist');
        groupFiles.push(`${EXTENSION_NAME}.entitlements`);
        
        // Use empty string for path to avoid double nesting
        const extensionGroup = xcodeProject.addPbxGroup(
          groupFiles,
          EXTENSION_NAME,
          EXTENSION_NAME  // This is the path relative to project root
        );
        
        // Add to main project group
        const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
        xcodeProject.addToPbxGroup(extensionGroup.uuid, mainGroup);
        
        // Add source files to extension target only (not main target)
        // Use addFile instead of addSourceFile to have more control
        for (const file of swiftFiles) {
          const filePath = `${EXTENSION_NAME}/${file}`;
          xcodeProject.addFile(filePath, extensionGroup.uuid, {
            target: target.uuid,
            lastKnownFileType: 'sourcecode.swift'
          });
        }
        
        // Add frameworks
        const frameworks = [
          'DeviceActivity.framework',
          'FamilyControls.framework',
          'ManagedSettings.framework',
          'SwiftUI.framework'
        ];
        
        for (const framework of frameworks) {
          xcodeProject.addFramework(framework, { target: target.uuid });
        }
        
        // Update build settings
        const configurations = xcodeProject.pbxXCBuildConfigurationSection();
        for (const key in configurations) {
          const config = configurations[key];
          if (config && config.buildSettings) {
            const bundleId = config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
            const productName = config.buildSettings.PRODUCT_NAME;
            
            if (bundleId === EXTENSION_BUNDLE_ID || 
                bundleId === `"${EXTENSION_BUNDLE_ID}"` ||
                productName === EXTENSION_NAME ||
                productName === `"${EXTENSION_NAME}"`) {
              
              config.buildSettings.INFOPLIST_FILE = `"${EXTENSION_NAME}/Info.plist"`;
              config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements"`;
              config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
              config.buildSettings.SWIFT_VERSION = '5.0';
              config.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
              config.buildSettings.SKIP_INSTALL = 'YES';
              config.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
              config.buildSettings.CODE_SIGN_STYLE = 'Automatic';
              config.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
            }
          }
        }
        
        // Add target dependency
        const mainTarget = xcodeProject.getFirstTarget();
        if (mainTarget) {
          xcodeProject.addTargetDependency(mainTarget.uuid, [target.uuid]);
        }
        
        console.log(`✅ ${EXTENSION_NAME} configured successfully`);
      }
    }
    
    return config;
  });
  
  return config;
}

module.exports = withScreenTimeReportExtension;
