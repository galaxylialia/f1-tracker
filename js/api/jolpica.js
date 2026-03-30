const BASE = 'https://api.jolpi.ca/ergast/f1'

async function get(path) {
  const [base, query] = path.split('?')
  const url = query ? `${BASE}${base}.json?${query}` : `${BASE}${base}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jolpica ${res.status} ${path}`)
  const data = await res.json()
  return data.MRData
}

export const jolpica = {
  getDriverStandings: (year) =>
    get(`/${year}/driverstandings`),

  getConstructorStandings: (year) =>
    get(`/${year}/constructorstandings`),

  getRaceResults: (year, round) =>
    get(`/${year}/${round}/results`),

  getQualifyingResults: (year, round) =>
    get(`/${year}/${round}/qualifying`),

  getRaceSchedule: (year) =>
    get(`/${year}/races`),

  getDriverStats: async (driverId) => {
    const [races, wins, p2, p3, poles] = await Promise.all([
      get(`/drivers/${driverId}/results?limit=1`),
      get(`/drivers/${driverId}/results/1?limit=1`),
      get(`/drivers/${driverId}/results/2?limit=1`),
      get(`/drivers/${driverId}/results/3?limit=1`),
      get(`/drivers/${driverId}/qualifying/1?limit=1`),
    ])
    return {
      totalRaces: parseInt(races?.total || 0),
      wins: parseInt(wins?.total || 0),
      podiums: parseInt(wins?.total || 0) + parseInt(p2?.total || 0) + parseInt(p3?.total || 0),
      poles: parseInt(poles?.total || 0),
    }
  },

  getConstructorStats: async (constructorId) => {
    const [races, wins, p2, p3, poles] = await Promise.all([
      get(`/constructors/${constructorId}/results?limit=1`),
      get(`/constructors/${constructorId}/results/1?limit=1`),
      get(`/constructors/${constructorId}/results/2?limit=1`),
      get(`/constructors/${constructorId}/results/3?limit=1`),
      get(`/constructors/${constructorId}/qualifying/1?limit=1`),
    ])
    return {
      totalRaces: parseInt(races?.total || 0),
      wins: parseInt(wins?.total || 0),
      podiums: parseInt(wins?.total || 0) + parseInt(p2?.total || 0) + parseInt(p3?.total || 0),
      poles: parseInt(poles?.total || 0),
    }
  },
}
