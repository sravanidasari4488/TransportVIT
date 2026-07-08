# VIT-AP Bus Transport Management System

## Overview

This is a campus bus transport application for **VIT-AP** (Vijayawada and Guntur routes). Students use it to view their assigned route, track live bus position on a map, and see stop-level arrival times. Admin/faculty staff use it to monitor arrivals across routes, upload student rosters, and manage fees data.

The codebase is a **React Native (Expo) mobile frontend** paired with a **Node.js / Express backend** and **MongoDB** (via Mongoose). Real-time updates use **Socket.IO** for arrival events, combined with **HTTP polling** for GPS coordinates and REST-backed arrival data.

---

## Architecture

### High-level communication

```
[GPS device / external client]
        │  GET /api/gps/update_location?lat=&lon=&route=&busNumber=
        ▼
[Express API + MongoDB]  ──REST──►  [Expo app: students & faculty]
        │
        │  Socket.IO (default namespace)
        │  emit → room `route-{ROUTEID}`
        ▼
[Connected clients in that route room]
```

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | Expo ~54, React Native 0.81, Expo Router, TypeScript | Mobile UI, maps (WebView + Google Maps), Socket.IO client |
| Backend | Express 4, Socket.IO 4, Mongoose 8 | REST API, WebSocket server, business logic |
| Database | MongoDB | Routes, GPS points, arrivals, users, fees, trackers |

The frontend resolves the API base URL via `Frontend/app/config/api.ts`, which tries (in order): `expo.extra.apiUrl` from `app.json`, the Expo dev host on port `4000`, `10.0.2.2:4000` (Android emulator), `localhost:4000`, then a Railway fallback (`https://git-backend-1-production.up.railway.app`).

**Note:** Several screens also call `https://git-backend-1-production.up.railway.app` directly for GPS endpoints, independent of `API_CONFIG`.

### Location / data update flow

There are **three separate ingestion paths** in the code:

#### 1. External GPS ingestion (primary server-side path)

1. A client (GPS hardware, script, or bus device) calls:
   ```
   GET /api/gps/update_location?lat={lat}&lon={lon}&route={routeId}&busNumber={optional}
   ```
2. `gpsController.updateLocation` saves a `GpsLocation` document.
3. It loads the matching `BusRoute` and runs **Haversine proximity** (`findNearestStop`, 50 m radius) against embedded route stops.
4. If the bus is near a stop and no arrival exists for that stop **today**, it creates an `Arrival` record and emits Socket.IO `arrival-update` to room `route-{ROUTEID}`.
5. On every GPS update (whether or not an arrival is created), it emits `gps-update` to the same room.

#### 2. Client-side map tracking (polling)

`BusRouteScreen.tsx` and per-route screens (`vv1.tsx`, `gv1.tsx`, etc.) poll GPS over HTTP:

- `GET /api/gps/latest_location/:route` every **10 seconds** (map live marker).
- Embedded WebView maps poll every **5 seconds** inside HTML.
- Today's arrivals: `GET /api/arrivals/route/:routeId/today` every **30 seconds**.
- GPS-to-stop matching on the client: `GET /api/gps/all_locations/:route` every **30 seconds**, matching coordinates within **200 m** on the client.

When the client detects the bus within **50 m** of a stop (with a **2-minute cooldown**), it `POST`s to `/api/arrivals`, which persists the record and triggers another `arrival-update` socket emit.

#### 3. Tracker documents (REST only, no Socket.IO)

`POST /api/trackers/update-location` upserts a `Tracker` document. The faculty arrival dashboard polls tracker/GPS online status every **30 seconds** by checking whether `latest_location` timestamps are within **5 minutes**. Tracker updates do **not** emit Socket.IO events.

### Socket.IO: rooms, namespaces, and isolation

