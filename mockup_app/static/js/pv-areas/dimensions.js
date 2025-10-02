/**
 * Dimensions Module
 * Handles dimension display for PV areas
 */

import { MapManager } from '../core/map-manager.js';
import { DimensionManager } from './dimension-manager.js';

// Store DimensionLabel class reference
let DimensionLabel = null;

// Initialize DimensionLabel class when Google Maps is available
function initializeDimensionLabel() {
    if (DimensionLabel || !window.google || !window.google.maps || !window.google.maps.OverlayView) {
        return false;
    }
    
    // Define Custom Overlay class for dimension labels
    DimensionLabel = class extends google.maps.OverlayView {
        constructor(position, text, map, centerPos) {
            super();
            this.position = position;
            this.text = text;
            this.centerPos = centerPos; // Center of polygon for offset calculation
            this.div = null;
            this.setMap(map);
        }
        
        onAdd() {
            this.div = document.createElement('div');
            this.div.style.cssText = `
                position: absolute;
                color: white;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 
                    -1px -1px 0 #000,
                     1px -1px 0 #000,
                    -1px  1px 0 #000,
                     1px  1px 0 #000;
                pointer-events: none;
                white-space: nowrap;
                z-index: 1002;
                transform: translate(-50%, -50%);
            `;
            this.div.textContent = this.text;
            
            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.div);
        }
        
        draw() {
            if (!this.div) return;
            
            const projection = this.getProjection();
            const position = projection.fromLatLngToDivPixel(this.position);
            const centerPixel = projection.fromLatLngToDivPixel(this.centerPos);
            
            if (position && centerPixel) {
                // Calculate direction from center to edge midpoint
                const dx = position.x - centerPixel.x;
                const dy = position.y - centerPixel.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize and apply 15px offset outward
                const pixelOffset = 15;
                let offsetX = 0;
                let offsetY = 0;
                
                if (distance > 0) {
                    offsetX = (dx / distance) * pixelOffset;
                    offsetY = (dy / distance) * pixelOffset;
                }
                
                this.div.style.left = (position.x + offsetX) + 'px';
                this.div.style.top = (position.y + offsetY) + 'px';
            }
        }
        
        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
            }
        }
        
        updatePosition(position, centerPos) {
            this.position = position;
            if (centerPos) {
                this.centerPos = centerPos;
            }
            this.draw();
        }
        
        updateText(text) {
            this.text = text;
            if (this.div) {
                this.div.textContent = text;
            }
        }
    };
    
    return true;
}

