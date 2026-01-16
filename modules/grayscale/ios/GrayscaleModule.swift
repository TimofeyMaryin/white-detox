import Foundation
import UIKit
import React

@objc(GrayscaleModule)
public class GrayscaleModule: NSObject {
  
  @objc public static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc func enableGrayscale(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // iOS doesn't allow apps to directly enable/disable color filters
      // We can only open Settings where user can enable it manually
      // The filter path is: Settings > Accessibility > Display & Text Size > Color Filters
      if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
        if UIApplication.shared.canOpenURL(settingsURL) {
          UIApplication.shared.open(settingsURL) { success in
            resolve(success)
          }
        } else {
          reject("SETTINGS_ERROR", "Cannot open Settings", nil)
        }
      } else {
        reject("SETTINGS_ERROR", "Invalid Settings URL", nil)
      }
    }
  }
  
  @objc func disableGrayscale(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Same as enable - we can only open Settings
      if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
        if UIApplication.shared.canOpenURL(settingsURL) {
          UIApplication.shared.open(settingsURL) { success in
            resolve(success)
          }
        } else {
          reject("SETTINGS_ERROR", "Cannot open Settings", nil)
        }
      } else {
        reject("SETTINGS_ERROR", "Invalid Settings URL", nil)
      }
    }
  }
  
  @objc func isGrayscaleEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Check if grayscale color filter is enabled using UIAccessibility
      // This checks the actual system setting for color filters
      let isEnabled = UIAccessibility.isGrayscaleEnabled
      resolve(isEnabled)
    }
  }
}