| Aspect | Implementation |
|--------|----------------|
| **Namespaces** | Default namespace only (`/`). No custom namespaces are defined in `server.js`. |
| **Rooms** | `route-{ROUTEID}` where `ROUTEID` is uppercased (e.g. `route-VV1`). |
| **Client join** | Clients emit `join-route` with either a string (`"VV1"`) or `{ routeId: "VV1" }`. Server normalizes to uppercase and joins the room. |
| **Server confirm** | Server emits `route-joined` back to the joining socket only. |
| **Client leave** | `leave-route` with the same payload shapes. |
| **Broadcast events** | `arrival-update` (used by clients), `gps-update` (emitted by server; **no frontend listener found in the codebase**). |

**Concurrent updates / multi-route handling:**

- Isolation is **room-based**: `global.io.to('route-VV1').emit(...)` targets only clients that joined `route-VV1`. A student watching VV1 does not receive VV2 events unless they joined that room too.
- The faculty **arrival dashboard** intentionally joins **all** available route rooms on one socket connection.
- There is **no** server-side batching, throttling, or debouncing of socket emits. Each GPS hit near a new stop or each `POST /api/arrivals` triggers an immediate emit.
- Duplicate arrivals are suppressed at the **database** layer (one arrival per route + stop per day in `gpsController`; per route + bus + stop per day in `arrivalController`), not at the socket layer.

**Transports:** Clients use `['websocket', 'polling']` or `['polling', 'websocket']` with reconnection enabled on the faculty dashboard.

---

## Database Design

MongoDB is accessed through Mongoose models in `Backend/models/`. There are **no `2dsphere` or geospatial indexes**; proximity is computed in application code (`Backend/utils/distanceUtils.js`).

### Core collections

#### `BusRoute` (`BusRoute.js`)

Canonical route definition. Key fields:

- `routeId` — unique, uppercased string (e.g. `VV1`, `GV3`)
- `routeName`, `description`, `startLocation`, `endLocation`
- `stops[]` — embedded subdocuments: `name`, `location.{lat, lon}`, `scheduledTime`, `estimatedTime`, `isActive`
- `students[]` — array of registration numbers
- `driver`, `vehicle`, `schedule`, `busCapacity`, `currentPassengers`, `isActive`
- `timestamps: true`

**Indexes:** `routeId` unique (schema-level). No compound indexes beyond that.

#### `GpsLocation` (`GpsLocation.js`)

Raw GPS points:

- `route`, `lat`, `lon`, optional `stopName`, `timestamp` (defaults to `Date.now`)

**Indexes:** none declared in schema. Queries use `.sort({ timestamp: -1 })` or date-range filters in application code.

#### `Arrival` (`Arrival.js`)

Stop arrival records:

- `routeId`, `busNumber`, `stopName`, `scheduledTime`, `actualTime`
- `arrivalTimestamp`, `delay` (minutes), `status` (`on_time` | `delayed` | `early`)
- `location.{lat, lng}`, `occupancy`, `passengerCount`, weather/traffic metadata

**Indexes:**

```js
{ routeId: 1, stopName: 1, arrivalTimestamp: -1 }
{ busNumber: 1, arrivalTimestamp: -1 }
{ createdAt: -1 }
// plus field-level index: true on routeId, busNumber, stopName, arrivalTimestamp, createdAt
```

**Pre-save hook:** computes `delay` and `status` from scheduled vs actual time strings.

**Statics:** `getArrivalStats` (aggregation), `getRecentArrivals`, `getTodayArrivals` (case-insensitive `routeId` matching via `$or`).

#### `RouteStop` (`RouteStop.js`)

Legacy/flat stop table: `route`, `stopName`, `lat`, `lon`, `scheduledTime`. Used by `stopController` and `routeController.getStopsByRoute`. Route data in the app primarily comes from `BusRoute.stops`.

#### `Tracker` (`Tracker.js`)

Device/tracker state per bus:

- `trackerId` (unique), `routeId`, `busNumber`, `currentLocation`, `currentArea`, `currentTime`, `isOnline`, `status`, speed/heading/battery fields

**Indexes:**

```js
{ routeId: 1, currentTime: -1 }
{ busNumber: 1, currentTime: -1 }
{ status: 1 }
{ isOnline: 1 }
```

