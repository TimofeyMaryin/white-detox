# Инструкция по настройке App Extensions

Для полной функциональности приложения необходимо настроить два App Extension:

1. **DeviceActivityMonitor Extension** - для автоматического выполнения расписаний блокировки
2. **DeviceActivityReport Extension** - для получения статистики Screen Time

## Шаг 1: Настройка App Group

1. Откройте проект в Xcode
2. Выберите основной target `DopamineDetoxSelfControl`
3. Перейдите в **Signing & Capabilities**
4. Нажмите **+ Capability** и добавьте **App Groups**
5. Создайте новую группу: `group.com.danielian.selfcontrol.dopaminedetox`
6. Убедитесь, что группа включена

## Шаг 2: Создание DeviceActivityMonitor Extension

### 2.1 Создание Target

1. В Xcode: **File > New > Target**
2. Выберите **App Extension > Device Activity Monitor Extension**
3. Название: `DeviceActivityMonitorExtension`
4. Bundle Identifier: `com.danielian.selfcontrol.dopaminedetox.DeviceActivityMonitorExtension`
5. Language: **Swift**

### 2.2 Настройка Extension

1. Откройте файл `DeviceActivityMonitorExtension/DeviceActivityMonitor.swift` (созданный автоматически)
2. Замените содержимое на код из `DopamineDetoxSelfControl/DeviceActivityMonitor.swift`
3. Убедитесь, что импортированы необходимые модули:
   - `Foundation`
   - `DeviceActivity`
   - `FamilyControls`
   - `ManagedSettings`

### 2.3 Настройка Capabilities

1. Выберите target `DeviceActivityMonitorExtension`
2. Перейдите в **Signing & Capabilities**
3. Добавьте **App Groups** с той же группой: `group.com.danielian.selfcontrol.dopaminedetox`
4. Добавьте **Family Controls** capability

### 2.4 Настройка Info.plist Extension

В `DeviceActivityMonitorExtension/Info.plist` добавьте:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.device-activity-monitor</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).BlockingActivityMonitor</string>
</dict>
```

## Шаг 3: Создание DeviceActivityReport Extension

### 3.1 Создание Target

1. В Xcode: **File > New > Target**
2. Выберите **App Extension > Device Activity Report Extension**
3. Название: `DeviceActivityReportExtension`
4. Bundle Identifier: `com.danielian.selfcontrol.dopaminedetox.DeviceActivityReportExtension`
5. Language: **Swift**

### 3.2 Настройка Extension

1. Откройте файл `DeviceActivityReportExtension/DeviceActivityReportExtension.swift` (созданный автоматически)
2. Замените содержимое на код из `DopamineDetoxSelfControl/DeviceActivityReportExtension.swift`
3. Убедитесь, что импортированы необходимые модули

### 3.3 Настройка Capabilities

1. Выберите target `DeviceActivityReportExtension`
2. Перейдите в **Signing & Capabilities**
3. Добавьте **App Groups** с той же группой: `group.com.danielian.selfcontrol.dopaminedetox`
4. Добавьте **Family Controls** capability

### 3.4 Настройка Info.plist Extension

В `DeviceActivityReportExtension/Info.plist` добавьте:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.device-activity-report</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ScreenTimeReport</string>
</dict>
```

## Шаг 4: Обновление Entitlements

Для всех трех targets (основное приложение и два расширения) убедитесь, что в entitlements файлах есть:

```xml
<key>com.apple.developer.family-controls</key>
<true/>
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.danielian.selfcontrol.dopaminedetox</string>
</array>
```

## Шаг 5: Обновление Bridging Header (если нужно)

Если расширения используют Objective-C код, добавьте в Bridging Header:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```

## Шаг 6: Проверка настройки

1. Убедитесь, что все три target имеют одинаковый **Team** в Signing
2. Убедитесь, что все три target используют одинаковый **Provisioning Profile** (или Automatic)
3. Соберите проект: **Product > Build**
4. Проверьте, что нет ошибок компиляции

## Шаг 7: Тестирование

1. Запустите приложение на реальном устройстве (симулятор не поддерживает Family Controls)
2. Предоставьте разрешения Screen Time
3. Создайте расписание блокировки
4. Проверьте, что расписание автоматически выполняется в указанное время
5. Проверьте, что статистика отображается в Report Screen

## Важные замечания

1. **App Extensions работают только на реальных устройствах**, не на симуляторе
2. **Family Controls требует iOS 15.0+**
3. **DeviceActivityMonitor** автоматически вызывается iOS при наступлении времени расписания
4. **DeviceActivityReport** автоматически вызывается iOS для генерации отчетов
5. Все три target должны быть подписаны одним и тем же сертификатом

## Troubleshooting

### Расписания не выполняются автоматически

- Убедитесь, что DeviceActivityMonitor Extension правильно настроен
- Проверьте, что расписание создано через `createDeviceActivitySchedule`
- Проверьте логи устройства через Console.app

### Статистика не отображается

- Убедитесь, что DeviceActivityReport Extension правильно настроен
- Проверьте, что App Group настроен одинаково для всех targets
- Проверьте логи устройства через Console.app

### Ошибки компиляции

- Убедитесь, что все необходимые frameworks импортированы
- Проверьте, что Bundle Identifiers уникальны
- Убедитесь, что все targets используют одинаковую версию Swift

