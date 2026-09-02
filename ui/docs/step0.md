# NERA — AI-Based Avoid-Area Detection & Intelligent Routing

You are working on the **NERA Routing Engine**. Your task is to implement an AI-assisted routing system that does more than simply find the shortest/fastest route.

## 1. Core Objective

When a user requests directions:

**Origin (A) → Destination (B)**

the system should:

1. Generate/identify the relevant route corridor between A and B.
2. Identify areas/road segments relevant to that journey.
3. Analyze **historical data + today's/current data**.
4. Determine which areas/road segments should be:

   * `SAFE`
   * `CAUTION`
   * `AVOID`
5. Provide an explanation for every avoid recommendation.
6. Convert the avoid recommendations into geographic routing constraints.
7. Generate a final road-compliant route that bypasses the risky/blocked areas.
8. Return the final route along with the avoided areas and reasons.

The important architectural principle is:

**AI/Risk Layer decides WHAT should be avoided and WHY.
Routing Engine decides HOW to get around it.**

---

# 2. Overall Architecture

Implement the following logical pipeline:

```text
User: A → B
      |
      v
Baseline Route / Candidate Routes
      |
      v
Journey Corridor Extraction
      |
      v
Relevant Areas / Road Segments
      |
      +-----------------------------+
      |                             |
Historical Dataset             Today's Data
      |                             |
      +-------------+---------------+
                    |
                    v
             Risk / Recommendation
                  Model
                    |
                    v
        SAFE / CAUTION / AVOID
                    |
                    v
          Geographic Constraints
                    |
                    v
             Routing Engine
                    |
                    v
             Final Safe Route
                    |
                    v
     Route + ETA + Distance + Reasons
```

---

# 3. Historical Dataset

Historical data should contain previous incidents and conditions such as:

* Flooding
* Landslides
* Accidents
* Road closures
* Construction
* Traffic congestion
* Weather-related disruptions
* Other hazards

Example:

```text
Area A:
  12 flooding incidents in last 12 months

Area B:
  2 flooding incidents in last 12 months

Area C:
  8 accidents in last 12 months
```

Historical data should be used to learn patterns such as:

```text
Heavy rainfall
      +
Area has frequent historical flooding
      =
High flooding risk today
```

Do not blindly mark an area as dangerous simply because something happened there historically.

Historical information is evidence, not the final decision.

---

# 4. Today's / Current Data

The system should also consume current information wherever available.

Examples:

```text
Current rainfall
Current weather
Current accident reports
Current road closures
Current construction
Current flooding reports
Current traffic conditions
Current emergency/hazard information
```

Example:

```text
Historical:
Area X frequently floods during heavy rainfall.

Today's:
Heavy rainfall is currently occurring.

Risk Model:
Area X → HIGH RISK
Reason → Flooding probability is high.
```

The combination of historical and current data is important.

---

# 5. Risk / Recommendation Model

The model should NOT directly generate the route.

Its job is to evaluate areas/road segments.

For each candidate area/segment, produce a structured result:

```json
{
  "area_id": "area_123",
  "risk_score": 0.91,
  "risk_class": "AVOID",
  "confidence": 0.87,
  "reasons": [
    "Heavy rainfall",
    "Historical flooding pattern"
  ]
}
```

Possible classes:

```text
SAFE
CAUTION
AVOID
```

Example:

```text
Area A → SAFE
Area B → CAUTION
Area C → AVOID
```

---

# 6. Risk Features

Design the risk model so it can eventually use features such as:

```text
historical_flood_count
historical_accident_count
historical_closure_count
days_since_last_incident
historical_severity
rainfall_last_6h
rainfall_forecast
current_closure
current_accident
construction_status
traffic_delay
time_of_day
day_of_week
```

For an MVP, start with deterministic rules if an ML model is not yet available.

Example:

```text
IF verified_road_closure = true
    → AVOID

IF heavy_rainfall = true
AND historical_flood_frequency is high
    → AVOID

IF construction = true
AND expected_delay is moderate
    → CAUTION
```

Later, replace/augment these rules with an ML risk model trained on historical data.

Do NOT require a large LLM to make the core routing decision.

---

# 7. Journey Corridor

Do not analyze every area between the two locations across an entire region/country.

First obtain a baseline route:

```text
A ───────────────────── B
```

Then create a relevant corridor around that route:

