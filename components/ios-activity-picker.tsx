import { Colors } from '@/constants/theme';
import FamilyActivityPickerModule from '@/modules/family-activity-picker/FamilyActivityPickerModule';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

interface IOSActivityPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (appIdentifiers: string[]) => void;
  selectedApps?: string[];
}

export function IOSActivityPicker({ visible, onClose, onSelect, selectedApps = [] }: IOSActivityPickerProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && Platform.OS === 'ios' && !isLoading) {
      handlePresentPicker();
    } else if (!visible) {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handlePresentPicker = async () => {
    if (isLoading) return; // Prevent multiple calls
    
    setIsLoading(true);
    try {
      // Check if module is available
      if (!FamilyActivityPickerModule || typeof FamilyActivityPickerModule.presentFamilyActivityPicker !== 'function') {
        // Module not available - silently return empty array (native module not built yet)
        console.log('FamilyActivityPickerModule not available - returning empty selection');
        onSelect([]);
        setIsLoading(false);
        onClose();
        return;
      }
      
      console.log('Calling presentFamilyActivityPicker...');
      // The picker returns the selected app identifiers directly as an array
      // This promise resolves when user selects apps and presses "Done" or "Cancel"
      const appIdentifiers = await FamilyActivityPickerModule.presentFamilyActivityPicker();
      console.log('Picker returned:', appIdentifiers);
      
      // Always call onSelect with the result (even if empty array)
      onSelect(Array.isArray(appIdentifiers) ? appIdentifiers : []);
      
      // Close the picker after selection is made
      onClose();
    } catch (error: any) {
      console.error('Error presenting picker:', error);
      // Silently fail - just return empty array
      // Don't log errors about child/teen accounts - this is expected for adult accounts
      // The picker will just show empty list, which is the expected behavior
      onSelect([]);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // For non-iOS, don't render anything
  if (Platform.OS !== 'ios') {
    return null;
  }

  // Don't render anything - the native picker will be shown
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  cancelButton: {
    fontSize: 17,
    color: Colors.dark.primary,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});

