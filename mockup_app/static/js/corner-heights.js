/**
 * @fileoverview Corner heights management for PV areas
 * @module corner-heights
 * @requires config
 * @requires state
 * @requires utils
 * @requires calculations
 * @requires map
 * @requires pv-areas
 */

/**
 * Corner Heights Manager class
 * Handles the corner heights dialog and elevation calculations
 */
class CornerHeightsManager {
    constructor() {
        /**
         * @type {HTMLElement} Panel element reference
         */
        this.panel = null;
        
        /**
         * @type {HTMLElement} Content container reference
         */
        this.contentContainer = null;
        
        /**
         * @type {string} Currently open PV area ID
         */
        this.currentPvId = null;
        
        /**
         * @type {google.maps.ElevationService} Elevation service instance
         */
        this.elevationService = null;
        
        /**
         * @type {Function} ESC key handler
         */
        this.escHandler = null;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    /**
     * Initializes the corner heights manager
     * @private
     */
    initialize() {
        // Get panel references
        this.panel = document.getElementById('cornerHeightsPanel');
        this.contentContainer = document.getElementById('cornerHeightsContent');
        
        if (!this.panel || !this.contentContainer) {
            console.error('Corner heights panel elements not found');
            return;
        }
        
        // Initialize elevation service when map is ready
        state.on('map:initialized', () => {
            this.elevationService = new google.maps.ElevationService();
        });
        
        // Listen for corner updates
        state.on('pvarea:corners_updated', (pvArea) => {
            if (this.currentPvId === pvArea.id && this.isOpen()) {
                this.refreshContent();
            }
        });
        
        // Listen for path changes
        state.on('pvarea:path_changed', (data) => {
            if (this.currentPvId === data.pvArea.id && this.isOpen()) {
                this.refreshContent();
            }
        });
    }
    
    /**
     * Opens the corner heights dialog for a PV area
     * @param {string} pvId - PV area ID
     */
    openDialog(pvId) {
        console.log('Opening corner heights dialog for:', pvId);
        
        const pvArea = state.getPvArea(pvId);
        if (!pvArea) {
            console.error('PV area not found:', pvId);
            return;
        }
        
        // Check if applicable for this PV type
        if (pvArea.type === 'roof-parallel' || !CONFIG.pvArea.types[pvArea.type].hasCornerHeights) {
            console.warn('Corner heights not applicable for type:', pvArea.type);
            return;
        }
        
        const polygon = pvAreaManager.getPolygon(pvId);
        if (!polygon) {
            console.error('Polygon not found for PV area:', pvId);
            return;
        }
        
        // Store current PV ID
        this.currentPvId = pvId;
        this.panel.dataset.pvId = pvId;
        
        // Build content
        this.buildContent();
        
        // Show panel with animation
        this.showPanel();
        
        // Add ESC key handler
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeDialog();
            }
        };
        document.addEventListener('keydown', this.escHandler);
        
