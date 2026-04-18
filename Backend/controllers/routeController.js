const BusRoute = require("../models/BusRoute");
const GpsLocation = require("../models/GpsLocation");
const RouteStop = require("../models/RouteStop");

// Get all routes
exports.getAllRoutes = async (req, res) => {
    try {
        const routes = await BusRoute.find({ isActive: true }).sort({ routeId: 1 });
        res.json({
            success: true,
            routes
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get route by ID
exports.getRouteById = async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await BusRoute.findOne({ routeId: routeId.toUpperCase() });

        if (!route) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.json({
            success: true,
            route
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create new route
exports.createRoute = async (req, res) => {
    try {
        const routeData = req.body;
        
        // Check if route already exists
        const existingRoute = await BusRoute.findOne({ routeId: routeData.routeId.toUpperCase() });
        if (existingRoute) {
            return res.status(400).json({ error: "Route already exists" });
        }

        const route = new BusRoute(routeData);
        await route.save();

        res.status(201).json({
            success: true,
            route
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update route
exports.updateRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const updateData = req.body;

        const route = await BusRoute.findOneAndUpdate(
            { routeId: routeId.toUpperCase() },
            updateData,
            { new: true, runValidators: true }
        );

        if (!route) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.json({
            success: true,
            route
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete route
exports.deleteRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await BusRoute.findOneAndDelete({ routeId: routeId.toUpperCase() });

        if (!route) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.json({
            success: true,
            message: "Route deleted successfully"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get route with real-time location
exports.getRouteWithLocation = async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await BusRoute.findOne({ routeId: routeId.toUpperCase() });

        if (!route) {
            return res.status(404).json({ error: "Route not found" });
        }

        // Get latest GPS location
        const latestLocation = await GpsLocation.findOne({ 
            route: routeId.toUpperCase() 
        }).sort({ timestamp: -1 });

        res.json({
            success: true,
            route: {
                ...route.toObject(),
                currentLocation: latestLocation || null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update route status
exports.updateRouteStatus = async (req, res) => {
    try {
        const { routeId } = req.params;
        const { isActive, currentPassengers } = req.body;

        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (currentPassengers !== undefined) updateData.currentPassengers = currentPassengers;

        const route = await BusRoute.findOneAndUpdate(
            { routeId: routeId.toUpperCase() },
            updateData,
            { new: true }
        );

        if (!route) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.json({
            success: true,
            route
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get route statistics
exports.getRouteStats = async (req, res) => {
    try {
        const { routeId } = req.params;
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get GPS data for the period
        const gpsData = await GpsLocation.find({
            route: routeId.toUpperCase(),
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });

        // Calculate statistics
        const totalTrips = gpsData.length;
        const uniqueDays = [...new Set(gpsData.map(d => d.timestamp.toDateString()))].length;
        const avgTripsPerDay = uniqueDays > 0 ? totalTrips / uniqueDays : 0;

        res.json({
            success: true,
            stats: {
                routeId: routeId.toUpperCase(),
                period: `${days} days`,
                totalTrips,
                uniqueDays,
                avgTripsPerDay: Math.round(avgTripsPerDay * 100) / 100,
                lastUpdate: gpsData.length > 0 ? gpsData[gpsData.length - 1].timestamp : null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get stops by route (for backward compatibility)
exports.getStopsByRoute = async (req, res) => {
    try {
        const stops = await RouteStop.find({ route: req.params.route }).sort("time");
        res.json(stops);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get route stops with arrival times
exports.getRouteStopsWithArrivals = async (req, res) => {
    try {
        const { routeId } = req.params;
        const { date } = req.query; // Optional: YYYY-MM-DD for historical dates
        const route = await BusRoute.findOne({ routeId: routeId.toUpperCase() });

        if (!route) {
            return res.status(404).json({ error: "Route not found" });
        }

        // Use selected date or today
        let startDate, endDate;
        if (date) {
            startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
        } else {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        }

        const Arrival = require("../models/Arrival");
        // Query arrivals case-insensitively
        const todayArrivals = await Arrival.find({
            $or: [
                { routeId: routeId.toUpperCase() },
                { routeId: routeId.toLowerCase() },
                { routeId: routeId }
            ],
            arrivalTimestamp: { $gte: startDate, $lte: endDate }
        }).sort({ arrivalTimestamp: 1 });

        // Create a map of stop name to arrival data (case-insensitive matching)
        const arrivalMap = {};
        todayArrivals.forEach(arrival => {
            // Use lowercase for case-insensitive matching
            const stopKey = arrival.stopName.toLowerCase();
            // Keep the latest arrival for each stop
            if (!arrivalMap[stopKey] || new Date(arrival.arrivalTimestamp) > new Date(arrivalMap[stopKey].arrivalTimestamp)) {
                arrivalMap[stopKey] = {
                    actualTime: arrival.actualTime,
                    arrivalTimestamp: arrival.arrivalTimestamp,
                    delay: arrival.delay,
                    status: arrival.status,
                    location: arrival.location // GPS coords when bus reached stop
                };
            }
        });

        // Handle case where route has no stops configured
        const routeStops = route.stops || [];
        
        // Combine route stops with arrival data (case-insensitive matching)
        // Use server data: routes, bus stop coordinates, and reached time
        const stopsWithArrivals = routeStops.map(stop => {
            const stopKey = stop.name.toLowerCase();
            const arrival = arrivalMap[stopKey];
            // Coordinates: prefer route stop location, fallback to arrival's GPS when bus reached
            const stopLoc = stop.location;
            const hasStopCoords = stopLoc && (stopLoc.lat || stopLoc.lon);
            const arrivalLoc = arrival?.location;
            const hasArrivalCoords = arrivalLoc && (arrivalLoc.lat || arrivalLoc.lng);
            const location = hasStopCoords
                ? { lat: stopLoc.lat, lon: stopLoc.lon || stopLoc.lng }
                : hasArrivalCoords
                    ? { lat: arrivalLoc.lat, lon: arrivalLoc.lng }
                    : { lat: 0, lon: 0 };
            return {
                name: stop.name,
                location,
                scheduledTime: stop.scheduledTime || 'N/A',
                actualTime: arrival ? arrival.actualTime : null,
                arrivalTimestamp: arrival ? arrival.arrivalTimestamp : null,
                delay: arrival ? arrival.delay : null,
                status: arrival ? arrival.status : 'pending',
                isActive: stop.isActive !== false
            };
        });

        res.json({
            success: true,
            routeId: route.routeId,
            routeName: route.routeName,
            stops: stopsWithArrivals,
            totalStops: stopsWithArrivals.length,
            completedStops: todayArrivals.length
        });
    } catch (err) {
        console.error('Error fetching route stops with arrivals:', err);
        res.status(500).json({ error: err.message });
    }
};