#### `User` (`User.js`)

- `regNo` (unique, sparse index), `email` (unique), `password` (bcrypt hash), `role` (`faculty` | `student` | `admin`)
- `busRoute`, `dues`, `paidStatus`, `isFirstLogin`, `firebaseUid` (unique, sparse — field exists but primary login does not use Firebase)
- `preferences`, `lastLogin`

#### Other models

| Model | Purpose | Notable indexes |
|-------|---------|-----------------|
| `StudentFees` | Semester fee records from CSV upload | `regNumber`, `semester`, `thisSemPaidOrNotPaid`, `uploadDate` |
| `Analytics` | Per-route daily metrics and nested `stops` / `issues` | `{ routeId: 1, date: 1 }` |
| `Image` | Uploaded profile images (filesystem path stored) | `{ userId: 1, imageType: 1 }`, `{ fileName: 1 }` |
| `AdminUpload` | Audit log for admin CSV uploads | none beyond defaults |

### Query patterns in code

- **Latest GPS:** `GpsLocation.findOne({ route }).sort({ timestamp: -1 })`
- **GPS history:** `GpsLocation.find(query).sort({ timestamp: 1 }).select(...).lean()` with optional date filter
- **Today's arrivals:** date-range on `arrivalTimestamp` plus case-insensitive `routeId` `$or` queries
- **Stops with arrivals:** `getRouteStopsWithArrivals` joins `BusRoute.stops` with today's `Arrival` documents in memory (latest per stop via map)
- **Student counts per route:** `User.aggregate` grouping by `busRoute`
- **Proximity:** Haversine in `distanceUtils.js`, not `$geoNear` / `$near`

Valid route IDs for admin CSV upload are hardcoded as **VV1–VV10** and **GV1–GV10** in `adminController.js`.

---

## Authentication & Authorization

### Primary auth flow (actually wired)

Login is **custom JWT + bcrypt**, not Firebase:

1. `POST /api/auth/login` with `{ username, password, role }` where `role` is `"student"` or `"admin"`.
2. Students authenticate by `regNo` + password. Admins use `admin@vitap` (auto-created on first login with default password `vitap@123`).
3. Server returns a JWT (`jsonwebtoken`, **7-day** expiry) signed with `JWT_SECRET` (falls back to `dev_jwt_secret_change_me` if unset).
4. Frontend `AuthProvider` stores token + user in **AsyncStorage** (`auth_token`, `auth_user`).
5. Protected reads: `GET /api/auth/me` and `GET /api/auth/student/route` verify the `Authorization: Bearer <jwt>` header via `jwt.verify`.

Additional auth endpoints:

- `POST /api/auth/change-password` — first-login password change
- `POST /api/auth/forgot-password/request-otp` — OTP stored in an in-memory `Map` (10 min TTL); emailed via SMTP if configured, else logged to console
- `POST /api/auth/verify-otp` — resets password

### Roles and client-side authorization

| Role | Login UI | Post-login route | Capabilities in code |
|------|----------|------------------|----------------------|
| `student` | Reg number | `/Student` tabs | Restricted to assigned `busRoute`; `StudentRouteGate` blocks screens without a route; `BusRouteScreen` denies mismatched routes |
| `admin` | `admin@vitap` | `/Faculty` tabs | CSV upload, student management, arrival dashboard, fees |
| `faculty` | Same as admin in UI (`login.tsx` maps `"faculty"` param to admin login) | `/Faculty` | Treated as staff via `isStaffRole()` |

**Important:** Most REST endpoints (`/api/gps/*`, `/api/arrivals/*`, `/api/routes/*`, `/api/admin/*`, `/api/trackers/*`) have **no authentication middleware**. The backend has **no `middleware/` folder** and does not verify JWT or Firebase tokens on those routes. Authorization is enforced only on specific `/api/auth/*` handlers and in frontend route-guard logic.

### Firebase (partial / legacy)

