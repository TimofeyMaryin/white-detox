#!/usr/bin/env node

/**
 * Script to add ScreenTimeReportExtension target to Xcode project
 * Run this ONCE after prebuild:
 * 
 *   node scripts/setup-screen-time-extension.js
 * 
 * This creates extension files and modifies project.pbxproj to add the extension target.
 */

const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const PROJECT_ROOT = path.join(__dirname, '..');
const IOS_DIR = path.join(PROJECT_ROOT, 'ios');
const XCODEPROJ_PATH = path.join(IOS_DIR, 'DopamineDetoxSelfControl.xcodeproj', 'project.pbxproj');
const EXTENSION_NAME = 'ScreenTimeReportExtension';
const BUNDLE_ID = 'com.danielian.selfcontrol.dopaminedetox';
const APP_GROUP = 'group.com.danielian.selfcontrol.dopaminedetox';

// Swift files to create
const SWIFT_FILES = [
  'ScreenTimeReportExtension.swift',
  'TotalActivityReport.swift',
  'TotalActivityView.swift'
];

async function main() {
  console.log('🔧 Setting up ScreenTimeReportExtension...\n');
  
  // Check if ios directory exists
  if (!fs.existsSync(IOS_DIR)) {
    console.error('❌ ios/ directory not found. Run "npx expo prebuild --platform ios" first.');
    process.exit(1);
  }
  
  // Create extension files
  const extensionDir = path.join(IOS_DIR, EXTENSION_NAME);
  console.log('📁 Creating extension directory and files...');
  createExtensionFiles(extensionDir);
  
  // Check if project.pbxproj exists
  if (!fs.existsSync(XCODEPROJ_PATH)) {
    console.error('❌ project.pbxproj not found at:', XCODEPROJ_PATH);
    process.exit(1);
  }
  
  // Parse the Xcode project
  console.log('\n📂 Parsing Xcode project...');
  const project = xcode.project(XCODEPROJ_PATH);
  
  project.parseSync();
  
  // Check if extension target already exists
  const targets = project.pbxNativeTargetSection();
  let extensionTargetKey = null;
  
  for (const key in targets) {
    if (targets[key] && targets[key].name === EXTENSION_NAME) {
      extensionTargetKey = key;
      break;
    }
  }
  
  if (extensionTargetKey) {
    console.log(`✅ ${EXTENSION_NAME} target already exists in project`);
    console.log('\n✨ Setup complete! You can build the project now.');
    return;
  }
  
  console.log(`➕ Adding ${EXTENSION_NAME} target...`);
  
  // Add extension target
  const extensionBundleId = `${BUNDLE_ID}.ScreenTimeReport`;
  
  const target = project.addTarget(
    EXTENSION_NAME,
    'app_extension',
    EXTENSION_NAME,
    extensionBundleId
  );
  
  if (!target) {
    console.error('❌ Failed to add extension target');
    process.exit(1);
  }
  
  console.log('✅ Added extension target with UUID:', target.uuid);
  
  // Create PBXGroup for extension files
  // Use empty path for sourceTree-relative group
  const groupFiles = [
    ...SWIFT_FILES,
    `${EXTENSION_NAME}-Info.plist`,
    `${EXTENSION_NAME}.entitlements`
  ];
  
  const extensionGroup = project.addPbxGroup(
    groupFiles,
    EXTENSION_NAME,
    EXTENSION_NAME
  );
  
  // Add the group to the main project group
  const mainGroup = project.getFirstProject().firstProject.mainGroup;
  project.addToPbxGroup(extensionGroup.uuid, mainGroup);
  
  console.log('✅ Added extension group');
  
  // Get the build phase for the extension target
  // We need to add source files specifically to the extension's compile sources phase
  const pbxNativeTarget = project.pbxNativeTargetSection()[target.uuid];
  
  if (pbxNativeTarget && pbxNativeTarget.buildPhases) {
    // Find or create Sources build phase for the extension
    let sourcesBuildPhaseUuid = null;
    
    for (const phaseRef of pbxNativeTarget.buildPhases) {
      const phase = project.pbxBuildPhaseObject(phaseRef.value);
      if (phase && phase.isa === 'PBXSourcesBuildPhase') {
        sourcesBuildPhaseUuid = phaseRef.value;
        break;
      }
    }
    
    if (sourcesBuildPhaseUuid) {
      console.log('✅ Found extension Sources build phase');
      
      // Add Swift files to the extension's build phase
      for (const swiftFile of SWIFT_FILES) {
        const filePath = `${EXTENSION_NAME}/${swiftFile}`;
        
        // Add file reference
        const fileRef = project.addFile(
          filePath,
          extensionGroup.uuid,
          { target: target.uuid, compilerFlags: '' }
        );
        
        if (fileRef) {
          console.log(`✅ Added ${swiftFile} to extension target`);
        }
      }
    } else {
      console.log('⚠️  Sources build phase not found, adding files manually');
      
      // Fallback: add files with explicit target
      for (const swiftFile of SWIFT_FILES) {
        project.addSourceFile(
          swiftFile,
          { target: target.uuid },
          extensionGroup.uuid
        );
        console.log(`✅ Added ${swiftFile}`);
      }
    }
  }
  
  // Add required frameworks to extension
  const frameworks = [
    'DeviceActivity.framework',
    'FamilyControls.framework',
    'ManagedSettings.framework',
    'SwiftUI.framework'
  ];
  
  for (const framework of frameworks) {
    project.addFramework(framework, {
      target: target.uuid,
      link: true
    });
  }
  
  console.log('✅ Added required frameworks');
  
  // Update build settings for the extension target
  const configurations = project.pbxXCBuildConfigurationSection();
  
  for (const key in configurations) {
    const config = configurations[key];
    if (config && config.buildSettings) {
      // Find extension's build configurations by bundle ID or product name
      const bundleId = config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
      const productName = config.buildSettings.PRODUCT_NAME;
      
      if (bundleId === extensionBundleId || 
          bundleId === `"${extensionBundleId}"` ||
          productName === EXTENSION_NAME ||
          productName === `"${EXTENSION_NAME}"`) {
        
        config.buildSettings.INFOPLIST_FILE = `"${EXTENSION_NAME}/${EXTENSION_NAME}-Info.plist"`;
        config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements"`;
        config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
        config.buildSettings.SWIFT_VERSION = '5.0';
        config.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        config.buildSettings.SKIP_INSTALL = 'YES';
        config.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
        config.buildSettings.CODE_SIGN_STYLE = 'Automatic';
        config.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
        
        console.log(`✅ Updated build settings for ${config.name || 'configuration'}`);
      }
    }
  }
  
  // Add extension to main app dependencies
  const mainTarget = project.getFirstTarget();
  if (mainTarget) {
    project.addTargetDependency(mainTarget.uuid, [target.uuid]);
    console.log('✅ Added target dependency');
  }
  
  // Write the modified project
  fs.writeFileSync(XCODEPROJ_PATH, project.writeSync());
  console.log('\n✅ Saved project.pbxproj');
  
  // Now we need to clean up: remove extension files from main app target if they got added there
  console.log('\n🧹 Cleaning up main target...');
  cleanupMainTarget();
  
  console.log('\n✨ Setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Open ios/DopamineDetoxSelfControl.xcworkspace in Xcode');
  console.log('2. Select the ScreenTimeReportExtension target');
  console.log('3. In Signing & Capabilities:');
  console.log('   - Select your Development Team');
  console.log('   - Add "App Groups" capability → select:', APP_GROUP);
  console.log('   - Add "Family Controls" capability');
  console.log('4. Build and run the project');
}

