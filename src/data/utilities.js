/** Demo fallback data for Utility Management Engine */

export const demoProviders = [
  { id: 'gh-ecg', country: 'GH', utility_type: 'electricity', provider_name: 'ECG (Electricity Company of Ghana)', billing_model: 'metered' },
  { id: 'gh-water', country: 'GH', utility_type: 'water', provider_name: 'Ghana Water Company', billing_model: 'metered' },
  { id: 'gh-mtn-fiber', country: 'GH', utility_type: 'internet', provider_name: 'MTN Home Fiber', billing_model: 'flat' },
  { id: 'gh-telecel', country: 'GH', utility_type: 'internet', provider_name: 'Telecel Broadband', billing_model: 'flat' },
  { id: 'gh-airteltigo', country: 'GH', utility_type: 'internet', provider_name: 'AirtelTigo Home', billing_model: 'flat' },
  { id: 'gh-gas-vendor', country: 'GH', utility_type: 'gas', provider_name: 'Local LPG Vendor', billing_model: 'flat' },
]

export const demoPropertyUtilities = [
  { id: 'pu-east-ecg', property_id: 'east-legon-family-home', utility_type: 'electricity', provider_name: 'ECG (Electricity Company of Ghana)', billing_model: 'metered', rate_per_unit: 1.25, fixed_monthly_fee: 0, enabled: true },
  { id: 'pu-east-water', property_id: 'east-legon-family-home', utility_type: 'water', provider_name: 'Ghana Water Company', billing_model: 'metered', rate_per_unit: 0.85, fixed_monthly_fee: 0, enabled: true },
  { id: 'pu-east-internet', property_id: 'east-legon-family-home', utility_type: 'internet', provider_name: 'MTN Home Fiber', billing_model: 'flat', rate_per_unit: 0, fixed_monthly_fee: 350, enabled: true },
  { id: 'pu-east-gas', property_id: 'east-legon-family-home', utility_type: 'gas', provider_name: 'Local LPG Vendor', billing_model: 'flat', rate_per_unit: 0, fixed_monthly_fee: 180, enabled: true },
]

export const demoUtilityAccount = {
  id: 'ua-demo-001',
  user_id: 'demo-user',
  property_id: 'east-legon-family-home',
  active: true,
  utilities_mode: 'billed',
}

export const demoUtilityBills = [
  { id: 'ub-demo-ecg', utility_account_id: 'ua-demo-001', utility_type: 'electricity', provider_name: 'ECG (Electricity Company of Ghana)', amount: 187.5, usage_units: 150, billing_month: '2026-06', status: 'unpaid', due_date: '2026-06-15' },
  { id: 'ub-demo-water', utility_account_id: 'ua-demo-001', utility_type: 'water', provider_name: 'Ghana Water Company', amount: 42.5, usage_units: 50, billing_month: '2026-06', status: 'unpaid', due_date: '2026-06-15' },
  { id: 'ub-demo-internet', utility_account_id: 'ua-demo-001', utility_type: 'internet', provider_name: 'MTN Home Fiber', amount: 350, usage_units: null, billing_month: '2026-06', status: 'unpaid', due_date: '2026-06-15' },
  { id: 'ub-demo-gas', utility_account_id: 'ua-demo-001', utility_type: 'gas', provider_name: 'Local LPG Vendor', amount: 180, usage_units: null, billing_month: '2026-06', status: 'paid', due_date: '2026-06-01', paid_at: '2026-06-02T10:00:00Z' },
]

export const demoMeterReadings = [
  { id: 'mr-demo-ecg', utility_account_id: 'ua-demo-001', utility_type: 'electricity', previous_reading: 1200, current_reading: 1350, units_used: 150, recorded_by: 'landlord', reading_date: '2026-06-01' },
  { id: 'mr-demo-water', utility_account_id: 'ua-demo-001', utility_type: 'water', previous_reading: 400, current_reading: 450, units_used: 50, recorded_by: 'landlord', reading_date: '2026-06-01' },
]
