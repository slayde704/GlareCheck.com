/**
 * @fileoverview PV Area management and manipulation
 * @module pv-areas
 * @requires config
 * @requires state
 * @requires utils
 * @requires calculations
 * @requires map
 */

/**
 * PV Area Manager class
 * Handles creation, modification, and deletion of PV areas
 */
class PVAreaManager {
    constructor() {
        /**
         * @type {Map<string, google.maps.Polygon>} Map of PV ID to polygon instance
         */
        this.polygons = new Map();
        
        /**
         * @type {Map<string, Object>} Map of PV ID to associated elements
         */
        this.elements = new Map();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Sets up event listeners for state changes
     * @private
     */
    setupEventListeners() {
        // Listen for map polygon complete events
        state.on('map:polygon_complete', (data) => {
            this.createPVArea(data);
        });
        
        // Listen for PV area removal
        state.on('pvarea:removed', (pvArea) => {
            this.removePVAreaFromMap(pvArea.id);
        });
        
        // Listen for mode changes
        state.on('mode:changed', (data) => {
            console.log('PV Area Manager: Mode changed to', data.new);
            if (data.new.tool === 'draw-pv') {
                this.startDrawing(data.new.pvType);
            }
        });
    }
    
    /**
     * Creates a new PV area from polygon data
     * @param {Object} data - Polygon data with path and type
     * @returns {Object} Created PV area object
     */
    createPVArea(data) {
        // Generate unique ID
        const id = generateId('pv');
        
        // Get PV type configuration
        const typeConfig = CONFIG.pvArea.types[data.type];
        
        // Create PV area object
        const pvArea = {
            id: id,
            type: data.type,
            name: '',
            coordinates: data.path,
            locked: false,
            visible: true,
            // Parameters with defaults
            azimuth: CONFIG.pvArea.defaults.azimuth,
            tilt: CONFIG.pvArea.defaults.tilt,
            crossTilt: CONFIG.pvArea.defaults.crossTilt,
            moduleType: CONFIG.pvArea.defaults.moduleType,
            // Auto-calculate flags
            autoCalculateAzimuth: CONFIG.pvArea.defaults.autoCalculateAzimuth,
            autoCalculateTilt: CONFIG.pvArea.defaults.autoCalculateTilt,
            autoCalculateField: CONFIG.pvArea.defaults.autoCalculateField,
            // Type-specific properties
            ...(data.type === 'roof-parallel' ? {
                topHeight: 10,
                bottomHeight: 0,
                perpendicularDistance: 0
            } : {
                cornerHeights: [],
                referenceGroundHeight: 0,
                autoCalculateReference: true
            }),
            // Metadata
            createdAt: new Date(),
            modifiedAt: new Date()
        };
        
        // Create polygon on map
        const polygon = this.createPolygonOnMap(pvArea);
        
        // Calculate initial values if auto-calculate is enabled
        if (pvArea.type === 'roof-parallel') {
            pvArea.perpendicularDistance = calculatePerpendicularDistance(polygon);
            if (pvArea.autoCalculateAzimuth) {
                pvArea.azimuth = calculatePVAreaAzimuth(polygon);
            }
            if (pvArea.autoCalculateTilt) {
                pvArea.tilt = calculatePVAreaTilt(polygon);
            }
        } else {
            if (pvArea.autoCalculateAzimuth) {
                pvArea.azimuth = calculatePVAreaAzimuth(polygon);
            }
        }
        
        // Add to state
        state.addPvArea(pvArea);
        
        return pvArea;
    }
    
    /**
     * Creates a polygon on the map for a PV area
     * @param {Object} pvArea - PV area object
     * @returns {google.maps.Polygon} Created polygon
     */
    createPolygonOnMap(pvArea) {
        // Get type configuration
        const typeConfig = CONFIG.pvArea.types[pvArea.type];
        
        // Convert coordinates to LatLng
        const path = pvArea.coordinates.map(coord => 
            new google.maps.LatLng(coord.lat, coord.lng)
        );
        
        // Create polygon
        const polygon = new google.maps.Polygon({
            paths: path,
            fillColor: typeConfig.color,
            fillOpacity: CONFIG.drawing.polygon.fillOpacity,
            strokeColor: typeConfig.color,
            strokeWeight: CONFIG.drawing.polygon.strokeWeight,
            strokeOpacity: 1.0,
            editable: false, // We use custom editing
            draggable: !pvArea.locked,
            zIndex: CONFIG.ui.zIndex.polygon
        });
        
        // Store reference to PV area data
        polygon.pvAreaData = pvArea;
        
        // Add to map
        polygon.setMap(mapManager.map);
        
        // Store polygon reference
        this.polygons.set(pvArea.id, polygon);
        
        // Set up polygon event listeners
        this.setupPolygonListeners(polygon, pvArea);
        
        // Create associated elements (markers, labels, etc.)
        const associatedElements = this.createAssociatedElements(polygon, pvArea);
        polygon.associatedElements = associatedElements;
        this.elements.set(pvArea.id, associatedElements);
        
        // Apply enhanced editing features based on type
        if (pvArea.type === 'roof-parallel') {
            // Roof-parallel areas should NOT use standard Google Maps editing
            polygon.setOptions({ editable: false });
            // Apply special roof-parallel features (colored edges, special markers, etc.)
            console.log('Setting up roof-parallel polygon for:', pvArea.id);
            drawingManager.setupRoofParallelPolygon(pvArea);
        } else {
            // For other types, enable standard editing
            polygon.setOptions({ editable: true });
        }
        
        // Mark as new for UI expansion
        pvArea.isNew = true;
        
        return polygon;
    }
    
    /**
     * Sets up event listeners for a polygon
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     */
    setupPolygonListeners(polygon, pvArea) {
        // Drag events
        google.maps.event.addListener(polygon, 'dragstart', () => {
            state.emit('pvarea:dragstart', pvArea);
        });
        
        google.maps.event.addListener(polygon, 'drag', () => {
            if (polygon.associatedElements) {
                this.updateAssociatedElements(polygon, pvArea);
            }
        });
        
        google.maps.event.addListener(polygon, 'dragend', () => {
            this.updatePVAreaCoordinates(pvArea.id);
            state.emit('pvarea:dragend', pvArea);
        });
        
        // Path change events
        const path = polygon.getPath();
        
        google.maps.event.addListener(path, 'insert_at', () => {
            this.handlePathChange(pvArea.id, 'insert');
        });
        
        google.maps.event.addListener(path, 'remove_at', () => {
            this.handlePathChange(pvArea.id, 'remove');
        });
        
        google.maps.event.addListener(path, 'set_at', () => {
            this.handlePathChange(pvArea.id, 'set');
        });
        
        // Click event
        google.maps.event.addListener(polygon, 'click', (event) => {
            this.handlePolygonClick(pvArea.id, event);
        });
        
        // Right-click for context menu
        google.maps.event.addListener(polygon, 'rightclick', (event) => {
            state.emit('pvarea:rightclick', { pvArea, event });
        });
    }
    
    /**
     * Creates associated elements for a PV area (markers, labels, etc.)
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @returns {Object} Associated elements
     */
    createAssociatedElements(polygon, pvArea) {
        const elements = {
            markers: [],
            midpointMarkers: [],
            edgeMoveMarkers: [],
            rotationMarker: null,
            azimuthArrow: null,
            lockMarker: null,
            cornerOverlays: []
        };
        
        // Create elements based on PV type and state
        if (!pvArea.locked) {
            if (pvArea.type === 'roof-parallel') {
                // Roof-parallel specific elements will be created by drawing module
            } else {
                // Create corner number overlays for other types
                this.createCornerNumberOverlays(polygon, pvArea, elements);
            }
        }
        
        return elements;
    }
    
    /**
     * Creates corner number overlays
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     * @param {Object} elements - Elements object to populate
     */
    createCornerNumberOverlays(polygon, pvArea, elements) {
        const path = polygon.getPath();
        
        path.forEach((latLng, i) => {
            const overlay = new google.maps.OverlayView();
            
            overlay.onAdd = function() {
                const div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.cursor = 'default';
                div.style.userSelect = 'none';
                div.style.fontSize = '14px';
                div.style.fontWeight = 'bold';
                div.style.color = '#FFFFFF';
                div.style.textShadow = '1px 1px 1px rgba(0,0,0,0.8), -1px -1px 1px rgba(0,0,0,0.8)';
                div.style.zIndex = CONFIG.ui.zIndex.overlay.toString();
                div.textContent = (i + 1).toString();
                
                const panes = this.getPanes();
                panes.floatPane.appendChild(div);
                this.div = div;
            };
            
            overlay.draw = function() {
                const projection = this.getProjection();
                const position = projection.fromLatLngToDivPixel(latLng);
                
                if (this.div) {
                    this.div.style.left = position.x + 'px';
                    this.div.style.top = (position.y - 16) + 'px';
                }
            };
            
            overlay.onRemove = function() {
                if (this.div) {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            };
            
            overlay.setMap(mapManager.map);
            elements.cornerOverlays.push(overlay);
        });
        
        // Store reference for updates
        pvArea.cornerMarkers = elements.cornerOverlays;
    }
    
    /**
     * Updates associated elements positions
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} pvArea - PV area object
     */
    updateAssociatedElements(polygon, pvArea) {
        const elements = polygon.associatedElements;
        if (!elements) return;
        
        // Update corner overlays
        if (elements.cornerOverlays) {
            const path = polygon.getPath();
            elements.cornerOverlays.forEach((overlay, i) => {
                if (i < path.getLength()) {
                    google.maps.event.trigger(overlay, 'draw');
                }
            });
        }
        
        // Emit update event for other modules
        state.emit('pvarea:elements_update', { pvArea, elements });
    }
    
    /**
     * Handles polygon path changes
     * @private
     * @param {string} pvId - PV area ID
     * @param {string} changeType - Type of change (insert, remove, set)
     */
    handlePathChange(pvId, changeType) {
        const pvArea = state.getPvArea(pvId);
        if (!pvArea) return;
        
        // Update coordinates
        this.updatePVAreaCoordinates(pvId);
        
        // Update corner markers if needed
        if (changeType === 'insert' || changeType === 'remove') {
            this.updateCornerMarkers(pvId);
            
            // Update dimensions if shown
            if (pvArea.showDimensions && window.Dimensions) {
                window.Dimensions.update(pvArea);
            }
        }
        
        // Recalculate values if auto-calculate is enabled
        const polygon = this.polygons.get(pvId);
        if (polygon) {
            if (pvArea.autoCalculateAzimuth) {
                pvArea.azimuth = calculatePVAreaAzimuth(polygon);
            }
            if (pvArea.type === 'roof-parallel' && pvArea.autoCalculateTilt) {
                pvArea.perpendicularDistance = calculatePerpendicularDistance(polygon);
                pvArea.tilt = calculatePVAreaTilt(polygon);
            }
        }
        
        // Update state
        state.updatePvArea(pvId, pvArea);
        
        // Emit change event
        state.emit('pvarea:path_changed', { pvArea, changeType });
    }
    
    /**
     * Updates PV area coordinates from polygon
     * @private
     * @param {string} pvId - PV area ID
     */
    updatePVAreaCoordinates(pvId) {
        const pvArea = state.getPvArea(pvId);
        const polygon = this.polygons.get(pvId);
        
        if (!pvArea || !polygon) return;
        
        // Get updated coordinates
        const path = polygon.getPath();
        const coordinates = [];
        
        path.forEach(latLng => {
            coordinates.push({
                lat: latLng.lat(),
                lng: latLng.lng()
            });
        });
        
        // Update PV area
        pvArea.coordinates = coordinates;
        pvArea.modifiedAt = new Date();
    }
    
    /**
     * Updates corner markers for a PV area
     * @private
     * @param {string} pvId - PV area ID
     */
    updateCornerMarkers(pvId) {
        const pvArea = state.getPvArea(pvId);
        const polygon = this.polygons.get(pvId);
        const elements = this.elements.get(pvId);
        
        if (!pvArea || !polygon || !elements) return;
        
        // Remove existing corner overlays
        if (elements.cornerOverlays) {
            elements.cornerOverlays.forEach(overlay => overlay.setMap(null));
            elements.cornerOverlays = [];
        }
        
        // Recreate if not locked and not roof-parallel
        if (!pvArea.locked && pvArea.type !== 'roof-parallel') {
            this.createCornerNumberOverlays(polygon, pvArea, elements);
        }
        
        // Emit update event
        state.emit('pvarea:corners_updated', pvArea);
    }
    
    /**
     * Handles polygon click
     * @private
     * @param {string} pvId - PV area ID
     * @param {Object} event - Click event
     */
    handlePolygonClick(pvId, event) {
        const pvArea = state.getPvArea(pvId);
        if (!pvArea) return;
        
        // Highlight effect
        const polygon = this.polygons.get(pvId);
        if (polygon) {
            const originalOpacity = polygon.get('fillOpacity');
            polygon.setOptions({ fillOpacity: 0.6, strokeWeight: 3 });
            
            setTimeout(() => {
                polygon.setOptions({ 
                    fillOpacity: originalOpacity, 
                    strokeWeight: CONFIG.drawing.polygon.strokeWeight 
                });
            }, CONFIG.ui.animations.highlightDuration);
        }
        
        // Update selected state
        state.updateUI({ selectedPvAreaId: pvId });
        
        // Emit click event
        state.emit('pvarea:click', { pvArea, event });
    }
    
    /**
     * Toggles lock state of a PV area
     * @param {string} pvId - PV area ID
     */
    toggleLock(pvId) {
        const pvArea = state.getPvArea(pvId);
        const polygon = this.polygons.get(pvId);
        const elements = this.elements.get(pvId);
        
        if (!pvArea || !polygon) return;
        
        // Toggle lock state
        pvArea.locked = !pvArea.locked;
        
        // Update polygon
        polygon.setDraggable(!pvArea.locked);
        polygon.setEditable(false); // Always false, we use custom editing
        
        if (pvArea.locked) {
            // Hide all editing elements
            this.hideEditingElements(elements);
            
            // Hide corner overlays
            if (pvArea.cornerMarkers) {
                pvArea.cornerMarkers.forEach(overlay => overlay.setMap(null));
            }
            
            // Create lock marker
            this.createLockMarker(polygon, elements);
            
        } else {
            // Show editing elements
            this.showEditingElements(elements);
            
            // Show corner overlays
            if (pvArea.cornerMarkers) {
                pvArea.cornerMarkers.forEach(overlay => overlay.setMap(mapManager.map));
            } else if (pvArea.type !== 'roof-parallel') {
                this.updateCornerMarkers(pvId);
            }
            
            // Remove lock marker
            if (elements.lockMarker) {
                elements.lockMarker.setMap(null);
                elements.lockMarker = null;
            }
        }
        
        // Update state
        state.updatePvArea(pvId, { locked: pvArea.locked });
        
        // Emit event
        state.emit('pvarea:lock_toggled', pvArea);
    }
    
    /**
     * Creates a lock marker in the center of a polygon
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} elements - Elements object
     */
    createLockMarker(polygon, elements) {
        const bounds = new google.maps.LatLngBounds();
        const path = polygon.getPath();
        
        path.forEach(latLng => bounds.extend(latLng));
        const center = bounds.getCenter();
        
        const lockMarker = new google.maps.Marker({
            position: center,
            map: mapManager.map,
            icon: {
                path: 'M 5 8 V 7 A 5 5 0 0 1 15 7 V 8 M 7 8 L 7 8 A 3 3 0 0 0 7 14 L 13 14 A 3 3 0 0 0 13 8 L 7 8 M 10 10 V 12',
                scale: 1.5,
                fillColor: '#FFC107',
                fillOpacity: 1,
                strokeColor: '#F57C00',
                strokeWeight: 2,
                anchor: new google.maps.Point(10, 11)
            },
            clickable: false,
            zIndex: CONFIG.ui.zIndex.lockIcon
        });
        
        elements.lockMarker = lockMarker;
    }
    
    /**
     * Hides all editing elements
     * @private
     * @param {Object} elements - Elements object
     */
    hideEditingElements(elements) {
        if (!elements) return;
        
        // Hide all markers and overlays
        ['markers', 'midpointMarkers', 'edgeMoveMarkers'].forEach(key => {
            if (elements[key]) {
                elements[key].forEach(marker => marker.setVisible(false));
            }
        });
        
        if (elements.rotationMarker) {
            elements.rotationMarker.setVisible(false);
        }
        
        if (elements.azimuthArrow) {
            elements.azimuthArrow.setVisible(false);
        }
    }
    
    /**
     * Shows all editing elements
     * @private
     * @param {Object} elements - Elements object
     */
    showEditingElements(elements) {
        if (!elements) return;
        
        // Show all markers and overlays
        ['markers', 'midpointMarkers', 'edgeMoveMarkers'].forEach(key => {
            if (elements[key]) {
                elements[key].forEach(marker => marker.setVisible(true));
            }
        });
        
        if (elements.rotationMarker) {
            elements.rotationMarker.setVisible(true);
        }
        
        if (elements.azimuthArrow) {
            elements.azimuthArrow.setVisible(true);
        }
    }
    
    /**
     * Removes a PV area from the map
     * @param {string} pvId - PV area ID
     */
    removePVAreaFromMap(pvId) {
        // Remove polygon
        const polygon = this.polygons.get(pvId);
        if (polygon) {
            polygon.setMap(null);
            this.polygons.delete(pvId);
        }
        
        // Remove all associated elements
        const elements = this.elements.get(pvId);
        if (elements) {
            // Remove all markers
            Object.values(elements).forEach(element => {
                if (Array.isArray(element)) {
                    element.forEach(item => {
                        if (item && item.setMap) item.setMap(null);
                    });
                } else if (element && element.setMap) {
                    element.setMap(null);
                }
            });
            
            this.elements.delete(pvId);
        }
        
        // Remove corner overlays if any
        const pvArea = state.getPvArea(pvId);
        if (pvArea && pvArea.cornerMarkers) {
            pvArea.cornerMarkers.forEach(overlay => overlay.setMap(null));
        }
    }
    
    /**
     * Starts drawing a new PV area
     * @param {string} pvType - PV type to draw
     */
    startDrawing(pvType) {
        console.log('PV Area Manager: Starting drawing for type:', pvType);
        const typeConfig = CONFIG.pvArea.types[pvType];
        
        if (pvType === 'roof-parallel') {
            // Use special drawing mode for roof-parallel
            console.log('Calling drawingManager.startRoofParallelDrawing()');
            drawingManager.startRoofParallelDrawing();
        } else {
            // Update drawing manager options for standard polygon
            mapManager.updatePolygonOptions({
                fillColor: typeConfig.color,
                strokeColor: typeConfig.color
            });
            
            // Set drawing mode
            mapManager.setDrawingMode('polygon');
        }
    }
    
    /**
     * Updates PV area display from state
     * @param {string} pvId - PV area ID
     */
    updatePVAreaDisplay(pvId) {
        const pvArea = state.getPvArea(pvId);
        const polygon = this.polygons.get(pvId);
        
        if (!pvArea || !polygon) return;
        
        // Update polygon visibility
        polygon.setVisible(pvArea.visible);
        
        // Update color if type changed
        const typeConfig = CONFIG.pvArea.types[pvArea.type];
        polygon.setOptions({
            fillColor: typeConfig.color,
            strokeColor: typeConfig.color
        });
        
        // Update draggable state
        polygon.setDraggable(!pvArea.locked);
    }
    
    /**
     * Gets all polygons
     * @returns {Array<google.maps.Polygon>}
     */
    getAllPolygons() {
        return Array.from(this.polygons.values());
    }
    
    /**
     * Gets polygon for a PV area
     * @param {string} pvId - PV area ID
     * @returns {google.maps.Polygon|null}
     */
    getPolygon(pvId) {
        return this.polygons.get(pvId) || null;
    }
}

// Create global PV area manager instance
const pvAreaManager = new PVAreaManager();

// Make it globally accessible
window.pvAreaManager = pvAreaManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = pvAreaManager;
}