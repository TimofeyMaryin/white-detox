/**
 * Home Screen
 *
 * Main screen with blocking timer and schedule cards.
 * Schedules auto-activate when app is open and time matches.
 *
 * @module app/(tabs)/index
 */

import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AuthorizationStatus } from 'react-native-device-activity';

import { SelectedAppsIcons } from '@/components/selected-apps-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeDial } from '@/components/time-dial';
import { TopBar } from '@/components/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useBlocker } from '@/contexts/blocker-context';
import { usePremium } from '@/hooks/use-premium';
import deviceActivityService from '@/services/device-activity.service';
import { BlockerSchedule, DAY_NAMES } from '@/types/blocker';

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

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const handlePremiumPress = useCallback(() => {
    router.push({
      pathname: '/paywall',
      params: { placement: 'pw_main' },
    });
  }, []);

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
      Alert.alert('Delete Schedule', 'Are you sure you want to delete this schedule?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSchedule(schedule.id),
        },
      ]);
    },
    [deleteSchedule]
  );

  const handleStartBlockingSchedule = useCallback(
    async (schedule: BlockerSchedule) => {
      if (!schedule.familyActivitySelectionId) {
        Alert.alert('No Apps Selected', 'Please select apps to block first.', [{ text: 'OK' }]);
        return;
      }

      try {
        if (Platform.OS === 'ios' && deviceActivityService.isAvailable()) {
          if (authorizationStatus !== AuthorizationStatus.approved) {
            await requestAuthorization();
            const newStatus = deviceActivityService.getAuthorizationStatus();
            if (newStatus !== AuthorizationStatus.approved) {
              Alert.alert('Authorization Required', 'Screen Time authorization is required.', [
                { text: 'OK' },
              ]);
              return;
            }
          }
          deviceActivityService.blockApps(schedule.familyActivitySelectionId);
        }
        startBlocking(schedule.id);
      } catch (error) {
        console.error('[HomeScreen] Error starting blocking:', error);
        if (__DEV__) {
          startBlocking(schedule.id);
        } else {
          Alert.alert('Blocking Failed', 'Unable to start blocking.', [{ text: 'OK' }]);
        }
      }
    },
    [authorizationStatus, requestAuthorization, startBlocking]
  );

  // --------------------------------------------------------------------------
  // Render Helpers
  // --------------------------------------------------------------------------

  /**
   * Check if schedule should be active right now
   */
  const getScheduleStatus = useCallback((schedule: BlockerSchedule): 'active' | 'waiting' | 'inactive' => {
    if (!schedule.isActive || !schedule.familyActivitySelectionId) {
      return 'inactive';
    }

    const now = new Date();
    const today = now.getDay();
    
    // Check if today is in schedule's days
    if (!schedule.daysOfWeek.includes(today)) {
      return 'waiting';
    }

    // Parse times
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight (e.g., 22:00 - 06:00)
    if (startMinutes > endMinutes) {
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        return 'active';
      }
    } else {
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return 'active';
      }
    }

    return 'waiting';
  }, []);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <ThemedView style={styles.container}>
      {!hasPremium && <TopBar onPremiumPress={handlePremiumPress} />}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Timer Display */}
        <TimeDial savedTime={state.savedTime} />

        {/* Schedule Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Blocking Schedules</ThemedText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/modal?type=schedule')}
            >
              <IconSymbol name="plus.circle.fill" size={24} color={Colors.dark.primary} />
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.sectionDescription}>
            Schedules auto-activate while app is open
          </ThemedText>

          {schedules.length > 0 ? (
            schedules.map((schedule) => {
              const hasApps = Boolean(schedule.familyActivitySelectionId);
              const isCurrentlyBlocking = state.isBlocking && state.currentScheduleId === schedule.id;
              const scheduleStatus = getScheduleStatus(schedule);
              const isScheduleActive = scheduleStatus === 'active';

              return (
                <View key={schedule.id} style={[
                  styles.scheduleCard, 
                  isCurrentlyBlocking && styles.scheduleCardActive,
                  isScheduleActive && !isCurrentlyBlocking && styles.scheduleCardScheduled
                ]}>
                  <TouchableOpacity
                    style={styles.scheduleItem}
                    onPress={() => router.push(`/modal?type=schedule&scheduleId=${schedule.id}`)}
                  >
                    <View style={styles.scheduleItemContent}>
                      <View style={styles.scheduleHeader}>
                        <ThemedText style={styles.scheduleTime}>
                          {schedule.startTime} - {schedule.endTime}
                        </ThemedText>
                        {isCurrentlyBlocking && (
                          <View style={styles.statusBadge}>
                            <ThemedText style={styles.statusBadgeText}>ACTIVE</ThemedText>
                          </View>
                        )}
                        {isScheduleActive && !isCurrentlyBlocking && (
                          <View style={[styles.statusBadge, styles.statusBadgeScheduled]}>
                            <ThemedText style={styles.statusBadgeTextScheduled}>SCHEDULED</ThemedText>
                          </View>
                        )}
                      </View>
                      {schedule.daysOfWeek.length > 0 && (
                        <ThemedText style={styles.scheduleDays}>
                          {schedule.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ')}
                        </ThemedText>
                      )}
                      {hasApps ? (
                        <SelectedAppsIcons
                          familyActivitySelectionId={schedule.familyActivitySelectionId}
                          iconSize={36}
                          maxIcons={5}
                          height={44}
                        />
                      ) : (
                        <ThemedText style={styles.scheduleAppsWarning}>
                          No apps selected
                        </ThemedText>
                      )}
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

                  {/* Start/Stop Button */}
                  {isCurrentlyBlocking ? (
                    <TouchableOpacity
                      style={styles.stopCardButton}
                      onPress={handleStopBlocking}
                    >
                      <IconSymbol name="stop.fill" size={20} color="#000" />
                      <ThemedText style={styles.playButtonText}>Stop Blocking</ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.playButton, (!hasApps || state.isBlocking) && styles.playButtonDisabled]}
                      onPress={() => handleStartBlockingSchedule(schedule)}
                      disabled={!hasApps || state.isBlocking}
                    >
                      <IconSymbol name="play.fill" size={20} color="#000" />
                      <ThemedText style={styles.playButtonText}>
                        {isScheduleActive ? 'Start Now' : 'Start Blocking'}
                      </ThemedText>
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
  section: {
    marginTop: 10,
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
  scheduleCardActive: {
    borderColor: Colors.dark.primary,
    borderWidth: 2,
  },
  scheduleCardScheduled: {
    borderColor: '#FFB800',
    borderWidth: 1,
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
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeScheduled: {
    backgroundColor: '#FFB800',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  statusBadgeTextScheduled: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  scheduleDays: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
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
  stopCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
});
