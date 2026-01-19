/**
 * Device Activity Service
 *
 * Centralized service for managing iOS Screen Time / Family Controls API.
 * Handles app blocking and authorization.
 *
 * @module services/device-activity
 */

import { Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

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
}

/** Singleton instance of DeviceActivityService */
export const deviceActivityService = new DeviceActivityService();
export default deviceActivityService;