```text
        ROUTE CORRIDOR
  =========================
        A ----------- B
  =========================
```

Identify:

* Administrative areas intersecting the route
* Road segments intersecting the route
* Hazard polygons intersecting/near the route
* Relevant alternative roads

This keeps computation focused on the actual journey.

---

# 8. Avoid-Area Representation

Avoid recommendations must become geographic objects.

Do NOT pass free-form AI text such as:

```text
"Don't go near Midnapore."
```

Instead, produce structured geographic constraints:

```json
{
  "area_id": "area_123",
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  },
  "risk_score": 0.92,
  "action": "AVOID",
  "reason": "Flooding",
  "confidence": 0.89,
  "valid_from": "...",
  "valid_until": "..."
}
```

The geometry should come from the GIS/database/routing data, NOT be invented by the AI.

---

# 9. Mappls MVP Implementation

For the initial implementation, use Mappls as the road-routing provider.

The simplest strategy is **waypoint-based detouring**.

Suppose:

```text
A ------------------------ B
          🚧 HAZARD
```

Generate one or more candidate bypass points outside the hazard:

```text
              V1
             ●
           /   \
          /     \
A --------       -------- B
       🚧 HAZARD
```

Then request:

```text
A → V1 → B
```

using Mappls multi-point routing.

The routing provider should generate the actual road-compliant path through the waypoint.

Important:

A waypoint is NOT itself an avoid-polygon feature.

It is a steering mechanism.

---

# 10. Bypass Waypoint Generation

When an avoid polygon intersects the baseline route:

1. Detect the intersection.
2. Find candidate bypass points outside the polygon.
3. Prefer points on/near the road network.
4. Generate multiple candidates if necessary.
5. Request routes for the candidates.
6. Compare:

   * ETA
   * Distance
   * Number/severity of remaining risks
   * Route feasibility
7. Select the best valid route.

Conceptually:

```text
Candidate 1 → A → V1 → B
Candidate 2 → A → V2 → B
Candidate 3 → A → V3 → B

Evaluate all candidates.

Select:
lowest acceptable travel cost
while satisfying hard avoid constraints.
```

Do not assume one tangent waypoint will work for every polygon.

---

# 11. Final Route Validation

After Mappls returns the route:

**Always validate the returned route geometry against hard avoid polygons.**

Example:

```text
        🚧 AVOID
       /────────\
A ----/----------\------ B
      \          /
       \________/
```

If the final route still intersects a hard avoid polygon:

```text
REJECT ROUTE
      ↓
Try next bypass candidate
      ↓
Re-route
```

This validation is mandatory.

Never assume that passing through one waypoint guarantees avoidance of the entire hazard polygon.

---

# 12. Custom Go Routing Engine — Future/Advanced Version

The project already has a Go-based Routing Engine.

If/when the Go engine owns the road graph:

```text
Nodes = intersections
Edges = roads
```

Every edge has a routing cost.

Example:

```text
Road A = 5
Road B = 10
Road C = 15
```

The shortest-path algorithm chooses the lowest-cost path.

For a hard avoid area:

```text
IF road intersects HARD_AVOID polygon:
    edge.cost = INF
```

Then:

```text
A ───── 🚧 ───── B
 \
  \──────────────/
       SAFE
```

The routing algorithm automatically finds another path.

Use algorithms such as:

```text
A*
Dijkstra
Contraction Hierarchies
```

depending on the existing Routing Engine architecture.

---

# 13. Soft vs Hard Avoidance

Support two types of constraints.

### HARD AVOID

Examples:

* Verified road closure
* Completely blocked road
* Severe hazard
* Emergency restriction

Implementation:

```text
edge.cost = INF
```

or disable the edge.

### SOFT AVOID

Examples:

* Heavy traffic
* Moderate construction
* Medium risk
* Historical risk with low confidence

Implementation:

```text
edge.cost += risk_penalty
```

This allows the engine to use the road only if there is no reasonable alternative.

---

# 14. Routing Cost Model

Eventually the routing engine can use:

```text
total_cost =
    travel_time
    + traffic_penalty
    + risk_penalty
    + road_class_penalty
```

Example:

```text
Normal road:
cost = 10

High-risk road:
cost = 10 + 50

Hard blocked road:
cost = INF
```

This allows NERA to optimize not just for shortest distance, but for:

