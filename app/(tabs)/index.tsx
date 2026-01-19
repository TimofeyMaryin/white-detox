import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeDial } from '@/components/time-dial';
import { TopBar } from '@/components/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useBlocker } from '@/contexts/blocker-context';
import ScreenTimeModule from '@/modules/screen-time';
import FamilyActivityPickerModule from '@/modules/family-activity-picker';
import adaptyService from '@/services/adapty-service';
import { isWithinSchedule, getMillisecondsUntilScheduleStart, getMillisecondsUntilScheduleEnd, formatTimeUntilStart } from '@/utils/scheduleUtils';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const { state, startBlocking, stopBlocking, schedules, deleteSchedule } = useBlocker();
  const [hasPremium, setHasPremium] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<'active' | 'waiting' | 'inactive'>('inactive');
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  console.log('[DETOX_DEBUG] HomeScreen: Rendering');
  console.log('[DETOX_DEBUG] HomeScreen: schedules count:', schedules.length);
  console.log('[DETOX_DEBUG] HomeScreen: schedules:', JSON.stringify(schedules, null, 2));

  // Check if there are any active apps to block
  const hasActiveApps = schedules.some(schedule => schedule.apps.length > 0 && schedule.isActive);
  console.log('[DETOX_DEBUG] HomeScreen: hasActiveApps:', hasActiveApps);

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      try {
        // Wait a bit to ensure Adapty is initialized
        await new Promise(resolve => setTimeout(resolve, 300));
        const isPremium = await adaptyService.hasActiveSubscription();
        setHasPremium(isPremium);
      } catch (error: any) {
        // Don't log errors about undefined - Adapty might not be ready yet
        if (!error?.message?.includes('undefined') && !error?.message?.includes('getProfile')) {
          console.error('Error checking premium status:', error);
        }
      }
    };
    checkPremium();

    // Subscribe to profile updates from Adapty service
    const unsubscribe = adaptyService.onProfileUpdate(() => {
      checkPremium();
    });

    // Re-check when app becomes active (after purchase)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Check immediately, then again after a delay
        checkPremium();
        setTimeout(() => {
          checkPremium();
        }, 1000);
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);

  // Функция для применения блокировки с проверкой авторизации
  const applyBlocking = useCallback(async (schedule: typeof schedules[0]) => {
    console.log('[DETOX_DEBUG] applyBlocking: Applying blocking for schedule:', schedule.id);
    
    try {
      if (ScreenTimeModule && typeof ScreenTimeModule.isAuthorized === 'function') {
        const isAuthorized = await ScreenTimeModule.isAuthorized();
        if (!isAuthorized) {
          console.log('[DETOX_DEBUG] applyBlocking: Not authorized, skipping');
          return false;
        }

        // Load saved selection for this schedule
        if (FamilyActivityPickerModule && typeof FamilyActivityPickerModule.loadSavedSelectionForScheduleId === 'function') {
          const loadedApps = await FamilyActivityPickerModule.loadSavedSelectionForScheduleId(schedule.id);
          if (loadedApps.length === 0 && schedule.apps.length > 0) {
            console.log('[DETOX_DEBUG] applyBlocking: Tokens lost, cannot auto-block');
            return false;
          }
        }

        // Block apps
        const blocked = await ScreenTimeModule.blockApps([]);
        if (blocked) {
          console.log('[DETOX_DEBUG] applyBlocking: Apps blocked successfully');
          startBlocking();
          return true;
        }
      }
    } catch (error) {
      console.error('[DETOX_DEBUG] applyBlocking: Error:', error);
    }
    return false;
  }, [startBlocking]);

  // Функция для снятия блокировки
  const removeBlocking = useCallback(async () => {
    console.log('[DETOX_DEBUG] removeBlocking: Removing blocking');
    try {
      if (ScreenTimeModule && typeof ScreenTimeModule.unblockApps === 'function') {
        await ScreenTimeModule.unblockApps([]);
      }
      stopBlocking();
    } catch (error) {
      console.error('[DETOX_DEBUG] removeBlocking: Error:', error);
    }
  }, [stopBlocking]);

  // Проверка и управление блокировкой по расписанию
  const checkAndManageSchedule = useCallback(async () => {
    const activeSchedule = schedules.find(s => s.apps.length > 0 && s.isActive);
    
    if (!activeSchedule) {
      setScheduleStatus('inactive');
      setTimeUntilStart('');
      return;
    }

    const withinSchedule = isWithinSchedule(activeSchedule);
    console.log('[DETOX_DEBUG] checkAndManageSchedule: withinSchedule:', withinSchedule, 'isBlocking:', state.isBlocking);

    if (withinSchedule) {
      setScheduleStatus('active');
      setTimeUntilStart('');
      
      // Если мы в расписании, но блокировка не активна - включить её
      if (!state.isBlocking) {
        console.log('[DETOX_DEBUG] checkAndManageSchedule: Within schedule, starting blocking');
        await applyBlocking(activeSchedule);
      }

      // Установить таймер на окончание расписания
      const msUntilEnd = getMillisecondsUntilScheduleEnd(activeSchedule);
      if (msUntilEnd !== null && msUntilEnd > 0) {
        console.log('[DETOX_DEBUG] checkAndManageSchedule: Setting timer for end in', msUntilEnd, 'ms');
        if (scheduleTimerRef.current) {
          clearTimeout(scheduleTimerRef.current);
        }
        scheduleTimerRef.current = setTimeout(() => {
          console.log('[DETOX_DEBUG] Schedule ended, removing blocking');
          removeBlocking();
          checkAndManageSchedule(); // Перепроверить для следующего окна
        }, msUntilEnd);
      }
    } else {
      setScheduleStatus('waiting');
      
      // Если мы вне расписания, но блокировка активна - выключить её
      if (state.isBlocking) {
        console.log('[DETOX_DEBUG] checkAndManageSchedule: Outside schedule, stopping blocking');
        await removeBlocking();
      }

      // Обновить время до начала
      const formattedTime = formatTimeUntilStart(activeSchedule);
      setTimeUntilStart(formattedTime);

      // Установить таймер на начало расписания
      const msUntilStart = getMillisecondsUntilScheduleStart(activeSchedule);
      if (msUntilStart !== null && msUntilStart > 0) {
        console.log('[DETOX_DEBUG] checkAndManageSchedule: Setting timer for start in', msUntilStart, 'ms');
        if (scheduleTimerRef.current) {
          clearTimeout(scheduleTimerRef.current);
        }
        scheduleTimerRef.current = setTimeout(() => {
          console.log('[DETOX_DEBUG] Schedule started, applying blocking');
          checkAndManageSchedule();
        }, msUntilStart);
      }
    }
  }, [schedules, state.isBlocking, applyBlocking, removeBlocking]);

  // Эффект для автоматического управления блокировкой по расписанию
  useEffect(() => {
    // Проверить расписание при загрузке и при изменении расписаний
    checkAndManageSchedule();

    // Обновлять время до начала каждую минуту
    checkIntervalRef.current = setInterval(() => {
      const activeSchedule = schedules.find(s => s.apps.length > 0 && s.isActive);
      if (activeSchedule && !isWithinSchedule(activeSchedule)) {
        const formattedTime = formatTimeUntilStart(activeSchedule);
        setTimeUntilStart(formattedTime);
      }
    }, 60000);

    return () => {
      if (scheduleTimerRef.current) {
        clearTimeout(scheduleTimerRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [schedules, checkAndManageSchedule]);

  // Перепроверить расписание когда приложение выходит на передний план
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[DETOX_DEBUG] App became active, checking schedule');
        checkAndManageSchedule();
      }
    });

    return () => subscription.remove();
  }, [checkAndManageSchedule]);

  const handleStartBlocking = async () => {
    console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: Called');
    console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: hasActiveApps:', hasActiveApps);
    console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: schedules:', JSON.stringify(schedules, null, 2));
    
    // Check if there are active apps to block
    if (!hasActiveApps) {
      console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: No active apps, showing alert');
      Alert.alert(
        'No Apps Selected',
        'Please create a blocking schedule with at least one app before starting the timer.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get the active schedule
    const activeSchedule = schedules.find(s => s.apps.length > 0 && s.isActive);
    console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: activeSchedule:', JSON.stringify(activeSchedule, null, 2));
    if (!activeSchedule) {
      console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: No active schedule found');
      Alert.alert(
        'No Active Schedule',
        'Please create an active schedule with apps to block.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Проверяем, попадает ли текущее время в расписание
    const withinSchedule = isWithinSchedule(activeSchedule);
    console.log('[DETOX_DEBUG] HomeScreen.handleStartBlocking: withinSchedule:', withinSchedule);
    
    if (!withinSchedule) {
      const timeUntil = formatTimeUntilStart(activeSchedule);
      Alert.alert(
        'Outside Schedule Time',
        `Blocking is scheduled for ${activeSchedule.startTime} - ${activeSchedule.endTime}.\n\nThe blocking will automatically start when the scheduled time begins${timeUntil ? ` (in ${timeUntil})` : ''}.`,
        [
          { text: 'OK' },
          {
            text: 'Start Anyway',
            onPress: () => startBlockingImmediately(activeSchedule),
          },
        ]
      );
      return;
    }

    await startBlockingImmediately(activeSchedule);
  };

  const startBlockingImmediately = async (activeSchedule: typeof schedules[0]) => {
    try {
      // Check if native module is available
      if (ScreenTimeModule && typeof ScreenTimeModule.isAuthorized === 'function') {
        console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Checking authorization');
        const isAuthorized = await ScreenTimeModule.isAuthorized();
        console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: isAuthorized:', isAuthorized);
        if (!isAuthorized) {
          // Request authorization
          console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Requesting authorization');
          const authorized = await ScreenTimeModule.requestAuthorization();
          console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Authorization result:', authorized);
          if (!authorized) {
            Alert.alert(
              'Authorization Required',
              'Screen Time authorization is required to block apps. Please grant permission in Settings.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        // First, try to load the saved selection for this schedule
        // This restores the globalActivitySelection from cached storage
        let loadedApps: string[] = [];
        if (FamilyActivityPickerModule && typeof FamilyActivityPickerModule.loadSavedSelectionForScheduleId === 'function') {
          try {
            console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Loading saved selection for schedule:', activeSchedule.id);
            loadedApps = await FamilyActivityPickerModule.loadSavedSelectionForScheduleId(activeSchedule.id);
            console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Loaded apps:', loadedApps);
          } catch (loadError) {
            console.warn('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Could not load saved selection:', loadError);
          }
        }

        // Check if tokens were lost after app restart
        // schedule.apps has identifiers but native tokens are gone
        console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: activeSchedule.apps.length:', activeSchedule.apps.length, 'loadedApps.length:', loadedApps.length);
        if (activeSchedule.apps.length > 0 && loadedApps.length === 0) {
          console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Tokens lost after restart, showing alert');
          Alert.alert(
            'Apps Need Re-selection',
            'Due to iOS security restrictions, app tokens are lost after app restart. Please re-select the apps you want to block.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Select Apps',
                onPress: () => {
                  router.push(`/modal?type=schedule&scheduleId=${activeSchedule.id}`);
                },
              },
            ]
          );
          return;
        }

        // Block apps using ScreenTime API
        // The selection is now loaded into globalActivitySelection
        console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Calling ScreenTimeModule.blockApps');
        const blocked = await ScreenTimeModule.blockApps([]);
        console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: blockApps result:', blocked);
        
        if (!blocked) {
          console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Blocking failed');
          Alert.alert(
            'Blocking Failed',
            'Could not block apps. Please make sure you have selected apps in your schedule.',
            [
              { text: 'OK' },
              {
                text: 'Select Apps',
                onPress: () => {
                  router.push(`/modal?type=schedule&scheduleId=${activeSchedule.id}`);
                },
              },
            ]
          );
          return;
        }
      }
      
      // Start blocking state
      console.log('[DETOX_DEBUG] HomeScreen.startBlockingImmediately: Starting blocking state');
      startBlocking();
    } catch (error: any) {
      console.error('Error starting blocking:', error);
      
      // Handle specific error cases
      if (error?.code === 'NOT_AUTHORIZED') {
        Alert.alert(
          'Authorization Required',
          'Screen Time authorization is required to block apps. Please grant permission in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (error?.code === 'NO_SELECTION' || error?.message?.includes('No apps selected')) {
        Alert.alert(
          'No Apps Selected',
          'Please select apps in your schedule before starting blocking. The app selection needs to be recent.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Select Apps',
              onPress: () => {
                if (schedules.length > 0) {
                  router.push(`/modal?type=schedule&scheduleId=${schedules[0].id}`);
                } else {
                  router.push('/modal?type=schedule');
                }
              },
            },
          ]
        );
        return;
      }
      
      // For development: continue with blocking even if Screen Time API is not available
      if (__DEV__) {
        console.warn('Continuing with blocking state only (Screen Time API not available)');
        startBlocking();
      } else {
        Alert.alert(
          'Blocking Failed',
          'Unable to start blocking. Please try again or check if Screen Time is properly configured.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleStopBlocking = async () => {
    Alert.alert(
      'Stop Blocking',
      'Do you want to stop blocking apps?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              if (ScreenTimeModule && typeof ScreenTimeModule.unblockApps === 'function') {
                await ScreenTimeModule.unblockApps([]);
              }
            } catch (error) {
              console.error('Error unblocking apps:', error);
            }
            stopBlocking();
          },
        },
      ]
    );
  };

  const handlePremiumPress = () => {
    router.push({
      pathname: '/paywall',
      params: { placement: 'pw_main' },
    });
  };

  return (
    <ThemedView style={styles.container}>
      {!hasPremium && <TopBar onPremiumPress={handlePremiumPress} />}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* Time Dial */}
        <TimeDial savedTime={state.savedTime} />

        {/* Control Buttons - Only shown when blocking is active */}
        {state.isBlocking && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStopBlocking}
            >
              <IconSymbol name="stop.fill" size={24} color="#000" />
              <ThemedText style={styles.buttonText}>Stop</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Management - Only one schedule allowed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Blocking Schedule</ThemedText>
            {schedules.length === 0 ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/modal?type=schedule')}
              >
                <IconSymbol name="plus.circle.fill" size={24} color={Colors.dark.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push(`/modal?type=schedule&scheduleId=${schedules[0].id}`)}
              >
                <IconSymbol name="pencil.circle.fill" size={24} color={Colors.dark.primary} />
              </TouchableOpacity>
            )}
          </View>
          <ThemedText style={styles.sectionDescription}>
            Create a schedule to automatically block specific apps at scheduled times
          </ThemedText>
          {schedules.length > 0 ? (
            schedules.slice(0, 1).map((schedule) => (
              <View key={schedule.id} style={styles.scheduleCard}>
                <TouchableOpacity
                  style={styles.scheduleItem}
                  onPress={() => router.push(`/modal?type=schedule&scheduleId=${schedule.id}`)}
                >
                  <View style={styles.scheduleItemContent}>
                    <ThemedText style={styles.scheduleName}>{schedule.name}</ThemedText>
                    <ThemedText style={styles.scheduleTime}>
                      {schedule.startTime} - {schedule.endTime}
                    </ThemedText>
                    {schedule.daysOfWeek.length > 0 && (
                      <ThemedText style={styles.scheduleDays}>
                        {schedule.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                      </ThemedText>
                    )}
                    {schedule.apps.length > 0 ? (
                      <ThemedText style={styles.scheduleApps}>
                        {schedule.apps.length} app{schedule.apps.length !== 1 ? 's' : ''} selected
                      </ThemedText>
                    ) : (
                      <ThemedText style={styles.scheduleAppsWarning}>
                        No apps selected - please add apps to enable blocking
                      </ThemedText>
                    )}
                    {/* Статус расписания */}
                    {schedule.apps.length > 0 && !state.isBlocking && (
                      <View style={styles.scheduleStatusContainer}>
                        {scheduleStatus === 'active' ? (
                          <View style={styles.scheduleStatusBadge}>
                            <View style={[styles.statusDot, styles.statusDotActive]} />
                            <ThemedText style={styles.scheduleStatusText}>
                              Schedule active now
                            </ThemedText>
                          </View>
                        ) : scheduleStatus === 'waiting' && timeUntilStart ? (
                          <View style={styles.scheduleStatusBadge}>
                            <View style={[styles.statusDot, styles.statusDotWaiting]} />
                            <ThemedText style={styles.scheduleStatusText}>
                              Starts in {timeUntilStart}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        'Delete Schedule',
                        `Are you sure you want to delete "${schedule.name}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              // Остановить таймер и разблокировать приложения, если блокировка активна
                              if (state.isBlocking) {
                                try {
                                  if (ScreenTimeModule && typeof ScreenTimeModule.clearAllBlockingSettings === 'function') {
                                    await ScreenTimeModule.clearAllBlockingSettings();
                                  }
                                } catch (error) {
                                  console.error('Error clearing blocking settings:', error);
                                }
                                stopBlocking();
                              }
                              deleteSchedule(schedule.id);
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <IconSymbol name="trash.fill" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </TouchableOpacity>
                
                {/* Play button to start blocking */}
                {!state.isBlocking && (
                  <TouchableOpacity
                    style={[styles.playButton, schedule.apps.length === 0 && styles.playButtonDisabled]}
                    onPress={handleStartBlocking}
                    disabled={schedule.apps.length === 0}
                  >
                    <IconSymbol name="play.fill" size={20} color="#000" />
                    <ThemedText style={styles.playButtonText}>Start Blocking</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyState}>No schedule created yet. Tap + to create one.</ThemedText>
          )}
        </View>
      </ScrollView>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  controls: {
    gap: 12,
    marginVertical: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: Colors.dark.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  addButton: {
    padding: 4,
  },
  scheduleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  scheduleItemContent: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  scheduleDays: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  scheduleApps: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    color: Colors.dark.primary,
  },
  scheduleAppsWarning: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    color: '#FF3B30',
  },
  emptyState: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  scheduleStatusContainer: {
    marginTop: 8,
  },
  scheduleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: Colors.dark.primary,
  },
  statusDotWaiting: {
    backgroundColor: '#FF9500',
  },
  scheduleStatusText: {
    fontSize: 12,
    opacity: 0.8,
  },
});
