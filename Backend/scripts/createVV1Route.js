/**
 * Script to create VV1 route via API
 * Run this after your backend server is running:
 * 
 * Option 1: Use curl
 * curl -X POST http://localhost:4000/api/routes \
 *   -H "Content-Type: application/json" \
 *   -d @routeData.json
 * 
 * Option 2: Use this Node.js script
 * node scripts/createVV1Route.js
 */

const routeData = {
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

// Use fetch if available, otherwise provide instructions
if (typeof fetch !== 'undefined') {
    const API_URL = process.env.API_URL || 'http://localhost:4000';
    
    fetch(`${API_URL}/api/routes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Route VV1 created successfully!');
            console.log(data);
        } else {
            console.error('❌ Error creating route:', data.error || data);
        }
    })
    .catch(error => {
        console.error('❌ Network error:', error.message);
        console.log('\n📝 Manual creation instructions:');
        console.log('1. Make sure your backend server is running');
        console.log('2. Use Postman or curl to POST to: http://localhost:4000/api/routes');
        console.log('3. Send the following JSON body:');
        console.log(JSON.stringify(routeData, null, 2));
    });
} else {
    console.log('📝 To create the VV1 route, make a POST request to your API:');
    console.log('\nURL: http://localhost:4000/api/routes');
    console.log('Method: POST');
    console.log('Headers: Content-Type: application/json');
    console.log('\nBody:');
    console.log(JSON.stringify(routeData, null, 2));
}














