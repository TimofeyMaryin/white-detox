import Foundation
import DeviceActivity
import FamilyControls
import ManagedSettings

// DeviceActivityMonitor для автоматического выполнения расписаний
// Этот класс должен быть зарегистрирован в Info.plist как NSDeviceActivityMonitorExtension

@available(iOS 15.0, *)
class BlockingActivityMonitor: DeviceActivityMonitor {
  
  // Вызывается при начале мониторинга
  func monitorDidStart(_ monitor: DeviceActivityMonitor) {
    print("DeviceActivityMonitor started")
  }
  
  // Вызывается при остановке мониторинга
  func monitorDidStop(_ monitor: DeviceActivityMonitor) {
    print("DeviceActivityMonitor stopped")
  }
  
  // Вызывается при наступлении события (например, начало расписания)
  func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    print("Event reached threshold: \(event), activity: \(activity)")
    
    // Извлекаем scheduleId из имени активности
    // Формат: "schedule_<scheduleId>" или "schedule_<scheduleId>_day_<day>"
    let activityString = activity.rawValue
    if activityString.hasPrefix("schedule_") {
      let remaining = String(activityString.dropFirst("schedule_".count))
      // Убрать "_day_X" если есть
      let scheduleId = remaining.components(separatedBy: "_day_").first ?? remaining
      blockAppsForSchedule(scheduleId: scheduleId)
    }
  }
  
  // Вызывается при достижении порогового значения времени
  func intervalDidStart(for activity: DeviceActivityName) {
    print("Interval started for activity: \(activity)")
    
    // Извлекаем scheduleId из имени активности
    // Формат: "schedule_<scheduleId>" или "schedule_<scheduleId>_day_<day>"
    let activityString = activity.rawValue
    if activityString.hasPrefix("schedule_") {
      let remaining = String(activityString.dropFirst("schedule_".count))
      // Убрать "_day_X" если есть
      let scheduleId = remaining.components(separatedBy: "_day_").first ?? remaining
      blockAppsForSchedule(scheduleId: scheduleId)
    } else {
      // Fallback на глобальное расписание (только в основном приложении)
      #if !EXTENSION
      if let selection = globalActivitySelection, !selection.applicationTokens.isEmpty {
        DispatchQueue.main.async {
          let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("scheduled"))
          store.shield.applications = selection.applicationTokens
          print("Apps blocked at interval start (global)")
        }
      }
      #endif
    }
  }
  
  // Вызывается при окончании интервала
  func intervalDidEnd(for activity: DeviceActivityName) {
    print("Interval ended for activity: \(activity)")
    
    // Извлекаем scheduleId из имени активности
    // Формат: "schedule_<scheduleId>" или "schedule_<scheduleId>_day_<day>"
    let activityString = activity.rawValue
    if activityString.hasPrefix("schedule_") {
      let remaining = String(activityString.dropFirst("schedule_".count))
      // Убрать "_day_X" если есть
      let scheduleId = remaining.components(separatedBy: "_day_").first ?? remaining
      unblockAppsForSchedule(scheduleId: scheduleId)
    } else {
      // Fallback на глобальное расписание
      DispatchQueue.main.async {
        let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("scheduled"))
        store.clearAllSettings()
        print("Apps unblocked at interval end (global)")
      }
    }
  }
  
  // Блокировать приложения для конкретного расписания
  private func blockAppsForSchedule(scheduleId: String) {
    // Попытаться загрузить сохраненное расписание
    // Примечание: Если DeviceActivityMonitor в отдельном Extension target,
    // нужно убедиться, что FamilyActivitySelectionStorage доступен там
    let selection = FamilyActivitySelectionStorage.shared.loadSelection(forScheduleId: scheduleId)
    
    // Fallback на globalActivitySelection только если доступен (в основном приложении)
    // В Extension target globalActivitySelection не будет доступен
    #if !EXTENSION
    let finalSelection = selection ?? globalActivitySelection
    #else
    let finalSelection = selection
    #endif
    
    if let selection = finalSelection, !selection.applicationTokens.isEmpty {
      DispatchQueue.main.async {
        let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("schedule_\(scheduleId)"))
        store.shield.applications = selection.applicationTokens
        print("Apps blocked automatically for schedule: \(scheduleId)")
      }
    } else {
      print("Warning: No selection found for schedule: \(scheduleId)")
    }
  }
  
  // Разблокировать приложения для конкретного расписания
  private func unblockAppsForSchedule(scheduleId: String) {
    DispatchQueue.main.async {
      let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("schedule_\(scheduleId)"))
      store.clearAllSettings()
      print("Apps unblocked for schedule: \(scheduleId)")
    }
  }
}

