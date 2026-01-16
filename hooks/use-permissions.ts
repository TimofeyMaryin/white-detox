import { useState, useEffect } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import ScreenTimeModule from '@/modules/screen-time';

export interface PermissionStatus {
  screenTime: 'granted' | 'denied' | 'not-determined' | 'checking';
  notifications: 'granted' | 'denied' | 'not-determined' | 'checking';
  location: 'granted' | 'denied' | 'not-determined' | 'checking';
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>(() => ({
    screenTime: 'not-determined',
    notifications: 'not-determined',
    location: 'not-determined',
  }));

  useEffect(() => {
    // Delay initialization to ensure component is mounted
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
      if (ScreenTimeModule && typeof ScreenTimeModule.isAuthorized === 'function') {
        const isAuthorized = await ScreenTimeModule.isAuthorized();
        setPermissions((prev) => ({
          ...prev,
          screenTime: isAuthorized ? 'granted' : 'denied',
        }));
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
      
      // Try to get notifications module
      let Notifications;
      try {
        Notifications = require('expo-notifications');
      } catch {
        // Module not available
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
      // Location permission check would require expo-location
      // For now, we'll set it as not-determined
      setPermissions((prev) => ({ ...prev, location: 'not-determined' }));
    } catch (error) {
      console.error('Error checking location permission:', error);
      setPermissions((prev) => ({ ...prev, location: 'denied' }));
    }
  };

  const requestScreenTimePermission = async () => {
    try {
      setPermissions((prev) => ({ ...prev, screenTime: 'checking' }));
      if (ScreenTimeModule && typeof ScreenTimeModule.requestAuthorization === 'function') {
        const granted = await ScreenTimeModule.requestAuthorization();
        
        setPermissions((prev) => ({
          ...prev,
          screenTime: granted ? 'granted' : 'denied',
        }));
        
        await checkScreenTimePermission();
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
      
      // Try to get notifications module
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
        
        // Re-check permission status to ensure it's up to date
        await checkNotificationPermission();
        
        return status === 'granted';
      }
      
      setPermissions((prev) => ({ ...prev, notifications: 'not-determined' }));
      return false;
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      // Re-check permission status after error
      await checkNotificationPermission();
      return false;
    }
  };

  const requestLocationPermission = async () => {
    // This would require expo-location package
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

