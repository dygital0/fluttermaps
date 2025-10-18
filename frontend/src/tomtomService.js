// tomtomService.js
const TOMTOM_API_KEY = process.env.REACT_APP_TOMTOM_API_KEY || '9wKLH4AylQrqsjmUojGZLPBEqE30kwXF';

export const getRoute = async (start, end) => {
    try {
        // Clean and validate coordinates
        const cleanStart = start.trim().replace(/\s+/g, '');
        const cleanEnd = end.trim().replace(/\s+/g, '');
        
        console.log('🔍 Requesting route from:', cleanStart, 'to:', cleanEnd);

        // Add timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(
            `https://api.tomtom.com/routing/1/calculateRoute/${cleanStart}:${cleanEnd}/json?key=${TOMTOM_API_KEY}&travelMode=car&routeType=fastest&traffic=false`,
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        const data = await response.json();
        
        if (!response.ok) {
            console.warn('⚠️ Route API returned non-200 status:', response.status, data);
            
            // For 400 errors, check if we still have route data
            if (response.status === 400 && data.routes && data.routes.length > 0) {
                console.log('🔄 400 error but found valid route data, proceeding...');
                return data.routes[0];
            }
            
            throw new Error(`Route calculation failed: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found in response');
        }
        
        console.log('✅ Route found successfully');
        return data.routes[0];
    } catch (error) {
        console.error('❌ Error in getRoute:', error.message);
        if (error.name === 'AbortError') {
            throw new Error('Route request timed out');
        }
        throw error;
    }
};

export const getSuggestions = async (query) => {
    try {
        // Skip API call for empty queries or coordinates
        if (!query || query.trim() === '' || isValidCoordinate(query)) {
            return [];
        }

        const response = await fetch(
            `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=5&typeahead=true`
        );
        
        if (!response.ok) {
            console.warn('Suggestions API returned non-200 status:', response.status);
            return [];
        }
        
        const data = await response.json();
        
        // Ensure we have a valid results array
        if (!data.results || !Array.isArray(data.results)) {
            console.warn('Invalid response format from suggestions API:', data);
            return [];
        }
        
        return data.results;
    } catch (error) {
        console.error('Error in getSuggestions:', error);
        return [];
    }
};

export const getPlaceDetails = async (placeId) => {
    try {
        const response = await fetch(
            `https://api.tomtom.com/search/2/poiSearch/${placeId}.json?key=${TOMTOM_API_KEY}`
        );
        
        if (!response.ok) {
            console.warn('Place details API returned non-200 status:', response.status);
            return null;
        }
        
        const data = await response.json();
        return data.results[0] || null;
    } catch (error) {
        console.error('Error in getPlaceDetails:', error);
        return null;
    }
};

// Utility function to validate coordinates (can be used by both services)
export const validateCoordinates = (coord) => {
    if (!coord) return false;
    
    const parts = coord.split(',');
    if (parts.length !== 2) return false;
    
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    
    if (isNaN(lat) || isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;
    
    return true;
};

// Utility function to extract coordinates from different formats
export const extractCoordinates = (input) => {
    if (!input) return null;
    
    // Handle coordinate format "lat,lon"
    const coordMatch = input.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
            return `${lat},${lon}`;
        }
    }
    
    return null;
};

export default {
    getRoute,
    getSuggestions,
    getPlaceDetails,
    validateCoordinates,
    extractCoordinates
};