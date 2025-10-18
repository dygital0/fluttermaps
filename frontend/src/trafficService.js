// trafficService.js

const TRAFFIC_REPORTS_KEY = 'butterfly_nav_traffic_reports';
const REPORT_TTL = 30 * 60 * 1000; // 30 minutes

export const TrafficEventTypes = {
  TRAFFIC_JAM: 'traffic_jam',
  ROAD_CLOSED: 'road_closed',
  ACCIDENT: 'accident',
  CONSTRUCTION: 'construction',
  HAZARD: 'hazard',
  POLICE: 'police'
};

// Store reports in localStorage (simple solution for POC)
export const submitTrafficReport = async (report) => {
  try {
    const reports = getStoredReports();
    const newReport = {
      id: generateId(),
      timestamp: Date.now(),
      route: report.route, // { start: 'lat,lon', end: 'lat,lon' }
      location: report.location, // { lat, lon }
      type: report.type,
      severity: report.severity || 'medium',
      description: report.description,
      deviceId: getDeviceId()
    };
    
    reports.push(newReport);
    localStorage.setItem(TRAFFIC_REPORTS_KEY, JSON.stringify(reports));
    
    // In a real implementation, you'd send to a server
    // await sendToServer(newReport);
    
    return newReport;
  } catch (error) {
    console.error('Error submitting traffic report:', error);
    throw error;
  }
};

// Get relevant reports for current route
export const getTrafficReportsForRoute = (currentRoute) => {
  const reports = getStoredReports();
  const now = Date.now();
  
  // Filter expired reports and those relevant to current route
  return reports.filter(report => {
    // Filter expired reports
    if (now - report.timestamp > REPORT_TTL) return false;
    
    // Check if report is relevant to current route
    return isReportOnRoute(report, currentRoute);
  });
};

// Check if a report is on or near the current route
const isReportOnRoute = (report, route) => {
  // Simple implementation: check if report is between start and end
  // In reality, you'd want to check if it's actually on the route path
  const reportLat = report.location.lat;
  const reportLon = report.location.lon;
  
  const [startLat, startLon] = route.start.split(',').map(Number);
  const [endLat, endLon] = route.end.split(',').map(Number);
  
  // Check if report is within the bounding box of the route
  const minLat = Math.min(startLat, endLat);
  const maxLat = Math.max(startLat, endLat);
  const minLon = Math.min(startLon, endLon);
  const maxLon = Math.max(startLon, endLon);
  
  // Add some padding to the bounding box
  const padding = 0.1; // ~11km
  return reportLat >= (minLat - padding) && 
         reportLat <= (maxLat + padding) && 
         reportLon >= (minLon - padding) && 
         reportLon <= (maxLon + padding);
};

const getStoredReports = () => {
  try {
    return JSON.parse(localStorage.getItem(TRAFFIC_REPORTS_KEY)) || [];
  } catch {
    return [];
  }
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

// Note: For future use with Netlify Functions, you can implement sendToServer here
// when you're ready to set up serverless functions

export default {
  submitTrafficReport,
  getTrafficReportsForRoute,
  TrafficEventTypes
};