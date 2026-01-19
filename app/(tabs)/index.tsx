/**
 * Home Screen
 *
 * Main screen with manual app blocking and saved time display.
 *
 * @module app/(tabs)/index
 */

import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AuthorizationStatus } from 'react-native-device-activity';

import { IOSActivityPicker } from '@/components/ios-activity-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeDial } from '@/components/time-dial';
import { TopBar } from '@/components/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useBlocker } from '@/contexts/blocker-context';
import { usePremium } from '@/hooks/use-premium';
import deviceActivityService from '@/services/device-activity.service';

// Selection ID for blocked apps
const BLOCKING_SELECTION_ID = 'main_blocking_selection';

export default function HomeScreen() {
  const {
    state,
    startBlocking,
    stopBlocking,
    authorizationStatus,
    requestAuthorization,
  } = useBlocker();

  const { hasPremium } = usePremium();
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [hasAppsSelected, setHasAppsSelected] = useState(false);

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const handlePremiumPress = useCallback(() => {
    router.push({
      pathname: '/paywall',
      params: { placement: 'pw_main' },
    });
  }, []);

  const handleSelectApps = useCallback(() => {
    setShowAppPicker(true);
  }, []);

  const handleSelectionChange = useCallback((metadata: { applicationCount: number; categoryCount: number }) => {
    setHasAppsSelected(metadata.applicationCount > 0 || metadata.categoryCount > 0);
  }, []);

  const handleStartBlocking = useCallback(async () => {
    if (!hasAppsSelected) {
      Alert.alert(
        'No Apps Selected',
        'Please select apps to block before starting.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (Platform.OS === 'ios' && deviceActivityService.isAvailable()) {
        // Check authorization
        if (authorizationStatus !== AuthorizationStatus.approved) {
          await requestAuthorization();

          const newStatus = deviceActivityService.getAuthorizationStatus();
          if (newStatus !== AuthorizationStatus.approved) {
            Alert.alert(
              'Authorization Required',
              'Screen Time authorization is required to block apps. Please grant permission in Settings.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        // Block apps
        deviceActivityService.blockApps(BLOCKING_SELECTION_ID);
      }

      startBlocking();
    } catch (error: any) {
      console.error('[HomeScreen] Error starting blocking:', error);

      if (__DEV__) {
        console.warn('Continuing with blocking state only (Screen Time API not available)');
        startBlocking();
      } else {
        Alert.alert(
          'Blocking Failed',
          'Unable to start blocking. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [hasAppsSelected, authorizationStatus, requestAuthorization, startBlocking]);

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

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <ThemedView style={styles.container}>
      {!hasPremium && <TopBar onPremiumPress={handlePremiumPress} />}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Timer Display */}
        <TimeDial savedTime={state.savedTime} />

        {/* App Selection Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Apps to Block</ThemedText>
          
          <TouchableOpacity
            style={styles.selectAppsButton}
            onPress={handleSelectApps}
          >
            <IconSymbol 
              name={hasAppsSelected ? "checkmark.circle.fill" : "plus.circle.fill"} 
              size={24} 
              color={hasAppsSelected ? Colors.dark.primary : Colors.dark.icon} 
            />
            <ThemedText style={[
              styles.selectAppsText,
              hasAppsSelected && styles.selectAppsTextActive
            ]}>
              {hasAppsSelected ? 'Apps selected — tap to change' : 'Select apps to block'}
            </ThemedText>
            <IconSymbol name="chevron.right" size={20} color={Colors.dark.icon} />
          </TouchableOpacity>
        </View>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {state.isBlocking ? (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStopBlocking}
            >
              <IconSymbol name="stop.fill" size={24} color="#000" />
              <ThemedText style={styles.buttonText}>Stop Blocking</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.button, 
                styles.startButton,
                !hasAppsSelected && styles.buttonDisabled
              ]}
              onPress={handleStartBlocking}
              disabled={!hasAppsSelected}
            >
              <IconSymbol name="play.fill" size={24} color="#000" />
              <ThemedText style={styles.buttonText}>Start Blocking</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        {state.isBlocking && (
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>Blocking active</ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* App Picker Modal */}
      <IOSActivityPicker
        visible={showAppPicker}
        onClose={() => setShowAppPicker(false)}
        onSelectionChange={handleSelectionChange}
        familyActivitySelectionId={BLOCKING_SELECTION_ID}
      />
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
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  selectAppsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 12,
  },
  selectAppsText: {
    flex: 1,
    fontSize: 16,
    opacity: 0.7,
  },
  selectAppsTextActive: {
    opacity: 1,
    color: Colors.dark.primary,
  },
  controls: {
    marginTop: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
  },
  startButton: {
    backgroundColor: Colors.dark.primary,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 235, 63, 0.15)',
    borderRadius: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.primary,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
});
