Pod::Spec.new do |s|
  s.name           = 'AppIconsModule'
  s.version        = '1.0.0'
  s.summary        = 'Display selected app icons from FamilyActivitySelection'
  s.description    = 'Native module to display app icons using SwiftUI Label(ApplicationToken)'
  s.author         = 'Developer'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.2' }
  s.source         = { :git => 'https://example.com' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.swift_version  = '5.4'
end
