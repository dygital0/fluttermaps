export const predictRouteChoices = (trafficData) => {
    // Analyze traffic data to predict optimal routes
    const bestRoute = trafficData.reduce((prev, curr) => {
        return (prev.travelTime < curr.travelTime) ? prev : curr; // Minimize travel time
    });

    return bestRoute;
};