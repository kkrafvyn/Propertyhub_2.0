Pod::Spec.new do |spec|
  spec.name = 'IONGeolocationLib'
  spec.version = '2.1.0'
  spec.summary = 'Source-built iOS geolocation library for Capacitor.'
  spec.description = 'Local source build of IONGeolocationLib 2.1.0 for toolchain compatibility.'
  spec.homepage = 'https://github.com/ionic-team/ion-ios-geolocation'
  spec.license = { :type => 'MIT', :file => 'LICENSE' }
  spec.authors = { 'Ionic' => 'support@ionic.io' }
  spec.source = { :path => '.' }
  spec.source_files = 'Sources/**/*.{swift}'
  spec.ios.deployment_target = '15.0'
  spec.swift_version = '5.0'
  spec.frameworks = 'CoreLocation', 'Combine'
end
