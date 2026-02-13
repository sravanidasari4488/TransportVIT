const Arrival = require('../models/Arrival');
const BusRoute = require('../models/BusRoute');

// Record a new arrival
const recordArrival = async (req, res) => {
  try {
    const {
      routeId,
      busNumber,
      stopName,
      scheduledTime,
      actualTime,
      location,
      occupancy = 'medium',
      passengerCount = 0,
      driverNotes = '',
      weather = 'clear',
      trafficCondition = 'moderate'
    } = req.body;

    // Validate required fields
    if (!routeId || !busNumber || !stopName || !scheduledTime || !actualTime || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: routeId, busNumber, stopName, scheduledTime, actualTime, location'
      });
    }

    // Normalize routeId to uppercase for consistency
    const normalizedRouteId = routeId.toUpperCase();
    
    // Check if arrival already exists for this bus at this stop today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingArrival = await Arrival.findOne({
      $or: [
        { routeId: normalizedRouteId },
        { routeId: routeId.toLowerCase() },
        { routeId: routeId }
      ],
      busNumber,
      stopName,
      arrivalTimestamp: { $gte: today, $lt: tomorrow }
    });

    if (existingArrival) {
      return res.status(409).json({
        success: false,
        message: 'Arrival already recorded for this bus at this stop today'
      });
    }

    // Create new arrival record
    // Use server timestamp if arrivalTimestamp not provided
    // Normalize routeId to uppercase for consistency
    const arrival = new Arrival({
      routeId: normalizedRouteId,
      busNumber,
      stopName,
      scheduledTime,
      actualTime,
      location,
      occupancy,
      passengerCount,
      driverNotes,
      weather,
      trafficCondition,
      arrivalTimestamp: req.body.arrivalTimestamp ? new Date(req.body.arrivalTimestamp) : new Date()
    });

    await arrival.save();

    // Emit socket event to notify clients subscribed to this route
    if (global.io) {
      // Emit to route room (normalized to uppercase)
      const routeRoom = `route-${normalizedRouteId}`;
      const arrivalData = {
        routeId: normalizedRouteId, // Always uppercase for consistency
        busNumber: arrival.busNumber,
        stopName: arrival.stopName,
        scheduledTime: arrival.scheduledTime,
        actualTime: arrival.actualTime,
        arrivalTimestamp: arrival.arrivalTimestamp,
        delay: arrival.delay,
        status: arrival.status,
        location: arrival.location,
        occupancy: arrival.occupancy,
        passengerCount: arrival.passengerCount
      };
      
      global.io.to(routeRoom).emit('arrival-update', arrivalData);
      console.log(`📢 Emitted arrival-update event to room ${routeRoom} for route ${normalizedRouteId}, stop ${stopName}`);
      console.log(`📦 Emitted data:`, JSON.stringify(arrivalData, null, 2));
    }

    res.status(201).json({
      success: true,
      message: 'Arrival recorded successfully',
      data: arrival
    });

  } catch (error) {
    console.error('Error recording arrival:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get arrivals for a specific route
const getRouteArrivals = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { date, limit = 50, today = 'true' } = req.query;

    // Query arrivals case-insensitively
    let query = {
      $or: [
        { routeId: routeId.toUpperCase() },
        { routeId: routeId.toLowerCase() },
        { routeId: routeId }
      ]
    };

    // Default to today's arrivals if no specific date is provided
    if (today === 'true' && !date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.arrivalTimestamp = { $gte: today, $lt: tomorrow };
    } else if (date) {
      // Filter by specific date if provided
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.arrivalTimestamp = { $gte: startDate, $lte: endDate };
    }

    const arrivals = await Arrival.find(query)
      .sort({ arrivalTimestamp: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.status(200).json({
      success: true,
      data: arrivals,
      count: arrivals.length,
      filters: {
        routeId,
        date: date || 'today',
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching route arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get today's arrivals for a route
const getTodayArrivals = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // Query arrivals case-insensitively (try uppercase, lowercase, and original)
    const arrivals = await Arrival.find({
      $or: [
        { routeId: routeId.toUpperCase() },
        { routeId: routeId.toLowerCase() },
        { routeId: routeId }
      ],
      arrivalTimestamp: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    })
    .sort({ arrivalTimestamp: -1 })
    .select('-__v');

    res.status(200).json({
      success: true,
      data: arrivals,
      count: arrivals.length
    });

  } catch (error) {
    console.error('Error fetching today\'s arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get arrival statistics for a route
const getArrivalStats = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const stats = await Arrival.getArrivalStats(routeId, targetDate);

    // Calculate overall statistics
    const totalArrivals = stats.reduce((sum, stat) => sum + stat.totalArrivals, 0);
    const totalOnTime = stats.reduce((sum, stat) => sum + stat.onTimeCount, 0);
    const totalDelayed = stats.reduce((sum, stat) => sum + stat.delayedCount, 0);
    const onTimePercentage = totalArrivals > 0 ? (totalOnTime / totalArrivals) * 100 : 0;
    const avgDelay = stats.reduce((sum, stat) => sum + (stat.avgDelay || 0), 0) / stats.length || 0;

    res.status(200).json({
      success: true,
      data: {
        routeId,
        date: targetDate.toISOString().split('T')[0],
        overallStats: {
          totalArrivals,
          totalOnTime,
          totalDelayed,
          onTimePercentage: Math.round(onTimePercentage * 100) / 100,
          averageDelay: Math.round(avgDelay * 100) / 100
        },
        stopStats: stats
      }
    });

  } catch (error) {
    console.error('Error fetching arrival stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get recent arrivals for a route
const getRecentArrivals = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { limit = 10 } = req.query;

    const arrivals = await Arrival.getRecentArrivals(routeId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: arrivals,
      count: arrivals.length
    });

  } catch (error) {
    console.error('Error fetching recent arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all arrivals with filters
const getAllArrivals = async (req, res) => {
  try {
    const {
      routeId,
      busNumber,
      stopName,
      status,
      startDate,
      endDate,
      today = 'true',
      page = 1,
      limit = 20
    } = req.query;

    let query = {};

    // Apply filters
    if (routeId) query.routeId = routeId;
    if (busNumber) query.busNumber = busNumber;
    if (stopName) query.stopName = stopName;
    if (status) query.status = status;

    // Date range filter - default to today if no dates specified
    if (startDate || endDate) {
      query.arrivalTimestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.arrivalTimestamp.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.arrivalTimestamp.$lte = end;
      }
    } else if (today === 'true') {
      // Default to today's arrivals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.arrivalTimestamp = { $gte: today, $lt: tomorrow };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const arrivals = await Arrival.find(query)
      .sort({ arrivalTimestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Arrival.countDocuments(query);

    res.status(200).json({
      success: true,
      data: arrivals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      filters: {
        routeId,
        busNumber,
        stopName,
        status,
        dateRange: startDate || endDate ? `${startDate || 'any'} to ${endDate || 'any'}` : 'today'
      }
    });

  } catch (error) {
    console.error('Error fetching all arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update arrival record
const updateArrival = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.arrivalTimestamp;

    const arrival = await Arrival.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Arrival record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Arrival updated successfully',
      data: arrival
    });

  } catch (error) {
    console.error('Error updating arrival:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete arrival record
const deleteArrival = async (req, res) => {
  try {
    const { id } = req.params;

    const arrival = await Arrival.findByIdAndDelete(id);

    if (!arrival) {
      return res.status(404).json({
        success: false,
        message: 'Arrival record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Arrival deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting arrival:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get arrival analytics dashboard data
const getArrivalAnalytics = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { days = 7 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get arrivals for the date range
    const arrivals = await Arrival.find({
      routeId,
      arrivalTimestamp: { $gte: startDate, $lte: endDate }
    }).sort({ arrivalTimestamp: 1 });

    // Calculate analytics
    const totalArrivals = arrivals.length;
    const onTimeArrivals = arrivals.filter(a => a.status === 'on_time').length;
    const delayedArrivals = arrivals.filter(a => a.status === 'delayed').length;
    const onTimePercentage = totalArrivals > 0 ? (onTimeArrivals / totalArrivals) * 100 : 0;

    // Average delay
    const totalDelay = arrivals.reduce((sum, arrival) => sum + (arrival.delay || 0), 0);
    const averageDelay = totalArrivals > 0 ? totalDelay / totalArrivals : 0;

    // Daily breakdown
    const dailyStats = {};
    arrivals.forEach(arrival => {
      const date = arrival.arrivalTimestamp.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, onTime: 0, delayed: 0 };
      }
      dailyStats[date].total++;
      if (arrival.status === 'on_time') {
        dailyStats[date].onTime++;
      } else {
        dailyStats[date].delayed++;
      }
    });

    // Stop-wise performance
    const stopStats = {};
    arrivals.forEach(arrival => {
      if (!stopStats[arrival.stopName]) {
        stopStats[arrival.stopName] = { total: 0, onTime: 0, delayed: 0, avgDelay: 0 };
      }
      stopStats[arrival.stopName].total++;
      if (arrival.status === 'on_time') {
        stopStats[arrival.stopName].onTime++;
      } else {
        stopStats[arrival.stopName].delayed++;
      }
      stopStats[arrival.stopName].avgDelay += arrival.delay || 0;
    });

    // Calculate averages for stops
    Object.keys(stopStats).forEach(stop => {
      stopStats[stop].avgDelay = stopStats[stop].total > 0 
        ? stopStats[stop].avgDelay / stopStats[stop].total 
        : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        routeId,
        period: `${days} days`,
        summary: {
          totalArrivals,
          onTimeArrivals,
          delayedArrivals,
          onTimePercentage: Math.round(onTimePercentage * 100) / 100,
          averageDelay: Math.round(averageDelay * 100) / 100
        },
        dailyStats,
        stopStats
      }
    });

  } catch (error) {
    console.error('Error fetching arrival analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get latest arrival per stop for a route
const getLatestArrivalsPerStop = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // Get route to get all stops
    const route = await BusRoute.findOne({ routeId: routeId.toUpperCase() });
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Get latest arrival for each stop
    const stopArrivals = await Promise.all(
      route.stops.map(async (stop) => {
        const latestArrival = await Arrival.findOne({
          routeId: routeId.toUpperCase(),
          stopName: stop.name
        })
        .sort({ arrivalTimestamp: -1 })
        .select('-__v')
        .lean();

        return {
          stopName: stop.name,
          scheduledTime: stop.scheduledTime || 'N/A',
          location: stop.location,
          isActive: stop.isActive !== false,
          latestArrival: latestArrival ? {
            _id: latestArrival._id,
            busNumber: latestArrival.busNumber,
            actualTime: latestArrival.actualTime,
            arrivalTimestamp: latestArrival.arrivalTimestamp,
            delay: latestArrival.delay,
            status: latestArrival.status,
            occupancy: latestArrival.occupancy,
            passengerCount: latestArrival.passengerCount
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      routeId: route.routeId,
      routeName: route.routeName,
      data: stopArrivals,
      count: stopArrivals.length
    });

  } catch (error) {
    console.error('Error fetching latest arrivals per stop:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  recordArrival,
  getRouteArrivals,
  getTodayArrivals,
  getArrivalStats,
  getRecentArrivals,
  getAllArrivals,
  updateArrival,
  deleteArrival,
  getArrivalAnalytics,
  getLatestArrivalsPerStop
};
