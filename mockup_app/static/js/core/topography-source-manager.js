/**
 * Topography Source Manager
 * Manages elevation data sources (Google API or custom GeoTIFF/XYZ files)
 */

import { UIManager } from '../ui/ui-manager.js';

// i18n helper
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;

export const TopographySourceManager = {
    sourceType: null, // 'google' or 'custom'
    customDataFile: null,
    customDataBounds: null, // { north, south, east, west }
    customDataResolution: null, // in meters
    customDataGrid: null, // elevation data grid
    boundingBoxOverlay: null, // Map rectangle showing coverage area
    isConfigured: false,

    /**
     * Initialize topography source manager
     */
    initialize() {
        console.log('TopographySourceManager initialized');

        // Check if source was previously selected (localStorage)
        const savedSource = localStorage.getItem('topoSource');
        if (savedSource) {
            this.sourceType = savedSource;
            this.isConfigured = true;
            this.unlockMenuItems();
        } else {
            this.lockMenuItems();
        }
    },

    /**
     * Select Google Elevation API as source
     */
    selectGoogleAPI() {
        this.sourceType = 'google';
        this.isConfigured = true;
        this.customDataFile = null;
        this.customDataBounds = null;
        this.customDataGrid = null;

        // Clear bounding box if exists
        if (this.boundingBoxOverlay) {
            this.boundingBoxOverlay.setMap(null);
            this.boundingBoxOverlay = null;
        }

        localStorage.setItem('topoSource', 'google');
        this.unlockMenuItems();

        UIManager.showNotification(t('topo.success'), 'success');
        console.log('Google Elevation API selected');
    },

    /**
     * Process custom elevation data file
     */
    async selectCustomData(file) {
        if (!file) {
            UIManager.showNotification(t('topo.error'), 'error');
            return false;
        }

        UIManager.showNotification(t('topo.processing'), 'info');

        try {
            const fileExt = file.name.split('.').pop().toLowerCase();

            // Validate file format
            if (!['tif', 'tiff', 'xyz', 'txt'].includes(fileExt)) {
                UIManager.showNotification(t('topo.invalidFormat'), 'error');
                return false;
            }

            let result;
            if (fileExt === 'tif' || fileExt === 'tiff') {
                result = await this.processGeoTIFF(file);
            } else {
                result = await this.processXYZ(file);
            }

            if (!result) {
                UIManager.showNotification(t('topo.error'), 'error');
                return false;
            }

            // Validate resolution (1m to 50m)
            if (this.customDataResolution < 1 || this.customDataResolution > 50) {
                UIManager.showNotification(t('topo.invalidResolution'), 'error');
                return false;
            }

            this.sourceType = 'custom';
            this.isConfigured = true;
            this.customDataFile = file.name;

            localStorage.setItem('topoSource', 'custom');
            localStorage.setItem('topoCustomFile', file.name);

            this.drawBoundingBox();
            this.unlockMenuItems();

            UIManager.showNotification(t('topo.success'), 'success');
            console.log('Custom elevation data loaded:', this.customDataBounds);

            return true;

        } catch (error) {
            console.error('Error processing elevation data:', error);
            UIManager.showNotification(t('topo.error'), 'error');
            return false;
        }
    },

    /**
     * Process GeoTIFF file
     * Note: Requires geotiff.js library in production
     */
    async processGeoTIFF(file) {
        // TODO: Implement GeoTIFF parsing using geotiff.js
        // For now, show placeholder message
        console.warn('GeoTIFF processing not yet implemented. Use XYZ format for now.');

        // Placeholder - would extract from actual GeoTIFF:
        // const arrayBuffer = await file.arrayBuffer();
        // const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        // const image = await tiff.getImage();
        // const bbox = image.getBoundingBox();
        // const resolution = image.getResolution();

        const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
        UIManager.showNotification(t('topo.geotiffNotSupported'), 'warning');
        return false;
    },

    /**
     * Process XYZ file (ASCII format: X Y Z per line)
     * Expected format: longitude latitude elevation
     */
    async processXYZ(file) {
        const text = await file.text();
        const lines = text.trim().split('\n');

        if (lines.length < 4) {
            console.error('XYZ file too small');
            return false;
        }

        const points = [];
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        // Parse all points
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue; // Skip comments

            const parts = trimmed.split(/\s+/);
            if (parts.length < 3) continue;

            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const elev = parseFloat(parts[2]);

            if (isNaN(lng) || isNaN(lat) || isNaN(elev)) continue;

            points.push({ lng, lat, elev });

            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        }

        if (points.length < 4) {
            console.error('Not enough valid points in XYZ file');
            return false;
        }

        // Calculate resolution (estimate from point spacing)
        points.sort((a, b) => a.lng - b.lng || a.lat - b.lat);

        let sumSpacing = 0;
        let spacingCount = 0;

        for (let i = 1; i < Math.min(100, points.length); i++) {
            const dx = Math.abs(points[i].lng - points[i-1].lng);
            const dy = Math.abs(points[i].lat - points[i-1].lat);
            const spacing = Math.sqrt(dx*dx + dy*dy);

            if (spacing > 0.00001) { // Filter out duplicates
                // Convert degrees to meters (approximate at mid-latitude)
                const metersPerDegree = 111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
                sumSpacing += spacing * metersPerDegree;
                spacingCount++;
            }
        }

        const avgResolution = spacingCount > 0 ? sumSpacing / spacingCount : 0;

        // Store data
        this.customDataBounds = {
            north: maxLat,
            south: minLat,
            east: maxLng,
            west: minLng
        };

        this.customDataResolution = avgResolution;
        this.customDataGrid = points;

        console.log('XYZ file processed:', {
            points: points.length,
            bounds: this.customDataBounds,
            resolution: `${avgResolution.toFixed(2)}m`
        });

        return true;
    },

    /**
     * Draw bounding box on map to show coverage area
     */
    drawBoundingBox() {
        if (!this.customDataBounds) return;

        const MapManager = window.MapManager;
        if (!MapManager) return;

        const map = MapManager.getMap();
        if (!map) return;

        // Remove existing overlay
        if (this.boundingBoxOverlay) {
            this.boundingBoxOverlay.setMap(null);
        }

        // Create rectangle
        this.boundingBoxOverlay = new google.maps.Rectangle({
            bounds: this.customDataBounds,
            strokeColor: '#FF6B6B',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF6B6B',
            fillOpacity: 0.1,
            map: map,
            clickable: false
        });

        // Fit map to bounds
        map.fitBounds(this.customDataBounds);
    },

    /**
     * Check if a coordinate is within custom data bounds
     */
    isWithinBounds(lat, lng) {
        if (this.sourceType === 'google') {
            return true; // Google API has global coverage
        }

        if (!this.customDataBounds) {
            return false;
        }

        return lat >= this.customDataBounds.south &&
               lat <= this.customDataBounds.north &&
               lng >= this.customDataBounds.west &&
               lng <= this.customDataBounds.east;
    },

    /**
     * Get elevation at specific coordinate
     */
    getElevation(lat, lng) {
        if (this.sourceType === 'google') {
            // Return promise for Google Elevation API
            return this.getGoogleElevation(lat, lng);
        } else {
            // Interpolate from custom grid
            return Promise.resolve(this.interpolateElevation(lat, lng));
        }
    },

    /**
     * Get elevation from Google API
     */
    getGoogleElevation(lat, lng) {
        return new Promise((resolve, reject) => {
            const elevator = new google.maps.ElevationService();

            elevator.getElevationForLocations({
                locations: [{ lat, lng }]
            }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].elevation);
                } else {
                    console.error('Google Elevation API error:', status);
                    reject(new Error('Elevation API failed'));
                }
            });
        });
    },

    /**
     * Interpolate elevation from custom grid (simple nearest neighbor)
     */
    interpolateElevation(lat, lng) {
        if (!this.customDataGrid || this.customDataGrid.length === 0) {
            return 0;
        }

        // Simple nearest neighbor interpolation
        let minDist = Infinity;
        let nearestElevation = 0;

        for (const point of this.customDataGrid) {
            const dist = Math.sqrt(
                Math.pow(point.lat - lat, 2) +
                Math.pow(point.lng - lng, 2)
            );

            if (dist < minDist) {
                minDist = dist;
                nearestElevation = point.elev;
            }
        }

        return nearestElevation;
    },

    /**
     * Lock menu items until source is selected
     */
    lockMenuItems() {
        const menuItems = document.querySelectorAll('.menu-item:not([data-panel="search"]):not([data-panel="topo-source"])');
        menuItems.forEach(item => {
            item.classList.add('disabled');
            item.style.opacity = '0.5';
            item.style.cursor = 'not-allowed';
            item.setAttribute('data-locked', 'true');
        });

        console.log('Menu items locked - awaiting topography source selection');
    },

    /**
     * Unlock menu items after source is selected
     */
    unlockMenuItems() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.remove('disabled');
            item.style.opacity = '1';
            item.style.cursor = 'pointer';
            item.removeAttribute('data-locked');
        });

        console.log('Menu items unlocked');
    },

    /**
     * Reset topography source
     */
    reset() {
        this.sourceType = null;
        this.isConfigured = false;
        this.customDataFile = null;
        this.customDataBounds = null;
        this.customDataGrid = null;

        if (this.boundingBoxOverlay) {
            this.boundingBoxOverlay.setMap(null);
            this.boundingBoxOverlay = null;
        }

        localStorage.removeItem('topoSource');
        localStorage.removeItem('topoCustomFile');

        this.lockMenuItems();

        console.log('Topography source reset');
    },

    /**
     * Get current source info
     */
    getSourceInfo() {
        return {
            type: this.sourceType,
            isConfigured: this.isConfigured,
            customFile: this.customDataFile,
            bounds: this.customDataBounds,
            resolution: this.customDataResolution
        };
    }
};

// Make globally available
window.TopographySourceManager = TopographySourceManager;

// Export for ES6 modules
export default TopographySourceManager;