- `Frontend/app/config/firebase.ts` initializes Firebase Auth (AsyncStorage persistence), Firestore, and Storage with a hardcoded `firebaseConfig`.
- `Frontend/src/services/api.ts` attaches Firebase ID tokens to axios requests — but the main `AuthProvider` login path does **not** use Firebase.
- `Faculty/student-fees-dashboard.tsx` sends `Authorization: Bearer ${firebase auth id token}` — the backend student-fees routes do not verify Firebase tokens in the controllers reviewed.
- `User.firebaseUid` exists in the schema; `POST /api/users/create-or-update` can store user records but is separate from the JWT login flow.

### Clerk

`@clerk/clerk-expo` is listed in `Frontend/package.json` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` appears in `Frontend/.env`, but Clerk is **not** integrated into `Frontend/app/_layout.tsx` or `AuthProvider`. A standalone `app/config/clerk.ts` exists at the repo root `app/` folder (legacy duplicate), not in the active Expo app tree.

### Session behavior

`_layout.tsx` calls `logout()` and redirects to `/(auth)` whenever the app returns from background to foreground (unless a file picker is active).

---

## Real-time Sync Details

Under the hood, "live tracking" is a **hybrid** of Socket.IO push and HTTP pull:

### Arrival sync (Socket.IO)

**Server emit triggers:**

1. `gpsController.updateLocation` — after creating a new daily `Arrival` near a stop
2. `arrivalController.recordArrival` — after `POST /api/arrivals` (including client-detected arrivals from `BusRouteScreen`)

**Payload shape (`arrival-update`):**

```js
{
  routeId,        // uppercase
  stopName,
  scheduledTime,
  actualTime,
  arrivalTimestamp,
  delay,
  status,
  // recordArrival also includes: busNumber, location, occupancy, passengerCount
}
```

**Client handlers:**

| Screen | On `arrival-update` |
|--------|---------------------|
| `Faculty/arrival-dashboard.tsx` | Patches in-memory stop state for matching `routeId` + `stopName` |
| `Student/arrivals.tsx` | Re-fetches route data via `fetchRouteWithStops()` |
| `components/RouteStopsList.tsx` | Updates the matching stop in local state |

All clients must `join-route` for the relevant route ID before receiving events.

### GPS sync (HTTP polling, not sockets)

Live map position uses repeated `GET /api/gps/latest_location/:route`. The server does emit `gps-update` on each location write, but **no client subscribes to `gps-update`** in the current frontend — maps rely on polling.

### "Tracker online" heuristic

Faculty dashboard considers a route's tracker "online" if the latest GPS document timestamp is **< 5 minutes** old (`checkTrackerStatus` in `arrival-dashboard.tsx`). This uses the production Railway GPS URL directly, not necessarily `API_CONFIG.BASE_URL`.

### Route ID vs GPS ID mapping

Display routes (e.g. `VV1`) may map to different GPS route identifiers (e.g. `VV-11`) in client code:

```ts
const routeToGpsMap = { 'VV1': 'VV-11', 'VV2': 'VV-11' };
```

Static route metadata (stops, schedules, coordinates) also lives in `Frontend/app/routes/busRouteData.ts` alongside MongoDB `BusRoute` documents.

---

## Tech Stack

### Frontend (`Frontend/`)

| Category | Packages (from `package.json`) |
|----------|-------------------------------|
| Framework | Expo ~54, React 19.1, React Native 0.81.5 |
| Navigation | Expo Router ~6, React Navigation 7 |
| Styling | NativeWind 4, Tailwind CSS 3 |
| HTTP / state | axios, zustand |
| Real-time | socket.io-client ^4.8.1 |
| Maps | react-native-webview, mapbox-gl (dependency present), Google Maps in WebView HTML |
| Auth (installed) | firebase ^11.8.1, @clerk/clerk-expo ^2.14.9 |
| Other | expo-camera, expo-image-picker, @tensorflow/tfjs-react-native |

### Backend (`Backend/`)

| Category | Packages |
|----------|----------|
| Runtime | Node.js, Express ^4.21 |
| Database | Mongoose ^8.12 |
| Real-time | socket.io ^4.8.1 |
| Auth | jsonwebtoken, bcryptjs |
| File upload | multer, csv-parser, xlsx |
| Email | nodemailer |
| Config | dotenv, cors |

### Infrastructure references in code

- Deployed backend URL used in multiple places: `https://git-backend-1-production.up.railway.app`
- Alternate URL in `src/services/api.ts`: `https://vit-bus-backend-production.up.railway.app`
- Local default port: **4000**

