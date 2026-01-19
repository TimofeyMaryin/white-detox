/**
 * iOS Activity Picker Component
 *
 * Native iOS app selection modal using FamilyControls API.
 * Allows users to select apps and categories to block.
 *
 * @module components/ios-activity-picker
 */

import { useState, useCallback } from 'react';
import { Platform, StyleSheet, View, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { DeviceActivitySelectionViewPersisted } from 'react-native-device-activity';

import { Colors } from '@/constants/theme';
import { ThemedText } from './themed-text';

interface IOSActivityPickerProps {
  /** Whether the picker modal is visible */
  visible: boolean;
  /** Called when picker is closed */
  onClose: () => void;
  /** Called when selection changes with count info */
  onSelectionChange?: (metadata: { applicationCount: number; categoryCount: number }) => void;
  /** Unique ID to persist the selection */
  familyActivitySelectionId: string;
}

export function IOSActivityPicker({ 
  visible, 
  onClose, 
  onSelectionChange,
  familyActivitySelectionId,
}: IOSActivityPickerProps) {
  const [selectionInfo, setSelectionInfo] = useState({ applicationCount: 0, categoryCount: 0 });

  const handleSelectionChange = useCallback((event: any) => {
    const metadata = event.nativeEvent;
    console.log('[DETOX] Selection changed:', metadata);
    setSelectionInfo({
      applicationCount: metadata.applicationCount || 0,
      categoryCount: metadata.categoryCount || 0,
    });
    onSelectionChange?.(metadata);
  }, [onSelectionChange]);

  const handleDone = () => {
    onClose();
  };

  // For non-iOS, don't render anything
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <ThemedText style={styles.title}>Select Apps</ThemedText>
          <TouchableOpacity onPress={handleDone} style={styles.doneButtonContainer}>
            <ThemedText style={styles.doneButton}>Done</ThemedText>
          </TouchableOpacity>
        </View>
        
        <View style={styles.selectionInfo}>
          <ThemedText style={styles.selectionInfoText}>
            {selectionInfo.applicationCount > 0 || selectionInfo.categoryCount > 0
              ? `${selectionInfo.applicationCount} apps, ${selectionInfo.categoryCount} categories selected`
              : 'No apps selected'}
          </ThemedText>
        </View>
        
        <View style={styles.pickerContainer}>
          <DeviceActivitySelectionViewPersisted
            familyActivitySelectionId={familyActivitySelectionId}
            onSelectionChange={handleSelectionChange}
            headerText="Choose apps and categories to block"
            footerText="Selected apps will be blocked during the scheduled time"
            style={styles.picker}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerSpacer: {
    width: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  doneButtonContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  selectionInfo: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  selectionInfoText: {
    fontSize: 14,
    color: Colors.dark.icon,
    textAlign: 'center',
  },
  pickerContainer: {
    flex: 1,
  },
  picker: {
    flex: 1,
  },
});
