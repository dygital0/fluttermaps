import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function App() {
    useEffect(() => {
        // Initialize map
        const map = L.map('map').setView([51.505, -0.09], 13);

        // Add TomTom base map
        L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=9wKLH4AylQrqsjmUojGZLPBEqE30kwXF', {
            attribution: '&copy; TomTom'
        }).addTo(map);
    }, []);

    return (
        <div className="App">
            <div id="map" style={{ width: '100%', height: '600px' }}></div>
        </div>
    );
}

export default App;