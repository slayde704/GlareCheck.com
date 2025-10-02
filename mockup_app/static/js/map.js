/**
 * @fileoverview Google Maps initialization and management
 * @module map
 * @requires config
 * @requires state
 * @requires utils
 */

/**
 * Map Manager class
 * Handles Google Maps initialization, drawing tools, and map events
 */
class MapManager {
    constructor() {
        /**
         * @type {google.maps.Map} Google Maps instance
         */
        this.map = null;
        
        /**
         * @type {google.maps.drawing.DrawingManager} Drawing manager instance
         */
        this.drawingManager = null;
        
        /**
         * @type {google.maps.InfoWindow} Info window for tooltips
         */
        this.infoWindow = null;
        
        /**
         * @type {boolean} Map initialization status
         */
        this.isInitialized = false;
        
        /**
         * @type {Object} Map event listeners
         */
        this.listeners = {};
    }
    
    /**
     * Initializes the Google Map
     * @param {string} mapElementId - ID of the map container element
     * @returns {Promise<void>}
     */
    async initialize(mapElementId = 'map') {
        try {
            // Check if map container exists
            const mapElement = document.getElementById(mapElementId);
            if (!mapElement) {
                throw new Error(`Map element with ID '${mapElementId}' not found`);
            }
            
            // Initialize map with config settings
            this.map = new google.maps.Map(mapElement, {
                center: CONFIG.maps.defaultCenter,
                zoom: CONFIG.maps.defaultZoom,
                mapTypeId: CONFIG.maps.mapTypeId,
                ...CONFIG.maps.controls,
                // Additional options
                gestureHandling: 'greedy',
                clickableIcons: false,
                disableDefaultUI: false,
                tilt: 0,  // Disable 3D tilt
                // No restriction needed
                styles: this.getMapStyles()
            });
            
            // Initialize drawing manager
            this.initializeDrawingManager();
            
            // Initialize info window
            this.infoWindow = new google.maps.InfoWindow();
            
            // Set up map event listeners
            this.setupMapListeners();
            
            // Try to get user's location
            await this.centerOnUserLocation();
            
            this.isInitialized = true;
            state.emit('map:initialized', this.map);
            
        } catch (error) {
            console.error('Error initializing map:', error);
            throw error;
        }
    }
    
