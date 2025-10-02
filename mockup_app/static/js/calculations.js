/**
 * @fileoverview Calculation functions for PV area geometry and solar parameters
 * @module calculations
 * @requires utils
 * @requires config
 */

/**
 * Calculates the azimuth angle of a PV area based on its polygon geometry
 * For roof-parallel: Uses the top edge (P1-P2) direction
 * For other types: Uses the average direction of all edges
 * @param {google.maps.Polygon} polygon - The polygon to calculate azimuth from
 * @returns {number} Azimuth angle in degrees (0-360)
 */
function calculatePVAreaAzimuth(polygon) {
    const path = polygon.getPath();
    const pvArea = polygon.pvAreaData;
    
    if (pvArea && pvArea.type === 'roof-parallel' && path.getLength() === 4) {
        // For roof-parallel, use top edge direction (P1 to P2)
        const p1 = path.getAt(0);
        const p2 = path.getAt(1);
        
        const heading = google.maps.geometry.spherical.computeHeading(p1, p2);
        // Convert to azimuth (0-360 degrees, 0=North, 90=East, 180=South, 270=West)
        let azimuth = (heading + 90) % 360;
        if (azimuth < 0) azimuth += 360;
        
        return Math.round(azimuth * 10) / 10;
    } else {
        // For other types, calculate average heading
        let totalHeading = 0;
        let count = 0;
        
        for (let i = 0; i < path.getLength(); i++) {
            const p1 = path.getAt(i);
            const p2 = path.getAt((i + 1) % path.getLength());
            
            const heading = google.maps.geometry.spherical.computeHeading(p1, p2);
            totalHeading += heading;
            count++;
        }
        
        let avgHeading = totalHeading / count;
        let azimuth = (avgHeading + 90) % 360;
        if (azimuth < 0) azimuth += 360;
        
        return Math.round(azimuth * 10) / 10;
    }
}

/**
 * Calculates the tilt angle for a roof-parallel PV area
 * Based on the perpendicular distance between top and bottom edges
 * @param {google.maps.Polygon} polygon - The polygon to calculate tilt from
 * @returns {number} Tilt angle in degrees (0-89)
 */
function calculatePVAreaTilt(polygon) {
    const pvArea = polygon.pvAreaData;
    if (!pvArea || pvArea.type !== 'roof-parallel') return 30; // Default tilt
    
    const perpDistance = pvArea.perpendicularDistance || calculatePerpendicularDistance(polygon);
    const topHeight = parseGermanNumber(pvArea.topHeight) || 10;
    const bottomHeight = parseGermanNumber(pvArea.bottomHeight) || 0;
    
    if (perpDistance <= 0) return 0;
    
    const heightDiff = topHeight - bottomHeight;
    const tiltRad = Math.atan(heightDiff / perpDistance);
    let tiltDeg = tiltRad * (180 / Math.PI);
    
    // Clamp between 0 and 89 degrees
    tiltDeg = Math.max(0, Math.min(89, tiltDeg));
    
    return Math.round(tiltDeg * 10) / 10;
}

/**
 * Calculates the perpendicular distance between parallel edges of a roof-parallel polygon
 * @param {google.maps.Polygon} polygon - The polygon to measure
 * @returns {number} Perpendicular distance in meters
 */
function calculatePerpendicularDistance(polygon) {
    const path = polygon.getPath();
    if (path.getLength() !== 4) return 0;
    
    // Get the four corners
    const p1 = path.getAt(0); // Top-left
    const p2 = path.getAt(1); // Top-right
    const p3 = path.getAt(2); // Bottom-right
    const p4 = path.getAt(3); // Bottom-left
    
    // Calculate the perpendicular distance from p4 to the line p1-p2
    const distance = calculatePointToLineDistance(p4, p1, p2);
    
    return Math.round(distance * 100) / 100;
}

/**
 * Calculates the perpendicular distance from a point to a line
 * @param {google.maps.LatLng} point - The point
 * @param {google.maps.LatLng} lineStart - Start point of the line
 * @param {google.maps.LatLng} lineEnd - End point of the line
 * @returns {number} Perpendicular distance in meters
 */
