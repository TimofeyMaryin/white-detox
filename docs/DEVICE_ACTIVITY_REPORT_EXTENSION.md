# ScreenTimeReportExtension

## Обзор

Extension для получения данных Screen Time использует `@bacons/apple-targets` для автоматического добавления в Xcode project при prebuild.

---

## Сборка проекта

```bash
# Полная пересборка
rm -rf ios
npx expo prebuild --platform ios

# Исправление Info.plist (если нужно)
cd ios && sed -i '' 's|"$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)",||g' DopamineDetoxSelfControl.xcodeproj/project.pbxproj && cd ..

# Запуск
npx expo run:ios
```

**Скрипты больше не нужны!** `@bacons/apple-targets` автоматически добавляет extension target.

---

## Структура

```
targets/
└── ScreenTimeReportExtension/
    ├── expo-target.config.js      # Конфигурация target
    ├── ScreenTimeReportExtension.swift  # Entry point
    ├── TotalActivityReport.swift  # Логика обработки данных
    └── TotalActivityView.swift    # SwiftUI View
```

---

## Конфигурация

### expo-target.config.js

```javascript
module.exports = {
  type: 'report-extension',
  name: 'ScreenTimeReportExtension',
  deploymentTarget: '16.0',
  entitlements: {
    'com.apple.developer.family-controls': true,
    'com.apple.security.application-groups': [
      'group.com.danielian.selfcontrol.dopaminedetox',
    ],
  },
  frameworks: [
    'DeviceActivity',
    'FamilyControls', 
    'ManagedSettings',
    'SwiftUI',
  ],
};
```

### app.json

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.developer.family-controls": true,
        "com.apple.security.application-groups": [
          "group.com.danielian.selfcontrol.dopaminedetox"
        ]
      }
    },
    "plugins": [
      "@bacons/apple-targets"
    ]
  }
}
```

---

## Как это работает

1. **Prebuild** - `@bacons/apple-targets` читает `targets/` папку и создаёт extension target в Xcode project
2. **Build** - Extension компилируется и включается в .ipa
3. **Runtime** - Когда приложение рендерит `DeviceActivityReport` SwiftUI view, iOS вызывает extension
4. **Extension** - `makeConfiguration()` получает данные и сохраняет в shared UserDefaults
5. **App** - `ScreenTimeModule` читает данные из UserDefaults и показывает в UI

---

## Troubleshooting

### Extension не появляется в Xcode

Убедитесь что:
- `@bacons/apple-targets` в dependencies
- `@bacons/apple-targets` в plugins в app.json
- Папка `targets/ScreenTimeReportExtension/` существует
- `expo-target.config.js` правильно настроен

### Данные не появляются

1. Проверьте что App Group одинаковый в extension и main app
2. Проверьте Console.app на устройстве - ищите логи `[ScreenTimeReportExtension]`
3. DeviceActivityReport extension вызывается только когда приложение рендерит `DeviceActivityReport` SwiftUI view

---

## Важно

- Screen Time API работает только на реальном устройстве
- iOS может не сразу вызвать extension - данные появятся через некоторое время
- Context `"TotalActivity"` должен совпадать в extension и в main app
