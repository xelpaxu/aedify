'use client'

import { useState, useEffect } from 'react'

export interface LocationHierarchy {
  barangay: string
  district: string
  city: string
  formatted: string
}

// Client-side cache to avoid repeated network calls
const clientGeoCache = new Map<string, LocationHierarchy>()

/**
 * Asynchronously fetch exact Barangay, District, City from OpenStreetMap Nominatim reverse geocode API.
 */
export async function fetchReverseGeocode(lat?: number, lng?: number): Promise<LocationHierarchy | null> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return null
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (clientGeoCache.has(cacheKey)) {
    return clientGeoCache.get(cacheKey)!
  }

  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: LocationHierarchy = await res.json()
    if (data && data.formatted) {
      clientGeoCache.set(cacheKey, data)
      return data
    }
  } catch (err) {
    // Direct client fallback to Nominatim if internal route is unavailable
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      })
      if (res.ok) {
        const data = await res.json()
        const addr = data.address || {}
        let rawBarangay = addr.village || addr.quarter || addr.neighbourhood || addr.residential || ''
        if (!rawBarangay && addr.suburb && addr.suburb.toLowerCase() !== 'molo') {
          rawBarangay = addr.suburb
        }
        if (!rawBarangay) rawBarangay = 'Central'
        rawBarangay = rawBarangay.replace(/^(barangay|brgy\.?|bgy\.?)\s+/i, '').trim()
        const barangay = `Brgy. ${rawBarangay}`
        const district = addr.city_district || (addr.suburb && addr.suburb !== rawBarangay ? addr.suburb : '') || 'Molo'
        const city = addr.city || addr.municipality || 'Iloilo City'
        const result: LocationHierarchy = {
          barangay,
          district,
          city,
          formatted: `${barangay}, ${district}, ${city}`
        }
        clientGeoCache.set(cacheKey, result)
        return result
      }
    } catch {
      // Ignore network errors
    }
  }

  return null
}

/**
 * Synchronously parses existing location strings into the standard:
 * "Brgy. [Name], [District], [City]"
 */
export function getLocationHierarchy(report?: {
  locationName?: string
  lat?: number
  lng?: number
  location?: string
}): LocationHierarchy {
  const rawText = (report?.locationName || report?.location || '').trim()
  const lat = report?.lat
  const lng = report?.lng

  // If in cache, return immediately
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (clientGeoCache.has(cacheKey)) {
      return clientGeoCache.get(cacheKey)!
    }
  }

  // Parse if string already has structure (e.g. "Zone 3, Brgy. Calumpang" or "Calumpang, Molo")
  if (rawText && !rawText.toLowerCase().includes('detected location') && !rawText.toLowerCase().includes('unknown location')) {
    const parts = rawText.split(',').map(s => s.trim()).filter(Boolean)
    let barangay = ''
    let district = 'Molo'
    let city = 'Iloilo City'

    if (parts.length >= 3) {
      barangay = parts[0].startsWith('Brgy.') ? parts[0] : `Brgy. ${parts[0]}`
      district = parts[1]
      city = parts[2]
    } else if (parts.length === 2) {
      barangay = parts[0].startsWith('Brgy.') ? parts[0] : `Brgy. ${parts[0]}`
      district = parts[1]
    } else if (parts.length === 1) {
      barangay = parts[0].startsWith('Brgy.') ? parts[0] : `Brgy. ${parts[0]}`
    }

    return {
      barangay: barangay || 'Brgy. Calumpang',
      district,
      city,
      formatted: `${barangay || 'Brgy. Calumpang'}, ${district}, ${city}`
    }
  }

  // Fallback default format
  return {
    barangay: 'Brgy. Calumpang',
    district: 'Molo',
    city: 'Iloilo City',
    formatted: 'Brgy. Calumpang, Molo, Iloilo City'
  }
}

/**
 * Shorthand helper for synchronous format
 */
export function formatReportLocation(report?: {
  locationName?: string
  lat?: number
  lng?: number
  location?: string
}): string {
  return getLocationHierarchy(report).formatted
}

/**
 * React Hook to dynamically reverse-geocode lat/lng in real time via OpenStreetMap API
 */
