Pod::Spec.new do |s|
  s.name           = 'ScreenTimeModule'
  s.version        = '1.0.0'
  s.summary        = 'Screen Time module for React Native'
  s.description    = 'Native module for Screen Time API integration'
  s.author         = 'Developer'
  s.homepage       = 'https://github.com/example/screen-time-module'
  s.platforms      = { :ios => '16.0' }
  s.source         = { :git => 'https://github.com/example/screen-time-module.git', :tag => "v#{s.version}" }
  s.source_files   = '*.{h,m,swift}'
  s.requires_arc   = true
  s.swift_version  = '5.0'
  
  s.dependency 'React-Core'
  s.dependency 'FamilyActivityPickerModule'
  
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity'
end