function cleanupMainTarget() {
  // Re-read the project file
  const projectContent = fs.readFileSync(XCODEPROJ_PATH, 'utf8');
  
  // Look for patterns that indicate extension files were added to main target
  // This is a simplified cleanup - removes duplicated path references
  let cleanedContent = projectContent;
  
  // Fix double path issue: ScreenTimeReportExtension/ScreenTimeReportExtension/
  const doublePathRegex = new RegExp(`${EXTENSION_NAME}/${EXTENSION_NAME}/`, 'g');
  cleanedContent = cleanedContent.replace(doublePathRegex, `${EXTENSION_NAME}/`);
  
  if (cleanedContent !== projectContent) {
    fs.writeFileSync(XCODEPROJ_PATH, cleanedContent);
    console.log('✅ Fixed double path references');
  } else {
    console.log('✅ No path issues found');
  }
}

function createExtensionFiles(extensionDir) {
  // Create directory
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }
  
  // 1. ScreenTimeReportExtension.swift - Entry point
  const entryPointCode = `//
//  ScreenTimeReportExtension.swift
//  ScreenTimeReportExtension
//

import DeviceActivity
import SwiftUI

@main
struct ScreenTimeReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        TotalActivityReport { activityData in
            TotalActivityView(activityData: activityData)
        }
    }
}
`;
  fs.writeFileSync(path.join(extensionDir, 'ScreenTimeReportExtension.swift'), entryPointCode);
  console.log('  ✅ Created ScreenTimeReportExtension.swift');
  
  // 2. TotalActivityReport.swift - Data processing and saving
  const reportCode = `//
//  TotalActivityReport.swift
//  ScreenTimeReportExtension
//

import DeviceActivity
import SwiftUI

extension DeviceActivityReport.Context {
    static let totalActivity = Self("Total Activity")
}

// Data model to pass to the view and save to UserDefaults
struct ActivityData {
    var totalDuration: TimeInterval = 0
    var totalPickups: Int = 0
    var apps: [(name: String, duration: TimeInterval, pickups: Int)] = []
    
    var formattedDuration: String {
        let hours = Int(totalDuration) / 3600
        let minutes = (Int(totalDuration) % 3600) / 60
        if hours > 0 {
            return "\\(hours)h \\(minutes)m"
        } else {
            return "\\(minutes)m"
        }
    }
}

struct TotalActivityReport: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .totalActivity
    let content: (ActivityData) -> TotalActivityView
    
    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> ActivityData {
        var result = ActivityData()
        var appDict: [String: (duration: TimeInterval, pickups: Int)] = [:]
        
        // Iterate through the async sequence of device activity data
        for await activityData in data {
            // Each activityData contains activity segments
            for await segment in activityData.activitySegments {
                // Add segment's total activity duration
                result.totalDuration += segment.totalActivityDuration
                
                // Iterate through categories in the segment
                for await categoryActivity in segment.categories {
                    // Iterate through applications in each category
                    for await appActivity in categoryActivity.applications {
                        // Get app name from the token (or use a placeholder)
                        let appName = appActivity.application.localizedDisplayName ?? "Unknown App"
                        let appDuration = appActivity.totalActivityDuration
                        let appPickups = appActivity.numberOfPickups
                        
                        result.totalPickups += appPickups
                        
                        // Aggregate by app name
                        if let existing = appDict[appName] {
                            appDict[appName] = (
                                duration: existing.duration + appDuration,
                                pickups: existing.pickups + appPickups
                            )
                        } else {
                            appDict[appName] = (duration: appDuration, pickups: appPickups)
                        }
                    }
                }
            }
        }
        
        // Sort apps by duration (descending) and take top 10
        result.apps = appDict
            .map { (name: $0.key, duration: $0.value.duration, pickups: $0.value.pickups) }
            .sorted { $0.duration > $1.duration }
            .prefix(10)
            .map { $0 }
        
        // Save to shared UserDefaults for main app to read
        saveToSharedStorage(result)
        
        return result
    }
    
    private func saveToSharedStorage(_ data: ActivityData) {
        // Use App Group to share data with main app
        guard let userDefaults = UserDefaults(suiteName: "${APP_GROUP}") else {
            print("[ScreenTimeReportExtension] Failed to access shared UserDefaults")
            return
        }
        
        // Save total time in seconds
        userDefaults.set(Int(data.totalDuration), forKey: "screenTime_totalTime")
        
        // Save total pickups
        userDefaults.set(data.totalPickups, forKey: "screenTime_pickups")
        
        // Save top apps as array of dictionaries
        let topAppsData: [[String: Any]] = data.apps.map { app in
            [
                "name": app.name,
                "time": Int(app.duration),
                "pickups": app.pickups,
                "notifications": 0
            ]
        }
        userDefaults.set(topAppsData, forKey: "screenTime_topApps")
        
        // Save historical data for charts
        saveHistoricalData(userDefaults: userDefaults, data: data, topApps: topAppsData)
        
        userDefaults.synchronize()
        
        print("[ScreenTimeReportExtension] Saved data - Total: \\(Int(data.totalDuration))s, Pickups: \\(data.totalPickups), Apps: \\(data.apps.count)")
    }
    
    private func saveHistoricalData(userDefaults: UserDefaults, data: ActivityData, topApps: [[String: Any]]) {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayString = dateFormatter.string(from: Date())
        
        // Load existing historical data
        var historicalData: [[String: Any]] = userDefaults.array(forKey: "screenTime_historical") as? [[String: Any]] ?? []
        
        // Create today's entry
        let todayData: [String: Any] = [
            "date": todayString,
            "totalTime": Int(data.totalDuration),
            "pickups": data.totalPickups,
            "topApps": topApps
        ]
        
        // Update or add today's entry
        if let existingIndex = historicalData.firstIndex(where: { ($0["date"] as? String) == todayString }) {
            historicalData[existingIndex] = todayData
        } else {
            historicalData.append(todayData)
        }
        
        // Keep only last 31 days
        if historicalData.count > 31 {
            // Sort by date and keep newest 31
            historicalData.sort { (first, second) -> Bool in
                guard let firstDate = first["date"] as? String,
                      let secondDate = second["date"] as? String else {
                    return false
                }
                return firstDate > secondDate
            }
            historicalData = Array(historicalData.prefix(31))
        }
        
        userDefaults.set(historicalData, forKey: "screenTime_historical")
    }
}
`;
  fs.writeFileSync(path.join(extensionDir, 'TotalActivityReport.swift'), reportCode);
  console.log('  ✅ Created TotalActivityReport.swift');
  
  // 3. TotalActivityView.swift - SwiftUI View
  const viewCode = `//
//  TotalActivityView.swift
//  ScreenTimeReportExtension
//

import SwiftUI

struct TotalActivityView: View {
    let activityData: ActivityData
    
    var body: some View {
        VStack(spacing: 4) {
            Text(activityData.formattedDuration)
                .font(.system(size: 24, weight: .bold))
            Text("\\(activityData.totalPickups) pickups")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(8)
    }
}

#Preview {
    TotalActivityView(activityData: ActivityData(
        totalDuration: 5580,
        totalPickups: 42,
        apps: []
    ))
}
`;
  fs.writeFileSync(path.join(extensionDir, 'TotalActivityView.swift'), viewCode);
  console.log('  ✅ Created TotalActivityView.swift');
  
  // 4. Info.plist
  // NOTE: DeviceActivityReportExtension does NOT use NSExtensionPrincipalClass
  // The entry point is discovered via @main attribute in Swift
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
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
</plist>
`;
  fs.writeFileSync(path.join(extensionDir, `${EXTENSION_NAME}-Info.plist`), infoPlist);
  console.log(`  ✅ Created ${EXTENSION_NAME}-Info.plist`);
  
  // 5. Entitlements
  const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
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
</plist>
`;
  fs.writeFileSync(path.join(extensionDir, `${EXTENSION_NAME}.entitlements`), entitlements);
  console.log(`  ✅ Created ${EXTENSION_NAME}.entitlements`);
}

main().catch(console.error);
