const express = require("express");
const router = express.Router();
const routeController = require("../controllers/routeController");

// Route management
router.get("/", routeController.getAllRoutes);
// More specific routes must come before less specific ones
router.get("/:routeId/stops-with-arrivals", routeController.getRouteStopsWithArrivals);
router.get("/:routeId/with-location", routeController.getRouteWithLocation);
router.get("/:routeId/stats", routeController.getRouteStats);
router.get("/:routeId", routeController.getRouteById);
router.post("/", routeController.createRoute);
router.put("/:routeId", routeController.updateRoute);
router.patch("/:routeId/status", routeController.updateRouteStatus);
router.delete("/:routeId", routeController.deleteRoute);

module.exports = router;






