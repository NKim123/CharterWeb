import { get, set, del, keys } from 'idb-keyval'

const TRIP_PREFIX = 'trip_' // key prefix

export interface StoredTrip {
  id: string
  data: unknown
}

export async function saveTrip(id: string, data: unknown) {
  await set(`${TRIP_PREFIX}${id}`, data)
}

export async function loadTrip(id: string) {
  return get(`${TRIP_PREFIX}${id}`)
}

export async function listTrips(): Promise<StoredTrip[]> {
  const allKeys = await keys()
  const trips: StoredTrip[] = []
  for (const k of allKeys) {
    if (typeof k === 'string' && k.startsWith(TRIP_PREFIX)) {
      const data = await get(k)
      trips.push({ id: k.replace(TRIP_PREFIX, ''), data })
    }
  }
  return trips
}

export async function deleteTrip(id: string) {
  await del(`${TRIP_PREFIX}${id}`)
} 