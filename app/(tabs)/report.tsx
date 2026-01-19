import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, AppState } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { formatTimeShort } from '@/utils/timeFormatter';
import { useBlocker } from '@/contexts/blocker-context';
import { useRouter } from 'expo-router';
import adaptyService from '@/services/adapty-service';
import { ADAPTY_CONFIG } from '@/config/adapty';

type TimePeriod = 'Day' | 'Week' | 'Month';

export default function ReportScreen() {
  const { state } = useBlocker();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Day');
  const [hasPremium, setHasPremium] = useState(false);

  useEffect(() => {
    checkPremiumStatus();
    
    const unsubscribe = adaptyService.onProfileUpdate(() => {
      checkPremiumStatus();
    });
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPremiumStatus();
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);

  const checkPremiumStatus = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const isPremium = await adaptyService.hasActiveSubscription();
      setHasPremium(isPremium);
      
      if (!isPremium && (selectedPeriod === 'Week' || selectedPeriod === 'Month')) {
        setSelectedPeriod('Day');
      }
    } catch (error: any) {
      if (!error?.message?.includes('undefined') && !error?.message?.includes('getProfile')) {
        console.error('Error checking premium status:', error);
      }
    }
  };

  // Format hours and minutes separately for large display
  const formatTimeLarge = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return { hours, minutes };
  };

  const timeSaved = formatTimeLarge(state.savedTime);

  return (
    <ThemedView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['Day', 'Week', 'Month'] as TimePeriod[]).map((period) => {
          const isPremiumRequired = period === 'Week' || period === 'Month';
          const isDisabled = isPremiumRequired && !hasPremium;
          
          return (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
                isDisabled && styles.periodButtonDisabled,
              ]}
              onPress={() => {
                if (isDisabled) {
                  router.push({
                    pathname: '/paywall',
                    params: { placement: ADAPTY_CONFIG.placements.paywall.main },
                  });
                } else {
                  setSelectedPeriod(period);
                }
              }}
            >
              <ThemedText
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                  isDisabled && styles.periodButtonTextDisabled,
                ]}
              >
                {period}
                {isDisabled && !hasPremium && ' 🔒'}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hero Section - Time Saved */}
        <View style={styles.heroCard}>
          <ThemedText style={styles.heroTitle}>TIME SAVED</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Total time saved by blocking distracting apps
          </ThemedText>
          
          <View style={styles.timeDisplay}>
            <View style={styles.timeUnit}>
              <ThemedText style={styles.timeValue}>{timeSaved.hours}</ThemedText>
              <ThemedText style={styles.timeLabel}>hours</ThemedText>
            </View>
            <ThemedText style={styles.timeSeparator}>:</ThemedText>
            <View style={styles.timeUnit}>
              <ThemedText style={styles.timeValue}>
                {timeSaved.minutes.toString().padStart(2, '0')}
              </ThemedText>
              <ThemedText style={styles.timeLabel}>minutes</ThemedText>
            </View>
          </View>

          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, state.isBlocking ? styles.statusDotActive : styles.statusDotInactive]} />
            <ThemedText style={styles.statusText}>
              {state.isBlocking ? 'Blocking Active' : 'Not Blocking'}
            </ThemedText>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{formatTimeShort(state.savedTime)}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Saved</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {state.isBlocking ? '🟢' : '⚪'}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Status</ThemedText>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <ThemedText style={styles.infoTitle}>How it works</ThemedText>
          <ThemedText style={styles.infoText}>
            When you activate blocking, the timer counts the time you're protected from distracting apps. 
            This represents the time you've reclaimed for more meaningful activities.
          </ThemedText>
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
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  periodButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  periodButtonTextActive: {
    opacity: 1,
    color: '#000',
  },
  periodButtonDisabled: {
    opacity: 0.5,
  },
  periodButtonTextDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  heroCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 24,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    lineHeight: 72,
  },
  timeLabel: {
    fontSize: 14,
    opacity: 0.6,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginHorizontal: 8,
    opacity: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: Colors.dark.primary,
  },
  statusDotInactive: {
    backgroundColor: '#666',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
});
