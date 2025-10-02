/**
 * @fileoverview Advanced drawing and editing functionality for PV areas
 * @module drawing
 * @requires config
 * @requires state
 * @requires utils
 * @requires calculations
 * @requires map
 * @requires pv-areas
 */

/**
 * Drawing Manager class
 * Handles advanced polygon editing, rotation, and custom markers
 */
class DrawingManager {
    constructor() {
        /**
         * @type {boolean} Edit mode state
         */
        this.editMode = false;
        
        /**
         * @type {Object} Current rotation state
         */
        this.rotationState = {
            active: false,
            pvId: null,
            originalPath: null,
            center: null
        };
        
        /**
         * @type {Map<string, Array>} Midpoint markers for each PV area
         */
        this.midpointMarkers = new Map();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Sets up event listeners
     * @private
     */
    setupEventListeners() {
        // Listen for PV area creation
        state.on('pvarea:added', (pvArea) => {
            if (pvArea.type === 'roof-parallel') {
                this.setupRoofParallelPolygon(pvArea);
            }
        });
        
        // Listen for edit mode changes
        state.on('mode:changed', (data) => {
            if (data.new.tool === 'edit') {
                this.enableEditMode();
            } else {
                this.disableEditMode();
            }
        });
        
        // Listen for path changes
        state.on('pvarea:path_changed', (data) => {
            if (this.editMode) {
                this.updateMidpointMarkers(data.pvArea.id);
            }
        });
        
        // Listen for drawing mode changes
        state.on('mode:changed', (data) => {
            if (data.new.tool === 'draw-pv' && data.new.pvType === 'roof-parallel') {
                this.startRoofParallelDrawing();
            }
        });
    }
    
    /**
     * Sets up special editing features for roof-parallel polygons
     * @param {Object} pvArea - PV area object
     */
    setupRoofParallelPolygon(pvArea) {
        const polygon = pvAreaManager.getPolygon(pvArea.id);
        if (!polygon) return;
        
        const elements = polygon.associatedElements || {};
        
        // Create colored edge lines FIRST (so they appear below markers)
        this.createColoredEdgeLines(polygon, pvArea, elements);
        
        // Create corner markers with special behavior
        this.createRoofParallelMarkers(polygon, pvArea, elements);
        
        // Create rotation marker
        this.createRotationMarker(polygon, pvArea, elements);
        
        // Create azimuth arrow
        this.createAzimuthArrow(polygon, pvArea, elements);
        
        // Create edge labels
        this.createEdgeLabels(polygon, pvArea, elements);
        
        // Update polygon's associated elements
        polygon.associatedElements = elements;
        pvAreaManager.elements.set(pvArea.id, elements);
    }
    
    /**
     * Creates colored edge lines for roof-parallel polygons
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object to populate
     */
    createColoredEdgeLines(polygon, pvArea, elements) {
        const path = polygon.getPath();
        elements.edgeLines = [];
        
        // Create turquoise line for top edge (P1-P2)
        const topLine = new google.maps.Polyline({
            path: [path.getAt(0), path.getAt(1)],
            strokeColor: CONFIG.drawing.edgeColors.top || '#00CED1',
            strokeWeight: 4,
            strokeOpacity: 1.0,
            map: mapManager.map,
            clickable: false,
            zIndex: CONFIG.ui.zIndex.edgeLines || 500
        });
        elements.edgeLines.push(topLine);
        
        // Create orange line for bottom edge (P3-P4)
        const bottomLine = new google.maps.Polyline({
            path: [path.getAt(2), path.getAt(3)],
            strokeColor: CONFIG.drawing.edgeColors.bottom || '#FF8C00',
            strokeWeight: 4,
            strokeOpacity: 1.0,
            map: mapManager.map,
            clickable: false,
            zIndex: CONFIG.ui.zIndex.edgeLines || 500
        });
        elements.edgeLines.push(bottomLine);
        
        // Update lines when polygon changes
        google.maps.event.addListener(path, 'set_at', () => {
            topLine.setPath([path.getAt(0), path.getAt(1)]);
            bottomLine.setPath([path.getAt(2), path.getAt(3)]);
        });
    }
    
    /**
     * Gets corner color based on index
     * @private
     * @param {number} index - Corner index
     * @returns {string} Color hex code
     */
    getCornerColor(index) {
        // Top corners (0,1) are turquoise, bottom corners (2,3) are orange
        return index < 2 ? '#00CED1' : '#FF8C00';
    }
    
    /**
     * Creates corner markers for roof-parallel polygons
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object to populate
     */
    createRoofParallelMarkers(polygon, pvArea, elements) {
        const path = polygon.getPath();
        elements.markers = [];
        
        // Create markers for each corner
        for (let i = 0; i < 4; i++) {
            const position = path.getAt(i);
            
            const marker = new google.maps.Marker({
                position: position,
                map: mapManager.map,
                draggable: true,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: CONFIG.drawing.markers.corner.scale,
                    fillColor: '#FFFFFF',  // White markers
                    fillOpacity: CONFIG.drawing.markers.corner.fillOpacity,
                    strokeColor: CONFIG.drawing.markers.corner.strokeColor,
                    strokeWeight: CONFIG.drawing.markers.corner.strokeWeight
                },
                zIndex: CONFIG.ui.zIndex.markers
            });
            
            // Store corner index
            marker.cornerIndex = i;
            
            // Add drag listeners with orthogonal constraint
            this.addOrthogonalDragListeners(marker, polygon, pvArea, i);
            
            // Add double arrow indicator for parallel edges
            if (i === 0 || i === 3) { // Left side corners
                this.addDoubleArrowMarker(marker, polygon, 'vertical', elements);
            } else { // Right side corners
                this.addDoubleArrowMarker(marker, polygon, 'vertical', elements);
            }
            
            elements.markers.push(marker);
        }
        
        // Create edge move markers
        this.createEdgeMoveMarkers(polygon, pvArea, elements);
    }
    
