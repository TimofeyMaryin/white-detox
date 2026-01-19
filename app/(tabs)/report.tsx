import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, AppState } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { formatTimeShort } from '@/utils/timeFormatter';
import ScreenTimeModule from '@/modules/screen-time';
import { useBlocker } from '@/contexts/blocker-context';
import { ScreenTimeChart } from '@/components/screen-time-chart';
import { useRouter } from 'expo-router';
import adaptyService from '@/services/adapty-service';
import { ADAPTY_CONFIG } from '@/config/adapty';
import { HiddenDeviceActivityReport } from '@/components/device-activity-report';

type TimePeriod = 'Day' | 'Week' | 'Month';

export default function ReportScreen() {
  const { state } = useBlocker();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Day');
  const [hasPremium, setHasPremium] = useState(false);
  const [stats, setStats] = useState<{
    screenTime: number | null;
    pickups: number | null;
    topApps: Array<{ name: string; time: number; pickups?: number; notifications?: number }> | null;
    dailyData: Array<{ label: string; value: number; date?: string }> | null;
  }>({
    screenTime: null,
    pickups: null,
    topApps: null,
    dailyData: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScreenTimeData();
  }, [selectedPeriod]);

  useEffect(() => {
    checkPremiumStatus();
    
    // Subscribe to profile updates from Adapty service
    const unsubscribe = adaptyService.onProfileUpdate(() => {
      checkPremiumStatus();
    });
    
    // Re-check premium status when app becomes active (after purchase)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Check immediately, then again after a delay
        checkPremiumStatus();
        setTimeout(() => {
          checkPremiumStatus();
        }, 1000);
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);

  const checkPremiumStatus = async () => {
    try {
      // Wait a bit to ensure Adapty is initialized
      await new Promise(resolve => setTimeout(resolve, 300));
      const isPremium = await adaptyService.hasActiveSubscription();
      setHasPremium(isPremium);
      
      // If user tries to access Week/Month without premium, show paywall
      if (!isPremium && (selectedPeriod === 'Week' || selectedPeriod === 'Month')) {
        setSelectedPeriod('Day');
      }
    } catch (error: any) {
      // Don't log errors about undefined - Adapty might not be ready yet
      if (!error?.message?.includes('undefined') && !error?.message?.includes('getProfile')) {
        console.error('Error checking premium status:', error);
      }
    }
  };

  const loadScreenTimeData = async () => {
    console.log('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: Called for period:', selectedPeriod);
    setIsLoading(true);
    // Сбрасываем данные перед загрузкой
    setStats({
      screenTime: null,
      pickups: null,
      topApps: null,
      dailyData: null,
    });
    
    try {
      if (ScreenTimeModule && typeof ScreenTimeModule.isAuthorized === 'function') {
        const isAuthorized = await ScreenTimeModule.isAuthorized();
        console.log('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: isAuthorized:', isAuthorized);
        if (isAuthorized) {
          // Использовать новый метод для получения данных за период
          if (typeof ScreenTimeModule.getScreenTimeUsageForPeriod === 'function') {
            const usage = await ScreenTimeModule.getScreenTimeUsageForPeriod(selectedPeriod);
            console.log('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: Usage data:', JSON.stringify(usage, null, 2));
            setStats({
              screenTime: usage.totalTime || 0,
              pickups: usage.pickups || 0,
              topApps: usage.topApps || [],
              dailyData: usage.dailyData || [],
            });
          } else {
            // Fallback на старый метод для дня
            const usage = await ScreenTimeModule.getScreenTimeUsage();
            console.log('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: Legacy usage data:', JSON.stringify(usage, null, 2));
            setStats({
              screenTime: usage.totalTime || 0,
              pickups: usage.pickups || 0,
              topApps: usage.topApps || [],
              dailyData: null,
            });
          }
        } else {
          console.log('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: Not authorized');
          // Не авторизован - пустые данные
          setStats({
            screenTime: 0,
            pickups: 0,
            topApps: [],
            dailyData: [],
          });
        }
      } else {
        console.log('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: Module not available');
        // Модуль недоступен - пустые данные
        setStats({
          screenTime: 0,
          pickups: 0,
          topApps: [],
          dailyData: [],
        });
      }
    } catch (error) {
      console.error('[DETOX_DEBUG] ReportScreen.loadScreenTimeData: Error:', error);
      // При ошибке - пустые данные
      setStats({
        screenTime: 0,
        pickups: 0,
        topApps: [],
        dailyData: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate daily average
  const getDailyAverage = () => {
    if (!stats.screenTime) return 0;
    if (selectedPeriod === 'Day') return stats.screenTime;
    if (selectedPeriod === 'Week') return Math.floor(stats.screenTime / 7);
    if (selectedPeriod === 'Month') {
      // For month, calculate average per day (31 days)
      return Math.floor(stats.screenTime / 31);
    }
    return 0;
  };

  // Generate chart data based on period using real data only
  const getChartData = () => {
    // Только реальные данные, никаких моковых данных
    if (stats.dailyData && stats.dailyData.length > 0) {
      return stats.dailyData.map((day) => ({
        label: day.label,
        value: day.value,
      }));
    }
    
    // Если данных нет - возвращаем пустой массив
    return [];
  };

  // Get date range text
  const getDateRangeText = () => {
    const now = new Date();
    if (selectedPeriod === 'Day') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `TODAY, ${monthNames[now.getMonth()].toUpperCase()} ${now.getDate()}`;
    } else if (selectedPeriod === 'Week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][startOfWeek.getMonth()]} ${startOfWeek.getFullYear()} - ${endOfWeek.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
    } else {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `1 ${monthNames[now.getMonth()]} ${now.getFullYear()} - ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Hidden DeviceActivityReport - triggers iOS to call extension and populate Screen Time data */}
      <HiddenDeviceActivityReport periodType={selectedPeriod.toLowerCase() as 'day' | 'week' | 'month'} />
      
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
                  // Open paywall directly (same as after onboarding)
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
        {/* Time Saved Card - from blocking */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>TIME SAVED</ThemedText>
          <ThemedText style={styles.dateRange}>Total time saved by blocking apps</ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, styles.timeSavedValue]}>
                {formatTimeShort(state.savedTime)}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>BLOCKED TIME</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {state.isBlocking ? '🟢 Active' : '⚪ Inactive'}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>STATUS</ThemedText>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>SCREEN TIME</ThemedText>
          <ThemedText style={styles.dateRange}>{getDateRangeText()}</ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {stats.screenTime ? formatTimeShort(stats.screenTime) : '0m'}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>TOTAL USAGE</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {formatTimeShort(getDailyAverage())}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>DAILY AVERAGE</ThemedText>
            </View>
          </View>
          {selectedPeriod === 'Month' && (
            <ThemedText style={styles.note}>
              Apple only provides data from the last 31 days.
            </ThemedText>
          )}
          <ThemedText style={styles.note}>
            Note: Screen Time data from Apple updates periodically, not in real-time.
          </ThemedText>
        </View>

        {/* Screen Time Per Day Chart - Only for Week and Month */}
        {(selectedPeriod === 'Week' || selectedPeriod === 'Month') && (
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>
              {selectedPeriod === 'Week' ? 'Screen time per day' : 'Screen time per day'}
            </ThemedText>
            {isLoading ? (
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            ) : (
              <ScreenTimeChart data={getChartData()} />
            )}
          </View>
        )}

        {/* Most Time Per Hour - Apps List */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Most time per hour</ThemedText>
          {isLoading ? (
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          ) : stats.topApps && stats.topApps.length > 0 ? (
            <>
              {stats.topApps.map((app, index) => (
                <View key={index} style={styles.appRow}>
                  <View style={styles.appInfo}>
                    <ThemedText style={styles.appName}>{app.name}</ThemedText>
                    <View style={styles.appMeta}>
                      <ThemedText style={styles.appMetaText}>
                        {app.pickups || 0} pickups
                      </ThemedText>
                      {app.notifications !== undefined && (
                        <ThemedText style={styles.appMetaText}>
                          {app.notifications} notification{app.notifications !== 1 ? 's' : ''}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <ThemedText style={styles.appTime}>
                    {formatTimeShort(app.time)}
                  </ThemedText>
                </View>
              ))}
              <TouchableOpacity style={styles.showMoreButton}>
                <ThemedText style={styles.showMoreText}>Show More</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <ThemedText style={styles.emptyText}>No app data available</ThemedText>
          )}
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
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  dateRange: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 12,
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    padding: 20,
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  appMetaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  appTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    padding: 20,
  },
  timeSavedValue: {
    color: Colors.dark.primary,
  },
});
