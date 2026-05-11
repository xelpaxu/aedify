"""
Aedify ABM Server — abm_server.py (Corrected)
Agent-Based Mosquito Dispersal Simulation for Molo District, Iloilo City
"""

import math
import random
import httpx
import json
from collections import defaultdict
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, AsyncGenerator

app = FastAPI(title="Aedify ABM Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Constants ==========
MOLO_LAT = 10.6953
MOLO_LNG = 122.5447

BARANGAY_ZONES = [
    {"name": "San Juan, Molo",        "lat_min": 10.685, "lat_max": 10.693, "lng_min": 122.540, "lng_max": 122.548},
    {"name": "Calumpang, Molo",       "lat_min": 10.681, "lat_max": 10.688, "lng_min": 122.534, "lng_max": 122.542},
    {"name": "South Fundidor, Molo",  "lat_min": 10.687, "lat_max": 10.694, "lng_min": 122.527, "lng_max": 122.536},
    {"name": "North Fundidor, Molo",  "lat_min": 10.693, "lat_max": 10.700, "lng_min": 122.530, "lng_max": 122.540},
    {"name": "Tanza Norte, Molo",     "lat_min": 10.690, "lat_max": 10.698, "lng_min": 122.542, "lng_max": 122.552},
    {"name": "Poblacion, Molo",       "lat_min": 10.694, "lat_max": 10.702, "lng_min": 122.547, "lng_max": 122.556},
]

GRID_SIZE = 0.005   # ~550m cells

# ========== Pydantic models ==========
class ReportInput(BaseModel):
    id: str
    lat: float
    lng: float
    status: str          # "CRITICAL" | "HIGH" | "MODERATE"
    verified: bool
    accuracy: Optional[float] = 0.85

class SimulateRequest(BaseModel):
    days: int            # 1–7
    reports: list[ReportInput]

# ========== Weather ==========
async def fetch_weather(days: int) -> Dict[str, Any]:
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={MOLO_LAT}&longitude={MOLO_LNG}"
        f"&hourly=temperature_2m,precipitation,windspeed_10m,relativehumidity_2m"
        f"&forecast_days={min(days, 7)}&timezone=Asia%2FManila"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            hourly = data.get("hourly", {})
            temps  = hourly.get("temperature_2m", [32.0])
            precip = hourly.get("precipitation",  [0.0])
            winds  = hourly.get("windspeed_10m",  [10.0])
            humid  = hourly.get("relativehumidity_2m", [80.0])

            avg_temp   = sum(temps[:24*days])   / max(len(temps[:24*days]),  1)
            avg_precip = sum(precip[:24*days])  / max(len(precip[:24*days]), 1)
            avg_wind   = sum(winds[:24*days])   / max(len(winds[:24*days]),  1)
            avg_humid  = sum(humid[:24*days])   / max(len(humid[:24*days]),  1)

            condition = "Rainy" if avg_precip > 0.5 else ("Humid" if avg_humid > 80 else "Partly Cloudy")
            return {
                "temp_c":   round(avg_temp,  1),
                "humidity": round(avg_humid, 1),
                "wind_kph": round(avg_wind,  1),
                "precip_mm":round(avg_precip,2),
                "condition": condition,
            }
    except Exception:
        return {"temp_c": 32.4, "humidity": 81.0, "wind_kph": 12.3, "precip_mm": 0.4, "condition": "Partly Cloudy"}

# ========== Ollama AI Insights ==========
async def generate_ai_insights(hotspots: List[Dict], weather: Dict, days: int, total_agents: int) -> str:
    """Generate detailed AI-powered insights on mosquito movement patterns using Ollama."""
    try:
        prompt = f"""Analyze this dengue mosquito dispersal simulation in 2-3 sentences:
- {days} days, {total_agents} agents modeled
- Weather: {weather['temp_c']}°C, {weather['humidity']}% humidity
- Top hotspot: {hotspots[0]['location_estimate'] if hotspots else 'N/A'} ({hotspots[0]['risk_level'] if hotspots else 'N/A'})

What environmental factors drive this spread?"""

        async with httpx.AsyncClient(timeout=90.0) as client:
            print(f"[Ollama] Sending request to localhost:11434...")
            r = await client.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3.2:1b", "prompt": prompt, "stream": False},
                timeout=90.0
            )
            print(f"[Ollama] Response status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                insight = data.get("response", "").strip()
                if insight:
                    print(f"[Ollama] Success - got {len(insight)} chars")
                    return insight
                print("[Ollama] Empty response from model")
                return ""
            else:
                print(f"[Ollama] Error {r.status_code}")
                return ""
    except httpx.ConnectError as e:
        print(f"[Ollama] Connection error - is Ollama running? {e}")
        return ""
    except httpx.TimeoutException as e:
        print(f"[Ollama] Timeout (90s) - llama3.2:1b may need longer. Ensure it's loaded: {e}")
        return ""
    except Exception as e:
        print(f"[Ollama] Error: {type(e).__name__}: {e}")
        return ""

# ========== Movement Analysis ==========
def analyze_movement_patterns(hotspots: List[Dict], weather: Dict, days: int) -> Dict[str, Any]:
    """Analyze and describe movement patterns in detail."""
    if not hotspots:
        return {"pattern": "No data", "dispersal_speed": 0, "concentration": "N/A"}
    
    # Calculate movement metrics
    top_hotspot = hotspots[0]
    dispersal_range = 0
    for hp in hotspots:
        dist = math.sqrt((hp["lat"] - top_hotspot["lat"])**2 + (hp["lng"] - top_hotspot["lng"])**2) * 111  # km
        dispersal_range = max(dispersal_range, dist)
    
    dispersal_speed_km_per_day = dispersal_range / max(days, 1)
    total_agents = sum(hp["agent_count"] for hp in hotspots)
    concentration_ratio = hotspots[0]["agent_count"] / max(total_agents, 1) if total_agents > 0 else 0
    
    # Determine pattern
    if weather["wind_kph"] > 15:
        pattern = "Directional Dispersal (wind-driven)"
    elif weather["humidity"] > 80 and weather["temp_c"] > 28:
        pattern = "Rapid Multiplication & Local Spread"
    else:
        pattern = "Localized Clustering"
    
    return {
        "pattern": pattern,
        "dispersal_speed_km_day": round(dispersal_speed_km_per_day, 2),
        "max_range_km": round(dispersal_range, 2),
        "concentration_ratio": round(concentration_ratio, 3),
        "highest_density_location": hotspots[0]["location_estimate"],
        "secondary_spread": len(hotspots) > 1
    }

# ========== Helpers ==========
def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def km_to_deg(km: float) -> float:
    return km / 111.0

def emergence_probability(status: str, verified: bool) -> float:
    base = {"CRITICAL": 1.0, "HIGH": 0.74, "MODERATE": 0.58}.get(status, 0.58)
    return base if verified else base * 0.5

def growth_multiplier(weather: Dict, day: int) -> float:
    hot = weather["temp_c"] > 28.0
    wet = weather["precip_mm"] > 0.1 or weather["humidity"] > 75.0
    base = 1.3 if (hot and wet) else 0.9
    if day >= 3:
        base *= 1.5
    return min(base, 2.5)

def dispersal_radius_km(day: int, wind_kph: float) -> float:
    r = min(0.5 + 0.1 * day, 1.5)
    if wind_kph > 15.0:
        r *= 1.2
    return r

def estimate_barangay(lat: float, lng: float) -> str:
    for zone in BARANGAY_ZONES:
        if zone["lat_min"] <= lat <= zone["lat_max"] and zone["lng_min"] <= lng <= zone["lng_max"]:
            return zone["name"]
    return f"Molo District ({lat:.4f}, {lng:.4f})"

def latlon_to_cell(lat, lng):
    return (round(lat / GRID_SIZE) * GRID_SIZE, round(lng / GRID_SIZE) * GRID_SIZE)

def generate_reasoning(hp: dict, weather: dict, days: int) -> str:
    reasons = []
    if weather["temp_c"] > 30:
        reasons.append(f"High temperature ({weather['temp_c']}°C) accelerates larval maturation")
    if weather["humidity"] > 78:
        reasons.append(f"Elevated humidity ({weather['humidity']:.0f}%) sustains breeding conditions")
    if weather["precip_mm"] > 0.2:
        reasons.append("Recent precipitation fills stagnant containers")
    if days >= 3:
        reasons.append(f"Unaddressed sites for {days} days trigger 1.5× agent multiplication")
    reasons.append(f"{hp['agent_count']} mobile agents clustered in this grid cell")
    return ". ".join(reasons[:3]) + "."

# ========== Main simulation (corrected) ==========
async def run_abm(req: SimulateRequest) -> dict:
    days    = max(1, min(req.days, 7))
    weather = await fetch_weather(days)

    # ---- 1. Create initial agents from reports ----
    agents: List[Dict] = []  # each agent: {"lat": float, "lng": float}
    for rpt in req.reports:
        ep = emergence_probability(rpt.status, rpt.verified)
        # Day 0 growth (pre‑dispersal)
        init_growth = growth_multiplier(weather, 0)
        count = max(1, round(ep * init_growth * 50))
        for _ in range(count):
            agents.append({"lat": rpt.lat, "lng": rpt.lng})

    if not agents:
        # Seed at Molo center
        for _ in range(5):
            agents.append({"lat": MOLO_LAT, "lng": MOLO_LNG})

    # ---- 2. Daily dispersal & reproduction ----
    for day in range(1, days + 1):
        new_agents = []          # agents after movement + reproduction
        rad_km = dispersal_radius_km(day, weather["wind_kph"])
        gm = growth_multiplier(weather, day)

        # For each agent, move and possibly reproduce
        for ag in agents:
            # Random walk
            angle = random.uniform(0, 2 * math.pi)
            dist = random.uniform(0, rad_km)
            d_lat = km_to_deg(dist * math.sin(angle))
            d_lng = km_to_deg(dist * math.cos(angle)) / math.cos(math.radians(ag["lat"]))
            if weather["wind_kph"] > 15:
                d_lng += km_to_deg(0.05)   # wind drift eastward
            new_lat = ag["lat"] + d_lat
            new_lng = ag["lng"] + d_lng
            new_agents.append({"lat": new_lat, "lng": new_lng})

            # Reproduction (probabilistic increase)
            if gm > 1.0:
                # Each agent produces (gm-1) offspring on average
                prob = min(0.5, gm - 1.0)
                if random.random() < prob:
                    new_agents.append({"lat": new_lat, "lng": new_lng})
            elif gm < 1.0:
                # Mortality: remove some agents
                # We'll handle removal by not adding the agent back at all with probability (1-gm)
                if random.random() < (1.0 - gm):
                    # agent dies – do not add it to new_agents (already added the moved version?)
                    # Actually we already added the moved agent above. We need to remove it.
                    # Simpler: rebuild new_agents without the killed agent.
                    # Let's do a separate list:
                    pass
        # For mortality: we need to filter. Easiest: rebuild list with chance to keep.
        # Instead of the above, recompute cleanly:
        survived = []
        for ag in agents:
            # move
            angle = random.uniform(0, 2 * math.pi)
            dist = random.uniform(0, rad_km)
            d_lat = km_to_deg(dist * math.sin(angle))
            d_lng = km_to_deg(dist * math.cos(angle)) / math.cos(math.radians(ag["lat"]))
            if weather["wind_kph"] > 15:
                d_lng += km_to_deg(0.05)
            new_lat = ag["lat"] + d_lat
            new_lng = ag["lng"] + d_lng

            # mortality check
            keep = True
            if gm < 1.0:
                if random.random() < (1.0 - gm):
                    keep = False
            if keep:
                survived.append({"lat": new_lat, "lng": new_lng})
                # reproduction
                if gm > 1.0:
                    prob = min(0.5, gm - 1.0)
                    if random.random() < prob:
                        survived.append({"lat": new_lat, "lng": new_lng})
        agents = survived

    # ---- 3. Aggregate agents into grid cells ----
    cell_counts = defaultdict(int)
    for ag in agents:
        cell = latlon_to_cell(ag["lat"], ag["lng"])
        cell_counts[cell] += 1

    total_mobile = len(agents)

    # ---- 4. Top 3 hotspots ----
    sorted_cells = sorted(cell_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    hotspots = []
    max_count = max(cell_counts.values()) if cell_counts else 1
    for (cell_lat, cell_lng), count in sorted_cells:
        score = min(1.0, count / max(max_count, 1))
        level = "CRITICAL" if score > 0.75 else ("HIGH" if score > 0.45 else "MODERATE")
        hp = {
            "lat": round(cell_lat, 4),
            "lng": round(cell_lng, 4),
            "risk_score": round(score, 3),
            "risk_level": level,
            "agent_count": count,
            "location_estimate": estimate_barangay(cell_lat, cell_lng),
            "reasoning": "",
        }
        hp["reasoning"] = generate_reasoning(hp, weather, days)
        hotspots.append(hp)

    # Pad to 3 hotspots if needed
    while len(hotspots) < 3 and agents:
        src = random.choice(agents)
        pad_lat = src["lat"] + random.uniform(-0.003, 0.003)
        pad_lng = src["lng"] + random.uniform(-0.003, 0.003)
        pad_score = max(0.1, 0.3 - len(hotspots) * 0.1)
        hp = {
            "lat": round(pad_lat, 4), "lng": round(pad_lng, 4),
            "risk_score": round(pad_score, 3),
            "risk_level": "MODERATE",
            "agent_count": max(1, round(pad_score * 40)),
            "location_estimate": estimate_barangay(pad_lat, pad_lng),
            "reasoning": "Low agent density; monitor for changes.",
        }
        hotspots.append(hp)

    risk_index = round(min(0.99, sum(h["risk_score"] for h in hotspots) / 3.0), 3)

    # ---- 5. Summary ----
    top = hotspots[0]
    summary = (
        f"After {days} day(s), {total_mobile} mosquito agents were modeled across "
        f"{len(req.reports)} source site(s). "
        f"Primary clustering detected at {top['location_estimate']} "
        f"(risk score {top['risk_score']:.0%}). "
        f"Weather conditions — {weather['temp_c']}°C, {weather['humidity']:.0f}% humidity — "
        f"{'are near-optimal for Aedes breeding. Immediate intervention recommended.' if weather['temp_c'] > 30 and weather['humidity'] > 75 else 'remain moderate; continue monitoring.'}"
    )

    # ---- 6. Movement analysis ----
    movement_analysis = analyze_movement_patterns(hotspots, weather, days)
    
    # ---- 7. AI insights (async) ----
    ai_insights = await generate_ai_insights(hotspots, weather, days, total_mobile)

    return {
        "day": days,
        "weather": {
            "temp_c":   weather["temp_c"],
            "humidity": weather["humidity"],
            "wind_kph": weather["wind_kph"],
            "condition": weather["condition"],
        },
        "total_agents": total_mobile,
        "hotspot_predictions": hotspots,
        "summary": summary,
        "risk_index": risk_index,
        "movement_analysis": movement_analysis,
        "ai_insights": ai_insights,
    }

# ========== Routes ==========
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Aedify ABM Server"}

@app.post("/simulate")
async def simulate(req: SimulateRequest):
    """Standard blocking endpoint for simulation results."""
    return await run_abm(req)

@app.post("/simulate-stream")
async def simulate_stream(req: SimulateRequest):
    """Streaming endpoint for real-time updates during simulation."""
    async def event_generator() -> AsyncGenerator[str, None]:
        # Send initial status
        yield f"data: {json.dumps({'stage': 'initializing', 'progress': 0})}\n\n"
        
        # Run full simulation
        result = await run_abm(req)
        
        # Send each hotspot as it's "discovered"
        for i, hotspot in enumerate(result["hotspot_predictions"]):
            progress = int((i + 1) / max(len(result["hotspot_predictions"]), 1) * 100)
            yield f"data: {json.dumps({'stage': 'hotspot', 'progress': progress, 'hotspot': hotspot, 'index': i})}\n\n"
        
        # Send final result
        yield f"data: {json.dumps({'stage': 'complete', 'progress': 100, 'result': result})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("abm_server:app", host="0.0.0.0", port=5000, reload=True)