// routeSimulator.js

/**
 * Simulates random disruptions in the route using chaos theory.
 * Randomly removes points from legs to mimic unexpected events.
 * @param {Object} routeData - The route data with legs and points.
 * @returns {Object} Modified route data with simulated chaos.
 */
export const simulateChaosTheoryRoutes = (routeData) => {
    const randomEventChance = 0.15; // 15% chance of altering a leg
    const modifiedLegs = routeData.legs.map(leg => {
        if (Math.random() < randomEventChance) {
            const disruptionIndex = Math.floor(Math.random() * leg.points.length);
            console.log(`Chaos Theory: Disrupted point at index ${disruptionIndex}`);
            const alteredPoints = leg.points.filter((_, index) => index !== disruptionIndex);
            return { ...leg, points: alteredPoints };
        }
        return leg;
    });

    return { ...routeData, legs: modifiedLegs };
};

/**
 * Evaluates route viability using game theory principles.
 * Ensures the route is reasonable based on distance and segment availability.
 * @param {Object} routeData - The route data to analyze.
 * @returns {Boolean} Whether the route is viable or not.
 */
export const isGameTheoryViable = (routeData) => {
    const minDistance = 500; // Minimum viable route distance (meters)
    const maxBlockedSegments = 2; // Maximum allowed blocked segments
    let blockedSegments = 0;
    let totalDistance = 0;

    for (const leg of routeData.legs) {
        totalDistance += leg.summary.lengthInMeters;
        if (leg.points.length < 2) blockedSegments++;
        if (blockedSegments > maxBlockedSegments) {
            console.log("Game Theory: Too many blocked segments, route is non-viable.");
            return false;
        }
    }

    if (totalDistance < minDistance) {
        console.log("Game Theory: Route too short, non-viable.");
        return false;
    }

    console.log("Game Theory: Route deemed viable.");
    return true;
};

/**
 * Simulates multiple routes to provide alternative viable paths.
 * @param {Object} routeData - The original route data.
 * @param {Number} simulationCount - Number of simulations to run.
 * @returns {Array} Array of viable routes.
 */
export const simulateMultipleRoutes = (routes, routeData, simulationCount = 3) => {
    const viableRoutes = [];
    for (let i = 0; i < simulationCount; i++) {
        const chaoticRoute = simulateChaosTheoryRoutes(routeData);
        if (isGameTheoryViable(chaoticRoute)) {
            viableRoutes.push(chaoticRoute);
            console.log(`Simulation ${i + 1}: Viable route found.`);
        } else {
            console.log(`Simulation ${i + 1}: Route discarded.`);
        }
    }
    return viableRoutes;
};