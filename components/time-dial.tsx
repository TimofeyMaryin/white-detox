/**
 * Time Display Component
 *
 * Displays saved time in "In Time" movie style: DD:HH:mm:ss
 * Minimalist digital display with glowing green text.
 *
 * @module components/time-dial
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { formatTimeInTimeStyle } from '@/utils/timeFormatter';

interface TimeDialProps {
  /** Saved time in seconds */
  savedTime: number;
}

const { width } = Dimensions.get('window');
const FONT_SIZE = width > 400 ? 42 : width > 360 ? 36 : 32;

export function TimeDial({ savedTime }: TimeDialProps) {
  const time = formatTimeInTimeStyle(savedTime);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.savedLabel}>TIME SAVED</ThemedText>
      <View style={styles.timeContainer}>
        {/* Days */}
        <View style={styles.timeUnit}>
          <ThemedText style={styles.timeValue}>{time.days}</ThemedText>
          <ThemedText style={styles.timeLabel}>DAYS</ThemedText>
        </View>

        <ThemedText style={styles.separator}>:</ThemedText>

        {/* Hours */}
        <View style={styles.timeUnit}>
          <ThemedText style={styles.timeValue}>{time.hours}</ThemedText>
          <ThemedText style={styles.timeLabel}>HRS</ThemedText>
        </View>

        <ThemedText style={styles.separator}>:</ThemedText>

        {/* Minutes */}
        <View style={styles.timeUnit}>
          <ThemedText style={styles.timeValue}>{time.minutes}</ThemedText>
          <ThemedText style={styles.timeLabel}>MIN</ThemedText>
        </View>

        <ThemedText style={styles.separator}>:</ThemedText>

        {/* Seconds */}
        <View style={styles.timeUnit}>
          <ThemedText style={styles.timeValue}>{time.seconds}</ThemedText>
          <ThemedText style={styles.timeLabel}>SEC</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingTop: 40,
  },
  savedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
    opacity: 0.8,
    marginBottom: 20,
    letterSpacing: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 10,
  },
  timeUnit: {
    alignItems: 'center',
    minWidth: width > 400 ? 50 : 44,
  },
  timeValue: {
    fontSize: FONT_SIZE,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: Colors.dark.primary,
    textShadowColor: Colors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 1,
    includeFontPadding: false,
    lineHeight: FONT_SIZE + 10,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.dark.text,
    opacity: 0.5,
    marginTop: 8,
    letterSpacing: 1,
  },
  separator: {
    fontSize: FONT_SIZE,
    fontWeight: '300',
    color: Colors.dark.primary,
    opacity: 0.6,
    marginHorizontal: 2,
    textShadowColor: Colors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    includeFontPadding: false,
    lineHeight: FONT_SIZE + 10,
  },
});
