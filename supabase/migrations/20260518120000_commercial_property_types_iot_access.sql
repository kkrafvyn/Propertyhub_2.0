-- Adds first-class support for commercial property classes and their Smart Property Access devices.
-- No blockchain/Web3 objects are introduced here.

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_category_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_category_check
CHECK (
  category IN (
    'apartment',
    'house',
    'office',
    'commercial',
    'warehouse',
    'car_park',
    'office_complex',
    'land'
  )
);

ALTER TABLE public.property_iot_devices
DROP CONSTRAINT IF EXISTS property_iot_devices_device_type_check;

ALTER TABLE public.property_iot_devices
ADD CONSTRAINT property_iot_devices_device_type_check
CHECK (
  device_type IN (
    'smart_lock',
    'gate_access',
    'parking_gate',
    'dock_door',
    'smart_meter',
    'door_sensor',
    'motion_sensor',
    'energy_monitor',
    'warehouse_sensor',
    'occupancy_counter',
    'cctv_link'
  )
);

COMMENT ON CONSTRAINT properties_category_check ON public.properties IS
  'Allowed BaytMiftah property categories, including warehouses, car parks, and office complexes.';

COMMENT ON CONSTRAINT property_iot_devices_device_type_check ON public.property_iot_devices IS
  'Allowed Smart Property Access device categories, including parking, dock-door, warehouse, occupancy, and CCTV records.';

NOTIFY pgrst, 'reload schema';
