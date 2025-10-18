const TRAFFIC_REPORTS_KEY = 'butterfly_nav_traffic_reports';
const REPORT_TTL = 2 * 60 * 60 * 1000; // 2 hours
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8888/.netlify/functions' 
  : '/.netlify/functions';

export const TrafficEventTypes = {
  TRAFFIC_JAM: 'traffic_jam',
  ROAD_CLOSED: 'road_closed',
  ACCIDENT: 'accident',
  CONSTRUCTION: 'construction',
  HAZARD: 'hazard',
  POLICE: 'police'
};

// Submit report to shared service
export const submitTrafficReport = async (report) => {
  try {
    // First try to submit to shared service
    const response = await fetch(`${API_BASE}/traffic-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...report,
        deviceId: getDeviceId()
      }),
    });

    if (response.ok) {
      const sharedReport = await response.json();
      
      // Also store locally for offline capability
      storeReportLocally(sharedReport);
      
      return sharedReport;
    } else {
      throw new Error('Failed to submit to shared service');
    }
  } catch (error) {
    console.warn('Shared service unavailable, storing locally:', error);
    
    // Fallback to local storage
    const localReport = {
      ...report,
      id: generateId(),
      timestamp: Date.now(),
      deviceId: getDeviceId(),
      localOnly: true
    };
    
    storeReportLocally(localReport);
    return localReport;
  }
};

// Get reports from shared service
export const getTrafficReportsForRoute = async (currentRoute) => {
  try {
    // Try to get from shared service first
    const response = await fetch(
      `${API_BASE}/traffic-reports?start=${encodeURIComponent(currentRoute.start)}&end=${encodeURIComponent(currentRoute.end)}`
    );

    if (response.ok) {
      const sharedReports = await response.json();
      
      // Also get local reports
      const localReports = getLocalReportsForRoute(currentRoute);
      
      // Combine and deduplicate
      const allReports = [...sharedReports, ...localReports];
      const uniqueReports = deduplicateReports(allReports);
      
      return uniqueReports;
    } else {
      throw new Error('Failed to fetch from shared service');
    }
  } catch (error) {
    console.warn('Shared service unavailable, using local reports:', error);
    
    // Fallback to local storage
    return getLocalReportsForRoute(currentRoute);
  }
};

// Local storage fallback functions
const storeReportLocally = (report) => {
  const reports = getStoredReports();
  reports.push(report);
  localStorage.setItem(TRAFFIC_REPORTS_KEY, JSON.stringify(reports));
};

const getLocalReportsForRoute = (currentRoute) => {
  const reports = getStoredReports();
  const now = Date.now();
  
  return reports.filter(report => {
    // Filter expired reports
    if (now - report.timestamp > REPORT_TTL) return false;
    
    // Check if report is relevant to current route
    return isReportOnRoute(report, currentRoute);
  });
};

const getStoredReports = () => {
  try {
    return JSON.parse(localStorage.getItem(TRAFFIC_REPORTS_KEY)) || [];
  } catch {
    return [];
  }
};

const deduplicateReports = (reports) => {
  const seen = new Set();
  return reports.filter(report => {
    const key = `${report.location.lat}-${report.location.lon}-${report.type}-${report.timestamp}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getDeviceId = () => {
  let deviceId = localStorage.getItem('butterfly_nav_device_id');
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem('butterfly_nav_device_id', deviceId);
  }
  return deviceId;
};

// Keep the existing isReportOnRoute function
const isReportOnRoute = (report, route) => {
  const reportLat = report.location.lat;
  const reportLon = report.location.lon;
  
  const [startLat, startLon] = route.start.split(',').map(Number);
  const [endLat, endLon] = route.end.split(',').map(Number);
  
  const minLat = Math.min(startLat, endLat);
  const maxLat = Math.max(startLat, endLat);
  const minLon = Math.min(startLon, endLon);
  const maxLon = Math.max(startLon, endLon);
  
  const padding = 0.1;
  return reportLat >= (minLat - padding) && 
         reportLat <= (maxLat + padding) && 
         reportLon >= (minLon - padding) && 
         reportLon <= (maxLon + padding);
};

export default {
  submitTrafficReport,
  getTrafficReportsForRoute,
  TrafficEventTypes
};