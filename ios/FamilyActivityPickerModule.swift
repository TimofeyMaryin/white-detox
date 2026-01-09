import Foundation
import FamilyControls
import ManagedSettings
import SwiftUI
import React

// Store the selection globally for use in blocking
// Note: We'll store it directly from the picker callback
var globalActivitySelection: FamilyActivitySelection?

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
      
      // Show the picker - it will handle authorization if needed
      await MainActor.run {
        self.pickerCompletion = resolve
        self.pickerReject = reject
        
        // Create the picker view with state
        let pickerView = FamilyActivityPickerViewWrapper(
          onSelection: { [weak self] selection in
            guard let self = self else { return }
            
            // Store the selection globally
            globalActivitySelection = selection
            
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
    // Return the stored selection identifiers
    if let selection = globalActivitySelection {
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
  let onSelection: (FamilyActivitySelection) -> Void
  @State private var selection = FamilyActivitySelection()
  @Environment(\.dismiss) private var dismiss
  
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
