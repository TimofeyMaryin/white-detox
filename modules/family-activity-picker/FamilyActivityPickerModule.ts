import { NativeModules, Platform } from 'react-native';

interface FamilyActivityPickerModuleInterface {
  isAuthorized?(): Promise<boolean>;
  requestAuthorization(): Promise<boolean>;
  presentFamilyActivityPicker(): Promise<string[]>;
  getSelectedApplications(): Promise<string[]>;
}

const { FamilyActivityPickerModule: NativeFamilyActivityPickerModule } = NativeModules;

const FamilyActivityPickerModule: FamilyActivityPickerModuleInterface = NativeFamilyActivityPickerModule || {
  isAuthorized: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    // Native module not available - return false
    return false;
  },
  requestAuthorization: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }
    // Native module not available - return false
    return false;
  },
  presentFamilyActivityPicker: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    // Native module not available - silently return empty array
    // This is expected if native module is not built yet
    return [];
  },
  getSelectedApplications: async () => {
    if (Platform.OS !== 'ios') {
      return [];
    }
    return [];
  },
};

export default FamilyActivityPickerModule;

