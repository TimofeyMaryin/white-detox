import { NativeModules, Platform } from 'react-native';

interface GrayscaleModuleInterface {
  enableGrayscale(): Promise<boolean>;
  disableGrayscale(): Promise<boolean>;
  isGrayscaleEnabled(): Promise<boolean>;
}

const { GrayscaleModule: NativeGrayscaleModule } = NativeModules;

// Fallback implementation for development
const fallbackGrayscaleModule: GrayscaleModuleInterface = {
  async enableGrayscale() {
    if (__DEV__) {
      console.warn('GrayscaleModule not available - using fallback');
    }
    return false;
  },
  async disableGrayscale() {
    if (__DEV__) {
      console.warn('GrayscaleModule not available - using fallback');
    }
    return false;
  },
  async isGrayscaleEnabled() {
    if (__DEV__) {
      console.warn('GrayscaleModule not available - using fallback');
    }
    return false;
  },
};

const GrayscaleModule = (Platform.OS === 'ios' && NativeGrayscaleModule)
  ? (NativeGrayscaleModule as GrayscaleModuleInterface)
  : fallbackGrayscaleModule;

export default GrayscaleModule;

