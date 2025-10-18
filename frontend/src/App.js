import React, { useEffect, useState, useRef } from 'react';
import { 
  getRoute, 
  getSuggestions, 
  getPlaceDetails,
  validateCoordinates as isValidCoordinate 
} from './tomtomService';
import { 
  submitTrafficReport, 
  getTrafficReportsForRoute, 
  TrafficEventTypes 
} from './trafficService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Define the red marker icon
const redIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

// Traffic report icons
const trafficIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [20, 35],
    iconAnchor: [10, 35],
    popupAnchor: [1, -34],
    className: 'traffic-marker'
});

// Helper function to validate coordinates
// const isValidCoordinate = (coord) => {
//     if (!coord) return false;
    
//     // Check if it's in the format "lat,lon"
//     const parts = coord.split(',');
//     if (parts.length !== 2) return false;
    
//     const lat = parseFloat(parts[0]);
//     const lon = parseFloat(parts[1]);
    
//     // Check if they are valid numbers and within valid ranges
//     if (isNaN(lat) || isNaN(lon)) return false;
//     if (lat < -90 || lat > 90) return false;
//     if (lon < -180 || lon > 180) return false;
    
//     // Check for obviously invalid coordinates (like 0,0 in the ocean)
//     if (lat === 0 && lon === 0) return false;
    
//     // Check for coordinates with too many decimal places (potential formatting issues)
//     if (parts[0].split('.')[1]?.length > 6 || parts[1].split('.')[1]?.length > 6) {
//         console.warn('Coordinates have many decimal places, might be formatting issue:', coord);
//     }
    
//     return true;
// };

// Helper functions for traffic reporting
const getReportTypeIcon = (type) => {
    const icons = {
        [TrafficEventTypes.TRAFFIC_JAM]: '🚗',
        [TrafficEventTypes.ROAD_CLOSED]: '🚧',
        [TrafficEventTypes.ACCIDENT]: '⚠️',
        [TrafficEventTypes.CONSTRUCTION]: '🏗️',
        [TrafficEventTypes.HAZARD]: '🔺',
        [TrafficEventTypes.POLICE]: '🚓'
    };
    return icons[type] || '🚦';
};

const getReportTypeLabel = (type) => {
    const labels = {
        [TrafficEventTypes.TRAFFIC_JAM]: 'Traffic Jam',
        [TrafficEventTypes.ROAD_CLOSED]: 'Road Closed',
        [TrafficEventTypes.ACCIDENT]: 'Accident',
        [TrafficEventTypes.CONSTRUCTION]: 'Construction',
        [TrafficEventTypes.HAZARD]: 'Road Hazard',
        [TrafficEventTypes.POLICE]: 'Police'
    };
    return labels[type] || 'Traffic Issue';
};

const getAlertTitle = (type) => {
    const titles = {
        [TrafficEventTypes.TRAFFIC_JAM]: 'Traffic Jam',
        [TrafficEventTypes.ROAD_CLOSED]: 'Road Closed',
        [TrafficEventTypes.ACCIDENT]: 'Accident',
        [TrafficEventTypes.CONSTRUCTION]: 'Construction',
        [TrafficEventTypes.HAZARD]: 'Hazard',
        [TrafficEventTypes.POLICE]: 'Police'
    };
    return titles[type] || 'Traffic Alert';
};

