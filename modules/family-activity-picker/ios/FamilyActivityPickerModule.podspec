Pod::Spec.new do |s|
  s.name           = 'FamilyActivityPickerModule'
  s.version        = '1.0.0'
  s.summary        = 'Family Activity Picker module for React Native'
  s.description    = 'Native module for Family Activity Picker integration'
  s.author         = 'Developer'
  s.homepage       = 'https://github.com/example/family-activity-picker-module'
  s.platforms      = { :ios => '16.0' }
  s.source         = { :git => 'https://github.com/example/family-activity-picker-module.git', :tag => "v#{s.version}" }
  s.source_files   = '*.{h,m,swift}'
  s.requires_arc   = true
  s.swift_version  = '5.0'
  
  s.dependency 'React-Core'
  
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'SwiftUI'
end