function calculatePointToLineDistance(point, lineStart, lineEnd) {
    // Convert to Cartesian coordinates for calculation
    const projection = mapManager.map.getProjection();
    if (!projection) {
        // Fallback to simple lat/lng calculation if projection not available
        return google.maps.geometry.spherical.computeDistanceBetween(point, lineStart);
    }
    const p = projection.fromLatLngToPoint(point);
    const a = projection.fromLatLngToPoint(lineStart);
    const b = projection.fromLatLngToPoint(lineEnd);
    
    // Vector from a to b
    const ab = { x: b.x - a.x, y: b.y - a.y };
    // Vector from a to p
    const ap = { x: p.x - a.x, y: p.y - a.y };
    
    // Calculate the perpendicular distance using cross product
    const crossProduct = ab.x * ap.y - ab.y * ap.x;
    const abLength = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
    
    if (abLength === 0) return 0;
    
    // Distance in projection units
    const distanceInPixels = Math.abs(crossProduct) / abLength;
    
    // Convert back to meters (approximate)
    const metersPerPixel = getMetersPerPixel(point.lat(), map.getZoom());
    
    return distanceInPixels * metersPerPixel;
}

/**
 * Calculates meters per pixel at a given latitude and zoom level
 * @param {number} latitude - Latitude in degrees
 * @param {number} zoom - Google Maps zoom level
 * @returns {number} Meters per pixel
 */
function getMetersPerPixel(latitude, zoom) {
    const earthCircumference = 40075016.686; // meters at equator
    const latRadians = latitude * Math.PI / 180;
    const metersPerPixel = earthCircumference * Math.cos(latRadians) / Math.pow(2, zoom + 8);
    return metersPerPixel;
}

/**
 * Calculates effective azimuth and tilt values considering cross tilt
 * @param {number} azimuth - Base azimuth in degrees
 * @param {number} tilt - Base tilt in degrees
 * @param {number} crossTilt - Cross tilt in degrees (-45 to 45)
 * @returns {Object} Object with effectiveAzimuth and effectiveTilt
 */
function calculateEffectiveValues(azimuth, tilt, crossTilt) {
    // Convert angles to radians
    const azimuthRad = azimuth * Math.PI / 180;
    const tiltRad = tilt * Math.PI / 180;
    const crossTiltRad = crossTilt * Math.PI / 180;
    
    // Calculate normal vector of the base orientation
    let nx = Math.sin(tiltRad) * Math.sin(azimuthRad);
    let ny = Math.sin(tiltRad) * Math.cos(azimuthRad);
    let nz = Math.cos(tiltRad);
    
    // Apply cross tilt rotation around the surface normal
    // This is a rotation around the axis perpendicular to both the normal and vertical
    const rotAxis = {
        x: Math.cos(azimuthRad),
        y: -Math.sin(azimuthRad),
        z: 0
    };
    
    // Rodrigues' rotation formula
    const cosAngle = Math.cos(crossTiltRad);
    const sinAngle = Math.sin(crossTiltRad);
    
    // Calculate rotated normal
    const dot = nx * rotAxis.x + ny * rotAxis.y + nz * rotAxis.z;
    const newNx = nx * cosAngle + (rotAxis.y * nz - rotAxis.z * ny) * sinAngle + rotAxis.x * dot * (1 - cosAngle);
    const newNy = ny * cosAngle + (rotAxis.z * nx - rotAxis.x * nz) * sinAngle + rotAxis.y * dot * (1 - cosAngle);
    const newNz = nz * cosAngle + (rotAxis.x * ny - rotAxis.y * nx) * sinAngle + rotAxis.z * dot * (1 - cosAngle);
    
    // Convert back to azimuth and tilt
    const effectiveTiltRad = Math.acos(Math.max(-1, Math.min(1, newNz)));
    const effectiveTilt = effectiveTiltRad * 180 / Math.PI;
    
    let effectiveAzimuthRad = Math.atan2(newNx, newNy);
    let effectiveAzimuth = effectiveAzimuthRad * 180 / Math.PI;
    if (effectiveAzimuth < 0) effectiveAzimuth += 360;
    
    return {
        effectiveAzimuth: Math.round(effectiveAzimuth * 10) / 10,
        effectiveTilt: Math.round(effectiveTilt * 10) / 10
    };
}

/**
 * Calculates the best-fit plane for a set of 3D points
 * Uses least squares method to find the plane that minimizes vertical distances
 * @param {Array<{x: number, y: number, z: number}>} points - Array of 3D points
 * @returns {Object} Plane parameters with normal vector and offset
 */
