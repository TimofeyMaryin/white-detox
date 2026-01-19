import DeviceActivity
import SwiftUI

extension DeviceActivityReport.Context {
    static let totalActivity = Self("TotalActivity")
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
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
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
        guard let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox") else {
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
        
        print("[ScreenTimeReportExtension] Saved data - Total: \(Int(data.totalDuration))s, Pickups: \(data.totalPickups), Apps: \(data.apps.count)")
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
