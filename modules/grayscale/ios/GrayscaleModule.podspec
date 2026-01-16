Pod::Spec.new do |s|
  s.name           = 'GrayscaleModule'
  s.version        = '1.0.0'
  s.summary        = 'Grayscale module for React Native'
  s.description    = 'Native module for grayscale screen filter'
  s.author         = 'Developer'
  s.homepage       = 'https://github.com/example/grayscale-module'
  s.platforms      = { :ios => '16.0' }
  s.source         = { :git => 'https://github.com/example/grayscale-module.git', :tag => "v#{s.version}" }
  s.source_files   = '*.{h,m,swift}'
  s.requires_arc   = true
  s.swift_version  = '5.0'
  
  s.dependency 'React-Core'
end
