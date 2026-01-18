const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EXTENSION_NAME = 'ScreenTimeReportExtension';
const APP_GROUP = 'group.com.danielian.selfcontrol.dopaminedetox';

/**
 * Expo config plugin for DeviceActivityReportExtension
 * This ONLY creates the extension files.
 * The extension target must be added manually in Xcode or via the setup script.
 * 
 * Why? Because Expo's xcode project API doesn't properly support App Extensions.
 * Attempting to add targets programmatically causes path issues and build failures.
 */
const withScreenTimeReportExtension = (config) => {
  // Create the extension files only
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const extensionDir = path.join(platformProjectRoot, EXTENSION_NAME);
      
      // Create extension directory
      if (!fs.existsSync(extensionDir)) {
        fs.mkdirSync(extensionDir, { recursive: true });
      }
      
      // Write Swift source file
      const swiftCode = getExtensionSwiftCode();
      fs.writeFileSync(path.join(extensionDir, `${EXTENSION_NAME}.swift`), swiftCode);
      console.log(`✅ Created ${EXTENSION_NAME}/${EXTENSION_NAME}.swift`);
      
      // Write Info.plist
      const infoPlist = getExtensionInfoPlist();
      fs.writeFileSync(path.join(extensionDir, `${EXTENSION_NAME}-Info.plist`), infoPlist);
      console.log(`✅ Created ${EXTENSION_NAME}/${EXTENSION_NAME}-Info.plist`);
      
      // Write Entitlements
      const entitlements = getExtensionEntitlements();
      fs.writeFileSync(path.join(extensionDir, `${EXTENSION_NAME}.entitlements`), entitlements);
      console.log(`✅ Created ${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`);
      
      console.log(`\n📋 Extension files created. To add the target to Xcode project:`);
      console.log(`   Run: node scripts/setup-screen-time-extension.js`);
      console.log(`   Or add the target manually in Xcode.\n`);
      
      return config;
    },
  ]);
  
  return config;
};

/**
 * Get the Swift source code for the extension
 */
function getExtensionSwiftCode() {
  return `import DeviceActivity
import SwiftUI
import FamilyControls
import ManagedSettings

@main
struct ${EXTENSION_NAME}: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        // Total Activity Report
        TotalActivityReport { totalActivity in
            TotalActivityView(totalActivity: totalActivity)
        }
    }
}

// MARK: - Total Activity Report

struct TotalActivityReport: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .totalActivity
    let content: (DeviceActivityResults<DeviceActivityData>) -> TotalActivityView
    
    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> DeviceActivityResults<DeviceActivityData> {
        // Save data to shared UserDefaults
        await saveToUserDefaults(data: data)
        return data
    }
}

struct TotalActivityView: View {
    let totalActivity: DeviceActivityResults<DeviceActivityData>
    
    var body: some View {
        // This view is not displayed - data is saved to UserDefaults
        EmptyView()
    }
}

// MARK: - Save to UserDefaults

private func saveToUserDefaults(data: DeviceActivityResults<DeviceActivityData>) async {
    guard let userDefaults = UserDefaults(suiteName: "${APP_GROUP}") else {
        print("[${EXTENSION_NAME}] Failed to access shared UserDefaults")
        return
    }
    
    var totalScreenTime: TimeInterval = 0
    var totalPickups: Int = 0
    var appUsage: [[String: Any]] = []
    
    // Iterate through the activity data
    for await activityData in data {
        totalScreenTime += activityData.totalActivityDuration
        totalPickups += activityData.totalPickupCount
        
        // Get per-app data from activity segments
        for segment in activityData.activitySegments {
            for category in segment.categories {
                for app in category.applications {
                    let appName = app.application.localizedDisplayName ?? "Unknown"
                    let appTime = app.totalActivityDuration
                    let appPickups = app.pickupCount
                    
                    // Update or add app entry
                    if let index = appUsage.firstIndex(where: { ($0["name"] as? String) == appName }) {
                        let existingTime = appUsage[index]["time"] as? Int ?? 0
                        let existingPickups = appUsage[index]["pickups"] as? Int ?? 0
                        appUsage[index]["time"] = existingTime + Int(appTime)
                        appUsage[index]["pickups"] = existingPickups + appPickups
                    } else {
                        appUsage.append([
                            "name": appName,
                            "time": Int(appTime),
                            "pickups": appPickups,
                            "notifications": 0
                        ])
                    }
                }
            }
        }
    }
    
    // Sort by usage time and take top 10
    appUsage.sort { ($0["time"] as? Int ?? 0) > ($1["time"] as? Int ?? 0) }
    let topApps = Array(appUsage.prefix(10))
    
    // Save to UserDefaults
    userDefaults.set(Int(totalScreenTime), forKey: "screenTime_totalTime")
    userDefaults.set(totalPickups, forKey: "screenTime_pickups")
    userDefaults.set(topApps, forKey: "screenTime_topApps")
    
    // Save historical data
    await saveHistoricalData(userDefaults: userDefaults, totalTime: Int(totalScreenTime), pickups: totalPickups, topApps: topApps)
    
    userDefaults.synchronize()
    print("[${EXTENSION_NAME}] Saved: totalTime=\\(Int(totalScreenTime))s, pickups=\\(totalPickups), apps=\\(topApps.count)")
}

private func saveHistoricalData(userDefaults: UserDefaults, totalTime: Int, pickups: Int, topApps: [[String: Any]]) async {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let today = dateFormatter.string(from: Date())
    
    var historicalData = userDefaults.array(forKey: "screenTime_historical") as? [[String: Any]] ?? []
    
    let todayEntry: [String: Any] = [
        "date": today,
        "totalTime": totalTime,
        "pickups": pickups,
        "topApps": topApps
    ]
    
    if let index = historicalData.firstIndex(where: { ($0["date"] as? String) == today }) {
        historicalData[index] = todayEntry
    } else {
        historicalData.append(todayEntry)
    }
    
    // Keep only last 31 days
    let calendar = Calendar.current
    let thirtyOneDaysAgo = calendar.date(byAdding: .day, value: -31, to: Date())!
    historicalData = historicalData.filter { entry in
        guard let dateString = entry["date"] as? String,
              let date = dateFormatter.date(from: dateString) else { return false }
        return date >= thirtyOneDaysAgo
    }
    
    userDefaults.set(historicalData, forKey: "screenTime_historical")
}

// MARK: - Report Contexts

extension DeviceActivityReport.Context {
    static let totalActivity = Self("TotalActivity")
}
`;
}

/**
 * Get the Info.plist for the extension
 */
function getExtensionInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
        <key>NSExtensionPrincipalClass</key>
        <string>$(PRODUCT_MODULE_NAME).${EXTENSION_NAME}</string>
    </dict>
</dict>
</plist>
`;
}

/**
 * Get the entitlements for the extension
 */
function getExtensionEntitlements() {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
}

module.exports = withScreenTimeReportExtension;
