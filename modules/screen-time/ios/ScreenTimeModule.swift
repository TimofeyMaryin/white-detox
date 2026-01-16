import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import React
import FamilyActivityPickerModule

@objc(ScreenTimeModule)
public class ScreenTimeModule: NSObject {
  
  @objc public static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      let authorizationCenter = AuthorizationCenter.shared
      
      do {
        let currentStatus = authorizationCenter.authorizationStatus
        
        // If already approved, return success
        if currentStatus == .approved {
          resolve(true)
          return
        }
        
        // Request authorization with .individual for self-control apps
        try await authorizationCenter.requestAuthorization(for: .individual)
        
        let newStatus = authorizationCenter.authorizationStatus
        resolve(newStatus == .approved)
      } catch {
        let status = authorizationCenter.authorizationStatus
        resolve(status == .approved)
      }
    }
  }
  
  @objc func isAuthorized(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      let authorizationCenter = AuthorizationCenter.shared
      let status = authorizationCenter.authorizationStatus
      
      await MainActor.run {
        resolve(status == .approved)
      }
    }
  }
  
  @objc func getScreenTimeUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      // Check authorization first
      let authorizationCenter = AuthorizationCenter.shared
      let status = authorizationCenter.authorizationStatus
      
      guard status == .approved else {
        await MainActor.run {
          // Очистить все данные из UserDefaults, если пользователь не авторизован
          // Это предотвращает показ старых/тестовых данных
          let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox")
          userDefaults?.removeObject(forKey: "screenTime_totalTime")
          userDefaults?.removeObject(forKey: "screenTime_pickups")
          userDefaults?.removeObject(forKey: "screenTime_topApps")
          userDefaults?.removeObject(forKey: "screenTime_historical")
          userDefaults?.synchronize()
          
          // Return empty data if not authorized
          let emptyData: [String: Any] = [
            "totalTime": 0,
            "pickups": 0,
            "topApps": []
          ]
          resolve(emptyData)
        }
        return
      }
      
      await MainActor.run {
        // DeviceActivityReport Extension вызывается автоматически iOS
        // Расширение записывает данные в shared UserDefaults
        // Читаем данные из shared UserDefaults
        let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox")
        
        var totalTime: Int = 0
        var pickups: Int = 0
        var topApps: [[String: Any]] = []
        
        if let userDefaults = userDefaults {
          totalTime = userDefaults.integer(forKey: "screenTime_totalTime")
          pickups = userDefaults.integer(forKey: "screenTime_pickups")
          
          if let topAppsData = userDefaults.array(forKey: "screenTime_topApps") as? [[String: Any]] {
            topApps = topAppsData
          }
        }
        
        // Если данных нет, возвращаем пустые значения
        // DeviceActivityReport Extension должен обновлять эти значения автоматически
        let usageData: [String: Any] = [
          "totalTime": totalTime,
          "pickups": pickups,
          "topApps": topApps
        ]
        
        resolve(usageData)
      }
    }
  }
  
  @objc func blockApps(_ activityTokensData: [String], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    blockAppsForScheduleId("", resolver: resolve, rejecter: reject)
  }
  
  @objc func blockAppsForScheduleId(_ scheduleId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      // Check authorization first
      let authorizationCenter = AuthorizationCenter.shared
      let status = authorizationCenter.authorizationStatus
      
      guard status == .approved else {
        await MainActor.run {
          reject("NOT_AUTHORIZED", "Screen Time authorization is required", nil)
        }
        return
      }
      
      // Note: Selection should be set via globalActivitySelection by FamilyActivityPickerModule
      // If not available, blocking won't work - user needs to select apps first
      
      // Get the stored ActivitySelection from global variable
      // This is set by FamilyActivityPickerModule when user selects apps
      guard let selection = globalActivitySelection else {
        await MainActor.run {
          reject("NO_SELECTION", "No apps selected. Please select apps using FamilyActivityPicker first.", nil)
        }
        return
      }
      
      // Extract ApplicationToken from the selection
      let applicationTokens = selection.applicationTokens
      
      guard !applicationTokens.isEmpty else {
        await MainActor.run {
          reject("EMPTY_SELECTION", "No applications selected", nil)
        }
        return
      }
      
      // Use ManagedSettings to block the applications
      // This must be done on the main thread
      await MainActor.run {
        // Use schedule ID to create named store (allows multiple schedules)
        let storeName = scheduleId.isEmpty ? "main" : "schedule_\(scheduleId)"
        let store = ManagedSettingsStore(named: ManagedSettingsStore.Name(storeName))
        
        // Configure shield to block the selected applications
        // Setting applications automatically enables blocking
        store.shield.applications = applicationTokens
        
        // Note: Selection persistence is handled by FamilyActivityPickerModule
        // ManagedSettingsStore automatically persists the tokens
        
        resolve(true)
      }
    }
  }
  
  @objc func unblockApps(_ activityTokensData: [String], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("main"))
      store.clearAllSettings()
      resolve(true)
    }
  }
  
  @objc func isAppBlocked(_ appIdentifier: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // ManagedSettings doesn't provide a direct way to check if a specific app is blocked
    // We can only check if any apps are blocked
    let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("main"))
    let isBlocking = !(store.shield.applications?.isEmpty ?? true)
    resolve(isBlocking)
  }
  
  @objc func getScreenTimeUsageForPeriod(_ period: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      // Check authorization first
      let authorizationCenter = AuthorizationCenter.shared
      let status = authorizationCenter.authorizationStatus
      
      guard status == .approved else {
        await MainActor.run {
          // Очистить все данные из UserDefaults, если пользователь не авторизован
          // Это предотвращает показ старых/тестовых данных
          let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox")
          userDefaults?.removeObject(forKey: "screenTime_totalTime")
          userDefaults?.removeObject(forKey: "screenTime_pickups")
          userDefaults?.removeObject(forKey: "screenTime_topApps")
          userDefaults?.removeObject(forKey: "screenTime_historical")
          userDefaults?.synchronize()
          
          let emptyData: [String: Any] = [
            "totalTime": 0,
            "pickups": 0,
            "topApps": [],
            "dailyData": []
          ]
          resolve(emptyData)
        }
        return
      }
      
      await MainActor.run {
        let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox")
        
        guard let userDefaults = userDefaults else {
          let emptyData: [String: Any] = [
            "totalTime": 0,
            "pickups": 0,
            "topApps": [],
            "dailyData": []
          ]
          resolve(emptyData)
          return
        }
        
        // Загрузить исторические данные
        var historicalData: [[String: Any]] = []
        if let existingData = userDefaults.array(forKey: "screenTime_historical") as? [[String: Any]] {
          historicalData = existingData
        }
        
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        var startDate: Date
        let endDate = today
        
        // Определить период
        switch period.lowercased() {
        case "day":
          startDate = today
        case "week":
          startDate = calendar.date(byAdding: .day, value: -6, to: today) ?? today
        case "month":
          startDate = calendar.date(byAdding: .day, value: -30, to: today) ?? today
        default:
          startDate = today
        }
        
        // Фильтровать данные по периоду
        let filteredData = historicalData.filter { dayData in
          guard let dateString = dayData["date"] as? String,
                let dayDate = dateFormatter.date(from: dateString) else {
            return false
          }
          return dayDate >= startDate && dayDate <= endDate
        }
        
        // Агрегировать данные
        var totalTime: Int = 0
        var totalPickups: Int = 0
        var appUsage: [String: (time: Int, pickups: Int)] = [:]
        
        for dayData in filteredData {
          if let dayTotalTime = dayData["totalTime"] as? Int {
            totalTime += dayTotalTime
          }
          if let dayPickups = dayData["pickups"] as? Int {
            totalPickups += dayPickups
          }
          
          // Агрегировать топ приложений
          if let dayTopApps = dayData["topApps"] as? [[String: Any]] {
            for app in dayTopApps {
              if let appName = app["name"] as? String,
                 let appTime = app["time"] as? Int,
                 let appPickups = app["pickups"] as? Int {
                if let existing = appUsage[appName] {
                  appUsage[appName] = (
                    time: existing.time + appTime,
                    pickups: existing.pickups + appPickups
                  )
                } else {
                  appUsage[appName] = (time: appTime, pickups: appPickups)
                }
              }
            }
          }
        }
        
        // Сортировать топ приложений
        let sortedApps = appUsage.sorted { $0.value.time > $1.value.time }.prefix(10)
        let topAppsData = sortedApps.map { app in
          [
            "name": app.key,
            "time": app.value.time,
            "pickups": app.value.pickups,
            "notifications": 0
          ] as [String: Any]
        }
        
        // Подготовить ежедневные данные для графика
        var dailyDataForChart: [[String: Any]] = []
        
        if period.lowercased() == "day" {
          // Для дня используем текущие данные и показываем как один бар
          // Или можно использовать данные за последние несколько дней для сравнения
          let currentData = userDefaults.integer(forKey: "screenTime_totalTime")
          dailyDataForChart = [
            [
              "label": "Today",
              "value": currentData,
              "date": dateFormatter.string(from: today)
            ]
          ]
        } else {
          // Для недели и месяца показываем данные по дням
          dailyDataForChart = filteredData.map { dayData -> [String: Any] in
            var chartDayData: [String: Any] = [:]
            if let dateString = dayData["date"] as? String {
              chartDayData["date"] = dateString
              // Извлечь день недели или день месяца для метки
              if let dayDate = dateFormatter.date(from: dateString) {
                if period.lowercased() == "week" {
                  let weekday = calendar.component(.weekday, from: dayDate)
                  let weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                  chartDayData["label"] = weekdayNames[weekday - 1]
                } else if period.lowercased() == "month" {
                  let day = calendar.component(.day, from: dayDate)
                  chartDayData["label"] = "\(day)"
                }
              }
            }
            if let dayTotalTime = dayData["totalTime"] as? Int {
              chartDayData["value"] = dayTotalTime
            } else {
              chartDayData["value"] = 0
            }
            return chartDayData
          }
          
          // Сортировать по дате (старые первыми)
          dailyDataForChart.sort { (first, second) -> Bool in
            guard let firstDate = first["date"] as? String,
                  let secondDate = second["date"] as? String,
                  let firstDateObj = dateFormatter.date(from: firstDate),
                  let secondDateObj = dateFormatter.date(from: secondDate) else {
              return false
            }
            return firstDateObj < secondDateObj
          }
        }
        
        let usageData: [String: Any] = [
          "totalTime": totalTime,
          "pickups": totalPickups,
          "topApps": Array(topAppsData),
          "dailyData": dailyDataForChart
        ]
        
        resolve(usageData)
      }
    }
  }
}

