// For Netlify deployment
const API_BASE = '/.netlify/functions';

const reports = new Map();

export const handler = async (event) => {
  const { httpMethod, body, queryStringParameters } = event;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE'
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (httpMethod === 'POST') {
    try {
      const report = JSON.parse(body);
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const reportWithId = {
        ...report,
        id,
        timestamp: Date.now(),
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours from now
      };

      reports.set(id, reportWithId);
      console.log('New report submitted:', reportWithId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(reportWithId)
      };
    } catch (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  if (httpMethod === 'GET') {
    const { start, end, since } = queryStringParameters || {};
    
    try {
      const now = Date.now();
      const allReports = Array.from(reports.values());
      
      // Clean up expired reports
      const validReports = allReports.filter(report => report.expiresAt > now);
      validReports.forEach(report => reports.set(report.id, report));
      
      // If since timestamp provided, return only recent reports
      if (since) {
        const sinceTime = parseInt(since);
        const recentReports = validReports.filter(report => report.timestamp > sinceTime);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(recentReports)
        };
      }
      
      // Filter by route if start/end provided
      if (start && end) {
        const routeReports = validReports.filter(report => 
          isReportOnRoute(report, { start, end })
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(routeReports)
        };
      }

      return { statusCode: 200, headers, body: JSON.stringify(validReports) };
    } catch (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  if (httpMethod === 'DELETE') {
    // Optional: Add cleanup endpoint
    const now = Date.now();
    for (let [key, report] of reports.entries()) {
      if (report.expiresAt <= now) {
        reports.delete(key);
      }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ cleaned: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

function isReportOnRoute(report, route) {
  if (!report.location) return false;
  
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
}