import Foundation
import FamilyControls
import ManagedSettings
import SwiftUI
import React

// Store the selection globally for use in blocking
// Note: This is shared with ScreenTimeModule and DeviceActivityMonitor
// Must be public to be accessible from the main app (DeviceActivityMonitor)
// For Expo Modules API, both modules will be compiled into the same Xcode project
public var globalActivitySelection: FamilyActivitySelection?

// Storage key for saved selections
private let SAVED_SELECTION_KEY = "SavedFamilyActivitySelection"

// Helper class to save/load FamilyActivitySelection
// NOTE: ApplicationToken cannot be directly serialized due to iOS security restrictions
// We work around this by:
// 1. Caching selections in memory during app session
// 2. Storing flags in UserDefaults to indicate which schedules have selections
// 3. Using ManagedSettingsStore to persist blocking settings (tokens are stored there automatically)
// 4. Restoring from globalActivitySelection when available
// Note: This class is used by both ScreenTimeModule and DeviceActivityMonitor
// Must be public to be accessible from the main app (DeviceActivityMonitor)
// For Expo Modules API, both modules will be compiled into the same project,
// so internal/public access will work correctly
public class FamilyActivitySelectionStorage {
  public static let shared = FamilyActivitySelectionStorage()
  private let userDefaults = UserDefaults.standard
  private var cachedSelections: [String: FamilyActivitySelection] = [:]
  
  public init() {}
  
  // Save selection for a specific schedule ID
  // Since ApplicationToken can't be serialized directly, we:
  // - Cache it in memory for current session
  // - Store a flag in UserDefaults indicating selection exists
  // - ManagedSettingsStore automatically persists tokens when blocking is active
  public func saveSelection(_ selection: FamilyActivitySelection, forScheduleId scheduleId: String) {
    // Cache in memory for current session
    cachedSelections[scheduleId] = selection
    
    // Also update global selection
    globalActivitySelection = selection
    
    // Save flag indicating this schedule has a selection
    let key = "\(SAVED_SELECTION_KEY)_\(scheduleId)"
    let count = selection.applicationTokens.count
    userDefaults.set(count, forKey: "\(key)_count")
    userDefaults.set(true, forKey: "\(key)_exists")
    userDefaults.synchronize()
    
    // Note: The actual tokens are persisted in ManagedSettingsStore when blocking is active
    // When app restarts, tokens are preserved in ManagedSettingsStore but we can't read them back
    // User will need to re-select apps if they want to modify, but blocking will continue working
    
    print("Saved selection for schedule \(scheduleId) with \(count) apps (cached in memory)")
  }
  
  // Load selection for a specific schedule ID
  public func loadSelection(forScheduleId scheduleId: String) -> FamilyActivitySelection? {
    // First check memory cache (current session)
    if let cached = cachedSelections[scheduleId], !cached.applicationTokens.isEmpty {
      return cached
    }
    
    // Check if selection was saved previously
    let key = "\(SAVED_SELECTION_KEY)_\(scheduleId)"
    guard userDefaults.bool(forKey: "\(key)_exists") else {
      return nil
    }
    
    // Try to restore from global selection if available
    // Note: After app restart, tokens in ManagedSettingsStore persist but can't be read
    // This is a limitation of iOS - tokens are security-sensitive and can't be serialized
    // However, blocking will continue to work because ManagedSettingsStore preserves the settings
    if let global = globalActivitySelection, !global.applicationTokens.isEmpty {
      cachedSelections[scheduleId] = global
      return global
    }
    
    // If we have a flag but no tokens, it means app was restarted
    // ManagedSettingsStore still has the tokens for blocking, but we can't restore the selection
    // User will need to re-select apps to modify the schedule
    print("Selection exists for schedule \(scheduleId) but tokens cannot be restored after app restart")
    return nil
  }
  
  // Save global selection (used when no specific schedule)
  public func saveGlobalSelection(_ selection: FamilyActivitySelection) {
    saveSelection(selection, forScheduleId: "global")
  }
  
  // Load global selection
  public func loadGlobalSelection() -> FamilyActivitySelection? {
    return loadSelection(forScheduleId: "global")
  }
  