---

## Setup / Installation

### Prerequisites

- Node.js (Backend `README.md` suggests v16+)
- MongoDB instance or Atlas cluster
- Expo CLI / Expo Go for mobile development

### Backend

```bash
cd Backend
npm install
```

Create `Backend/.env` with at minimum:

| Variable | Used in code | Notes |
|----------|--------------|-------|
| `MONGO_URI` | `server.js`, scripts | Required for DB features; server starts without it but logs a warning |
| `PORT` | `server.js` | Defaults to `4000` |
| `JWT_SECRET` | `authController.js` | Defaults to `dev_jwt_secret_change_me` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | `authController.js` | Optional; OTP emailed only if `SMTP_USER` is set |

Variables present in sample `.env` / `Backend/env` but **not referenced in `server.js` or controllers**: `HOST`, `NODE_ENV`, `FRONTEND_URL`, `JWT_EXPIRES_IN`, `RATE_LIMIT_*`, `LOG_LEVEL`.

```bash
npm run dev    # nodemon server.js
npm start      # node server.js
```

Health check: `GET /test` returns `{ message: 'Server is running!', timestamp }`.

Optional seed scripts (require `MONGO_URI`):

- `node scripts/seedRoutes.js`
- `node scripts/addSampleGpsData.js`
- `node scripts/addSampleTrackerData.js`

### Frontend

```bash
cd Frontend
npm install   # or yarn
```

Configure API URL in `Frontend/app.json`:

```json
"extra": {
  "apiUrl": "http://<your-lan-ip>:4000"
}
```

`Frontend/app/config/api.ts` builds a fallback candidate list from this value, Expo dev host, emulator host, and Railway.

Optional `Frontend/.env`:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (not wired into main app layout) |
| `REACT_APP_MAPBOX_TOKEN` | Mapbox token (if used) |

From repo root:

```bash
npm start          # runs: cd Frontend && npx expo start
# or
start-expo.cmd     # Windows helper; cds into Frontend first
```

Platform targets: `npm run android`, `npm run ios`, `npm run web` (from root or `Frontend/`).

### Default credentials (from `authController.js` / login UI)

| Role | Username | Default password |
|------|----------|------------------|
| Admin | `admin@vitap` | `vitap@123` |
| Student | Registration number (from CSV upload) | `{name}@123` variant or `vitap@123` per upload rules |

Students are provisioned via admin CSV upload (`POST /api/admin/upload-students-csv`), not self-registration.

---

## Project Structure

