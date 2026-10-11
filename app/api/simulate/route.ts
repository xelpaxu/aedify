import { NextRequest, NextResponse } from 'next/server'

const SIMULATION_BACKEND_URL = (
  process.env.SIMULATION_API_URL ||
  process.env.NEXT_PUBLIC_SIMULATION_API_URL ||
  'http://127.0.0.1:5000'
).replace(/\/$/, '')

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    const targetUrl = `${SIMULATION_BACKEND_URL}/simulate`
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await backendResponse.json()

    return NextResponse.json(data, {
      status: backendResponse.status,
    })
  } catch (error: any) {
    console.error('Simulation proxy error:', error)
    return NextResponse.json(
      {
        detail:
          error?.message ||
          'Failed to connect to simulation server. Ensure python simulation.py is active on port 5000.',
      },
      { status: 502 }
    )
  }
}
