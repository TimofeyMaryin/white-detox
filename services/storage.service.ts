/**
 * Storage Service
 *
 * Centralized service for persistent storage operations.
 *
 * @module services/storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockerState, BlockerSchedule } from '@/types/blocker';

export const STORAGE_KEYS = {
  BLOCKER_STATE: '@blocker_state',
  BLOCKER_SCHEDULES: '@blocker_schedules',
  ONBOARDING_COMPLETED: '@onboarding_completed',
  USER_SETTINGS: '@user_settings',
} as const;

class StorageService {
  async getBlockerState(): Promise<BlockerState | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKER_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[StorageService] Error reading blocker state:', error);
      return null;
    }
  }

  async saveBlockerState(state: BlockerState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCKER_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('[StorageService] Error saving blocker state:', error);
      throw error;
    }
  }

  async getSchedules(): Promise<BlockerSchedule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKER_SCHEDULES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[StorageService] Error reading schedules:', error);
      return [];
    }
  }

  async saveSchedules(schedules: BlockerSchedule[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCKER_SCHEDULES, JSON.stringify(schedules));
    } catch (error) {
      console.error('[StorageService] Error saving schedules:', error);
      throw error;
    }
  }

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

  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return data === 'true';
    } catch (error) {
      return false;
    }
  }

  async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (error) {
      console.error('[StorageService] Error saving onboarding status:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('[StorageService] Error clearing data:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
export default storageService;
