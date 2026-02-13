# Route Setup Guide

## Creating the VV1 Route

The route "VV1" needs to be created in the database before the stops list can be displayed.

### Option 1: Using Postman or any HTTP client

1. Make a **POST** request to: `http://localhost:4000/api/routes` (or your backend URL)

2. Set headers:
   ```
   Content-Type: application/json
   ```

3. Send this JSON body:

```json
{
  "routeId": "VV1",
  "routeName": "VV1 Bus Route",
  "description": "Kankipadu ↔ Poranki",
  "startLocation": "Kankipadu",
  "endLocation": "Poranki",
  "stops": [
    {
      "name": "Kankipadu",
      "location": { "lat": 16.52746, "lon": 80.628769 },
      "scheduledTime": "07:25 AM",
      "isActive": true
    },
    {
      "name": "Gosala",
      "location": { "lat": 16.5292, "lon": 80.6310 },
      "scheduledTime": "07:30 AM",
      "isActive": true
    },
    {
      "name": "Edupugallu",
      "location": { "lat": 16.5282, "lon": 80.6292 },
      "scheduledTime": "07:32 AM",
      "isActive": true
    },
    {
      "name": "Penumaluru",
      "location": { "lat": 16.5120, "lon": 80.6204 },
      "scheduledTime": "07:40 AM",
      "isActive": true
    },
    {
      "name": "Poranki",
      "location": { "lat": 16.5032, "lon": 80.6310 },
      "scheduledTime": "07:45 AM",
      "isActive": true
    }
  ],
  "vehicle": {
    "number": "VV-12",
    "model": "Bus",
    "capacity": 50
  },
  "isActive": true,
  "busCapacity": 50,
  "currentPassengers": 0
}
```

### Option 2: Using curl (command line)

```bash
curl -X POST http://localhost:4000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "VV1",
    "routeName": "VV1 Bus Route",
    "description": "Kankipadu ↔ Poranki",
    "startLocation": "Kankipadu",
    "endLocation": "Poranki",
    "stops": [
      {
        "name": "Kankipadu",
        "location": { "lat": 16.52746, "lon": 80.628769 },
        "scheduledTime": "07:25 AM",
        "isActive": true
      },
      {
        "name": "Gosala",
        "location": { "lat": 16.5292, "lon": 80.6310 },
        "scheduledTime": "07:30 AM",
        "isActive": true
      },
      {
        "name": "Edupugallu",
        "location": { "lat": 16.5282, "lon": 80.6292 },
        "scheduledTime": "07:32 AM",
        "isActive": true
      },
      {
        "name": "Penumaluru",
        "location": { "lat": 16.5120, "lon": 80.6204 },
        "scheduledTime": "07:40 AM",
        "isActive": true
      },
      {
        "name": "Poranki",
        "location": { "lat": 16.5032, "lon": 80.6310 },
        "scheduledTime": "07:45 AM",
        "isActive": true
      }
    ],
    "vehicle": {
      "number": "VV-12",
      "model": "Bus",
      "capacity": 50
    },
    "isActive": true,
    "busCapacity": 50,
    "currentPassengers": 0
  }'
```

### Option 3: Using MongoDB directly

If you have MongoDB Compass or mongo shell access, you can insert the route directly into the `busroutes` collection.

## Verification

After creating the route, verify it exists by:

```bash
GET http://localhost:4000/api/routes/VV1
```

Or check the stops endpoint:

```bash
GET http://localhost:4000/api/routes/VV1/stops-with-arrivals
```

## Notes

- The tracker being on/off doesn't affect route fetching - routes must exist in the database
- Once the route is created, the stops list will automatically appear
- You can create multiple routes using the same POST endpoint














