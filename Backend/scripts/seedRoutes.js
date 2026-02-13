require("dotenv").config();
const mongoose = require("mongoose");
const BusRoute = require("../models/BusRoute");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("✅ MongoDB Connected");
    seedRoutes();
}).catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
});

async function seedRoutes() {
    try {
        // VV1 Route Data
        const vv1Route = {
            routeId: "VV1",
            routeName: "VV1 Bus Route",
            description: "Kankipadu ↔ Poranki",
            startLocation: "Kankipadu",
            endLocation: "Poranki",
            stops: [
                {
                    name: "Kankipadu",
                    location: { lat: 16.52746, lon: 80.628769 },
                    scheduledTime: "07:25 AM",
                    isActive: true
                },
                {
                    name: "Gosala",
                    location: { lat: 16.5292, lon: 80.6310 },
                    scheduledTime: "07:30 AM",
                    isActive: true
                },
                {
                    name: "Edupugallu",
                    location: { lat: 16.5282, lon: 80.6292 },
                    scheduledTime: "07:32 AM",
                    isActive: true
                },
                {
                    name: "Penumaluru",
                    location: { lat: 16.5120, lon: 80.6204 },
                    scheduledTime: "07:40 AM",
                    isActive: true
                },
                {
                    name: "Poranki",
                    location: { lat: 16.5032, lon: 80.6310 },
                    scheduledTime: "07:45 AM",
                    isActive: true
                }
            ],
            vehicle: {
                number: "VV-12",
                model: "Bus",
                capacity: 50
            },
            isActive: true,
            busCapacity: 50,
            currentPassengers: 0
        };

        // Check if route exists
        const existingRoute = await BusRoute.findOne({ routeId: "VV1" });
        
        if (existingRoute) {
            console.log("⚠️  Route VV1 already exists. Updating...");
            await BusRoute.findOneAndUpdate({ routeId: "VV1" }, vv1Route, { new: true });
            console.log("✅ Updated VV1 route");
        } else {
            await BusRoute.create(vv1Route);
            console.log("✅ Created VV1 route");
        }

        // You can add more routes here as needed
        console.log("\n✅ Route seeding completed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding routes:", error);
        process.exit(1);
    }
}














