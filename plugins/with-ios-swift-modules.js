const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to configure iOS Podfile for Swift modules and Firebase
 * This ensures use_frameworks! and use_modular_headers! are set correctly
 */
const withIosSwiftModules = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');
      let modified = false;

      // Add use_frameworks! after use_native_modules! for Firebase
      // IMPORTANT: For React Native Firebase, we need $RNFirebaseAsStaticFramework = true
      // and we should NOT use use_modular_headers! as it conflicts with use_frameworks!
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        // Add the Firebase static framework setting before the target
        const targetPattern = /(target\s+['"][^'"]+['"]\s+do)/;
        if (targetPattern.test(podfileContent)) {
          podfileContent = podfileContent.replace(targetPattern, `# Added by with-ios-swift-modules plugin
# Enable Firebase as static framework (required for use_frameworks!)
$RNFirebaseAsStaticFramework = true

$1`);
          modified = true;
        }
      }
      
      if (!podfileContent.includes('use_frameworks! :linkage => :static')) {
        const useNativeModulesPattern = /(config = use_native_modules!\(config_command\))/;
        
        if (useNativeModulesPattern.test(podfileContent)) {
          const replacement = `$1

  # Added by with-ios-swift-modules plugin
  # Use frameworks with static linkage for Swift pods (required for Firebase)
  # Static linkage prevents React-Core module import issues
  use_frameworks! :linkage => :static`;
          
          podfileContent = podfileContent.replace(useNativeModulesPattern, replacement);
          modified = true;
        }
      }

      // Update post_install to ensure DEFINES_MODULE is set and fix React Native Firebase issues
      // Check if post_install already has our settings
      const hasOurSettingsInPostInstall = podfileContent.includes("config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES']");
      
      if (podfileContent.includes('post_install do |installer|') && !hasOurSettingsInPostInstall) {
        // Find the closing of react_native_post_install and add our code before "end"
        // Match: :ccache_enabled => ... followed by )\n  end
        const postInstallEndPattern = /(:ccache_enabled\s*=>\s*ccache_enabled\?\(podfile_properties\),\s*\)\s*\n\s+)(end)/;
        
        if (postInstallEndPattern.test(podfileContent)) {
          const additionalCode = `
    # Added by with-ios-swift-modules plugin
    # Fix React Native Firebase issues with frameworks and React-Core
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # CRITICAL: Disable non-modular include warnings and prevent them from being treated as errors
        # Add -Wno-non-modular-include-in-framework-module to disable the warning
        ['OTHER_CFLAGS', 'OTHER_CPLUSPLUSFLAGS'].each do |flag_key|
          flags = config.build_settings[flag_key] || []
          flags = [flags] unless flags.is_a?(Array)
          
          # Remove -Werror flags related to non-modular includes
          flags = flags.reject { |flag|
            flag.to_s.match?(/-Werror.*non-modular/) || 
            (flag.to_s.include?('-Werror') && flag.to_s.include?('non-modular'))
          }
          
          # Add -Wno-non-modular-include-in-framework-module to suppress the warning
          unless flags.any? { |flag| flag.to_s.include?('-Wno-non-modular-include') }
            flags << '-Wno-non-modular-include-in-framework-module'
          end
          
          config.build_settings[flag_key] = flags
        end
        
        # Fix React Native Firebase non-modular header warnings
        # Allow non-modular includes in framework modules
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # Disable warning for non-modular includes in framework modules
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
        
        # CRITICAL: Disable treating warnings as errors
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        config.build_settings['GCC_TREAT_IMPLICIT_FUNCTION_DECLARATIONS_AS_ERRORS'] = 'NO'
        
        # Enable modules for all targets (needed for React-Core and React Native Firebase)
        config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
        config.build_settings['DEFINES_MODULE'] = 'YES'
        
        # CRITICAL: For react-native-gesture-handler, ensure it can access React Native headers
        # This fixes std::shared_ptr errors with use_frameworks!
        if target.name.include?('RNGestureHandler')
          # Add React Native header paths for gesture-handler
          header_search_paths = config.build_settings['HEADER_SEARCH_PATHS'] || []
          header_search_paths = [header_search_paths] unless header_search_paths.is_a?(Array)
          
          react_paths_for_gesture = [
            '$(PODS_ROOT)/Headers/Public/React-Core',
            '$(PODS_ROOT)/Headers/Public/React',
            '$(PODS_ROOT)/Headers/Public/React-Core/React',
            '$(PODS_CONFIGURATION_BUILD_DIR)/React-Core/React',
            '$(PODS_ROOT)/React-Core',
            '$(PODS_ROOT)/React-Core-prebuilt/React.xcframework/Headers',
            '$(PODS_ROOT)/React-Core-prebuilt/React.xcframework/ios-arm64_x86_64-simulator/React.framework/Headers',
          ]
          
          react_paths_for_gesture.each do |path|
            unless header_search_paths.any? { |p| p.to_s == path }
              header_search_paths << path
            end
          end
          
          config.build_settings['HEADER_SEARCH_PATHS'] = header_search_paths
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
        end
        
        # CRITICAL: For React Native Firebase targets, ensure they can import React-Core, Firebase, and each other
        # This fixes the "declaration must be imported from module" errors and "file not found" errors
        if target.name.include?('RNFB')
          # Ensure React-Core and Firebase headers are available
          header_search_paths = config.build_settings['HEADER_SEARCH_PATHS'] || []
          header_search_paths = [header_search_paths] unless header_search_paths.is_a?(Array)
          
          # Add all React Native header paths including xcframework paths
          react_paths = [
            '$(PODS_ROOT)/Headers/Public/React-Core',
            '$(PODS_ROOT)/Headers/Public/React',
            '$(PODS_ROOT)/Headers/Public/React-Core/React',
            '$(PODS_CONFIGURATION_BUILD_DIR)/React-Core/React',
            '$(PODS_CONFIGURATION_BUILD_DIR)/React-Core',
            '$(PODS_ROOT)/React-Core',
            '$(PODS_ROOT)/React-Core-prebuilt/React.xcframework/Headers',
            '$(PODS_ROOT)/React-Core-prebuilt/React.xcframework/ios-arm64_x86_64-simulator/React.framework/Headers',
            '$(PODS_ROOT)/React-Core-prebuilt/React.xcframework/ios-arm64/React.framework/Headers',
            '$(PODS_CONFIGURATION_BUILD_DIR)/React-Core-prebuilt/React.xcframework/Headers',
          ]
          
          # Add Firebase header paths (important for use_frameworks!)
          # Note: Firebase.h is a symlink to Firebase/CoreOnly/Sources/Firebase.h
          # We need to add both the symlink location and the actual file location
          firebase_paths = [
            '$(PODS_ROOT)/Headers/Public/FirebaseCore',
            '$(PODS_ROOT)/Headers/Public/Firebase',
            '$(PODS_ROOT)/Headers/Public/Firebase/Firebase',
            '$(PODS_CONFIGURATION_BUILD_DIR)/FirebaseCore',
            '$(PODS_CONFIGURATION_BUILD_DIR)/Firebase',
            '$(PODS_ROOT)/FirebaseCore',
            '$(PODS_ROOT)/Firebase',
            '$(PODS_ROOT)/Firebase/CoreOnly/Sources',
            '$(PODS_ROOT)/FirebaseCore/Sources',
            '$(PODS_TARGET_SRCROOT)/Firebase',
            '$(PODS_TARGET_SRCROOT)/Firebase/CoreOnly/Sources',
            # Add the parent directory so Firebase/Firebase.h can be resolved
            # The symlink resolves to Firebase/CoreOnly/Sources/Firebase.h
            # So we need to add paths that allow Firebase/ to be found
            '$(PODS_ROOT)/Firebase/CoreOnly',
            '$(PODS_ROOT)/Headers/Private/Firebase',
            # Add path to make Firebase/ subdirectory accessible
            '$(PODS_ROOT)/Firebase/CoreOnly/Sources',
            '$(PODS_ROOT)/Headers/Public',
          ]
          
          # NOTE: Do NOT set MODULEMAP_FILE for Firebase here - it causes "Redefinition of module 'Firebase'" error
          # When using use_frameworks! with $RNFirebaseAsStaticFramework = true, Firebase module is already defined
          # Setting MODULEMAP_FILE again causes conflicts
          
          # Also ensure framework search paths include Firebase frameworks
          framework_search_paths = config.build_settings['FRAMEWORK_SEARCH_PATHS'] || []
          framework_search_paths = [framework_search_paths] unless framework_search_paths.is_a?(Array)
          framework_search_paths << '$(PODS_CONFIGURATION_BUILD_DIR)/Firebase'
          framework_search_paths << '$(PODS_CONFIGURATION_BUILD_DIR)/FirebaseCore'
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] = framework_search_paths
          
          # Add all paths, avoiding duplicates
          all_paths = react_paths + firebase_paths
          all_paths.each do |path|
            unless header_search_paths.any? { |p| p.to_s == path }
              header_search_paths << path
            end
          end
          
          # CRITICAL: Add parent directory of Firebase.h so that Firebase/Firebase.h can be resolved
          # The symlink is at Headers/Public/Firebase/Firebase.h pointing to Firebase/CoreOnly/Sources/Firebase.h
          # We need to add Headers/Public so that Firebase/ subdirectory is accessible
          unless header_search_paths.any? { |p| p.to_s.include?('Headers/Public') && !p.to_s.include?('/Firebase') }
            header_search_paths << '$(PODS_ROOT)/Headers/Public'
          end
          
          config.build_settings['HEADER_SEARCH_PATHS'] = header_search_paths
          
          # Allow non-modular includes for React-Core and Firebase headers
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
          
          # Ensure React Native Firebase modules can see each other
          config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'YES'
          
          # Add paths to other RNFB modules so they can find each other's headers
          # When using use_frameworks!, RNFB headers are in the source directories  
          # CRITICAL: For RNFBAnalytics to find RNFBApp headers, we need to add the source path
          rnfb_module_paths = [
            '$(PODS_ROOT)/Headers/Public/RNFBApp',
            '$(PODS_CONFIGURATION_BUILD_DIR)/RNFBApp',
            '$(PODS_CONFIGURATION_BUILD_DIR)/RNFBApp/RNFBApp',
            '$(PODS_ROOT)/Headers/Public',
            '$(PODS_CONFIGURATION_BUILD_DIR)',
            # Add path to RNFBApp source directory - must use relative path from project root
            '$(PODS_ROOT)/../node_modules/@react-native-firebase/app/ios/RNFBApp',
            # Also try absolute path from Pods
            '$(SRCROOT)/../../node_modules/@react-native-firebase/app/ios/RNFBApp',
          ]
          
          rnfb_module_paths.each do |path|
            unless header_search_paths.any? { |p| p.to_s == path }
              header_search_paths << path
            end
          end
          
          config.build_settings['HEADER_SEARCH_PATHS'] = header_search_paths
        end
      end
    end
    
    # Fix react-native-worklets WORKLETS_VERSION_STRING undefined error
    # The podspec defines WORKLETS_VERSION via OTHER_CFLAGS, but code uses WORKLETS_VERSION_STRING
    # We need to add WORKLETS_VERSION_STRING to both C and C++ flags
    installer.pods_project.targets.each do |target|
      if target.name == 'RNWorklets'
        target.build_configurations.each do |config|
          worklets_version = '0.5.1' # Default version from package.json
          
          # Try to extract version from OTHER_CFLAGS (where podspec sets it via OTHER_CFLAGS)
          other_cflags = config.build_settings['OTHER_CFLAGS'] || []
          other_cflags = [other_cflags] unless other_cflags.is_a?(Array)
          other_cflags_str = other_cflags.join(' ')
          
          # Extract version from -DWORKLETS_VERSION=0.5.1 pattern (without quotes)
          worklets_version_match = other_cflags_str.match(/-DWORKLETS_VERSION=([^\s"']+)/)
          if worklets_version_match
            worklets_version = worklets_version_match[1]
          end
          
          # Add WORKLETS_VERSION_STRING using GCC_PREPROCESSOR_DEFINITIONS (more reliable for C++)
          preprocessor_definitions = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || []
          preprocessor_definitions = [preprocessor_definitions] unless preprocessor_definitions.is_a?(Array)
          
          # Remove any existing WORKLETS_VERSION_STRING definitions
          preprocessor_definitions = preprocessor_definitions.reject { |definition| definition.to_s.include?('WORKLETS_VERSION_STRING') }
          
          # CRITICAL: WorkletsVersion.cpp uses WORKLETS_VERSION to auto-create WORKLETS_VERSION_STRING
          # The file has: #ifdef WORKLETS_VERSION ... #define WORKLETS_VERSION_STRING STRINGIZE2(WORKLETS_VERSION) ... #endif
          # WORKLETS_VERSION is defined in OTHER_CFLAGS by podspec, but C++ files use OTHER_CPLUSPLUSFLAGS
          # We need to copy WORKLETS_VERSION from OTHER_CFLAGS to OTHER_CPLUSPLUSFLAGS
          
          # Get WORKLETS_VERSION from OTHER_CFLAGS
          other_cflags = config.build_settings['OTHER_CFLAGS'] || []
          other_cflags = [other_cflags] unless other_cflags.is_a?(Array)
          worklets_version_flag = other_cflags.find { |flag| flag.to_s.match?(/-DWORKLETS_VERSION=/) }
          
          # Ensure OTHER_CPLUSPLUSFLAGS has WORKLETS_VERSION for C++ files
          other_cpp_flags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || []
          other_cpp_flags = [other_cpp_flags] unless other_cpp_flags.is_a?(Array)
          
          # Add WORKLETS_VERSION to OTHER_CPLUSPLUSFLAGS if not present
          unless other_cpp_flags.any? { |flag| flag.to_s.match?(/-DWORKLETS_VERSION=/) }
            if worklets_version_flag
              # Copy the exact flag from OTHER_CFLAGS
              other_cpp_flags << worklets_version_flag
            else
              # Fallback: add with default version
              other_cpp_flags << "-DWORKLETS_VERSION=#{worklets_version}"
            end
          end
          
          # CRITICAL: Also directly define WORKLETS_VERSION_STRING as fallback
          # Even though WorkletsVersion.cpp should create it from WORKLETS_VERSION,
          # with use_frameworks! the macro expansion may not work correctly
          # So we add it directly as a string literal
          unless other_cpp_flags.any? { |flag| flag.to_s.match?(/-DWORKLETS_VERSION_STRING=/) }
            other_cpp_flags << "-DWORKLETS_VERSION_STRING=\\\"#{worklets_version}\\\""
          end
          
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = other_cpp_flags
        end
      end
      
      # CRITICAL: Fix react-native-reanimated REANIMATED_VERSION undefined error
      # Ensure REANIMATED_VERSION is properly defined in OTHER_CPLUSPLUSFLAGS
      # This fixes the "Mismatch between JavaScript part and native part" error
      if target.name == 'RNReanimated'
        target.build_configurations.each do |config|
          reanimated_version = '4.1.6' # Version from package.json
          
          # Try to extract version from OTHER_CFLAGS (where podspec sets it)
          other_cflags = config.build_settings['OTHER_CFLAGS'] || []
          other_cflags = [other_cflags] unless other_cflags.is_a?(Array)
          other_cflags_str = other_cflags.join(' ')
          
          # Extract version from -DREANIMATED_VERSION=4.1.6 pattern
          reanimated_version_match = other_cflags_str.match(/-DREANIMATED_VERSION=([^\\s"']+)/)
          if reanimated_version_match
            reanimated_version = reanimated_version_match[1]
          end
          
          # Ensure OTHER_CPLUSPLUSFLAGS has REANIMATED_VERSION for C++ files
          other_cpp_flags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || []
          other_cpp_flags = [other_cpp_flags] unless other_cpp_flags.is_a?(Array)
          
          # Get REANIMATED_VERSION flag from OTHER_CFLAGS
          reanimated_version_flag = other_cflags.find { |flag| flag.to_s.match?(/-DREANIMATED_VERSION=/) }
          
          # Add REANIMATED_VERSION to OTHER_CPLUSPLUSFLAGS if not present
          unless other_cpp_flags.any? { |flag| flag.to_s.match?(/-DREANIMATED_VERSION=/) }
            if reanimated_version_flag
              # Copy the exact flag from OTHER_CFLAGS
              other_cpp_flags << reanimated_version_flag
            else
              # Fallback: add with extracted or default version
              other_cpp_flags << "-DREANIMATED_VERSION=#{reanimated_version}"
            end
          end
          
          # Also ensure REACT_NATIVE_MINOR_VERSION is in OTHER_CPLUSPLUSFLAGS
          react_native_minor_version_flag = other_cflags.find { |flag| flag.to_s.match?(/-DREACT_NATIVE_MINOR_VERSION=/) }
          if react_native_minor_version_flag && !other_cpp_flags.any? { |flag| flag.to_s.match?(/-DREACT_NATIVE_MINOR_VERSION=/) }
            other_cpp_flags << react_native_minor_version_flag
          end
          
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = other_cpp_flags
          
          # Also ensure OTHER_CFLAGS has the version (in case it was missing)
          unless other_cflags.any? { |flag| flag.to_s.match?(/-DREANIMATED_VERSION=/) }
            other_cflags << "-DREANIMATED_VERSION=#{reanimated_version}"
            config.build_settings['OTHER_CFLAGS'] = other_cflags
          end
          
          # Add to GCC_PREPROCESSOR_DEFINITIONS for extra safety
          preprocessor_definitions = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || []
          preprocessor_definitions = [preprocessor_definitions] unless preprocessor_definitions.is_a?(Array)
          
          unless preprocessor_definitions.any? { |d| d.to_s.include?('REANIMATED_VERSION') }
            preprocessor_definitions << "REANIMATED_VERSION=#{reanimated_version}"
          end
          
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = preprocessor_definitions
        end
      end
    end
    
    # Apply settings to the main app target
    installer.aggregate_targets.each do |aggregate_target|
      aggregate_target.user_project.targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
          config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end
    
    # CRITICAL: Fix Firebase/Firebase.h import issue with use_frameworks!
    # The symlink exists but may need proper header search paths
    # Add explicit header search path for RNFBApp to find Firebase/Firebase.h
    installer.pods_project.targets.each do |target|
      if target.name == 'RNFBApp'
        target.build_configurations.each do |config|
          header_search_paths = config.build_settings['HEADER_SEARCH_PATHS'] || []
          header_search_paths = [header_search_paths] unless header_search_paths.is_a?(Array)
          
          # Add explicit path to Headers/Public so Firebase/Firebase.h can be resolved
          firebase_public_path = File.join(installer.sandbox.root, 'Headers', 'Public')
          if File.exist?(firebase_public_path)
            header_search_paths << firebase_public_path
          end
          
          config.build_settings['HEADER_SEARCH_PATHS'] = header_search_paths.uniq
        end
      end
    end
    `;
          
          podfileContent = podfileContent.replace(postInstallEndPattern, `$1${additionalCode}  $2`);
          modified = true;
        }
      }

      // Add require 'fileutils' if not present
      if (!podfileContent.includes("require 'fileutils'")) {
        const requireJsonPattern = /(require 'json'\n)/;
        if (requireJsonPattern.test(podfileContent)) {
          podfileContent = podfileContent.replace(requireJsonPattern, "$1require 'fileutils'\n");
          modified = true;
        }
      }

      // Add symlink creation scripts to post_install
      const hasSymlinkScripts = podfileContent.includes('CRITICAL: Create symlinks for RNFBApp headers');
      
      if (podfileContent.includes('post_install do |installer|') && !hasSymlinkScripts) {
        // Find the last "end" before the final "end" of post_install
        // We need to add our code before the final "end" of post_install block
        const postInstallPattern = /(# CRITICAL: Fix Firebase\/Firebase\.h import issue with use_frameworks![\s\S]*?config\.build_settings\['HEADER_SEARCH_PATHS'\] = header_search_paths\.uniq\s+end\s+end\s+)(end\s+end)/;
        
        if (postInstallPattern.test(podfileContent)) {
          const symlinkCode = `
    # CRITICAL: Create symlinks for RNFBApp headers to enable modular imports
    # This fixes "RNFBApp/RNFBSharedUtils.h file not found" errors
    rnfbapp_headers_dir = File.join(installer.sandbox.root, 'Headers', 'Public', 'RNFBApp')
    rnfbapp_source_dir = File.join(installer.sandbox.root, '..', '..', 'node_modules', '@react-native-firebase', 'app', 'ios', 'RNFBApp')
    
    if File.exist?(rnfbapp_source_dir)
      FileUtils.mkdir_p(File.dirname(rnfbapp_headers_dir))
      if File.exist?(rnfbapp_headers_dir)
        # Remove existing symlink or directory if it's not a symlink
        if File.symlink?(rnfbapp_headers_dir)
          FileUtils.rm(rnfbapp_headers_dir)
        elsif File.directory?(rnfbapp_headers_dir)
          FileUtils.rm_rf(rnfbapp_headers_dir)
        end
      end
      begin
        FileUtils.symlink(rnfbapp_source_dir, rnfbapp_headers_dir)
        puts "✅ Created symlink: #{rnfbapp_headers_dir} -> #{rnfbapp_source_dir}"
      rescue => e
        # If symlink fails, try copying headers
        puts "⚠️ Symlink failed, copying headers: #{e.message}"
        FileUtils.cp_r(rnfbapp_source_dir, rnfbapp_headers_dir)
      end
    end
    
    # CRITICAL: Create symlinks for FirebaseAnalytics headers
    # This fixes "FirebaseAnalytics/FIRAnalytics.h file not found" errors
    firebase_analytics_headers_dir = File.join(installer.sandbox.root, 'Headers', 'Public', 'FirebaseAnalytics')
    # Try multiple possible paths for FirebaseAnalytics xcframework
    firebase_analytics_framework = nil
    possible_paths = [
      File.join(installer.sandbox.root, 'FirebaseAnalytics', 'Frameworks', 'FirebaseAnalytics.xcframework'),
      File.join(installer.sandbox.root, 'FirebaseAnalytics', '*.xcframework'),
      Dir.glob(File.join(installer.sandbox.root, 'FirebaseAnalytics', '**', '*.xcframework')).first
    ]
    
    possible_paths.each do |path|
      if path.include?('*')
        firebase_analytics_framework = Dir.glob(path).first
      else
        firebase_analytics_framework = path if File.exist?(path)
      end
      break if firebase_analytics_framework && File.exist?(firebase_analytics_framework)
    end
    
    if firebase_analytics_framework && File.exist?(firebase_analytics_framework)
      # Find the actual headers inside the xcframework
      simulator_headers = Dir.glob(File.join(firebase_analytics_framework, '**', 'ios-arm64_x86_64-simulator', 'FirebaseAnalytics.framework', 'Headers')).first
      device_headers = Dir.glob(File.join(firebase_analytics_framework, '**', 'ios-arm64', 'FirebaseAnalytics.framework', 'Headers')).first
      
      headers_source = simulator_headers || device_headers
      
      if headers_source && File.exist?(headers_source)
        FileUtils.mkdir_p(File.dirname(firebase_analytics_headers_dir))
        if File.exist?(firebase_analytics_headers_dir)
          # Remove existing symlink or directory if it's not a symlink
          if File.symlink?(firebase_analytics_headers_dir)
            FileUtils.rm(firebase_analytics_headers_dir)
          elsif File.directory?(firebase_analytics_headers_dir)
            FileUtils.rm_rf(firebase_analytics_headers_dir)
          end
        end
        begin
          FileUtils.symlink(headers_source, firebase_analytics_headers_dir)
          puts "✅ Created symlink: #{firebase_analytics_headers_dir} -> #{headers_source}"
        rescue => e
          puts "⚠️ Symlink failed, copying headers: #{e.message}"
          FileUtils.cp_r(headers_source, firebase_analytics_headers_dir)
        end
        
        # Create FirebaseAnalytics.h symlink to FIRAnalytics.h for conditional imports
        # This is done inside the symlinked directory, so we need to use the actual path
        fir_analytics_h = File.join(headers_source, 'FIRAnalytics.h')
        firebase_analytics_h = File.join(headers_source, 'FirebaseAnalytics.h')
        
        if File.exist?(fir_analytics_h) && !File.exist?(firebase_analytics_h)
          begin
            FileUtils.symlink('FIRAnalytics.h', firebase_analytics_h)
            puts "✅ Created symlink: #{firebase_analytics_h} -> FIRAnalytics.h"
          rescue => e
            puts "⚠️ Could not create FirebaseAnalytics.h symlink: #{e.message}"
          end
        end
      end
    end
`;
          
          podfileContent = podfileContent.replace(postInstallPattern, `$1${symlinkCode}  $2`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
};

module.exports = withIosSwiftModules;
