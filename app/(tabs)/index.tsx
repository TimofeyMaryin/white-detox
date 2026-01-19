/**
 * Home Screen
 *
 * Main screen displaying the blocking timer and schedule management.
 *
 * @module app/(tabs)/index
 */

import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeDial } from '@/components/time-dial';
import { TopBar } from '@/components/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useBlocker } from '@/contexts/blocker-context';
import { usePremium } from '@/hooks/use-premium';
import { useScheduleStatus } from '@/hooks/use-schedule-status';
import deviceActivityService from '@/services/device-activity.service';
import { BlockerSchedule, DAY_NAMES } from '@/types/blocker';
import { AuthorizationStatus } from 'react-native-device-activity';

// ============================================================================
// Main Component
// ============================================================================

export default function HomeScreen() {
  const {
    state,
    schedules,
    startBlocking,
    stopBlocking,
    deleteSchedule,
    authorizationStatus,
    requestAuthorization,
  } = useBlocker();

  const { hasPremium } = usePremium();
  const activeSchedule = schedules.find(
    (s) => (s.familyActivitySelectionId || s.apps?.length) && s.isActive
  );
  const { status: scheduleStatus, timeUntilStart } = useScheduleStatus(activeSchedule);

  // Check if there are any active apps to block
  const hasActiveApps = Boolean(activeSchedule);

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const handlePremiumPress = useCallback(() => {
    router.push({
      pathname: '/paywall',
      params: { placement: 'pw_main' },
    });
  }, []);

  const handleStartBlocking = useCallback(async () => {
    if (!hasActiveApps || !activeSchedule) {
      Alert.alert(
        'No Apps Selected',
        'Please create a blocking schedule with at least one app before starting the timer.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if we're within schedule time
    const { isWithinSchedule, formatTimeUntilStart } = await import('@/utils/scheduleUtils');
    const withinSchedule = isWithinSchedule(activeSchedule);

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
  }, [hasActiveApps, activeSchedule]);

  const startBlockingImmediately = async (schedule: BlockerSchedule) => {
    try {
      if (Platform.OS === 'ios' && deviceActivityService.isAvailable()) {
        // Check authorization
        if (authorizationStatus !== AuthorizationStatus.approved) {
          await requestAuthorization();

          const newStatus = deviceActivityService.getAuthorizationStatus();
          if (newStatus !== AuthorizationStatus.approved) {
            Alert.alert(
              'Authorization Required',
              'Screen Time authorization is required to block apps. Please grant permission in Settings.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        // Check if we have a selection
        if (!schedule.familyActivitySelectionId) {
          Alert.alert(
            'No Apps Selected',
            'Please select apps in your schedule before starting blocking.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Select Apps',
                onPress: () => router.push(`/modal?type=schedule&scheduleId=${schedule.id}`),
              },
            ]
          );
          return;
        }

        // Block apps
        deviceActivityService.blockApps(schedule.familyActivitySelectionId);
      }

      startBlocking(schedule.id);
    } catch (error: any) {
      console.error('[HomeScreen] Error starting blocking:', error);

      if (__DEV__) {
        console.warn('Continuing with blocking state only (Screen Time API not available)');
        startBlocking(schedule.id);
      } else {
        Alert.alert(
          'Blocking Failed',
          'Unable to start blocking. Please try again or check if Screen Time is properly configured.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleStopBlocking = useCallback(() => {
    Alert.alert('Stop Blocking', 'Do you want to stop blocking apps?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            if (Platform.OS === 'ios' && deviceActivityService.isAvailable()) {
              deviceActivityService.unblockAllApps();
            }
          } catch (error) {
            console.error('[HomeScreen] Error unblocking:', error);
          }
          stopBlocking();
        },
      },
    ]);
  }, [stopBlocking]);

  const handleDeleteSchedule = useCallback(
    (schedule: BlockerSchedule) => {
      Alert.alert('Delete Schedule', `Are you sure you want to delete "${schedule.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (state.isBlocking) {
              try {
                if (Platform.OS === 'ios' && deviceActivityService.isAvailable()) {
                  deviceActivityService.unblockAllApps();
                }
              } catch (error) {
                console.error('[HomeScreen] Error clearing blocks:', error);
              }
              stopBlocking();
            }
            deleteSchedule(schedule.id);
          },
        },
      ]);
    },
    [state.isBlocking, stopBlocking, deleteSchedule]
  );

  // --------------------------------------------------------------------------
  // Render Helpers
  // --------------------------------------------------------------------------

  const getAppCount = (schedule: BlockerSchedule): string | null => {
    if (schedule.familyActivitySelectionId) {
      return 'Apps selected';
    }
    if (schedule.apps?.length) {
      return `${schedule.apps.length} app${schedule.apps.length !== 1 ? 's' : ''} selected`;
    }
    return null;
  };

  const renderScheduleStatus = (schedule: BlockerSchedule) => {
    const hasApps = Boolean(schedule.familyActivitySelectionId || schedule.apps?.length);

    if (!hasApps || state.isBlocking) return null;

    if (scheduleStatus === 'active') {
      return (
        <View style={styles.scheduleStatusContainer}>
          <View style={styles.scheduleStatusBadge}>
            <View style={[styles.statusDot, styles.statusDotActive]} />
            <ThemedText style={styles.scheduleStatusText}>Schedule active now</ThemedText>
          </View>
        </View>
      );
    }

    if (scheduleStatus === 'waiting' && timeUntilStart) {
      return (
        <View style={styles.scheduleStatusContainer}>
          <View style={styles.scheduleStatusBadge}>
            <View style={[styles.statusDot, styles.statusDotWaiting]} />
            <ThemedText style={styles.scheduleStatusText}>Starts in {timeUntilStart}</ThemedText>
          </View>
        </View>
      );
    }

    return null;
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <ThemedView style={styles.container}>
      {!hasPremium && <TopBar onPremiumPress={handlePremiumPress} />}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Timer Display */}
        <TimeDial savedTime={state.savedTime} />

        {/* Stop Button (when blocking) */}
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

        {/* Schedule Section */}
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
            schedules.slice(0, 1).map((schedule) => {
              const appCount = getAppCount(schedule);
              const hasApps = Boolean(
                schedule.familyActivitySelectionId || schedule.apps?.length
              );

              return (
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
                          {schedule.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ')}
                        </ThemedText>
                      )}
                      {appCount ? (
                        <ThemedText style={styles.scheduleApps}>{appCount}</ThemedText>
                      ) : (
                        <ThemedText style={styles.scheduleAppsWarning}>
                          No apps selected - please add apps to enable blocking
                        </ThemedText>
                      )}
                      {renderScheduleStatus(schedule)}
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(schedule);
                      }}
                    >
                      <IconSymbol name="trash.fill" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Start Button */}
                  {!state.isBlocking && (
                    <TouchableOpacity
                      style={[styles.playButton, !hasApps && styles.playButtonDisabled]}
                      onPress={handleStartBlocking}
                      disabled={!hasApps}
                    >
                      <IconSymbol name="play.fill" size={20} color="#000" />
                      <ThemedText style={styles.playButtonText}>Start Blocking</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <ThemedText style={styles.emptyState}>
              No schedule created yet. Tap + to create one.
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// ============================================================================
// Styles
// ============================================================================

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
