/**
 * Time Dial Component
 *
 * Displays an analog clock-style dial showing saved time.
 *
 * @module components/time-dial
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { formatTime } from '@/utils/timeFormatter';

interface TimeDialProps {
  /** Saved time in seconds */
  savedTime: number;
}

const { width } = Dimensions.get('window');
const DIAL_SIZE = width * 0.7;
const CENTER_SIZE = DIAL_SIZE * 0.6;

export function TimeDial({ savedTime }: TimeDialProps) {
  const hours = Math.floor(savedTime / 3600);
  const minutes = Math.floor((savedTime % 3600) / 60);
  const seconds = savedTime % 60;

  // Calculate angle for hour hand (0-360 degrees)
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  // Calculate angle for minute hand
  const minuteAngle = minutes * 6 + seconds * 0.1;
  // Calculate angle for second hand
  const secondAngle = seconds * 6;

  return (
    <View style={styles.container}>
      <View style={styles.dial}>
        {/* Hour markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const radius = DIAL_SIZE / 2 - 20;
          const x = DIAL_SIZE / 2 + radius * Math.cos(angle);
          const y = DIAL_SIZE / 2 + radius * Math.sin(angle);
          
          return (
            <View
              key={i}
              style={[
                styles.hourMarker,
                {
                  left: x - 2,
                  top: y - 2,
                },
              ]}
            />
          );
        })}

        {/* Hour hand */}
        <View
          style={[
            styles.hand,
            styles.hourHand,
            {
              transform: [{ rotate: `${hourAngle}deg` }],
            },
          ]}
        />

        {/* Minute hand */}
        <View
          style={[
            styles.hand,
            styles.minuteHand,
            {
              transform: [{ rotate: `${minuteAngle}deg` }],
            },
          ]}
        />

        {/* Second hand */}
        <View
          style={[
            styles.hand,
            styles.secondHand,
            {
              transform: [{ rotate: `${secondAngle}deg` }],
            },
          ]}
        />

        {/* Center circle */}
        <View style={styles.center} />

        {/* Time display in center */}
        <View style={styles.timeDisplay}>
          <ThemedText type="title" style={styles.timeText}>
            {formatTime(savedTime)}
          </ThemedText>
          <ThemedText style={styles.labelText}>Saved</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
    backgroundColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourMarker: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.primary,
  },
  hand: {
    position: 'absolute',
    backgroundColor: Colors.dark.primary,
    transformOrigin: 'bottom center',
  },
  hourHand: {
    width: 4,
    height: DIAL_SIZE * 0.25,
    bottom: DIAL_SIZE / 2,
    left: DIAL_SIZE / 2 - 2,
    borderRadius: 2,
  },
  minuteHand: {
    width: 3,
    height: DIAL_SIZE * 0.35,
    bottom: DIAL_SIZE / 2,
    left: DIAL_SIZE / 2 - 1.5,
    borderRadius: 1.5,
  },
  secondHand: {
    width: 2,
    height: DIAL_SIZE * 0.4,
    bottom: DIAL_SIZE / 2,
    left: DIAL_SIZE / 2 - 1,
    borderRadius: 1,
    backgroundColor: Colors.dark.primary,
    opacity: 0.7,
  },
  center: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.primary,
    top: DIAL_SIZE / 2 - 6,
    left: DIAL_SIZE / 2 - 6,
  },
  timeDisplay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    textAlign: 'center',
  },
  labelText: {
    fontSize: 12,
    color: Colors.dark.text,
    opacity: 0.7,
    marginTop: 4,
  },
});

