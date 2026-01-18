# Инструкция по добавлению ScreenTimeReportExtension

## Когда нужно выполнять эту инструкцию

- После `rm -rf ios && npx expo prebuild --platform ios`
- После `npx expo prebuild --platform ios --clean`
- При первом клонировании репозитория

---

## Полная инструкция

### Шаг 1: Подготовка проекта

```bash
# 1. Удалить старую папку ios (если есть)
rm -rf ios

# 2. Создать iOS проект
npx expo prebuild --platform ios

# 3. СТОП! Не запускать run:ios - сначала добавить extension в Xcode
```

---

### Шаг 2: Открыть проект в Xcode

```bash
open ios/DopamineDetoxSelfControl.xcworkspace
```

⚠️ **ВАЖНО:** Открывайте `.xcworkspace`, НЕ `.xcodeproj`!

---

### Шаг 3: Создать Extension Target

1. В меню Xcode: **File → New → Target...**

2. В появившемся окне:
   - Выберите вкладку **iOS**
   - Прокрутите вниз до раздела **Application Extension**
   - Выберите **Device Activity Report Extension**
   - Нажмите **Next**

3. Заполните настройки:
   - **Product Name:** `ScreenTimeReportExtension`
   - **Team:** Выберите ваш Apple Developer Team
   - **Bundle Identifier:** `com.danielian.selfcontrol.dopaminedetox.ScreenTimeReport`
   - **Language:** Swift
   - Нажмите **Finish**

4. Когда появится диалог "Activate ScreenTimeReportExtension scheme?":
   - Нажмите **Cancel** (мы будем собирать основное приложение)

---

### Шаг 4: Настроить Capabilities для Extension

1. В левой панели Xcode (Project Navigator) выберите проект **DopamineDetoxSelfControl** (синяя иконка)

2. В центральной панели выберите target **ScreenTimeReportExtension**

3. Перейдите на вкладку **Signing & Capabilities**

4. Нажмите **+ Capability** и добавьте:
   - **App Groups** → выберите `group.com.danielian.selfcontrol.dopaminedetox`
   - **Family Controls** (если не добавлен автоматически)

5. Убедитесь, что **Team** выбран и **Signing Certificate** настроен

---

### Шаг 5: Заменить код Extension

Xcode создал файлы с шаблонным кодом. Нужно заменить их на наш код.

1. В Project Navigator найдите папку **ScreenTimeReportExtension**

2. Откройте файл с основным кодом (обычно называется `ScreenTimeReportExtension.swift` или `DeviceActivityReportExtension.swift`)

3. **Удалите всё содержимое** и вставьте следующий код:

