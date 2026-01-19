/**
 * Device Activity Service
 *
 * Centralized service for managing iOS Screen Time / Family Controls API.
 * Handles app blocking, schedule monitoring, and authorization.
 *
 * @module services/device-activity
 */

import { Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';
import type { BlockerSchedule } from '@/types/blocker';

/** Callback names for DeviceActivity monitor events */
export const ACTIVITY_CALLBACKS = {
  INTERVAL_START: 'intervalDidStart',
  INTERVAL_END: 'intervalDidEnd',
} as const;

/**
 * Parses time string (HH:mm) to DateComponents for DeviceActivity API
 *
 * @param time - Time string in HH:mm format
 * @param weekday - Optional day of week (0-6, where 0 is Sunday)
 * @returns DateComponents object for DeviceActivity API
 */
export function parseTimeToDateComponents(
  time: string,
  weekday?: number
): DeviceActivity.DateComponents {
  const [hour, minute] = time.split(':').map(Number);
  const components: DeviceActivity.DateComponents = { hour, minute };

  if (weekday !== undefined) {
    // Apple uses 1 = Sunday, 2 = Monday, etc. (our format: 0 = Sunday)
    components.weekday = weekday + 1;
  }

  return components;
}

/**
 * Generates activity name for a specific schedule and day
 *
 * @param scheduleId - Unique schedule identifier
 * @param weekday - Day of week (0-6)
 * @returns Formatted activity name
 */
export function getActivityName(scheduleId: string, weekday: number): string {
  return `${scheduleId}_day_${weekday}`;
}

class DeviceActivityService {
  /**
   * Check if DeviceActivity API is available on this device
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && DeviceActivity.isAvailable();
  }

  /**
   * Get current authorization status
   */
  getAuthorizationStatus(): DeviceActivity.AuthorizationStatusType {
    if (!this.isAvailable()) {
      return DeviceActivity.AuthorizationStatus.notDetermined;
    }
    return DeviceActivity.getAuthorizationStatus();
  }

  /**
   * Request authorization for Screen Time access
   */
  async requestAuthorization(): Promise<DeviceActivity.AuthorizationStatusType> {
    if (!this.isAvailable()) {
      return DeviceActivity.AuthorizationStatus.notDetermined;
    }

    try {
      await DeviceActivity.requestAuthorization('individual');
      return this.getAuthorizationStatus();
    } catch (error) {
      console.error('[DeviceActivityService] Error requesting authorization:', error);
      return DeviceActivity.AuthorizationStatus.denied;
    }
  }

  /**
   * Block apps by selection ID
   *
   * @param familyActivitySelectionId - ID of the saved app selection
   */
  blockApps(familyActivitySelectionId: string): void {
    if (!this.isAvailable()) return;

    try {
      DeviceActivity.blockSelection({ activitySelectionId: familyActivitySelectionId });
      console.log('[DeviceActivityService] Blocked selection:', familyActivitySelectionId);
    } catch (error) {
      console.error('[DeviceActivityService] Error blocking apps:', error);
      throw error;
    }
  }

  /**
   * Remove all app blocks
   */
  unblockAllApps(): void {
    if (!this.isAvailable()) return;

    try {
      DeviceActivity.resetBlocks();
      console.log('[DeviceActivityService] Reset all blocks');
    } catch (error) {
      console.error('[DeviceActivityService] Error resetting blocks:', error);
      throw error;
    }
  }

  /**
   * Start monitoring a schedule for a specific day of the week
   *
   * @param schedule - The blocking schedule
   * @param weekday - Day of week to monitor (0-6)
   */
  async startMonitoringForDay(schedule: BlockerSchedule, weekday: number): Promise<void> {
    if (!this.isAvailable() || !schedule.familyActivitySelectionId) return;

    const activityName = getActivityName(schedule.id, weekday);
    const startComponents = parseTimeToDateComponents(schedule.startTime, weekday);
    const endComponents = parseTimeToDateComponents(schedule.endTime, weekday);

    // Configure action to block apps when interval starts
    DeviceActivity.configureActions({
      activityName,
      callbackName: ACTIVITY_CALLBACKS.INTERVAL_START,
      actions: [
        {
          type: 'blockSelection',
          familyActivitySelectionId: schedule.familyActivitySelectionId,
        },
      ],
    });

    // Configure action to unblock apps when interval ends
    DeviceActivity.configureActions({
      activityName,
      callbackName: ACTIVITY_CALLBACKS.INTERVAL_END,
      actions: [
        {
          type: 'unblockSelection',
          familyActivitySelectionId: schedule.familyActivitySelectionId,
        },
      ],
    });

    // Start the monitor
    await DeviceActivity.startMonitoring(
      activityName,
      {
        intervalStart: startComponents,
        intervalEnd: endComponents,
        repeats: true,
      },
      []
    );

    console.log('[DeviceActivityService] Started monitoring:', activityName);
  }

  /**
   * Start monitoring for all days in a schedule
   *
   * @param schedule - The blocking schedule to monitor
   */
  async startMonitoring(schedule: BlockerSchedule): Promise<void> {
    if (!this.isAvailable()) return;
    if (!schedule.familyActivitySelectionId || schedule.daysOfWeek.length === 0) return;

    try {
      for (const weekday of schedule.daysOfWeek) {
        await this.startMonitoringForDay(schedule, weekday);
      }
    } catch (error) {
      console.error('[DeviceActivityService] Error starting monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring for specific days
   *
   * @param scheduleId - Schedule ID
   * @param daysOfWeek - Array of days to stop monitoring
   */
  stopMonitoring(scheduleId: string, daysOfWeek: number[]): void {
    if (!this.isAvailable()) return;

    try {
      const activityNames = daysOfWeek.map((day) => getActivityName(scheduleId, day));
      DeviceActivity.stopMonitoring(activityNames);

      // Clean up configurations
      for (const activityName of activityNames) {
        DeviceActivity.cleanUpAfterActivity(activityName);
      }

      console.log('[DeviceActivityService] Stopped monitoring:', activityNames);
    } catch (error) {
      console.error('[DeviceActivityService] Error stopping monitoring:', error);
      throw error;
    }
  }

  /**
   * Update monitoring for a schedule (stops old, starts new)
   *
   * @param oldSchedule - Previous schedule configuration
   * @param newSchedule - Updated schedule configuration
   */
  async updateMonitoring(
    oldSchedule: BlockerSchedule,
    newSchedule: BlockerSchedule
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Stop old monitoring
      this.stopMonitoring(oldSchedule.id, oldSchedule.daysOfWeek);

      // Start new monitoring if active
      if (newSchedule.isActive && newSchedule.familyActivitySelectionId) {
        await this.startMonitoring(newSchedule);
      }
    } catch (error) {
      console.error('[DeviceActivityService] Error updating monitoring:', error);
      throw error;
    }
  }

  /**
   * Subscribe to authorization status changes
   */
  onAuthorizationStatusChange(
    callback: (status: DeviceActivity.AuthorizationStatusType) => void
  ): { remove: () => void } {
    if (!this.isAvailable()) {
      return { remove: () => {} };
    }

    return DeviceActivity.onAuthorizationStatusChange(({ authorizationStatus }) => {
      callback(authorizationStatus);
    });
  }

  /**
   * Subscribe to device activity monitor events
   */
  onMonitorEvent(
    callback: (event: { callbackName: string }) => void
  ): { remove: () => void } {
    if (!this.isAvailable()) {
      return { remove: () => {} };
    }

    return DeviceActivity.onDeviceActivityMonitorEvent(callback);
  }
}

/** Singleton instance of DeviceActivityService */
export const deviceActivityService = new DeviceActivityService();
export default deviceActivityService;
