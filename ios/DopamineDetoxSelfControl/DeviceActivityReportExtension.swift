import Foundation
import DeviceActivity
import FamilyControls
import ManagedSettings

// DeviceActivityReport Extension для получения статистики Screen Time
// ВНИМАНИЕ: Этот файл должен быть частью отдельного App Extension target
// Создайте новый target "DeviceActivityReportExtension" в Xcode и добавьте этот файл

@available(iOS 15.0, *)
class ScreenTimeReport: DeviceActivityReportExtension {
  
  override func makeConfiguration() async -> ActivityReportConfiguration? {
    // Создать конфигурацию отчета
    // Фильтр для всех приложений
    let filter = ActivityFilter(
      applications: nil, // Все приложения
      categories: nil,
      webDomains: nil
    )
    
    return ActivityReportConfiguration(
      filter: filter,
      interval: .daily // Ежедневный отчет
    )
  }
  
  override func makeReport(_ context: DeviceActivityReportContext) async -> ActivityReport {
    // Получить данные из контекста
    let totalTime = context.totalActivityDuration
    let pickups = context.numberOfPickups
    
    // Получить топ приложений из событий
    var appUsage: [String: (time: TimeInterval, pickups: Int)] = [:]
    
    // Обработать события активности
    for event in context.events {
      // Получить информацию о приложении
      // Примечание: ApplicationToken нельзя сериализовать, используем displayName
      if let application = event.application {
        let appName = application.localizedDisplayName ?? "Unknown"
        let duration = event.totalActivityDuration
        let eventPickups = event.numberOfPickups
        
        if let existing = appUsage[appName] {
          appUsage[appName] = (
            time: existing.time + duration,
            pickups: existing.pickups + eventPickups
          )
        } else {
          appUsage[appName] = (time: duration, pickups: eventPickups)
        }
      }
    }
    
    // Сортировать и получить топ 10 приложений
    let sortedApps = appUsage.sorted { $0.value.time > $1.value.time }.prefix(10)
    
    // Сохранить данные в shared UserDefaults для доступа из основного приложения
    let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox")
    
    // Сохранить текущие данные (для дня)
    userDefaults?.set(Int(totalTime), forKey: "screenTime_totalTime")
    userDefaults?.set(pickups, forKey: "screenTime_pickups")
    
    let topAppsData = sortedApps.map { app in
      [
        "name": app.key,
        "time": Int(app.value.time),
        "pickups": app.value.pickups,
        "notifications": 0 // Можно добавить позже, если будет доступно в API
      ] as [String: Any]
    }
    
    userDefaults?.set(topAppsData, forKey: "screenTime_topApps")
    
    // Сохранить исторические данные для агрегации за неделю/месяц
    // Используем дату как ключ для хранения ежедневных данных
    let calendar = Calendar.current
    let today = calendar.startOfDay(for: Date())
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let dateKey = dateFormatter.string(from: today)
    
    // Сохранить данные за сегодня
    let dailyData: [String: Any] = [
      "date": dateKey,
      "totalTime": Int(totalTime),
      "pickups": pickups,
      "topApps": topAppsData
    ]
    
    // Загрузить существующие исторические данные
    var historicalData: [[String: Any]] = []
    if let existingData = userDefaults?.array(forKey: "screenTime_historical") as? [[String: Any]] {
      historicalData = existingData
    }
    
    // Удалить старые данные (старше 31 дня)
    let thirtyOneDaysAgo = calendar.date(byAdding: .day, value: -31, to: today) ?? today
    historicalData = historicalData.filter { dayData in
      if let dateString = dayData["date"] as? String,
         let dayDate = dateFormatter.date(from: dateString) {
        return dayDate >= thirtyOneDaysAgo
      }
      return true
    }
    
    // Обновить или добавить данные за сегодня
    if let existingIndex = historicalData.firstIndex(where: { ($0["date"] as? String) == dateKey }) {
      historicalData[existingIndex] = dailyData
    } else {
      historicalData.append(dailyData)
    }
    
    // Сортировать по дате (новые первыми)
    historicalData.sort { (first, second) -> Bool in
      guard let firstDate = first["date"] as? String,
            let secondDate = second["date"] as? String,
            let firstDateObj = dateFormatter.date(from: firstDate),
            let secondDateObj = dateFormatter.date(from: secondDate) else {
        return false
      }
      return firstDateObj > secondDateObj
    }
    
    // Сохранить обновленные исторические данные
    userDefaults?.set(historicalData, forKey: "screenTime_historical")
    userDefaults?.synchronize()
    
    // Создать и вернуть отчет
    // Примечание: ActivityReport требует ApplicationToken, но мы не можем их сериализовать
    // Поэтому возвращаем базовый отчет, а данные уже сохранены в UserDefaults
    return ActivityReport(
      totalActivityDuration: totalTime,
      numberOfPickups: pickups,
      topApplications: [] // Пустой массив, так как токены нельзя сериализовать
    )
  }
}

