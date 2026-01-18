import { NativeModules, Platform } from 'react-native';

interface FamilyActivityPickerModuleInterface {
  isAuthorized?(): Promise<boolean>;
  requestAuthorization(): Promise<boolean>;
  presentFamilyActivityPicker(): Promise<string[]>;
  presentFamilyActivityPickerWithScheduleId(scheduleId: string): Promise<string[]>;
  getSelectedApplications(): Promise<string[]>;
  getSelectedApplicationsForScheduleId(scheduleId: string): Promise<string[]>;
  loadSavedSelectionForScheduleId(scheduleId: string): Promise<string[]>;
  clearSelectionForScheduleId(scheduleId: string): Promise<boolean>;
  updateSelectionFromApps(scheduleId: string, appIdentifiers: string[]): Promise<boolean>;
}

const { FamilyActivityPickerModule: NativeFamilyActivityPickerModule } = NativeModules;

const fallbackModule: FamilyActivityPickerModuleInterface = {
  isAuthorized: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return false;
  },
  requestAuthorization: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return false;
  },
  presentFamilyActivityPicker: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    return [];
  },
  presentFamilyActivityPickerWithScheduleId: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    return [];
  },
  getSelectedApplications: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    return [];
  },
  getSelectedApplicationsForScheduleId: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    return [];
  },
  loadSavedSelectionForScheduleId: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    return [];
  },
  clearSelectionForScheduleId: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return false;
  },
  updateSelectionFromApps: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return false;
  },
};

const FamilyActivityPickerModule: FamilyActivityPickerModuleInterface = 
  (Platform.OS === 'ios' && NativeFamilyActivityPickerModule) 
    ? NativeFamilyActivityPickerModule 
    : fallbackModule;

export default FamilyActivityPickerModule;

