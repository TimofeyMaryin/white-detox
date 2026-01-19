# Screen Time & Device Activity

## Обзор

Проект использует библиотеку `react-native-device-activity` от Kingstinct для работы с Apple Screen Time API.

## Возможности

- **FamilyControls** — выбор приложений для блокировки
- **DeviceActivityMonitor** — scheduled blocking по времени/дню недели
- **ShieldConfiguration** — кастомизация экрана блокировки
- **Shared UserDefaults** — обмен данными между приложением и extensions

## Установка

```bash
npm install react-native-device-activity
```

## Конфигурация (app.json)

```json
{
  "plugins": [
    [
      "react-native-device-activity",
      {
        "appleTeamId": "YOUR_TEAM_ID",
        "appGroup": "group.com.danielian.selfcontrol.dopaminedetox"
      }
    ]
  ]
}
```

## Сборка

```bash
rm -rf ios
npx expo prebuild --platform ios
npx expo run:ios
```

## Extension Targets

После prebuild в Xcode project появятся targets:
- `ActivityMonitorExtension` — для scheduled blocking
- `ShieldAction` — действия на shield
- `ShieldConfiguration` — UI shield'а

## Apple Developer Portal

Для каждого bundle identifier нужны entitlements:
- `com.danielian.selfcontrol.dopaminedetox`
- `com.danielian.selfcontrol.dopaminedetox.ActivityMonitor`
- `com.danielian.selfcontrol.dopaminedetox.ShieldAction`
- `com.danielian.selfcontrol.dopaminedetox.ShieldConfiguration`

Запросите "Family Controls (Distribution)" approval как можно раньше.

## Использование

```typescript
import * as DeviceActivity from 'react-native-device-activity';

// Запрос авторизации
await DeviceActivity.requestAuthorization('individual');

// Блокировка приложений
DeviceActivity.blockSelection({ activitySelectionId: 'my-selection' });

// Снятие блокировки
DeviceActivity.resetBlocks();

// Scheduled blocking
await DeviceActivity.startMonitoring(
  'evening_block',
  {
    intervalStart: { hour: 19, minute: 0 },
    intervalEnd: { hour: 23, minute: 59 },
    repeats: true,
  },
  []
);

// Настройка действий при начале интервала
DeviceActivity.configureActions({
  activityName: 'evening_block',
  callbackName: 'intervalDidStart',
  actions: [{
    type: 'blockSelection',
    familyActivitySelectionId: 'my-selection',
  }],
});
```

## Документация

- [GitHub: react-native-device-activity](https://github.com/kingstinct/react-native-device-activity)
- [Apple WWDC21: Screen Time API](https://developer.apple.com/videos/play/wwdc2021/10123/)