**safe + practical + reasonably fast routing.**

---

# 15. Go Backend API Design

Create a clean API boundary.

Example:

```http
POST /api/v1/directions
```

Request:

```json
{
  "origin": {
    "lat": 22.34,
    "lon": 87.32
  },
  "destination": {
    "lat": 22.57,
    "lon": 88.36
  }
}
```

Backend flow:

```text
POST /directions
      ↓
Get baseline route
      ↓
Extract corridor
      ↓
Fetch risk data
      ↓
Generate avoid constraints
      ↓
Generate candidate route(s)
      ↓
Validate
      ↓
Return final result
```

Response should contain something similar to:

```json
{
  "route": {},
  "distance": 123.4,
  "duration": 4567,
  "avoided_areas": [
    {
      "area_id": "area_123",
      "reason": "Flooding",
      "risk_score": 0.91
    }
  ],
  "confidence": 0.87
}
```

---

# 16. AI Output Must Be Structured

Never allow the AI to return only natural language.

Bad:

```text
"You should probably avoid the road near Area X."
```

Good:

```json
{
  "segment_id": "road_456",
  "action": "AVOID",
  "risk_score": 0.94,
  "reason_codes": [
    "FLOODING",
    "HEAVY_RAIN"
  ]
}
```

The backend then converts `segment_id` into actual geographic constraints.

This prevents hallucinated locations/coordinates.

---

# 17. Recommended MVP

Do NOT try to build the complete ML + custom routing system immediately.

Implement in this order:

```text
PHASE 1
A → B normal Mappls routing

PHASE 2
Route geometry + corridor extraction

PHASE 3
Avoid-area database

PHASE 4
Simple rules-based risk engine

PHASE 5
Avoid polygon / segment detection

PHASE 6
Automatic bypass waypoint generation

PHASE 7
Mappls A → Waypoint → B routing

PHASE 8
Final route intersection validation

PHASE 9
Historical-data ML risk model

PHASE 10
Integrate risk penalties directly into
the custom Go graph routing engine
```

---

# 18. Critical Design Principle

The system should NOT work like:

```text
AI → "Here is your route"
```

It should work like:

```text
AI/Risk System
      ↓
"These areas/segments are risky today."
      ↓
Routing Engine
      ↓
"Okay, I'll find a road path around them."
```

Therefore:

**AI = WHAT + WHY**

**Routing Engine = HOW**

**Map/GIS = WHERE**

**Historical + Current Data = EVIDENCE**

---

# 19. Example End-to-End Scenario

User requests:

```text
Kharagpur → Kolkata
```

System finds:

```text
Baseline Route
A → B
```

Relevant corridor:

```text
Area A
Area B
Area C
Area D
```

Current + historical analysis:

```text
Area A → SAFE
Area B → SAFE
Area C → AVOID
           Reason: heavy rainfall + historical flooding
Area D → CAUTION
           Reason: construction
```

Convert to geographic constraints:

```text
AVOID_POLYGON = Area C
CAUTION_SEGMENTS = Area D
```

Generate bypass candidates:

```text
V1
V2
V3
```

Request:

```text
A → V1 → B
A → V2 → B
A → V3 → B
```

Validate all returned routes.

Select the best valid route.

Return:

```text
FINAL ROUTE
+
ETA
+
DISTANCE
+
AVOIDED AREA: Area C
+
REASON: Flooding risk
+
CONFIDENCE
```

---

# 20. What You Should Implement Now

First inspect the existing **Routing Engine** repository and understand:

* Current Go project structure
* Existing routing APIs
* Mappls integration
* Existing route models
* Existing geometry/GeoJSON handling
* Existing database
* Existing frontend/backend API contract

Then implement the smallest working version of this architecture **without breaking the existing routing functionality**.

Start with:

```text
Get Directions
      ↓
Baseline Mappls route
      ↓
Identify route corridor
      ↓
Check avoid polygons
      ↓
Generate bypass waypoint
      ↓
Mappls A → Waypoint → B
      ↓
Validate final route
      ↓
Return final route
```

Keep the risk-model interface modular so that a real ML model can be plugged in later without rewriting the routing layer.

Before changing existing code, inspect the repository and explain the relevant existing architecture and integration points. Then implement incrementally, test each stage, and preserve backward compatibility with the current directions API.
