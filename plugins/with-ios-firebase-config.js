const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin for Firebase configuration:
 * 1. Copies GoogleService-Info.plist to iOS project
 * 2. Configures Podfile for React Native Firebase with use_frameworks! :linkage => :static
 * 3. Creates symlinks for RNFBApp headers
 */
const withIosFirebaseConfig = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      
      // === 1. Copy GoogleService-Info.plist ===
      const sourcePlistPath = path.join(projectRoot, 'GoogleService-Info.plist');
      
      if (fs.existsSync(sourcePlistPath)) {
        const iosDirContents = fs.readdirSync(platformProjectRoot, { withFileTypes: true });
        let appDir = null;
        
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
        
        if (appDir) {
          const destPlistPath = path.join(appDir, 'GoogleService-Info.plist');
          try {
            fs.copyFileSync(sourcePlistPath, destPlistPath);
            console.log(`✅ Copied GoogleService-Info.plist to ${path.relative(platformProjectRoot, destPlistPath)}`);
          } catch (error) {
            console.error('❌ Error copying GoogleService-Info.plist:', error);
          }
        }
      } else {
        console.warn('⚠️  GoogleService-Info.plist not found in project root.');
      }
      
      // === 2. Configure Podfile for Firebase ===
      const podfilePath = path.join(platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf-8');
        let modified = false;
        
        // Update deployment target to iOS 16.0 for ScreenTime APIs
        podfileContent = podfileContent.replace(
          /platform :ios, podfile_properties\['ios\.deploymentTarget'\] \|\| '[\d.]+'/,
          "platform :ios, podfile_properties['ios.deploymentTarget'] || '16.0'"
        );
        console.log('✅ Set minimum iOS deployment target to 16.0');
        
        // Add $RNFirebaseAsStaticFramework before target block
        if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
          const targetPattern = /(target\s+['"][^'"]+['"]\s+do)/;
          if (targetPattern.test(podfileContent)) {
            podfileContent = podfileContent.replace(
              targetPattern,
              `# React Native Firebase requires static frameworks
$RNFirebaseAsStaticFramework = true

$1`
            );
            modified = true;
            console.log('✅ Added $RNFirebaseAsStaticFramework = true to Podfile');
          }
        }
        
        // Add local native modules and use_frameworks! after use_native_modules!
        if (!podfileContent.includes('use_frameworks! :linkage => :static')) {
          const useNativeModulesPattern = /(config = use_native_modules!\(config_command\))/;
          if (useNativeModulesPattern.test(podfileContent)) {
            podfileContent = podfileContent.replace(
              useNativeModulesPattern,
              `$1

  # Local native modules
  pod 'GrayscaleModule', :path => '../modules/grayscale/ios'

  # Use static frameworks for Firebase compatibility
  use_frameworks! :linkage => :static`
            );
            modified = true;
            console.log('✅ Added local native modules and use_frameworks! to Podfile');
          }
        }
        
        // Add post_install to create symlinks for RNFBApp headers
        if (!podfileContent.includes('RNFBApp headers symlink')) {
          // Look for the closing "  end\nend" pattern after post_install
          if (podfileContent.includes('post_install do |installer|')) {
            // Replace the final "  end\nend" with our code + "  end\nend"
            podfileContent = podfileContent.replace(
              /(\s*)\)(\s*\n\s*end\s*\nend\s*)$/,
              `$1)
    
    # Create RNFBApp headers symlink for use_frameworks! compatibility
    require 'fileutils'
    rnfbapp_headers_dir = File.join(installer.sandbox.root, 'Headers', 'Public', 'RNFBApp')
    rnfbapp_source_dir = File.join(installer.sandbox.root.parent.parent, 'node_modules', '@react-native-firebase', 'app', 'ios', 'RNFBApp')
    
    if File.exist?(rnfbapp_source_dir)
      FileUtils.mkdir_p(File.dirname(rnfbapp_headers_dir))
      FileUtils.rm_rf(rnfbapp_headers_dir) if File.exist?(rnfbapp_headers_dir)
      FileUtils.ln_s(rnfbapp_source_dir, rnfbapp_headers_dir)
      puts "✅ Created RNFBApp headers symlink"
    end
$2`
            );
            modified = true;
            console.log('✅ Added RNFBApp headers symlink creation to Podfile');
          }
        }
        
        if (modified) {
          fs.writeFileSync(podfilePath, podfileContent);
        }
      }
      
      // === 3. Update deployment target in project.pbxproj ===
      const pbxprojPath = path.join(platformProjectRoot, 'DopamineDetoxSelfControl.xcodeproj', 'project.pbxproj');
      if (fs.existsSync(pbxprojPath)) {
        let pbxprojContent = fs.readFileSync(pbxprojPath, 'utf-8');
        const originalContent = pbxprojContent;
        
        // Update all IPHONEOS_DEPLOYMENT_TARGET to 16.0
        pbxprojContent = pbxprojContent.replace(
          /IPHONEOS_DEPLOYMENT_TARGET = [\d.]+;/g,
          'IPHONEOS_DEPLOYMENT_TARGET = 16.0;'
        );
        
        // === 4. Add Family Controls capability ===
        // Find TargetAttributes section and add SystemCapabilities
        if (!pbxprojContent.includes('com.apple.FamilyControls')) {
          // Match pattern: "13B07F861A680F5B00A75B9A = {\n\t\t\t\t\t\tLastSwiftMigration = 1250;\n\t\t\t\t\t};"
          const targetAttrPattern = /(\w{24} = \{\s*\n\s*)(LastSwiftMigration = \d+;)(\s*\n\s*\};)/;
          const match = pbxprojContent.match(targetAttrPattern);
          
          if (match) {
            const replacement = `${match[1]}${match[2]}
						SystemCapabilities = {
							com.apple.FamilyControls = {
								enabled = 1;
							};
						};${match[3]}`;
            
            pbxprojContent = pbxprojContent.replace(targetAttrPattern, replacement);
            console.log('✅ Added Family Controls capability to project.pbxproj');
          }
        }
        
        if (pbxprojContent !== originalContent) {
          fs.writeFileSync(pbxprojPath, pbxprojContent);
          console.log('✅ Updated project.pbxproj');
        }
      }
      
      return config;
    },
  ]);
};

module.exports = withIosFirebaseConfig;
