import ExpoModulesCore
import FamilyControls
import SwiftUI

@available(iOS 15.2, *)
public class AppIconsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppIcons")
    
    View(AppIconsView.self) {
      Prop("familyActivitySelectionId") { (view: AppIconsView, id: String?) in
        view.setSelectionId(id)
      }
      
      Prop("iconSize") { (view: AppIconsView, size: Double?) in
        view.setIconSize(size ?? 44)
      }
      
      Prop("maxIcons") { (view: AppIconsView, max: Int?) in
        view.setMaxIcons(max ?? 10)
      }
    }
  }
}

// MARK: - AppIconsView

@available(iOS 15.2, *)
class AppIconsView: ExpoView {
  private var hostingController: UIHostingController<AppIconsSwiftUIView>?
  private var selectionId: String?
  private var iconSize: Double = 44
  private var maxIcons: Int = 10
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupView()
  }
  
  private func setupView() {
    let swiftUIView = AppIconsSwiftUIView(
      selectionId: selectionId,
      iconSize: iconSize,
      maxIcons: maxIcons
    )
    
    let hostingController = UIHostingController(rootView: swiftUIView)
    hostingController.view.backgroundColor = .clear
    self.hostingController = hostingController
    
    addSubview(hostingController.view)
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }
  
  func setSelectionId(_ id: String?) {
    selectionId = id
    updateView()
  }
  
  func setIconSize(_ size: Double) {
    iconSize = size
    updateView()
  }
  
  func setMaxIcons(_ max: Int) {
    maxIcons = max
    updateView()
  }
  
  private func updateView() {
    let swiftUIView = AppIconsSwiftUIView(
      selectionId: selectionId,
      iconSize: iconSize,
      maxIcons: maxIcons
    )
    hostingController?.rootView = swiftUIView
  }
}

// MARK: - SwiftUI View

@available(iOS 15.2, *)
struct AppIconsSwiftUIView: View {
  let selectionId: String?
  let iconSize: Double
  let maxIcons: Int
  
  var body: some View {
    if let id = selectionId, let selection = loadSelection(id: id) {
      let tokens = Array(selection.applicationTokens.prefix(maxIcons))
      let remainingSlots = max(0, maxIcons - tokens.count)
      let categoryTokens = Array(selection.categoryTokens.prefix(remainingSlots))
      let totalSelected = selection.applicationTokens.count + selection.categoryTokens.count
      let totalShown = tokens.count + categoryTokens.count
      
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          // App icons
          ForEach(tokens.indices, id: \.self) { index in
            Label(tokens[index])
              .labelStyle(.iconOnly)
              .frame(width: iconSize, height: iconSize)
              .background(Color(.systemGray6))
              .clipShape(RoundedRectangle(cornerRadius: iconSize * 0.22))
          }
          
          // Category icons
          ForEach(categoryTokens.indices, id: \.self) { index in
            Label(categoryTokens[index])
              .labelStyle(.iconOnly)
              .frame(width: iconSize, height: iconSize)
              .background(Color(.systemGray6))
              .clipShape(RoundedRectangle(cornerRadius: iconSize * 0.22))
          }
          
          // Show remaining count
          if totalSelected > totalShown {
            let remaining = totalSelected - totalShown
            Text("+\(remaining)")
              .font(.system(size: iconSize * 0.35, weight: .semibold))
              .foregroundColor(.white)
              .frame(width: iconSize, height: iconSize)
              .background(Color.gray.opacity(0.6))
              .clipShape(RoundedRectangle(cornerRadius: iconSize * 0.22))
          }
        }
        .padding(.horizontal, 4)
      }
    } else {
      // Empty state - no selection
      EmptyView()
    }
  }
  
  // MARK: - Load Selection
  
  private func loadSelection(id: String) -> FamilyActivitySelection? {
    // Get app group from Info.plist (same key as react-native-device-activity)
    let appGroup = Bundle.main.object(forInfoDictionaryKey: "REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP") as? String
      ?? "group.com.danielian.selfcontrol.dopaminedetox"
    
    guard let userDefaults = UserDefaults(suiteName: appGroup) else {
      print("[AppIcons] Failed to access UserDefaults for app group: \(appGroup)")
      return nil
    }
    
    // Key used by react-native-device-activity
    let storageKey = "familyActivitySelectionIds"
    
    guard let selectionDict = userDefaults.dictionary(forKey: storageKey),
          let selectionStr = selectionDict[id] as? String else {
      print("[AppIcons] No selection found for id: \(id)")
      return nil
    }
    
    // Deserialize from base64-encoded JSON (same format as react-native-device-activity)
    guard let data = Data(base64Encoded: selectionStr) else {
      print("[AppIcons] Failed to decode base64 data")
      return nil
    }
    
    do {
      let decoder = JSONDecoder()
      let selection = try decoder.decode(FamilyActivitySelection.self, from: data)
      return selection
    } catch {
      print("[AppIcons] Failed to decode FamilyActivitySelection: \(error)")
      return nil
    }
  }
}