```
VITTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT-main/
├── README.md
├── package.json                 # Root scripts → Frontend Expo
├── start-expo.cmd
├── app.json                     # Root-level Expo config (duplicate/legacy)
├── app/                         # Legacy duplicate route screens + clerk.ts
│   ├── config/clerk.ts
│   └── routes/                  # gv*.tsx, vv*.tsx copies
├── ARRIVAL_DASHBOARD_IMPLEMENTATION.md
├── student_fees_100.csv         # Sample fees CSV
│
├── Backend/
│   ├── server.js                # Express + Socket.IO entry point
│   ├── package.json
│   ├── controllers/
│   │   ├── adminController.js     # CSV/XLSX student upload
│   │   ├── analyticsController.js
│   │   ├── arrivalController.js # Arrivals CRUD + socket emit
│   │   ├── arrivalBulkController.js
│   │   ├── authController.js    # JWT login, OTP, me
│   │   ├── gpsController.js     # GPS ingest + socket emit
│   │   ├── imageController.js
│   │   ├── routeController.js   # BusRoute CRUD, stops-with-arrivals
│   │   ├── stopController.js
│   │   ├── studentFeesController.js
│   │   ├── trackerController.js
│   │   └── userController.js
│   ├── models/                  # Mongoose schemas (see Database Design)
│   ├── routes/
│   │   ├── index.js             # Mounts all /api/* routers
│   │   ├── auth.js, admin.js, gps.js, arrivals.js, routes.js
│   │   ├── trackers.js, stops.js, users.js, analytics.js
│   │   ├── images.js, studentFees.js
│   │   ├── vv11.js, vv12.js     # Legacy GPS aliases
│   │   └── ...
│   ├── utils/distanceUtils.js   # Haversine proximity
│   ├── scripts/                 # seedRoutes, sample GPS/tracker data
│   └── uploads/                 # admin + csv uploads (runtime)
│
└── Frontend/                    # Active Expo application
    ├── app.json
    ├── app/
    │   ├── _layout.tsx          # AuthProvider, theme, session reset
    │   ├── index.tsx            # Splash → /(auth)
    │   ├── (auth)/              # Login, forgot password, AuthProvider
    │   ├── Student/             # Student tab screens
    │   ├── Faculty/             # Admin/faculty tab screens
    │   ├── routes/              # Per-route map screens (vv1–vv10, gv1–gv10)
    │   ├── components/          # RouteStopsList, StudentRouteGate
    │   ├── config/              # api.ts, firebase.ts
    │   ├── constants/colors.ts
    │   ├── types/auth.ts
    │   └── utils/routeAccess.ts
    ├── src/services/
    │   ├── api.ts               # Firebase-token axios (legacy)
    │   ├── arrivalService.ts
    │   └── trackerService.ts
    ├── assets/
    └── metro.config.js
```

### Main API surface (`/api` prefix)

| Prefix | Key endpoints |
|--------|---------------|
| `/api/gps` | `GET update_location`, `GET latest_location/:route`, `GET all_locations/:route` |
| `/api/arrivals` | `POST /`, `GET /route/:routeId/today`, `GET /route/:routeId`, stats/analytics |
| `/api/routes` | `GET /`, `GET /:routeId`, `GET /:routeId/stops-with-arrivals`, `GET /:routeId/with-location` |
| `/api/auth` | `POST login`, `GET me`, `GET student/route`, password/OTP flows |
| `/api/admin` | `POST upload-students-csv`, file CRUD |
| `/api/trackers` | `POST update-location`, `GET /`, `GET route/:routeId` |
| `/api/users` | CRUD by regNo / userId |
| `/api/student-fees` | CSV upload and fee queries |
| `/api/stops` | `GET /:route`, `POST log_stop_time` |
| `/api/analytics` | Route analytics and dashboard |
| `/api/vv11`, `/api/vv12` | Legacy aliases → `gpsController` |

---

## Known implementation notes (for accurate technical discussion)

1. **Hybrid real-time model** — Arrivals push over Socket.IO; GPS position pulls over HTTP polling. `gps-update` socket events are emitted but unused by clients.
2. **No geospatial indexes** — All proximity logic is Haversine in Node.js / React Native, with a **50 m** server threshold and **200 m** client threshold in some screens.
3. **Open API** — Aside from `/api/auth/me` and `/api/auth/student/route`, most endpoints accept unauthenticated requests.
4. **Dual route data** — MongoDB `BusRoute` documents plus static `busRouteData.ts` in the frontend; GPS route IDs may differ from display route IDs.
5. **Backend/README.md discrepancies** — The nested `Backend/README.md` documents rate limiting, Helmet, `/health`, and `/api/gps/update` paths that do not match the actual `server.js` implementation. This root README reflects the running code.
6. **Auth stack split** — Production login path is JWT; Firebase and Clerk dependencies exist but are not the primary auth mechanism.
