export const developerProfile = {
  name: 'Anchorstone Developments',
  activeProjects: 3,
  unitsTotal: 84,
  unitsSold: 52,
  constructionProgress: '68%',
}

export const developerProjects = [
  {
    id: 'dp1',
    name: 'Skyline Residences',
    location: 'East Legon, Accra',
    units: 32,
    sold: 24,
    status: 'construction',
    completion: '2026-Q4',
    progress: 72,
  },
  {
    id: 'dp2',
    name: 'Harbour View Towers',
    location: 'Tema, Greater Accra',
    units: 48,
    sold: 18,
    status: 'pre_sale',
    completion: '2027-Q2',
    progress: 15,
  },
  {
    id: 'dp3',
    name: 'Ridge Executive Suites',
    location: 'Ridge, Accra',
    units: 12,
    sold: 10,
    status: 'finishing',
    completion: '2026-Q3',
    progress: 91,
  },
]

export const constructionMilestones = [
  { id: 'm1', project: 'Skyline Residences', milestone: 'Foundation complete', date: '2025-11-15', status: 'done' },
  { id: 'm2', project: 'Skyline Residences', milestone: 'Structural frame', date: '2026-03-20', status: 'done' },
  { id: 'm3', project: 'Skyline Residences', milestone: 'MEP installation', date: '2026-06-30', status: 'in_progress' },
  { id: 'm4', project: 'Harbour View Towers', milestone: 'Site preparation', date: '2026-05-01', status: 'done' },
  { id: 'm5', project: 'Ridge Executive Suites', milestone: 'Interior fit-out', date: '2026-07-15', status: 'scheduled' },
]

export const developerBuyers = [
  { id: 'b1', name: 'Sarah A.', project: 'Ridge Executive Suites', unit: 'PH-01', stage: 'contract_signed', paid: '65%' },
  { id: 'b2', name: 'James O.', project: 'Skyline Residences', unit: '12A', stage: 'deposit_paid', paid: '20%' },
  { id: 'b3', name: 'Grace M.', project: 'Harbour View Towers', unit: '8B', stage: 'viewing', paid: '0%' },
]

export const developerUnits = [
  { id: 'du1', project_id: 'dp1', unit_number: '12A', floor: 12, bedrooms: 3, sqft: 1450, price: 920000, status: 'sold' },
  { id: 'du2', project_id: 'dp1', unit_number: '12B', floor: 12, bedrooms: 2, sqft: 1100, price: 780000, status: 'available' },
  { id: 'du3', project_id: 'dp2', unit_number: '8B', floor: 8, bedrooms: 2, sqft: 980, price: 650000, status: 'reserved' },
  { id: 'du4', project_id: 'dp3', unit_number: 'PH-01', floor: 20, bedrooms: 4, sqft: 2200, price: 2100000, status: 'sold' },
]