        // Update UI state
        state.updateUI({ 
            cornerHeightsPanelOpen: true,
            cornerHeightsPvId: pvId 
        });
    }
    
    /**
     * Builds the dialog content
     * @private
     */
    buildContent() {
        const pvArea = state.getPvArea(this.currentPvId);
        if (!pvArea) return;
        
        const polygon = pvAreaManager.getPolygon(this.currentPvId);
        if (!polygon) return;
        
        // Get current polygon corners
        const path = polygon.getPath();
        const corners = [];
        path.forEach((latLng, i) => {
            corners.push({
                index: i,
                lat: latLng.lat(),
                lng: latLng.lng()
            });
        });
        
        // Initialize corner heights array
        this.initializeCornerHeights(pvArea, corners.length);
        
        // Initialize reference height if needed
        if (pvArea.referenceGroundHeight === undefined) {
            pvArea.referenceGroundHeight = 0;
            pvArea.autoCalculateReference = true;
        }
        
        // Build HTML
        let html = `
            <div class="corner-heights-content">
                ${this.renderReferenceHeightSection(pvArea)}
                ${this.renderCornersTable(pvArea, corners)}
                ${this.renderStatistics(pvArea)}
            </div>
        `;
        
        this.contentContainer.innerHTML = html;
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Attach event listeners
        this.attachEventListeners(pvArea);
        
        // Initial calculations
        if (pvArea.autoCalculateReference) {
            this.calculateReferenceHeight();
        } else {
            this.updateResultingHeights();
        }
    }
    
    /**
     * Renders the reference height section
     * @private
     * @param {Object} pvArea - PV area object
     * @returns {string} HTML string
     */
    renderReferenceHeightSection(pvArea) {
        return `
            <div class="mb-4">
                <h6 class="mb-3">
                    <i class="fas fa-ruler-vertical me-2"></i>
                    Referenzhöhe
                </h6>
                <div class="mb-3">
                    <label class="form-label">
                        Referenzhöhe / Geländehöhe (m)
                        <i class="bi bi-info-circle text-muted ms-1" 
                           style="cursor: pointer; font-size: 0.875rem;" 
                           data-bs-toggle="tooltip" 
                           data-bs-placement="top"
                           data-bs-html="true"
                           title="Die Referenzhöhe ist die Basis für alle Höhenangaben.<br>
                                  Bei Auto-Calculate wird der Mittelwert der Geländehöhen aller Eckpunkte verwendet.">
                        </i>
                    </label>
                    <div class="input-group">
                        <input type="number" 
                               class="form-control" 
                               id="reference-ground-height"
                               value="${pvArea.referenceGroundHeight || 0}"
                               step="0.1"
                               ${pvArea.autoCalculateReference ? 'disabled' : ''}>
                        <div class="input-group-text">
                            <input class="form-check-input mt-0" 
                                   type="checkbox" 
                                   id="auto-calc-reference"
                                   ${pvArea.autoCalculateReference ? 'checked' : ''}
                                   title="Auto-calculate aus Eckpunkten">
                            <label class="form-check-label ms-2" for="auto-calc-reference">
                                Auto
                            </label>
                        </div>
                        <button class="btn btn-outline-secondary" 
                                type="button"
                                onclick="cornerHeightsManager.fetchElevations()"
                                title="Höhen von Google Maps abrufen">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                    <div id="elevation-status" class="mt-2"></div>
                </div>
            </div>
        `;
    }
    
    /**
     * Renders the corners table
     * @private
     * @param {Object} pvArea - PV area object
     * @param {Array} corners - Corner coordinates
     * @returns {string} HTML string
     */
    renderCornersTable(pvArea, corners) {
        return `
            <div class="mb-4">
                <h6 class="mb-3">
                    <i class="fas fa-map-marker-alt me-2"></i>
                    Eckpunkte
                </h6>
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Punkt</th>
                                <th>Latitude</th>
                                <th>Longitude</th>
                                <th>
                                    Höhe über Referenz (m)
                                    <i class="bi bi-info-circle text-muted ms-1" 
                                       style="cursor: pointer; font-size: 0.75rem;" 
                                       data-bs-toggle="tooltip" 
                                       data-bs-placement="top"
                                       data-bs-html="true"
                                       title="Höhe des Eckpunkts über der Referenzhöhe/Geländehöhe.">
                                    </i>
                                </th>
                                <th>
                                    Resultierende Höhe (m)
                                    <i class="bi bi-info-circle text-muted ms-1" 
                                       style="cursor: pointer; font-size: 0.75rem;" 
                                       data-bs-toggle="tooltip" 
                                       data-bs-placement="top"
                                       data-bs-html="true"
                                       title="Die resultierende Gesamthöhe nach Best-Fit-Ebenen-Berechnung.">
                                    </i>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${corners.map((corner, i) => this.renderCornerRow(pvArea, corner, i)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    /**
     * Renders a single corner row
     * @private
     * @param {Object} pvArea - PV area object
     * @param {Object} corner - Corner data
     * @param {number} index - Corner index
     * @returns {string} HTML string
     */
    renderCornerRow(pvArea, corner, index) {
        const cornerData = pvArea.cornerHeights[index] || {};
        const pointName = `P${index + 1}`;
        
        return `
            <tr>
                <td>
                    <strong>${pointName}</strong>
                </td>
                <td>
                    <small>${corner.lat.toFixed(6)}</small>
                </td>
                <td>
                    <small>${corner.lng.toFixed(6)}</small>
                </td>
                <td>
                    <input type="number" 
                           class="form-control form-control-sm height-above-reference" 
                           data-corner="${index}"
                           value="${cornerData.heightAboveGround || 0}"
                           step="0.1"
                           style="width: 100px;">
                </td>
                <td class="resulting-height" data-corner="${index}">
                    <span class="badge bg-secondary">-</span>
                </td>
            </tr>
        `;
    }
    
    /**
     * Renders statistics section
     * @private
     * @param {Object} pvArea - PV area object
     * @returns {string} HTML string
     */
    renderStatistics(pvArea) {
        return `
            <div class="mb-3">
                <h6 class="mb-3">
                    <i class="fas fa-chart-line me-2"></i>
                    Statistik
                </h6>
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body py-2">
                                <h6 class="card-subtitle mb-1 text-muted">Fläche</h6>
                                <p class="card-text mb-0">
                                    <strong id="area-display">-</strong> m²
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body py-2">
                                <h6 class="card-subtitle mb-1 text-muted">Neigung der Ebene</h6>
                                <p class="card-text mb-0">
                                    <strong id="plane-tilt-display">-</strong>°
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body py-2">
                                <h6 class="card-subtitle mb-1 text-muted">Ausrichtung der Ebene</h6>
                                <p class="card-text mb-0">
                                    <strong id="plane-azimuth-display">-</strong>°
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body py-2">
                                <h6 class="card-subtitle mb-1 text-muted">Max. Höhendifferenz</h6>
                                <p class="card-text mb-0">
                                    <strong id="height-diff-display">-</strong> m
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Initializes corner heights array for PV area
     * @private
     * @param {Object} pvArea - PV area object
     * @param {number} cornerCount - Number of corners
     */
    initializeCornerHeights(pvArea, cornerCount) {
        if (!pvArea.cornerHeights) {
            pvArea.cornerHeights = [];
        }
        
        // Resize array to match corner count
        while (pvArea.cornerHeights.length < cornerCount) {
            pvArea.cornerHeights.push({
                groundHeight: null,
                heightAboveGround: 0,
                autoCalculateGround: true
            });
        }
        
        while (pvArea.cornerHeights.length > cornerCount) {
            pvArea.cornerHeights.pop();
        }
    }
    
    /**
     * Attaches event listeners to form elements
     * @private
     * @param {Object} pvArea - PV area object
     */
    attachEventListeners(pvArea) {
        // Reference height input
        const referenceInput = document.getElementById('reference-ground-height');
        const autoCalcCheckbox = document.getElementById('auto-calc-reference');
        
        if (referenceInput) {
            referenceInput.addEventListener('input', (e) => {
                pvArea.referenceGroundHeight = parseFloat(e.target.value) || 0;
                this.updateResultingHeights();
                state.updatePvArea(this.currentPvId, pvArea);
            });
        }
        
        if (autoCalcCheckbox) {
            autoCalcCheckbox.addEventListener('change', (e) => {
                pvArea.autoCalculateReference = e.target.checked;
                if (referenceInput) {
                    referenceInput.disabled = e.target.checked;
                }
                if (e.target.checked) {
                    this.calculateReferenceHeight();
                }
                state.updatePvArea(this.currentPvId, pvArea);
            });
        }
        
        // Height above reference inputs
        document.querySelectorAll('.height-above-reference').forEach(input => {
            input.addEventListener('input', (e) => {
                const cornerIndex = parseInt(e.target.dataset.corner);
                pvArea.cornerHeights[cornerIndex].heightAboveGround = parseFloat(e.target.value) || 0;
                this.updateResultingHeights();
                state.updatePvArea(this.currentPvId, pvArea);
            });
        });
    }
    
    /**
     * Calculates reference height from elevation data
     * @private
     */
    async calculateReferenceHeight() {
        const pvArea = state.getPvArea(this.currentPvId);
        if (!pvArea) return;
        
        const polygon = pvAreaManager.getPolygon(this.currentPvId);
        if (!polygon) return;
        
        const path = polygon.getPath();
        const locations = [];
        
        path.forEach((latLng) => {
            locations.push({ lat: latLng.lat(), lng: latLng.lng() });
        });
        
        console.log('Requesting elevation for', locations.length, 'locations');
        
        if (!this.elevationService) {
            console.error('Elevation service not initialized');
            return;
        }
        
        try {
            const response = await this.elevationService.getElevationForLocations({
                locations: locations
            });
            
            if (response.results && response.results.length > 0) {
                let sumElevation = 0;
                response.results.forEach((result, i) => {
                    sumElevation += result.elevation;
                    console.log(`Corner ${i} elevation: ${result.elevation}m`);
                });
                
                const avgElevation = sumElevation / response.results.length;
                pvArea.referenceGroundHeight = Math.round(avgElevation * 10) / 10;
                
                console.log(`Average elevation (reference height): ${pvArea.referenceGroundHeight}m`);
                
                // Update UI
                const input = document.getElementById('reference-ground-height');
                if (input) {
                    input.value = pvArea.referenceGroundHeight;
                }
                
                // Update status
                this.showElevationStatus('Höhen erfolgreich abgerufen', 'success');
                
                this.updateResultingHeights();
                state.updatePvArea(this.currentPvId, pvArea);
            }
        } catch (error) {
            console.error('Error fetching elevation:', error);
            this.showElevationStatus('Fehler beim Abrufen der Höhendaten', 'error');
        }
    }
    
    /**
     * Fetches elevations for all corners
     */
    async fetchElevations() {
        const pvArea = state.getPvArea(this.currentPvId);
        if (!pvArea) return;
        
        const polygon = pvAreaManager.getPolygon(this.currentPvId);
        if (!polygon) return;
        
        const path = polygon.getPath();
        const locations = [];
        
        path.forEach((latLng) => {
            locations.push({ lat: latLng.lat(), lng: latLng.lng() });
        });
        
        this.showElevationStatus('Lade Höhendaten...', 'info');
        
        try {
            const response = await this.elevationService.getElevationForLocations({
                locations: locations
            });
            
            if (response.results && response.results.length > 0) {
                // Update each corner's ground height
                response.results.forEach((result, i) => {
                    if (pvArea.cornerHeights[i]) {
                        pvArea.cornerHeights[i].groundHeight = result.elevation;
                    }
                });
                
                // If auto-calculate is on, update reference height
                if (pvArea.autoCalculateReference) {
                    this.calculateReferenceHeight();
                } else {
                    this.showElevationStatus('Höhendaten erfolgreich abgerufen', 'success');
                }
                
                state.updatePvArea(this.currentPvId, pvArea);
            }
        } catch (error) {
            console.error('Error fetching elevations:', error);
            this.showElevationStatus('Fehler beim Abrufen der Höhendaten', 'error');
        }
    }
    
    /**
     * Shows elevation fetch status
     * @private
     * @param {string} message - Status message
     * @param {string} type - Status type (info, success, error)
     */
    showElevationStatus(message, type) {
        const statusDiv = document.getElementById('elevation-status');
        if (!statusDiv) return;
        
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 'alert-info';
        
        statusDiv.innerHTML = `
            <div class="alert ${alertClass} alert-sm py-1 px-2" role="alert">
                <small>${message}</small>
            </div>
        `;
        
        if (type !== 'info') {
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 3000);
        }
    }
    
    /**
     * Updates resulting heights and best fit plane
     * @private
     */
    updateResultingHeights() {
        const pvArea = state.getPvArea(this.currentPvId);
        if (!pvArea) return;
        
        const polygon = pvAreaManager.getPolygon(this.currentPvId);
        if (!polygon) return;
        
        const points = [];
        const path = polygon.getPath();
        const referenceHeight = pvArea.referenceGroundHeight || 0;
        
        // Collect all points for plane calculation
        path.forEach((latLng, i) => {
            const cornerData = pvArea.cornerHeights[i] || {};
            const heightAboveReference = cornerData.heightAboveGround || 0;
            const resultingHeight = referenceHeight + heightAboveReference;
            
            // Convert to local coordinate system for plane fitting
            if (i === 0) {
                points.push({ x: 0, y: 0, z: resultingHeight });
            } else {
                const dist = google.maps.geometry.spherical.computeDistanceBetween(
                    path.getAt(0), latLng
                );
                const heading = google.maps.geometry.spherical.computeHeading(
                    path.getAt(0), latLng
                );
                const x = dist * Math.sin(heading * Math.PI / 180);
                const y = dist * Math.cos(heading * Math.PI / 180);
                points.push({ x: x, y: y, z: resultingHeight });
            }
        });
        
        // Calculate best fit plane
        if (points.length >= 3) {
            const plane = calculateBestFitPlane(points);
            if (plane) {
                // Update UI with best-fit plane heights
                points.forEach((p, i) => {
                    const bestFitHeight = -(plane.normal.x * p.x + plane.normal.y * p.y + plane.d) / plane.normal.z;
                    const td = document.querySelector(`.resulting-height[data-corner="${i}"]`);
                    if (td) {
                        const diff = Math.abs(bestFitHeight - p.z);
                        const badgeClass = diff < 0.1 ? 'bg-success' : diff < 0.5 ? 'bg-warning' : 'bg-danger';
                        td.innerHTML = `<span class="badge ${badgeClass}">${bestFitHeight.toFixed(1)}</span>`;
                    }
                });
                
                // Update statistics
                this.updateStatistics(polygon, plane, points);
            }
        } else {
            // If less than 3 points, just show the actual heights
            path.forEach((latLng, i) => {
                const cornerData = pvArea.cornerHeights[i] || {};
                const heightAboveReference = cornerData.heightAboveGround || 0;
                const resultingHeight = referenceHeight + heightAboveReference;
                
                const td = document.querySelector(`.resulting-height[data-corner="${i}"]`);
                if (td) {
                    td.innerHTML = `<span class="badge bg-secondary">${resultingHeight.toFixed(1)}</span>`;
                }
            });
        }
    }
    
    /**
     * Updates statistics display
     * @private
     * @param {google.maps.Polygon} polygon - The polygon
     * @param {Object} plane - Best fit plane
     * @param {Array} points - Corner points
     */
    updateStatistics(polygon, plane, points) {
        // Calculate area
        const area = calculatePolygonArea(polygon);
        const areaDisplay = document.getElementById('area-display');
        if (areaDisplay) {
            areaDisplay.textContent = formatGermanNumber(area, 1);
        }
        
        // Calculate plane tilt and azimuth
        if (plane) {
            // Tilt is the angle between normal and vertical
            const tiltRad = Math.acos(Math.abs(plane.normal.z));
            const tiltDeg = tiltRad * 180 / Math.PI;
            
            const tiltDisplay = document.getElementById('plane-tilt-display');
            if (tiltDisplay) {
                tiltDisplay.textContent = formatGermanNumber(tiltDeg, 1);
            }
            
            // Azimuth is the direction of maximum slope
            let azimuthRad = Math.atan2(plane.normal.x, plane.normal.y);
            let azimuthDeg = azimuthRad * 180 / Math.PI;
            if (azimuthDeg < 0) azimuthDeg += 360;
            
            const azimuthDisplay = document.getElementById('plane-azimuth-display');
            if (azimuthDisplay) {
                azimuthDisplay.textContent = formatGermanNumber(azimuthDeg, 1);
            }
        }
        
        // Calculate height difference
        const heights = points.map(p => p.z);
        const minHeight = Math.min(...heights);
        const maxHeight = Math.max(...heights);
        const heightDiff = maxHeight - minHeight;
        
        const heightDiffDisplay = document.getElementById('height-diff-display');
        if (heightDiffDisplay) {
            heightDiffDisplay.textContent = formatGermanNumber(heightDiff, 2);
        }
    }
    
    /**
     * Shows the panel with animation
     * @private
     */
    showPanel() {
        // Show panel
        this.panel.style.right = '0';
        
        // Adjust map container
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.marginRight = CONFIG.ui.panels.cornerHeights.width + 'px';
            mapContainer.style.transition = `margin-right ${CONFIG.ui.animations.panelSlide}ms ease-in-out`;
        }
        
        // Trigger map resize after animation
        setTimeout(() => {
            mapManager.triggerResize();
        }, CONFIG.ui.animations.panelSlide);
    }
    
    /**
     * Hides the panel with animation
     * @private
     */
    hidePanel() {
        // Hide panel
        this.panel.style.right = `-${CONFIG.ui.panels.cornerHeights.width}px`;
        
        // Reset map container
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.marginRight = '0';
        }
        
        // Trigger map resize after animation
        setTimeout(() => {
            mapManager.triggerResize();
        }, CONFIG.ui.animations.panelSlide);
    }
    
    /**
     * Closes the corner heights dialog
     */
    closeDialog() {
        // Hide panel
        this.hidePanel();
        
        // Remove ESC handler
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
        
        // Reset state
        this.currentPvId = null;
        delete this.panel.dataset.pvId;
        
        // Update UI state
        state.updateUI({ 
            cornerHeightsPanelOpen: false,
            cornerHeightsPvId: null 
        });
    }
    
    /**
     * Saves corner heights (called from UI button)
     */
    saveCornerHeights() {
        const pvArea = state.getPvArea(this.currentPvId);
        if (!pvArea) return;
        
        // Heights are already saved in real-time, just close dialog
        this.closeDialog();
        
        // Show success message
        showModal('Gespeichert', 'Die Eckpunkt-Höhen wurden gespeichert.', 'success');
    }
    
    /**
     * Checks if the panel is open
     * @returns {boolean}
     */
    isOpen() {
        return this.panel && this.panel.style.right === '0px';
    }
    
    /**
     * Refreshes the content (e.g., after corners change)
     * @private
     */
    refreshContent() {
        if (this.currentPvId) {
            this.buildContent();
        }
    }
    
    /**
     * Initializes Bootstrap tooltips
     * @private
     */
    initializeTooltips() {
        const tooltipTriggerList = this.contentContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

// Create global corner heights manager instance
const cornerHeightsManager = new CornerHeightsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cornerHeightsManager;
}