function calculateBestFitPlane(points) {
    if (points.length < 3) {
        console.error('Need at least 3 points for plane fitting');
        return null;
    }
    
    // Calculate centroid
    const centroid = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        z: points.reduce((sum, p) => sum + p.z, 0) / points.length
    };
    
    // Build matrix for least squares
    let sumXX = 0, sumXY = 0, sumXZ = 0;
    let sumYY = 0, sumYZ = 0;
    
    points.forEach(p => {
        const dx = p.x - centroid.x;
        const dy = p.y - centroid.y;
        const dz = p.z - centroid.z;
        
        sumXX += dx * dx;
        sumXY += dx * dy;
        sumXZ += dx * dz;
        sumYY += dy * dy;
        sumYZ += dy * dz;
    });
    
    // Solve for plane equation z = ax + by + c
    const det = sumXX * sumYY - sumXY * sumXY;
    let a, b;
    
    if (Math.abs(det) > 1e-10) {
        a = (sumXZ * sumYY - sumYZ * sumXY) / det;
        b = (sumYZ * sumXX - sumXZ * sumXY) / det;
    } else {
        // Points are colinear, use default
        a = 0;
        b = 0;
    }
    
    // Normal vector is (-a, -b, 1) normalized
    const normal = { x: -a, y: -b, z: 1 };
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
    
    // Calculate d for plane equation ax + by + cz + d = 0
    const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z);
    
    return {
        normal: normal,
        d: d,
        centroid: centroid
    };
}

/**
 * Calculates the area of a polygon
 * @param {google.maps.Polygon} polygon - The polygon to calculate area for
 * @returns {number} Area in square meters
 */
function calculatePolygonArea(polygon) {
    const path = polygon.getPath();
    const area = google.maps.geometry.spherical.computeArea(path);
    return Math.round(area * 100) / 100;
}

/**
 * Calculates the perimeter of a polygon
 * @param {google.maps.Polygon} polygon - The polygon to calculate perimeter for
 * @returns {number} Perimeter in meters
 */
function calculatePolygonPerimeter(polygon) {
    const path = polygon.getPath();
    let perimeter = 0;
    
    for (let i = 0; i < path.getLength(); i++) {
        const p1 = path.getAt(i);
        const p2 = path.getAt((i + 1) % path.getLength());
        perimeter += google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    }
    
    return Math.round(perimeter * 100) / 100;
}

/**
 * Gets the center point of a polygon
 * @param {google.maps.Polygon} polygon - The polygon
 * @returns {google.maps.LatLng} Center point
 */
function getPolygonCenter(polygon) {
    const bounds = new google.maps.LatLngBounds();
    const path = polygon.getPath();
    
    path.forEach(point => bounds.extend(point));
    return bounds.getCenter();
}

/**
 * Validates if a polygon is valid (no self-intersections)
 * @param {google.maps.Polygon} polygon - The polygon to validate
 * @returns {boolean} True if valid, false if self-intersecting
 */
function isValidPolygon(polygon) {
    const path = polygon.getPath();
    const n = path.getLength();
    
    if (n < 3) return false;
    
    // Check for self-intersections
    for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
            if (i === 0 && j === n - 1) continue; // Skip first and last edge
            
            const p1 = path.getAt(i);
            const p2 = path.getAt((i + 1) % n);
            const p3 = path.getAt(j);
            const p4 = path.getAt((j + 1) % n);
            
            if (doLineSegmentsIntersect(p1, p2, p3, p4)) {
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Checks if two line segments intersect
 * @param {google.maps.LatLng} p1 - Start of first segment
 * @param {google.maps.LatLng} p2 - End of first segment
 * @param {google.maps.LatLng} p3 - Start of second segment
 * @param {google.maps.LatLng} p4 - End of second segment
 * @returns {boolean} True if segments intersect
 */
function doLineSegmentsIntersect(p1, p2, p3, p4) {
    const ccw = (A, B, C) => {
        return (C.lng() - A.lng()) * (B.lat() - A.lat()) > (B.lng() - A.lng()) * (C.lat() - A.lat());
    };
    
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePVAreaAzimuth,
        calculatePVAreaTilt,
        calculatePerpendicularDistance,
        calculatePointToLineDistance,
        getMetersPerPixel,
        calculateEffectiveValues,
        calculateBestFitPlane,
        calculatePolygonArea,
        calculatePolygonPerimeter,
        getPolygonCenter,
        isValidPolygon
    };
}