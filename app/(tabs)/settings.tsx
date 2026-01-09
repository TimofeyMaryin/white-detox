import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useSettings } from '@/hooks/use-settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';

// Function to get store review module safely
function getStoreReviewModule() {
  try {
    return require('expo-store-review');
  } catch (error) {
    return null;
  }
}

// Function to get notifications module safely - only called when needed
function getNotificationsModule() {
  try {
    // Try to require the module - if it's linked, it will work
    const Notifications = require('expo-notifications');
    
    // Check if the module has the required methods
    if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
      return Notifications;
    }
    return null;
  } catch (error: any) {
    // Silently fail if module is not available
    // This is expected if native module is not built yet
    return null;
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const { permissions, requestScreenTimePermission, requestNotificationPermission } = usePermissions();

  const getPermissionStatus = (status: string) => {
    switch (status) {
      case 'granted':
        return { text: 'Granted', color: Colors.dark.primary };
      case 'denied':
        return { text: 'Denied', color: '#FF3B30' };
      case 'checking':
        return { text: 'Checking...', color: Colors.dark.icon };
      default:
        return { text: 'Not Set', color: Colors.dark.icon };
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out Dopamine Detox - Block distracting apps and stay focused!',
        url: 'https://apps.apple.com/app/dopamine-detox',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Us',
      'Email: support@dopaminedetox.com\n\nWe\'ll get back to you as soon as possible!',
      [{ text: 'OK' }]
    );
  };

  const handleSendFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'We appreciate your feedback! Please email us at feedback@dopaminedetox.com',
      [{ text: 'OK' }]
    );
  };

  const handleRateUs = async () => {
    try {
      const StoreReview = getStoreReviewModule();
      if (StoreReview && await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      } else {
        Alert.alert(
          'Rate Us',
          'Thank you for using Dopamine Detox! Your feedback helps us improve.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Rate Us',
        'Thank you for using Dopamine Detox! Your feedback helps us improve.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestNotification = async () => {
    console.log('handleTestNotification called');
    
    try {
      console.log('Getting notifications module...');
      const Notifications = getNotificationsModule();
      console.log('Notifications module:', Notifications ? 'found' : 'not found');

      if (!Notifications) {
        console.log('Notifications module not available - showing alert');
        Alert.alert(
          'Notifications Not Available',
          'Please rebuild the app with expo-notifications plugin to enable notifications. Run: npx expo prebuild --clean'
        );
        return;
      }

      console.log('Checking permissions...');
      // Request permissions first if not granted
      let permissions;
      try {
        permissions = await Notifications.getPermissionsAsync();
        console.log('Existing permissions:', permissions);
      } catch (permError: any) {
        console.error('Error getting permissions:', permError);
        Alert.alert(
          'Error',
          `Failed to check permissions: ${permError?.message || 'Unknown error'}`
        );
        return;
      }
      
      let finalStatus = permissions.status;
      
      if (!permissions.granted) {
        console.log('Requesting permissions...');
        try {
          const requestResult = await Notifications.requestPermissionsAsync();
          console.log('Permission request result:', requestResult);
          finalStatus = requestResult.status;
        } catch (reqError: any) {
          console.error('Error requesting permissions:', reqError);
          Alert.alert(
            'Error',
            `Failed to request permissions: ${reqError?.message || 'Unknown error'}`
          );
          return;
        }
      }

      console.log('Final status:', finalStatus);

      if (finalStatus !== 'granted') {
        console.log('Permissions not granted - showing alert');
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to test notifications.'
        );
        return;
      }

      console.log('Scheduling notification...');
      if (typeof Notifications.scheduleNotificationAsync === 'function') {
        try {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Test Notification',
              body: 'This is a test notification from Dopamine Detox',
              sound: true,
            },
            trigger: null, // null means show immediately
          });
          console.log('Notification scheduled with ID:', notificationId);
          // Don't show Alert - the notification itself will appear
        } catch (scheduleError: any) {
          console.error('Error scheduling notification:', scheduleError);
          Alert.alert(
            'Error',
            `Failed to schedule notification: ${scheduleError?.message || 'Unknown error'}`
          );
        }
      } else {
        console.log('scheduleNotificationAsync not available');
        Alert.alert(
          'Notifications Not Available',
          'Notification module is not properly configured. Please rebuild the app.'
        );
      }
    } catch (error: any) {
      console.error('Error in handleTestNotification:', error);
      console.error('Error stack:', error?.stack);
      // Check if it's a native module error
      if (error?.message?.includes('ExpoPushTokenManager') || 
          error?.message?.includes('Cannot find native module')) {
        Alert.alert(
          'Notifications Not Available',
          'Please rebuild the app with expo-notifications plugin to enable notifications.'
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to send test notification: ${error?.message || 'Unknown error'}. Please rebuild the app.`
        );
      }
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Saved Data',
      'Are you sure you want to reset all saved data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been reset. Please restart the app.');
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Premium Banner */}
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={() => router.push('/paywall')}
        >
          <View style={styles.premiumBannerContent}>
            <IconSymbol name="star.fill" size={24} color="#000" />
            <View style={styles.premiumBannerText}>
              <ThemedText style={styles.premiumBannerTitle}>Get Premium</ThemedText>
              <ThemedText style={styles.premiumBannerSubtitle}>
                Unlock all features and support development
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#000" />
          </View>
        </TouchableOpacity>

        {/* Share */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingRow} onPress={handleShare}>
            <View style={styles.settingLeft}>
              <IconSymbol name="square.and.arrow.up" size={24} color={Colors.dark.primary} />
              <ThemedText style={styles.settingLabel}>Share Dopamine Detox to Friends</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Support</ThemedText>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleContactUs}>
            <View style={styles.settingLeft}>
              <IconSymbol name="envelope.fill" size={24} color={Colors.dark.primary} />
              <ThemedText style={styles.settingLabel}>Contact Us</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleSendFeedback}>
            <View style={styles.settingLeft}>
              <IconSymbol name="text.bubble.fill" size={24} color={Colors.dark.primary} />
              <ThemedText style={styles.settingLabel}>Send Feedback</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleRateUs}>
            <View style={styles.settingLeft}>
              <IconSymbol name="star.fill" size={24} color={Colors.dark.primary} />
              <ThemedText style={styles.settingLabel}>Rate Us</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Subscription</ThemedText>
          
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/paywall')}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="creditcard.fill" size={24} color={Colors.dark.primary} />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Manage Subscription</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  View and manage your premium subscription
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Permissions</ThemedText>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={async () => {
              if (permissions.screenTime !== 'granted') {
                const granted = await requestScreenTimePermission();
                if (!granted) {
                  // Show helpful message if permission was denied
                  Alert.alert(
                    'Screen Time Permission Required',
                    'Screen Time permission is required to block apps. You can enable it in Settings > Screen Time.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings(),
                      },
                    ]
                  );
                }
              } else {
                Alert.alert('Screen Time', 'Permission already granted');
              }
            }}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="clock.fill" size={24} color={Colors.dark.primary} />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Screen Time Access</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Required for app blocking
                </ThemedText>
                <ThemedText style={[styles.permissionStatus, { color: getPermissionStatus(permissions.screenTime).color }]}>
                  {getPermissionStatus(permissions.screenTime).text}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Notifications</ThemedText>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={async () => {
              if (permissions.notifications !== 'granted') {
                const granted = await requestNotificationPermission();
                if (!granted) {
                  // Show helpful message if permission was denied
                  Alert.alert(
                    'Notification Permission Required',
                    'Notification permission is required to receive blocking updates. You can enable it in Settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings(),
                      },
                    ]
                  );
                }
              } else {
                Alert.alert('Notifications', 'Permission already granted');
              }
            }}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="bell.fill" size={24} color={Colors.dark.primary} />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Notification Access</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Required for blocking updates
                </ThemedText>
                <ThemedText style={[styles.permissionStatus, { color: getPermissionStatus(permissions.notifications).color }]}>
                  {getPermissionStatus(permissions.notifications).text}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleTestNotification}>
            <View style={styles.settingLeft}>
              <IconSymbol name="bell.badge.fill" size={24} color={Colors.dark.primary} />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Test Notification</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Send a test notification to verify settings
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Data</ThemedText>

          <TouchableOpacity style={styles.settingRow} onPress={handleResetData}>
            <View style={styles.settingLeft}>
              <IconSymbol name="trash.fill" size={24} color="#FF3B30" />
              <View style={styles.settingInfo}>
                <ThemedText style={[styles.settingLabel, { color: '#FF3B30' }]}>Reset Saved Data</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Clear all app data and settings
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

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
  premiumBanner: {
    backgroundColor: '#FFCA1B',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  premiumBannerSubtitle: {
    fontSize: 14,
    color: '#000',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  permissionStatus: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
