# VIT-AP Bus Transport Management System
 
## Overview
 
A campus bus transport app for VIT-AP (Vijayawada & Guntur routes). Students view their assigned route, track live bus position on a map, and see stop-level arrival times. Admin/faculty monitor arrivals across all routes, upload student rosters, and manage fee records.
 
**Stack:** React Native (Expo) frontend, Node.js/Express backend, MongoDB (Mongoose), Socket.IO for live arrival events, HTTP polling for GPS position.
 
## Architecture
 
```
[GPS device / external client]
        │  GET /api/gps/update_location
        ▼
[Express API + MongoDB]  ──REST──►  [Expo app: students & faculty]
        │
        │  Socket.IO → room `route-{ROUTEID}`
        ▼
[Connected clients in that route room]
```
 
| Layer | Technology | Role |
|-------|------------|------|
| Frontend | Expo, React Native, TypeScript | Mobile UI, maps, Socket.IO client |
| Backend | Express, Socket.IO, Mongoose | REST API, WebSocket server |
| Database | MongoDB | Routes, GPS points, arrivals, users, fees |
 
## Highlights
 
- **Room-based Socket.IO isolation** — clients join `route-{ROUTEID}` rooms so a student watching VV1 never receives VV2 traffic. The faculty dashboard joins every room on one connection to monitor all routes at once.
- **Hybrid real-time model** — arrivals push instantly over Socket.IO; GPS position is pulled via polling (10s map refresh, 30s arrival refresh), since live position tolerates a small lag but arrival events shouldn't be missed.
- **Proximity detection** — Haversine distance calculation matches bus GPS to the nearest stop (50m server-side threshold, with a 2-minute cooldown to prevent duplicate arrival records for the same stop).
- **Compound indexes** on `Arrival` (`routeId + stopName + arrivalTimestamp`) and `Tracker` (`routeId/busNumber + currentTime`) to keep dashboard queries fast as arrival history grows.
## How location updates flow
 
There are three ingestion paths:
 
1. **External GPS ingestion** — a device calls `GET /api/gps/update_location`, which saves a GPS point, runs Haversine proximity against the route's stops, creates an `Arrival` record if the bus is near an unvisited stop, and emits `arrival-update` + `gps-update` to the route's Socket.IO room.
2. **Client-side detection** — the map screen also polls GPS directly and independently detects proximity (200m threshold), posting to `/api/arrivals` when it detects an arrival — a second, client-driven path to the same result.
3. **Tracker heartbeat** — a separate `Tracker` document tracks device online/offline status via a "last seen within 5 minutes" heuristic. This path is REST-only and does not emit Socket.IO events.
Duplicate arrivals are prevented at the database layer (one arrival per route+stop+day), not the socket layer — there's no batching or debouncing on emits, so each GPS hit or POST triggers an immediate broadcast.
 
## Database Design
 
MongoDB via Mongoose, no `2dsphere`/geospatial indexes — proximity is computed in application code (`distanceUtils.js`), not with MongoDB's native geo queries.
 
| Collection | Purpose | Notable indexes |
|---|---|---|
| `BusRoute` | Route + embedded stops, driver, vehicle, capacity | `routeId` (unique) |
| `GpsLocation` | Raw GPS points | none (sorted by timestamp at query time) |
| `Arrival` | Stop arrival records, delay/status | `routeId+stopName+arrivalTimestamp`, `busNumber+arrivalTimestamp` |
| `Tracker` | Per-bus device/online state | `routeId+currentTime`, `status`, `isOnline` |
| `User` | Auth, role, assigned route, fee status | `regNo` (unique), `email` (unique) |
| `StudentFees` | Semester fee records from CSV upload | `regNumber`, `semester` |
 
## Authentication
 
Login is custom **JWT + bcrypt** — not Firebase, despite Firebase and Clerk both being present as dependencies (legacy/incomplete integrations from earlier iterations). Students authenticate with registration number + password; admins use a fixed admin account. Tokens are verified on `/api/auth/me` and a few protected routes.
 
**Known gap:** most REST endpoints (`/api/gps/*`, `/api/arrivals/*`, `/api/routes/*`, `/api/admin/*`) have no auth middleware — authorization is enforced in frontend route guards, not on the backend itself. This was scoped for functionality first; hardening endpoint-level auth would be a natural next step.
 
## Tech Stack
 
| Category | Frontend | Backend |
|---|---|---|
| Core | Expo, React Native, TypeScript | Node.js, Express |
| Real-time | socket.io-client | socket.io |
| Data | axios, zustand | Mongoose, MongoDB |
| Maps | react-native-webview, Google Maps | — |
| Auth | AsyncStorage session | jsonwebtoken, bcryptjs |
| Other | NativeWind/Tailwind | multer, csv-parser, nodemailer |
 
Deployed on Railway (backend) and Expo (mobile).
 
## Setup
 
**Backend**
```bash
cd Backend
npm install
# Create .env with MONGO_URI, PORT (default 4000), JWT_SECRET
npm run dev
```
 
**Frontend**
```bash
cd Frontend
npm install
# Set apiUrl in app.json → extra.apiUrl
npm start
```
 
Seed sample data: `node scripts/seedRoutes.js`, `addSampleGpsData.js`, `addSampleTrackerData.js`.
 
## Project Structure
 
```
Backend/
├── server.js              # Express + Socket.IO entry point
├── controllers/           # gpsController, arrivalController, authController, etc.
├── models/                # Mongoose schemas
├── routes/                # /api/* route definitions
├── utils/distanceUtils.js # Haversine proximity
└── scripts/                # Seed data
 
Frontend/
├── app/
│   ├── (auth)/            # Login, AuthProvider
│   ├── Student/           # Student screens
│   ├── Faculty/           # Admin/faculty screens
│   └── routes/            # Per-route map screens (VV1-10, GV1-10)
└── src/services/          # API and socket service layers
```
