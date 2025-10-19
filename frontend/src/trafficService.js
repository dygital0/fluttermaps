const API_BASE = '/.netlify/functions';
let lastFetchTime = 0;

export const TrafficEventTypes = {
  TRAFFIC_JAM: 'traffic_jam',
  ROAD_CLOSED: 'road_closed',
  ACCIDENT: 'accident',
  CONSTRUCTION: 'construction',
  HAZARD: 'hazard',
  POLICE: 'police'
};

export const submitTrafficReport = async (report) => {
  try {
    const response = await fetch(`${API_BASE}/traffic-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Failed to submit: ${response.status}`);
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
};

export const getTrafficReportsForRoute = async (currentRoute, since = null) => {
  try {
    let url = `${API_BASE}/traffic-reports?start=${encodeURIComponent(currentRoute.start)}&end=${encodeURIComponent(currentRoute.end)}`;
    
    if (since) {
      url += `&since=${since}`;
    }

    const response = await fetch(url);
    
    if (response.ok) {
      const reports = await response.json();
      lastFetchTime = Date.now();
      return Array.isArray(reports) ? reports : [];
    } else {
      console.warn('Failed to fetch reports:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

// Get only new reports since last check
export const getNewTrafficReports = async (currentRoute) => {
  return await getTrafficReportsForRoute(currentRoute, lastFetchTime);
};

export default {
  submitTrafficReport,
  getTrafficReportsForRoute,
  getNewTrafficReports,
  TrafficEventTypes
};