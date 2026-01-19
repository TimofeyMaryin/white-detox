/**
 * Settings Hook
 *
 * Manages app settings with persistence.
 *
 * @module hooks/use-settings
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@app_settings';

/**
 * Application settings interface
 */
export interface AppSettings {
  /** Whether push notifications are enabled */
  notificationsEnabled: boolean;
  /** Whether to auto-start blocking on schedule */
  autoStartEnabled: boolean;
}

const defaultSettings: AppSettings = {
  notificationsEnabled: false,
  autoStartEnabled: false,
};

/**
 * Hook to manage and persist app settings
 *
 * @returns Settings state and update functions
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);
  }, [settings]);

  return {
    settings,
    isLoading,
    updateSetting,
    saveSettings,
  };
}

