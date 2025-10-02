/**
 * @fileoverview Configuration constants and settings for the Glare Check application
 * @module config
 * @requires None
 */

/**
 * Application configuration object
 * Contains all configurable parameters and constants
 */
const CONFIG = {
    /**
     * Google Maps configuration
     */
    maps: {
        // Default center coordinates (Munich, Germany)
        defaultCenter: { lat: 48.1351, lng: 11.5820 },
        // Default zoom level
        defaultZoom: 15,
        // Map type
        mapTypeId: 'hybrid',  // Satellite with labels (streets, house numbers)
        // Map controls
        controls: {
            zoomControl: true,
            mapTypeControl: false,  // Disabled - we only use satellite view
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            tiltControl: false,  // Disable 3D tilt control
            fullscreenControl: false  // Disabled - not needed for this app
        }
    },

    /**
     * PV Area configuration
     */
    pvArea: {
        // Default values for new PV areas
        defaults: {
            azimuth: 180,
            tilt: 0,
            crossTilt: 0,
            moduleType: 0,
            autoCalculateAzimuth: false,
            autoCalculateTilt: false,
            autoCalculateField: false
        },
        // Value constraints
        constraints: {
            azimuth: { min: 0, max: 360, step: 0.1 },
            tilt: { min: 0, max: 89, step: 0.1 },
            crossTilt: { min: -45, max: 45, step: 0.1 },
            height: { min: 0, max: 1000, step: 0.1 }
        },
        // PV types with their properties
        types: {
            'roof-parallel': {
                name: 'Dachparallel',
                icon: 'fa-house',
                color: '#4CAF50',
                hasRotation: true,
                hasCornerHeights: false
            },
            'roof-mounted': {
                name: 'Aufgeständert auf Dach',
                icon: 'fa-solar-panel',
                color: '#2196F3',
                hasRotation: false,
                hasCornerHeights: true
            },
            'facade': {
                name: 'Fassade',
                icon: 'fa-building',
                color: '#FF9800',
                hasRotation: false,
                hasCornerHeights: true
            },
            'ground': {
                name: 'Freifläche',
                icon: 'fa-mountain-sun',
                color: '#9C27B0',
                hasRotation: false,
                hasCornerHeights: true
            }
        }
    },

    /**
     * Drawing configuration
     */
    drawing: {
        // Polygon styling
        polygon: {
            fillOpacity: 0.4,
            strokeWeight: 2,
            editable: false,
            draggable: true
        },
        // Marker styling
        markers: {
            corner: {
                scale: 6,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF'
            },
            midpoint: {
                scale: 4,
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: '#FFFFFF'
            },
            rotation: {
                scale: 8,
                fillColor: '#FF0000',
                strokeColor: '#FFFFFF',
                strokeWeight: 2
            }
        },
        // Edge colors for roof-parallel
        edgeColors: {
            top: '#00CED1',    // Turquoise
            bottom: '#FFA500', // Orange
            sides: '#90EE90'   // Light green
        }
    },

    /**
     * UI configuration
     */
    ui: {
        // Animation durations in milliseconds
        animations: {
            panelSlide: 300,
            highlightDuration: 300,
            scrollDuration: 1000
        },
        // Z-index values for layering
        zIndex: {
            polygon: 100,
            edgeLines: 500,
            markers: 600,
            midpoints: 550,
            labels: 700,
            lockIcon: 1000,
            overlay: 5000
        },
        // Panel dimensions
        panels: {
            cornerHeights: {
                width: 600,
                topOffset: 60
            }
        }
    },

    /**
     * Calculation configuration
     */
    calculations: {
        // Precision settings
        precision: {
            coordinates: 6,
            angles: 1,
            distances: 2,
            heights: 1
        },
        // Thresholds
        thresholds: {
            // Minimum distance for valid perpendicular calculation
            minPerpendicularDistance: 0.1,
            // Maximum allowed height difference for auto-calculation
            maxHeightDifference: 100
        }
    },

    /**
     * Module types configuration
     */
    moduleTypes: {
        // Default module types if not loaded from file
        defaults: [
            {
                id: 0,
                name: "Standard Modul",
                manufacturer: "Generic",
                model: "Standard",
                reflectionProfile: {
                    0: 10, 10: 10, 20: 10, 30: 10, 40: 15,
                    50: 20, 60: 25, 70: 30, 80: 35, 90: 40
                }
            },
            {
                id: 1,
                name: "Anti-Reflex Modul",
                manufacturer: "Generic",
                model: "AR-Coated",
                reflectionProfile: {
                    0: 5, 10: 5, 20: 5, 30: 5, 40: 8,
                    50: 10, 60: 12, 70: 15, 80: 18, 90: 20
                }
            },
            {
                id: 2,
                name: "Strukturglas Modul",
                manufacturer: "Generic",
                model: "Textured",
                reflectionProfile: {
                    0: 8, 10: 8, 20: 8, 30: 8, 40: 12,
                    50: 16, 60: 20, 70: 24, 80: 28, 90: 32
                }
            }
        ]
    },

    /**
     * API endpoints
     */
    api: {
        baseUrl: '/api',
        endpoints: {
            pvArea: '/pv_area',
            simulation: '/simulate',
            moduleTypes: '/module_types',
            export: '/export',
            import: '/import'
        }
    },

    /**
     * Validation rules
     */
    validation: {
        // Name validation
        name: {
            maxLength: 50,
            pattern: /^[a-zA-Z0-9äöüÄÖÜß\s\-_\.]+$/
        },
        // Minimum polygon points
        minPolygonPoints: 3,
        // Maximum polygon points
        maxPolygonPoints: 20
    },

    /**
     * Debug settings
     */
    debug: {
        // Enable console logging
        logging: true,
        // Show performance metrics
        showMetrics: false,
        // Show coordinate info on map
        showCoordinates: false
    }
};

// Freeze the configuration to prevent accidental modifications
Object.freeze(CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}