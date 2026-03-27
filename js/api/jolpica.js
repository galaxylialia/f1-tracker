const BASE = 'https://api.jolpi.ca/ergast/f1'

async function get(path) {
  const res = await fetch(`${BASE}${path}.json`)
  if (!res.ok) throw new Error(`Jolpica ${res.status} ${path}`)
  const data = await res.json()
  return data.MRData
}

export const jolpica = {
  getDriverStandings: (year) =>
    get(`/${year}/driverstandings`),

  getConstructorStandings: (year) =>
    get(`/${year}/constructorstandings`),

  getConstructorHistory: (constructorId) =>
    get(`/constructors/${constructorId}/constructorstandings?limit=100`),

  getRaceResults: (year, round) =>
    get(`/${year}/${round}/results`),

  getQualifyingResults: (year, round) =>
    get(`/${year}/${round}/qualifying`),
}