// Расширение для ScreenTimeModule для работы с расписаниями
extension ScreenTimeModule {
  
  // Создать DeviceActivity schedule для автоматического выполнения
  @objc func createDeviceActivitySchedule(
    _ scheduleId: String,
    startTime: String,  // Format: "HH:mm"
    endTime: String,    // Format: "HH:mm"
    daysOfWeek: [Int],  // 0-6, where 0 is Sunday
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      // Проверка авторизации
      let authorizationCenter = AuthorizationCenter.shared
      let status = await authorizationCenter.authorizationStatus
      
      guard status == .approved else {
        await MainActor.run {
          reject("NOT_AUTHORIZED", "Screen Time authorization is required", nil)
        }
        return
      }
      
      // Парсинг времени
      let startComponents = startTime.components(separatedBy: ":")
      let endComponents = endTime.components(separatedBy: ":")
      
      guard startComponents.count == 2, endComponents.count == 2,
            let startHour = Int(startComponents[0]), let startMinute = Int(startComponents[1]),
            let endHour = Int(endComponents[0]), let endMinute = Int(endComponents[1]) else {
        await MainActor.run {
          reject("INVALID_TIME_FORMAT", "Time format must be HH:mm", nil)
        }
        return
      }
      
      await MainActor.run {
        do {
          // Создать DeviceActivity center
          let center = DeviceActivityCenter()
          
          // Создать DeviceActivity name
          let activityName = DeviceActivityName("schedule_\(scheduleId)")
          
          // Создать расписание для каждого дня недели
          // DeviceActivitySchedule работает только для одного дня, поэтому создаем отдельные расписания
          var schedules: [DeviceActivitySchedule] = []
          
          for day in daysOfWeek {
            // Создать DateComponents для дня недели
            var startComponents = DateComponents()
            startComponents.hour = startHour
            startComponents.minute = startMinute
            startComponents.weekday = day + 1 // iOS использует 1-7 (Sunday = 1)
            
            var endComponents = DateComponents()
            endComponents.hour = endHour
            endComponents.minute = endMinute
            endComponents.weekday = day + 1
            
            let schedule = DeviceActivitySchedule(
              intervalStart: startComponents,
              intervalEnd: endComponents,
              repeats: true,
              warningTime: nil
            )
            
            schedules.append(schedule)
          }
          
          // Если есть дни, создаем расписание для каждого дня
          if !schedules.isEmpty {
            // Создаем отдельное расписание для каждого дня недели
            // iOS требует отдельный DeviceActivityName для каждого дня
            for (index, schedule) in schedules.enumerated() {
              let dayActivityName = DeviceActivityName("schedule_\(scheduleId)_day_\(daysOfWeek[index])")
              
              // Начать мониторинг активности для этого дня
              // DeviceActivityMonitor будет автоматически вызываться iOS при наступлении времени
              try center.startMonitoring(dayActivityName, during: schedule)
            }
            
            print("Schedule created and started: \(scheduleId), \(startTime)-\(endTime), days: \(daysOfWeek)")
            
            resolve(true)
          } else {
            reject("NO_DAYS", "At least one day must be selected", nil)
          }
        } catch {
          reject("SCHEDULE_ERROR", "Failed to create schedule: \(error.localizedDescription)", error)
        }
      }
    }
  }
  
  // Удалить DeviceActivity schedule
  @objc func removeDeviceActivitySchedule(
    _ scheduleId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      await MainActor.run {
        do {
          let center = DeviceActivityCenter()
          
          // Остановить мониторинг для всех дней недели (0-6)
          var activityNames: [DeviceActivityName] = []
          for day in 0...6 {
            activityNames.append(DeviceActivityName("schedule_\(scheduleId)_day_\(day)"))
          }
          // Также добавить основное имя для обратной совместимости
          activityNames.append(DeviceActivityName("schedule_\(scheduleId)"))
          
          // Остановить мониторинг
          center.stopMonitoring(activityNames)
          
          // Разблокировать приложения для этого расписания
          let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("schedule_\(scheduleId)"))
          store.clearAllSettings()
          
          print("Schedule removed: \(scheduleId)")
          resolve(true)
        } catch {
          reject("REMOVE_SCHEDULE_ERROR", "Failed to remove schedule: \(error.localizedDescription)", error)
        }
      }
    }
  }
}