const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour ago`;
    return `${Math.floor(seconds / 86400)} day ago`;
};

function App() {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [map, setMap] = useState(null);
    const [time, setTime] = useState('');
    const [chaosSimulationDetails, setChaosSimulationDetails] = useState(null);
    const [gameSimulationDetails, setGameSimulationDetails] = useState(null);
    const [distance, setDistance] = useState('');
    const [startSuggestions, setStartSuggestions] = useState([]);
    const [endSuggestions, setEndSuggestions] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [routeLine, setRouteLine] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locationDetails, setLocationDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    
    // Voice recognition states
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [voiceStatus, setVoiceStatus] = useState('ready');
    const [voiceCommand, setVoiceCommand] = useState('');
    
    // Traffic reporting states
    const [trafficReports, setTrafficReports] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [currentReport, setCurrentReport] = useState(null);
    const [trafficMarkers, setTrafficMarkers] = useState([]);

    const mapInitializedRef = useRef(false);
    const mapContainerRef = useRef(null);
    const startMarkerRef = useRef(null);
    const endMarkerRef = useRef(null);
    const debounceTimeoutRef = useRef(null);
    const recognitionRef = useRef(null);
    const mapRef = useRef(null);
    const startCoordsRef = useRef('');
    const endCoordsRef = useRef('');

    // Fallback coordinates for common cities to avoid API rate limits
    const fallbackCoordinates = {
        'new york': '40.7128,-74.0060',
        'boston': '42.3601,-71.0589',
        'los angeles': '34.0522,-118.2437',
        'san francisco': '37.7749,-122.4194',
        'chicago': '41.8781,-87.6298',
        'miami': '25.7617,-80.1918',
        'seattle': '47.6062,-122.3321',
        'denver': '39.7392,-104.9903',
        'dallas': '32.7767,-96.7970',
        'houston': '29.7604,-95.3698',
        'phoenix': '33.4484,-112.0740',
        'philadelphia': '39.9526,-75.1652',
        'atlanta': '33.7490,-84.3880',
        'washington': '38.9072,-77.0369',
        'detroit': '42.3314,-83.0458',
        'minneapolis': '44.9778,-93.2650',
        'las vegas': '36.1699,-115.1398',
        'portland': '45.5152,-122.6784',
        'san diego': '32.7157,-117.1611',
        'tampa': '27.9506,-82.4572'
    };

    // Helper function to add marker to map
    const addMarkerToMap = async (coordinates, isStart) => {
        const currentMap = mapRef.current || map;
        if (!currentMap) return;

        try {
            const [lat, lon] = coordinates.split(',').map(coord => {
                const parsed = parseFloat(coord.trim());
                return isNaN(parsed) ? 0 : parsed;
            });

            // Validate the parsed coordinates
            if (lat === 0 && lon === 0) {
                console.error('Invalid coordinates:', coordinates);
                return;
            }
            
            const marker = L.marker([lat, lon], { 
                icon: isStart ? redIcon : blueIcon 
            }).addTo(currentMap);

            marker.locationInfo = {
                address: coordinates,
                position: { lat, lon },
                type: isStart ? 'start' : 'end'
            };

            marker.on('click', async () => {
                setSelectedLocation(marker.locationInfo);
                await fetchLocationDetails(marker.locationInfo);
            });

            marker.bindPopup(`
                <div class="location-popup">
                    <h6>${isStart ? 'Start' : 'End'} Location</h6>
                    <p>${coordinates}</p>
                </div>
            `);

            if (isStart) {
                if (startMarkerRef.current) {
                    currentMap.removeLayer(startMarkerRef.current);
                }
                startMarkerRef.current = marker;
            } else {
                if (endMarkerRef.current) {
                    currentMap.removeLayer(endMarkerRef.current);
                }
                endMarkerRef.current = marker;
            }
        } catch (error) {
            console.error('Error adding marker to map:', error);
        }
    };
    // Traffic reporting functions
    const handleSubmitReport = async () => {
        try {
            if (!currentReport?.type) {
                alert('Please select a report type');
                return;
            }

            // Use the temp marker location if available
            let reportLocation = currentReport.location;
            if (tempMarker) {
                const latLng = tempMarker.getLatLng();
                reportLocation = { lat: latLng.lat, lon: latLng.lng };
            }

            // Remove the assignment to 'report' since we're not using it
            await submitTrafficReport({
                ...currentReport,
                location: reportLocation
            });
            
            // Use handleCloseModal to clean up properly
            handleCloseModal();
            
            // Refresh and show reports
            loadTrafficReports();
            
        } catch (error) {
            alert('Failed to submit report: ' + error.message);
        }
    };

    const loadTrafficReports = async () => {
        if (start && end) {
            try {
                const reports = await getTrafficReportsForRoute({ start, end });
                // Add array safety check
                const safeReports = Array.isArray(reports) ? reports : [];
                setTrafficReports(safeReports);
                
                // Clear existing traffic markers
                clearTrafficMarkers();
                
                // Add markers for each report with safety check
                if (Array.isArray(safeReports)) {
                    safeReports.forEach(report => {
                        if (report && report.location) {
                            addTrafficMarker(report);
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading traffic reports:', error);
                setTrafficReports([]);
            }
        }
    };

    const addTrafficMarker = (report) => {
        const currentMap = mapRef.current || map;
        if (!currentMap || !report || !report.location) return;

        try {
            const marker = L.marker([report.location.lat, report.location.lon], {
                icon: trafficIcon
            }).addTo(currentMap);

            marker.bindPopup(`
                <div class="traffic-popup">
                    <h6>${getAlertTitle(report.type)}</h6>
                    <p><strong>Severity:</strong> ${report.severity}</p>
                    ${report.description ? `<p><strong>Details:</strong> ${report.description}</p>` : ''}
                    <p><small>Reported ${formatTimeAgo(report.timestamp)}</small></p>
                </div>
            `);

            setTrafficMarkers(prev => {
                // Ensure prev is always an array
                const safePrev = Array.isArray(prev) ? prev : [];
                return [...safePrev, marker];
            });
        } catch (error) {
            console.error('Error adding traffic marker:', error);
        }
    };

    const clearTrafficMarkers = () => {
        const currentMap = mapRef.current || map;
        if (!currentMap) return;

        // Add safety check for trafficMarkers
        if (!trafficMarkers || !Array.isArray(trafficMarkers)) {
            console.warn('trafficMarkers is not an array:', trafficMarkers);
            setTrafficMarkers([]);
            return;
        }

        trafficMarkers.forEach(marker => {
            if (marker && currentMap.hasLayer(marker)) {
                currentMap.removeLayer(marker);
            }
        });
        setTrafficMarkers([]);
    };

    const getCurrentMapCenter = () => {
        const currentMap = mapRef.current || map;
        if (!currentMap) return { lat: 0, lon: 0 };
        
        const center = currentMap.getCenter();
        return { lat: center.lat, lon: center.lng };
    };

    const [isPlacingMarker, setIsPlacingMarker] = useState(false);
    const [tempMarker, setTempMarker] = useState(null);

    const handleMapClickForMarker = (e) => {
        if (!isPlacingMarker) return;

        const { lat, lng } = e.latlng;
        
        // Remove existing temp marker
        if (tempMarker) {
            const currentMap = mapRef.current || map;
            if (currentMap) {
                currentMap.removeLayer(tempMarker);
            }
        }

        // Add new temp marker
        const currentMap = mapRef.current || map;
        if (currentMap) {
            const marker = L.marker([lat, lng], {
                icon: trafficIcon,
                draggable: true // Allow user to adjust position
            }).addTo(currentMap);

            marker.bindPopup(`
                <div class="temp-marker-popup">
                    <h6>Selected Location</h6>
                    <p>Drag to adjust or proceed with reporting</p>
                </div>
            `).openPopup();

            setTempMarker(marker);
            
            // Update current report with selected location
            setCurrentReport(prev => ({
                ...prev,
                location: { lat, lon: lng }
            }));
        }
    };

    // Add click handler to map
    useEffect(() => {
        const currentMap = mapRef.current || map;
        if (currentMap) {
            currentMap.on('click', handleMapClickForMarker);
        }

        return () => {
            if (currentMap) {
                currentMap.off('click', handleMapClickForMarker);
            }
        };
    }, [map, isPlacingMarker, tempMarker]);

    const handleCloseModal = () => {
        setShowReportModal(false);
        setIsPlacingMarker(false);
        if (tempMarker) {
            const currentMap = mapRef.current || map;
            if (currentMap) {
                currentMap.removeLayer(tempMarker);
            }
            setTempMarker(null);
        }
        setCurrentReport(null);
    };

    // Traffic Report Modal Component
    const TrafficReportModal = () => {
        const textareaRef = useRef(null);
        
        if (!showReportModal) return null;

        const handleSubmit = () => {
            const description = textareaRef.current?.value || '';
            
            setCurrentReport(prev => ({
                ...prev,
                description: description
            }));
            
            // Use setTimeout to ensure state is updated before submission
            setTimeout(() => {
                handleSubmitReport();
            }, 0);
        };

        return (
            <div className="modal-overlay">
                <div className="traffic-report-modal">
                    <div className="modal-header-improved">
                        <button 
                            className="close-btn-improved"
                            onClick={handleCloseModal}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="modal-body-improved">
                        <div className="report-types-container">
                            <div className="report-types-grid">
                                {Object.values(TrafficEventTypes).map(type => (
                                    <button
                                        key={type}
                                        className={`report-type-btn-improved ${currentReport?.type === type ? 'active' : ''}`}
                                        onClick={() => setCurrentReport({
                                            ...currentReport,
                                            type,
                                            location: getCurrentMapCenter(),
                                            route: { start, end }
                                        })}
                                    >
                                        <span className="report-icon-improved">
                                            <i className={getReportTypeIconClass(type)}></i>
                                        </span>
                                        <span className="report-label">{getReportTypeLabel(type)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {currentReport && (
                            <div className="report-details-improved">
                                <div className="form-group-improved">
                                    <label className="form-label">Severity Level</label>
                                    <select 
                                        value={currentReport.severity || 'medium'}
                                        onChange={(e) => setCurrentReport({
                                            ...currentReport,
                                            severity: e.target.value
                                        })}
                                        className="form-control-improved"
                                    >
                                        <option value="low">Low Severity</option>
                                        <option value="medium">Medium Severity</option>
                                        <option value="high">High Severity</option>
                                    </select>
                                </div>
                                
                                <div className="form-group-improved">
                                    <label className="form-label">Additional Details (Optional)</label>
                                    <textarea
                                        ref={textareaRef}
                                        placeholder="Describe the traffic issue..."
                                        defaultValue={currentReport.description || ''}
                                        className="form-control-improved textarea-stable"
                                        rows="3"
                                    />
                                </div>
                                
                                <div className="modal-actions-improved">
                                    <button 
                                        className="btn-secondary-improved"
                                        onClick={handleCloseModal}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn-primary-improved"
                                        onClick={handleSubmit}
                                    >
                                        Submit Report
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    // Traffic Report Button Component
    const TrafficReportButton = () => {
        if (!routeLine) return null;

        const handleReportClick = () => {
            setIsPlacingMarker(true);
            setShowReportModal(true);
            setCurrentReport({
                type: null,
                severity: 'medium',
                description: '',
                location: getCurrentMapCenter(),
                route: { start, end }
            });
        };

        return (
            <div className="traffic-report-section">
                <button 
                    className="btn-report-traffic"
                    onClick={handleReportClick}
                >
                    <i className="fas fa-triangle-exclamation"></i>
                    Report Traffic Issue
                </button>
                
                {isPlacingMarker && (
                    <div className="placement-instruction">
                        <i className="fas fa-mouse-pointer"></i>
                        Click on the map to place the marker
                    </div>
                )}
                
                {Array.isArray(trafficReports) && trafficReports.length > 0 && (
                    <div className="traffic-alerts">
                        <h6>Traffic Alerts on Route</h6>
                        {trafficReports.map(report => (
                            <div key={report.id} className={`traffic-alert ${report.type}`}>
                                <span className="alert-icon">
                                    {getReportTypeIcon(report.type)}
                                </span>
                                <div className="alert-content">
                                    <strong>{getAlertTitle(report.type)}</strong>
                                    <span className="alert-severity">({report.severity})</span>
                                    <span className="alert-time">
                                        {formatTimeAgo(report.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const getReportTypeIconClass = (type) => {
        const icons = {
            [TrafficEventTypes.TRAFFIC_JAM]: 'fas fa-car',
            [TrafficEventTypes.ROAD_CLOSED]: 'fas fa-road',
            [TrafficEventTypes.ACCIDENT]: 'fas fa-car-crash',
            [TrafficEventTypes.CONSTRUCTION]: 'fas fa-person-digging',
            [TrafficEventTypes.HAZARD]: 'fas fa-exclamation-triangle',
            [TrafficEventTypes.POLICE]: 'fas fa-person-military-pointing'
        };
        return icons[type] || 'fas fa-traffic-light';
    };

    

    // Initialize speech recognition
    useEffect(() => {
        try {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';
                recognitionRef.current.maxAlternatives = 3;

                recognitionRef.current.onstart = () => {
                    setIsListening(true);
                    setVoiceStatus('listening');
                    setVoiceTranscript('');
                };

                recognitionRef.current.onresult = (event) => {
                    try {
                        let finalTranscript = '';
                        let interimTranscript = '';

                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                finalTranscript += transcript;
                            } else {
                                interimTranscript += transcript;
                            }
                        }

                        const fullTranscript = finalTranscript || interimTranscript;
                        setVoiceTranscript(fullTranscript);

                        if (fullTranscript.trim()) {
                            const parsedCommand = parseVoiceCommand(fullTranscript);
                            if (parsedCommand.isValid) {
                                setVoiceStatus('processing');
                                setVoiceCommand(`From ${parsedCommand.start} to ${parsedCommand.end}`);
                                
                                try {
                                    recognitionRef.current.stop();
                                } catch (stopError) {
                                    console.error('Error stopping recognition:', stopError);
                                }
                                processVoiceCommand(parsedCommand.start, parsedCommand.end);
                            }
                        }
                    } catch (resultError) {
                        console.error('Error processing speech result:', resultError);
                        setVoiceStatus('error');
                        setVoiceCommand('Error processing voice command.');
                    }
                };

                recognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                    
                    if (event.error === 'not-allowed') {
                        setVoiceStatus('error');
                        setVoiceCommand('Microphone access denied. Please allow microphone permissions.');
                    } else if (event.error === 'network') {
                        setVoiceStatus('error');
                        setVoiceCommand('Network error. Please check your connection.');
                    } else {
                        setVoiceStatus('error');
                        setVoiceCommand('Speech recognition failed. Please try again.');
                    }
                    
                    setTimeout(() => setVoiceStatus('ready'), 4000);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                    if (voiceStatus === 'listening') {
                        setTimeout(() => {
                            if (voiceStatus === 'listening') {
                                setVoiceStatus('ready');
                                setVoiceTranscript('');
                            }
                        }, 2000);
                    }
                };
            } else {
                console.warn('Speech recognition not supported in this browser');
                setVoiceStatus('error');
                setVoiceCommand('Voice recognition not supported in your browser.');
            }
        } catch (initError) {
            console.error('Error initializing speech recognition:', initError);
            setVoiceStatus('error');
            setVoiceCommand('Error initializing voice recognition.');
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (cleanupError) {
                    console.error('Error stopping speech recognition during cleanup:', cleanupError);
                }
            }
        };
    }, []);

    // Load traffic reports when route changes
    useEffect(() => {
        loadTrafficReports();
        
        // Poll for new reports every 30 seconds
        const interval = setInterval(loadTrafficReports, 30000);
        return () => clearInterval(interval);
    }, [start, end]);

    // Parse voice command
    const parseVoiceCommand = (transcript) => {
        const cleanTranscript = transcript.toLowerCase().trim();
        
        const patterns = [
            /from\s+(.+?)\s+to\s+(.+)/i,
            /(.+?)\s+to\s+(.+)/i,
            /navigate\s+from\s+(.+?)\s+to\s+(.+)/i,
            /directions\s+from\s+(.+?)\s+to\s+(.+)/i,
            /route\s+from\s+(.+?)\s+to\s+(.+)/i,
            /get\s+me\s+from\s+(.+?)\s+to\s+(.+)/i,
            /how\s+do\s+i\s+get\s+from\s+(.+?)\s+to\s+(.+)/i
        ];

        for (let pattern of patterns) {
            const match = cleanTranscript.match(pattern);
            if (match) {
                const startLocation = match[1]?.trim();
                const endLocation = match[2]?.trim();
                
                if (startLocation && endLocation && startLocation !== endLocation) {
                    return {
                        isValid: true,
                        start: startLocation,
                        end: endLocation
                    };
                }
            }
        }

        return { isValid: false };
    };

    // Process voice command with fallback coordinates
    const processVoiceCommand = async (startLocation, endLocation) => {
        try {
            const currentMap = mapRef.current || map;
            if (!currentMap) {
                console.error('Map not initialized');
                setVoiceStatus('error');
                setVoiceCommand('Map is not ready. Please try again.');
                setTimeout(() => setVoiceStatus('ready'), 3000);
                return;
            }

            let startCoords, endCoords;

            // Check if we have fallback coordinates first
            const startLower = startLocation.toLowerCase();
            const endLower = endLocation.toLowerCase();
            
            if (fallbackCoordinates[startLower] && fallbackCoordinates[endLower]) {
                startCoords = fallbackCoordinates[startLower];
                endCoords = fallbackCoordinates[endLower];
                console.log('Using fallback coordinates to avoid API limits');
            } else {
                // Try to get suggestions from API with error handling
                let startResults = [], endResults = [];

                try {
                    startResults = await getSuggestions(startLocation);
                } catch (error) {
                    console.error('Error fetching start location:', error);
                }
                
                try {
                    endResults = await getSuggestions(endLocation);
                } catch (error) {
                    console.error('Error fetching end location:', error);
                }

                // Use API results if available, otherwise try fallback
                if (startResults && startResults.length > 0) {
                    const startSuggestion = startResults[0];
                    startCoords = `${startSuggestion.position.lat},${startSuggestion.position.lon}`;
                } else if (fallbackCoordinates[startLower]) {
                    startCoords = fallbackCoordinates[startLower];
                }
                
                if (endResults && endResults.length > 0) {
                    const endSuggestion = endResults[0];
                    endCoords = `${endSuggestion.position.lat},${endSuggestion.position.lon}`;
                } else if (fallbackCoordinates[endLower]) {
                    endCoords = fallbackCoordinates[endLower];
                }
            }

            // Check if we have valid coordinates
            if (!startCoords || !endCoords) {
                setVoiceStatus('error');
                setVoiceCommand('Could not find locations. Please try different names or use manual input.');
                setTimeout(() => setVoiceStatus('ready'), 3000);
                return;
            }

            // Store coordinates in refs immediately
            startCoordsRef.current = startCoords;
            endCoordsRef.current = endCoords;

            // Update state and add markers
            setStart(startCoords);
            setEnd(endCoords);

            // Add markers to map
            await addMarkerToMap(startCoords, true);
            await addMarkerToMap(endCoords, false);

            // Wait a bit for state to update, then trigger route
            setTimeout(() => {
                handleRouteFetchWithCoords(startCoords, endCoords);
                setVoiceStatus('success');
                setTimeout(() => {
                    setVoiceStatus('ready');
                    setVoiceCommand('');
                }, 3000);
            }, 500);

        } catch (error) {
            console.error('Error processing voice command:', error);
            setVoiceStatus('error');
            setVoiceCommand('Error processing command. Please try manual input.');
            setTimeout(() => setVoiceStatus('ready'), 3000);
        }
    };

    // Handle route fetch with explicit coordinates
    const handleRouteFetchWithCoords = async (startCoords, endCoords) => {
        if (!startCoords || !endCoords) {
            alert('Please enter both start and end locations');
            return;
        }

        // Enhanced coordinate validation
        if (!isValidCoordinate(startCoords) || !isValidCoordinate(endCoords)) {
            alert('Invalid coordinates detected. Please check your locations and try again.');
            setIsSimulating(false);
            return;
        }

        setIsSimulating(true);
        
        // Clear any existing route line state
        setRouteLine(null);
        
        try {
            const routeData = await getRoute(startCoords, endCoords);
            
            if (!routeData || !routeData.legs || routeData.legs.length === 0) {
                alert('No route found between these locations. They might be too close together or no road route exists.');
                return;
            }

            const currentMap = mapRef.current || map;
            if (currentMap) {
                // Clear existing route
                currentMap.eachLayer((layer) => {
                    if (layer instanceof L.Polyline) {
                        currentMap.removeLayer(layer);
                    }
                });

                const latLngs = routeData.legs[0].points.map(point => [point.latitude, point.longitude]);
                const polyline = L.polyline(latLngs, { 
                    color: '#4dabf7',
                    weight: 5,
                    opacity: 0.8
                }).addTo(currentMap);
                
                const bounds = polyline.getBounds();
                currentMap.fitBounds(bounds, {
                    padding: [50, 50],
                });

                setRouteLine(polyline);

                const distance = routeData.summary.lengthInMeters;
                simulateTimeAndEnergy(distance);
                generateSimulationDetails(distance);
            }

        } catch (error) {
            console.error('Failed to fetch route:', error);
            
            // Check if we have a route line (meaning the route was actually displayed)
            // If the route is displayed, don't show the error alert
            if (!routeLine) {
                // Check if this is a 400 error but we might still have a valid route
                if (error.message.includes('400')) {
                    // Try to proceed anyway - sometimes 400 errors still return valid routes
                    console.log('400 error detected, but proceeding as route might be valid');
                    // Don't show alert for 400 errors if the route works
                } else {
                    alert('Unable to calculate route. Please try different locations.');
                }
            }
        } finally {
            setIsSimulating(false);
        }
    };

    // Toggle voice recognition
    const toggleVoiceRecognition = () => {
        if (!recognitionRef.current) {
            alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setVoiceStatus('listening');
            setVoiceTranscript('');
            setVoiceCommand('');
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                setVoiceStatus('error');
                setVoiceCommand('Error starting voice recognition. Please try again.');
            }
        }
    };

    // Initialize map
    useEffect(() => {
        const initMap = () => {
            const mapInstance = L.map(mapContainerRef.current).setView([20, 0], 2);
            
            L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=9wKLH4AylQrqsjmUojGZLPBEqE30kwXF', {
                attribution: '&copy; ButterflyNAV',
                zoomControl: true,
                attributionControl: true,
                maxZoom: 18,
                minZoom: 1,
            }).addTo(mapInstance);
            
            setMap(mapInstance);
            mapRef.current = mapInstance;
            mapInitializedRef.current = true;
        };
    
        if (!mapInitializedRef.current) {
            initMap();
        }
    
        return () => {
            if (map) {
                map.remove();
                setMap(null);
                mapRef.current = null;
            }
        };
    }, [map]);

    // Handle route fetch (for manual input)
    const handleRouteFetch = async () => {
        // Use refs as fallback if state hasn't updated yet
        const startValue = start || startCoordsRef.current;
        const endValue = end || endCoordsRef.current;
        
        if (!startValue || !endValue) {
            alert('Please enter both start and end locations');
            return;
        }

        // Enhanced coordinate validation
        if (!isValidCoordinate(startValue) || !isValidCoordinate(endValue)) {
            alert('Invalid coordinates detected. Please check your locations and try again.');
            return;
        }

        setIsSimulating(true);
        
        // Clear any existing route line state
        setRouteLine(null);
        
        try {
            const routeData = await getRoute(startValue, endValue);
            
            if (!routeData || !routeData.legs || routeData.legs.length === 0) {
                alert('No route found. Please check your locations and try again.');
                return;
            }

            const currentMap = mapRef.current || map;
            if (currentMap) {
                currentMap.eachLayer((layer) => {
                    if (layer instanceof L.Polyline) {
                        currentMap.removeLayer(layer);
                    }
                });

                const latLngs = routeData.legs[0].points.map(point => [point.latitude, point.longitude]);
                const polyline = L.polyline(latLngs, { 
                    color: '#4dabf7',
                    weight: 5,
                    opacity: 0.8
                }).addTo(currentMap);
                
                const bounds = polyline.getBounds();
                currentMap.fitBounds(bounds, {
                    padding: [50, 50],
                });

                setRouteLine(polyline);

                const distance = routeData.summary.lengthInMeters;
                simulateTimeAndEnergy(distance);
                generateSimulationDetails(distance);
            }

        } catch (error) {
            console.error('Failed to fetch route:', error);
            
            // Don't show alert if we have a route line (route was displayed)
            // or if it's just a 400 error but the route works
            if (!routeLine && !error.message.includes('400')) {
                alert('Failed to fetch route details, but the route was calculated. Simulation data might be limited.');
            }
        } finally {
            setIsSimulating(false);
        }
    };

    const simulateTimeAndEnergy = (distance) => {
        const averageSpeed = 65;
        const timeInHours = distance / 1000 / averageSpeed;
        const timeInMinutes = Math.round(timeInHours * 60);

        setTime(`Estimated Time: ${timeInMinutes} minutes`);
        setDistance(`Distance: ${(distance / 1000).toFixed(1)} km`);
    };

    const isCoordinates = (input) => {
        const regex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
        return regex.test(input);
    };

    const handleInputChange = (e, setInput, setSuggestions) => {
        const value = e.target.value;
        setInput(value);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (isCoordinates(value) || isValidCoordinate(value)) {
            setSuggestions([]);
            return;
        }

        debounceTimeoutRef.current = setTimeout(async () => {
            if (value && value.trim().length > 2) {
                try {
                    const suggestions = await getSuggestions(value);
                    // Add array safety check
                    setSuggestions(Array.isArray(suggestions) ? suggestions : []);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                }
            } else {
                setSuggestions([]);
            }
        }, 500);
    };
    const handleSuggestionClick = async (suggestion, setInput, setSuggestions, markerRef, isStart) => {
        const currentMap = mapRef.current || map;
        if (!currentMap) {
            console.error('Map not initialized');
            return;
        }

        // Add null/undefined checks for the suggestion object
        if (!suggestion || !suggestion.position) {
            console.error('Invalid suggestion object:', suggestion);
            return;
        }

        const { position, address, id } = suggestion;
        
        // Validate position object
        if (!position || typeof position.lat === 'undefined' || typeof position.lon === 'undefined') {
            console.error('Invalid position in suggestion:', suggestion);
            return;
        }

        const coordinates = `${position.lat},${position.lon}`;
        setInput(coordinates);
        
        // Update refs as well
        if (isStart) {
            startCoordsRef.current = coordinates;
        } else {
            endCoordsRef.current = coordinates;
        }
        
        setSuggestions([]);

        try {
            const marker = L.marker([position.lat, position.lon], { 
                icon: isStart ? redIcon : blueIcon 
            }).addTo(currentMap);

            // Create location info with proper fallbacks
            marker.locationInfo = {
                address: address?.freeformAddress || coordinates,
                position: position,
                id: id || coordinates,
                type: isStart ? 'start' : 'end'
            };

            marker.on('click', async () => {
                setSelectedLocation(marker.locationInfo);
                await fetchLocationDetails(marker.locationInfo);
            });

            marker.bindPopup(`
                <div class="location-popup">
                    <h6>${address?.freeformAddress || coordinates}</h6>
                    <p>Click for detailed information</p>
                </div>
            `);

            if (markerRef.current) {
                currentMap.removeLayer(markerRef.current);
            }
            markerRef.current = marker;
        } catch (error) {
            console.error('Error creating marker:', error);
        }
    };

    const fetchLocationDetails = async (locationInfo) => {
        setIsLoadingDetails(true);
        try {
            // Skip Wikipedia for current location or coordinates-only locations
            const shouldSkipWikipedia = 
                locationInfo.type === 'current' || 
                !locationInfo.id ||
                locationInfo.address === locationInfo.position.lat + ',' + locationInfo.position.lon;
            
            let tomtomDetails = null;
            let wikiData = null;

            // Only fetch TomTom details if we have an ID
            if (locationInfo.id) {
                tomtomDetails = await getPlaceDetails(locationInfo.id);
            }

            // Only fetch Wikipedia for meaningful locations with proper addresses
            if (!shouldSkipWikipedia && locationInfo.address && locationInfo.address.length > 5) {
                wikiData = await fetchWikipediaInfo(locationInfo.address, tomtomDetails);
            }
            
            setLocationDetails({
                ...locationInfo,
                tomtomDetails,
                wikiData
            });
        } catch (error) {
            console.error('Error fetching location details:', error);
            setLocationDetails({
                ...locationInfo,
                error: 'Could not load detailed information'
            });
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const fetchWikipediaInfo = async (address, tomtomDetails) => {
        // Skip if address is too generic or is coordinates
        if (!address || address.length < 5 || /^-?\d+\.\d+,-?\d+\.\d+$/.test(address)) {
            return null;
        }

        try {
            const searchTerms = [
                tomtomDetails?.poi?.name,
                tomtomDetails?.address?.municipality,
                tomtomDetails?.address?.countrySubdivision,
                address
            ].filter(term => term && term.length > 3); // Only use meaningful terms

            for (let term of searchTerms) {
                try {
                    // Clean the term for Wikipedia
                    const cleanTerm = term.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                    if (cleanTerm.length < 3) continue;

                    const searchResponse = await fetch(
                        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`
                    );
                    
                    if (searchResponse.ok) {
                        const data = await searchResponse.json();
                        if (data.type !== 'disambiguation' && data.extract) {
                            return data;
                        }
                    } else if (searchResponse.status === 404) {
                        // Skip to next term on 404
                        continue;
                    }
                } catch (e) {
                    console.log('Wikipedia search failed for term:', term, e);
                    continue;
                }
            }

            // If no specific page found, try a search
            const primaryTerm = searchTerms[0] || address;
            const searchResponse = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(primaryTerm)}&format=json&origin=*`
            );
            
            if (searchResponse.ok) {
                const data = await searchResponse.json();
                if (data.query?.search?.length > 0) {
                    const pageId = data.query.search[0].pageid;
                    const pageResponse = await fetch(
                        `https://en.wikipedia.org/api/rest_v1/page/summary/${pageId}`
                    );
                    if (pageResponse.ok) {
                        return await pageResponse.json();
                    }
                }
            }
        } catch (error) {
            console.log('Wikipedia API error (non-critical):', error);
        }
        return null;
    };

    const generateSimulationDetails = (distance) => {
        setChaosSimulationDetails({
            blockedSegments: Math.floor(distance * 0.001 * Math.random()),
            reroutes: Math.floor(2 + Math.random() * 3),
            averageDelay: `${Math.floor(5 + Math.random() * 15)} min`,
        });

        setGameSimulationDetails({
            cooperationRatio: `${(70 + Math.random() * 20).toFixed(1)}%`,
            trafficEquilibrium: `${Math.floor(20 + Math.random() * 10)} min`,
            optimalPath: `${(60 + Math.random() * 30).toFixed(1)}% found`,
        });
    };

    const handleGetUserLocation = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const coordinates = `${latitude},${longitude}`;
              setStart(coordinates);
              startCoordsRef.current = coordinates;

              const currentMap = mapRef.current || map;
              if (!currentMap) {
                alert('Map is not ready. Please try again.');
                return;
              }

              const marker = L.marker([latitude, longitude], { icon: redIcon }).addTo(currentMap);
              
              marker.locationInfo = {
                  address: "Your Current Location",
                  position: { lat: latitude, lon: longitude },
                  type: 'current'
              };

              marker.on('click', async () => {
                  setSelectedLocation(marker.locationInfo);
                  await fetchLocationDetails(marker.locationInfo);
              });

              marker.bindPopup(`
                  <div class="location-popup">
                      <h6>📍 Your Current Location</h6>
                      <p>Click for detailed information</p>
                  </div>
              `);
      
              if (startMarkerRef.current) {
                currentMap.removeLayer(startMarkerRef.current);
              }
              startMarkerRef.current = marker;
            },
            (error) => {
              console.error("Error retrieving location:", error);
              alert("Unable to fetch your location. Please allow location access.");
            },
            { enableHighAccuracy: true }
          );
        } else {
          alert("Geolocation is not supported by your browser.");
        }
    };

    const resetMap = () => {
        setStart('');
        setEnd('');
        setStartSuggestions([]);
        setEndSuggestions([]);
        setTime('');
        setDistance('');
        setChaosSimulationDetails(null);
        setGameSimulationDetails(null);
        setRouteLine(null);
        setSelectedLocation(null);
        setLocationDetails(null);
        setTrafficReports([]);
        setShowReportModal(false);
        setCurrentReport(null);

        // Reset refs
        startCoordsRef.current = '';
        endCoordsRef.current = '';

        const currentMap = mapRef.current || map;
        if (currentMap) {
            if (startMarkerRef.current) {
                currentMap.removeLayer(startMarkerRef.current);
                startMarkerRef.current = null;
            }

            if (endMarkerRef.current) {
                currentMap.removeLayer(endMarkerRef.current);
                endMarkerRef.current = null;
            }

            if (routeLine) {
                currentMap.removeLayer(routeLine);
                setRouteLine(null);
            }

            // Clear ALL traffic markers and reports
            clearTrafficMarkers();
            setTrafficReports([]);

            // Remove any remaining polylines
            currentMap.eachLayer((layer) => {
                if (layer instanceof L.Polyline) {
                    currentMap.removeLayer(layer);
                }
            });

            currentMap.setView([20, 0], 2);
        }
    };
    const closeLocationDetails = () => {
        setSelectedLocation(null);
        setLocationDetails(null);
    };

    const getVoiceButtonClass = () => {
        switch (voiceStatus) {
            case 'listening':
                return 'voice-btn listening';
            case 'processing':
                return 'voice-btn processing';
            case 'success':
                return 'voice-btn success';
            case 'error':
                return 'voice-btn error';
            default:
                return 'voice-btn ready';
        }
    };

    const getVoiceButtonText = () => {
        switch (voiceStatus) {
            case 'listening':
                return 'Listening...';
            case 'processing':
                return 'Processing...';
            case 'success':
                return 'Success!';
            case 'error':
                return 'Try Again';
            default:
                return 'Voice Directions  ';
        }
    };

    return (
        <div className="app-container">
            {/* Main Content Area - Sidebar + Map */}
            <div className="main-content">
                {/* Left Sidebar */}
                <div className="sidebar-dark">
                    <img className='logo-container' src="https://i.imgur.com/K4zZzDI.png" alt="Logo" />
                    
                    <div className="input-container">
                        {/* Start Location Input */}
                        <div className="form-group mb-2">
                            <div className="input-group-dark">
                                <input
                                    id="start"
                                    className="form-control-dark"
                                    value={start}
                                    onChange={(e) => handleInputChange(e, setStart, setStartSuggestions)}
                                    placeholder="Enter start location"
                                    autoComplete="off"
                                />
                                <span 
                                    className="input-group-text-dark" 
                                    onClick={handleGetUserLocation} 
                                    style={{ cursor: "pointer" }}
                                >
                                    <i className="fas fa-location-dot"></i>
                                </span>
                            </div>
                            <ul className="list-group-dark">
                                {Array.isArray(startSuggestions) && startSuggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        className="list-group-item-dark"
                                        onClick={() => handleSuggestionClick(suggestion, setStart, setStartSuggestions, startMarkerRef, true)}
                                    >
                                        {suggestion.address?.freeformAddress || 'Unknown location'}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* End Location Input */}
                        <div className="form-group mb-2">
                            <input
                                id="end"
                                className="form-control-dark"
                                value={end}
                                onChange={(e) => handleInputChange(e, setEnd, setEndSuggestions)}
                                placeholder="Enter end location"
                                autoComplete="off"
                            />
                            <ul className="list-group-dark">
                                {Array.isArray(endSuggestions) && endSuggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        className="list-group-item-dark"
                                        onClick={() => handleSuggestionClick(suggestion, setEnd, setEndSuggestions, endMarkerRef, false)}
                                    >
                                        {suggestion.address?.freeformAddress || 'Unknown location'}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Button to get the route */}
                        <div className="d-flex justify-content-between mb-3">
                            <button className="btn-primary-custom" onClick={handleRouteFetch} disabled={isSimulating}>
                                Get Route
                            </button>
                            <button className="btn-secondary-custom" onClick={resetMap}>
                                Reset
                            </button>
                        </div>

                        {/* Display time and distance */}
                        <div className="mb-3">
                            <p className="text-light">{time}<br/>{distance}</p>
                        </div>

                        {/* Chaos Simulation Section */}
                        {routeLine && (
                        <>
                            <div className="mb-3">
                                <h6 className="simulation-details">Chaos Simulation</h6>
                                {chaosSimulationDetails ? (
                                    <div className="text-light small">
                                        <div>Blocked Segments: {chaosSimulationDetails.blockedSegments}</div>
                                        <div>Reroutes: {chaosSimulationDetails.reroutes}</div>
                                        <div>Average Delay: {chaosSimulationDetails.averageDelay}</div>
                                    </div>
                                ) : (
                                    <p className="text-light small">No data yet.</p>
                                )}
                            </div>

                            {/* Game Simulation Section */}
                            <div className="mb-3">
                                <h6 className="simulation-details">Game Simulation</h6>
                                {gameSimulationDetails ? (
                                    <div className="text-light small">
                                        <div>Cooperation: {gameSimulationDetails.cooperationRatio}</div>
                                        <div>Equilibrium: {gameSimulationDetails.trafficEquilibrium}</div>
                                        <div>Optimal Path: {gameSimulationDetails.optimalPath}</div>
                                    </div>
                                ) : (
                                    <p className="text-light small">No data yet.</p>
                                )}
                            </div>
                        </>
                        )}

                        {/* Traffic Reporting Section */}
                        <TrafficReportButton />
                    </div>

                    {/* Voice Recognition Section */}
                    <div className="voice-section">
                        {(voiceStatus === 'listening' || voiceStatus === 'processing') && (
                            <div className="voice-feedback">
                                <div className="voice-transcript">
                                    {voiceTranscript || "Listening for your route..."}
                                </div>
                                <div className="voice-instruction">
                                    Try saying:
                                    <div className="voice-examples">
                                        <div>&quot;New York to Boston&quot;</div>
                                        <div>&quot;From Los Angeles to San Francisco&quot;</div>
                                        <div>&quot;Navigate from Chicago to Miami&quot;</div>
                                    </div>
                                </div>
                                {voiceStatus === 'listening' && (
                                    <div className="sound-waves">
                                        <div className="wave"></div>
                                        <div className="wave"></div>
                                        <div className="wave"></div>
                                        <div className="wave"></div>
                                        <div className="wave"></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {voiceStatus === 'success' && voiceCommand && (
                            <div className="voice-success">
                                <div className="voice-command">
                                    {voiceCommand}
                                </div>
                                <div className="voice-status">
                                    Route found successfully!
                                </div>
                            </div>
                        )}

                        {voiceStatus === 'error' && (
                            <div className="voice-error">
                                {voiceCommand || "Voice recognition failed. Please try again."}
                            </div>
                        )}

                        <button 
                            className={getVoiceButtonClass()}
                            onClick={toggleVoiceRecognition}
                            disabled={voiceStatus === 'processing'}
                        >
                            <span className={`voice-status-indicator status-${voiceStatus}`}></span>
                            {getVoiceButtonText()}
                        </button>
                    </div>
                </div>
        
                {/* Map */}
                <div ref={mapContainerRef} className="map-container">
                    {isSimulating && (
                        <>
                            <div className="blurred-overlay" />
                            <div className="text-overlay">
                                <div className="spinner"></div>
                                <h3>Simulating Route...</h3>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Traffic Report Modal */}
            <TrafficReportModal />

            {/* Location Details Panel */}
            {selectedLocation && (
                <div className="location-details-panel">
                    <div className="location-details-header">
                        <button className="close-btn" onClick={closeLocationDetails}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="location-details-content">
                        {isLoadingDetails ? (
                            <div className="loading-details">
                                <div className="spinner-small"></div>
                                <p>Loading location details...</p>
                            </div>
                        ) : locationDetails ? (
                            <>
                                {locationDetails.wikiData?.thumbnail?.source && (
                                    <div className="location-image">
                                        <img 
                                            src={locationDetails.wikiData.thumbnail.source} 
                                            alt={locationDetails.wikiData.title}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                
                                <div className="location-title">
                                    <h2>{locationDetails.wikiData?.title || locationDetails.address}</h2>
                                    {locationDetails.tomtomDetails?.poi?.name && (
                                        <p className="location-subtitle">{locationDetails.tomtomDetails.poi.name}</p>
                                    )}
                                    <p className="location-coordinates">
                                        📍 {locationDetails.position.lat.toFixed(4)}, {locationDetails.position.lon.toFixed(4)}
                                    </p>
                                </div>

                                {locationDetails.wikiData?.extract ? (
                                    <div className="location-description">
                                        <h4>About</h4>
                                        <p>{locationDetails.wikiData.extract}</p>
                                        
                                        {locationDetails.wikiData?.description && (
                                            <p className="location-category">
                                                <strong>Category:</strong> {locationDetails.wikiData.description}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="location-description">
                                        <h4>Location Information</h4>
                                        <p>No detailed information available from Wikipedia for this location.</p>
                                        {locationDetails.tomtomDetails?.address && (
                                            <div className="basic-info">
                                                <p><strong>Address:</strong> {locationDetails.address}</p>
                                                {locationDetails.tomtomDetails.address.municipality && (
                                                    <p><strong>City:</strong> {locationDetails.tomtomDetails.address.municipality}</p>
                                                )}
                                                {locationDetails.tomtomDetails.address.countrySubdivision && (
                                                    <p><strong>Region:</strong> {locationDetails.tomtomDetails.address.countrySubdivision}</p>
                                                )}
                                                {locationDetails.tomtomDetails.address.country && (
                                                    <p><strong>Country:</strong> {locationDetails.tomtomDetails.address.country}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {locationDetails.wikiData?.content_urls?.desktop?.page && (
                                    <div className="wikipedia-link">
                                        <a 
                                            href={locationDetails.wikiData.content_urls.desktop.page} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="wiki-btn"
                                        >
                                            <i className="fab fa-wikipedia-w"></i>
                                            Read more on Wikipedia
                                        </a>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="error-details">
                                <p>Could not load location details. Please try again.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;