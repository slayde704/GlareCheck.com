/**
 * Editing Enhancer Module
 * Adds enhanced editing capabilities to PV area polygons
 */

import { MapManager } from '../core/map-manager.js';
import { StateManager } from '../core/state-manager.js';
import { GeometryUtils } from '../utils/geometry.js';

export const EditingEnhancer = {
    /**
     * Enhance a polygon with advanced editing features
     * @param {Object} pvArea - PV area object from StateManager
     */
    enhancePolygon(pvArea) {
        if (!pvArea.polygon) return;
        
        const polygon = pvArea.polygon;
        const isRoofParallel = pvArea.type === 'roof-parallel';
        
        if (isRoofParallel) {
            this._addRoofParallelConstraints(pvArea);
            this._addDoubleArrows(pvArea);
        }
        
        // Add vertex editing
        this._addVertexMarkers(pvArea);
    },
    
    /**
     * Add movement constraints for roof-parallel polygons
     */
    _addRoofParallelConstraints(pvArea) {
        const polygon = pvArea.polygon;
        const path = polygon.getPath();
        
        // Store original drag behavior
        const originalDraggable = polygon.getDraggable();
        
        // Override drag behavior to constrain movement
        google.maps.event.addListener(polygon, 'dragstart', () => {
            // Store initial positions
            pvArea._dragStartPositions = [];
            for (let i = 0; i < path.getLength(); i++) {
                pvArea._dragStartPositions.push({
                    lat: path.getAt(i).lat(),
                    lng: path.getAt(i).lng()
                });
            }
        });
        
        google.maps.event.addListener(polygon, 'drag', () => {
            // For roof-parallel, we could implement constraints here
            // For now, just ensure the parallelogram shape is maintained
        });
    },
    
    /**
     * Add double arrow markers for edge movement
     */
    _addDoubleArrows(pvArea) {
        const polygon = pvArea.polygon;
        const path = polygon.getPath();
        const map = MapManager.getMap();
        
        if (path.getLength() !== 4) return;
        
        pvArea.doubleArrows = [];
        
        // Add double arrow for top edge (P1-P2)
        const topMidpoint = GeometryUtils.getMidpoint(path.getAt(0), path.getAt(1));
        const topArrow = new google.maps.Marker({
            position: topMidpoint,
            map: map,
            icon: {
                path: 'M -10,0 L -5,-5 L -5,-2 L 5,-2 L 5,-5 L 10,0 L 5,5 L 5,2 L -5,2 L -5,5 Z',
                fillColor: '#00CED1',
                fillOpacity: 0.8,
                strokeColor: '#FFFFFF',
                strokeWeight: 1,
                scale: 1.5,
                rotation: this._calculateEdgeAngle(path.getAt(0), path.getAt(1)) + 90
            },
            draggable: true,
            cursor: 'move',
            title: 'Oberkante verschieben',
            zIndex: 1002
        });
        
        // Add drag listener for top edge
        google.maps.event.addListener(topArrow, 'drag', (e) => {
            this._handleEdgeDrag(pvArea, 'top', e.latLng);
        });
        
        pvArea.doubleArrows.push(topArrow);
        
        // Add double arrow for bottom edge (P3-P4)
        const bottomMidpoint = GeometryUtils.getMidpoint(path.getAt(2), path.getAt(3));
        const bottomArrow = new google.maps.Marker({
            position: bottomMidpoint,
            map: map,
            icon: {
                path: 'M -10,0 L -5,-5 L -5,-2 L 5,-2 L 5,-5 L 10,0 L 5,5 L 5,2 L -5,2 L -5,5 Z',
                fillColor: '#FF8C00',
                fillOpacity: 0.8,
                strokeColor: '#FFFFFF',
                strokeWeight: 1,
                scale: 1.5,
                rotation: this._calculateEdgeAngle(path.getAt(2), path.getAt(3)) + 90
            },
            draggable: true,
            cursor: 'move',
            title: 'Unterkante verschieben',
            zIndex: 1002
        });
        
        // Add drag listener for bottom edge
        google.maps.event.addListener(bottomArrow, 'drag', (e) => {
            this._handleEdgeDrag(pvArea, 'bottom', e.latLng);
        });
        
        pvArea.doubleArrows.push(bottomArrow);
        
        // Update arrows when polygon changes
        google.maps.event.addListener(path, 'set_at', () => {
            this._updateDoubleArrows(pvArea);
        });
    },
    
    /**
     * Add vertex markers for editing
     */
    _addVertexMarkers(pvArea) {
        // For roof-parallel, add special constraints to corner markers
        if (pvArea.type === 'roof-parallel' && pvArea.cornerMarkers) {
            this._addCornerConstraints(pvArea);
        }
    },
    
    /**
     * Add constraints to corner markers for roof-parallel
     */
    _addCornerConstraints(pvArea) {
        const polygon = pvArea.polygon;
        const path = polygon.getPath();
        const markers = pvArea.cornerMarkers;
        
        if (markers.length !== 4) return;
        
        // Remove existing drag listeners and add constrained ones
        markers.forEach((marker, index) => {
            // Clear existing listeners
            google.maps.event.clearListeners(marker, 'drag');
            
            // Add new constrained drag listener
            google.maps.event.addListener(marker, 'drag', (e) => {
                const newPos = e.latLng;
                
                // Update positions to maintain parallelogram
                switch(index) {
                    case 0: // P1 (top-left)
                        // When P1 moves, P2 moves horizontally, P4 moves vertically
                        path.setAt(0, newPos);
                        path.setAt(1, new google.maps.LatLng(
                            newPos.lat(), 
                            path.getAt(1).lng()
                        ));
                        path.setAt(3, new google.maps.LatLng(
                            path.getAt(3).lat(), 
                            newPos.lng()
                        ));
                        // Update marker positions
                        markers[1].setPosition(path.getAt(1));
                        markers[3].setPosition(path.getAt(3));
                        break;
                        
                    case 1: // P2 (top-right)
                        // When P2 moves, P1 moves horizontally, P3 moves vertically
                        path.setAt(1, newPos);
                        path.setAt(0, new google.maps.LatLng(
                            newPos.lat(), 
                            path.getAt(0).lng()
                        ));
                        path.setAt(2, new google.maps.LatLng(
                            path.getAt(2).lat(), 
                            newPos.lng()
                        ));
                        // Update marker positions
                        markers[0].setPosition(path.getAt(0));
                        markers[2].setPosition(path.getAt(2));
                        break;
                        
                    case 2: // P3 (bottom-right)
                        // When P3 moves, P4 moves horizontally, P2 moves vertically
                        path.setAt(2, newPos);
                        path.setAt(3, new google.maps.LatLng(
                            newPos.lat(), 
                            path.getAt(3).lng()
                        ));
                        path.setAt(1, new google.maps.LatLng(
                            path.getAt(1).lat(), 
                            newPos.lng()
                        ));
                        // Update marker positions
                        markers[3].setPosition(path.getAt(3));
                        markers[1].setPosition(path.getAt(1));
                        break;
                        
                    case 3: // P4 (bottom-left)
                        // When P4 moves, P3 moves horizontally, P1 moves vertically
                        path.setAt(3, newPos);
                        path.setAt(2, new google.maps.LatLng(
                            newPos.lat(), 
                            path.getAt(2).lng()
                        ));
                        path.setAt(0, new google.maps.LatLng(
                            path.getAt(0).lat(), 
                            newPos.lng()
                        ));
                        // Update marker positions
                        markers[2].setPosition(path.getAt(2));
                        markers[0].setPosition(path.getAt(0));
                        break;
                }
                
                // Update double arrows if they exist
                this._updateDoubleArrows(pvArea);
            });
        });
    },
    
    /**
     * Calculate angle of an edge
     */
    _calculateEdgeAngle(p1, p2) {
        const heading = google.maps.geometry.spherical.computeHeading(p1, p2);
        return heading;
    },
    
    /**
     * Handle edge drag
     */
    _handleEdgeDrag(pvArea, edge, newPosition) {
        const polygon = pvArea.polygon;
        const path = polygon.getPath();
        
        if (edge === 'top') {
            // Move P1 and P2 perpendicular to edge
            const edgeVector = {
                lat: path.getAt(1).lat() - path.getAt(0).lat(),
                lng: path.getAt(1).lng() - path.getAt(0).lng()
            };
            
            // Calculate perpendicular movement
            const oldMidpoint = GeometryUtils.getMidpoint(path.getAt(0), path.getAt(1));
            const movement = {
                lat: newPosition.lat() - oldMidpoint.lat(),
                lng: newPosition.lng() - oldMidpoint.lng()
            };
            
            // Apply movement to top vertices
            path.setAt(0, new google.maps.LatLng(
                path.getAt(0).lat() + movement.lat,
                path.getAt(0).lng() + movement.lng
            ));
            path.setAt(1, new google.maps.LatLng(
                path.getAt(1).lat() + movement.lat,
                path.getAt(1).lng() + movement.lng
            ));
        } else if (edge === 'bottom') {
            // Move P3 and P4 perpendicular to edge
            const oldMidpoint = GeometryUtils.getMidpoint(path.getAt(2), path.getAt(3));
            const movement = {
                lat: newPosition.lat() - oldMidpoint.lat(),
                lng: newPosition.lng() - oldMidpoint.lng()
            };
            
            // Apply movement to bottom vertices
            path.setAt(2, new google.maps.LatLng(
                path.getAt(2).lat() + movement.lat,
                path.getAt(2).lng() + movement.lng
            ));
            path.setAt(3, new google.maps.LatLng(
                path.getAt(3).lat() + movement.lat,
                path.getAt(3).lng() + movement.lng
            ));
        }
    },
    
    /**
     * Update double arrow positions
     */
    _updateDoubleArrows(pvArea) {
        if (!pvArea.doubleArrows || pvArea.doubleArrows.length !== 2) return;
        
        const path = pvArea.polygon.getPath();
        
        // Update top arrow
        const topMidpoint = GeometryUtils.getMidpoint(path.getAt(0), path.getAt(1));
        pvArea.doubleArrows[0].setPosition(topMidpoint);
        pvArea.doubleArrows[0].setIcon({
            ...pvArea.doubleArrows[0].getIcon(),
            rotation: this._calculateEdgeAngle(path.getAt(0), path.getAt(1)) + 90
        });
        
        // Update bottom arrow
        const bottomMidpoint = GeometryUtils.getMidpoint(path.getAt(2), path.getAt(3));
        pvArea.doubleArrows[1].setPosition(bottomMidpoint);
        pvArea.doubleArrows[1].setIcon({
            ...pvArea.doubleArrows[1].getIcon(),
            rotation: this._calculateEdgeAngle(path.getAt(2), path.getAt(3)) + 90
        });
    },
    
    /**
     * Remove all enhancements
     */
    removeEnhancements(pvArea) {
        // Remove double arrows
        if (pvArea.doubleArrows) {
            pvArea.doubleArrows.forEach(arrow => arrow.setMap(null));
            pvArea.doubleArrows = [];
        }
        
        // Remove other enhancements as needed
    }
};

export default EditingEnhancer;