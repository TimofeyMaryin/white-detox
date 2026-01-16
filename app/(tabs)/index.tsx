import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeDial } from '@/components/time-dial';
import { TopBar } from '@/components/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useBlocker } from '@/hooks/use-blocker';
import ScreenTimeModule from '@/modules/screen-time';
import adaptyService from '@/services/adapty-service';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const { state, startBlocking, stopBlocking, pauseBlocking, resumeBlocking, toggleGrayscale, schedules, deleteSchedule } = useBlocker();
  const [hasPremium, setHasPremium] = useState(false);

  // Check if there are any active apps to block
  const hasActiveApps = schedules.some(schedule => schedule.apps.length > 0 && schedule.isActive);

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

  const handleStartBlocking = async () => {
    // Check if there are active apps to block
    if (!hasActiveApps) {
      Alert.alert(
        'No Apps Selected',
        'Please create a blocking schedule with at least one app before starting the timer.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Check if native module is available
      if (ScreenTimeModule && typeof ScreenTimeModule.isAuthorized === 'function') {
        const isAuthorized = await ScreenTimeModule.isAuthorized();
        if (!isAuthorized) {
          // Request authorization
          const authorized = await ScreenTimeModule.requestAuthorization();
          if (!authorized) {
            Alert.alert(
              'Authorization Required',
              'Screen Time authorization is required to block apps. Please grant permission in Settings.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        // Block apps using ScreenTime API
        // Note: blockApps() uses globalActivitySelection which is set when user selects apps via FamilyActivityPicker
        // The parameter is not used but required for the method signature
        const blocked = await ScreenTimeModule.blockApps([]);
        
        if (!blocked) {
          Alert.alert(
            'Blocking Failed',
            'Could not block apps. Please make sure you have selected apps in your schedule recently.',
            [
              { text: 'OK' },
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
      }
      
      // Start blocking state
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
      'Do you want to stop blocking apps? You can enable grayscale mode to keep apps in black and white.',
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
            
            if (hasActiveApps) {
              setTimeout(() => {
                Alert.alert(
                  'Grayscale Mode',
                  'Enable grayscale mode to make apps appear in black and white?',
                  [
                    { text: 'Skip', style: 'cancel' },
                    {
                      text: 'Enable',
                      onPress: () => toggleGrayscale(),
                    },
                  ]
                );
              }, 300);
            }
          },
        },
      ]
    );
  };

  const handlePause = () => {
    pauseBlocking();
  };

  const handleResume = () => {
    resumeBlocking();
  };

  const handleTemporaryUnlock = async () => {
    Alert.alert(
      'Temporary Unlock',
      'Do you want to temporarily unlock apps? You can enable grayscale mode to make apps appear in black and white.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            try {
              if (ScreenTimeModule && typeof ScreenTimeModule.unblockApps === 'function') {
                await ScreenTimeModule.unblockApps([]);
              }
              pauseBlocking();
              
              // Show grayscale option after unlock
              setTimeout(() => {
                Alert.alert(
                  'Grayscale Mode',
                  'Enable grayscale mode to make unblocked apps appear in black and white?',
                  [
                    { text: 'Skip', style: 'cancel' },
                    {
                      text: 'Enable',
                      onPress: () => toggleGrayscale(),
                    },
                  ]
                );
              }, 300);
            } catch (error) {
              console.error('Error unlocking apps:', error);
              pauseBlocking();
            }
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
            {state.isPaused ? (
              <TouchableOpacity
                style={[styles.button, styles.resumeButton]}
                onPress={handleResume}
              >
                <IconSymbol name="play.fill" size={24} color="#000" />
                <ThemedText style={styles.buttonText}>Resume</ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.pauseButton]}
                  onPress={handlePause}
                >
                  <IconSymbol name="pause.fill" size={24} color="#000" />
                  <ThemedText style={styles.buttonText}>Pause</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.unlockButton]}
                  onPress={handleTemporaryUnlock}
                >
                  <IconSymbol name="lock.open.fill" size={24} color="#000" />
                  <ThemedText style={styles.buttonText}>Temporary Unlock</ThemedText>
                </TouchableOpacity>
              </>
            )}
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
                            onPress: () => deleteSchedule(schedule.id),
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
  pauseButton: {
    backgroundColor: '#FFA500',
  },
  resumeButton: {
    backgroundColor: Colors.dark.primary,
  },
  unlockButton: {
    backgroundColor: '#4CAF50',
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
});