    /**
     * Initializes the drawing manager
     * @private
     */
    initializeDrawingManager() {
        this.drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false, // We use custom controls
            polygonOptions: {
                ...CONFIG.drawing.polygon,
                fillColor: CONFIG.pvArea.types['roof-parallel'].color,
                strokeColor: CONFIG.pvArea.types['roof-parallel'].color
            },
            rectangleOptions: {
                fillColor: CONFIG.pvArea.types['roof-parallel'].color,
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: CONFIG.pvArea.types['roof-parallel'].color,
                editable: false,
                draggable: false
            },
            markerOptions: {
                draggable: true
            }
        });
        
        this.drawingManager.setMap(this.map);
        
        // Listen for polygon complete events
        google.maps.event.addListener(this.drawingManager, 'polygoncomplete', (polygon) => {
            this.handlePolygonComplete(polygon);
        });
        
        // Listen for marker complete events (for observation points)
        google.maps.event.addListener(this.drawingManager, 'markercomplete', (marker) => {
            this.handleMarkerComplete(marker);
        });
    }
    
    /**
     * Sets up map event listeners
     * @private
     */
    setupMapListeners() {
        // Map click event
        this.map.addListener('click', (event) => {
            state.emit('map:click', event);
        });
        
        // Map bounds changed
        this.map.addListener('bounds_changed', () => {
            state.emit('map:bounds_changed', this.map.getBounds());
        });
        
        // Map zoom changed
        this.map.addListener('zoom_changed', () => {
            state.emit('map:zoom_changed', this.map.getZoom());
        });
        
        // Map type changed
        this.map.addListener('maptypeid_changed', () => {
            state.emit('map:type_changed', this.map.getMapTypeId());
        });
    }
    
    /**
     * Handles polygon complete event from drawing manager
     * @private
     * @param {google.maps.Polygon} polygon - The completed polygon
     */
    handlePolygonComplete(polygon) {
        // Immediately remove from map (will be managed by PV area)
        polygon.setMap(null);
        
        // Get the current PV type from state
        const pvType = state.currentMode.pvType || 'roof-parallel';
        
        // Emit event with polygon data
        state.emit('map:polygon_complete', {
            path: polygon.getPath().getArray().map(latLng => ({
                lat: latLng.lat(),
                lng: latLng.lng()
            })),
            type: pvType
        });
        
        // Reset drawing mode
        this.setDrawingMode(null);
    }
    
    /**
     * Handles marker complete event from drawing manager
     * @private
     * @param {google.maps.Marker} marker - The completed marker
     */
    handleMarkerComplete(marker) {
        // Immediately remove from map (will be managed by observation point)
        marker.setMap(null);
        
        // Emit event with marker data
        state.emit('map:marker_complete', {
            position: {
                lat: marker.getPosition().lat(),
                lng: marker.getPosition().lng()
            }
        });
        
        // Reset drawing mode
        this.setDrawingMode(null);
    }
    
    /**
     * Centers the map on user's location
     * @returns {Promise<void>}
     */
    async centerOnUserLocation() {
        // Only use IP-based location to avoid privacy concerns
        // No browser geolocation API to prevent permission prompts
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                const ipLocation = {
                    lat: data.latitude,
                    lng: data.longitude
                };
                
                this.map.setCenter(ipLocation);
                console.log('Centered on IP location:', ipLocation);
            }
        } catch (error) {
            console.log('IP-based location failed, using default center (Munich)');
            // Map stays at default location
        }
    }
    
    /**
     * Sets the drawing mode
     * @param {string|null} mode - Drawing mode ('polygon', 'rectangle', 'marker', or null)
     */
    setDrawingMode(mode) {
        if (!this.drawingManager) return;
        
        switch (mode) {
            case 'polygon':
                this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
                break;
            case 'rectangle':
                this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
                break;
            case 'marker':
                this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.MARKER);
                break;
            default:
                this.drawingManager.setDrawingMode(null);
        }
    }
    
    /**
     * Updates polygon options for drawing manager
     * @param {Object} options - Polygon options
     */
    updatePolygonOptions(options) {
        if (!this.drawingManager) return;
        
        this.drawingManager.setOptions({
            polygonOptions: {
                ...CONFIG.drawing.polygon,
                ...options
            }
        });
    }
    
    /**
     * Shows an info window at a specific position
     * @param {string} content - HTML content for the info window
     * @param {google.maps.LatLng|Object} position - Position to show the info window
     */
    showInfoWindow(content, position) {
        if (!this.infoWindow) return;
        
        this.infoWindow.setContent(content);
        this.infoWindow.setPosition(position);
        this.infoWindow.open(this.map);
    }
    
    /**
     * Hides the info window
     */
    hideInfoWindow() {
        if (this.infoWindow) {
            this.infoWindow.close();
        }
    }
    
    /**
     * Pans the map to a specific position
     * @param {google.maps.LatLng|Object} position - Position to pan to
     * @param {boolean} [smooth=true] - Use smooth animation
     */
    panTo(position, smooth = true) {
        if (!this.map) return;
        
        if (smooth) {
            this.map.panTo(position);
        } else {
            this.map.setCenter(position);
        }
    }
    
    /**
     * Sets the map zoom level
     * @param {number} zoom - Zoom level
     */
    setZoom(zoom) {
        if (!this.map) return;
        this.map.setZoom(zoom);
    }
    
    /**
     * Fits the map bounds to show all content
     * @param {google.maps.LatLngBounds} bounds - Bounds to fit
     * @param {number} [padding=50] - Padding in pixels
     */
    fitBounds(bounds, padding = 50) {
        if (!this.map) return;
        
        this.map.fitBounds(bounds, {
            top: padding,
            right: padding,
            bottom: padding,
            left: padding
        });
    }
    
    /**
     * Gets the current map bounds
     * @returns {google.maps.LatLngBounds|null}
     */
    getBounds() {
        return this.map ? this.map.getBounds() : null;
    }
    
    /**
     * Gets the current map center
     * @returns {google.maps.LatLng|null}
     */
    getCenter() {
        return this.map ? this.map.getCenter() : null;
    }
    
    /**
     * Gets the current zoom level
     * @returns {number}
     */
    getZoom() {
        return this.map ? this.map.getZoom() : CONFIG.maps.defaultZoom;
    }
    
    /**
     * Converts a pixel position to lat/lng
     * @param {Object} pixel - Pixel position {x, y}
     * @returns {google.maps.LatLng|null}
     */
    pixelToLatLng(pixel) {
        if (!this.map) return null;
        
        const projection = this.map.getProjection();
        if (!projection) return null;
        
        const bounds = this.map.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        const topRight = projection.fromLatLngToPoint(ne);
        const bottomLeft = projection.fromLatLngToPoint(sw);
        
        const scale = 1 << this.map.getZoom();
        const point = new google.maps.Point(
            (pixel.x / scale) + bottomLeft.x,
            (pixel.y / scale) + topRight.y
        );
        
        return projection.fromPointToLatLng(point);
    }
    
    /**
     * Gets custom map styles
     * @private
     * @returns {Array} Map styles array
     */
    getMapStyles() {
        // Return subtle styling for better visibility of PV areas
        return [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]  // Hide points of interest
            },
            {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]  // Hide transit stations
            },
            {
                featureType: 'road',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]  // Show road names
            },
            {
                featureType: 'road',
                elementType: 'labels.text',
                stylers: [
                    { visibility: 'on' },
                    { color: '#ffffff' },
                    { weight: 0.5 }
                ]
            },
            {
                featureType: 'administrative',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]  // Show area names
            }
        ];
    }
    
    /**
     * Triggers a resize event on the map
     * Useful when map container size changes
     */
    triggerResize() {
        if (!this.map) return;
        google.maps.event.trigger(this.map, 'resize');
    }
    
    /**
     * Destroys the map instance
     */
    destroy() {
        if (this.drawingManager) {
            this.drawingManager.setMap(null);
            this.drawingManager = null;
        }
        
        if (this.infoWindow) {
            this.infoWindow.close();
            this.infoWindow = null;
        }
        
        this.map = null;
        this.isInitialized = false;
        
        state.emit('map:destroyed');
    }
}

// Create global map manager instance
const mapManager = new MapManager();

// Make it globally accessible
window.mapManager = mapManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = mapManager;
}