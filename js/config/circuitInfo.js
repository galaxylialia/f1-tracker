/**
 * F1 Circuit metadata
 * Keys match Jolpica/Ergast circuitId values
 * timezone: IANA identifier (JS Intl handles DST automatically)
 * lapRecord: set during the race (not qualifying)
 */
export const CIRCUIT_INFO = {
  albert_park:        { timezone: 'Australia/Melbourne', length: 5.278, laps: 58,  corners: 16, lapRecord: { time: '1:20.235', driver: 'Charles Leclerc',     year: 2022 } },
  shanghai:           { timezone: 'Asia/Shanghai',       length: 5.451, laps: 56,  corners: 16, lapRecord: { time: '1:32.238', driver: 'Michael Schumacher',   year: 2004 } },
  suzuka:             { timezone: 'Asia/Tokyo',           length: 5.807, laps: 53,  corners: 18, lapRecord: { time: '1:30.983', driver: 'Lewis Hamilton',       year: 2019 } },
  bahrain:            { timezone: 'Asia/Bahrain',         length: 5.412, laps: 57,  corners: 15, lapRecord: { time: '1:31.447', driver: 'Pedro de la Rosa',     year: 2005 } },
  jeddah:             { timezone: 'Asia/Riyadh',          length: 6.174, laps: 50,  corners: 27, lapRecord: { time: '1:30.734', driver: 'Lewis Hamilton',       year: 2021 } },
  miami:              { timezone: 'America/New_York',     length: 5.412, laps: 57,  corners: 19, lapRecord: { time: '1:29.708', driver: 'Max Verstappen',       year: 2023 } },
  imola:              { timezone: 'Europe/Rome',          length: 4.909, laps: 63,  corners: 19, lapRecord: { time: '1:15.484', driver: 'Rubens Barrichello',   year: 2004 } },
  monaco:             { timezone: 'Europe/Monaco',        length: 3.337, laps: 78,  corners: 19, lapRecord: { time: '1:12.909', driver: 'Lewis Hamilton',       year: 2021 } },
  catalunya:          { timezone: 'Europe/Madrid',        length: 4.657, laps: 66,  corners: 14, lapRecord: { time: '1:16.330', driver: 'Max Verstappen',       year: 2023 } },
  villeneuve:         { timezone: 'America/Toronto',      length: 4.361, laps: 70,  corners: 14, lapRecord: { time: '1:13.078', driver: 'Valtteri Bottas',      year: 2019 } },
  red_bull_ring:      { timezone: 'Europe/Vienna',        length: 4.318, laps: 71,  corners: 10, lapRecord: { time: '1:05.619', driver: 'Carlos Sainz',         year: 2020 } },
  silverstone:        { timezone: 'Europe/London',        length: 5.891, laps: 52,  corners: 18, lapRecord: { time: '1:27.097', driver: 'Max Verstappen',       year: 2020 } },
  spa:                { timezone: 'Europe/Brussels',      length: 7.004, laps: 44,  corners: 19, lapRecord: { time: '1:46.286', driver: 'Valtteri Bottas',      year: 2018 } },
  hungaroring:        { timezone: 'Europe/Budapest',      length: 4.381, laps: 70,  corners: 14, lapRecord: { time: '1:16.627', driver: 'Lewis Hamilton',       year: 2020 } },
  zandvoort:          { timezone: 'Europe/Amsterdam',     length: 4.259, laps: 72,  corners: 14, lapRecord: { time: '1:11.097', driver: 'Valtteri Bottas',      year: 2021 } },
  monza:              { timezone: 'Europe/Rome',          length: 5.793, laps: 53,  corners: 11, lapRecord: { time: '1:21.046', driver: 'Rubens Barrichello',   year: 2004 } },
  baku_city_circuit:  { timezone: 'Asia/Baku',            length: 6.003, laps: 51,  corners: 20, lapRecord: { time: '1:43.009', driver: 'Charles Leclerc',      year: 2019 } },
  marina_bay:         { timezone: 'Asia/Singapore',       length: 4.940, laps: 62,  corners: 19, lapRecord: { time: '1:35.867', driver: 'Lewis Hamilton',       year: 2023 } },
  americas:           { timezone: 'America/Chicago',      length: 5.513, laps: 56,  corners: 20, lapRecord: { time: '1:36.169', driver: 'Charles Leclerc',      year: 2019 } },
  rodriguez:          { timezone: 'America/Mexico_City',  length: 4.304, laps: 71,  corners: 17, lapRecord: { time: '1:17.774', driver: 'Valtteri Bottas',      year: 2021 } },
  interlagos:         { timezone: 'America/Sao_Paulo',    length: 4.309, laps: 71,  corners: 15, lapRecord: { time: '1:10.540', driver: 'Valtteri Bottas',      year: 2018 } },
  las_vegas:          { timezone: 'America/Los_Angeles',  length: 6.201, laps: 50,  corners: 17, lapRecord: { time: '1:35.490', driver: 'Oscar Piastri',        year: 2023 } },
  losail:             { timezone: 'Asia/Qatar',           length: 5.419, laps: 57,  corners: 16, lapRecord: { time: '1:24.319', driver: 'Max Verstappen',       year: 2021 } },
  yas_marina:         { timezone: 'Asia/Dubai',           length: 5.281, laps: 58,  corners: 16, lapRecord: { time: '1:26.103', driver: 'Max Verstappen',       year: 2021 } },
}

export function getCircuitInfo(circuitId) {
  if (!circuitId) return null
  return CIRCUIT_INFO[circuitId] || null
}

/** Format a UTC ISO string in a specific IANA timezone */
export function formatInTz(isoStr, tz, opts = {}) {
  if (!isoStr || !tz) return '—'
  try {
    return new Date(isoStr).toLocaleString('default', {
      timeZone: tz,
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
      ...opts,
    })
  } catch (_) {
    return '—'
  }
}
