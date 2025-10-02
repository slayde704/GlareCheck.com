/**
 * Polygon Enhancer Module
 * Enhanced polygon editing from original implementation
 */

import { MapManager } from '../core/map-manager.js';
import { StateManager } from '../core/state-manager.js';
import { Dimensions } from './dimensions.js';

export const PolygonEnhancer = {
    /**
     * Enhance polygon editing (from original enhancePolygonEditing function)
     */
    enhance(pvArea, enableEnhanced = true, editingMode = 'roof-parallel') {
        const polygon = pvArea.polygon;
        const path = polygon.getPath();
        const map = MapManager.getMap();
        const markers = [];
        const edgeMoveMarkers = [];
        const edgeLines = pvArea.edgeLines || [];
        
        // Initialize enhanced elements early
        pvArea.enhancedElements = {
            markers: [],
            edgeMoveMarkers: [],
            doubleArrows: [],
            rotationMarker: null
        };
        
        // Store enhancement flags
        polygon.isEnhanced = enableEnhanced;
        polygon.editingMode = editingMode;
        polygon.isRoofArea = editingMode === 'roof-parallel';
        
        // Only clear corner markers if we're about to create new ones
        if (enableEnhanced && pvArea.cornerMarkers) {
            pvArea.cornerMarkers.forEach(m => m.setMap(null));
            pvArea.cornerMarkers = [];
        }
        
        // Create vertex markers with constraints
        if (enableEnhanced) {
            path.forEach((vertex, index) => {
                const marker = new google.maps.Marker({
                    position: vertex,
                    map: map,
                    draggable: true,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: '#FFFFFF',
                        fillOpacity: 1,
                        strokeColor: '#000000',
                        strokeWeight: 2
                    },
                    zIndex: 995  // Lower z-index than double arrows (997)
                });
            
                // Calculate edge direction and add double arrow
                let edgeDirection = null;
                let doubleArrowMarker = null;
                
                // P0-P1 and P2-P3 are the parallel edges
                const otherIndex = (index === 0) ? 1 : (index === 1) ? 0 : (index === 2) ? 3 : 2;
                const p1 = path.getAt(index);
                const p2 = path.getAt(otherIndex);
                edgeDirection = {
                    lat: p2.lat() - p1.lat(),
                    lng: p2.lng() - p1.lng()
                };
                // Normalize the direction vector
                const length = Math.sqrt(edgeDirection.lat * edgeDirection.lat + edgeDirection.lng * edgeDirection.lng);
                edgeDirection.lat /= length;
                edgeDirection.lng /= length;
                
                // Calculate rotation angle for the double arrow
                const angle = Math.atan2(edgeDirection.lng, edgeDirection.lat) * 180 / Math.PI + 90;
                
                // Create double arrow marker at the vertex
                doubleArrowMarker = new google.maps.Marker({
                    position: vertex,
                    map: map,
                    icon: {
                        path: 'M -15,0 L -10,-3 L -10,-1 L 10,-1 L 10,-3 L 15,0 L 10,3 L 10,1 L -10,1 L -10,3 Z',
                        scale: 0.8,
                        fillColor: '#666666',
                        fillOpacity: 0.7,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 1,
                        rotation: angle,
                        anchor: new google.maps.Point(0, 0)
                    },
                    clickable: false,
                    zIndex: 997
                });
                
                marker.doubleArrowMarker = doubleArrowMarker;
                
                // Add drag listener with constraints
                google.maps.event.addListener(marker, 'drag', function(e) {
                if (polygon.isRoofArea && path.getLength() === 4) {
                    // Recalculate edge direction dynamically to account for rotations
                    const otherIndex = (index === 0) ? 1 : (index === 1) ? 0 : (index === 2) ? 3 : 2;
                    const p1 = path.getAt(index);
                    const p2 = path.getAt(otherIndex);
                    const currentEdgeDirection = {
                        lat: p2.lat() - p1.lat(),
                        lng: p2.lng() - p1.lng()
                    };
                    // Normalize the direction vector
                    const length = Math.sqrt(currentEdgeDirection.lat * currentEdgeDirection.lat + currentEdgeDirection.lng * currentEdgeDirection.lng);
                    currentEdgeDirection.lat /= length;
                    currentEdgeDirection.lng /= length;
                    
                    const newPos = e.latLng;
                    const currentPos = path.getAt(index);
                    
                    // Project the new position onto the edge direction
                    const delta = {
                        lat: newPos.lat() - currentPos.lat(),
                        lng: newPos.lng() - currentPos.lng()
                    };
                    
                    // Dot product to get projection length
                    const projectionLength = delta.lat * currentEdgeDirection.lat + delta.lng * currentEdgeDirection.lng;
                    
                    // Calculate constrained position
                    const constrainedPos = new google.maps.LatLng(
                        currentPos.lat() + projectionLength * currentEdgeDirection.lat,
                        currentPos.lng() + projectionLength * currentEdgeDirection.lng
                    );
                    
                    // Update vertex
                    path.setAt(index, constrainedPos);
                    marker.setPosition(constrainedPos);
                    
                    // Update double arrow position
                    if (marker.doubleArrowMarker) {
                        marker.doubleArrowMarker.setPosition(constrainedPos);
                        
                        // Also update double arrow rotation
                        const angle = Math.atan2(currentEdgeDirection.lng, currentEdgeDirection.lat) * 180 / Math.PI + 90;
                        marker.doubleArrowMarker.setIcon({
                            path: 'M -15,0 L -10,-3 L -10,-1 L 10,-1 L 10,-3 L 15,0 L 10,3 L 10,1 L -10,1 L -10,3 Z',
                            scale: 0.8,
                            fillColor: '#666666',
                            fillOpacity: 0.7,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 1,
                            rotation: angle,
                            anchor: new google.maps.Point(0, 0)
                        });
                    }
                    
                    // Update edge lines if they exist
                    if (edgeLines.length >= 2) {
                        edgeLines[0].setPath([path.getAt(0), path.getAt(1)]);
                        edgeLines[1].setPath([path.getAt(2), path.getAt(3)]);
                    }
                    
                    // Update edge move markers
                    updateEdgeMoveMarkers();
                    
                    // Update rotation marker position
                    updateRotationMarkerPosition();
                    
                    // Update dimensions if shown - get current state from StateManager
                    const currentPVArea = StateManager.getPVArea(pvArea.id);
                    if (currentPVArea && currentPVArea.showDimensions) {
                        currentPVArea.polygon = polygon;
                        Dimensions.update(currentPVArea);
                        // Force immediate visual update
                        if (window.google && window.google.maps && window.google.maps.event) {
                            google.maps.event.trigger(map, 'resize');
                        }
                    }
                } else {
                    // Normal behavior
                    path.setAt(index, e.latLng);
                    
                    // Update dimensions if shown - get current state from StateManager
                    const currentPVArea = StateManager.getPVArea(pvArea.id);
                    if (currentPVArea && currentPVArea.showDimensions) {
                        currentPVArea.polygon = polygon;
                        Dimensions.update(currentPVArea);
                        // Force immediate visual update
                        if (window.google && window.google.maps && window.google.maps.event) {
                            google.maps.event.trigger(map, 'resize');
                        }
                    }
                }
            });
            
            // Force marker back to constrained position on drag end
            google.maps.event.addListener(marker, 'dragend', function(e) {
                if (polygon.isRoofArea && path.getLength() === 4) {
                    const constrainedPos = path.getAt(index);
                    marker.setPosition(constrainedPos);
                }
                
                // Recalculate reference height if auto-calculate is enabled
                if (pvArea.autoCalculateReferenceHeight) {
                    window.PVListRenderer.calculateReferenceHeight(pvArea.id);
                }
                
                // Recalculate perpendicular distance
                PolygonEnhancer._updatePerpendicularDistance(pvArea);
                
                // Update rotation marker position
                updateRotationMarkerPosition();
                });
                
                markers.push(marker);
            });
        }
        
        // Create edge move markers for roof-parallel
        if (editingMode === 'roof-parallel' && path.getLength() === 4) {
            createEdgeMoveMarkers();
        }
        
        function createEdgeMoveMarkers() {
            // Clear existing
            edgeMoveMarkers.forEach(m => m.setMap(null));
            edgeMoveMarkers.length = 0;
            
            // Top edge marker (P1-P2)
            const midpoint12 = new google.maps.LatLng(
                (path.getAt(0).lat() + path.getAt(1).lat()) / 2,
                (path.getAt(0).lng() + path.getAt(1).lng()) / 2
            );
            
            const topEdgeMarker = new google.maps.Marker({
                position: midpoint12,
                map: map,
                draggable: true,
                icon: {
                    path: 'M 0,-10 L -3,-7 L -1,-7 L -1,-1 L -7,-1 L -7,-3 L -10,0 L -7,3 L -7,1 L -1,1 L -1,7 L -3,7 L 0,10 L 3,7 L 1,7 L 1,1 L 7,1 L 7,3 L 10,0 L 7,-3 L 7,-1 L 1,-1 L 1,-7 L 3,-7 Z',
                    scale: 0.8,
                    fillColor: '#4274a5',
                    fillOpacity: 0.8,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 1
                },
                cursor: 'move',
                zIndex: 999
            });
            
            // Bottom edge marker (P3-P4)
            const midpoint34 = new google.maps.LatLng(
                (path.getAt(2).lat() + path.getAt(3).lat()) / 2,
                (path.getAt(2).lng() + path.getAt(3).lng()) / 2
            );
            
            const bottomEdgeMarker = new google.maps.Marker({
                position: midpoint34,
                map: map,
                draggable: true,
                icon: {
                    path: 'M 0,-10 L -3,-7 L -1,-7 L -1,-1 L -7,-1 L -7,-3 L -10,0 L -7,3 L -7,1 L -1,1 L -1,7 L -3,7 L 0,10 L 3,7 L 1,7 L 1,1 L 7,1 L 7,3 L 10,0 L 7,-3 L 7,-1 L 1,-1 L 1,-7 L 3,-7 Z',
                    scale: 0.8,
                    fillColor: '#4274a5',
                    fillOpacity: 0.8,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 1
                },
                cursor: 'move',
                zIndex: 999
            });
            
            // Add drag listeners for edge movement
            let topDragStartPos = null;
            let topStartP1 = null;
            let topStartP2 = null;
            
            google.maps.event.addListener(topEdgeMarker, 'dragstart', function(e) {
                topDragStartPos = e.latLng;
                topStartP1 = path.getAt(0);
                topStartP2 = path.getAt(1);
            });
            
            google.maps.event.addListener(topEdgeMarker, 'drag', function(e) {
                if (!topDragStartPos || !topStartP1 || !topStartP2) return;
                
                const movement = {
                    lat: e.latLng.lat() - topDragStartPos.lat(),
                    lng: e.latLng.lng() - topDragStartPos.lng()
                };
                
                // Move P1 and P2 from their start positions
                path.setAt(0, new google.maps.LatLng(
                    topStartP1.lat() + movement.lat,
                    topStartP1.lng() + movement.lng
                ));
                path.setAt(1, new google.maps.LatLng(
                    topStartP2.lat() + movement.lat,
                    topStartP2.lng() + movement.lng
                ));
                
                // Update markers
                markers[0].setPosition(path.getAt(0));
                markers[1].setPosition(path.getAt(1));
                
                // Update double arrows
                if (markers[0].doubleArrowMarker) markers[0].doubleArrowMarker.setPosition(path.getAt(0));
                if (markers[1].doubleArrowMarker) markers[1].doubleArrowMarker.setPosition(path.getAt(1));
                
                // Update edge lines
                if (edgeLines[0]) edgeLines[0].setPath([path.getAt(0), path.getAt(1)]);
                
                // Update rotation marker position
                updateRotationMarkerPosition();
                
                // Force dimension update with map trigger
                const currentState = StateManager.getPVArea(pvArea.id);
                if (currentState && currentState.showDimensions) {
                    currentState.polygon = polygon;
                    
                    // Force immediate redraw by triggering a resize event
                    if (window.google && window.google.maps && window.google.maps.event) {
                        Dimensions.update(currentState);
                        google.maps.event.trigger(map, 'resize');
                    }
                }
            });
            
            google.maps.event.addListener(topEdgeMarker, 'dragend', function() {
                // Recalculate reference height if auto-calculate is enabled
                if (pvArea.autoCalculateReferenceHeight) {
                    window.PVListRenderer.calculateReferenceHeight(pvArea.id);
                }
                
                // Recalculate perpendicular distance
                PolygonEnhancer._updatePerpendicularDistance(pvArea);
                
                // Update rotation marker position
                updateRotationMarkerPosition();
            });
            
            let bottomDragStartPos = null;
            let bottomStartP3 = null;
            let bottomStartP4 = null;
            
            google.maps.event.addListener(bottomEdgeMarker, 'dragstart', function(e) {
                bottomDragStartPos = e.latLng;
                bottomStartP3 = path.getAt(2);
                bottomStartP4 = path.getAt(3);
            });
            
            google.maps.event.addListener(bottomEdgeMarker, 'drag', function(e) {
                if (!bottomDragStartPos || !bottomStartP3 || !bottomStartP4) return;
                
                const movement = {
                    lat: e.latLng.lat() - bottomDragStartPos.lat(),
                    lng: e.latLng.lng() - bottomDragStartPos.lng()
                };
                
                // Move P3 and P4 from their start positions
                path.setAt(2, new google.maps.LatLng(
                    bottomStartP3.lat() + movement.lat,
                    bottomStartP3.lng() + movement.lng
                ));
                path.setAt(3, new google.maps.LatLng(
                    bottomStartP4.lat() + movement.lat,
                    bottomStartP4.lng() + movement.lng
                ));
                
                // Update markers
                markers[2].setPosition(path.getAt(2));
                markers[3].setPosition(path.getAt(3));
                
                // Update double arrows
                if (markers[2].doubleArrowMarker) markers[2].doubleArrowMarker.setPosition(path.getAt(2));
                if (markers[3].doubleArrowMarker) markers[3].doubleArrowMarker.setPosition(path.getAt(3));
                
                // Update edge lines
                if (edgeLines[1]) edgeLines[1].setPath([path.getAt(2), path.getAt(3)]);
                
                // Update rotation marker position
                updateRotationMarkerPosition();
                
                // Force dimension update with map trigger
                const currentState = StateManager.getPVArea(pvArea.id);
                if (currentState && currentState.showDimensions) {
                    currentState.polygon = polygon;
                    
                    // Force immediate redraw by triggering a resize event
                    if (window.google && window.google.maps && window.google.maps.event) {
                        Dimensions.update(currentState);
                        google.maps.event.trigger(map, 'resize');
                    }
                }
            });
            
            google.maps.event.addListener(bottomEdgeMarker, 'dragend', function() {
                // Recalculate reference height if auto-calculate is enabled
                if (pvArea.autoCalculateReferenceHeight) {
                    window.PVListRenderer.calculateReferenceHeight(pvArea.id);
                }
                
                // Recalculate perpendicular distance
                PolygonEnhancer._updatePerpendicularDistance(pvArea);
                
                // Update rotation marker position
                updateRotationMarkerPosition();
            });
            
            edgeMoveMarkers.push(topEdgeMarker, bottomEdgeMarker);
        }
        
        function updateEdgeMoveMarkers() {
            if (edgeMoveMarkers.length >= 2 && path.getLength() === 4) {
                const midpoint12 = new google.maps.LatLng(
                    (path.getAt(0).lat() + path.getAt(1).lat()) / 2,
                    (path.getAt(0).lng() + path.getAt(1).lng()) / 2
                );
                const midpoint34 = new google.maps.LatLng(
                    (path.getAt(2).lat() + path.getAt(3).lat()) / 2,
                    (path.getAt(2).lng() + path.getAt(3).lng()) / 2
                );
                
                edgeMoveMarkers[0].setPosition(midpoint12);
                edgeMoveMarkers[1].setPosition(midpoint34);
            }
        }
        
        function updateRotationMarkerPosition() {
            if (pvArea.enhancedElements && pvArea.enhancedElements.rotationMarker && path.getLength() === 4) {
                const center = new google.maps.LatLng(
                    (path.getAt(0).lat() + path.getAt(1).lat() + path.getAt(2).lat() + path.getAt(3).lat()) / 4,
                    (path.getAt(0).lng() + path.getAt(1).lng() + path.getAt(2).lng() + path.getAt(3).lng()) / 4
                );
                pvArea.enhancedElements.rotationMarker.setPosition(center);
            }
        }
        
        function getEdgeAngle(p1, p2) {
            return google.maps.geometry.spherical.computeHeading(p1, p2);
        }
        
        // Add polygon drag listener to update all elements
        google.maps.event.addListener(polygon, 'drag', function() {
            const currentPath = polygon.getPath();
            
            // Update vertex markers and their double arrows
            markers.forEach((marker, index) => {
                if (index < currentPath.getLength()) {
                    const newPos = currentPath.getAt(index);
                    marker.setPosition(newPos);
                    
                    // Update double arrow position
                    if (marker.doubleArrowMarker) {
                        marker.doubleArrowMarker.setPosition(newPos);
                    }
                }
            });
            
            // Update edge move markers
            if (edgeMoveMarkers.length >= 2) {
                const midpoint12 = new google.maps.LatLng(
                    (currentPath.getAt(0).lat() + currentPath.getAt(1).lat()) / 2,
                    (currentPath.getAt(0).lng() + currentPath.getAt(1).lng()) / 2
                );
                const midpoint34 = new google.maps.LatLng(
                    (currentPath.getAt(2).lat() + currentPath.getAt(3).lat()) / 2,
                    (currentPath.getAt(2).lng() + currentPath.getAt(3).lng()) / 2
                );
                
                edgeMoveMarkers[0].setPosition(midpoint12);
                edgeMoveMarkers[1].setPosition(midpoint34);
            }
            
            // Update lock marker position if locked
            if (pvArea.locked && pvArea.lockMarker) {
                const bounds = new google.maps.LatLngBounds();
                for (let i = 0; i < currentPath.getLength(); i++) {
                    bounds.extend(currentPath.getAt(i));
                }
                pvArea.lockMarker.setPosition(bounds.getCenter());
            }
            
            // Update dimensions if shown - get current state
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            if (currentPVArea && currentPVArea.showDimensions) {
                Dimensions.update(currentPVArea);
            }
            
            // Update edge lines if they exist
            if (edgeLines && edgeLines.length >= 2) {
                edgeLines[0].setPath([currentPath.getAt(0), currentPath.getAt(1)]);
                edgeLines[1].setPath([currentPath.getAt(2), currentPath.getAt(3)]);
            }
            
            // Update rotation marker position
            if (pvArea.enhancedElements && pvArea.enhancedElements.rotationMarker) {
                const center = new google.maps.LatLng(
                    (currentPath.getAt(0).lat() + currentPath.getAt(1).lat() + currentPath.getAt(2).lat() + currentPath.getAt(3).lat()) / 4,
                    (currentPath.getAt(0).lng() + currentPath.getAt(1).lng() + currentPath.getAt(2).lng() + currentPath.getAt(3).lng()) / 4
                );
                pvArea.enhancedElements.rotationMarker.setPosition(center);
            }
        });
        
        // Add dragend listener to recalculate reference height
        google.maps.event.addListener(polygon, 'dragend', function() {
            if (pvArea.autoCalculateReferenceHeight) {
                window.PVListRenderer.calculateReferenceHeight(pvArea.id);
            }
            
            // Recalculate perpendicular distance
            PolygonEnhancer._updatePerpendicularDistance(pvArea);
        });
        
        // Create rotation marker for roof-parallel
        if (editingMode === 'roof-parallel' && path.getLength() === 4) {
            createRotationMarker();
        }
        
        function createRotationMarker() {
            const center = new google.maps.LatLng(
                (path.getAt(0).lat() + path.getAt(1).lat() + path.getAt(2).lat() + path.getAt(3).lat()) / 4,
                (path.getAt(0).lng() + path.getAt(1).lng() + path.getAt(2).lng() + path.getAt(3).lng()) / 4
            );
            
            const rotationMarker = new google.maps.Marker({
                position: center,
                map: map,
                draggable: false,
                cursor: 'grab',
                icon: {
                    path: 'M -8,0 A 8,8 0 0,1 0,-8 M 0,-8 L 2,-10 L 0,-6 L -2,-10 L 0,-8 M 8,0 A 8,8 0 0,1 0,8 M 0,8 L -2,10 L 0,6 L 2,10 L 0,8',
                    scale: 0.8,
                    fillColor: 'transparent',
                    fillOpacity: 0,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2.5,
                    anchor: new google.maps.Point(0, 0)
                },
                zIndex: 998
            });
            
            // Setup rotation handling
            setupRotationHandler(rotationMarker);
            
            // Store for cleanup
            pvArea.enhancedElements.rotationMarker = rotationMarker;
        }
        
        function setupRotationHandler(rotationMarker) {
            let isDragging = false;
            let originalPoints = [];
            let originalCenter = null;
            let azimuthArrow = null;
            let azimuthLabel = null;
            
            // Calculate geometric azimuth
            function calculateGeometricAzimuth() {
                const currentPath = polygon.getPath();
                const p1 = currentPath.getAt(0);
                const p2 = currentPath.getAt(1);
                const p3 = currentPath.getAt(2);
                const p4 = currentPath.getAt(3);
                
                // Calculate bearing from P1 to P2
                const lat1 = p1.lat() * Math.PI / 180;
                const lat2 = p2.lat() * Math.PI / 180;
                const dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
                
                const y = Math.sin(dLon) * Math.cos(lat2);
                const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                
                let bearingP1P2 = Math.atan2(y, x) * 180 / Math.PI;
                bearingP1P2 = (bearingP1P2 + 360) % 360;
                
                // Get center of edges
                const centerP1P2 = {
                    lat: (p1.lat() + p2.lat()) / 2,
                    lng: (p1.lng() + p2.lng()) / 2
                };
                
                const centerP3P4 = {
                    lat: (p3.lat() + p4.lat()) / 2,
                    lng: (p3.lng() + p4.lng()) / 2
                };
                
                // Calculate bearing from center of P1-P2 to center of P3-P4
                const latC1 = centerP1P2.lat * Math.PI / 180;
                const latC2 = centerP3P4.lat * Math.PI / 180;
                const dLonC = (centerP3P4.lng - centerP1P2.lng) * Math.PI / 180;
                
                const yC = Math.sin(dLonC) * Math.cos(latC2);
                const xC = Math.cos(latC1) * Math.sin(latC2) - Math.sin(latC1) * Math.cos(latC2) * Math.cos(dLonC);
                
                let bearingToOpposite = Math.atan2(yC, xC) * 180 / Math.PI;
                bearingToOpposite = (bearingToOpposite + 360) % 360;
                
                // The two possible perpendiculars to P1-P2
                const perpendicular1 = (bearingP1P2 + 90) % 360;
                const perpendicular2 = (bearingP1P2 - 90 + 360) % 360;
                
                // Calculate angular difference
                const diff1 = Math.abs(((perpendicular1 - bearingToOpposite + 540) % 360) - 180);
                const diff2 = Math.abs(((perpendicular2 - bearingToOpposite + 540) % 360) - 180);
                
                // Choose the perpendicular that points towards the opposite edge
                const azimuth = diff1 < diff2 ? perpendicular1 : perpendicular2;
                
                return azimuth;
            }
            
            google.maps.event.addListener(rotationMarker, 'mousedown', function(e) {
                isDragging = true;
                rotationMarker.setOptions({ cursor: 'grabbing' });
                
                // Save original points and center
                originalPoints = [];
                const currentPath = polygon.getPath();
                for (let i = 0; i < 4; i++) {
                    originalPoints.push({
                        lat: currentPath.getAt(i).lat(),
                        lng: currentPath.getAt(i).lng()
                    });
                }
                
                originalCenter = {
                    lat: rotationMarker.getPosition().lat(),
                    lng: rotationMarker.getPosition().lng()
                };
                
                // Hide rotation symbol
                rotationMarker.setVisible(false);
                
                // Create azimuth arrow
                const center = rotationMarker.getPosition();
                const currentAzimuth = calculateGeometricAzimuth();
                const arrowLength = google.maps.geometry.spherical.computeDistanceBetween(center, e.latLng);
                const initialArrowEnd = google.maps.geometry.spherical.computeOffset(center, arrowLength, currentAzimuth);
                
                azimuthArrow = new google.maps.Polyline({
                    path: [center, initialArrowEnd],
                    strokeColor: '#FF0000',
                    strokeWeight: 3,
                    strokeOpacity: 0.8,
                    map: map,
                    zIndex: 999,
                    icons: [{
                        icon: {
                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            scale: 4,
                            fillColor: '#FF0000',
                            fillOpacity: 0.8,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 1
                        },
                        offset: '100%'
                    }]
                });
                
                // Create azimuth label
                azimuthLabel = new google.maps.Marker({
                    position: initialArrowEnd,
                    map: map,
                    label: {
                        text: currentAzimuth.toFixed(1) + '°',
                        color: '#FFFFFF',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        fontFamily: 'Arial, sans-serif'
                    },
                    icon: {
                        path: 'M -30,-10 L 30,-10 L 30,10 L -30,10 Z',
                        fillColor: '#000000',
                        fillOpacity: 0.7,
                        strokeColor: '#000000',
                        strokeWeight: 3,
                        scale: 1,
                        labelOrigin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(-40, -20)
                    },
                    zIndex: 1000
                });
                
                e.stop();
            });
            
            // Mouse move handler
            google.maps.event.addListener(map, 'mousemove', function(e) {
                if (isDragging && azimuthArrow && azimuthLabel && originalCenter) {
                    const centerLatLng = new google.maps.LatLng(originalCenter.lat, originalCenter.lng);
                    
                    // Work in pixel space for accurate rotation
                    const projection = map.getProjection();
                    const zoom = map.getZoom();
                    const scale = Math.pow(2, zoom);
                    
                    // Convert center and mouse to pixel coordinates
                    const centerPixel = projection.fromLatLngToPoint(centerLatLng);
                    const mousePixel = projection.fromLatLngToPoint(e.latLng);
                    centerPixel.x *= scale; centerPixel.y *= scale;
                    mousePixel.x *= scale; mousePixel.y *= scale;
                    
                    // Calculate desired direction in pixel space
                    const desiredDirPixel = {
                        x: mousePixel.x - centerPixel.x,
                        y: mousePixel.y - centerPixel.y
                    };
                    const desiredDirLength = Math.sqrt(desiredDirPixel.x * desiredDirPixel.x + desiredDirPixel.y * desiredDirPixel.y);
                    desiredDirPixel.x /= desiredDirLength;
                    desiredDirPixel.y /= desiredDirLength;
                    
                    // Convert original points to pixel space
                    const originalPixelPoints = originalPoints.map(p => {
                        const pixel = projection.fromLatLngToPoint(new google.maps.LatLng(p.lat, p.lng));
                        return { x: pixel.x * scale, y: pixel.y * scale };
                    });
                    
                    // Calculate initial w direction in pixel space
                    const v0Pixel = {
                        x: originalPixelPoints[1].x - originalPixelPoints[0].x,
                        y: originalPixelPoints[1].y - originalPixelPoints[0].y
                    };
                    const d0Pixel = {
                        x: originalPixelPoints[2].x - originalPixelPoints[0].x,
                        y: originalPixelPoints[2].y - originalPixelPoints[0].y
                    };
                    
                    // Project d onto v to get w
                    const dot0 = d0Pixel.x * v0Pixel.x + d0Pixel.y * v0Pixel.y;
                    const v0LengthSq = v0Pixel.x * v0Pixel.x + v0Pixel.y * v0Pixel.y;
                    const proj0 = { x: (dot0 / v0LengthSq) * v0Pixel.x, y: (dot0 / v0LengthSq) * v0Pixel.y };
                    const w0Pixel = { x: d0Pixel.x - proj0.x, y: d0Pixel.y - proj0.y };
                    const w0Length = Math.sqrt(w0Pixel.x * w0Pixel.x + w0Pixel.y * w0Pixel.y);
                    w0Pixel.x /= w0Length;
                    w0Pixel.y /= w0Length;
                    
                    // Calculate rotation angle in pixel space
                    const crossProduct = w0Pixel.x * desiredDirPixel.y - w0Pixel.y * desiredDirPixel.x;
                    const dotProduct = w0Pixel.x * desiredDirPixel.x + w0Pixel.y * desiredDirPixel.y;
                    const rotationAngle = Math.atan2(crossProduct, dotProduct);
                    
                    // Apply rotation in pixel space
                    const cosR = Math.cos(rotationAngle);
                    const sinR = Math.sin(rotationAngle);
                    
                    for (let i = 0; i < 4; i++) {
                        const dx = originalPixelPoints[i].x - centerPixel.x;
                        const dy = originalPixelPoints[i].y - centerPixel.y;
                        
                        const rotatedX = dx * cosR - dy * sinR + centerPixel.x;
                        const rotatedY = dx * sinR + dy * cosR + centerPixel.y;
                        
                        // Convert back to lat/lng
                        const point = projection.fromPointToLatLng(new google.maps.Point(rotatedX / scale, rotatedY / scale));
                        polygon.getPath().setAt(i, point);
                    }
                    
                    // Calculate actual azimuth from w vector
                    const currentPath = polygon.getPath();
                    const p1 = currentPath.getAt(0);
                    const p2 = currentPath.getAt(1);
                    const p3 = currentPath.getAt(2);
                    
                    // Calculate v (direction along edge P1-P2)
                    const v = {
                        lat: p2.lat() - p1.lat(),
                        lng: p2.lng() - p1.lng()
                    };
                    
                    // Calculate d (from P1 to P3)
                    const d = {
                        lat: p3.lat() - p1.lat(),
                        lng: p3.lng() - p1.lng()
                    };
                    
                    // Project d onto v
                    const dot_d_v = d.lat * v.lat + d.lng * v.lng;
                    const dot_v_v = v.lat * v.lat + v.lng * v.lng;
                    const scalar = dot_d_v / dot_v_v;
                    
                    const proj_d_on_v = {
                        lat: scalar * v.lat,
                        lng: scalar * v.lng
                    };
                    
                    // w = d - proj_d_on_v
                    const w = {
                        lat: d.lat - proj_d_on_v.lat,
                        lng: d.lng - proj_d_on_v.lng
                    };
                    
                    // Normalize w for azimuth calculation
                    const w_length = Math.sqrt(w.lat * w.lat + w.lng * w.lng);
                    
                    // Draw arrow to mouse
                    azimuthArrow.setPath([centerLatLng, e.latLng]);
                    
                    // Calculate actual azimuth
                    const actualAzimuth = Math.atan2(w.lng / w_length, w.lat / w_length) * 180 / Math.PI;
                    const normalizedAzimuth = (actualAzimuth + 360) % 360;
                    
                    // Update label
                    azimuthLabel.setPosition(e.latLng);
                    azimuthLabel.setLabel({
                        text: normalizedAzimuth.toFixed(1) + '°',
                        color: '#FFFFFF',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        fontFamily: 'Arial, sans-serif'
                    });
                    
                    // Update PV area azimuth
                    if (pvArea.azimuth !== undefined) {
                        pvArea.azimuth = Math.round(normalizedAzimuth * 10) / 10;
                        StateManager.updatePVArea(pvArea.id, { azimuth: pvArea.azimuth });
                    }
                    
                    // Update all visual elements
                    updateAllElements();
                }
            });
            
            // Mouse up handler
            const mouseUpHandler = function(e) {
                if (isDragging) {
                    isDragging = false;
                    rotationMarker.setOptions({ cursor: 'grab' });
                    rotationMarker.setVisible(true);
                    
                    // Clean up arrow and label
                    if (azimuthArrow) {
                        azimuthArrow.setMap(null);
                        azimuthArrow = null;
                    }
                    if (azimuthLabel) {
                        azimuthLabel.setMap(null);
                        azimuthLabel = null;
                    }
                    
                    // Recalculate reference height if auto-calculate is enabled
                    if (pvArea.autoCalculateReferenceHeight) {
                        window.PVListRenderer.calculateReferenceHeight(pvArea.id);
                    }
                    
                    // Recalculate perpendicular distance
                    PolygonEnhancer._updatePerpendicularDistance(pvArea);
                }
            };
            
            // Use both map and document listeners for reliability
            google.maps.event.addListener(map, 'mouseup', mouseUpHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        }
        
        function updateAllElements() {
            const currentPath = polygon.getPath();
            
            // Get current PV area state
            const currentPVArea = StateManager.getPVArea(pvArea.id) || pvArea;
            
            // Update vertex markers and double arrows
            markers.forEach((marker, index) => {
                if (index < currentPath.getLength()) {
                    const newPos = currentPath.getAt(index);
                    marker.setPosition(newPos);
                    
                    // Update double arrow
                    if (marker.doubleArrowMarker) {
                        marker.doubleArrowMarker.setPosition(newPos);
                        
                        // Recalculate rotation
                        const otherIndex = (index === 0) ? 1 : (index === 1) ? 0 : (index === 2) ? 3 : 2;
                        const p1 = currentPath.getAt(index);
                        const p2 = currentPath.getAt(otherIndex);
                        const edgeDir = {
                            lat: p2.lat() - p1.lat(),
                            lng: p2.lng() - p1.lng()
                        };
                        const angle = Math.atan2(edgeDir.lng, edgeDir.lat) * 180 / Math.PI + 90;
                        
                        const currentIcon = marker.doubleArrowMarker.getIcon();
                        currentIcon.rotation = angle;
                        marker.doubleArrowMarker.setIcon(currentIcon);
                    }
                }
            });
            
            // Update edge lines
            if (edgeLines.length >= 2) {
                edgeLines[0].setPath([currentPath.getAt(0), currentPath.getAt(1)]);
                edgeLines[1].setPath([currentPath.getAt(2), currentPath.getAt(3)]);
            }
            
            // Update edge move markers
            updateEdgeMoveMarkers();
            
            // Update rotation marker position
            if (pvArea.enhancedElements.rotationMarker) {
                const center = new google.maps.LatLng(
                    (currentPath.getAt(0).lat() + currentPath.getAt(1).lat() + currentPath.getAt(2).lat() + currentPath.getAt(3).lat()) / 4,
                    (currentPath.getAt(0).lng() + currentPath.getAt(1).lng() + currentPath.getAt(2).lng() + currentPath.getAt(3).lng()) / 4
                );
                pvArea.enhancedElements.rotationMarker.setPosition(center);
            }
            
            // Update dimensions if shown - use the current state we already fetched
            if (currentPVArea && currentPVArea.showDimensions) {
                Dimensions.update(currentPVArea);
            }
        }
        
        // Update the enhanced elements with the created elements
        pvArea.enhancedElements.markers = markers;
        pvArea.enhancedElements.edgeMoveMarkers = edgeMoveMarkers;
        pvArea.enhancedElements.doubleArrows = markers.filter(m => m.doubleArrowMarker).map(m => m.doubleArrowMarker);
        
        // Store enhanced elements on polygon for cleanup during deletion
        if (polygon) {
            polygon.enhancedElements = pvArea.enhancedElements;
        }
        
        // Update state with enhancedElements reference
        if (pvArea.id) {
            StateManager.updatePVArea(pvArea.id, { enhancedElements: pvArea.enhancedElements });
        }
    },
    
    /**
     * Remove all enhancements
     */
    removeEnhancements(pvArea) {
        if (pvArea.enhancedElements) {
            // Remove all markers
            if (pvArea.enhancedElements.markers) {
                pvArea.enhancedElements.markers.forEach(m => {
                    if (m.doubleArrowMarker) m.doubleArrowMarker.setMap(null);
                    m.setMap(null);
                });
            }
            
            // Remove edge move markers
            if (pvArea.enhancedElements.edgeMoveMarkers) {
                pvArea.enhancedElements.edgeMoveMarkers.forEach(m => m.setMap(null));
            }
            
            // Remove rotation marker
            if (pvArea.enhancedElements.rotationMarker) {
                pvArea.enhancedElements.rotationMarker.setMap(null);
            }
            
            pvArea.enhancedElements = null;
        }
        
        // Remove edge lines (turquoise and orange) - these are stored separately
        if (pvArea.edgeLines) {
            pvArea.edgeLines.forEach(line => line.setMap(null));
            pvArea.edgeLines = null;
        }
    },
    
    /**
     * Update perpendicular distance for a PV area
     */
    _updatePerpendicularDistance(pvArea) {
        if (!pvArea.polygon || pvArea.type !== 'roof-parallel') return;
        
        const path = pvArea.polygon.getPath();
        if (path.getLength() !== 4) return;
        
        // Get all four points
        const p1 = path.getAt(0);
        const p2 = path.getAt(1);
        const p3 = path.getAt(2);
        const p4 = path.getAt(3);
        
        // Get direction of top edge
        const topBearing = google.maps.geometry.spherical.computeHeading(p1, p2);
        
        // Find perpendicular direction
        const perpBearing = topBearing + 90;
        
        // Calculate perpendicular distance by projecting P3 onto the perpendicular direction from P1
        const directDist13 = google.maps.geometry.spherical.computeDistanceBetween(p1, p3);
        const bearing13 = google.maps.geometry.spherical.computeHeading(p1, p3);
        const angleDiff = Math.abs(bearing13 - perpBearing) * Math.PI / 180;
        const perpDistance = directDist13 * Math.cos(angleDiff);
        
        const roundedDistance = Math.round(perpDistance * 10) / 10; // Round to 0.1m
        
        // Update state
        StateManager.updatePVArea(pvArea.id, { perpendicularDistance: roundedDistance });
        
        // Trigger auto-calculation if enabled
        const updatedPvArea = StateManager.getPVArea(pvArea.id);
        if (updatedPvArea && updatedPvArea.autoCalculateField) {
            window.PVListRenderer.calculateAutoField(updatedPvArea);
        }
    }
};

export default PolygonEnhancer;