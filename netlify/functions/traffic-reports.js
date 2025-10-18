// For Netlify deployment
const API_BASE = '/.netlify/functions';

const reports = new Map();

export const handler = async (event) => {
  const { httpMethod, body } = event;

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (httpMethod === 'POST') {
    try {
      const report = JSON.parse(body);
      const id = Date.now().toString();
      
      const reportWithId = {
        ...report,
        id,
        timestamp: Date.now()
      };

      reports.set(id, reportWithId);

      // Clean up old reports (older than 2 hours)
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      for (let [key, value] of reports.entries()) {
        if (value.timestamp < twoHoursAgo) {
          reports.delete(key);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(reportWithId)
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  if (httpMethod === 'GET') {
    const { start, end } = event.queryStringParameters || {};
    
    if (!start || !end) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Start and end parameters required' })
      };
    }

    try {
      const allReports = Array.from(reports.values());
      
      // Filter reports for the current route
      const routeReports = allReports.filter(report => 
        isReportOnRoute(report, { start, end })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(routeReports)
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

function isReportOnRoute(report, route) {
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