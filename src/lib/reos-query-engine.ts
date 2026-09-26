import { secureId } from './secure-id';

/**
 * BaytMiftah Real Estate Operating System (REOS) Query Engine
 * Translates natural language inputs and operational prompts into multi-dialect structured Query Languages:
 * - REOS-QL (Domain Specific Query Language for Real Estate Operations)
 * - PostgreSQL / Supabase SQL (Production Relational Database Queries)
 * - Supabase PostgREST JS (Client SDK Query Expressions)
 * - GraphQL / Filter AST (Typed API & UI filter payloads)
 */

export type QueryDialect = 'reos-ql' | 'sql' | 'supabase-js' | 'graphql' | 'json-ast';

export interface ReosQueryBundle {
  id: string;
  summary: string;
  intent: string;
  targetEntities: string[];
  reosQl: string;
  sql: string;
  supabaseJs: string;
  graphql: string;
  jsonAst: Record<string, unknown>;
  executionPlan: {
    tables: string[];
    indexUsed?: string;
    estimatedRows?: string;
    rlsPolicy: string;
    deterministic: boolean;
  };
  executable: boolean;
  runTarget?: {
    type: 'search' | 'workspace' | 'payments' | 'maintenance' | 'documents' | 'leads';
    url: string;
    params?: Record<string, unknown>;
  };
}

