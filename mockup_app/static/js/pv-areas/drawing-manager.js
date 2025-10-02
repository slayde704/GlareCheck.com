/**
 * Drawing Manager Module
 * Handles drawing of PV areas on the map
 */

import { MapManager } from '../core/map-manager.js';
import { StateManager } from '../core/state-manager.js';
import { UIManager } from '../ui/ui-manager.js';
import { GeometryUtils } from '../utils/geometry.js';
import { PolygonEnhancer } from './polygon-enhancer.js';
import { Dimensions } from './dimensions.js';

export const DrawingManager = {
    // Current drawing state
    _currentDrawingType: null,
    _currentPVType: null,  // Store the actual PV type (roof-mounted, ground, etc.)
    _tempMarkers: [],
    _tempLines: [],
    _tempPolygon: null,
    _clickListener: null,
    _dblClickListener: null,
    _mouseMoveListener: null,
    _rightClickListener: null,
    _drawingPoints: [],
    
    // Drawing types
    TYPES: {
        RECTANGLE: 'rectangle',
        PARALLELOGRAM: 'parallelogram', 
        ROOF_PARALLEL: 'roof-parallel',
        FACADE: 'facade',
        FIELD: 'field',
        FREEFORM: 'freeform'
    },

    /**
     * Start drawing a PV area
     * @param {string} type - Type of drawing mode (RECTANGLE, FREEFORM, etc.)
     * @param {string} pvType - Actual PV type (roof-mounted, ground, etc.)
     */
    startDrawing(type, pvType) {
        // Cancel any existing drawing
        this.cancelDrawing();
        
        this._currentDrawingType = type;
        this._currentPVType = pvType || type;  // Use pvType if provided, otherwise fallback to type
        
        // Show instructions based on type
        this._showInstructions(type);
        
        // Set up drawing based on type
        switch(type) {
            case this.TYPES.RECTANGLE:
                this._startRectangleDrawing();
                break;
            case this.TYPES.PARALLELOGRAM:
                this._startParallelogramDrawing();
                break;
            case this.TYPES.ROOF_PARALLEL:
                this._startRoofParallelDrawing();
                break;
            case this.TYPES.FACADE:
                this._startFacadeDrawing();
                break;
            case this.TYPES.FIELD:
                this._startFieldDrawing();
                break;
            case this.TYPES.FREEFORM:
                this._startFreeformDrawing();
                break;
        }
    },

    /**
     * Show drawing instructions
     */
    _showInstructions(type) {
        // Instructions are now shown in the modal before starting
        // This method is kept for backward compatibility but does nothing
    },

    /**
     * Start rectangle drawing (3 clicks)
     */
    _startRectangleDrawing() {
        this._drawingPoints = [];
        let tempDimensionLabels = [];
        let previewLine = null;
        let previewPolygon = null;
        
        // Helper to clear dimension labels
        const clearDimensionLabels = () => {
            tempDimensionLabels.forEach(label => label.setMap(null));
            tempDimensionLabels = [];
        };
        
        // Helper to create dimension label with text shadow
        const createDimensionLabel = (p1, p2, isPreview = false) => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
            const midLat = (p1.lat() + p2.lat()) / 2;
            const midLng = (p1.lng() + p2.lng()) / 2;
            const midPoint = new google.maps.LatLng(midLat, midLng);
            
            // Create a custom overlay for better text styling
            class DimensionLabelOverlay extends google.maps.OverlayView {
                constructor(position, text) {
                    super();
                    this.position = position;
                    this.text = text;
                    this.div = null;
                    this.setMap(MapManager.getMap());
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
                    
                    if (position) {
                        this.div.style.left = position.x + 'px';
                        this.div.style.top = position.y + 'px';
                    }
                }
                
                onRemove() {
                    if (this.div) {
                        this.div.parentNode.removeChild(this.div);
                        this.div = null;
                    }
                }
            }
            
            const label = new DimensionLabelOverlay(midPoint, `${distance.toFixed(1)} m`);
            return label;
        };
        
        // Mouse move listener for preview
        this._mouseMoveListener = google.maps.event.addListener(MapManager.getMap(), 'mousemove', (event) => {
            const mousePoint = event.latLng;
            
            if (this._drawingPoints.length === 1) {
                // Clear previous preview
                clearDimensionLabels();
                if (previewLine) previewLine.setMap(null);
                
                // Draw preview line
                previewLine = new google.maps.Polyline({
                    path: [this._drawingPoints[0], mousePoint],
                    strokeColor: '#4274a5',
                    strokeWeight: 2,
                    strokeOpacity: 0.5
                });
                previewLine.setMap(MapManager.getMap());
                
                // Show distance
                const label = createDimensionLabel(this._drawingPoints[0], mousePoint, true);
                tempDimensionLabels.push(label);
                
            } else if (this._drawingPoints.length === 2) {
                // Clear previous preview
                clearDimensionLabels();
                if (previewPolygon) previewPolygon.setMap(null);
                if (previewLine) previewLine.setMap(null);
                
                // Calculate fourth point
                const p4 = GeometryUtils.calculateRectangle(
                    this._drawingPoints[0],
                    this._drawingPoints[1],
                    mousePoint
                );
                
                // Draw preview polygon
                previewPolygon = new google.maps.Polygon({
                    paths: [this._drawingPoints[0], this._drawingPoints[1], mousePoint, p4],
                    fillColor: '#4274a5',
                    fillOpacity: 0.2,
                    strokeColor: '#4274a5',
                    strokeWeight: 2,
                    strokeOpacity: 0.5
                });
                previewPolygon.setMap(MapManager.getMap());
                
                // Show all edge distances
                const edges = [
                    [this._drawingPoints[0], this._drawingPoints[1], false], // Fixed edge
                    [this._drawingPoints[1], mousePoint, true], // Preview edge
                    [mousePoint, p4, true], // Preview edge
                    [p4, this._drawingPoints[0], true] // Preview edge
                ];
                
                edges.forEach(([p1, p2, isPreview]) => {
                    const label = createDimensionLabel(p1, p2, isPreview);
                    tempDimensionLabels.push(label);
                });
            }
        });
        
        this._clickListener = google.maps.event.addListener(MapManager.getMap(), 'click', (event) => {
            const point = event.latLng;
            this._drawingPoints.push(point);
            
            // Add marker with number
            const marker = new google.maps.Marker({
                position: point,
                map: MapManager.getMap(),
                label: {
                    text: this._drawingPoints.length.toString(),
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4274a5',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2
                }
            });
            this._tempMarkers.push(marker);
            
            // Draw lines between points
            if (this._drawingPoints.length > 1) {
                const line = new google.maps.Polyline({
                    path: [
                        this._drawingPoints[this._drawingPoints.length - 2],
                        this._drawingPoints[this._drawingPoints.length - 1]
                    ],
                    strokeColor: '#4274a5',
                    strokeWeight: 2,
                    strokeOpacity: 0.8
                });
                line.setMap(MapManager.getMap());
                this._tempLines.push(line);
            }
            
            // On third click, calculate fourth point and complete
            if (this._drawingPoints.length === 3) {
                // Clear preview elements
                clearDimensionLabels();
                if (previewPolygon) previewPolygon.setMap(null);
                if (previewLine) previewLine.setMap(null);
                
                // Remove mouse move listener
                if (this._mouseMoveListener) {
                    google.maps.event.removeListener(this._mouseMoveListener);
                    this._mouseMoveListener = null;
                }
                
                const p4 = GeometryUtils.calculateRectangle(
                    this._drawingPoints[0],
                    this._drawingPoints[1],
                    this._drawingPoints[2]
                );
                this._drawingPoints.push(p4);
                this._completePolygon('tilted');
            }
        });
    },

    /**
     * Start parallelogram drawing (3 clicks)
     */
    _startParallelogramDrawing() {
        this._drawingPoints = [];
        
        this._clickListener = MapManager.on('click', (event) => {
            const point = event.latLng;
            this._drawingPoints.push(point);
            
            // Add marker
            const marker = MapManager.createMarker(point, {
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4274a5',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2
                },
                draggable: false
            });
            this._tempMarkers.push(marker);
            
            // Draw preview
            this._updateParallelogramPreview();
            
            // On third click, complete
            if (this._drawingPoints.length === 3) {
                // Fourth point for parallelogram
                const p4 = new google.maps.LatLng(
                    this._drawingPoints[0].lat() + this._drawingPoints[2].lat() - this._drawingPoints[1].lat(),
                    this._drawingPoints[0].lng() + this._drawingPoints[2].lng() - this._drawingPoints[1].lng()
                );
                this._drawingPoints.push(p4);
                this._completePolygon(this._currentPVType || 'field');
            }
        });
    },

    /**
     * Start roof-parallel drawing (3 clicks)
     */
    _startRoofParallelDrawing() {
        const map = MapManager.getMap();
        const points = [];
        let tempMarkers = [];
        let tempPolyline = null;
        let tempPolygon = null;
        
        // Set cursor and disable other interactions
        map.setOptions({ 
            draggableCursor: 'crosshair',
            draggingCursor: 'crosshair',
            disableDoubleClickZoom: true
        });
        
        // Close instruction modal if open
        const instructionsModal = bootstrap.Modal.getInstance(document.getElementById('drawingInstructionsModal'));
        if (instructionsModal) instructionsModal.hide();
        
        // Click listener with high priority
        const clickListener = google.maps.event.addListenerOnce(map, 'click', function handler(e) {
            // Prevent any conflicts
            if (e.stop) e.stop();
            
            points.push(e.latLng);
            
            // Add numbered marker at click point
            const marker = new google.maps.Marker({
                position: e.latLng,
                map: map,
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
                google.maps.event.addListenerOnce(map, 'click', handler);
            } else if (points.length === 2) {
                // Draw line between first two points in turquoise
                if (tempPolyline) tempPolyline.setMap(null);
                tempPolyline = new google.maps.Polyline({
                    path: points,
                    strokeColor: '#00CED1',  // Turquoise
                    strokeWeight: 4,  // Thicker line
                    map: map,
                    clickable: false,
                    zIndex: 999
                });
                // Re-register for final click
                google.maps.event.addListenerOnce(map, 'click', handler);
            } else if (points.length === 3) {
                // Complete parallelogram immediately
                google.maps.event.removeListener(moveListener);
                map.setOptions({ 
                    draggableCursor: null,
                    draggingCursor: null,
                    disableDoubleClickZoom: false
                });
                
                // Clean up temporary elements (but keep markers for a moment)
                if (tempPolyline) tempPolyline.setMap(null);
                if (tempPolygon) tempPolygon.setMap(null);
                if (window.tempPolyline2) {
                    window.tempPolyline2.setMap(null);
                    window.tempPolyline2 = null;
                }
                clearDimensionLabels();
                
                // Create final parallelogram
                const p4 = GeometryUtils.calculateRectangle(points[0], points[1], points[2]);
                const parallelogramPoints = [points[0], points[1], points[2], p4];
                
                // Add marker for 4th point
                const marker4 = new google.maps.Marker({
                    position: p4,
                    map: map,
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
                
                // Store drawing points for module
                DrawingManager._drawingPoints = parallelogramPoints;
                
                // Complete the polygon - this will create the polygon with all features
                DrawingManager._completePolygon('roof-parallel');
                
                // Clean up ESC handler
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        // Store dimension labels
        let tempDimensionLabels = [];
        
        // Helper function to clear dimension labels
        const clearDimensionLabels = () => {
            tempDimensionLabels.forEach(label => label.setMap(null));
            tempDimensionLabels = [];
        };
        
        // Helper function to create dimension label with text shadow
        const createDimensionLabel = (p1, p2, isPreview = false) => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
            const midLat = (p1.lat() + p2.lat()) / 2;
            const midLng = (p1.lng() + p2.lng()) / 2;
            const midPoint = new google.maps.LatLng(midLat, midLng);
            
            // Create a custom overlay for better text styling
            class DimensionLabelOverlay extends google.maps.OverlayView {
                constructor(position, text) {
                    super();
                    this.position = position;
                    this.text = text;
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
                    
                    if (position) {
                        this.div.style.left = position.x + 'px';
                        this.div.style.top = position.y + 'px';
                    }
                }
                
                onRemove() {
                    if (this.div) {
                        this.div.parentNode.removeChild(this.div);
                        this.div = null;
                    }
                }
            }
            
            const label = new DimensionLabelOverlay(midPoint, `${distance.toFixed(1)} m`);
            return label;
        };
        
        // Mouse move listener for preview
        const moveListener = google.maps.event.addListener(map, 'mousemove', function(e) {
            if (points.length === 1) {
                // Clear previous preview labels
                clearDimensionLabels();
                
                // Preview line in turquoise
                if (tempPolyline) tempPolyline.setMap(null);
                tempPolyline = new google.maps.Polyline({
                    path: [points[0], e.latLng],
                    strokeColor: '#00CED1',  // Turquoise
                    strokeWeight: 4,  // Thicker line
                    strokeOpacity: 0.6,
                    map: map,
                    clickable: false,
                    zIndex: 998
                });
                
                // Show distance for the preview line
                const previewLabel = createDimensionLabel(points[0], e.latLng, true);
                tempDimensionLabels.push(previewLabel);
                
            } else if (points.length === 2) {
                // Clear previous preview labels
                clearDimensionLabels();
                
                // Preview parallelogram with mouse at point 3 (opposite corner from p2)
                if (tempPolygon) tempPolygon.setMap(null);
                // Don't remove tempPolyline here - we want to keep the turquoise line visible!
                
                // Calculate the preview parallelogram
                const p4Preview = GeometryUtils.calculateRectangle(points[0], points[1], e.latLng);
                const previewPoints = [points[0], points[1], e.latLng, p4Preview];
                
                // Create parallelogram preview without stroke
                tempPolygon = new google.maps.Polygon({
                    paths: previewPoints,
                    fillColor: '#4274a5',
                    fillOpacity: 0.2,
                    strokeWeight: 0,  // No stroke to not interfere with colored lines
                    map: map,
                    clickable: false,
                    zIndex: 996
                });
                
                // Add preview of the orange line P3-P4
                if (window.tempPolyline2) window.tempPolyline2.setMap(null);
                window.tempPolyline2 = new google.maps.Polyline({
                    path: [previewPoints[2], previewPoints[3]],  // P3-P4
                    strokeColor: '#FF8C00',  // Orange
                    strokeWeight: 4,
                    strokeOpacity: 0.6,
                    map: map,
                    clickable: false,
                    zIndex: 998
                });
                
                // Show distances for all edges
                // Top edge (P1-P2) - already fixed
                const topLabel = createDimensionLabel(points[0], points[1], false);
                tempDimensionLabels.push(topLabel);
                
                // Right edge (P2-P3) - preview
                const rightLabel = createDimensionLabel(points[1], e.latLng, true);
                tempDimensionLabels.push(rightLabel);
                
                // Bottom edge (P3-P4) - preview
                const bottomLabel = createDimensionLabel(e.latLng, p4Preview, true);
                tempDimensionLabels.push(bottomLabel);
                
                // Left edge (P4-P1) - preview
                const leftLabel = createDimensionLabel(p4Preview, points[0], true);
                tempDimensionLabels.push(leftLabel);
            }
        });
        
        // ESC to cancel
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                google.maps.event.removeListener(clickListener);
                google.maps.event.removeListener(moveListener);
                document.removeEventListener('keydown', escHandler);
                map.setOptions({ 
                    draggableCursor: null,
                    draggingCursor: null,
                    disableDoubleClickZoom: false
                });
                
                // Clean up
                tempMarkers.forEach(m => m.setMap(null));
                if (tempPolyline) tempPolyline.setMap(null);
                if (tempPolygon) tempPolygon.setMap(null);
                if (window.tempPolyline2) {
                    window.tempPolyline2.setMap(null);
                    window.tempPolyline2 = null;
                }
                clearDimensionLabels();
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Store references for cleanup
        DrawingManager._clickListener = () => {
            google.maps.event.removeListener(clickListener);
            google.maps.event.removeListener(moveListener);
            document.removeEventListener('keydown', escHandler);
        };
        DrawingManager._mouseMoveListener = () => {};
        DrawingManager._tempMarkers = tempMarkers;
    },

    /**
     * Start facade drawing (2-point vertical line)
     */
    _startFacadeDrawing() {
        this._drawingPoints = [];
        let previewLine = null;
        let orangeLine = null;
        let dimensionOverlay = null;
        
        // Set cursor to crosshair
        const map = MapManager.getMap();
        map.setOptions({ draggableCursor: 'crosshair' });
        
        // Define DimensionOverlay class for preview
        class DimensionOverlay extends google.maps.OverlayView {
            constructor(position, text, map) {
                super();
                this.position = position;
                this.text = text;
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
                if (position) {
                    this.div.style.left = position.x + 'px';
                    this.div.style.top = position.y + 'px';
                }
            }
            
            onRemove() {
                if (this.div) {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            }
            
            updatePosition(position) {
                this.position = position;
                this.draw();
            }
            
            updateText(text) {
                this.text = text;
                if (this.div) {
                    this.div.textContent = text;
                }
            }
        }
        
        // Mouse move listener for preview
        this._mouseMoveListener = google.maps.event.addListener(map, 'mousemove', (event) => {
            if (this._drawingPoints.length === 1) {
                const mousePoint = event.latLng;
                
                // Update preview line
                if (previewLine) {
                    previewLine.setPath([this._drawingPoints[0], mousePoint]);
                } else {
                    previewLine = new google.maps.Polyline({
                        path: [this._drawingPoints[0], mousePoint],
                        strokeColor: '#4274a5',
                        strokeWeight: 3,
                        strokeOpacity: 0.6,
                        strokeDasharray: [5, 5],
                        clickable: false
                    });
                    previewLine.setMap(map);
                }
                
                // Update orange line preview (parallel to main line)
                if (orangeLine) {
                    orangeLine.setMap(null);
                }
                
                // Calculate perpendicular offset in pixels for orange line
                const projection = map.getProjection();
                if (projection) {
                    // Convert to pixels
                    const startPixel = projection.fromLatLngToPoint(this._drawingPoints[0]);
                    const endPixel = projection.fromLatLngToPoint(mousePoint);
                    
                    // Calculate perpendicular direction
                    const dx = endPixel.x - startPixel.x;
                    const dy = endPixel.y - startPixel.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length > 0) {
                        // Normalize and rotate 90 degrees (perpendicular)
                        const perpX = -dy / length;
                        const perpY = dx / length;
                        
                        // Apply pixel offset (3 pixels - sehr nah)
                        const pixelOffset = 3 / Math.pow(2, map.getZoom());
                        
                        // Calculate offset points
                        const offsetStartPixel = new google.maps.Point(
                            startPixel.x + perpX * pixelOffset,
                            startPixel.y + perpY * pixelOffset
                        );
                        const offsetEndPixel = new google.maps.Point(
                            endPixel.x + perpX * pixelOffset,
                            endPixel.y + perpY * pixelOffset
                        );
                        
                        // Convert back to lat/lng
                        const offsetStart = projection.fromPointToLatLng(offsetStartPixel);
                        const offsetEnd = projection.fromPointToLatLng(offsetEndPixel);
                        
                        // Create orange line
                        orangeLine = new google.maps.Polyline({
                            path: [offsetStart, offsetEnd],
                            strokeColor: '#FF8C00',
                            strokeWeight: 3,
                            strokeOpacity: 0.8,
                            clickable: false
                        });
                        orangeLine.setMap(map);
                    }
                }
                
                // Calculate and show distance
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    this._drawingPoints[0], mousePoint
                );
                
                // Calculate midpoint for dimension display
                const midLat = (this._drawingPoints[0].lat() + mousePoint.lat()) / 2;
                const midLng = (this._drawingPoints[0].lng() + mousePoint.lng()) / 2;
                let displayPoint = new google.maps.LatLng(midLat, midLng);
                
                // If distance is too small (< 5m), offset the label with pixel-based calculation
                if (distance < 5 && projection) {
                    // Convert points to pixels
                    const startPixel = projection.fromLatLngToPoint(this._drawingPoints[0]);
                    const endPixel = projection.fromLatLngToPoint(mousePoint);
                    const midPixel = projection.fromLatLngToPoint(displayPoint);
                    
                    // Calculate perpendicular direction
                    const dx = endPixel.x - startPixel.x;
                    const dy = endPixel.y - startPixel.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length > 0) {
                        // Normalize and rotate 90 degrees for perpendicular offset
                        const perpX = -dy / length;
                        const perpY = dx / length;
                        
                        // Apply pixel offset (20 pixels, scaled for zoom)
                        const pixelOffset = 20 / Math.pow(2, map.getZoom());
                        
                        // Calculate offset position
                        const offsetPixel = new google.maps.Point(
                            midPixel.x + perpX * pixelOffset,
                            midPixel.y + perpY * pixelOffset
                        );
                        
                        // Convert back to lat/lng
                        displayPoint = projection.fromPointToLatLng(offsetPixel);
                    }
                }
                
                // Update or create dimension overlay
                if (dimensionOverlay) {
                    dimensionOverlay.updatePosition(displayPoint);
                    dimensionOverlay.updateText(`${distance.toFixed(1)} m`);
                } else {
                    dimensionOverlay = new DimensionOverlay(
                        displayPoint,
                        `${distance.toFixed(1)} m`,
                        map
                    );
                }
            }
        });
        
        this._clickListener = MapManager.on('click', (event) => {
            const point = event.latLng;
            
            if (this._drawingPoints.length === 0) {
                // First point
                this._drawingPoints.push(point);
                
                // Add simple dot marker (smaller)
                const marker = new google.maps.Marker({
                    position: point,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 3,
                        fillColor: '#4274a5',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 1.5
                    },
                    draggable: false,
                    clickable: false
                });
                this._tempMarkers.push(marker);
                
            } else if (this._drawingPoints.length === 1) {
                // Second point - complete the facade
                this._drawingPoints.push(point);
                
                // Clean up preview elements BEFORE completing
                if (previewLine) {
                    previewLine.setMap(null);
                    previewLine = null;
                }
                if (orangeLine) {
                    orangeLine.setMap(null);
                    orangeLine = null;
                }
                if (dimensionOverlay) {
                    dimensionOverlay.setMap(null);
                    dimensionOverlay = null;
                }
                
                // Add end marker (smaller)
                const marker = new google.maps.Marker({
                    position: point,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 3,
                        fillColor: '#4274a5',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 1.5
                    },
                    draggable: false,
                    clickable: false
                });
                this._tempMarkers.push(marker);
                
                // Complete the facade - this will clean up everything else
                setTimeout(() => {
                    this._completeFacade();
                }, 50); // Small delay to ensure cleanup
            }
        });
        
        // ESC to cancel
        this._escListener = google.maps.event.addDomListener(document, 'keydown', (e) => {
            if (e.key === 'Escape') {
                if (previewLine) previewLine.setMap(null);
                if (orangeLine) orangeLine.setMap(null);
                if (dimensionOverlay) dimensionOverlay.setMap(null);
                
                // Reset cursor
                map.setOptions({ draggableCursor: null });
                
                this.cancelDrawing();
            }
        });
    },

    /**
     * Start freeform drawing
     */
    _startFreeformDrawing() {
        // Use Google Maps drawing manager for all freeform types
        MapManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        
        // Listen for completion
        const unsubscribe = MapManager.on('polygonComplete', (polygon) => {
            // Get path
            const path = polygon.getPath();
            const corners = [];
            
            path.forEach((latLng) => {
                corners.push({
                    lat: latLng.lat(),
                    lng: latLng.lng()
                });
            });
            
            // Use the stored PV type (roof-mounted, ground, etc.)
            const pvType = this._currentPVType || 'field';
            console.log('Creating PV area with type:', pvType);
            
            // Create PV area
            const pvArea = {
                type: pvType,
                corners: corners,
                name: '',
                azimuth: 180,
                tilt: pvType === 'roof-mounted' ? 10 : 0,  // Default tilt for roof-mounted
                moduleType: 0,
                autoCalculateReferenceHeight: pvType === 'roof-mounted' // Default to auto-calculate for roof-mounted
            };
            
            const newPVArea = StateManager.addPVArea(pvArea);
            newPVArea.polygon = polygon;

            // Update state with polygon reference
            StateManager.updatePVArea(newPVArea.id, { polygon: polygon });

            // Show height definition dialog for field installations
            if (pvType === 'field' || pvType === 'ground') {
                StateManager.updatePVArea(newPVArea.id, {
                    gridNeedsUpdate: true,
                    gridActive: false,
                    gridSpacing: 100,
                    autoCalculateTerrainHeights: true,
                    autoCalculateSupportHeights: true
                });

                // Show the height definition dialog
                setTimeout(() => {
                    this._showHeightDefinitionDialog(newPVArea.id);
                }, 500);
            }

            // Add click handler for selecting PV area
            MapManager.addPVAreaClickHandler(polygon, newPVArea.id);
            
            // Add simple white number labels for all types
            this._addCornerMarkers(newPVArea);
            
            // Add drag listener for dimensions and lock marker updates
            google.maps.event.addListener(polygon, 'drag', function() {
                const path = polygon.getPath();
                
                // Get the current PV area from state to ensure we have the latest data
                const currentPVArea = StateManager.getPVArea(newPVArea.id);
                if (!currentPVArea) return;
                
                // Update lock marker position if locked
                if (currentPVArea.locked && currentPVArea.lockMarker) {
                    const bounds = new google.maps.LatLngBounds();
                    for (let i = 0; i < path.getLength(); i++) {
                        bounds.extend(path.getAt(i));
                    }
                    currentPVArea.lockMarker.setPosition(bounds.getCenter());
                }
                
                // Update dimensions if shown
                if (currentPVArea.showDimensions) {
                    Dimensions.update(currentPVArea);
                }
            });
            
            // Success message removed - PV area is immediately visible
            UIManager.showPanel('pv-areas');
            
            // Cancel drawing mode and cleanup
            this.cancelDrawing();
            unsubscribe();
        });
    },

    /**
     * Update parallelogram preview
     */
    _updateParallelogramPreview() {
        if (this._drawingPoints.length >= 2) {
            if (this._tempPolygon) {
                this._tempPolygon.setMap(null);
            }
            
            const path = [...this._drawingPoints];
            
            // Add preview of where fourth point would be
            if (this._drawingPoints.length === 2) {
                // Show line from P1 to P2
                const line = new google.maps.Polyline({
                    path: path,
                    strokeColor: '#4274a5',
                    strokeWeight: 2,
                    strokeOpacity: 0.8,
                    strokeDasharray: [5, 5]
                });
                line.setMap(MapManager.getMap());
                this._tempLines.push(line);
            }
        }
    },

    /**
     * Complete polygon drawing
     */
    _completePolygon(type) {
        console.log('_completePolygon called with type:', type);
        // Remove temporary elements
        this._cleanup();
        
        // Create corners array
        const corners = this._drawingPoints.map(point => ({
            lat: point.lat(),
            lng: point.lng()
        }));
        
        // Calculate default azimuth based on polygon orientation
        const azimuth = this._calculateDefaultAzimuth(corners);
        
        // Mark all existing areas as not new
        StateManager.getAllPVAreas().forEach(pv => {
            if (pv.isNew) StateManager.updatePVArea(pv.id, { isNew: false });
        });
        
        // Create PV area without default name
        const pvArea = {
            type: type,
            corners: corners,
            name: '',
            azimuth: azimuth,
            tilt: type === 'facade' ? 90 : (type === 'roof-mounted' ? 30 : 0),
            moduleType: 0,
            isNew: true,
            autoCalculateAzimuth: type === 'roof-parallel',
            autoCalculateReferenceHeight: type === 'roof-parallel', // Default to auto-calculate for roof-parallel
            autoCalculateField: type === 'roof-parallel' ? 'tilt' : null, // Default to auto-calculate tilt for roof-parallel
            // Add default module heights for roof-mounted PV areas
            ...(type === 'roof-mounted' ? {
                moduleHeightBottom: 0.2,
                moduleHeightTop: 1.2
            } : {})
        };
        
        const newPVArea = StateManager.addPVArea(pvArea);
        
        // Create visual polygon
        const polygon = MapManager.createPolygon(corners, {
            fillColor: '#4274a5',
            fillOpacity: 0.35,
            strokeColor: '#4274a5',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            editable: false,  // Disable built-in editing for roof-parallel
            draggable: true
        });
        
        newPVArea.polygon = polygon;
        // Update state with polygon reference
        StateManager.updatePVArea(newPVArea.id, { polygon: polygon });
        
        // Add click listener for selecting PV area
        MapManager.addPVAreaClickHandler(polygon, newPVArea.id);
        
        // Add general drag listener for all polygon types (for dimensions and lock marker)
        google.maps.event.addListener(polygon, 'drag', function() {
            const path = polygon.getPath();
            
            // Get the current PV area from state to ensure we have the latest data
            const currentPVArea = StateManager.getPVArea(newPVArea.id);
            if (!currentPVArea) return;
            
            // Update lock marker position if locked
            if (currentPVArea.locked && currentPVArea.lockMarker) {
                const bounds = new google.maps.LatLngBounds();
                for (let i = 0; i < path.getLength(); i++) {
                    bounds.extend(path.getAt(i));
                }
                currentPVArea.lockMarker.setPosition(bounds.getCenter());
            }
            
            // Update dimensions if shown
            if (currentPVArea.showDimensions) {
                Dimensions.update(currentPVArea);
            }
        });
        
        // Add colored edges for roof-parallel
        if (type === 'roof-parallel' && corners.length === 4) {
            const map = MapManager.getMap();
            
            // Create turquoise top edge (P1-P2)
            const topEdge = new google.maps.Polyline({
                path: [
                    new google.maps.LatLng(corners[0].lat, corners[0].lng),
                    new google.maps.LatLng(corners[1].lat, corners[1].lng)
                ],
                strokeColor: '#00CED1',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                clickable: false,
                zIndex: 995
            });
            topEdge.setMap(map);
            
            // Create orange bottom edge (P3-P4)
            const bottomEdge = new google.maps.Polyline({
                path: [
                    new google.maps.LatLng(corners[2].lat, corners[2].lng),
                    new google.maps.LatLng(corners[3].lat, corners[3].lng)
                ],
                strokeColor: '#FF8C00',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                clickable: false,
                zIndex: 995
            });
            bottomEdge.setMap(map);
            
            // Store edges with the PV area AND on the polygon for cleanup
            newPVArea.edgeLines = [topEdge, bottomEdge];
            polygon.edgeLines = [topEdge, bottomEdge];  // Store on polygon for deletion
            
            // Update state with edgeLines reference
            StateManager.updatePVArea(newPVArea.id, { edgeLines: [topEdge, bottomEdge] });
            
            // Add drag listener to update edges when polygon moves (specific for roof-parallel)
            google.maps.event.addListener(polygon, 'drag', function() {
                const path = polygon.getPath();
                if (path.getLength() === 4) {
                    // Update edge lines
                    topEdge.setPath([path.getAt(0), path.getAt(1)]);
                    bottomEdge.setPath([path.getAt(2), path.getAt(3)]);
                }
                // Note: Lock marker and dimensions are already updated by the general drag listener
            });
            
            // Add dragend listener to recalculate reference height and perpendicular distance
            google.maps.event.addListener(polygon, 'dragend', function() {
                if (newPVArea.autoCalculateReferenceHeight) {
                    window.PVListRenderer.calculateReferenceHeight(newPVArea.id);
                }
                
                // Recalculate perpendicular distance
                const perpDistance = DrawingManager._calculatePerpendicularDistance(polygon);
                StateManager.updatePVArea(newPVArea.id, { perpendicularDistance: perpDistance });
            });
            
            // Add path change listeners
            const path = polygon.getPath();
            google.maps.event.addListener(path, 'set_at', function() {
                if (path.getLength() === 4) {
                    topEdge.setPath([path.getAt(0), path.getAt(1)]);
                    bottomEdge.setPath([path.getAt(2), path.getAt(3)]);
                    
                    // Recalculate perpendicular distance
                    const perpDistance = DrawingManager._calculatePerpendicularDistance(polygon);
                    StateManager.updatePVArea(newPVArea.id, { perpendicularDistance: perpDistance });
                }
            });
            
            // Calculate perpendicular distance
            const perpDistance = this._calculatePerpendicularDistance(polygon);
            newPVArea.perpendicularDistance = perpDistance;
            StateManager.updatePVArea(newPVArea.id, { perpendicularDistance: perpDistance });
            
            // Initialize height calculation fields
            newPVArea.heightTop = null;
            newPVArea.heightBottom = null;
            
            // Add enhanced editing features (includes corner markers with constraints for roof-parallel)
            PolygonEnhancer.enhance(newPVArea, true, 'roof-parallel');
            
            // Add simple white number labels after enhancement
            this._addCornerMarkers(newPVArea);
            
            // Calculate reference height if auto-calculate is enabled
            if (type === 'roof-parallel' && newPVArea.autoCalculateReferenceHeight !== false) {
                // Add a small delay to ensure DOM is ready
                setTimeout(() => {
                    window.PVListRenderer.calculateReferenceHeight(newPVArea.id);
                }, 1000);
            }
        } else if (type === 'roof-mounted') {
            // Make polygon editable so corners can be dragged
            newPVArea.polygon.setEditable(true);
            
            // Add simple white number labels
            this._addCornerMarkers(newPVArea);
            
            // Note: The dimension update listeners are already added in _addCornerMarkers
            // which includes live updates during dragging
            // No need to duplicate them here
        }
        
        // Switch to PV panel - success message removed
        UIManager.showPanel('pv-areas');
        
        this.cancelDrawing();
    },

    /**
     * Complete facade drawing
     */
    _completeFacade() {
        // Remove temporary elements
        this._cleanup();
        
        if (this._drawingPoints.length !== 2) return;
        
        // Create line points
        const points = this._drawingPoints.map(point => ({
            lat: point.lat(),
            lng: point.lng()
        }));
        
        // Calculate azimuth (perpendicular to the line, pointing to the right)
        const heading = google.maps.geometry.spherical.computeHeading(
            this._drawingPoints[0], 
            this._drawingPoints[1]
        );
        const azimuth = (heading + 90) % 360; // Right side is reflective
        
        // Mark all existing areas as not new
        StateManager.getAllPVAreas().forEach(pv => {
            if (pv.isNew) StateManager.updatePVArea(pv.id, { isNew: false });
        });
        
        // Create PV area
        const pvArea = {
            type: 'facade',
            facadeLine: points,
            corners: points, // For compatibility
            name: '',
            azimuth: azimuth,
            tilt: 90, // Default vertical (can be changed in UI)
            moduleType: 0,
            isNew: true,
            moduleHeightBottom: 0, // Ground level
            moduleHeightTop: 3.0, // Default 3m height
            autoCalculateReferenceHeight: true, // Enable auto-calculate by default
            autoCalculateAzimuth: true // Enable auto-calculate azimuth by default
        };
        
        const newPVArea = StateManager.addPVArea(pvArea);
        
        // Create main polyline (the actual PV line)
        // Note: NOT editable to prevent adding points in the middle
        // We'll add custom markers for the endpoints instead
        const polyline = MapManager.createPolyline(points, {
            strokeColor: '#4274a5',
            strokeWeight: 4,
            strokeOpacity: 0.9,
            editable: false,  // Prevent adding/removing points
            draggable: true
        });
        
        // Create orange line (parallel, offset to show reflective side) using pixel offset
        const map = MapManager.getMap();
        const projection = map.getProjection();
        let orangeLine = null;
        
        if (projection) {
            // Convert to pixels
            const startPixel = projection.fromLatLngToPoint(this._drawingPoints[0]);
            const endPixel = projection.fromLatLngToPoint(this._drawingPoints[1]);
            
            // Calculate perpendicular direction
            const dx = endPixel.x - startPixel.x;
            const dy = endPixel.y - startPixel.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                // Normalize and rotate 90 degrees (perpendicular)
                const perpX = -dy / length;
                const perpY = dx / length;
                
                // Apply pixel offset (3 pixels, scaled for zoom - sehr nah)
                const pixelOffset = 3 / Math.pow(2, map.getZoom());
                
                // Calculate offset points
                const offsetStartPixel = new google.maps.Point(
                    startPixel.x + perpX * pixelOffset,
                    startPixel.y + perpY * pixelOffset
                );
                const offsetEndPixel = new google.maps.Point(
                    endPixel.x + perpX * pixelOffset,
                    endPixel.y + perpY * pixelOffset
                );
                
                // Convert back to lat/lng
                const offsetStart = projection.fromPointToLatLng(offsetStartPixel);
                const offsetEnd = projection.fromPointToLatLng(offsetEndPixel);
                
                orangeLine = new google.maps.Polyline({
                    path: [offsetStart, offsetEnd],
                    strokeColor: '#FF8C00',
                    strokeWeight: 3,
                    strokeOpacity: 0.9,
                    editable: false,
                    draggable: false,
                    clickable: false
                });
                orangeLine.setMap(map);
            }
        }
        
        // Create draggable endpoint markers
        const endpointMarkers = [];
        for (let i = 0; i < 2; i++) {
            const marker = new google.maps.Marker({
                position: this._drawingPoints[i],
                map: map,
                draggable: true,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#ffffff',
                    fillOpacity: 1,
                    strokeColor: '#4274a5',
                    strokeWeight: 2
                },
                zIndex: 1000
            });
            
            // Update polyline when marker is dragged
            marker.addListener('drag', () => {
                const newPath = [
                    endpointMarkers[0].getPosition(),
                    endpointMarkers[1].getPosition()
                ];
                polyline.setPath(newPath);
                updateOrangeLine();
            });
            
            marker.addListener('dragend', () => {
                const newPath = [
                    endpointMarkers[0].getPosition(),
                    endpointMarkers[1].getPosition()
                ];
                polyline.setPath(newPath);
                updateOrangeLine();
                
                // Update state
                const corners = newPath.map(p => ({lat: p.lat(), lng: p.lng()}));
                StateManager.updatePVArea(newPVArea.id, { 
                    corners: corners,
                    facadeLine: corners
                });
                
                // Recalculate azimuth if auto-calculate is enabled
                if (newPVArea.autoCalculateAzimuth !== false) {
                    const heading = google.maps.geometry.spherical.computeHeading(newPath[0], newPath[1]);
                    let azimuth = (heading + 90) % 360;
                    if (azimuth < 0) azimuth += 360;
                    StateManager.updatePVArea(newPVArea.id, { azimuth: Math.round(azimuth) });
                }
            });
            
            endpointMarkers.push(marker);
        }
        
        // Store references
        newPVArea.polyline = polyline;
        newPVArea.orangeLine = orangeLine;
        newPVArea.endpointMarkers = endpointMarkers;
        
        // Update state
        StateManager.updatePVArea(newPVArea.id, { 
            polyline: polyline,
            orangeLine: orangeLine
        });
        
        // Helper function to update orange line with pixel offset
        const updateOrangeLine = () => {
            const path = polyline.getPath();
            if (path.getLength() === 2 && orangeLine) {
                const p0 = path.getAt(0);
                const p1 = path.getAt(1);
                
                const projection = map.getProjection();
                if (projection) {
                    // Convert to pixels
                    const startPixel = projection.fromLatLngToPoint(p0);
                    const endPixel = projection.fromLatLngToPoint(p1);
                    
                    // Calculate perpendicular direction
                    const dx = endPixel.x - startPixel.x;
                    const dy = endPixel.y - startPixel.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length > 0) {
                        // Normalize and rotate 90 degrees (perpendicular)
                        const perpX = -dy / length;
                        const perpY = dx / length;
                        
                        // Apply pixel offset (3 pixels, scaled for zoom)
                        const pixelOffset = 3 / Math.pow(2, map.getZoom());
                        
                        // Calculate offset points
                        const offsetStartPixel = new google.maps.Point(
                            startPixel.x + perpX * pixelOffset,
                            startPixel.y + perpY * pixelOffset
                        );
                        const offsetEndPixel = new google.maps.Point(
                            endPixel.x + perpX * pixelOffset,
                            endPixel.y + perpY * pixelOffset
                        );
                        
                        // Convert back to lat/lng
                        const offsetStart = projection.fromPointToLatLng(offsetStartPixel);
                        const offsetEnd = projection.fromPointToLatLng(offsetEndPixel);
                        
                        orangeLine.setPath([offsetStart, offsetEnd]);
                    }
                }
                
                // Update azimuth
                const newHeading = google.maps.geometry.spherical.computeHeading(p0, p1);
                const newAzimuth = (newHeading + 90) % 360;
                StateManager.updatePVArea(newPVArea.id, { 
                    azimuth: newAzimuth,
                    facadeLine: [{lat: p0.lat(), lng: p0.lng()}, {lat: p1.lat(), lng: p1.lng()}],
                    corners: [{lat: p0.lat(), lng: p0.lng()}, {lat: p1.lat(), lng: p1.lng()}]
                });
            }
        };
        
        // Add drag listener to update orange line and endpoints when whole line is dragged
        google.maps.event.addListener(polyline, 'drag', () => {
            updateOrangeLine();
            // Update endpoint markers positions
            const path = polyline.getPath();
            if (path.getLength() >= 2) {
                endpointMarkers[0].setPosition(path.getAt(0));
                endpointMarkers[1].setPosition(path.getAt(1));
            }
        });
        
        google.maps.event.addListener(polyline, 'dragend', () => {
            updateOrangeLine();
            // Update state after dragging
            const path = polyline.getPath();
            const corners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                corners.push({ lat: point.lat(), lng: point.lng() });
            }
            StateManager.updatePVArea(newPVArea.id, { 
                corners: corners,
                facadeLine: corners
            });
            
            // Recalculate azimuth if auto-calculate is enabled
            if (newPVArea.autoCalculateAzimuth !== false) {
                const heading = google.maps.geometry.spherical.computeHeading(path.getAt(0), path.getAt(1));
                let azimuth = (heading + 90) % 360;
                if (azimuth < 0) azimuth += 360;
                StateManager.updatePVArea(newPVArea.id, { azimuth: Math.round(azimuth) });
            }
        });
        
        // Also update on zoom change to maintain consistent pixel offset
        google.maps.event.addListener(map, 'zoom_changed', updateOrangeLine);
        
        // Reset cursor
        MapManager.getMap().setOptions({ draggableCursor: null });
        
        // No success message
        UIManager.showPanel('pv-areas');
        
        // Cancel drawing mode
        this.cancelDrawing();
    },

    /**
     * Calculate default azimuth from polygon
     */
    _calculateDefaultAzimuth(corners) {
        if (corners.length < 4) return 180;
        
        // Calculate azimuth from first edge (assumed to be top edge)
        const p1 = corners[0];
        const p2 = corners[1];
        
        const heading = google.maps.geometry.spherical.computeHeading(
            new google.maps.LatLng(p1.lat, p1.lng),
            new google.maps.LatLng(p2.lat, p2.lng)
        );
        
        // Convert to azimuth (0° = North, 180° = South)
        let azimuth = (heading + 90) % 360;
        if (azimuth < 0) azimuth += 360;
        
        return Math.round(azimuth);
    },

    /**
     * Start field (ground-mounted) drawing - similar to rectangle but for field installations
     */
    _startFieldDrawing() {
        // Use rectangle drawing for field installations
        this._startRectangleDrawing();
    },
    
    /**
     * Calculate facade azimuth
     */
    _calculateFacadeAzimuth(points) {
        if (points.length < 2) return 180;
        
        // Use first segment for azimuth
        const heading = google.maps.geometry.spherical.computeHeading(
            new google.maps.LatLng(points[0].lat, points[0].lng),
            new google.maps.LatLng(points[1].lat, points[1].lng)
        );
        
        // Perpendicular to line
        let azimuth = (heading + 90) % 360;
        if (azimuth < 0) azimuth += 360;
        
        return Math.round(azimuth);
    },

    /**
     * Cancel current drawing
     */
    cancelDrawing() {
        this._cleanup();
        this._currentDrawingType = null;
        this._currentPVType = null;  // Reset PV type too
        this._drawingPoints = [];
        
        // Reset cursor to default
        const map = MapManager.getMap();
        if (map) {
            map.setOptions({ draggableCursor: null });
        }
        
        // Unsubscribe listeners
        if (this._clickListener) {
            // Check if it's a Google Maps event listener or our custom function
            if (typeof this._clickListener === 'function') {
                this._clickListener();
            } else {
                google.maps.event.removeListener(this._clickListener);
            }
            this._clickListener = null;
        }
        if (this._dblClickListener) {
            google.maps.event.removeListener(this._dblClickListener);
            this._dblClickListener = null;
        }
        if (this._mouseMoveListener) {
            // Check if it's a function (unsubscribe) or a Google Maps listener
            if (typeof this._mouseMoveListener === 'function') {
                this._mouseMoveListener();
            } else {
                google.maps.event.removeListener(this._mouseMoveListener);
            }
            this._mouseMoveListener = null;
        }
        if (this._rightClickListener) {
            // Check if it's a Google Maps event listener or our custom function
            if (typeof this._rightClickListener === 'function') {
                this._rightClickListener();
            } else {
                google.maps.event.removeListener(this._rightClickListener);
            }
            this._rightClickListener = null;
        }
        
        // Reset drawing mode
        MapManager.setDrawingMode(null);
        
        // Close any open modals
        const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
        if (modal) modal.hide();
    },

    /**
     * Clean up temporary drawing elements
     */
    _cleanup() {
        // Remove markers
        this._tempMarkers.forEach(marker => {
            MapManager.removeOverlay(marker);
        });
        this._tempMarkers = [];
        
        // Remove lines
        this._tempLines.forEach(line => {
            line.setMap(null);
        });
        this._tempLines = [];
        
        // Remove temp polygon
        if (this._tempPolygon) {
            this._tempPolygon.setMap(null);
            this._tempPolygon = null;
        }
        
        // Remove orange preview line
        if (window.tempPolyline2) {
            window.tempPolyline2.setMap(null);
            window.tempPolyline2 = null;
        }
    },

    /**
     * Add simple white number labels to corners (no blue circles)
     */
    _addCornerMarkers(pvArea) {
        if (!pvArea.polygon) return;
        
        const path = pvArea.polygon.getPath();
        const cornerMarkers = [];
        
        // Function to recreate all markers
        const recreateMarkers = () => {
            // Get fresh state reference
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            
            // Remove existing markers
            if (currentPVArea && currentPVArea.cornerMarkers) {
                currentPVArea.cornerMarkers.forEach(marker => {
                    marker.setMap(null);
                });
            }
            
            // Clear the local array
            cornerMarkers.length = 0;
            
            // Create simple white number labels for each vertex (positioned like during drawing)
            for (let i = 0; i < path.getLength(); i++) {
                const position = path.getAt(i);
                
                const marker = new google.maps.Marker({
                    position: position,
                    map: MapManager.getMap(),
                    label: {
                        text: (i + 1).toString(),
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        className: 'corner-label-with-outline'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: '#FFFFFF',
                        fillOpacity: 0,  // Make the circle invisible but keep its size
                        strokeColor: '#FFFFFF',
                        strokeOpacity: 0,  // Make the stroke invisible too
                        labelOrigin: new google.maps.Point(0, -4)  // Same as during drawing
                    },
                    clickable: false,
                    zIndex: 1000
                });
                
                cornerMarkers.push(marker);
            }
            
            // Update StateManager with the cornerMarkers array
            StateManager.updatePVArea(pvArea.id, { cornerMarkers: cornerMarkers });
            
            // Also store markers on polygon for backward compatibility
            pvArea.polygon.cornerMarkers = cornerMarkers;
        };
        
        // Initial creation
        recreateMarkers();
        
        // Listen for path changes (when vertices are added or removed)
        google.maps.event.addListener(path, 'insert_at', function() {
            recreateMarkers();
            // Update corners in state
            const corners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                corners.push({ lat: point.lat(), lng: point.lng() });
            }
            StateManager.updatePVArea(pvArea.id, { corners });
            
            // Update dimensions if shown
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            if (currentPVArea && currentPVArea.showDimensions) {
                Dimensions.update(currentPVArea);
            }
        });
        
        google.maps.event.addListener(path, 'remove_at', function() {
            recreateMarkers();
            // Update corners in state
            const corners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                corners.push({ lat: point.lat(), lng: point.lng() });
            }
            StateManager.updatePVArea(pvArea.id, { corners });
            
            // Update dimensions if shown
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            if (currentPVArea && currentPVArea.showDimensions) {
                Dimensions.update(currentPVArea);
            }
        });
        
        // Helper function to update dimensions and markers
        const updateDimensionsLive = () => {
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            
            // Update corner marker positions
            if (currentPVArea && currentPVArea.cornerMarkers) {
                for (let i = 0; i < path.getLength() && i < currentPVArea.cornerMarkers.length; i++) {
                    currentPVArea.cornerMarkers[i].setPosition(path.getAt(i));
                }
            }
            
            // Update dimensions
            if (currentPVArea && currentPVArea.showDimensions && Dimensions) {
                currentPVArea.polygon = pvArea.polygon;
                // Use update instead of hide/show for smoother updates
                Dimensions.update(currentPVArea);
            }
        };
        
        // For roof-mounted, we need to simulate the drag event that roof-parallel has
        // Google Maps doesn't provide drag events for polygon vertices, so we use a workaround
        
        // Create invisible markers at each vertex position that will track the dragging
        const vertexTrackers = [];
        
        // Function to create/update vertex trackers
        const updateVertexTrackers = () => {
            // Remove old trackers
            vertexTrackers.forEach(tracker => {
                if (tracker.listener) {
                    google.maps.event.removeListener(tracker.listener);
                }
                tracker.setMap(null);
            });
            vertexTrackers.length = 0;
            
            // Create new trackers for each vertex
            for (let i = 0; i < path.getLength(); i++) {
                const tracker = new google.maps.Marker({
                    position: path.getAt(i),
                    map: MapManager.getMap(),
                    visible: false, // Invisible marker
                    zIndex: -1
                });
                
                // Update tracker position when path changes
                const listener = google.maps.event.addListener(path, 'set_at', (index) => {
                    if (index === i) {
                        tracker.setPosition(path.getAt(i));
                    }
                });
                
                tracker.listener = listener;
                vertexTrackers.push(tracker);
            }
        };
        
        // Initialize trackers
        updateVertexTrackers();
        
        // Monitor for path structure changes
        google.maps.event.addListener(path, 'insert_at', updateVertexTrackers);
        google.maps.event.addListener(path, 'remove_at', updateVertexTrackers);
        
        // Use a more direct approach: monitor mouse events and path changes together
        let isMouseDown = false;
        let updateInterval = null;
        
        const mapDiv = MapManager.getMap().getDiv();
        
        const startLiveUpdate = () => {
            if (updateInterval) return;
            
            updateInterval = setInterval(() => {
                if (isMouseDown) {
                    // During dragging, continuously update
                    updateDimensionsLive();
                }
            }, 50); // Update every 50ms for smooth animation
        };
        
        const stopLiveUpdate = () => {
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        };
        
        // Listen for mouse events
        mapDiv.addEventListener('mousedown', () => {
            isMouseDown = true;
            startLiveUpdate();
        });
        
        document.addEventListener('mouseup', () => {
            isMouseDown = false;
            stopLiveUpdate();
        });
        
        // Cleanup
        if (!pvArea.cleanupFunctions) pvArea.cleanupFunctions = [];
        pvArea.cleanupFunctions.push(() => {
            vertexTrackers.forEach(tracker => {
                if (tracker.listener) {
                    google.maps.event.removeListener(tracker.listener);
                }
                tracker.setMap(null);
            });
            stopLiveUpdate();
        });
        
        // Update marker position when vertex is moved (final position)
        google.maps.event.addListener(path, 'set_at', function(index) {
            // Update the specific marker position
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            if (currentPVArea && currentPVArea.cornerMarkers && currentPVArea.cornerMarkers[index]) {
                currentPVArea.cornerMarkers[index].setPosition(path.getAt(index));
            }
            // Update corners in state
            const corners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                corners.push({ lat: point.lat(), lng: point.lng() });
            }
            StateManager.updatePVArea(pvArea.id, { corners });
            
            // Final dimension update with full redraw for accuracy
            if (currentPVArea && currentPVArea.showDimensions && Dimensions) {
                currentPVArea.polygon = pvArea.polygon;
                // Force complete redraw for final position
                Dimensions.hide(currentPVArea);
                setTimeout(() => {
                    const updatedPVArea = StateManager.getPVArea(pvArea.id);
                    if (updatedPVArea) {
                        updatedPVArea.polygon = pvArea.polygon;
                        Dimensions.show(updatedPVArea);
                    }
                }, 50);
            }
        });
        
        // Handle polygon drag
        google.maps.event.addListener(pvArea.polygon, 'drag', function() {
            // Update all marker positions
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            if (currentPVArea && currentPVArea.cornerMarkers) {
                for (let i = 0; i < path.getLength() && i < currentPVArea.cornerMarkers.length; i++) {
                    currentPVArea.cornerMarkers[i].setPosition(path.getAt(i));
                }
            }
        });
        
        // Handle polygon dragend to update state
        google.maps.event.addListener(pvArea.polygon, 'dragend', function() {
            const corners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                corners.push({ lat: point.lat(), lng: point.lng() });
            }
            StateManager.updatePVArea(pvArea.id, { corners });
            
            // Update dimensions if shown
            const currentPVArea = StateManager.getPVArea(pvArea.id);
            if (currentPVArea && currentPVArea.showDimensions && Dimensions) {
                Dimensions.update(currentPVArea);
            }
        });
    },
    
    /**
     * Calculate perpendicular distance between top and bottom edges
     */
    _calculatePerpendicularDistance(polygon) {
        const path = polygon.getPath();
        if (path.getLength() !== 4) return null;
        
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
        
        return Math.round(perpDistance * 10) / 10; // Round to 0.1m
    },

    /**
     * Generate default 100m grid for field installations
     */
    async _generateDefaultGrid(pvArea) {
        if (!pvArea || !pvArea.polygon) return;

        const path = pvArea.polygon.getPath();
        const bounds = new google.maps.LatLngBounds();
        for (let i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }

        // Generate grid points with 100m spacing
        const spacing = 100;
        const supportPoints = [];
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        // Convert spacing from meters to approximate degrees
        const metersPerDegreeLat = 111000;
        const metersPerDegreeLng = 111000 * Math.cos(sw.lat() * Math.PI / 180);
        const latSpacing = spacing / metersPerDegreeLat;
        const lngSpacing = spacing / metersPerDegreeLng;

        // Generate interior grid
        for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
            for (let lng = sw.lng(); lng <= ne.lng(); lng += lngSpacing) {
                const point = new google.maps.LatLng(lat, lng);
                if (google.maps.geometry.poly.containsLocation(point, pvArea.polygon)) {
                    supportPoints.push({
                        lat: lat,
                        lng: lng,
                        height: 0
                    });
                }
            }
        }

        // Add boundary points
        for (let i = 0; i < path.getLength(); i++) {
            const start = path.getAt(i);
            const end = path.getAt((i + 1) % path.getLength());
            const distance = google.maps.geometry.spherical.computeDistanceBetween(start, end);
            const numPoints = Math.floor(distance / spacing);

            for (let j = 1; j < numPoints; j++) {
                const fraction = j / numPoints;
                const interpolated = google.maps.geometry.spherical.interpolate(start, end, fraction);
                supportPoints.push({
                    lat: interpolated.lat(),
                    lng: interpolated.lng(),
                    height: 0
                });
            }
        }

        // Update state with grid info
        StateManager.updatePVArea(pvArea.id, {
            supportPoints,
            gridActive: true,
            gridSpacing: 100,
            autoCalculateTerrainHeights: true,
            autoCalculateSupportHeights: true
        });

        // Calculate heights (we just set auto-calculate to true)
        setTimeout(async () => {
            await this._calculateGridHeights(pvArea.id);
        }, 500);
    },

    /**
     * Calculate heights for grid points
     */
    async _calculateGridHeights(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv || !pv.supportPoints || pv.supportPoints.length === 0) return;

        const elevator = new google.maps.ElevationService();
        const locations = pv.supportPoints.map(p => ({ lat: p.lat, lng: p.lng }));

        try {
            const batchSize = 256;
            const supportPoints = [...pv.supportPoints];

            for (let i = 0; i < locations.length; i += batchSize) {
                const batch = locations.slice(i, i + batchSize);
                const response = await new Promise((resolve, reject) => {
                    elevator.getElevationForLocations({
                        locations: batch
                    }, (results, status) => {
                        if (status === 'OK') {
                            resolve(results);
                        } else {
                            reject(new Error(`Elevation API error: ${status}`));
                        }
                    });
                });

                response.forEach((result, j) => {
                    supportPoints[i + j].height = result.elevation;
                });
            }

            StateManager.updatePVArea(pvId, { supportPoints });
        } catch (error) {
            console.error('Error calculating grid heights:', error);
        }
    },

    /**
     * Show height definition dialog for new field installations
     */
    _showHeightDefinitionDialog(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;

        // Create modal
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="heightDefinitionModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-layers-fill me-2"></i>
                                Topografie der Freifläche definieren
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info mb-4">
                                <h6 class="alert-heading">
                                    <i class="bi bi-info-circle me-2"></i>Warum ist das wichtig?
                                </h6>
                                <p class="mb-0 small">
                                    Die Topografie beeinflusst maßgeblich die Glare-Berechnung.
                                    Definieren Sie, wie die Geländehöhen für Ihre PV-Fläche erfasst werden sollen.
                                </p>
                            </div>

                            <div class="row g-3">
                                <!-- Option 1: Automatic Grid -->
                                <div class="col-md-6">
                                    <div class="card h-100 border-primary height-option" data-option="grid">
                                        <div class="card-body text-center">
                                            <div class="mb-3">
                                                <i class="bi bi-grid-3x3-gap-fill text-primary" style="font-size: 3rem;"></i>
                                            </div>
                                            <h6 class="card-title">Automatisches Raster</h6>
                                            <p class="card-text small text-muted">
                                                Generiert ein gleichmäßiges 100m-Raster über die gesamte Fläche.
                                                Die Höhen werden automatisch via Google Elevation API ermittelt.
                                            </p>
                                            <div class="badge bg-success">Empfohlen</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Option 2: Manual Points -->
                                <div class="col-md-6">
                                    <div class="card h-100 height-option" data-option="manual">
                                        <div class="card-body text-center">
                                            <div class="mb-3">
                                                <i class="bi bi-pin-map-fill text-info" style="font-size: 3rem;"></i>
                                            </div>
                                            <h6 class="card-title">Eigene Stützpunkte</h6>
                                            <p class="card-text small text-muted">
                                                Setzen Sie manuell Punkte oder importieren Sie vorhandene XYZ-Daten.
                                                Ideal wenn Sie präzise Vermessungsdaten haben.
                                            </p>
                                            <div class="badge bg-info">Präzise</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Option 3: Combined -->
                                <div class="col-md-6">
                                    <div class="card h-100 height-option" data-option="both">
                                        <div class="card-body text-center">
                                            <div class="mb-3">
                                                <i class="bi bi-layers-fill text-warning" style="font-size: 3rem;"></i>
                                            </div>
                                            <h6 class="card-title">Raster + Eigene Punkte</h6>
                                            <p class="card-text small text-muted">
                                                Kombiniert automatisches Raster mit eigenen Messpunkten
                                                für maximale Genauigkeit.
                                            </p>
                                            <div class="badge bg-warning text-dark">Flexibel</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Option 4: Plane -->
                                <div class="col-md-6">
                                    <div class="card h-100 height-option" data-option="plane">
                                        <div class="card-body text-center">
                                            <div class="mb-3">
                                                <i class="bi bi-square-fill text-secondary" style="font-size: 3rem;"></i>
                                            </div>
                                            <h6 class="card-title">Ebene Fläche</h6>
                                            <p class="card-text small text-muted">
                                                Nimmt eine ebene Fläche an. Eine Best-Fit-Ebene wird
                                                aus den Eckpunkten berechnet.
                                            </p>
                                            <div class="badge bg-secondary">Einfach</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="alert alert-warning mt-3 mb-0 d-none" id="planeWarning">
                                <small>
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    <strong>Hinweis:</strong> Bei einer ebenen Fläche wird angenommen, dass das Gelände
                                    komplett flach ist. Dies kann zu ungenauen Ergebnissen führen, wenn das reale
                                    Gelände Höhenunterschiede aufweist.
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="skipHeightBtn">
                                <i class="bi bi-arrow-right me-2"></i>Später definieren
                            </button>
                            <button type="button" class="btn btn-primary" id="confirmHeightOption" disabled>
                                <i class="bi bi-check-circle me-2"></i>Auswahl bestätigen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal.firstElementChild);

        // Add CSS for card hover effect
        const style = document.createElement('style');
        style.innerHTML = `
            .height-option {
                cursor: pointer;
                transition: all 0.3s;
            }
            .height-option:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .height-option.selected {
                border-color: #0d6efd !important;
                border-width: 2px;
                background-color: #f0f8ff;
            }
        `;
        document.head.appendChild(style);

        // Add click handlers for cards
        let selectedOption = null;
        document.querySelectorAll('.height-option').forEach(card => {
            card.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.height-option').forEach(c => c.classList.remove('selected'));

                // Add selection to clicked card
                card.classList.add('selected');
                selectedOption = card.dataset.option;

                // Enable confirm button
                document.getElementById('confirmHeightOption').disabled = false;

                // Show/hide plane warning
                document.getElementById('planeWarning').classList.toggle('d-none', selectedOption !== 'plane');
            });
        });

        // Add confirm handler
        document.getElementById('confirmHeightOption').addEventListener('click', () => {
            this._applyHeightOption(pvId, selectedOption);

            // Close modal
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('heightDefinitionModal'));
            modalInstance.hide();
        });

        // Add skip handler
        document.getElementById('skipHeightBtn').addEventListener('click', () => {
            this._skipHeightDefinition(pvId);
        });

        // Show modal
        const modalInstance = new bootstrap.Modal(document.getElementById('heightDefinitionModal'));
        modalInstance.show();

        // Clean up after modal is hidden
        document.getElementById('heightDefinitionModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
            style.remove();
        });
    },

    /**
     * Apply selected height option
     */
    _applyHeightOption(pvId, option) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;

        switch(option) {
            case 'grid':
                // Generate 100m grid automatically
                StateManager.updatePVArea(pvId, {
                    gridActive: true,
                    gridNeedsUpdate: true,
                    topographyMode: 'grid'
                });

                // Open corner details to generate grid
                setTimeout(() => {
                    window.CornerDetailsManager?.open(pvId);
                    setTimeout(() => {
                        window.CornerDetailsManager?.generateDefaultGrid();
                    }, 500);
                }, 100);
                break;

            case 'manual':
                StateManager.updatePVArea(pvId, {
                    gridActive: false,
                    topographyMode: 'manual'
                });

                // Open corner details for manual entry
                setTimeout(() => {
                    window.CornerDetailsManager?.open(pvId);
                }, 100);
                break;

            case 'both':
                StateManager.updatePVArea(pvId, {
                    gridActive: true,
                    gridNeedsUpdate: true,
                    topographyMode: 'both'
                });

                // Open corner details
                setTimeout(() => {
                    window.CornerDetailsManager?.open(pvId);
                    setTimeout(() => {
                        window.CornerDetailsManager?.generateDefaultGrid();
                    }, 500);
                }, 100);
                break;

            case 'plane':
                // Use best-fit plane from corners
                StateManager.updatePVArea(pvId, {
                    gridActive: false,
                    useBestFitPlane: true,
                    topographyMode: 'plane'
                });

                UIManager.showNotification('Ebene Fläche angenommen - Best-Fit-Ebene wird aus Eckpunkten berechnet', 'info');
                break;
        }
    },

    /**
     * Skip height definition
     */
    _skipHeightDefinition(pvId) {
        const modalElement = document.getElementById('heightDefinitionModal');
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }

        UIManager.showNotification('Sie können die Topografie später über "Geländehöhe verwalten" definieren', 'info');
    },

    /**
     * Set up ESC key handler
     */
    initialize() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._currentDrawingType) {
                this.cancelDrawing();
            }
        });
    }
};

// Initialize on load
DrawingManager.initialize();

// Export for use
export default DrawingManager;