    /**
     * Creates edge move markers for roof-parallel polygons
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    createEdgeMoveMarkers(polygon, pvArea, elements) {
        elements.edgeMoveMarkers = [];
        
        // Top edge marker (moves P1 and P2 together)
        const topEdgeMarker = this.createEdgeMarker(polygon, 0, 1, 'horizontal');
        this.addEdgeDragListeners(topEdgeMarker, polygon, pvArea, [0, 1]);
        elements.edgeMoveMarkers.push(topEdgeMarker);
        
        // Bottom edge marker (moves P3 and P4 together)
        const bottomEdgeMarker = this.createEdgeMarker(polygon, 2, 3, 'horizontal');
        this.addEdgeDragListeners(bottomEdgeMarker, polygon, pvArea, [2, 3]);
        elements.edgeMoveMarkers.push(bottomEdgeMarker);
    }
    
    /**
     * Creates an edge marker between two corners
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {number} corner1 - First corner index
     * @param {number} corner2 - Second corner index
     * @param {string} direction - Movement direction ('horizontal' or 'vertical')
     * @returns {google.maps.Marker} Edge marker
     */
    createEdgeMarker(polygon, corner1, corner2, direction) {
        const path = polygon.getPath();
        const p1 = path.getAt(corner1);
        const p2 = path.getAt(corner2);
        
        // Calculate midpoint
        const midLat = (p1.lat() + p2.lat()) / 2;
        const midLng = (p1.lng() + p2.lng()) / 2;
        
        const marker = new google.maps.Marker({
            position: new google.maps.LatLng(midLat, midLng),
            map: mapManager.map,
            draggable: true,
            icon: {
                path: direction === 'horizontal' ? 
                    'M -10 0 L 10 0 M -10 -3 L -10 3 M 10 -3 L 10 3' : 
                    'M 0 -10 L 0 10 M -3 -10 L 3 -10 M -3 10 L 3 10',
                scale: 1.2,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                strokeOpacity: 1
            },
            zIndex: CONFIG.ui.zIndex.markers - 1
        });
        
        marker.edgeDirection = direction;
        return marker;
    }
    
    /**
     * Adds double arrow indicator to a marker
     * @private
     * @param {google.maps.Marker} marker - The marker
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {string} direction - Arrow direction
     * @param {Object} elements - Elements object
     */
    addDoubleArrowMarker(marker, polygon, direction, elements) {
        const arrowMarker = new google.maps.Marker({
            position: marker.getPosition(),
            map: mapManager.map,
            clickable: false,
            icon: {
                path: direction === 'vertical' ? 
                    'M 0 -15 L -5 -10 M 0 -15 L 5 -10 M 0 -15 L 0 15 M -5 10 L 0 15 M 5 10 L 0 15' :
                    'M -15 0 L -10 -5 M -15 0 L -10 5 M -15 0 L 15 0 M 10 -5 L 15 0 M 10 5 L 15 0',
                scale: 1,
                strokeColor: '#4CAF50',
                strokeWeight: 2,
                strokeOpacity: 0.8
            },
            zIndex: CONFIG.ui.zIndex.markers - 1
        });
        
        // Link arrow to main marker
        marker.doubleArrowMarker = arrowMarker;
        
        // Update arrow position when marker moves
        google.maps.event.addListener(marker, 'position_changed', () => {
            arrowMarker.setPosition(marker.getPosition());
        });
    }
    
    /**
     * Adds orthogonal drag listeners to a corner marker
     * @private
     * @param {google.maps.Marker} marker - The marker
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {number} cornerIndex - Corner index (0-3)
     */
    addOrthogonalDragListeners(marker, polygon, pvArea, cornerIndex) {
        let dragStartPath = null;
        
        google.maps.event.addListener(marker, 'dragstart', () => {
            // Store original path
            dragStartPath = polygon.getPath().getArray().map(p => ({
                lat: p.lat(),
                lng: p.lng()
            }));
        });
        
        google.maps.event.addListener(marker, 'drag', (event) => {
            const newPosition = event.latLng;
            const path = polygon.getPath();
            
            // Apply orthogonal constraint based on corner
            const constrainedPosition = this.applyOrthogonalConstraint(
                newPosition, cornerIndex, dragStartPath, polygon
            );
            
            // Update marker position
            marker.setPosition(constrainedPosition);
            
            // Update polygon path
            path.setAt(cornerIndex, constrainedPosition);
            
            // Update parallel corner to maintain rectangle
            this.updateParallelCorner(cornerIndex, constrainedPosition, path, dragStartPath);
            
            // Update edge labels
            this.updateEdgeLabels(polygon, pvArea);
            
            // Update dimension displays
            if (pvArea.type === 'roof-parallel') {
                pvArea.perpendicularDistance = calculatePerpendicularDistance(polygon);
                state.emit('pvarea:dimensions_changed', pvArea);
            }
        });
        
        google.maps.event.addListener(marker, 'dragend', () => {
            // Update PV area data
            pvAreaManager.updatePVAreaCoordinates(pvArea.id);
            
            // Recalculate if auto-calculate is enabled
            if (pvArea.autoCalculateAzimuth) {
                pvArea.azimuth = calculatePVAreaAzimuth(polygon);
            }
            if (pvArea.autoCalculateTilt) {
                pvArea.tilt = calculatePVAreaTilt(polygon);
            }
            
            state.updatePvArea(pvArea.id, pvArea);
        });
    }
    
    /**
     * Applies orthogonal constraint to marker movement
     * @private
     * @param {google.maps.LatLng} newPosition - New position
     * @param {number} cornerIndex - Corner index
     * @param {Array} originalPath - Original path coordinates
     * @param {google.maps.Polygon} polygon - The polygon
     * @returns {google.maps.LatLng} Constrained position
     */
    applyOrthogonalConstraint(newPosition, cornerIndex, originalPath, polygon) {
        // Convert to pixel coordinates for precise calculation
        const projection = mapManager.map.getProjection();
        const zoom = mapManager.map.getZoom();
        const scale = 1 << zoom;
        
        // Get pixel positions
        const newPixel = projection.fromLatLngToPoint(newPosition);
        const originalPixels = originalPath.map(p => 
            projection.fromLatLngToPoint(new google.maps.LatLng(p.lat, p.lng))
        );
        
        // Scale to actual pixels
        newPixel.x *= scale;
        newPixel.y *= scale;
        originalPixels.forEach(p => {
            p.x *= scale;
            p.y *= scale;
        });
        
        // Calculate constraint based on corner
        let constrainedPixel;
        
        switch (cornerIndex) {
            case 0: // Top-left - can move along top edge direction
                constrainedPixel = this.projectPointOntoLine(
                    newPixel, originalPixels[0], originalPixels[1]
                );
                break;
            case 1: // Top-right - can move along top edge direction
                constrainedPixel = this.projectPointOntoLine(
                    newPixel, originalPixels[0], originalPixels[1]
                );
                break;
            case 2: // Bottom-right - can move along bottom edge direction
                constrainedPixel = this.projectPointOntoLine(
                    newPixel, originalPixels[2], originalPixels[3]
                );
                break;
            case 3: // Bottom-left - can move along bottom edge direction
                constrainedPixel = this.projectPointOntoLine(
                    newPixel, originalPixels[2], originalPixels[3]
                );
                break;
        }
        
        // Convert back to lat/lng
        constrainedPixel.x /= scale;
        constrainedPixel.y /= scale;
        
        return projection.fromPointToLatLng(constrainedPixel);
    }
    