```swift
import DeviceActivity
import SwiftUI

// MARK: - Data Model for passing between extension and view

struct ScreenTimeData {
    var totalDuration: TimeInterval = 0
    var totalPickups: Int = 0
    var apps: [(name: String, duration: TimeInterval, pickups: Int)] = []
}

// MARK: - Main Extension Entry Point

@main
struct ScreenTimeReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        TotalActivityReport { data in
            TotalActivityView(data: data)
        }
    }
}

// MARK: - Report Scene

struct TotalActivityReport: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .totalActivity
    let content: (ScreenTimeData) -> TotalActivityView
    
    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> ScreenTimeData {
        var result = ScreenTimeData()
        var appDict: [String: (duration: TimeInterval, pickups: Int)] = [:]
        
        // Iterate through activity data
        for await activityData in data {
            // Iterate through segments (each segment is a time period)
            for await segment in activityData.activitySegments {
                result.totalDuration += segment.totalActivityDuration
                
                // Iterate through categories in each segment
                for await category in segment.categories {
                    // Iterate through apps in each category
                    for await app in category.applications {
                        let appName = app.application.localizedDisplayName ?? "Unknown App"
                        let duration = app.totalActivityDuration
                        let pickups = app.numberOfPickups
                        
                        result.totalPickups += pickups
                        
                        // Aggregate app data
                        if let existing = appDict[appName] {
                            appDict[appName] = (
                                duration: existing.duration + duration,
                                pickups: existing.pickups + pickups
                            )
                        } else {
                            appDict[appName] = (duration: duration, pickups: pickups)
                        }
                    }
                }
            }
        }
        
        // Convert to sorted array
        result.apps = appDict.map { (name: $0.key, duration: $0.value.duration, pickups: $0.value.pickups) }
            .sorted { $0.duration > $1.duration }
        
        // Save to shared UserDefaults for main app to read
        saveToSharedStorage(result)
        
        return result
    }
    
    private func saveToSharedStorage(_ data: ScreenTimeData) {
        guard let userDefaults = UserDefaults(suiteName: "group.com.danielian.selfcontrol.dopaminedetox") else {
            print("[ScreenTimeReportExtension] Failed to access App Group UserDefaults")
            return
        }
        
        // Save total time and pickups
        userDefaults.set(Int(data.totalDuration), forKey: "screenTime_totalTime")
        userDefaults.set(data.totalPickups, forKey: "screenTime_pickups")
        
        // Save top apps
        let topApps: [[String: Any]] = data.apps.prefix(10).map { app in
            [
                "name": app.name,
                "time": Int(app.duration),
                "pickups": app.pickups,
                "notifications": 0
            ]
        }
        userDefaults.set(topApps, forKey: "screenTime_topApps")
        
        // Save historical data
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())
        
        var historicalData = userDefaults.array(forKey: "screenTime_historical") as? [[String: Any]] ?? []
        
        let todayEntry: [String: Any] = [
            "date": today,
            "totalTime": Int(data.totalDuration),
            "pickups": data.totalPickups,
            "topApps": topApps
        ]
        
        if let index = historicalData.firstIndex(where: { ($0["date"] as? String) == today }) {
            historicalData[index] = todayEntry
        } else {
            historicalData.append(todayEntry)
        }
        
        // Keep only last 31 days
        let calendar = Calendar.current
        if let thirtyOneDaysAgo = calendar.date(byAdding: .day, value: -31, to: Date()) {
            historicalData = historicalData.filter { entry in
                guard let dateString = entry["date"] as? String,
                      let date = dateFormatter.date(from: dateString) else { return false }
                return date >= thirtyOneDaysAgo
            }
        }
        
        userDefaults.set(historicalData, forKey: "screenTime_historical")
        userDefaults.synchronize()
        
        print("[ScreenTimeReportExtension] Saved: totalTime=\(Int(data.totalDuration))s, pickups=\(data.totalPickups), apps=\(data.apps.count)")
    }
}

// MARK: - View (required but can be minimal)

struct TotalActivityView: View {
    let data: ScreenTimeData
    
    var body: some View {
        // This view is rendered by iOS but we don't really need to show it
        // The data is already saved to UserDefaults for main app
        VStack {
            Text("Screen Time Updated")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(height: 1)
        .opacity(0)
    }
}

// MARK: - Context Extension

extension DeviceActivityReport.Context {
    static let totalActivity = Self("TotalActivity")
}
```

4. Сохраните файл (Cmd+S)

---

### Шаг 6: Удалить лишние файлы (опционально)

Xcode мог создать дополнительные файлы, которые не нужны:
- `TotalActivityReport.swift`
- `TotalActivityView.swift`
- Другие шаблонные файлы

Если они есть и вызывают ошибки компиляции - удалите их.

---

### Шаг 7: Проверить настройки сборки

1. Выберите target **ScreenTimeReportExtension**
2. Вкладка **Build Settings**
3. Найдите и проверьте:
   - **iOS Deployment Target:** `16.0` или выше
   - **Swift Language Version:** `5.0`

---

### Шаг 8: Собрать и запустить

Теперь можно вернуться в терминал:

```bash
npx expo run:ios
```

Или собрать напрямую в Xcode:
- Выберите scheme **DopamineDetoxSelfControl** (не ScreenTimeReportExtension!)
- Нажмите **Cmd+R** для запуска

---

## Проверка работы

1. Установите приложение на реальное устройство
2. Дайте разрешение Screen Time при первом запуске
3. Используйте телефон некоторое время (несколько часов)
4. Откройте вкладку Report в приложении

⚠️ **Важно:** iOS обновляет данные Screen Time не в реальном времени. Данные могут появиться через несколько часов использования устройства.

---

## Troubleshooting

### Ошибка "No such module 'DeviceActivity'"

В Build Settings extension убедитесь, что:
- **iOS Deployment Target** = 16.0+

### Ошибка подписи (Signing)

1. Выберите target ScreenTimeReportExtension
2. Signing & Capabilities → выберите Team
3. Убедитесь что Bundle ID уникален

### Extension не вызывается

- iOS вызывает extension автоматически, когда считает нужным
- Попробуйте открыть Settings → Screen Time на устройстве
- Подождите несколько часов активного использования

---

## Для команды сборки (CI/CD)

При автоматизированной сборке без Xcode UI:
1. Extension должен быть добавлен вручную хотя бы один раз
2. Сохранить `ios/` папку (не использовать `--clean`)
3. Или добавить `ios/` в репозиторий

Если папка `ios/` не в репозитории - каждый разработчик должен выполнить эту инструкцию после клонирования.
