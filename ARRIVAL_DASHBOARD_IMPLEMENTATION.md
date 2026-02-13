# Arrival Dashboard Implementation

## Overview
This implementation adds a real-time arrival tracking feature for bus routes. The system records bus arrivals at stops and displays them in a live-updating dashboard.

## Backend Changes

### 1. Updated `Backend/controllers/arrivalController.js`
- **Modified `recordArrival` function**: 
  - Now uses server timestamp if `arrivalTimestamp` is not provided in the request
  - Emits socket events to notify subscribed clients when a new arrival is recorded
  - Event name: `arrival-update`
  - Broadcasts to room: `route-{routeId}`

- **Added `getLatestArrivalsPerStop` function**:
  - Fetches the latest arrival for each stop in a route
  - Returns stops with their latest arrival data (or null if no arrival yet)
  - Used by the frontend to display current state

### 2. Updated `Backend/routes/arrivals.js`
- **Added new endpoint**: `GET /api/arrivals/routes/:routeId/arrivals`
  - Returns latest arrival per stop for the specified route
  - Response includes route info and array of stops with latest arrivals

### 3. Socket.IO Integration
- Socket events are automatically emitted when arrivals are recorded
- Clients can subscribe to route-specific rooms using `join-route` event
- Real-time updates are sent to all clients subscribed to the route

## Frontend Changes

### 1. Updated `Frontend/app/Faculty/arrival-dashboard.tsx`
Complete rewrite to focus on stop-based arrival tracking:

**New Features:**
- **Route Selection**: Users can select a route from available routes
- **Stops Display**: Shows all stops for the selected route
- **Latest Arrival Per Stop**: Displays the most recent arrival for each stop
- **Real-time Updates**: Automatically updates when new arrivals are recorded
- **LIVE Badge**: Shows a "LIVE" badge for arrivals that occurred within the last 5 minutes
- **Local Timezone**: Displays arrival times in the user's local timezone
- **Socket Connection**: Connects to socket server and subscribes to route updates
- **Proper Cleanup**: Disconnects socket and leaves route room on unmount

**State Management:**
- `selectedRouteId`: Currently selected route
- `routeInfo`: Route metadata (ID and name)
- `stopsWithArrivals`: Array of stops with their latest arrivals
- `socket`: Socket.IO connection instance
- `socketConnected`: Connection status

**Key Functions:**
- `fetchStopsWithArrivals()`: Loads stops and latest arrivals for a route
- `isArrivalLive()`: Checks if arrival occurred within last 5 minutes
- `formatLocalTime()`: Formats timestamp to local timezone
- Socket setup in `useEffect` with proper cleanup

### 2. Updated `Frontend/src/services/arrivalService.ts`
- **Added `getLatestArrivalsPerStop()` method**: 
  - Calls the new backend endpoint
  - Returns stops with latest arrivals
- **Updated API base URL**: Now uses `API_CONFIG.BASE_URL` for consistency

## API Endpoints

### POST /api/arrivals
Records a new arrival. If `arrivalTimestamp` is not provided, server timestamp is used.

**Request Body:**
```json
{
  "routeId": "VV1",
  "busNumber": "AP16AB1234",
  "stopName": "Kankipadu",
  "scheduledTime": "07:25 AM",
  "actualTime": "07:27 AM",
  "location": {
    "lat": 16.52746,
    "lng": 80.628769
  },
  "occupancy": "medium",
  "passengerCount": 25
}
```

**Response:**
```json
{
  "success": true,
  "message": "Arrival recorded successfully",
  "data": { ... }
}
```

### GET /api/arrivals/routes/:routeId/arrivals
Gets the latest arrival for each stop in a route.

**Example:** `GET /api/arrivals/routes/VV1/arrivals`

**Response:**
```json
{
  "success": true,
  "routeId": "VV1",
  "routeName": "VV1 Bus Route",
  "data": [
    {
      "stopName": "Kankipadu",
      "scheduledTime": "07:25 AM",
      "location": { "lat": 16.52746, "lon": 80.628769 },
      "isActive": true,
      "latestArrival": {
        "_id": "...",
        "busNumber": "AP16AB1234",
        "actualTime": "07:27 AM",
        "arrivalTimestamp": "2024-01-15T07:27:00.000Z",
        "delay": 2,
        "status": "on_time",
        "occupancy": "medium",
        "passengerCount": 25
      }
    },
    ...
  ],
  "count": 5
}
```

## Socket.IO Events

### Client to Server

**join-route**
```javascript
socket.emit('join-route', 'VV1');
```
Subscribe to real-time updates for a route.

**leave-route**
```javascript
socket.emit('leave-route', 'VV1');
```
Unsubscribe from route updates.

### Server to Client

**arrival-update**
Emitted when a new arrival is recorded for the subscribed route.

```javascript
socket.on('arrival-update', (data) => {
  // data contains:
  // - routeId
  // - busNumber
  // - stopName
  // - scheduledTime
  // - actualTime
  // - arrivalTimestamp
  // - delay
  // - status
  // - location
  // - occupancy
  // - passengerCount
});
```

## Testing

### Test Payloads
See `Backend/test-arrival-payload.json` for example POST requests.

### Manual Testing Steps

1. **Start the backend server:**
   ```bash
   cd Backend
   npm start
   ```

2. **Start the frontend:**
   ```bash
   cd Frontend
   npm start
   ```

3. **Test recording an arrival:**
   - Use Postman or curl to POST to `/api/arrivals`
   - See example payloads in `Backend/test-arrival-payload.json`

4. **Test the dashboard:**
   - Open the Arrival Dashboard in the app
   - Select a route (e.g., VV1)
   - View stops and their latest arrivals
   - Record a new arrival via API
   - Watch the dashboard update in real-time
   - Verify LIVE badge appears for arrivals within 5 minutes

## Features Implemented

✅ POST endpoint to save arrivals (uses server timestamp if none provided)
✅ GET /api/arrivals/routes/:routeId/arrivals to fetch latest arrival per stop
✅ ArrivalDashboardScreen that loads stops for a route
✅ Fetches latest arrival per stop
✅ Connects to socket server
✅ Subscribes to route
✅ Updates UI live when new arrival event is received
✅ Shows stop name
✅ Shows last arrival time in local timezone
✅ Shows "LIVE" badge if arrival occurred within last 5 minutes
✅ Proper state management
✅ Cleanup on unmount
✅ Basic error handling

## Notes

- The LIVE badge appears for arrivals that occurred within the last 5 minutes
- Arrival times are displayed in the user's local timezone
- Socket connection automatically reconnects if disconnected
- The dashboard fetches initial data on route selection
- Real-time updates only affect the specific stop that received the arrival
- All stops are displayed, even if they haven't received any arrivals yet






