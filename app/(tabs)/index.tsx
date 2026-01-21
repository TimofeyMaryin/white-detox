/**
 * Home Screen
 *
 * Main screen with blocking timer and schedule cards.
 * Supports multiple simultaneous schedules with waiting mode.
 *
 * @module app/(tabs)/index
 */

import { router } from 'expo-router';
import React, { useCallback } from 'react';
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
    scheduleUpdatedAt,
    startSchedule,
    stopSchedule,
    deleteSchedule,
    isScheduleActive,
    isScheduleWaiting,
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

  const handleStopSchedule = useCallback((schedule: BlockerSchedule) => {
    const isActive = isScheduleActive(schedule.id);
    const isWaiting = isScheduleWaiting(schedule.id);
    
    const title = isActive ? 'Stop Blocking' : 'Cancel Schedule';
    const message = isActive 
      ? 'Do you want to stop blocking apps for this schedule?' 
      : 'Do you want to cancel this waiting schedule?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isActive ? 'Stop' : 'Cancel Schedule',
        style: 'destructive',
        onPress: () => stopSchedule(schedule.id),
      },
    ]);
  }, [isScheduleActive, isScheduleWaiting, stopSchedule]);

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

  const handleStartSchedule = useCallback(
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
        }
        await startSchedule(schedule.id);
      } catch (error) {
        console.error('[HomeScreen] Error starting schedule:', error);
        if (__DEV__) {
          await startSchedule(schedule.id);
        } else {
          Alert.alert('Failed', 'Unable to start schedule.', [{ text: 'OK' }]);
        }
      }
    },
    [authorizationStatus, requestAuthorization, startSchedule]
  );

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
            Tap play to start. Auto-stops when time ends.
          </ThemedText>

          {schedules.length > 0 ? (
            schedules.map((schedule) => {
              const hasApps = Boolean(schedule.familyActivitySelectionId);
              const isActive = isScheduleActive(schedule.id);
              const isWaiting = isScheduleWaiting(schedule.id);
              const isRunning = isActive || isWaiting;

              return (
                <View key={schedule.id} style={[
                  styles.scheduleCard, 
                  isActive && styles.scheduleCardActive,
                  isWaiting && styles.scheduleCardWaiting
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
                        {isActive && (
                          <View style={styles.statusBadge}>
                            <ThemedText style={styles.statusBadgeText}>BLOCKING</ThemedText>
                          </View>
                        )}
                        {isWaiting && (
                          <View style={[styles.statusBadge, styles.statusBadgeWaiting]}>
                            <ThemedText style={styles.statusBadgeTextWaiting}>WAITING</ThemedText>
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
                          key={`icons-${schedule.id}-${scheduleUpdatedAt}`}
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
                  {isRunning ? (
                    <TouchableOpacity
                      style={isActive ? styles.stopCardButton : styles.cancelCardButton}
                      onPress={() => handleStopSchedule(schedule)}
                    >
                      <IconSymbol name="stop.fill" size={20} color="#000" />
                      <ThemedText style={styles.playButtonText}>
                        {isActive ? 'Stop Blocking' : 'Cancel'}
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.playButton, !hasApps && styles.playButtonDisabled]}
                      onPress={() => handleStartSchedule(schedule)}
                      disabled={!hasApps}
                    >
                      <IconSymbol name="play.fill" size={20} color="#000" />
                      <ThemedText style={styles.playButtonText}>Start</ThemedText>
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
  scheduleCardWaiting: {
    borderColor: '#FFB800',
    borderWidth: 2,
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
  statusBadgeWaiting: {
    backgroundColor: '#FFB800',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  statusBadgeTextWaiting: {
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
  cancelCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB800',
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
});
