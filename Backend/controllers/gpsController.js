const GpsLocation = require("../models/GpsLocation");
const BusRoute = require("../models/BusRoute");
const Arrival = require("../models/Arrival");
const { findNearestStop } = require("../utils/distanceUtils");

/**
 * Format time to 12-hour format (HH:mm:ss AM/PM)
 */
function formatTime12Hour(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Broadcast arrival to all connected clients
 */
function broadcastArrival(routeId, arrivalData) {
  if (global.io) {
    global.io.to(`route-${routeId.toUpperCase()}`).emit('arrival-update', arrivalData);
    console.log(`📢 Broadcasted arrival for route ${routeId}: ${arrivalData.stopName}`);
  }
}

exports.updateLocation = async (req, res) => {
    const { lat, lon, route, busNumber } = req.query;
    if (!lat || !lon || !route) return res.status(400).json({ error: "Missing lat, lon, or route" });

    try {
        const busLat = parseFloat(lat);
        const busLon = parseFloat(lon);
        const routeId = route.toUpperCase();

        // Save GPS location
        const newLocation = new GpsLocation({ lat: busLat, lon: busLon, route: routeId });
        await newLocation.save();

        // Get route with stops
        const busRoute = await BusRoute.findOne({ routeId: routeId });
        
        if (busRoute && busRoute.stops && busRoute.stops.length > 0) {
          // Check if bus is near any stop (50 meters)
          const nearestStop = findNearestStop(busLat, busLon, busRoute.stops, 50);

          if (nearestStop) {
            // Check if arrival already recorded for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const existingArrival = await Arrival.findOne({
              routeId: routeId,
              stopName: nearestStop.name,
              arrivalTimestamp: { $gte: today, $lt: tomorrow }
            });

            // Only record if not already recorded
            if (!existingArrival) {
              const now = new Date();
              const actualTime = formatTime12Hour(now);
              
              // Find scheduled time for this stop
              const scheduledTime = nearestStop.scheduledTime || 'N/A';

              // Create arrival record
              const arrival = new Arrival({
                routeId: routeId,
                busNumber: busNumber || busRoute.vehicle?.number || 'UNKNOWN',
                stopName: nearestStop.name,
                scheduledTime: scheduledTime,
                actualTime: actualTime,
                location: {
                  lat: busLat,
                  lng: busLon
                },
                occupancy: 'medium',
                passengerCount: 0,
                weather: 'clear',
                trafficCondition: 'moderate'
              });

              await arrival.save();

              // Broadcast arrival to all connected clients
              const arrivalData = {
                routeId: routeId,
                stopName: nearestStop.name,
                scheduledTime: scheduledTime,
                actualTime: actualTime,
                arrivalTimestamp: arrival.arrivalTimestamp,
                delay: arrival.delay,
                status: arrival.status
              };

              broadcastArrival(routeId, arrivalData);
            }
          }
        }

        // Broadcast GPS location update
        if (global.io) {
          global.io.to(`route-${routeId.toUpperCase()}`).emit('gps-update', {
            routeId: routeId,
            lat: busLat,
            lon: busLon,
            timestamp: new Date()
          });
        }

        res.json({ success: true, lat: busLat, lon: busLon, route: routeId });
    } catch (err) {
        console.error('Error updating location:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getLatestLocation = async (req, res) => {
    try {
        const data = await GpsLocation.findOne({ route: req.params.route }).sort({ timestamp: -1 });
        res.json(data || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all GPS locations for a route (including ones without stopName)
exports.getAllLocations = async (req, res) => {
    try {
        const { route } = req.params;
        const { date } = req.query; // Optional date filter (YYYY-MM-DD format)
        
        const routeId = route.toUpperCase();
        let query = { route: routeId };
        
        // If date is provided, filter by that date
        if (date) {
            const selectedDate = new Date(date);
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.timestamp = { $gte: startOfDay, $lte: endOfDay };
        }
        
        console.log(`📍 Fetching GPS locations from MongoDB Atlas for route: ${routeId}${date ? ` (date: ${date})` : ''}`);
        console.log(`📍 Query:`, JSON.stringify(query, null, 2));
        
        const locations = await GpsLocation.find(query)
            .sort({ timestamp: 1 })
            .select('lat lon timestamp stopName route')
            .lean();
        
        console.log(`✅ Fetched ${locations.length} GPS locations from MongoDB Atlas`);
        if (locations.length > 0) {
            console.log(`📍 Sample locations:`, locations.slice(0, 3).map(loc => ({
                lat: loc.lat,
                lon: loc.lon,
                timestamp: loc.timestamp,
                stopName: loc.stopName || 'N/A'
            })));
        }
        
        res.json(locations || []);
    } catch (err) {
        console.error('❌ Error fetching all GPS locations from MongoDB Atlas:', err);
        res.status(500).json({ error: err.message });
    }
};