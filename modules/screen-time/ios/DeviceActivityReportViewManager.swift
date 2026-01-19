import Foundation
import SwiftUI
import DeviceActivity
import FamilyControls
import React

// MARK: - DeviceActivityReport SwiftUI View

@available(iOS 16.0, *)
struct DeviceActivityReportSwiftUIView: View {
    let filter: DeviceActivityFilter
    
    var body: some View {
        DeviceActivityReport(.totalActivity, filter: filter)
            .frame(maxWidth: .infinity, minHeight: 1)
    }
}

// MARK: - Context Extension (must match the Extension's context "TotalActivity")

@available(iOS 16.0, *)
extension DeviceActivityReport.Context {
    static let totalActivity = Self("TotalActivity")
}

// MARK: - UIKit Hosting Controller

@available(iOS 16.0, *)
class DeviceActivityReportHostingController: UIViewController {
    private var hostingController: UIHostingController<DeviceActivityReportSwiftUIView>?
    private var currentFilter: DeviceActivityFilter
    
    init(filter: DeviceActivityFilter) {
        self.currentFilter = filter
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupHostingController()
    }
    
    private func setupHostingController() {
        let reportView = DeviceActivityReportSwiftUIView(filter: currentFilter)
        let hosting = UIHostingController(rootView: reportView)
        
        addChild(hosting)
        view.addSubview(hosting.view)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        hosting.didMove(toParent: self)
        hostingController = hosting
        
        hosting.view.backgroundColor = .clear
        view.backgroundColor = .clear
    }
}

// MARK: - React Native View

@objc(DeviceActivityReportView)
class DeviceActivityReportView: UIView {
    private var hostingController: UIViewController?
    private var period: String = "day"
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        backgroundColor = .clear
        
        guard #available(iOS 16.0, *) else {
            print("[DeviceActivityReportView] iOS 16.0+ required")
            return
        }
        
        updateReportView()
    }
    
    @objc var periodType: String = "day" {
        didSet {
            if period != periodType {
                period = periodType
                if #available(iOS 16.0, *) {
                    updateReportView()
                }
            }
        }
    }
    
    @available(iOS 16.0, *)
    private func updateReportView() {
        hostingController?.view.removeFromSuperview()
        hostingController = nil
        
        let calendar = Calendar.current
        let now = Date()
        
        var startDate: Date
        let endDate = now
        
        switch period.lowercased() {
        case "week":
            startDate = calendar.date(byAdding: .day, value: -6, to: calendar.startOfDay(for: now)) ?? now
        case "month":
            startDate = calendar.date(byAdding: .day, value: -30, to: calendar.startOfDay(for: now)) ?? now
        default:
            startDate = calendar.startOfDay(for: now)
        }
        
        let filter = DeviceActivityFilter(
            segment: .daily(
                during: DateInterval(start: startDate, end: endDate)
            ),
            users: .all,
            devices: .init([.iPhone])
        )
        
        let controller = DeviceActivityReportHostingController(filter: filter)
        
        if let parentVC = findViewController() {
            parentVC.addChild(controller)
            addSubview(controller.view)
            controller.view.translatesAutoresizingMaskIntoConstraints = false
            
            NSLayoutConstraint.activate([
                controller.view.topAnchor.constraint(equalTo: topAnchor),
                controller.view.leadingAnchor.constraint(equalTo: leadingAnchor),
                controller.view.trailingAnchor.constraint(equalTo: trailingAnchor),
                controller.view.bottomAnchor.constraint(equalTo: bottomAnchor)
            ])
            
            controller.didMove(toParent: parentVC)
            hostingController = controller
        }
        
        print("[DeviceActivityReportView] Rendered report for period: \(period)")
    }
    
    private func findViewController() -> UIViewController? {
        var responder: UIResponder? = self
        while let nextResponder = responder?.next {
            if let viewController = nextResponder as? UIViewController {
                return viewController
            }
            responder = nextResponder
        }
        return nil
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        hostingController?.view.frame = bounds
    }
}

// MARK: - React Native View Manager

@objc(DeviceActivityReportViewManager)
class DeviceActivityReportViewManager: RCTViewManager {
    
    override func view() -> UIView! {
        return DeviceActivityReportView()
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
