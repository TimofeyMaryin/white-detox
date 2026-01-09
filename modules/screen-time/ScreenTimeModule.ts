import { NativeModules, Platform } from 'react-native';

interface ScreenTimeModuleInterface {
  requestAuthorization(): Promise<boolean>;
  isAuthorized(): Promise<boolean>;
  getScreenTimeUsage(): Promise<{
    totalTime: number;
    pickups: number;
    topApps: Array<{ name: string; time: number; pickups?: number; notifications?: number }>;
  }>;
  getScreenTimeUsageForPeriod(period: 'Day' | 'Week' | 'Month'): Promise<{
    totalTime: number;
    pickups: number;
    topApps: Array<{ name: string; time: number; pickups?: number; notifications?: number }>;
    dailyData: Array<{ label: string; value: number; date?: string }>;
  }>;
  blockApps(appIdentifiers: string[]): Promise<boolean>;
  unblockApps(appIdentifiers: string[]): Promise<boolean>;
  isAppBlocked(appIdentifier: string): Promise<boolean>;
  createDeviceActivitySchedule(
    scheduleId: string,
    startTime: string,
    endTime: string,
    daysOfWeek: number[]
  ): Promise<boolean>;
  removeDeviceActivitySchedule(scheduleId: string): Promise<boolean>;
}

const { ScreenTimeModule: NativeScreenTimeModule } = NativeModules;

// Fallback implementation for development
const fallbackScreenTimeModule: ScreenTimeModuleInterface = {
  async requestAuthorization() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
  async isAuthorized() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
  async getScreenTimeUsage() {
    console.warn('ScreenTimeModule not available - returning empty data');
    return {
      totalTime: 0,
      pickups: 0,
      topApps: [],
    };
  },
  async getScreenTimeUsageForPeriod() {
    console.warn('ScreenTimeModule not available - returning empty data');
    return {
      totalTime: 0,
      pickups: 0,
      topApps: [],
      dailyData: [],
    };
  },
  async createDeviceActivitySchedule() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
  async removeDeviceActivitySchedule() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
  async blockApps() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
  async unblockApps() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
  async isAppBlocked() {
    console.warn('ScreenTimeModule not available - using fallback');
    return false;
  },
};

const ScreenTimeModule = (Platform.OS === 'ios' && NativeScreenTimeModule) 
  ? (NativeScreenTimeModule as ScreenTimeModuleInterface)
  : fallbackScreenTimeModule;

export default ScreenTimeModule;

