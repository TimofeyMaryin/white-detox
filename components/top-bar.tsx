/**
 * Top Bar Component
 *
 * App header with logo and premium upgrade button.
 * Only shown to non-premium users.
 *
 * @module components/top-bar
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';

import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface TopBarProps {
  /** Called when premium button is pressed */
  onPremiumPress?: () => void;
}

export function TopBar({ onPremiumPress }: TopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Image
          source={require('@/assets/images/icon.jpg')}
          style={styles.icon}
          resizeMode="contain"
        />
        <ThemedText style={styles.title}>Dopamine Detox</ThemedText>
      </View>
      <TouchableOpacity
        style={styles.premiumButton}
        onPress={onPremiumPress}
        activeOpacity={0.7}
      >
        <IconSymbol name="star.fill" size={16} color="#000" />
        <ThemedText style={styles.premiumText}>Get premium</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#2d2d2d',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCA1B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

