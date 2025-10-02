/**
 * Map Manager Module
 * Handles Google Maps initialization and management
 */

export const MapManager = {
    // Private properties
    _map: null,
    _drawingManager: null,
    _mapOptions: {
        center: { lat: 48.1351, lng: 11.5820 }, // Munich default
        zoom: 15,
        mapTypeId: 'hybrid',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        tilt: 0,
        rotateControl: false,
        styles: [
            // Hide all points of interest
            {
                featureType: "poi",
                elementType: "all",
                stylers: [{ visibility: "off" }]
            },
            // Hide transit stations
            {
                featureType: "transit",
                elementType: "all",
                stylers: [{ visibility: "off" }]
            },
            // Make road labels more visible
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [
                    { color: "#ffffff" },
                    { weight: 2 }
                ]
            },
            {
                featureType: "road",
                elementType: "labels.text.stroke",
                stylers: [
                    { color: "#000000" },
                    { weight: 3 }
                ]
            },
            // Make administrative labels more visible
            {
                featureType: "administrative",
                elementType: "labels.text.fill",
                stylers: [{ color: "#ffffff" }]
            },
            {
                featureType: "administrative",
                elementType: "labels.text.stroke",
                stylers: [
                    { color: "#000000" },
                    { weight: 2 }
                ]
            },
            // Hide business icons
            {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }]
            },
            // Hide park labels
            {
                featureType: "poi.park",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    },

    // Event listeners
    _listeners: {
        polygonComplete: [],
        polylineComplete: [],
        markerComplete: [],
        rectangleComplete: [],
        click: [],
        rightclick: []
    },

    /**
     * Initialize the map
     * @param {string} elementId - ID of the map container element
     * @param {Object} options - Optional map configuration
     */
    async initialize(elementId = 'map', options = {}) {
        // Merge custom options
        this._mapOptions = { ...this._mapOptions, ...options };

        // Create map instance
        this._map = new google.maps.Map(
            document.getElementById(elementId), 
            this._mapOptions
        );

        // Initialize drawing manager
        this._initDrawingManager();

        // Try to get user location from IP
        await this._initLocationFromIP();

        // Set up map event listeners
        this._setupMapListeners();

        // MapManager initialized
        return this._map;
    },

    /**
     * Initialize drawing manager
     */
    _initDrawingManager() {
        this._drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                fillColor: '#4274a5',
                fillOpacity: 0.4,
                strokeWeight: 2,
                strokeColor: '#4274a5',
                editable: true,
                draggable: true
            },
            polylineOptions: {
                strokeColor: '#FF6B6B',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                editable: true,
                draggable: true
            },
            rectangleOptions: {
                fillColor: '#4274a5',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#4274a5',
                strokeOpacity: 1,
                editable: false,
                draggable: false
            },
            markerOptions: {
                draggable: true,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#FFC107',
                    fillOpacity: 0.8,
                    strokeColor: '#F57C00',
                    strokeWeight: 2
                }
            }
        });

        this._drawingManager.setMap(this._map);

        // Set up drawing event listeners
        this._setupDrawingListeners();
    },

    /**
     * Initialize location from IP
     */
    async _initLocationFromIP() {
        // Skip IP location due to CORS/rate limiting issues
        // Using default location (Munich, Germany) instead
        console.log('Using default location: Munich, Germany');
        // Default is already set in initialize method
    },

    /**
     * Set up map event listeners
     */
    _setupMapListeners() {
        // Map click events
        this._map.addListener('click', (event) => {
            this._emit('click', event);
        });

        this._map.addListener('rightclick', (event) => {
            this._emit('rightclick', event);
        });

        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._drawingManager.getDrawingMode() !== null) {
                this.setDrawingMode(null);
            }
        });
    },

    /**
     * Set up drawing event listeners
     */
    _setupDrawingListeners() {
        // Polygon complete
        google.maps.event.addListener(this._drawingManager, 'polygoncomplete', (polygon) => {
            this._emit('polygonComplete', polygon);
            this.setDrawingMode(null);
        });

        // Polyline complete
        google.maps.event.addListener(this._drawingManager, 'polylinecomplete', (polyline) => {
            this._emit('polylineComplete', polyline);
            this.setDrawingMode(null);
        });

        // Marker complete
        google.maps.event.addListener(this._drawingManager, 'markercomplete', (marker) => {
            this._emit('markerComplete', marker);
            this.setDrawingMode(null);
        });

        // Rectangle complete
        google.maps.event.addListener(this._drawingManager, 'rectanglecomplete', (rectangle) => {
            this._emit('rectangleComplete', rectangle);
            this.setDrawingMode(null);
        });
    },

    /**
     * Emit an event
     */
    _emit(eventType, data) {
        if (this._listeners[eventType]) {
            this._listeners[eventType].forEach(callback => callback(data));
        }
    },

    /**
     * Subscribe to an event
     */
    on(eventType, callback) {
        if (!this._listeners[eventType]) {
            this._listeners[eventType] = [];
        }
        this._listeners[eventType].push(callback);

        // Return unsubscribe function
        return () => {
            this._listeners[eventType] = this._listeners[eventType].filter(cb => cb !== callback);
        };
    },

    /**
     * Get the map instance
     */
    getMap() {
        return this._map;
    },

    /**
     * Get the drawing manager instance
     */
    getDrawingManager() {
        return this._drawingManager;
    },

    /**
     * Set drawing mode
     */
    setDrawingMode(mode) {
        if (this._drawingManager) {
            this._drawingManager.setDrawingMode(mode);
        }
    },

    /**
     * Get current drawing mode
     */
    getDrawingMode() {
        return this._drawingManager ? this._drawingManager.getDrawingMode() : null;
    },

    /**
     * Center map on location
     */
    setCenter(lat, lng, zoom) {
        if (this._map) {
            this._map.setCenter({ lat, lng });
            if (zoom !== undefined) {
                this._map.setZoom(zoom);
            }
        }
    },

    /**
     * Fit bounds
     */
    fitBounds(bounds) {
        if (this._map && bounds) {
            this._map.fitBounds(bounds);
        }
    },

    /**
     * Create a polygon on the map
     */
    createPolygon(paths, options = {}) {
        const defaultOptions = {
            fillColor: '#4274a5',
            fillOpacity: 0.35,
            strokeColor: '#4274a5',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            editable: true,
            draggable: true
        };

        const polygon = new google.maps.Polygon({
            paths: paths,
            ...defaultOptions,
            ...options
        });

        polygon.setMap(this._map);
        return polygon;
    },
    
    /**
     * Add click handler to polygon for PV area selection
     */
    addPVAreaClickHandler(polygon, pvAreaId) {
        if (!polygon || !pvAreaId) return;
        
        google.maps.event.addListener(polygon, 'click', function(event) {
            // Prevent map click
            if (event) {
                event.stop();
            }
            
            // Get the PV area from state
            const pvArea = window.StateManager?.getPVArea(pvAreaId);
            if (!pvArea) return;
            
            // Don't do anything if PV area is locked
            if (pvArea.locked) return;
            
            // Trigger PV area selection with blink effect
            if (window.PVListRenderer) {
                window.PVListRenderer.selectPVAreaWithEffect(pvAreaId);
            }
        });
    },

    /**
     * Create a polyline on the map
     */
    createPolyline(path, options = {}) {
        const defaultOptions = {
            strokeColor: '#FF6B6B',
            strokeWeight: 3,
            strokeOpacity: 0.8,
            editable: true,
            draggable: true
        };

        const polyline = new google.maps.Polyline({
            path: path,
            ...defaultOptions,
            ...options
        });

        polyline.setMap(this._map);
        return polyline;
    },

    /**
     * Create a marker on the map
     */
    createMarker(position, options = {}) {
        const defaultOptions = {
            draggable: true,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#FFC107',
                fillOpacity: 0.8,
                strokeColor: '#F57C00',
                strokeWeight: 2
            }
        };

        const marker = new google.maps.Marker({
            position: position,
            map: this._map,
            ...defaultOptions,
            ...options
        });

        return marker;
    },

    /**
     * Remove an overlay from the map
     */
    removeOverlay(overlay) {
        if (overlay && overlay.setMap) {
            overlay.setMap(null);
        }
    },

    /**
     * Create bounds from coordinates
     */
    createBounds(coordinates) {
        const bounds = new google.maps.LatLngBounds();
        coordinates.forEach(coord => {
            bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
        });
        return bounds;
    },

    /**
     * Get center of bounds
     */
    getBoundsCenter(bounds) {
        return bounds.getCenter();
    },

    /**
     * Convert pixel to lat/lng
     */
    fromPixelToLatLng(pixel) {
        const projection = this._map.getProjection();
        return projection ? projection.fromPointToLatLng(pixel) : null;
    },

    /**
     * Convert lat/lng to pixel
     */
    fromLatLngToPixel(latLng) {
        const projection = this._map.getProjection();
        return projection ? projection.fromLatLngToPoint(latLng) : null;
    },

    /**
     * Set map options
     */
    setOptions(options) {
        if (this._map) {
            this._map.setOptions(options);
        }
    },

    /**
     * Get current zoom level
     */
    getZoom() {
        return this._map ? this._map.getZoom() : null;
    },

    /**
     * Set zoom level
     */
    setZoom(zoom) {
        if (this._map) {
            this._map.setZoom(zoom);
        }
    },

    /**
     * Get map center
     */
    getCenter() {
        return this._map ? this._map.getCenter() : null;
    }
};

// Export for use in other modules
export default MapManager;