/**
 * Permissions Hook
 *
 * Manages app permissions including Screen Time, notifications, and location.
 * Provides status checking and request functions.
 *
 * @module hooks/use-permissions
 */

import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

/** Possible states for a permission */
type PermissionState = 'granted' | 'denied' | 'not-determined' | 'checking';

/**
 * Status of all app permissions
 */
export interface PermissionStatus {
  /** Screen Time / Family Controls permission */
  screenTime: PermissionState;
  /** Push notification permission */
  notifications: PermissionState;
  /** Location permission (not currently used) */
  location: PermissionState;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>(() => ({
    screenTime: 'not-determined',
    notifications: 'not-determined',
    location: 'not-determined',
  }));

  useEffect(() => {
    const initTimer = setTimeout(() => {
      checkAllPermissions();
    }, 0);
    return () => clearTimeout(initTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAllPermissions = async () => {
    try {
      await Promise.all([
        checkScreenTimePermission(),
        checkNotificationPermission(),
        checkLocationPermission(),
      ]);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkScreenTimePermission = async () => {
    try {
      setPermissions((prev) => ({ ...prev, screenTime: 'checking' }));
      
      if (Platform.OS === 'ios' && DeviceActivity.isAvailable()) {
        const status = DeviceActivity.getAuthorizationStatus();
        
        let screenTimeStatus: 'granted' | 'denied' | 'not-determined';
        if (status === DeviceActivity.AuthorizationStatus.approved) {
          screenTimeStatus = 'granted';
        } else if (status === DeviceActivity.AuthorizationStatus.denied) {
          screenTimeStatus = 'denied';
        } else {
          screenTimeStatus = 'not-determined';
        }
        
        setPermissions((prev) => ({ ...prev, screenTime: screenTimeStatus }));
      } else {
        setPermissions((prev) => ({ ...prev, screenTime: 'not-determined' }));
      }
    } catch (error) {
      console.error('Error checking Screen Time permission:', error);
      setPermissions((prev) => ({ ...prev, screenTime: 'denied' }));
    }
  };

  const checkNotificationPermission = async () => {
    try {
      setPermissions((prev) => ({ ...prev, notifications: 'checking' }));
      
      let Notifications;
      try {
        Notifications = require('expo-notifications');
      } catch {
        setPermissions((prev) => ({ ...prev, notifications: 'not-determined' }));
        return;
      }
      
      if (Notifications && typeof Notifications.getPermissionsAsync === 'function') {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissions((prev) => ({
          ...prev,
          notifications: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'not-determined',
        }));
      } else {
        setPermissions((prev) => ({ ...prev, notifications: 'not-determined' }));
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
      setPermissions((prev) => ({ ...prev, notifications: 'denied' }));
    }
  };

  const checkLocationPermission = async () => {
    try {
      setPermissions((prev) => ({ ...prev, location: 'checking' }));
      setPermissions((prev) => ({ ...prev, location: 'not-determined' }));
    } catch (error) {
      console.error('Error checking location permission:', error);
      setPermissions((prev) => ({ ...prev, location: 'denied' }));
    }
  };

  const requestScreenTimePermission = async () => {
    try {
      setPermissions((prev) => ({ ...prev, screenTime: 'checking' }));
      
      if (Platform.OS === 'ios' && DeviceActivity.isAvailable()) {
        await DeviceActivity.requestAuthorization('individual');
        
        // Poll for status since it might not update immediately
        const status = await DeviceActivity.pollAuthorizationStatus({
          pollIntervalMs: 500,
          maxAttempts: 10,
        });
        
        const granted = status === DeviceActivity.AuthorizationStatus.approved;
        setPermissions((prev) => ({
          ...prev,
          screenTime: granted ? 'granted' : 'denied',
        }));
        
        return granted;
      }
      
      setPermissions((prev) => ({ ...prev, screenTime: 'not-determined' }));
      return false;
    } catch (error: any) {
      console.error('Error requesting Screen Time permission:', error);
      await checkScreenTimePermission();
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    try {
      setPermissions((prev) => ({ ...prev, notifications: 'checking' }));
      
      let Notifications;
      try {
        Notifications = require('expo-notifications');
      } catch {
        Alert.alert(
          'Notifications Not Available',
          'Notification module is not available. Please rebuild the app with expo-notifications plugin.'
        );
        setPermissions((prev) => ({ ...prev, notifications: 'not-determined' }));
        return false;
      }
      
      if (Notifications && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        setPermissions((prev) => ({
          ...prev,
          notifications: status === 'granted' ? 'granted' : 'denied',
        }));
        
        await checkNotificationPermission();
        return status === 'granted';
      }
      
      setPermissions((prev) => ({ ...prev, notifications: 'not-determined' }));
      return false;
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      await checkNotificationPermission();
      return false;
    }
  };

  const requestLocationPermission = async () => {
    Alert.alert('Location Permission', 'Location permission is not yet implemented.');
    return false;
  };

  return {
    permissions,
    checkAllPermissions,
    requestScreenTimePermission,
    requestNotificationPermission,
    requestLocationPermission,
  };
}
