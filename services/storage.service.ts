/**
 * Storage Service
 *
 * Centralized service for persistent storage operations using AsyncStorage.
 * Handles all app data persistence including blocker state and schedules.
 *
 * @module services/storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockerState, BlockerSchedule } from '@/types/blocker';

/** Storage keys for app data */
export const STORAGE_KEYS = {
  BLOCKER_STATE: '@blocker_state',
  BLOCKER_SCHEDULES: '@blocker_schedules',
  ONBOARDING_COMPLETED: '@onboarding_completed',
  USER_SETTINGS: '@user_settings',
} as const;

class StorageService {
  /**
   * Get blocker state from storage
   *
   * @returns Parsed BlockerState or null if not found
   */
  async getBlockerState(): Promise<BlockerState | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKER_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[StorageService] Error reading blocker state:', error);
      return null;
    }
  }

  /**
   * Save blocker state to storage
   *
   * @param state - BlockerState to persist
   */
  async saveBlockerState(state: BlockerState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCKER_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('[StorageService] Error saving blocker state:', error);
      throw error;
    }
  }

  /**
   * Get all schedules from storage
   *
   * @returns Array of BlockerSchedule or empty array
   */
  async getSchedules(): Promise<BlockerSchedule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKER_SCHEDULES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[StorageService] Error reading schedules:', error);
      return [];
    }
  }

  /**
   * Save schedules to storage
   *
   * @param schedules - Array of schedules to persist
   */
  async saveSchedules(schedules: BlockerSchedule[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCKER_SCHEDULES, JSON.stringify(schedules));
    } catch (error) {
      console.error('[StorageService] Error saving schedules:', error);
      throw error;
    }
  }

  /**
   * Load both blocker state and schedules at once
   *
   * @returns Object containing state and schedules
   */
  async loadAll(): Promise<{
    state: BlockerState | null;
    schedules: BlockerSchedule[];
  }> {
    const [state, schedules] = await Promise.all([
      this.getBlockerState(),
      this.getSchedules(),
    ]);

    return { state, schedules };
  }

  /**
   * Check if onboarding has been completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return data === 'true';
    } catch (error) {
      console.error('[StorageService] Error reading onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (error) {
      console.error('[StorageService] Error saving onboarding status:', error);
    }
  }

  /**
   * Clear all app data (for debugging/reset)
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      console.log('[StorageService] All data cleared');
    } catch (error) {
      console.error('[StorageService] Error clearing data:', error);
      throw error;
    }
  }
}

/** Singleton instance of StorageService */
export const storageService = new StorageService();
export default storageService;
