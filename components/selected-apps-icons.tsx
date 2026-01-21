/**
 * Selected Apps Icons Component
 *
 * Displays icons of selected apps from FamilyActivitySelection.
 * Uses native SwiftUI Label(ApplicationToken) for rendering.
 *
 * @module components/selected-apps-icons
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

// Import native view only on iOS
let AppIconsView: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  try {
    const module = require('@/modules/app-icons');
    AppIconsView = module.AppIconsView;
  } catch (e) {
    console.log('[SelectedAppsIcons] Native module not available');
  }
}

interface SelectedAppsIconsProps {
  /** ID of the FamilyActivitySelection */
  familyActivitySelectionId?: string;
  /** Size of each icon (default: 40) */
  iconSize?: number;
  /** Maximum icons to show (default: 6) */
  maxIcons?: number;
  /** Height of the container */
  height?: number;
}

export function SelectedAppsIcons({
  familyActivitySelectionId,
  iconSize = 40,
  maxIcons = 6,
  height = 50,
}: SelectedAppsIconsProps) {
  // Only render on iOS with valid selection ID
  if (Platform.OS !== 'ios' || !familyActivitySelectionId || !AppIconsView) {
    return null;
  }

  return (
    <View style={[styles.container, { height }]}>
      <AppIconsView
        style={styles.iconsView}
        familyActivitySelectionId={familyActivitySelectionId}
        iconSize={iconSize}
        maxIcons={maxIcons}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  iconsView: {
    flex: 1,
  },
});