export function parseNaturalLanguageToParams(input: string) {
  const lower = input.toLowerCase();
  const params: {
    location?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    listingType?: 'rental' | 'sale' | 'lease' | 'short_stay';
    propertyType?: string;
    arrearsDays?: number;
    slaStatus?: string;
    contractorCategory?: string;
    leaseExpiryDays?: number;
    status?: string;
    unitNumber?: string;
    estateName?: string;
  } = {};

  // Pricing
  const priceUnder = input.match(/(?:under|below|less than|max|<=?)\s*(?:ghs|₵|\$)?\s*(\d+[\d,]*)/i);
  if (priceUnder) params.priceMax = parseInt(priceUnder[1].replace(/,/g, ''), 10);

  const priceRange = input.match(/(\d+[\d,]*)\s*(?:to|-)\s*(\d+[\d,]*)/i);
  if (priceRange) {
    params.priceMin = parseInt(priceRange[1].replace(/,/g, ''), 10);
    params.priceMax = parseInt(priceRange[2].replace(/,/g, ''), 10);
  }

  // Bedrooms & Bathrooms
  const bedMatch = input.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  if (bedMatch) params.bedrooms = parseInt(bedMatch[1], 10);

  const bathMatch = input.match(/(\d+)\s*(?:bath|bathroom)/i);
  if (bathMatch) params.bathrooms = parseInt(bathMatch[1], 10);

  // Listing Types
  if (/(rent|rental|monthly|tenant)/i.test(input)) params.listingType = 'rental';
  if (/(buy|sale|purchase|for sale)/i.test(input)) params.listingType = 'sale';
  if (/(lease|commercial lease)/i.test(input)) params.listingType = 'lease';
  if (/(short stay|airbnb|nightly|vacation)/i.test(input)) params.listingType = 'short_stay';

  // Property Types
  if (/(apartment|flat|condo)/i.test(input)) params.propertyType = 'apartment';
  if (/(house|home|villa|townhouse)/i.test(input)) params.propertyType = 'house';
  if (/(office|workspace|commercial)/i.test(input)) params.propertyType = 'office';
  if (/(land|plot|acre)/i.test(input)) params.propertyType = 'land';

  // Locations
  const knownLocations = [
    'east legon', 'airport residential', 'cantonments', 'osu', 'labone',
    'ridge', 'dzorwulu', 'roman ridge', 'tema', 'kumasi', 'legon', 'spintex', 'accra'
  ];
  for (const loc of knownLocations) {
    if (lower.includes(loc)) {
      params.location = loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  // Arrears / Ledger
  const arrearsMatch = input.match(/(?:arrears|overdue)\s*(?:>|>=|over|more than|past)?\s*(\d+)\s*days?/i);
  if (arrearsMatch) params.arrearsDays = parseInt(arrearsMatch[1], 10);
  else if (/overdue|arrears/i.test(input)) params.arrearsDays = 30;

  // Lease Expiry
  const expiryMatch = input.match(/(?:expir(?:e|ing|y))\s*(?:in|within|next)?\s*(\d+)\s*days?/i);
  if (expiryMatch) params.leaseExpiryDays = parseInt(expiryMatch[1], 10);
  else if (/expir/i.test(input)) params.leaseExpiryDays = 60;

  // Maintenance & Contractors
  if (/\b(?:sla|breach|breached|overdue ticket|late)\b/i.test(input)) params.slaStatus = 'breached';
  if (/\b(?:plumb|plumbing|water leak|pipe|pipes)\b/i.test(input)) params.contractorCategory = 'plumbing';
  if (/\b(?:electric|electrical|generator|power)\b/i.test(input)) params.contractorCategory = 'electrical';
  if (/\b(?:ac|air condition|air conditioner|air conditioning|hvac)\b/i.test(input)) params.contractorCategory = 'hvac';

  return params;
}

export function generateReosQueryBundle(prompt: string, context: string = 'search'): ReosQueryBundle {
  const p = parseNaturalLanguageToParams(prompt);
  const lower = prompt.toLowerCase();
  const id = secureId('reos-q');

  // 1. Finance & Arrears / Ledger Queries
  if (lower.includes('arrear') || lower.includes('overdue') || lower.includes('ledger') || lower.includes('balance') || context === 'payments') {
    const days = p.arrearsDays || 30;
    const locFilter = p.location ? `AND e.name ILIKE '%${p.location}%'` : '';
    const locReos = p.location ? `AND estate = '${p.location}'` : '';

    return {
      id,
      summary: `Overdue balances & tenant arrears exceeding ${days} days${p.location ? ` in ${p.location}` : ''}`,
      intent: 'Financial reconciliation & aged receivables recovery query across immutable ledger charges',
      targetEntities: ['charges', 'payment_allocations', 'units', 'occupancies', 'estates'],
      reosQl: `QUERY ledger_charges 
  JOIN occupancies ON unit_id
  JOIN estates ON estate_id
WHERE days_overdue >= ${days}
  AND balance_due > 0 
  ${locReos}
ORDER BY balance_due DESC, days_overdue DESC
LIMIT 50
SAFETY RLS_ORG_ENFORCED;`,
      sql: `SELECT 
    u.id AS unit_id,
    u.unit_number,
    e.name AS estate_name,
    p.full_name AS tenant_name,
    p.phone AS tenant_phone,
    SUM(c.amount - COALESCE(pa.allocated_amount, 0)) AS balance_due,
    MAX(CURRENT_DATE - c.due_date) AS max_days_overdue
FROM units u
JOIN estates e ON u.estate_id = e.id
JOIN occupancies occ ON occ.unit_id = u.id AND occ.status = 'active'
JOIN profiles p ON occ.resident_id = p.id
JOIN charges c ON c.unit_id = u.id AND c.status IN ('due', 'overdue')
LEFT JOIN (
    SELECT charge_id, SUM(amount) AS allocated_amount 
    FROM payment_allocations 
    GROUP BY charge_id
) pa ON pa.charge_id = c.id
WHERE (c.amount - COALESCE(pa.allocated_amount, 0)) > 0
  AND (CURRENT_DATE - c.due_date) >= ${days}
  ${locFilter}
GROUP BY u.id, u.unit_number, e.name, p.full_name, p.phone
HAVING SUM(c.amount - COALESCE(pa.allocated_amount, 0)) > 0
ORDER BY balance_due DESC;`,
      supabaseJs: `const { data, error } = await supabase
  .from('charges')
  .select(\`
    id, amount, due_date, status,
    unit:units!inner(id, unit_number, estate:estates!inner(name)),
    allocations:payment_allocations(amount)
  \`)
  .in('status', ['due', 'overdue'])
  .lte('due_date', new Date(Date.now() - ${days} * 86400000).toISOString())
  .order('amount', { ascending: false });`,
      graphql: `query GetAgedArrears {
  charges(where: {
    status: { _in: ["due", "overdue"] },
    dueDate: { _lte: "NOW - ${days}d" },
    ${p.location ? `unit: { estate: { name: { _ilike: "%${p.location}%" } } }` : ''}
  }) {
    id
    amount
    dueDate
    unit {
      unitNumber
      estate { name }
      occupancy { resident { fullName phone } }
    }
  }
}`,
      jsonAst: {
        entity: 'charges',
        filters: {
          status: ['due', 'overdue'],
          daysOverdue: { gte: days },
          ...(p.location ? { 'unit.estate.name': { ilike: p.location } } : {})
        },
        aggregates: ['sum(amount)', 'count(distinct unit_id)'],
        sort: [{ field: 'balance_due', direction: 'desc' }]
      },
      executionPlan: {
        tables: ['charges', 'payment_allocations', 'units', 'occupancies', 'estates'],
        indexUsed: 'idx_charges_unit_due_date_status',
        estimatedRows: '12-45 units',
        rlsPolicy: 'tenant_and_org_isolation',
        deterministic: true
      },
      executable: true,
      runTarget: {
        type: 'payments',
        url: '/app/payments',
        params: { tab: 'arrears', days }
      }
    };
  }

  // 2. Maintenance, Work Orders, SLAs & Contractor Queries
  if (lower.includes('maintenance') || lower.includes('work order') || lower.includes('leak') || lower.includes('repair') || lower.includes('sla') || lower.includes('contractor') || context === 'maintenance') {
    const category = p.contractorCategory || 'all';
    const statusClause = p.slaStatus ? `AND sla_status = 'breached'` : `AND status IN ('reported', 'triaged', 'assigned')`;
    const sqlStatus = p.slaStatus ? `AND mi.sla_breached = true` : `AND mi.status IN ('reported', 'triaged', 'assigned')`;

    return {
      id,
      summary: `Maintenance work orders & vendor assignments${p.contractorCategory ? ` for ${p.contractorCategory}` : ''}${p.slaStatus ? ' breaching SLA' : ''}`,
      intent: 'Operational triage and contractor dispatch for active unit maintenance tickets',
      targetEntities: ['maintenance_issues', 'work_orders', 'units', 'vendors', 'slas'],
      reosQl: `QUERY maintenance_issues
  JOIN units ON unit_id
  JOIN estates ON estate_id
  LEFT JOIN vendors ON assigned_vendor_id
WHERE status != 'closed'
  ${category !== 'all' ? `AND category = '${category}'` : ''}
  ${statusClause}
ORDER BY priority DESC, created_at ASC
WITH DISPATCH_RECOMMENDATIONS;`,
      sql: `SELECT 
    mi.id AS issue_id,
    mi.title,
    mi.category,
    mi.priority,
    mi.status,
    mi.sla_breached,
    mi.created_at,
    u.unit_number,
    e.name AS estate_name,
    v.company_name AS vendor_name,
    v.phone AS vendor_phone
FROM maintenance_issues mi
JOIN units u ON mi.unit_id = u.id
JOIN estates e ON u.estate_id = e.id
LEFT JOIN vendors v ON mi.assigned_vendor_id = v.id
WHERE mi.status NOT IN ('resolved', 'closed')
  ${category !== 'all' ? `AND mi.category = '${category}'` : ''}
  ${sqlStatus}
ORDER BY 
    CASE mi.priority 
        WHEN 'emergency' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END,
    mi.created_at ASC;`,
      supabaseJs: `const { data, error } = await supabase
  .from('maintenance_issues')
  .select(\`
    id, title, category, priority, status, created_at,
    unit:units!inner(unit_number, estate:estates(name)),
    vendor:vendors(company_name, phone)
  \`)
  .neq('status', 'closed')
  ${category !== 'all' ? `.eq('category', '${category}')` : ''}
  .order('priority', { ascending: false });`,
      graphql: `query GetActiveMaintenanceIssues {
  maintenanceIssues(where: {
    status: { _nin: ["resolved", "closed"] },
    ${category !== 'all' ? `category: { _eq: "${category}" },` : ''}
    ${p.slaStatus ? `slaBreached: { _eq: true }` : ''}
  }) {
    id
    title
    category
    priority
    status
    unit { unitNumber estate { name } }
    vendor { companyName phone rating }
  }
}`,
      jsonAst: {
        entity: 'maintenance_issues',
        filters: {
          status: { nin: ['resolved', 'closed'] },
          ...(category !== 'all' ? { category } : {}),
          ...(p.slaStatus ? { slaBreached: true } : {})
        },
        sort: [{ field: 'priority', direction: 'desc' }, { field: 'createdAt', direction: 'asc' }]
      },
      executionPlan: {
        tables: ['maintenance_issues', 'units', 'estates', 'vendors'],
        indexUsed: 'idx_maintenance_status_priority_sla',
        estimatedRows: '4-18 active tickets',
        rlsPolicy: 'organization_facility_manager_rls',
        deterministic: true
      },
      executable: true,
      runTarget: {
        type: 'maintenance',
        url: '/app/maintenance',
        params: { filter: category !== 'all' ? category : 'active' }
      }
    };
  }

  // 3. Leasing, Expiries & Occupancies
  if (lower.includes('lease') || lower.includes('tenant') || lower.includes('occupan') || lower.includes('expir') || lower.includes('move-in') || lower.includes('move-out') || context === 'documents') {
    const days = p.leaseExpiryDays || 60;
    return {
      id,
      summary: `Active leases & unit occupancies scheduled to expire within ${days} days`,
      intent: 'Leasing lifecycle tracking for upcoming lease renewals, inspections, and deposit releases',
      targetEntities: ['leases', 'occupancies', 'units', 'deposits', 'profiles'],
      reosQl: `QUERY leases
  JOIN units ON unit_id
  JOIN occupancies ON occupancy_id
  JOIN profiles ON resident_id
WHERE status = 'active'
  AND end_date <= NOW() + INTERVAL '${days} days'
ORDER BY end_date ASC
INCLUDE deposit_amount, renewal_status;`,
      sql: `SELECT 
    l.id AS lease_id,
    l.start_date,
    l.end_date,
    l.monthly_rent,
    l.deposit_held,
    l.status AS lease_status,
    u.unit_number,
    e.name AS estate_name,
    p.full_name AS tenant_name,
    p.email AS tenant_email,
    p.phone AS tenant_phone
FROM leases l
JOIN units u ON l.unit_id = u.id
JOIN estates e ON u.estate_id = e.id
JOIN profiles p ON l.tenant_id = p.id
WHERE l.status = 'active'
  AND l.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')
ORDER BY l.end_date ASC;`,
      supabaseJs: `const { data, error } = await supabase
  .from('leases')
  .select(\`
    id, start_date, end_date, monthly_rent, deposit_held,
    unit:units(unit_number, estate:estates(name)),
    tenant:profiles(full_name, phone, email)
  \`)
  .eq('status', 'active')
  .lte('end_date', new Date(Date.now() + ${days} * 86400000).toISOString())
  .order('end_date', { ascending: true });`,
      graphql: `query GetExpiringLeases {
  leases(where: {
    status: { _eq: "active" },
    endDate: { _lte: "NOW + ${days}d", _gte: "NOW" }
  }) {
    id
    startDate
    endDate
    monthlyRent
    depositHeld
    unit { unitNumber estate { name } }
    tenant { fullName email phone }
  }
}`,
      jsonAst: {
        entity: 'leases',
        filters: {
          status: 'active',
          endDate: { gte: 'CURRENT_DATE', lte: `CURRENT_DATE + ${days}d` }
        },
        sort: [{ field: 'endDate', direction: 'asc' }]
      },
      executionPlan: {
        tables: ['leases', 'units', 'estates', 'profiles'],
        indexUsed: 'idx_leases_status_end_date',
        estimatedRows: '8-30 expiring leases',
        rlsPolicy: 'property_manager_isolated',
        deterministic: true
      },
      executable: true,
      runTarget: {
        type: 'documents',
        url: '/app/documents',
        params: { tab: 'leases', expiringIn: days }
      }
    };
  }

  // 4. Default: Property Search & Marketplace Discovery
  const locClause = p.location ? `AND location = '${p.location}'` : '';
  const bedClause = p.bedrooms ? `AND bedrooms >= ${p.bedrooms}` : '';
  const priceClause = p.priceMax ? `AND price <= ${p.priceMax}` : '';
  const typeClause = p.listingType ? `AND listing_type = '${p.listingType}'` : `AND listing_type = 'rental'`;
  const propClause = p.propertyType ? `AND property_type = '${p.propertyType}'` : '';

  const queryParams: Record<string, string | number> = {};
  if (p.location) queryParams.location = p.location;
  if (p.priceMax) queryParams.priceMax = p.priceMax;
  if (p.priceMin) queryParams.priceMin = p.priceMin;
  if (p.bedrooms) queryParams.bedrooms = p.bedrooms;
  if (p.listingType) queryParams.listingType = p.listingType;
  if (p.propertyType) queryParams.propertyType = p.propertyType;

  return {
    id,
    summary: `Verified property search for ${p.bedrooms ? `${p.bedrooms}-bed ` : ''}${p.propertyType || 'property'} ${p.listingType || 'rentals'}${p.location ? ` in ${p.location}` : ''}${p.priceMax ? ` under ₵${p.priceMax.toLocaleString()}` : ''}`,
    intent: 'Marketplace discovery across verified listings with real-time availability and verified agency badge',
    targetEntities: ['listings', 'properties', 'organizations', 'property_media'],
    reosQl: `FIND listings
  JOIN properties ON property_id
  JOIN organizations ON agency_id
WHERE status = 'listed'
  AND visibility = 'public'
  ${typeClause}
  ${locClause}
  ${propClause}
  ${bedClause}
  ${priceClause}
ORDER BY verified_agency DESC, created_at DESC
LIMIT 24;`,
    sql: `SELECT 
    l.id AS listing_id,
    l.title,
    l.price,
    l.currency,
    l.listing_type,
    p.address,
    p.city,
    p.bedrooms,
    p.bathrooms,
    p.square_meters,
    org.name AS agency_name,
    org.verified AS is_verified_agency
FROM listings l
JOIN properties p ON l.property_id = p.id
LEFT JOIN organizations org ON l.organization_id = org.id
WHERE l.status = 'listed'
  AND l.visibility = 'public'
  ${p.listingType ? `AND l.listing_type = '${p.listingType}'` : `AND l.listing_type = 'rental'`}
  ${p.location ? `AND (p.address ILIKE '%${p.location}%' OR p.city ILIKE '%${p.location}%' OR p.region ILIKE '%${p.location}%')` : ''}
  ${p.propertyType ? `AND p.category = '${p.propertyType}'` : ''}
  ${p.bedrooms ? `AND p.bedrooms >= ${p.bedrooms}` : ''}
  ${p.priceMax ? `AND l.price <= ${p.priceMax}` : ''}
  ${p.priceMin ? `AND l.price >= ${p.priceMin}` : ''}
ORDER BY org.verified DESC, l.created_at DESC
LIMIT 24;`,
    supabaseJs: `const { data, error } = await supabase
  .from('listings')
  .select(\`
    id, title, price, currency, listing_type,
    property:properties!inner(address, city, bedrooms, bathrooms, category),
    organization:organizations(name, verified)
  \`)
  .eq('status', 'listed')
  .eq('visibility', 'public')
  ${p.listingType ? `.eq('listing_type', '${p.listingType}')` : `.eq('listing_type', 'rental')`}
  ${p.priceMax ? `.lte('price', ${p.priceMax})` : ''}
  ${p.bedrooms ? `.gte('property.bedrooms', ${p.bedrooms})` : ''}
  .order('created_at', { ascending: false })
  .limit(24);`,
    graphql: `query SearchListings {
  listings(
    where: {
      status: { _eq: "listed" },
      ${p.listingType ? `listingType: { _eq: "${p.listingType}" },` : ''}
      ${p.priceMax ? `price: { _lte: ${p.priceMax} },` : ''}
      ${p.location ? `property: { address: { _ilike: "%${p.location}%" } },` : ''}
      ${p.bedrooms ? `property: { bedrooms: { _gte: ${p.bedrooms} } }` : ''}
    }
    limit: 24
  ) {
    id
    title
    price
    listingType
    property { address city bedrooms bathrooms }
    organization { name verified }
  }
}`,
    jsonAst: {
      entity: 'listings',
      filters: {
        status: 'listed',
        visibility: 'public',
        ...queryParams
      },
      limit: 24,
      sort: [{ field: 'created_at', direction: 'desc' }]
    },
    executionPlan: {
      tables: ['listings', 'properties', 'organizations'],
      indexUsed: 'idx_listings_status_type_price',
      estimatedRows: '15-60 matching properties',
      rlsPolicy: 'public_marketplace_read_only',
      deterministic: true
    },
    executable: true,
    runTarget: {
      type: 'search',
      url: `/search?q=${encodeURIComponent(prompt)}`,
      params: queryParams
    }
  };
}
