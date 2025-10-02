/**
 * Geometry Utilities Module
 * Contains all geometric calculations and 3D math functions
 */

export const GeometryUtils = {
    /**
     * Calculate rotation matrix for 3D rotation
     * @param {Array} axis - Rotation axis [x, y, z]
     * @param {number} theta - Rotation angle in radians
     * @returns {Array} 3x3 rotation matrix
     */
    rotationMatrix(axis, theta) {
        // Normalize axis
        const axisLength = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
        axis = [axis[0]/axisLength, axis[1]/axisLength, axis[2]/axisLength];
        
        const a = Math.cos(theta / 2.0);
        const b = -axis[0] * Math.sin(theta / 2.0);
        const c = -axis[1] * Math.sin(theta / 2.0);
        const d = -axis[2] * Math.sin(theta / 2.0);
        
        const aa = a * a, bb = b * b, cc = c * c, dd = d * d;
        const bc = b * c, ad = a * d, ac = a * c, ab = a * b, bd = b * d, cd = c * d;
        
        return [
            [aa + bb - cc - dd, 2 * (bc + ad), 2 * (bd - ac)],
            [2 * (bc - ad), aa + cc - bb - dd, 2 * (cd + ab)],
            [2 * (bd + ac), 2 * (cd - ab), aa + dd - bb - cc]
        ];
    },

    /**
     * Matrix multiplication for 3x3 matrix and 3x1 vector
     * @param {Array} matrix - 3x3 matrix
     * @param {Array} vector - 3x1 vector
     * @returns {Array} Resulting 3x1 vector
     */
    matrixVectorMultiply(matrix, vector) {
        return [
            matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
            matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
            matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
        ];
    },

    /**
     * Calculate angle between two vectors
     * @param {Array} v1 - First vector [x, y, z]
     * @param {Array} v2 - Second vector [x, y, z]
     * @param {boolean} acute - If true, return acute angle
     * @returns {number} Angle in degrees
     */
    vectorAngle(v1, v2, acute = true) {
        const dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
        const norm1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1] + v1[2]*v1[2]);
        const norm2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1] + v2[2]*v2[2]);
        let angle = Math.acos(dot / (norm1 * norm2));
        
        if (!acute) {
            angle = 2 * Math.PI - angle;
        }
        return angle * 180 / Math.PI;
    },

    /**
     * Calculate effective azimuth and tilt considering cross tilt
     * @param {number} azimuth - Base azimuth in degrees
     * @param {number} tilt - Base tilt in degrees
     * @param {number} crossTilt - Cross tilt in degrees
     * @returns {Object} Object with effective azimuth and tilt
     */
    calculateEffectiveValues(azimuth, tilt, crossTilt) {
        // Convert to radians
        const tilRad = tilt * Math.PI / 180;
        const aziRad = azimuth * Math.PI / 180;
        const rotRad = crossTilt * Math.PI / 180;
        
        // Rotation axis orientation (perpendicular to azimuth)
        const rotDir = azimuth - 90;
        const rotDirRad = rotDir * Math.PI / 180;
        
        // Rotation axis in 3D
        const rotAxisX = Math.sin(rotDirRad - Math.PI/2);
        const rotAxisY = Math.cos(rotDirRad - Math.PI/2);
        const rotationAxis = [rotAxisX, rotAxisY, 0];
        
        // Convert tilt/azimuth to normal vector
        // Spherical to Cartesian conversion
        const a = -(azimuth - 90) * Math.PI / 180;
        const x = Math.sin(tilRad) * Math.cos(a);
        const y = Math.sin(tilRad) * Math.sin(a);
        const z = Math.cos(tilRad);
        
        let normal = [x, y, z];
        
        // Apply rotation if cross tilt is not zero
        if (Math.abs(crossTilt) > 0.01) {
            const rotMatrix = this.rotationMatrix(rotationAxis, rotRad);
            normal = this.matrixVectorMultiply(rotMatrix, normal);
        }
        
        // Calculate new azimuth
        const meridian = [0, 1, 0];
        const normalXY = [normal[0], normal[1], 0];
        const normalXYLength = Math.sqrt(normalXY[0]*normalXY[0] + normalXY[1]*normalXY[1]);
        
        let newAzimuth = 180; // Default south
        if (normalXYLength > 0.001) {
            normalXY[0] /= normalXYLength;
            normalXY[1] /= normalXYLength;
            newAzimuth = this.vectorAngle(normalXY, meridian, azimuth <= 180);
        }
        
        // Calculate new tilt
        let newTilt = 0;
        if (normalXYLength > 0.001) {
            newTilt = Math.atan(normal[2] / normalXYLength);
            newTilt = 90 - newTilt * 180 / Math.PI;
        } else {
            // If normal points straight up or down
            newTilt = normal[2] > 0 ? 0 : 180;
        }
        
        return {
            azimuth: Math.round(newAzimuth * 10) / 10,
            tilt: Math.round(newTilt * 10) / 10
        };
    },

    /**
     * Calculate best fit plane for a set of 3D points
     * @param {Array} points - Array of points with x, y, z properties
     * @returns {Object|null} Plane definition with normal and d, or null if insufficient points
     */
    calculateBestFitPlane(points) {
        const n = points.length;
        if (n < 3) return null;
        
        // For exactly 3 points, calculate the normal directly
        if (n === 3) {
            // Vectors from point 0 to points 1 and 2
            const v1 = {
                x: points[1].x - points[0].x,
                y: points[1].y - points[0].y,
                z: points[1].z - points[0].z
            };
            const v2 = {
                x: points[2].x - points[0].x,
                y: points[2].y - points[0].y,
                z: points[2].z - points[0].z
            };
            
            // Cross product gives normal
            const normal = {
                x: v1.y * v2.z - v1.z * v2.y,
                y: v1.z * v2.x - v1.x * v2.z,
                z: v1.x * v2.y - v1.y * v2.x
            };
            
            // Normalize
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
            if (length > 0) {
                normal.x /= length;
                normal.y /= length;
                normal.z /= length;
            }
            
            // Calculate d using point 0
            const d = -(normal.x * points[0].x + normal.y * points[0].y + normal.z * points[0].z);
            
            return {
                normal: normal,
                d: d,
                centroid: points[0]
            };
        }
        
        // For 4 or more points, use least squares fitting
        // Calculate centroid
        let sumX = 0, sumY = 0, sumZ = 0;
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumZ += p.z;
        });
        
        const centroid = {
            x: sumX / n,
            y: sumY / n,
            z: sumZ / n
        };
        
        // Build covariance matrix
        let xx = 0, xy = 0, xz = 0;
        let yy = 0, yz = 0, zz = 0;
        
        points.forEach(p => {
            const dx = p.x - centroid.x;
            const dy = p.y - centroid.y;
            const dz = p.z - centroid.z;
            
            xx += dx * dx;
            xy += dx * dy;
            xz += dx * dz;
            yy += dy * dy;
            yz += dy * dz;
            zz += dz * dz;
        });
        
        // Find eigenvector with smallest eigenvalue using power iteration
        // This is the normal to the best-fit plane
        const det = xx * yy * zz + 2 * xy * yz * xz - xx * yz * yz - yy * xz * xz - zz * xy * xy;
        
        // For numerical stability, use cross product of two edges if determinant is too small
        if (Math.abs(det) < 1e-10) {
            const v1 = {
                x: points[1].x - points[0].x,
                y: points[1].y - points[0].y,
                z: points[1].z - points[0].z
            };
            const v2 = {
                x: points[n-1].x - points[0].x,
                y: points[n-1].y - points[0].y,
                z: points[n-1].z - points[0].z
            };
            
            const normal = {
                x: v1.y * v2.z - v1.z * v2.y,
                y: v1.z * v2.x - v1.x * v2.z,
                z: v1.x * v2.y - v1.y * v2.x
            };
            
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
            if (length > 0) {
                normal.x /= length;
                normal.y /= length;
                normal.z /= length;
            }
            
            const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z);
            
            return {
                normal: normal,
                d: d,
                centroid: centroid
            };
        }
        
        // Simplified approach: use the eigenvector corresponding to smallest eigenvalue
        // For a 3x3 symmetric matrix, we can use analytical methods
        // Here we use a simplified approach assuming the smallest variation is in z direction
        let normal = { x: 0, y: 0, z: 1 };
        
        // If variation in z is not the smallest, adjust
        if (zz > xx || zz > yy) {
            if (xx < yy) {
                normal = { x: 1, y: 0, z: 0 };
            } else {
                normal = { x: 0, y: 1, z: 0 };
            }
        }
        
        // Refine normal using gradient descent
        for (let iter = 0; iter < 10; iter++) {
            let gradX = 0, gradY = 0, gradZ = 0;
            
            points.forEach(p => {
                const dist = normal.x * (p.x - centroid.x) + 
                           normal.y * (p.y - centroid.y) + 
                           normal.z * (p.z - centroid.z);
                gradX += 2 * dist * (p.x - centroid.x);
                gradY += 2 * dist * (p.y - centroid.y);
                gradZ += 2 * dist * (p.z - centroid.z);
            });
            
            normal.x -= 0.01 * gradX;
            normal.y -= 0.01 * gradY;
            normal.z -= 0.01 * gradZ;
            
            // Normalize
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
            if (length > 0) {
                normal.x /= length;
                normal.y /= length;
                normal.z /= length;
            }
        }
        
        const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z);
        
        return {
            normal: normal,
            d: d,
            centroid: centroid
        };
    },

    /**
     * Get midpoint between two lat/lng points
     * @param {Object} p1 - First point with lat(), lng() methods
     * @param {Object} p2 - Second point with lat(), lng() methods
     * @returns {Object} Google Maps LatLng object
     */
    getMidpoint(p1, p2) {
        return new google.maps.LatLng(
            (p1.lat() + p2.lat()) / 2,
            (p1.lng() + p2.lng()) / 2
        );
    },

    /**
     * Constrain a point to lie on a line
     * @param {Object} point - Point to constrain
     * @param {Object} lineStart - Start of line
     * @param {Object} lineEnd - End of line
     * @returns {Object} Constrained point
     */
    constrainToLine(point, lineStart, lineEnd) {
        const x1 = lineStart.lng();
        const y1 = lineStart.lat();
        const x2 = lineEnd.lng();
        const y2 = lineEnd.lat();
        const x3 = point.lng();
        const y3 = point.lat();
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        if (dx === 0 && dy === 0) {
            return lineStart;
        }
        
        const t = ((x3 - x1) * dx + (y3 - y1) * dy) / (dx * dx + dy * dy);
        
        // Clamp t to [0, 1] to keep point on line segment
        const tClamped = Math.max(0, Math.min(1, t));
        
        return new google.maps.LatLng(
            y1 + tClamped * dy,
            x1 + tClamped * dx
        );
    },

    /**
     * Calculate the fourth corner of a rectangle given three corners
     * @param {Object} p1 - First corner
     * @param {Object} p2 - Second corner
     * @param {Object} p3 - Third corner
     * @returns {Object} Fourth corner
     */
    calculateRectangle(p1, p2, p3) {
        // For a rectangle ABCD, if we have A, B, C, then D = A + C - B
        return new google.maps.LatLng(
            p1.lat() + p3.lat() - p2.lat(),
            p1.lng() + p3.lng() - p2.lng()
        );
    },

    /**
     * Calculate perpendicular distance between top and bottom edges of a polygon
     * @param {Object} polygon - Google Maps polygon
     * @returns {number} Distance in meters
     */
    calculatePerpendicularDistance(polygon) {
        const path = polygon.getPath();
        if (path.getLength() < 4) return 0;
        
        // Get the four corners
        const p1 = path.getAt(0);
        const p2 = path.getAt(1);
        const p3 = path.getAt(2);
        const p4 = path.getAt(3);
        
        // Calculate midpoints of top and bottom edges
        const topMid = new google.maps.LatLng(
            (p1.lat() + p2.lat()) / 2,
            (p1.lng() + p2.lng()) / 2
        );
        const bottomMid = new google.maps.LatLng(
            (p3.lat() + p4.lat()) / 2,
            (p3.lng() + p4.lng()) / 2
        );
        
        // Calculate distance
        return google.maps.geometry.spherical.computeDistanceBetween(topMid, bottomMid);
    }
};

// For backward compatibility, also export individual functions
export const {
    rotationMatrix,
    matrixVectorMultiply,
    vectorAngle,
    calculateEffectiveValues,
    calculateBestFitPlane,
    getMidpoint,
    constrainToLine,
    calculateRectangle,
    calculatePerpendicularDistance
} = GeometryUtils;