export function useReverseGeocode(lat?: number, lng?: number, fallbackName?: string) {
  const [location, setLocation] = useState<LocationHierarchy>(() =>
    getLocationHierarchy({ lat, lng, locationName: fallbackName })
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return
    }

    let isMounted = true
    setIsLoading(true)

    fetchReverseGeocode(lat, lng).then(res => {
      if (isMounted && res) {
        setLocation(res)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [lat, lng])

  return { ...location, isLoading }
}

/**
 * Fans out overlapping or duplicate coordinates so markers don't pile up.
 * If multiple reports share identical or near-identical coordinates (< 15 meters),
 * offsets them radially in a circle so each pin is easily visible and clickable.
 */
export function applyCoordinateOffsets<T extends { lat?: number; lng?: number; coordinates?: [number, number] }>(
  items: T[],
  radiusDelta: number = 0.00035 // ~38 meters radial spread
): (T & { displayLat: number; displayLng: number })[] {
  const coordGroups = new Map<string, number[]>()

  // 1. Group items by rounded coordinates (~15m bucket)
  items.forEach((item, index) => {
    const lat = item.lat ?? item.coordinates?.[0]
    const lng = item.lng ?? item.coordinates?.[1]
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
      if (!coordGroups.has(key)) {
        coordGroups.set(key, [])
      }
      coordGroups.get(key)!.push(index)
    }
  })

  // 2. Compute offset coordinates for overlapping items
  const result: (T & { displayLat: number; displayLng: number })[] = items.map((item) => {
    const lat = item.lat ?? item.coordinates?.[0] ?? 10.6953
    const lng = item.lng ?? item.coordinates?.[1] ?? 122.5447
    return {
      ...item,
      displayLat: lat,
      displayLng: lng,
    }
  })

  coordGroups.forEach((indices) => {
    if (indices.length > 1) {
      const count = indices.length
      indices.forEach((idx, i) => {
        const item = result[idx]
        const origLat = item.displayLat
        const origLng = item.displayLng
        const angle = (i * 2 * Math.PI) / count - Math.PI / 2
        const latOffset = Math.sin(angle) * radiusDelta
        const lngOffset = (Math.cos(angle) * radiusDelta) / Math.cos((origLat * Math.PI) / 180)

        result[idx].displayLat = origLat + latOffset
        result[idx].displayLng = origLng + lngOffset
      })
    }
  })

  return result
}

/**
 * Extracts normalized confidence / accuracy percentage (0-100) from report or assignment.
 */
export function extractConfidenceScore(reportOrAssignment: any): number {
  if (!reportOrAssignment) return 85
  const val = reportOrAssignment.accuracy ??
              reportOrAssignment.confidence ??
              reportOrAssignment.confidenceScore ??
              reportOrAssignment.reportAccuracy ??
              reportOrAssignment.score

  if (typeof val === 'number' && !isNaN(val)) {
    return Math.round(val <= 1 ? val * 100 : val)
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) {
      return Math.round(parsed <= 1 ? parsed * 100 : parsed)
    }
  }
  return 85
}

export interface LocationCluster<T = any> {
  id: string
  lat: number
  lng: number
  locationName: string
  locationHierarchy: LocationHierarchy
  reports: T[]
  totalReports: number
  criticalCount: number
  pendingCount: number
  verifiedCount: number
  resolvedCount: number
  isAllResolved: boolean
  highestRisk: 'CRITICAL' | 'MODERATE' | 'SAFE' | 'PENDING' | 'RESOLVED'
  topReport: T
}

/**
 * Groups reports by exact geographic location / coordinates without artificial offsets.
 */
export function groupReportsByLocation<T extends { lat?: number; lng?: number; coordinates?: [number, number]; locationName?: string; location?: string; status?: string; verified?: boolean; risk?: string }>(
  reports: T[]
): LocationCluster<T>[] {
  const clustersMap = new Map<string, T[]>()

  reports.forEach(report => {
    const lat = typeof report.lat === 'number' && !isNaN(report.lat)
      ? report.lat
      : report.coordinates?.[0] ?? 10.6953
    const lng = typeof report.lng === 'number' && !isNaN(report.lng)
      ? report.lng
      : report.coordinates?.[1] ?? 122.5447

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (!clustersMap.has(key)) {
      clustersMap.set(key, [])
    }
    clustersMap.get(key)!.push(report)
  })

  const result: LocationCluster<T>[] = []

  clustersMap.forEach((groupedReports, key) => {
    if (groupedReports.length === 0) return
    const first = groupedReports[0]
    const lat = typeof first.lat === 'number' && !isNaN(first.lat)
      ? first.lat
      : first.coordinates?.[0] ?? 10.6953
    const lng = typeof first.lng === 'number' && !isNaN(first.lng)
      ? first.lng
      : first.coordinates?.[1] ?? 122.5447
    const hierarchy = getLocationHierarchy(first)

    let criticalCount = 0
    let pendingCount = 0
    let verifiedCount = 0
    let resolvedCount = 0

    groupedReports.forEach(r => {
      const s = r.status?.toLowerCase() || ''
      const risk = (r as any).risk?.toLowerCase() || ''
      if (s === 'resolved' || s === 'completed') {
        resolvedCount++
      } else if (s === 'critical' || risk === 'high') {
        criticalCount++
      } else if (r.verified || s === 'verified' || risk === 'low') {
        verifiedCount++
      } else {
        pendingCount++
      }
    })

    const isAllResolved = resolvedCount === groupedReports.length

    let highestRisk: LocationCluster['highestRisk'] = 'SAFE'
    if (criticalCount > 0) {
      highestRisk = 'CRITICAL'
    } else if (pendingCount > 0) {
      highestRisk = 'PENDING'
    } else if (verifiedCount > 0) {
      highestRisk = 'MODERATE'
    } else if (isAllResolved) {
      highestRisk = 'RESOLVED'
    }

    const topReport = groupedReports.find(r => {
      const s = r.status?.toLowerCase() || ''
      return s === 'critical' || (r as any).risk === 'High'
    }) || groupedReports.find(r => r.status?.toLowerCase() !== 'resolved') || first

    result.push({
      id: `loc-${key}`,
      lat,
      lng,
      locationName: first.locationName || first.location || hierarchy.formatted,
      locationHierarchy: hierarchy,
      reports: groupedReports,
      totalReports: groupedReports.length,
      criticalCount,
      pendingCount,
      verifiedCount,
      resolvedCount,
      isAllResolved,
      highestRisk,
      topReport
    })
  })

  return result
}