export const Dimensions = {
    /**
     * Show dimensions for a PV area
     */
    async show(pvArea) {
        // Handle facade type with polyline
        if (pvArea.type === 'facade' && pvArea.polyline) {
            this.showFacadeDimensions(pvArea);
            return;
        }
        
        if (!pvArea.polygon || !pvArea.id) return;
        
        // Initialize DimensionLabel class if not already done
        if (!DimensionLabel) {
            initializeDimensionLabel();
            if (!DimensionLabel) {
                console.warn('Google Maps OverlayView not available, falling back to markers');
                this.showWithMarkers(pvArea);
                return;
            }
        }
        
        // Clear any existing dimensions using the central registry
        DimensionManager.clear(pvArea.id);
        
        // Initialize local array for new overlays
        const dimensionOverlays = [];
        
        const path = pvArea.polygon.getPath();
        const points = [];
        const map = MapManager.getMap();
        
        // Get all points
        for (let i = 0; i < path.getLength(); i++) {
            points.push(path.getAt(i));
        }
        
        // Calculate center of polygon for outward offset direction
        let centerLat = 0, centerLng = 0;
        points.forEach(point => {
            centerLat += point.lat();
            centerLng += point.lng();
        });
        centerLat /= points.length;
        centerLng /= points.length;
        const centerLatLng = new google.maps.LatLng(centerLat, centerLng);
        
        // Calculate distances for each edge
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            
            // Calculate distance
            const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
            
            // Calculate midpoint
            const midLat = (p1.lat() + p2.lat()) / 2;
            const midLng = (p1.lng() + p2.lng()) / 2;
            const midPoint = new google.maps.LatLng(midLat, midLng);
            
            // Create custom overlay for the label - directly at midpoint, with pixel offset
            const label = new DimensionLabel(midPoint, `${distance.toFixed(1)} m`, map, centerLatLng);
            
            // Store overlay
            dimensionOverlays.push(label);
        }
        
        // Register all overlays with the central manager
        DimensionManager.register(pvArea.id, dimensionOverlays);
        
        // Also store reference on pvArea for compatibility
        pvArea.dimensionOverlays = dimensionOverlays;
    },
    
    /**
     * Show dimensions for facade (vertical) PV
     */
    showFacadeDimensions(pvArea) {
        if (!pvArea.polyline || !pvArea.id) return;
        
        // Initialize DimensionLabel class if not already done
        if (!DimensionLabel) {
            initializeDimensionLabel();
            if (!DimensionLabel) {
                console.warn('Google Maps OverlayView not available for facade dimensions');
                return;
            }
        }
        
        // Clear any existing dimensions
        DimensionManager.clear(pvArea.id);
        
        const dimensionOverlays = [];
        const path = pvArea.polyline.getPath();
        const map = MapManager.getMap();
        
        // Facade has only 2 points
        if (path.getLength() === 2) {
            const p1 = path.getAt(0);
            const p2 = path.getAt(1);
            
            // Calculate horizontal distance (length of the facade)
            const horizontalDistance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
            
            // Calculate midpoint for horizontal dimension
            const midLat = (p1.lat() + p2.lat()) / 2;
            const midLng = (p1.lng() + p2.lng()) / 2;
            const midPoint = new google.maps.LatLng(midLat, midLng);
            
            // Create label for horizontal distance only (no height)
            const horizontalLabel = new DimensionLabel(
                midPoint, 
                `${horizontalDistance.toFixed(1)} m`, 
                map, 
                midPoint
            );
            dimensionOverlays.push(horizontalLabel);
        }
        
        // Register all overlays with the central manager
        DimensionManager.register(pvArea.id, dimensionOverlays);
        
        // Store reference on pvArea for compatibility
        pvArea.dimensionOverlays = dimensionOverlays;
    },
    
    /**
     * Hide dimensions for a PV area
     */
    hide(pvArea) {
        if (!pvArea.id) return;
        
        // Use central registry to clear all overlays
        DimensionManager.clear(pvArea.id);
        
        // Clear local references
        if (pvArea.dimensionOverlays) {
            pvArea.dimensionOverlays = [];
        }
    },
    
    /**
     * Update dimensions when polygon changes - using Custom Overlays
     */
    update(pvArea) {
        if (!pvArea.showDimensions || !pvArea.id) return;
        
        // Handle facade type
        if (pvArea.type === 'facade' && pvArea.polyline) {
            this.showFacadeDimensions(pvArea);
            return;
        }
        
        if (!pvArea.polygon) return;
        
        const path = pvArea.polygon.getPath();
        const existingOverlays = DimensionManager.get(pvArea.id);
        
        // Try to use custom overlays first if available
        if (existingOverlays && existingOverlays.length === path.getLength() && DimensionLabel) {
            const points = [];
            for (let i = 0; i < path.getLength(); i++) {
                points.push(path.getAt(i));
            }
            
            // Calculate center for offset direction
            let centerLat = 0, centerLng = 0;
            points.forEach(point => {
                centerLat += point.lat();
                centerLng += point.lng();
            });
            centerLat /= points.length;
            centerLng /= points.length;
            const centerLatLng = new google.maps.LatLng(centerLat, centerLng);
            
            // Update each dimension label
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                
                // Calculate new distance
                const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
                
                // Calculate new midpoint - no offset
                const midLat = (p1.lat() + p2.lat()) / 2;
                const midLng = (p1.lng() + p2.lng()) / 2;
                const midPoint = new google.maps.LatLng(midLat, midLng);
                
                // Update existing overlay
                const overlay = existingOverlays[i];
                if (overlay) {
                    if (overlay instanceof DimensionLabel) {
                        // Update custom overlay
                        overlay.updatePosition(midPoint, centerLatLng);
                        overlay.updateText(`${distance.toFixed(1)} m`);
                    } else if (overlay.setPosition && overlay.setLabel) {
                        // Update regular marker
                        overlay.setPosition(midPoint);
                        overlay.setLabel({
                            text: `${distance.toFixed(1)} m`,
                            color: '#FFFFFF',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        });
                    }
                }
            }
        } else {
            // Full recreate if edge count changed
            DimensionManager.clear(pvArea.id);
            if (pvArea.dimensionOverlays) {
                pvArea.dimensionOverlays = [];
            }
            this.show(pvArea);
        }
    },
    
    /**
     * Toggle dimensions for a PV area
     */
    toggle(pvArea) {
        if (pvArea.showDimensions) {
            this.show(pvArea);
        } else {
            this.hide(pvArea);
        }
    },
    
    /**
     * Fallback method using regular markers
     */
    showWithMarkers(pvArea) {
        if (!pvArea.polygon || !pvArea.id) return;
        
        // Clear any existing dimensions
        DimensionManager.clear(pvArea.id);
        
        const dimensionOverlays = [];
        const path = pvArea.polygon.getPath();
        const points = [];
        const map = MapManager.getMap();
        
        // Get all points
        for (let i = 0; i < path.getLength(); i++) {
            points.push(path.getAt(i));
        }
        
        // Calculate center
        let centerLat = 0, centerLng = 0;
        points.forEach(point => {
            centerLat += point.lat();
            centerLng += point.lng();
        });
        centerLat /= points.length;
        centerLng /= points.length;
        const centerLatLng = new google.maps.LatLng(centerLat, centerLng);
        
        // Create dimension for each edge
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            
            const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
            const midPoint = new google.maps.LatLng(
                (p1.lat() + p2.lat()) / 2,
                (p1.lng() + p2.lng()) / 2
            );
            
            const label = new google.maps.Marker({
                position: midPoint,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 0
                },
                label: {
                    text: `${distance.toFixed(1)} m`,
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                clickable: false,
                zIndex: 1002
            });
            
            dimensionOverlays.push(label);
        }
        
        DimensionManager.register(pvArea.id, dimensionOverlays);
        pvArea.dimensionOverlays = dimensionOverlays;
    }
};

export default Dimensions;