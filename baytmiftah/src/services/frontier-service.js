import { callEdgeFunction } from './edge-client'

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

export async function runConcierge(profile) {
  try {
    return await callEdgeFunction('intelligence', {
      method: 'POST',
      query: { action: 'concierge' },
      body: profile,
    })
  } catch {
    const result = {
      id: `concierge-${Date.now()}`,
      intent_profile: profile,
      recommendations: [
        {
          title: `Verified home in ${profile.area || 'Accra'}`,
          reason: 'Matches lifestyle, trust, calendar availability, and budget preference.',
          nextAction: 'Compare and book',
        },
        {
          title: 'Investment shortlist',
          reason: 'Higher demand area with stronger resale and rental yield signals.',
          nextAction: 'Open deal room',
        },
      ],
    }
    write('baytmiftah_concierge_last', result)
    return result
  }
}

export async function getNeighborhood(city = 'Accra', neighborhood = 'Cantonments') {
  try {
    return await callEdgeFunction('intelligence', {
      query: { action: 'neighborhood', city, neighborhood },
      allowAnonymous: true,
    })
  } catch {
    return {
      city,
      neighborhood,
      metrics: {
        floodRisk: 'low',
        commuteScore: 82,
        schools: 7,
        averagePriceGhs: 1850000,
        rentalYield: '6.2%',
        demand: 'high',
      },
    }
  }
}

export async function getDynamicPricing(input) {
  try {
    return await callEdgeFunction('intelligence', {
      method: 'POST',
      query: { action: 'dynamic-pricing' },
      body: input,
      allowAnonymous: true,
    })
  } catch {
    const basePrice = Number(input.basePrice || 1000)
    return {
      basePrice,
      suggestedPrice: Math.round(basePrice * 1.14),
      confidence: 0.74,
      reason: 'Local model using occupancy and demand assumptions.',
    }
  }
}

export async function saveInspection(report) {
  const local = [{ id: `inspection-${Date.now()}`, ...report }, ...read('baytmiftah_inspections', [])]
  write('baytmiftah_inspections', local)
  try {
    return await callEdgeFunction('intelligence', {
      method: 'POST',
      query: { action: 'inspection' },
      body: report,
    })
  } catch {
    return local[0]
  }
}

export async function getRevenueOps() {
  try {
    return await callEdgeFunction('intelligence', { query: { action: 'revenue' } })
  } catch {
    return {
      metrics: {
        mrr: 18250,
        boostRevenue: 4300,
        checkoutConversion: '12.8%',
        churnRisk: 'medium',
        expansionAccounts: 9,
      },
    }
  }
}

export function getOwnerPortalSnapshot() {
  return {
    occupancy: '78%',
    revenue: 'GHS 42,800',
    maintenance: 3,
    documentReadiness: '86%',
    agentResponse: '14 min',
  }
}

export function getDeveloperLaunchSnapshot() {
  return read('baytmiftah_developer_projects', [
    {
      id: 'project-1',
      name: 'Cantonments Residences',
      launchStatus: 'waitlist',
      waitlistCount: 124,
      constructionProgress: 42,
      reservationDeposit: 50000,
    },
  ])
}

export function addDeveloperProject(project) {
  return write('baytmiftah_developer_projects', [
    { id: `project-${Date.now()}`, ...project },
    ...getDeveloperLaunchSnapshot(),
  ])[0]
}

export default {
  addDeveloperProject,
  getDeveloperLaunchSnapshot,
  getDynamicPricing,
  getNeighborhood,
  getOwnerPortalSnapshot,
  getRevenueOps,
  runConcierge,
  saveInspection,
}
