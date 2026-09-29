import Combine
import CoreLocation

public typealias IONGLOCService = IONGLOCServicesChecker & IONGLOCAuthorisationHandler & IONGLOCSingleLocationHandler & IONGLOCMonitorLocationHandler

public struct IONGLOCServicesValidator: IONGLOCServicesChecker {
    public init() {}

    public func areLocationServicesEnabled() -> Bool {
        CLLocationManager.locationServicesEnabled()
    }
}

public class IONGLOCManagerWrapper: NSObject, IONGLOCService {
    @Published public var authorisationStatus: IONGLOCAuthorisation
    public var authorisationStatusPublisher: Published<IONGLOCAuthorisation>.Publisher { $authorisationStatus }

    @Published public var currentLocation: IONGLOCPositionModel?
    private var timeoutCancellable: AnyCancellable?
    public var currentLocationPublisher: AnyPublisher<IONGLOCPositionModel, IONGLOCLocationError> {
        Publishers.Merge($currentLocation, currentLocationForceSubject)
            .dropFirst()
            .tryMap { location in
                guard let location else { throw IONGLOCLocationError.locationUnavailable }
                return location
            }
            .mapError { $0 as? IONGLOCLocationError ?? .other($0) }
            .eraseToAnyPublisher()
    }

    public var locationTimeoutPublisher: AnyPublisher<IONGLOCLocationError, Never> {
        locationTimeoutSubject.eraseToAnyPublisher()
    }

    private let currentLocationForceSubject = PassthroughSubject<IONGLOCPositionModel?, Never>()
    private let locationTimeoutSubject = PassthroughSubject<IONGLOCLocationError, Never>()
    private let locationManager: CLLocationManager
    private let servicesChecker: IONGLOCServicesChecker
    private var isMonitoringLocation = false
    private var lastLocation: CLLocation?
    private var lastHeading: CLHeading?
    private var timeoutTriggered = false

    public init(locationManager: CLLocationManager = .init(), servicesChecker: IONGLOCServicesChecker = IONGLOCServicesValidator()) {
        self.locationManager = locationManager
        self.servicesChecker = servicesChecker
        self.authorisationStatus = locationManager.currentAuthorisationValue

        super.init()
        locationManager.delegate = self
        locationManager.headingFilter = 1.0
    }

    public func requestAuthorisation(withType authorisationType: IONGLOCAuthorisationRequestType) {
        authorisationType.requestAuthorization(using: locationManager)
    }

    public func startMonitoringLocation(options: IONGLOCRequestOptionsModel) {
        timeoutTriggered = false
        isMonitoringLocation = true
        locationManager.startUpdatingLocation()
        locationManager.startUpdatingHeading()
        startTimer(timeout: options.timeout)
    }

    public func startMonitoringLocation() {
        guard !timeoutTriggered else { return }
        isMonitoringLocation = true
        locationManager.startUpdatingLocation()
        locationManager.startUpdatingHeading()
    }

    public func stopMonitoringLocation() {
        isMonitoringLocation = false
        locationManager.stopUpdatingLocation()
        locationManager.stopUpdatingHeading()
    }

    public func requestSingleLocation(options: IONGLOCRequestOptionsModel) {
        timeoutTriggered = false
        if isMonitoringLocation, let location = currentLocation {
            currentLocationForceSubject.send(location)
            return
        }

        locationManager.requestLocation()
        startTimer(timeout: options.timeout)
    }

    private func startTimer(timeout: Int) {
        timeoutCancellable?.cancel()
        timeoutCancellable = Just(())
            .delay(for: .milliseconds(timeout), scheduler: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self else { return }
                timeoutTriggered = true
                locationTimeoutSubject.send(.timeout)

                if isMonitoringLocation {
                    isMonitoringLocation = false
                    stopMonitoringLocation()
                }

                timeoutCancellable?.cancel()
                timeoutCancellable = nil
            }
    }

    public func updateConfiguration(_ configuration: IONGLOCConfigurationModel) {
        locationManager.desiredAccuracy = configuration.enableHighAccuracy ? kCLLocationAccuracyBest : kCLLocationAccuracyThreeKilometers
        configuration.minimumUpdateDistanceInMeters.map { locationManager.distanceFilter = $0 }
    }

    public func areLocationServicesEnabled() -> Bool {
        servicesChecker.areLocationServicesEnabled()
    }
}

extension IONGLOCManagerWrapper: CLLocationManagerDelegate {
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorisationStatus = manager.currentAuthorisationValue
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard !timeoutTriggered else { return }
        timeoutCancellable?.cancel()
        timeoutCancellable = nil
        guard let lastLocation = locations.last else {
            currentLocation = nil
            self.lastLocation = nil
            lastHeading = nil
            return
        }

        self.lastLocation = lastLocation
        currentLocation = IONGLOCPositionModel.create(from: lastLocation, heading: isMonitoringLocation ? lastHeading : nil)
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: any Error) {
        timeoutCancellable?.cancel()
        timeoutCancellable = nil
        currentLocation = nil
        lastLocation = nil
        lastHeading = nil
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard lastLocation != nil else { return }
        lastHeading = newHeading
    }
}