    /**
     * Projects a point onto a line
     * @private
     * @param {Object} point - Point to project
     * @param {Object} lineStart - Line start point
     * @param {Object} lineEnd - Line end point
     * @returns {Object} Projected point
     */
    projectPointOntoLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) {
            return { x: lineStart.x, y: lineStart.y };
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        
        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
    }
    
    /**
     * Updates parallel corner to maintain rectangle shape
     * @private
     * @param {number} movedCorner - Index of moved corner
     * @param {google.maps.LatLng} newPosition - New position
     * @param {google.maps.MVCArray} path - Polygon path
     * @param {Array} originalPath - Original path coordinates
     */
    updateParallelCorner(movedCorner, newPosition, path, originalPath) {
        // Determine which corner moves in parallel
        let parallelCorner;
        switch (movedCorner) {
            case 0: parallelCorner = 1; break; // Top-left moves top-right
            case 1: parallelCorner = 0; break; // Top-right moves top-left
            case 2: parallelCorner = 3; break; // Bottom-right moves bottom-left
            case 3: parallelCorner = 2; break; // Bottom-left moves bottom-right
        }
        
        // Calculate parallel movement
        const projection = mapManager.map.getProjection();
        const zoom = mapManager.map.getZoom();
        const scale = 1 << zoom;
        
        // Get movement delta
        const oldPixel = projection.fromLatLngToPoint(
            new google.maps.LatLng(originalPath[movedCorner].lat, originalPath[movedCorner].lng)
        );
        const newPixel = projection.fromLatLngToPoint(newPosition);
        
        oldPixel.x *= scale;
        oldPixel.y *= scale;
        newPixel.x *= scale;
        newPixel.y *= scale;
        
        const deltaX = newPixel.x - oldPixel.x;
        const deltaY = newPixel.y - oldPixel.y;
        
        // Apply delta to parallel corner
        const parallelOldPixel = projection.fromLatLngToPoint(
            new google.maps.LatLng(originalPath[parallelCorner].lat, originalPath[parallelCorner].lng)
        );
        parallelOldPixel.x *= scale;
        parallelOldPixel.y *= scale;
        
        const parallelNewPixel = {
            x: parallelOldPixel.x + deltaX,
            y: parallelOldPixel.y + deltaY
        };
        
        parallelNewPixel.x /= scale;
        parallelNewPixel.y /= scale;
        
        const parallelNewPosition = projection.fromPointToLatLng(parallelNewPixel);
        path.setAt(parallelCorner, parallelNewPosition);
        
        // Update marker position
        const pvArea = state.getPvAreaByPolygon(polygon);
        if (pvArea) {
            const elements = pvAreaManager.elements.get(pvArea.id);
            if (elements && elements.markers && elements.markers[parallelCorner]) {
                elements.markers[parallelCorner].setPosition(parallelNewPosition);
            }
        }
    }
    
    /**
     * Creates rotation marker for roof-parallel polygons
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    createRotationMarker(polygon, pvArea, elements) {
        const bounds = new google.maps.LatLngBounds();
        const path = polygon.getPath();
        
        path.forEach(p => bounds.extend(p));
        const center = bounds.getCenter();
        
        // Calculate offset for rotation marker
        const ne = bounds.getNorthEast();
        const rotationLat = ne.lat() + (ne.lat() - center.lat()) * 0.3;
        const rotationLng = ne.lng() + (ne.lng() - center.lng()) * 0.3;
        
        const rotationMarker = new google.maps.Marker({
            position: new google.maps.LatLng(rotationLat, rotationLng),
            map: mapManager.map,
            draggable: true,
            icon: {
                path: 'M 0 0 L -5 -10 L 0 -8 L 5 -10 L 0 0',
                scale: 1.5,
                fillColor: '#FF0000',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                rotation: 0
            },
            cursor: 'grab',
            zIndex: CONFIG.ui.zIndex.markers + 1
        });
        
        // Add rotation functionality
        this.addRotationListeners(rotationMarker, polygon, pvArea);
        
        elements.rotationMarker = rotationMarker;
    }
    
    /**
     * Adds rotation listeners to rotation marker
     * @private
     * @param {google.maps.Marker} marker - Rotation marker
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     */
    addRotationListeners(marker, polygon, pvArea) {
        let isDragging = false;
        let originalPath = null;
        let center = null;
        
        google.maps.event.addListener(marker, 'dragstart', () => {
            isDragging = true;
            
            // Store original path
            const path = polygon.getPath();
            originalPath = [];
            for (let i = 0; i < path.getLength(); i++) {
                originalPath.push(path.getAt(i));
            }
            
            // Calculate center
            const bounds = new google.maps.LatLngBounds();
            originalPath.forEach(p => bounds.extend(p));
            center = bounds.getCenter();
            
            // Change cursor
            mapManager.map.setOptions({ draggableCursor: 'grabbing' });
        });
        
        google.maps.event.addListener(marker, 'drag', (event) => {
            if (!isDragging || !originalPath || !center) return;
            
            // Calculate rotation angle
            const angle = this.calculateRotationAngle(center, event.latLng);
            
            // Rotate polygon
            this.rotatePolygon(polygon, originalPath, center, angle);
            
            // Update marker icon rotation
            const icon = marker.getIcon();
            icon.rotation = angle;
            marker.setIcon(icon);
            
            // Update associated elements
            this.updateRotatedElements(polygon, pvArea);
        });
        
        google.maps.event.addListener(marker, 'dragend', () => {
            isDragging = false;
            
            // Reset cursor
            mapManager.map.setOptions({ draggableCursor: null });
            
            // Update PV area data
            pvAreaManager.updatePVAreaCoordinates(pvArea.id);
            
            // Recalculate azimuth
            pvArea.azimuth = calculatePVAreaAzimuth(polygon);
            if (pvArea.autoCalculateTilt) {
                pvArea.perpendicularDistance = calculatePerpendicularDistance(polygon);
                pvArea.tilt = calculatePVAreaTilt(polygon);
            }
            
            state.updatePvArea(pvArea.id, pvArea);
            
            // Reset marker to initial position
            setTimeout(() => {
                this.updateRotationMarkerPosition(polygon, marker);
            }, 100);
        });
    }
    
    /**
     * Calculates rotation angle based on marker position
     * @private
     * @param {google.maps.LatLng} center - Rotation center
     * @param {google.maps.LatLng} markerPos - Marker position
     * @returns {number} Rotation angle in degrees
     */
    calculateRotationAngle(center, markerPos) {
        const angle = google.maps.geometry.spherical.computeHeading(center, markerPos);
        return angle;
    }
    
    /**
     * Rotates a polygon around its center
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Array} originalPath - Original path
     * @param {google.maps.LatLng} center - Rotation center
     * @param {number} angle - Rotation angle in degrees
     */
    rotatePolygon(polygon, originalPath, center, angle) {
        const path = polygon.getPath();
        const angleRad = angle * Math.PI / 180;
        
        // Use pixel coordinates for precise rotation
        const projection = mapManager.map.getProjection();
        const zoom = mapManager.map.getZoom();
        const scale = 1 << zoom;
        
        const centerPixel = projection.fromLatLngToPoint(center);
        centerPixel.x *= scale;
        centerPixel.y *= scale;
        
        originalPath.forEach((point, i) => {
            const pixel = projection.fromLatLngToPoint(point);
            pixel.x *= scale;
            pixel.y *= scale;
            
            // Translate to origin
            const x = pixel.x - centerPixel.x;
            const y = pixel.y - centerPixel.y;
            
            // Rotate
            const newX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
            const newY = x * Math.sin(angleRad) + y * Math.cos(angleRad);
            
            // Translate back
            const rotatedPixel = {
                x: (newX + centerPixel.x) / scale,
                y: (newY + centerPixel.y) / scale
            };
            
            const rotatedLatLng = projection.fromPointToLatLng(rotatedPixel);
            path.setAt(i, rotatedLatLng);
        });
    }
    
    /**
     * Updates elements after rotation
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     */
    updateRotatedElements(polygon, pvArea) {
        const elements = polygon.associatedElements;
        if (!elements) return;
        
        const path = polygon.getPath();
        
        // Update corner markers
        if (elements.markers) {
            elements.markers.forEach((marker, i) => {
                if (i < path.getLength()) {
                    marker.setPosition(path.getAt(i));
                }
            });
        }
        
        // Update edge move markers
        if (elements.edgeMoveMarkers) {
            // Top edge
            if (elements.edgeMoveMarkers[0]) {
                const topMid = this.getMidpoint(path.getAt(0), path.getAt(1));
                elements.edgeMoveMarkers[0].setPosition(topMid);
            }
            // Bottom edge
            if (elements.edgeMoveMarkers[1]) {
                const bottomMid = this.getMidpoint(path.getAt(2), path.getAt(3));
                elements.edgeMoveMarkers[1].setPosition(bottomMid);
            }
        }
        
        // Update azimuth arrow
        if (elements.azimuthArrow) {
            this.updateAzimuthArrow(polygon, pvArea, elements);
        }
        
        // Update edge labels
        this.updateEdgeLabels(polygon, pvArea);
    }
    
    /**
     * Updates rotation marker position
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {google.maps.Marker} marker - Rotation marker
     */
    updateRotationMarkerPosition(polygon, marker) {
        const bounds = new google.maps.LatLngBounds();
        const path = polygon.getPath();
        
        path.forEach(p => bounds.extend(p));
        const center = bounds.getCenter();
        const ne = bounds.getNorthEast();
        
        const rotationLat = ne.lat() + (ne.lat() - center.lat()) * 0.3;
        const rotationLng = ne.lng() + (ne.lng() - center.lng()) * 0.3;
        
        marker.setPosition(new google.maps.LatLng(rotationLat, rotationLng));
        
        // Reset rotation
        const icon = marker.getIcon();
        icon.rotation = 0;
        marker.setIcon(icon);
    }
    
    /**
     * Creates azimuth arrow for a polygon
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    createAzimuthArrow(polygon, pvArea, elements) {
        const center = getPolygonCenter(polygon);
        
        const azimuthArrow = new google.maps.Marker({
            position: center,
            map: mapManager.map,
            clickable: false,
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 4,
                fillColor: '#FF5722',
                fillOpacity: 0.8,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                rotation: pvArea.azimuth || 0
            },
            zIndex: CONFIG.ui.zIndex.markers
        });
        
        elements.azimuthArrow = azimuthArrow;
    }
    
    /**
     * Updates azimuth arrow
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    updateAzimuthArrow(polygon, pvArea, elements) {
        if (!elements.azimuthArrow) return;
        
        const center = getPolygonCenter(polygon);
        elements.azimuthArrow.setPosition(center);
        
        const icon = elements.azimuthArrow.getIcon();
        icon.rotation = pvArea.azimuth || 0;
        elements.azimuthArrow.setIcon(icon);
    }
    
    /**
     * Creates edge labels for roof-parallel polygons
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    createEdgeLabels(polygon, pvArea, elements) {
        elements.edgeLabels = [];
        
        const path = polygon.getPath();
        
        // Top edge label
        const topLabel = this.createEdgeLabel(
            path.getAt(0), path.getAt(1), 
            'Oberkante', CONFIG.drawing.edgeColors.top
        );
        elements.edgeLabels.push(topLabel);
        
        // Bottom edge label
        const bottomLabel = this.createEdgeLabel(
            path.getAt(2), path.getAt(3), 
            'Unterkante', CONFIG.drawing.edgeColors.bottom
        );
        elements.edgeLabels.push(bottomLabel);
    }
    
    /**
     * Creates an edge label overlay
     * @private
     * @param {google.maps.LatLng} start - Edge start
     * @param {google.maps.LatLng} end - Edge end
     * @param {string} text - Label text
     * @param {string} color - Label color
     * @returns {google.maps.OverlayView} Label overlay
     */
    createEdgeLabel(start, end, text, color) {
        const overlay = new google.maps.OverlayView();
        
        overlay.onAdd = function() {
            const div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.padding = '2px 6px';
            div.style.backgroundColor = color;
            div.style.color = '#FFFFFF';
            div.style.fontSize = '12px';
            div.style.fontWeight = 'bold';
            div.style.borderRadius = '3px';
            div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            div.style.userSelect = 'none';
            div.style.zIndex = CONFIG.ui.zIndex.labels.toString();
            div.textContent = text;
            
            const panes = this.getPanes();
            panes.floatPane.appendChild(div);
            this.div = div;
        };
        
        overlay.draw = function() {
            const projection = this.getProjection();
            const startPixel = projection.fromLatLngToDivPixel(start);
            const endPixel = projection.fromLatLngToDivPixel(end);
            
            if (this.div) {
                const midX = (startPixel.x + endPixel.x) / 2;
                const midY = (startPixel.y + endPixel.y) / 2;
                
                this.div.style.left = (midX - 30) + 'px';
                this.div.style.top = (midY - 10) + 'px';
            }
        };
        
        overlay.onRemove = function() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
            }
        };
        
        overlay.setMap(mapManager.map);
        return overlay;
    }
    
    /**
     * Updates edge labels positions
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     */
    updateEdgeLabels(polygon, pvArea) {
        const elements = polygon.associatedElements;
        if (!elements || !elements.edgeLabels) return;
        
        // Trigger redraw for all edge labels
        elements.edgeLabels.forEach(label => {
            google.maps.event.trigger(label, 'draw');
        });
    }
    
    /**
     * Gets midpoint between two points
     * @private
     * @param {google.maps.LatLng} p1 - First point
     * @param {google.maps.LatLng} p2 - Second point
     * @returns {google.maps.LatLng} Midpoint
     */
    getMidpoint(p1, p2) {
        const lat = (p1.lat() + p2.lat()) / 2;
        const lng = (p1.lng() + p2.lng()) / 2;
        return new google.maps.LatLng(lat, lng);
    }
    
    /**
     * Enables edit mode
     */
    enableEditMode() {
        this.editMode = true;
        
        // Show midpoint markers for all PV areas
        state.pvAreas.forEach(pvArea => {
            if (!pvArea.locked) {
                this.showMidpointMarkers(pvArea.id);
            }
        });
        
        state.emit('drawing:edit_mode_enabled');
    }
    
    /**
     * Disables edit mode
     */
    disableEditMode() {
        this.editMode = false;
        
        // Hide all midpoint markers
        this.midpointMarkers.forEach((markers, pvId) => {
            markers.forEach(marker => marker.setMap(null));
        });
        this.midpointMarkers.clear();
        
        state.emit('drawing:edit_mode_disabled');
    }
    
    /**
     * Shows midpoint markers for a PV area
     * @private
     * @param {string} pvId - PV area ID
     */
    showMidpointMarkers(pvId) {
        const polygon = pvAreaManager.getPolygon(pvId);
        if (!polygon) return;
        
        const markers = [];
        const path = polygon.getPath();
        
        for (let i = 0; i < path.getLength(); i++) {
            const p1 = path.getAt(i);
            const p2 = path.getAt((i + 1) % path.getLength());
            const midpoint = this.getMidpoint(p1, p2);
            
            const marker = new google.maps.Marker({
                position: midpoint,
                map: mapManager.map,
                draggable: false,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: CONFIG.drawing.markers.midpoint.scale,
                    fillColor: '#FFFFFF',
                    fillOpacity: CONFIG.drawing.markers.midpoint.fillOpacity,
                    strokeColor: '#333333',
                    strokeWeight: CONFIG.drawing.markers.midpoint.strokeWeight
                },
                cursor: 'pointer',
                zIndex: CONFIG.ui.zIndex.midpoints
            });
            
            // Add click listener to insert new point
            google.maps.event.addListener(marker, 'click', () => {
                path.insertAt(i + 1, midpoint);
                this.updateMidpointMarkers(pvId);
            });
            
            markers.push(marker);
        }
        
        this.midpointMarkers.set(pvId, markers);
    }
    
    /**
     * Updates midpoint markers for a PV area
     * @private
     * @param {string} pvId - PV area ID
     */
    updateMidpointMarkers(pvId) {
        // Remove existing markers
        const existingMarkers = this.midpointMarkers.get(pvId);
        if (existingMarkers) {
            existingMarkers.forEach(marker => marker.setMap(null));
        }
        
        // Recreate if in edit mode
        if (this.editMode) {
            this.showMidpointMarkers(pvId);
        }
    }
    
    /**
     * Adds edge drag listeners
     * @private
     * @param {google.maps.Marker} marker - Edge marker
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Array} corners - Corner indices that move together
     */
    addEdgeDragListeners(marker, polygon, pvArea, corners) {
        let dragStartPositions = null;
        
        google.maps.event.addListener(marker, 'dragstart', () => {
            const path = polygon.getPath();
            dragStartPositions = corners.map(i => path.getAt(i));
        });
        
        google.maps.event.addListener(marker, 'drag', (event) => {
            if (!dragStartPositions) return;
            
            const delta = this.calculateDragDelta(
                dragStartPositions[0], event.latLng, marker.edgeDirection
            );
            
            const path = polygon.getPath();
            const elements = polygon.associatedElements;
            
            // Move all corners in the edge
            corners.forEach((cornerIndex, i) => {
                const newPos = this.applyDelta(dragStartPositions[i], delta);
                path.setAt(cornerIndex, newPos);
                
                // Update corner marker
                if (elements && elements.markers[cornerIndex]) {
                    elements.markers[cornerIndex].setPosition(newPos);
                }
            });
            
            // Update edge labels
            this.updateEdgeLabels(polygon, pvArea);
            
            // Update perpendicular distance
            pvArea.perpendicularDistance = calculatePerpendicularDistance(polygon);
            state.emit('pvarea:dimensions_changed', pvArea);
        });
        
        google.maps.event.addListener(marker, 'dragend', () => {
            // Update position to be at midpoint
            const path = polygon.getPath();
            const midpoint = this.getMidpoint(
                path.getAt(corners[0]), 
                path.getAt(corners[1])
            );
            marker.setPosition(midpoint);
            
            // Update PV area data
            pvAreaManager.updatePVAreaCoordinates(pvArea.id);
            
            // Recalculate if needed
            if (pvArea.autoCalculateTilt) {
                pvArea.tilt = calculatePVAreaTilt(polygon);
            }
            
            state.updatePvArea(pvArea.id, pvArea);
        });
    }
    
    /**
     * Calculates drag delta constrained by direction
     * @private
     * @param {google.maps.LatLng} start - Start position
     * @param {google.maps.LatLng} current - Current position
     * @param {string} direction - Constraint direction
     * @returns {Object} Delta object with dx and dy
     */
    calculateDragDelta(start, current, direction) {
        const projection = mapManager.map.getProjection();
        const zoom = mapManager.map.getZoom();
        const scale = 1 << zoom;
        
        const startPixel = projection.fromLatLngToPoint(start);
        const currentPixel = projection.fromLatLngToPoint(current);
        
        startPixel.x *= scale;
        startPixel.y *= scale;
        currentPixel.x *= scale;
        currentPixel.y *= scale;
        
        let dx = currentPixel.x - startPixel.x;
        let dy = currentPixel.y - startPixel.y;
        
        // Apply direction constraint
        if (direction === 'horizontal') {
            dy = 0; // Only allow horizontal movement
        } else if (direction === 'vertical') {
            dx = 0; // Only allow vertical movement
        }
        
        return { dx, dy };
    }
    
    /**
     * Applies delta to a position
     * @private
     * @param {google.maps.LatLng} position - Original position
     * @param {Object} delta - Delta object
     * @returns {google.maps.LatLng} New position
     */
    applyDelta(position, delta) {
        const projection = mapManager.map.getProjection();
        const zoom = mapManager.map.getZoom();
        const scale = 1 << zoom;
        
        const pixel = projection.fromLatLngToPoint(position);
        pixel.x *= scale;
        pixel.y *= scale;
        
        pixel.x += delta.dx;
        pixel.y += delta.dy;
        
        pixel.x /= scale;
        pixel.y /= scale;
        
        return projection.fromPointToLatLng(pixel);
    }
    
    /**
     * Gets corner color based on index
     * @private
     * @param {number} index - Corner index
     * @returns {string} Color hex code
     */
    getCornerColor(index) {
        if (index === 0 || index === 1) {
            return CONFIG.drawing.edgeColors.top;
        } else {
            return CONFIG.drawing.edgeColors.bottom;
        }
    }
    
    /**
     * Starts the special roof-parallel drawing mode (3-click parallelogram)
     */
    startRoofParallelDrawing() {
        mapManager.drawingManager.setDrawingMode(null);
        const points = [];
        let tempMarkers = [];
        let tempPolyline = null;
        let tempPolygon = null;
        let tempPolyline2 = null;
        
        // Set cursor and disable other interactions
        mapManager.map.setOptions({ 
            draggableCursor: 'crosshair',
            draggingCursor: 'crosshair',
            disableDoubleClickZoom: true
        });
        
        // Click listener with high priority
        const clickListener = google.maps.event.addListenerOnce(mapManager.map, 'click', function handler(e) {
            // Prevent any conflicts
            if (e.stop) e.stop();
            
            points.push(e.latLng);
            
            // Add numbered marker at click point
            const marker = new google.maps.Marker({
                position: e.latLng,
                map: mapManager.map,
                label: {
                    text: points.length.toString(),
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 4,
                    fillColor: '#FFFFFF',
                    fillOpacity: 1,
                    strokeColor: '#000000',
                    strokeWeight: 2,
                    labelOrigin: new google.maps.Point(0, -4)
                },
                clickable: false,
                zIndex: 1000
            });
            tempMarkers.push(marker);
            
            if (points.length === 1) {
                // Re-register for next click
                google.maps.event.addListenerOnce(mapManager.map, 'click', handler);
            } else if (points.length === 2) {
                // Draw line between first two points in turquoise
                if (tempPolyline) tempPolyline.setMap(null);
                tempPolyline = new google.maps.Polyline({
                    path: points,
                    strokeColor: '#00CED1',  // Turquoise
                    strokeWeight: 4,  // Thicker line
                    map: mapManager.map,
                    clickable: false,
                    zIndex: 999
                });
                // Re-register for final click
                google.maps.event.addListenerOnce(mapManager.map, 'click', handler);
            } else if (points.length === 3) {
                // Complete parallelogram immediately
                google.maps.event.removeListener(moveListener);
                mapManager.map.setOptions({ 
                    draggableCursor: null,
                    draggingCursor: null,
                    disableDoubleClickZoom: false
                });
                
                // Clean up temporary elements (but keep markers for a moment)
                if (tempPolyline) tempPolyline.setMap(null);
                if (tempPolygon) tempPolygon.setMap(null);
                if (tempPolyline2) {
                    tempPolyline2.setMap(null);
                }
                
                // Create final parallelogram
                const parallelogramPoints = drawingManager.calculateParallelogram(points[0], points[1], points[2]);
                
                // Add marker for 4th point
                const p4 = parallelogramPoints[3]; // 4th point in the array
                const marker4 = new google.maps.Marker({
                    position: p4,
                    map: mapManager.map,
                    label: {
                        text: '4',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: '#FFFFFF',
                        fillOpacity: 1,
                        strokeColor: '#000000',
                        strokeWeight: 2,
                        labelOrigin: new google.maps.Point(0, -4)
                    },
                    clickable: false,
                    zIndex: 1000
                });
                tempMarkers.push(marker4);
                
                // Remove temporary markers after a short delay
                setTimeout(() => {
                    tempMarkers.forEach(m => m.setMap(null));
                }, 500);
                
                // Emit polygon complete event
                const coordinates = parallelogramPoints.map(latLng => ({
                    lat: latLng.lat(),
                    lng: latLng.lng()
                }));
                
                state.emit('map:polygon_complete', {
                    path: coordinates,
                    type: 'roof-parallel'
                });
                
                // Clean up ESC handler
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        // Mouse move listener for preview
        const moveListener = google.maps.event.addListener(mapManager.map, 'mousemove', function(e) {
            if (points.length === 1) {
                // Preview line in turquoise
                if (tempPolyline) tempPolyline.setMap(null);
                tempPolyline = new google.maps.Polyline({
                    path: [points[0], e.latLng],
                    strokeColor: '#00CED1',  // Turquoise
                    strokeWeight: 4,  // Thicker line
                    strokeOpacity: 0.6,
                    map: mapManager.map,
                    clickable: false,
                    zIndex: 998
                });
            } else if (points.length === 2) {
                // Preview parallelogram with mouse at point 3 (opposite corner from p2)
                if (tempPolygon) tempPolygon.setMap(null);
                // Don't remove tempPolyline here - we want to keep the turquoise line visible!
                
                // Calculate the preview parallelogram
                const previewPoints = drawingManager.calculateParallelogram(points[0], points[1], e.latLng);
                
                // Create parallelogram preview without stroke
                tempPolygon = new google.maps.Polygon({
                    paths: previewPoints,
                    fillColor: '#4274a5',
                    fillOpacity: 0.2,
                    strokeWeight: 0,  // No stroke to not interfere with colored lines
                    map: mapManager.map,
                    clickable: false,
                    zIndex: 996
                });
                
                // Add preview of the orange line P3-P4
                if (tempPolyline2) tempPolyline2.setMap(null);
                tempPolyline2 = new google.maps.Polyline({
                    path: [previewPoints[2], previewPoints[3]],  // P3-P4
                    strokeColor: '#FF8C00',  // Orange
                    strokeWeight: 4,
                    strokeOpacity: 0.6,
                    map: mapManager.map,
                    clickable: false,
                    zIndex: 998
                });
            }
        });
        
        // ESC to cancel
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                google.maps.event.removeListener(clickListener);
                google.maps.event.removeListener(moveListener);
                document.removeEventListener('keydown', escHandler);
                mapManager.map.setOptions({ 
                    draggableCursor: null,
                    draggingCursor: null,
                    disableDoubleClickZoom: false
                });
                
                // Clean up
                tempMarkers.forEach(m => m.setMap(null));
                if (tempPolyline) tempPolyline.setMap(null);
                if (tempPolygon) tempPolygon.setMap(null);
                if (tempPolyline2) {
                    tempPolyline2.setMap(null);
                }
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * Calculate parallelogram from 3 points
     * p1-p2 is the first edge, p3 is the opposite corner from p2
     * @param {google.maps.LatLng} p1 - First point
     * @param {google.maps.LatLng} p2 - Second point
     * @param {google.maps.LatLng} p3 - Third point
     * @returns {Array<google.maps.LatLng>} Parallelogram points
     */
    calculateParallelogram(p1, p2, p3) {
        // Vector from p2 to p3 (diagonal)
        const v23 = {
            lat: p3.lat() - p2.lat(),
            lng: p3.lng() - p2.lng()
        };
        
        // Fourth point: p1 + vector(p2 to p3)
        // This creates point 4 by adding the diagonal vector to p1
        const p4 = new google.maps.LatLng(
            p1.lat() + v23.lat,
            p1.lng() + v23.lng
        );
        
        // This creates a proper parallelogram
        return [p1, p2, p3, p4];
    }
    
    /**
     * Handles click during roof-parallel drawing
     * @private
     * @param {google.maps.LatLng} latLng - Click location
     */
    handleRoofParallelClick(latLng) {
        console.log('Roof-parallel click at:', latLng.lat(), latLng.lng());
        const state = this.roofParallelState;
        
        if (state.points.length < 2) {
            // Add point
            state.points.push(latLng);
            
            // Create numbered marker (white with black border like original)
            const marker = new google.maps.Marker({
                position: latLng,
                map: mapManager.map,
                label: {
                    text: (state.points.length).toString(),
                    color: 'black',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: 'white',
                    fillOpacity: 1.0,
                    strokeColor: 'black',
                    strokeWeight: 2
                },
                zIndex: 1000
            });
            state.markers.push(marker);
            
            if (state.points.length === 2) {
                // Create turquoise line between P1 and P2
                state.polyline = new google.maps.Polyline({
                    path: state.points,
                    strokeColor: CONFIG.drawing.edgeColors.top || '#00CED1',
                    strokeWeight: 4,
                    strokeOpacity: 1.0,
                    map: mapManager.map
                });
                
                // Add mouse move listener for preview
                state.mouseMoveListener = mapManager.map.addListener('mousemove', (e) => {
                    this.updateRoofParallelPreview(e.latLng);
                });
            }
        } else if (state.points.length === 2) {
            // Third click - create parallelogram
            const p1 = state.points[0];
            const p2 = state.points[1];
            const p3 = latLng;
            
            // Calculate p4 to make a parallelogram: p4 = p1 + (p3 - p2)
            const p4 = new google.maps.LatLng(
                p1.lat() + (p3.lat() - p2.lat()),
                p1.lng() + (p3.lng() - p2.lng())
            );
            
            // Add markers for P3 and P4 (white with black border)
            const marker3 = new google.maps.Marker({
                position: p3,
                map: mapManager.map,
                label: {
                    text: '3',
                    color: 'black',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: 'white',
                    fillOpacity: 1.0,
                    strokeColor: 'black',
                    strokeWeight: 2
                },
                zIndex: 1000
            });
            
            const marker4 = new google.maps.Marker({
                position: p4,
                map: mapManager.map,
                label: {
                    text: '4',
                    color: 'black',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: 'white',
                    fillOpacity: 1.0,
                    strokeColor: 'black',
                    strokeWeight: 2
                },
                zIndex: 1000
            });
            
            state.markers.push(marker3, marker4);
            
            // Remove markers after a short delay
            setTimeout(() => {
                state.markers.forEach(marker => marker.setMap(null));
            }, 500);
            
            // Create final polygon
            const path = [p1, p2, p3, p4];
            this.completeRoofParallelDrawing(path);
        }
    }
    
    /**
     * Updates preview during roof-parallel drawing
     * @private
     * @param {google.maps.LatLng} mousePos - Mouse position
     */
    updateRoofParallelPreview(mousePos) {
        const state = this.roofParallelState;
        if (state.points.length !== 2) return;
        
        const p1 = state.points[0];
        const p2 = state.points[1];
        const p3 = mousePos;
        
        // Calculate p4
        const p4 = new google.maps.LatLng(
            p1.lat() + (p3.lat() - p2.lat()),
            p1.lng() + (p3.lng() - p2.lng())
        );
        
        // Update or create orange preview line (P3-P4)
        if (state.previewLine) {
            state.previewLine.setPath([p3, p4]);
        } else {
            state.previewLine = new google.maps.Polyline({
                path: [p3, p4],
                strokeColor: CONFIG.drawing.edgeColors.bottom || '#FF8C00',
                strokeWeight: 4,
                strokeOpacity: 1.0,
                map: mapManager.map
            });
        }
        
        // Update or create preview polygon
        if (state.polygon) {
            state.polygon.setPath([p1, p2, p3, p4]);
        } else {
            state.polygon = new google.maps.Polygon({
                path: [p1, p2, p3, p4],
                fillColor: CONFIG.pvArea.types['roof-parallel'].color,
                fillOpacity: 0.3,
                strokeColor: CONFIG.pvArea.types['roof-parallel'].color,
                strokeWeight: 2,
                strokeOpacity: 0.8,
                map: mapManager.map
            });
        }
    }
    
    /**
     * Completes roof-parallel drawing
     * @private
     * @param {Array<google.maps.LatLng>} path - Polygon path
     */
    completeRoofParallelDrawing(path) {
        // Clean up drawing state
        this.cleanupRoofParallelDrawing();
        
        // Convert path to coordinates
        const coordinates = path.map(latLng => ({
            lat: latLng.lat(),
            lng: latLng.lng()
        }));
        
        // Emit polygon complete event
        state.emit('map:polygon_complete', {
            path: coordinates,
            type: 'roof-parallel'
        });
    }
    
    /**
     * Cancels roof-parallel drawing
     */
    cancelRoofParallelDrawing() {
        // Remove rectangle complete listener if it exists
        if (this.rectangleCompleteListener) {
            google.maps.event.removeListener(this.rectangleCompleteListener);
            this.rectangleCompleteListener = null;
        }
        
        // Disable drawing mode
        mapManager.setDrawingMode(null);
        
        this.cleanupRoofParallelDrawing();
        
        // Reset mode
        state.setMode({ tool: 'view' });
    }
    
    /**
     * Cleans up roof-parallel drawing state
     * @private
     */
    cleanupRoofParallelDrawing() {
        const drawState = this.roofParallelState;
        if (!drawState) return;
        
        // Remove ESC listener
        if (drawState.escListener) {
            document.removeEventListener('keydown', drawState.escListener);
        }
        
        // Clear state
        this.roofParallelState = null;
    }
    
    /**
     * Creates azimuth arrow for a polygon
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    createAzimuthArrow(polygon, pvArea, elements) {
        const path = polygon.getPath();
        
        // Calculate center of top edge
        const topCenter = this.getMidpoint(path.getAt(0), path.getAt(1));
        
        // Calculate arrow direction based on azimuth
        const azimuthRad = (pvArea.azimuth - 90) * Math.PI / 180; // -90 because 0° is North
        const arrowLength = 0.0002; // Adjust based on zoom
        
        const arrowEnd = new google.maps.LatLng(
            topCenter.lat() + arrowLength * Math.sin(azimuthRad),
            topCenter.lng() + arrowLength * Math.cos(azimuthRad)
        );
        
        // Create arrow polyline
        const arrow = new google.maps.Polyline({
            path: [topCenter, arrowEnd],
            strokeColor: '#4CAF50',
            strokeWeight: 3,
            strokeOpacity: 1,
            map: mapManager.map,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    strokeColor: '#4CAF50',
                    strokeWeight: 2,
                    fillColor: '#4CAF50',
                    fillOpacity: 1
                },
                offset: '100%'
            }],
            zIndex: CONFIG.ui.zIndex.markers - 1
        });
        
        elements.azimuthArrow = arrow;
    }
    
    /**
     * Updates azimuth arrow position and direction
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    updateAzimuthArrow(polygon, pvArea, elements) {
        if (!elements.azimuthArrow) return;
        
        const path = polygon.getPath();
        const topCenter = this.getMidpoint(path.getAt(0), path.getAt(1));
        
        const azimuthRad = (pvArea.azimuth - 90) * Math.PI / 180;
        const arrowLength = 0.0002;
        
        const arrowEnd = new google.maps.LatLng(
            topCenter.lat() + arrowLength * Math.sin(azimuthRad),
            topCenter.lng() + arrowLength * Math.cos(azimuthRad)
        );
        
        elements.azimuthArrow.setPath([topCenter, arrowEnd]);
    }
    
    /**
     * Creates edge labels for a polygon
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object
     */
    createEdgeLabels(polygon, pvArea, elements) {
        elements.edgeLabels = [];
        
        if (pvArea.type !== 'roof-parallel') return;
        
        // Create overlays for perpendicular distance display
        const path = polygon.getPath();
        
        // Label for perpendicular distance
        const leftMid = this.getMidpoint(path.getAt(0), path.getAt(3));
        const rightMid = this.getMidpoint(path.getAt(1), path.getAt(2));
        
        [leftMid, rightMid].forEach(position => {
            const overlay = new google.maps.OverlayView();
            
            overlay.onAdd = function() {
                const div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.backgroundColor = 'white';
                div.style.border = '2px solid black';
                div.style.borderRadius = '3px';
                div.style.padding = '2px 5px';
                div.style.fontSize = '12px';
                div.style.fontWeight = 'bold';
                div.style.zIndex = CONFIG.ui.zIndex.labels.toString();
                div.textContent = `${(pvArea.perpendicularDistance || 0).toFixed(1)}m`;
                
                const panes = this.getPanes();
                panes.floatPane.appendChild(div);
                this.div = div;
            };
            
            overlay.draw = function() {
                const projection = this.getProjection();
                const pos = projection.fromLatLngToDivPixel(position);
                
                if (this.div) {
                    this.div.style.left = (pos.x - 20) + 'px';
                    this.div.style.top = (pos.y - 10) + 'px';
                }
            };
            
            overlay.onRemove = function() {
                if (this.div) {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            };
            
            overlay.setMap(mapManager.map);
            elements.edgeLabels.push(overlay);
        });
    }
    
    /**
     * Updates edge labels
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     */
    updateEdgeLabels(polygon, pvArea) {
        const elements = polygon.associatedElements;
        if (!elements || !elements.edgeLabels) return;
        
        // Update perpendicular distance display
        elements.edgeLabels.forEach(overlay => {
            if (overlay.div) {
                overlay.div.textContent = `${(pvArea.perpendicularDistance || 0).toFixed(1)}m`;
            }
        });
    }
}

// Create global drawing manager instance
const drawingManager = new DrawingManager();

// Make it globally accessible
window.drawingManager = drawingManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = drawingManager;
}