  // Restore selection to global variable (call this on app start)
  public func restoreSelectionForScheduleId(_ scheduleId: String) {
    if let selection = loadSelection(forScheduleId: scheduleId) {
      globalActivitySelection = selection
      print("Restored selection for schedule \(scheduleId) to global variable")
    } else {
      // Check if blocking is active for this schedule (ManagedSettingsStore preserves it)
      let storeName = scheduleId.isEmpty ? "main" : "schedule_\(scheduleId)"
      let store = ManagedSettingsStore(named: ManagedSettingsStore.Name(storeName))
      if !(store.shield.applications?.isEmpty ?? true) {
        print("Blocking is active for schedule \(scheduleId) (tokens preserved in ManagedSettingsStore)")
        // Note: We can't restore the tokens, but blocking is still active
      }
    }
  }
}

@objc(FamilyActivityPickerModule)
class FamilyActivityPickerModule: NSObject {
  
  private var pickerCompletion: RCTPromiseResolveBlock?
  private var pickerReject: RCTPromiseRejectBlock?
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc func isAuthorized(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      let authorizationCenter = AuthorizationCenter.shared
      let status = await authorizationCenter.authorizationStatus
      
      await MainActor.run {
        switch status {
        case .approved:
          resolve(true)
        default:
          resolve(false)
        }
      }
    }
  }
  
  @objc func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      let authorizationCenter = AuthorizationCenter.shared
      
      do {
        // Check current status first
        let currentStatus = await authorizationCenter.authorizationStatus
        
        // If already approved, return success
        if currentStatus == .approved {
          await MainActor.run {
            resolve(true)
          }
          return
        }
        
        // КРИТИЧЕСКИ ВАЖНО: используйте .individual для самоконтроля
        // Это позволяет использовать Family Controls для всех аккаунтов, не только детских
        try await authorizationCenter.requestAuthorization(for: .individual)
        
        // Check status after request
        let newStatus = await authorizationCenter.authorizationStatus
        await MainActor.run {
          // Return false instead of rejecting if user denied permission
          // This allows the app to handle it gracefully without showing error
          resolve(newStatus == .approved)
        }
      } catch {
        // If user denied or there's a communication error, return false instead of rejecting
        // This prevents error messages when user simply doesn't grant permission
        // or when there are system communication issues (e.g., on simulator)
        // Check status to see if it was denied
        let status = await authorizationCenter.authorizationStatus
        await MainActor.run {
          resolve(status == .approved)
        }
      }
    }
  }
  
  @objc func presentFamilyActivityPicker(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    presentFamilyActivityPickerWithScheduleId("", resolve: resolve, reject: reject)
  }
  
  @objc func presentFamilyActivityPickerWithScheduleId(_ scheduleId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      let authorizationCenter = AuthorizationCenter.shared
      
      // Check authorization status first
      let status = await authorizationCenter.authorizationStatus
      
      // If not authorized, request authorization with .individual
      if status != .approved {
        do {
          // КРИТИЧЕСКИ ВАЖНО: используйте .individual для самоконтроля
          try await authorizationCenter.requestAuthorization(for: .individual)
        } catch {
          // Ignore errors - continue to show picker anyway
        }
      }
      
      // Load previously saved selection for this schedule
      let savedSelection = scheduleId.isEmpty 
        ? FamilyActivitySelectionStorage.shared.loadGlobalSelection()
        : FamilyActivitySelectionStorage.shared.loadSelection(forScheduleId: scheduleId)
      
      // Show the picker - it will handle authorization if needed
      await MainActor.run {
        self.pickerCompletion = resolve
        self.pickerReject = reject
        
        // Create the picker view with state, pre-filled with saved selection if available
        let pickerView = FamilyActivityPickerViewWrapper(
          initialSelection: savedSelection,
          onSelection: { [weak self] selection in
            guard let self = self else { return }
            
            // Store the selection globally
            globalActivitySelection = selection
            
            // Save selection persistently
            if scheduleId.isEmpty {
              FamilyActivitySelectionStorage.shared.saveGlobalSelection(selection)
            } else {
              FamilyActivitySelectionStorage.shared.saveSelection(selection, forScheduleId: scheduleId)
            }
            
            // Return identifiers (we can't serialize tokens, so return count)
            var appIdentifiers: [String] = []
            for (index, _) in selection.applicationTokens.enumerated() {
              appIdentifiers.append("app_\(index)")
            }
            
            // Call completion
            if let completion = self.pickerCompletion {
              completion(appIdentifiers)
              self.pickerCompletion = nil
              self.pickerReject = nil
            }
          }
        )
        
        // Present the picker directly
        let hostingController = UIHostingController(rootView: pickerView)
        hostingController.modalPresentationStyle = .pageSheet
        
        // Find the topmost view controller that can present modally
        func findTopViewController(_ viewController: UIViewController?) -> UIViewController? {
          if let presented = viewController?.presentedViewController {
            return findTopViewController(presented)
          }
          if let nav = viewController as? UINavigationController {
            return findTopViewController(nav.visibleViewController)
          }
          if let tab = viewController as? UITabBarController {
            return findTopViewController(tab.selectedViewController)
          }
          return viewController
        }
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
          resolve([])
          self.pickerCompletion = nil
          self.pickerReject = nil
          return
        }
        
        let topViewController = findTopViewController(rootViewController) ?? rootViewController
        
        // Check if there's already a presented view controller
        if topViewController.presentedViewController != nil {
          // Dismiss existing modal first, then present picker
          topViewController.dismiss(animated: true) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
              topViewController.present(hostingController, animated: true)
            }
          }
        } else {
          // No existing modal, present directly
          topViewController.present(hostingController, animated: true)
        }
      }
    }
  }
  
  @objc func getSelectedApplications(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    getSelectedApplicationsForScheduleId("", resolve: resolve, reject: reject)
  }
  
  @objc func getSelectedApplicationsForScheduleId(_ scheduleId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // Try to load from storage first
    let storedSelection: FamilyActivitySelection? = scheduleId.isEmpty
      ? FamilyActivitySelectionStorage.shared.loadGlobalSelection()
      : FamilyActivitySelectionStorage.shared.loadSelection(forScheduleId: scheduleId)
    
    // Use stored selection or fallback to global
    let selection = storedSelection ?? globalActivitySelection
    
    if let selection = selection, !selection.applicationTokens.isEmpty {
      var appIdentifiers: [String] = []
      for (index, _) in selection.applicationTokens.enumerated() {
        appIdentifiers.append("app_\(index)")
      }
      resolve(appIdentifiers)
    } else {
      resolve([])
    }
  }
  
  @objc func loadSavedSelectionForScheduleId(_ scheduleId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let selection: FamilyActivitySelection? = scheduleId.isEmpty
      ? FamilyActivitySelectionStorage.shared.loadGlobalSelection()
      : FamilyActivitySelectionStorage.shared.loadSelection(forScheduleId: scheduleId)
    
    if let selection = selection {
      globalActivitySelection = selection
      var appIdentifiers: [String] = []
      for (index, _) in selection.applicationTokens.enumerated() {
        appIdentifiers.append("app_\(index)")
      }
      resolve(appIdentifiers)
    } else {
      resolve([])
    }
  }
}

