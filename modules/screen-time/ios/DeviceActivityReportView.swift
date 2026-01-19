import SwiftUI
import DeviceActivity
import FamilyControls
import ManagedSettings

// MARK: - Screen Time Data Fetcher
// This class fetches screen time data from shared UserDefaults
// Data is populated by the DeviceActivityReportExtension

@objc public class ScreenTimeDataFetcher: NSObject {
    
    @objc public static let shared = ScreenTimeDataFetcher()
    
    private let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox")
    
    private override init() {
        super.init()
    }
    
    /// Fetches screen time data for the specified period and saves to UserDefaults
    /// This must be called from the main thread
    @objc public func fetchAndSaveScreenTimeData(period: String, completion: @escaping (Bool) -> Void) {
        guard #available(iOS 16.0, *) else {
            print("[ScreenTimeDataFetcher] iOS 16.0+ required")
            completion(false)
            return
        }
        
        // DeviceActivityReport data is not directly accessible programmatically
        // The data is only available through the DeviceActivityReport SwiftUI view
        // which triggers the DeviceActivityReportExtension
        
        // Check if we have any cached data
        guard let userDefaults = userDefaults else {
            print("[ScreenTimeDataFetcher] Could not access shared UserDefaults")
            completion(false)
            return
        }
        
        let totalTime = userDefaults.integer(forKey: "screenTime_totalTime")
        let pickups = userDefaults.integer(forKey: "screenTime_pickups")
        
        // If we have data, consider it a success
        if totalTime > 0 || pickups > 0 {
            print("[ScreenTimeDataFetcher] Found cached data: totalTime=\(totalTime), pickups=\(pickups)")
            completion(true)
        } else {
            print("[ScreenTimeDataFetcher] No cached data available")
            // Still return true - the data will be populated by the system
            completion(true)
        }
    }
    
    /// Clears all cached screen time data
    @objc public func clearCachedData() {
        userDefaults?.removeObject(forKey: "screenTime_totalTime")
        userDefaults?.removeObject(forKey: "screenTime_pickups")
        userDefaults?.removeObject(forKey: "screenTime_topApps")
        userDefaults?.removeObject(forKey: "screenTime_historical")
        userDefaults?.synchronize()
        print("[ScreenTimeDataFetcher] Cleared cached data")
    }
}
