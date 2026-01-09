# Интеграция SDK - Инструкция

## ✅ Что уже сделано:

### 1. Восстановлены нативные модули:
- ✅ `ScreenTimeModule.swift` и `.m` - блокировка приложений
- ✅ `FamilyActivityPickerModule.swift` и `.m` - выбор приложений
- ✅ `GrayscaleModule.swift` и `.m` - черно-белый режим

### 2. Настроены SDK:
- ✅ Adapty - конфигурация в `config/adapty.ts`
- ✅ AppsFlyer - конфигурация в `config/appsflyer.ts`
- ✅ Firebase - уже установлен и настроен

### 3. Созданы сервисы:
- ✅ `services/adapty-service.ts` - работа с Adapty
- ✅ `services/appsflyer-service.ts` - работа с AppsFlyer
- ✅ `services/analytics.ts` - аналитика (Firebase + AppsFlyer)

### 4. Инициализация:
- ✅ SDK инициализируются в `app/_layout.tsx` при запуске приложения

## 📋 Следующие шаги:

### 1. Добавить GoogleService-Info.plist:
- Скачайте из Firebase Console
- Поместите в `ios/DopamineDetoxSelfControl/GoogleService-Info.plist`

### 2. Обновить AppsFlyer appId:
- В `config/appsflyer.ts` замените `appId` на реальный App ID из App Store Connect

### 3. Интегрировать Adapty в онбординг:
- Используйте placement `ob_main_1` для запуска онбординга
- Отслеживайте action IDs: `allowScreenTime`, `allowRateApp`, `pw_onboarding`, `CloseOnboarding`
- Логируйте события в Firebase с event `onboarding_screen_view` и параметрами `screen_id` и `action_id`

### 4. Интегрировать Adapty в paywall:
- Используйте placements: `pw_onboarding`, `pw_main`, `pw_offer`
- `pw_offer` показывается при закрытии paywall (крестик)

## 🔧 Конфигурация Adapty:

### Placements:
- **Paywall**: `pw_onboarding`, `pw_main`, `pw_offer`
- **Onboarding**: `ob_main_1`

### Action IDs:
- `allowScreenTime` - запрос разрешения Screen Time
- `allowRateApp` - запрос оценки приложения
- `pw_onboarding` - показ paywall из онбординга
- `CloseOnboarding` - закрытие онбординга

## 📊 Firebase Events:

### onboarding_screen_view
Параметры:
- `screen_id` - ID экрана из Adapty (screen_1, screen_2, etc.)
- `action_id` - ID действия (allowScreenTime, allowRateApp, etc.)

## ⚠️ Важно:

1. **Файлы модулей восстановлены** - они критичны для работы блокировки приложений
2. После `npx expo prebuild --clean` файлы могут удалиться - нужно добавить их в Xcode проект вручную
3. Или использовать `npx expo prebuild` без `--clean` для сохранения нативных файлов