// SwiftUI view wrapper for FamilyActivityPicker
// Use @State binding for FamilyActivityPicker
struct FamilyActivityPickerViewWrapper: View {
  let initialSelection: FamilyActivitySelection?
  let onSelection: (FamilyActivitySelection) -> Void
  @State private var selection: FamilyActivitySelection
  @Environment(\.dismiss) private var dismiss
  
  init(initialSelection: FamilyActivitySelection? = nil, onSelection: @escaping (FamilyActivitySelection) -> Void) {
    self.initialSelection = initialSelection
    self.onSelection = onSelection
    // Initialize state with saved selection if available
    _selection = State(initialValue: initialSelection ?? FamilyActivitySelection())
  }
  
  var body: some View {
    NavigationView {
      VStack(spacing: 0) {
        // Use FamilyActivityPicker with @State binding
        // FamilyActivityPicker will automatically request authorization if needed
        FamilyActivityPicker(selection: $selection)
          .onChange(of: selection) { newSelection in
            // Update global selection in real-time as user selects apps
            globalActivitySelection = newSelection
          }
      }
      .navigationTitle("Select Apps")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button("Done") {
            // Call selection callback with current selection
            onSelection(selection)
            dismiss()
          }
        }
        ToolbarItem(placement: .navigationBarLeading) {
          Button("Cancel") {
            // Return empty selection on cancel
            onSelection(FamilyActivitySelection())
            dismiss()
          }
        }
      }
    }
  }
}

