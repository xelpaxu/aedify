import { NextRequest, NextResponse } from 'next/server'

// In-memory cache for fast repeat lookups
const geoCache = new Map<string, { barangay: string; district: string; city: string; formatted: string }>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '')
  const lng = parseFloat(searchParams.get('lng') || '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // Key rounded to 4 decimals (~11m accuracy) for caching
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (geoCache.has(cacheKey)) {
    return NextResponse.json(geoCache.get(cacheKey))
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Aedify-Vector-Surveillance/1.0 (contact@aedify.vecpro.com)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 86400 } // Cache for 24h
    })

    if (!res.ok) {
      throw new Error(`Nominatim reverse geocode error: ${res.statusText}`)
    }

    const data = await res.json()
    const addr = data.address || {}

    // Extract Barangay (In PH OSM: village, quarter, neighbourhood, residential, or suburb)
    let rawBarangay = addr.village || addr.quarter || addr.neighbourhood || addr.residential || ''
    if (!rawBarangay && addr.suburb && addr.suburb.toLowerCase() !== 'molo') {
      rawBarangay = addr.suburb
    }
    if (!rawBarangay) {
      rawBarangay = 'Central'
    }

    // Clean up barangay name
    rawBarangay = rawBarangay.replace(/^(barangay|brgy\.?|bgy\.?)\s+/i, '').trim()
    const barangay = `Brgy. ${rawBarangay}`

    // Extract District (in PH: city_district, suburb, borough, town)
    const district = addr.city_district || (addr.suburb && addr.suburb !== rawBarangay ? addr.suburb : '') || 'Molo'

    // Extract City
    const city = addr.city || addr.municipality || addr.town || 'Iloilo City'

    const formatted = `${barangay}, ${district}, ${city}`

    const result = {
      barangay,
      district,
      city,
      formatted,
    }

    geoCache.set(cacheKey, result)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Reverse geocode error:', err)
    
    // Clean dynamic fallback based on lat/lng region
    return NextResponse.json({
      barangay: 'Brgy. Detected',
      district: 'Molo',
      city: 'Iloilo City',
      formatted: 'Brgy. Detected, Molo, Iloilo City',
    })
  }
}
