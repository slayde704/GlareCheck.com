/**
 * Corner Details Manager
 * Manages the corner coordinates detail panel
 */

import { StateManager } from '../core/state-manager.js';
import { MapManager } from '../core/map-manager.js';

export const CornerDetailsManager = {
    currentPVId: null,
    updateInterval: null,
    editingCorner: null,
    initialized: false,
    
    /**
     * Initialize the corner details manager
     */
    initialize() {
        if (this.initialized) return;
        
        // Subscribe to state changes to update when PV list is reordered or PV is updated
        StateManager.subscribe((type, data) => {
            if (this.currentPVId) {
                if (type === 'pv-areas-reordered') {
                    // Update the header with new PV number
                    this.updateHeader();
                } else if (type === 'pv-area-updated') {
                    // Check if this update is for our current PV
                    if (data && (data.pvId === this.currentPVId || data.id === this.currentPVId)) {
                        // Get the updated PV area
                        const pv = StateManager.getPVArea(this.currentPVId);
                        if (pv) {
                            // Update header if the name changed
                            this.updateHeader();
                            
                            // If PV is now locked and we're in edit mode, cancel editing
                            if (pv.locked && this.editingCorner !== null) {
                                this.editingCorner = null;
                            }
                            
                            // Stop live updates temporarily to force full re-render
                            const wasUpdating = this.updateInterval !== null;
                            if (wasUpdating) {
                                this.stopLiveUpdates();
                            }
                            
                            // Force complete re-render
                            this.render();
                            
                            // Restart live updates if they were running
                            if (wasUpdating) {
                                this.startLiveUpdates();
                            }
                        }
                    }
                }
            }
        });
        
        this.initialized = true;
    },
    
    /**
     * Get display name for a PV area (same logic as PVListRenderer)
     */
    getDisplayName(pv) {
        if (pv.name && pv.name.trim() !== '') {
            return pv.name;
        }
        const allPVs = StateManager.getAllPVAreas();
        const index = allPVs.findIndex(p => p.id === pv.id);
        return `PV${index + 1}`;
    },
    
    /**
     * Update the panel header with current PV name
     */
    updateHeader() {
        if (!this.currentPVId) return;
        
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;
        
        const headerElement = document.getElementById('cornerDetailsHeader');
        if (headerElement) {
            const displayName = this.getDisplayName(pv);
            if (pv.type === 'roof-mounted') {
                headerElement.textContent = `Dachhöhe und Eckpunkte verwalten - ${displayName}`;
            } else if (pv.type === 'field' || pv.type === 'ground') {
                headerElement.textContent = `Geländehöhe verwalten - ${displayName}`;
            } else {
                headerElement.textContent = `Eckpunkt-Koordinaten - ${displayName}`;
            }
        }
    },
    
    /**
     * Open the corner details panel for a PV area
     */
    open(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;

        // For field installations, show topography dialog first if not configured
        if ((pv.type === 'field' || pv.type === 'ground') && !pv.topographyMode) {
            this.showTopographyDialog(pvId);
            return;
        }

        // Initialize if needed
        this.initialize();

        this.currentPVId = pvId;
        const panel = document.getElementById('cornerDetailsPanel');

        // Update header with PV identifier
        this.updateHeader();

        // Open the panel
        panel.classList.add('open');

        // Start live updates
        this.startLiveUpdates();

        // Initial render
        this.render();
        
        // Trigger auto-calculate if enabled and no reference height set
        if (pv.type === 'roof-mounted' && pv.autoCalculateReferenceHeight !== false && !pv.referenceHeight) {
            setTimeout(() => {
                this.calculateReferenceHeight();
            }, 100);
        }

        // Don't auto-calculate terrain heights on open to save API calls
        // Just mark that update is needed
        if ((pv.type === 'field' || pv.type === 'ground') && (!pv.terrainHeights || pv.terrainHeights.every(h => h === 0))) {
            StateManager.updatePVArea(pvId, { gridNeedsUpdate: true });
        }

        // Add event listeners for field installations to detect path changes
        if ((pv.type === 'field' || pv.type === 'ground') && pv.polygon) {
            // Initialize support mode if not set
            if (!pv.supportMode) {
                if (pv.gridActive && pv.hasManualPoints) {
                    StateManager.updatePVArea(pvId, { supportMode: 'both' });
                } else if (pv.gridActive) {
                    StateManager.updatePVArea(pvId, { supportMode: 'grid' });
                } else if (pv.supportPoints && pv.supportPoints.length > 0) {
                    StateManager.updatePVArea(pvId, { supportMode: 'manual' });
                } else {
                    // Default to grid mode for new field installations
                    StateManager.updatePVArea(pvId, {
                        supportMode: 'grid',
                        gridNeedsUpdate: true // Mark that grid needs to be generated
                    });
                    // Don't generate automatically to save API calls
                }
            }

            this._attachFieldPathListeners(pv);
            // Show support points on map if any exist
            if (pv.supportPoints && pv.supportPoints.length > 0) {
                this.showSupportPointsOnMap();
            }
        }
    },
    
    /**
     * Attach path listeners for field installations
     */
    _attachFieldPathListeners(pv) {
        console.log('Attaching field path listeners for PV:', pv?.id);
        if (!pv || !pv.polygon) {
            console.log('No PV or polygon found');
            return;
        }

        const path = pv.polygon.getPath();
        console.log('Path length:', path.getLength());

        // Remove existing listeners if any
        if (this._fieldPathListeners) {
            this._fieldPathListeners.forEach(listener => {
                google.maps.event.removeListener(listener);
            });
        }
        this._fieldPathListeners = [];

        // Listen for vertex changes
        const setAtListener = google.maps.event.addListener(path, 'set_at', (index) => {
            console.log('Field PV vertex changed at index:', index);

            // Update corners in state
            const newCorners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                newCorners.push({
                    lat: point.lat(),
                    lng: point.lng()
                });
            }
            StateManager.updatePVArea(this.currentPVId, { corners: newCorners });

            // Get current PV state to check auto-calculate
            const currentPV = StateManager.getPVArea(this.currentPVId);

            // Just mark that grid needs update - don't recalculate automatically
            if (currentPV && currentPV.gridActive) {
                console.log('Grid is active, marking as needs update');
                StateManager.updatePVArea(this.currentPVId, { gridNeedsUpdate: true });
            }

            // Don't auto-calculate terrain heights on vertex changes to save API calls
            if (currentPV && currentPV.autoCalculateTerrainHeights === true && false) {
                console.log('Auto-calculate is enabled, updating terrain height for index:', index);
                // Debounce update for specific vertex
                if (this._vertexUpdateTimeout) {
                    clearTimeout(this._vertexUpdateTimeout);
                }
                this._vertexUpdateTimeout = setTimeout(() => {
                    this.calculateSingleTerrainHeight(index);
                }, 800);
            } else {
                console.log('Auto-calculate is disabled or PV not found');
            }
        });
        this._fieldPathListeners.push(setAtListener);

        // Listen for new points being added
        const insertAtListener = google.maps.event.addListener(path, 'insert_at', (index) => {
            console.log('Field PV point inserted at index:', index);

            // Update corners in state
            const newCorners = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                newCorners.push({
                    lat: point.lat(),
                    lng: point.lng()
                });
            }

            // Update terrain heights array to match new corners count
            const currentPV = StateManager.getPVArea(this.currentPVId);
            const terrainHeights = [...(currentPV?.terrainHeights || [])];
            terrainHeights.splice(index, 0, 0); // Insert 0 at the new point index

            StateManager.updatePVArea(this.currentPVId, {
                corners: newCorners,
                terrainHeights: terrainHeights,
                gridNeedsUpdate: true // Mark that grid needs update
            });

            // Re-render to show new point in table
            this.render();

            // Don't auto-calculate on new points to save API calls
            // User must explicitly update using the button
            if (currentPV && currentPV.gridActive) {
                StateManager.updatePVArea(this.currentPVId, { gridNeedsUpdate: true });
            }

            // Re-attach listeners since path structure changed
            setTimeout(() => {
                const updatedPV = StateManager.getPVArea(this.currentPVId);
                if (updatedPV && updatedPV.type === 'field') {
                    this._attachFieldPathListeners(updatedPV);
                }
            }, 100);
        });
        this._fieldPathListeners.push(insertAtListener);

        // Listen for points being removed
        const removeAtListener = google.maps.event.addListener(path, 'remove_at', (index) => {
            console.log('Field PV point removed at index:', index);
            // Update terrain heights array
            const terrainHeights = [...(pv.terrainHeights || [])];
            terrainHeights.splice(index, 1);
            StateManager.updatePVArea(this.currentPVId, { terrainHeights });

            // Re-render to update table
            this.render();

            // Re-attach listeners since path structure changed
            setTimeout(() => {
                const updatedPV = StateManager.getPVArea(this.currentPVId);
                if (updatedPV && updatedPV.type === 'field') {
                    this._attachFieldPathListeners(updatedPV);
                }
            }, 100);
        });
        this._fieldPathListeners.push(removeAtListener);

        // Listen for polygon drag
        const dragEndListener = google.maps.event.addListener(pv.polygon, 'dragend', () => {
            console.log('Field PV polygon dragged');

            // Get current PV state
            const currentPV = StateManager.getPVArea(this.currentPVId);

            // First, clean up manual points that are now outside the polygon
            if (currentPV && currentPV.supportPoints && currentPV.supportPoints.length > 0) {
                const validSupportPoints = currentPV.supportPoints.filter(point => {
                    const latLng = new google.maps.LatLng(point.lat, point.lng);
                    return google.maps.geometry.poly.containsLocation(latLng, currentPV.polygon);
                });

                // Update if some points were removed
                if (validSupportPoints.length !== currentPV.supportPoints.length) {
                    console.log(`Removed ${currentPV.supportPoints.length - validSupportPoints.length} points outside polygon`);
                    StateManager.updatePVArea(this.currentPVId, { supportPoints: validSupportPoints });
                }
            }

            // Mark that grid needs update instead of automatically recalculating
            if (currentPV && currentPV.gridActive) {
                console.log('Grid is active, marking as needs update');
                StateManager.updatePVArea(this.currentPVId, { gridNeedsUpdate: true });

                // Don't recalculate automatically to prevent excessive API calls
                // User must explicitly confirm the update
            }

            // Only update terrain heights for corners if explicitly enabled
            // Don't do this automatically anymore to reduce API calls
            if (currentPV && currentPV.autoCalculateTerrainHeights === true) {
                console.log('Auto-calculate enabled for terrain heights, but not updating automatically to save API calls');
                StateManager.updatePVArea(this.currentPVId, { gridNeedsUpdate: true });
            }

            // Update display
            this.render();
            this.showSupportPointsOnMap();
        });
        this._fieldPathListeners.push(dragEndListener);
    },

    /**
     * Close the corner details panel
     */
    close() {
        const panel = document.getElementById('cornerDetailsPanel');
        panel.classList.remove('open');

        // Stop live updates
        this.stopLiveUpdates();

        // Remove field path listeners if any
        if (this._fieldPathListeners) {
            this._fieldPathListeners.forEach(listener => {
                google.maps.event.removeListener(listener);
            });
            this._fieldPathListeners = [];
        }

        // Hide support points if shown
        this.hideSupportPointsOnMap();

        // Stop manual placement if active
        this.stopManualPointPlacement();

        this.currentPVId = null;
        this.editingCorner = null
    },
    
    /**
     * Start live coordinate updates
     */
    startLiveUpdates() {
        // Clear any existing interval
        this.stopLiveUpdates();
        
        // Update every 100ms when polygon is being moved/edited
        this.updateInterval = setInterval(() => {
            if (this.currentPVId && this.editingCorner === null) {
                this.updateCoordinates();
            }
        }, 100);
    },
    
    /**
     * Stop live coordinate updates
     */
    stopLiveUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },
    
    /**
     * Render the corner details content
     */
    render() {
        // Always get fresh PV data from StateManager
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;
        
        // Dispose of any existing tooltips before re-rendering
        const existingTooltips = document.querySelectorAll('#cornerDetailsContent [data-bs-toggle="tooltip"]');
        existingTooltips.forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });
        
        const content = document.getElementById('cornerDetailsContent');
        if (!content) return;
        
        // Get corners from polygon or polyline (facade)
        let corners = [];
        if (pv.polygon) {
            const path = pv.polygon.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                corners.push(path.getAt(i));
            }
        } else if (pv.polyline) {
            // Facade has a polyline with 2 points
            const path = pv.polyline.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                corners.push(path.getAt(i));
            }
        } else if (pv.corners) {
            corners = pv.corners;
        }
        
        // Initialize cornerHeights if not present
        if (!pv.cornerHeights || pv.cornerHeights.length !== corners.length) {
            const newHeights = new Array(corners.length).fill(0);
            if (pv.cornerHeights) {
                // Copy existing heights
                for (let i = 0; i < Math.min(pv.cornerHeights.length, newHeights.length); i++) {
                    newHeights[i] = pv.cornerHeights[i];
                }
            }
            StateManager.updatePVArea(this.currentPVId, { cornerHeights: newHeights });
            pv.cornerHeights = newHeights;
        }
        
        // Use numbered labels for all corners
        const cornerLabels = corners.map((_, index) => `Eckpunkt ${index + 1}`);
        
        // Different layout for roof-mounted, field, and other types
        if (pv.type === 'field' || pv.type === 'ground') {
            // Compact table layout for field installations with terrain heights
            content.innerHTML = `
                <div class="alert alert-info mb-3" style="font-size: 0.875rem;">
                    <h6 class="alert-heading mb-2">
                        <i class="bi bi-info-circle me-2"></i>Topografie der Fläche
                    </h6>
                    <p class="mb-2">
                        Eckpunkte und Stützpunkte definieren gemeinsam die Topografie der Freifläche.
                        Mit Auto-Calculate werden die Geländehöhen automatisch über die Google Elevation API ermittelt.
                    </p>
                    <p class="mb-0" style="font-size: 0.8rem;">
                        <strong>Hinweis:</strong> Bei Änderung der Flächengeometrie werden aktivierte Auto-Calculate-Werte automatisch neu berechnet.
                        Bitte prüfen Sie nach jeder Änderung, ob die Höhenwerte noch korrekt sind.
                    </p>
                </div>

                <div class="mb-3">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox"
                               id="auto-calculate-terrain-heights"
                               ${pv.autoCalculateTerrainHeights !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="auto-calculate-terrain-heights">
                            Auto-Calculate Eckpunkt-Geländehöhen
                        </label>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-3" style="font-size: 0.875rem;">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 15%;">Punkt</th>
                                <th style="width: 28%;">Breite</th>
                                <th style="width: 28%;">Länge</th>
                                <th style="width: 29%;">
                                    Geländehöhe
                                    <i class="bi bi-info-circle text-primary ms-1"
                                       style="font-size: 0.75rem; cursor: help;"
                                       data-bs-toggle="tooltip"
                                       data-bs-placement="top"
                                       title="Höhe über NN (Normalnull)"></i>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${corners.map((corner, index) => `
                            <tr>
                                <td class="fw-bold">${index + 1}</td>
                                <td>
                                    <input type="text"
                                           class="form-control form-control-sm"
                                           id="lat-${index}"
                                           value="${corner.lat ? corner.lat().toFixed(6) : corner.lat || 0}"
                                           onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lat', this.value)"
                                           style="font-size: 0.8rem;"
                                           ${pv.locked ? 'readonly' : ''}>
                                </td>
                                <td>
                                    <input type="text"
                                           class="form-control form-control-sm"
                                           id="lng-${index}"
                                           value="${corner.lng ? corner.lng().toFixed(6) : corner.lng || 0}"
                                           onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lng', this.value)"
                                           style="font-size: 0.8rem;"
                                           ${pv.locked ? 'readonly' : ''}>
                                </td>
                                <td>
                                    <div class="input-group input-group-sm">
                                        <input type="number"
                                               class="form-control"
                                               id="terrain-height-${index}"
                                               value="${pv.terrainHeights && pv.terrainHeights[index] !== undefined ? pv.terrainHeights[index].toFixed(1) : '0.0'}"
                                               step="0.1"
                                               onchange="CornerDetailsManager.updateTerrainHeight(${index}, this.value)"
                                               style="font-size: 0.8rem;"
                                               ${pv.autoCalculateTerrainHeights !== false ? 'readonly' : ''}
                                               ${pv.locked ? 'disabled' : ''}>
                                        <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                                    </div>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Support Points Section -->
                <div class="mt-4 border-top pt-3">
                    <h6 class="mb-3">
                        <i class="bi bi-grid-3x3-gap me-2"></i>Topografie-Stützpunkte
                        <span class="badge bg-secondary ms-2" style="font-size: 0.7rem;">
                            ${pv.supportPoints ? pv.supportPoints.length : 0} Punkte
                        </span>
                        ${pv.gridActive ? `
                        <span class="badge bg-success ms-1" style="font-size: 0.7rem;">
                            <i class="bi bi-grid-3x3 me-1"></i>${pv.gridSpacing || 100}m Raster
                        </span>
                        ` : ''}
                    </h6>

                    <div class="mb-2">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox"
                                   id="auto-calculate-support-heights"
                                   ${pv.autoCalculateSupportHeights !== false ? 'checked' : ''}
                                   onchange="CornerDetailsManager.toggleAutoCalculateSupportHeights(this.checked)">
                            <label class="form-check-label" for="auto-calculate-support-heights" style="font-size: 0.875rem;">
                                Auto-Calculate Stützpunkt-Geländehöhen
                            </label>
                        </div>
                    </div>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0" style="font-size: 0.875rem;">
                                <i class="bi bi-geo me-1"></i>Stützpunkte
                            </h6>
                            <small class="text-muted">
                                ${pv.supportPoints ? pv.supportPoints.length : 0} Punkte
                            </small>
                        </div>
                    </div>

                    ${pv.gridNeedsUpdate ? `
                    <div class="alert alert-danger mb-3" style="font-size: 0.8rem;">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                <strong>Raster-Update erforderlich!</strong>
                                <div class="small mt-1">Die Flächengeometrie wurde geändert. Klicken Sie auf "Raster neu berechnen", um die Stützpunkte und Höhen zu aktualisieren.</div>
                            </div>
                            <button class="btn btn-sm btn-danger ms-3"
                                    onclick="CornerDetailsManager.confirmGridUpdate()"
                                    ${pv.locked ? 'disabled' : ''}>
                                <i class="bi bi-arrow-repeat me-1"></i>Raster neu berechnen
                            </button>
                        </div>
                    </div>
                    ` : (pv.supportMode === 'grid' || pv.supportMode === 'both') && pv.supportPoints && pv.supportPoints.filter(p => !p.manual).length > 0 ? `
                    <div class="alert alert-success mb-3" style="font-size: 0.8rem;">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>Stützpunkte vorhanden</strong>
                        <div class="small mt-1">
                            ${pv.supportPoints.filter(p => !p.manual).length} Rasterpunkte
                            ${pv.supportPoints.filter(p => p.manual).length > 0 ? ` + ${pv.supportPoints.filter(p => p.manual).length} eigene Punkte` : ''}
                        </div>
                    </div>
                    ` : pv.supportMode === 'manual' && pv.supportPoints && pv.supportPoints.length > 0 ? `
                    <div class="alert alert-info mb-3" style="font-size: 0.8rem;">
                        <i class="bi bi-info-circle me-2"></i>
                        <strong>Eigene Punkte aktiv</strong>
                        <div class="small mt-1">${pv.supportPoints.length} manuell gesetzte Stützpunkte definiert.</div>
                    </div>
                    ` : `
                    <div class="alert alert-warning mb-3" style="font-size: 0.8rem;">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Keine Stützpunkte vorhanden</strong>
                        <div class="small mt-1">Wählen Sie einen Modus und generieren Sie Stützpunkte.</div>
                    </div>
                    `}

                    <div class="mb-3">
                        <div class="btn-group btn-group-sm w-100 mb-2" role="group">
                            ${!pv.gridActive || pv.gridNeedsUpdate ? `
                            <button type="button" class="btn btn-outline-primary"
                                    onclick="CornerDetailsManager.generateDefaultGrid()"
                                    ${pv.locked ? 'disabled' : ''}>
                                <i class="bi bi-grid-3x3 me-1"></i>${pv.gridNeedsUpdate ? 'Raster erneuern' : '100m Raster'}
                            </button>
                            ` : `
                            <button type="button" class="btn btn-outline-secondary"
                                    onclick="CornerDetailsManager.showGridGeneratorDialog()"
                                    ${pv.locked ? 'disabled' : ''}>
                                <i class="bi bi-sliders me-1"></i>Raster (${pv.gridSpacing || 100}m)
                            </button>
                            `}
                            <button type="button" class="btn btn-outline-secondary"
                                    onclick="CornerDetailsManager.startManualPointPlacement()"
                                    ${pv.locked ? 'disabled' : ''}>
                                <i class="bi bi-plus-circle me-1"></i>Punkt
                            </button>
                            <button type="button" class="btn btn-outline-secondary"
                                    onclick="CornerDetailsManager.showImportDialog()"
                                    ${pv.locked ? 'disabled' : ''}>
                                <i class="bi bi-upload me-1"></i>Import
                            </button>
                        </div>
                    </div>

                    ${pv.supportPoints && pv.supportPoints.length > 0 ? `
                    <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
                        <table class="table table-sm table-hover mb-3" style="font-size: 0.8rem;">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th style="width: 15%;">Nr.</th>
                                    <th style="width: 28%;">Breite</th>
                                    <th style="width: 28%;">Länge</th>
                                    <th style="width: 20%;">Höhe</th>
                                    <th style="width: 9%;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pv.supportPoints.map((point, index) => `
                                <tr>
                                    <td class="fw-bold">S${index + 1}</td>
                                    <td>${point.lat.toFixed(6)}</td>
                                    <td>${point.lng.toFixed(6)}</td>
                                    <td>
                                        <div class="input-group input-group-sm">
                                            <input type="number"
                                                   class="form-control"
                                                   value="${point.height?.toFixed(1) || '0.0'}"
                                                   step="0.1"
                                                   onchange="CornerDetailsManager.updateSupportPointHeight(${index}, this.value)"
                                                   style="font-size: 0.75rem; padding: 0.15rem 0.3rem;"
                                                   ${pv.autoCalculateSupportHeights !== false ? 'readonly' : ''}
                                                   ${pv.locked ? 'disabled' : ''}>
                                            <span class="input-group-text" style="font-size: 0.7rem; padding: 0.15rem 0.3rem;">m</span>
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-link p-0 text-danger"
                                                onclick="CornerDetailsManager.deleteSupportPoint(${index})"
                                                title="Löschen"
                                                ${pv.locked ? 'disabled' : ''}>
                                            <i class="bi bi-trash" style="font-size: 0.8rem;"></i>
                                        </button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="text-start">
                        <button class="btn btn-sm btn-outline-danger"
                                onclick="CornerDetailsManager.clearAllSupportPoints()"
                                ${pv.locked ? 'disabled' : ''}>
                            <i class="bi bi-x-circle me-1"></i>Alle Stützpunkte löschen
                        </button>
                    </div>
                    ` : `
                    <div class="text-center text-muted py-3" style="font-size: 0.875rem;">
                        <i class="bi bi-info-circle me-2"></i>
                        Keine Stützpunkte vorhanden
                    </div>
                    `}
                </div>

                ${pv.locked ? `
                <div class="alert alert-warning mt-3 mb-3" style="font-size: 0.875rem;">
                    <i class="bi bi-lock me-2"></i>
                    PV-Fläche ist gesperrt. Entsperren Sie sie in der PV-Liste zum Bearbeiten.
                </div>
                ` : ''}

                <div class="mt-3">
                    <button class="btn btn-secondary btn-sm w-100" onclick="CornerDetailsManager.close()">
                        <i class="bi bi-x-circle me-2"></i>Schließen
                    </button>
                </div>
            `;

            // Add event listener for auto-calculate checkbox
            setTimeout(() => {
                const autoCalcCheckbox = document.getElementById('auto-calculate-terrain-heights');
                if (autoCalcCheckbox) {
                    autoCalcCheckbox.addEventListener('change', (e) => {
                        StateManager.updatePVArea(this.currentPVId, {
                            autoCalculateTerrainHeights: e.target.checked
                        });

                        // Enable/disable terrain height inputs
                        corners.forEach((_, index) => {
                            const input = document.getElementById(`terrain-height-${index}`);
                            if (input) {
                                input.readOnly = e.target.checked;
                            }
                        });

                        // Auto-calculate if enabling
                        if (e.target.checked) {
                            this.calculateTerrainHeights();
                        }
                    });
                }
            }, 50);
        } else if (pv.type === 'roof-mounted') {
            // Table layout for roof-mounted
            content.innerHTML = `
                <div class="alert alert-info mb-3" style="font-size: 0.875rem;">
                    <h6 class="alert-heading mb-2">
                        <i class="bi bi-exclamation-triangle me-2"></i>Wichtig: Dachhöhen eingeben
                    </h6>
                    <p class="mb-2" style="background-color: #fff3cd; padding: 8px; border-radius: 4px; border-left: 3px solid #ffc107;">
                        <strong style="color: #ff6b35;">➤ Geben Sie die Höhen der Dacheckpunkte ein!</strong><br>
                        In der Spalte <strong>"Höhe über GOK"</strong> (grün markiert) tragen Sie die tatsächlichen Höhen der Dacheckpunkte 
                        über dem Gelände ein. Diese Höhen definieren die Dachneigung, auf der die PV-Module aufgeständert werden.
                    </p>
                    <p class="mb-2">
                        <strong>Was ist die Best-Fit-Ebene?</strong><br>
                        Bei aufgeständerten Dachanlagen wird angenommen, dass alle Eckpunkte auf einer gemeinsamen Dachfläche liegen. 
                        Da reale Dächer nicht immer perfekt eben sind, berechnet das System automatisch eine Best-Fit-Ebene, 
                        die bestmöglich durch alle Eckpunkte verläuft.
                    </p>
                    <p class="mb-2">
                        <strong>GOK = Geländeoberkante:</strong><br>
                        Die GOK bezeichnet die Höhe des natürlichen Geländes an der Stelle der PV-Anlage. 
                        Alle Höhenangaben in der Tabelle beziehen sich auf diese Referenzhöhe.
                    </p>
                    <p class="mb-0">
                        <strong>Hinweis:</strong> Die Best-Fit-Ebene repräsentiert die tatsächliche Dachfläche, 
                        auf der die PV-Module aufgeständert montiert werden. Die Simulation verwendet diese berechnete 
                        Ebene als Grundlage für die Aufständerung.
                    </p>
                </div>
                
                <div class="mb-3">
                    <label class="form-label mb-1" style="font-size: 0.875rem; font-weight: 600;">
                        Referenzhöhe / Geländeoberkante (m über NN)
                        <i class="bi bi-info-circle text-primary ms-1" 
                           style="font-size: 0.75rem; cursor: help;" 
                           data-bs-toggle="tooltip" 
                           data-bs-placement="top"
                           title="Referenzhöhe über NN: Höhe des Geländes über dem Meeresspiegel. Auto-Calculate ermittelt die Höhe über Google Elevation API. Die Höhen der PV-Flächen-Kanten werden relativ zu dieser Höhe angegeben.">
                        </i>
                    </label>
                    <div class="d-flex align-items-center gap-1">
                        <input type="number" 
                               class="form-control form-control-sm" 
                               id="reference-height-${pv.id}"
                               value="${pv.referenceHeight ? pv.referenceHeight.toFixed(2) : '0.00'}"
                               min="-100" max="5000" 
                               step="0.01"
                               style="max-width: 100px;"
                               ${pv.autoCalculateReferenceHeight !== false ? 'disabled' : ''}
                               onchange="CornerDetailsManager.updateReferenceHeight(this.value)">
                        <input class="form-check-input" type="checkbox" 
                               id="auto-calc-ref-${pv.id}" 
                               style="border-color: #4274a5;"
                               ${pv.autoCalculateReferenceHeight !== false ? 'checked' : ''}
                               onchange="CornerDetailsManager.toggleAutoCalculateReference(this.checked)">
                        <label class="form-check-label small" for="auto-calc-ref-${pv.id}" style="white-space: nowrap; color: #6c757d;">
                            Auto-Calculate
                        </label>
                    </div>
                </div>
                
                <h6 class="mb-2">
                    <i class="bi bi-geo-alt me-2"></i>Eckpunkt-Koordinaten + Höhen
                </h6>
                
                <div class="table-responsive">
                    <table class="table table-sm table-hover" style="font-size: 0.875rem;">
                        <thead>
                            <tr class="table-light">
                                <th style="width: 40px;">#</th>
                                <th style="min-width: 130px;">Breitengrad</th>
                                <th style="min-width: 130px;">Längengrad</th>
                                <th style="width: 120px; text-align: center;" class="table-warning">
                                    Höhe eingeben<br>
                                    <small class="text-muted">(m über GOK)</small>
                                </th>
                                <th style="width: 100px; text-align: center;">
                                    Best-Fit<br>
                                    <small class="text-muted">(m über GOK)</small>
                                </th>
                                <th style="width: 100px; text-align: center;">
                                    Total<br>
                                    <small class="text-muted">(m über NN)</small>
                                </th>
                                <th style="width: 40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${corners.map((corner, index) => `
                                <tr>
                                    <td class="text-center">
                                        <strong>${index + 1}</strong>
                                    </td>
                                    <td>
                                        <input type="text" 
                                               class="form-control form-control-sm" 
                                               style="font-size: 0.85rem; ${pv.locked ? 'background-color: #f8f9fa;' : ''}"
                                               value="${corner.lat ? corner.lat().toFixed(8) : corner.lat || 0}"
                                               onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lat', this.value)"
                                               ${pv.locked ? 'readonly' : ''}>
                                    </td>
                                    <td>
                                        <input type="text" 
                                               class="form-control form-control-sm" 
                                               style="font-size: 0.85rem; ${pv.locked ? 'background-color: #f8f9fa;' : ''}"
                                               value="${corner.lng ? corner.lng().toFixed(8) : corner.lng || 0}"
                                               onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lng', this.value)"
                                               ${pv.locked ? 'readonly' : ''}>
                                    </td>
                                    <td class="table-warning">
                                        <input type="number" 
                                               class="form-control form-control-sm" 
                                               style="font-size: 0.85rem; padding: 0.375rem 0.5rem; ${pv.locked ? 'background-color: #f8f9fa;' : 'background-color: #fffdf0; border: 2px solid #ffc107;'}"
                                               value="${pv.cornerHeights[index].toFixed(2)}"
                                               step="0.1"
                                               placeholder="Höhe eingeben"
                                               onchange="CornerDetailsManager.updateCornerHeight(${index}, this.value)"
                                               ${pv.locked ? 'readonly' : ''}>
                                    </td>
                                    <td class="text-center">
                                        <span class="text-muted" style="font-size: 0.8rem; font-weight: 500;">
                                            ${(parseFloat(this.calculateBestFitHeight(pv, index)) - (pv.referenceHeight || 0)).toFixed(2)}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <span class="badge" style="background-color: #4274a5; font-size: 0.75rem;">
                                            ${this.calculateBestFitHeight(pv, index)}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        ${corners.length > 3 && !pv.locked ? `
                                            <button class="btn btn-sm btn-link p-0 text-danger" 
                                                    onclick="CornerDetailsManager.deleteCorner(${index})"
                                                    title="Eckpunkt löschen">
                                                <i class="bi bi-trash" style="font-size: 0.9rem;"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${pv.locked ? `
                <div class="alert alert-warning mt-3 mb-3" style="font-size: 0.875rem;">
                    <i class="bi bi-lock me-2"></i>
                    PV-Fläche ist gesperrt. Entsperren Sie sie in der PV-Liste zum Bearbeiten.
                </div>
                ` : ''}
                
                <div class="mt-3 pt-3 border-top">
                    <button class="btn btn-secondary btn-sm w-100" onclick="CornerDetailsManager.close()">
                        <i class="bi bi-x-circle me-1"></i>Schließen
                    </button>
                </div>
            `;
        } else if (pv.type === 'facade') {
            // Simple layout for facade (2 points)
            content.innerHTML = `
                <div class="alert alert-info mb-3">
                    <h6 class="alert-heading">
                        <i class="bi bi-info-circle me-2"></i>Fassaden-Koordinaten
                    </h6>
                    <p class="mb-0 small">
                        Bearbeiten Sie die Koordinaten der beiden Endpunkte der Fassade.
                        Die <span style="color: #FF8C00; font-weight: bold;">orange Linie</span> zeigt die reflektierende Seite.
                    </p>
                </div>
                
                <h6 class="mb-3">Endpunkt-Koordinaten</h6>
                
                <div class="corners-container">
                    ${corners.map((corner, index) => `
                        <div class="corner-card" id="corner-card-${index}">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <strong>Punkt ${index + 1}</strong>
                                ${pv.locked ? `
                                    <i class="bi bi-lock text-warning" 
                                       style="cursor: help;" 
                                       data-bs-toggle="tooltip" 
                                       data-bs-placement="left" 
                                       data-bs-html="true"
                                       title="<strong>PV-Fläche ist gesperrt</strong><br>Entsperren Sie die PV-Fläche über den Sperr-Button in der PV-Liste."></i>
                                ` : ''}
                            </div>
                            
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label small mb-1">Breitengrad</label>
                                    <input type="text" 
                                           class="form-control form-control-sm" 
                                           id="lat-${index}"
                                           value="${corner.lat ? corner.lat().toFixed(8) : corner.lat || 0}"
                                           onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lat', this.value)"
                                           ${pv.locked ? 'readonly' : ''}>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small mb-1">Längengrad</label>
                                    <input type="text" 
                                           class="form-control form-control-sm" 
                                           id="lng-${index}"
                                           value="${corner.lng ? corner.lng().toFixed(8) : corner.lng || 0}"
                                           onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lng', this.value)"
                                           ${pv.locked ? 'readonly' : ''}>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${pv.locked ? `
                <div class="alert alert-warning mt-3 mb-3" style="font-size: 0.875rem;">
                    <i class="bi bi-lock me-2"></i>
                    PV-Fläche ist gesperrt. Entsperren Sie sie in der PV-Liste zum Bearbeiten.
                </div>
                ` : ''}
                
                <div class="mt-4 pt-3 border-top">
                    <button class="btn btn-secondary w-100" onclick="CornerDetailsManager.close()">
                        <i class="bi bi-x-circle me-2"></i>Schließen
                    </button>
                </div>
            `;
        } else {
            // Original card layout for other types
            content.innerHTML = `
                <div class="alert alert-info mb-3">
                    <h6 class="alert-heading">
                        <i class="bi bi-info-circle me-2"></i>Koordinaten-Bearbeitung
                    </h6>
                    <p class="mb-2 small">
                        Die PV-Fläche wird an die neue Position verschoben und die Form bleibt erhalten.
                    </p>
                    <ul class="mb-0 small">
                        <li>Klicken Sie auf "Bearbeiten" bei einem Eckpunkt</li>
                        <li>Geben Sie die neuen Koordinaten ein</li>
                        <li>Bestätigen Sie mit "Anwenden"</li>
                    </ul>
                </div>
                
                <h6 class="mb-3">Eckpunkt-Koordinaten</h6>
                
                <div class="corners-container">
            ${corners.map((corner, index) => `
                <div class="corner-card ${this.editingCorner === index ? 'editing' : ''}" id="corner-card-${index}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong>${cornerLabels[index]}</strong>
                        ${pv.type === 'roof-mounted' ? 
                            (pv.locked ? `
                                <i class="bi bi-lock text-warning" 
                                   style="cursor: help;" 
                                   data-bs-toggle="tooltip" 
                                   data-bs-placement="left" 
                                   data-bs-html="true"
                                   title="<strong>PV-Fläche ist gesperrt</strong><br>Entsperren Sie die PV-Fläche über den Sperr-Button in der PV-Liste, um die Koordinaten bearbeiten zu können."></i>
                            ` : '') 
                        : 
                            (this.editingCorner === index ? '' : (pv.locked ? `
                                <i class="bi bi-lock text-warning" 
                                   style="cursor: help;" 
                                   data-bs-toggle="tooltip" 
                                   data-bs-placement="left" 
                                   data-bs-html="true"
                                   title="<strong>PV-Fläche ist gesperrt</strong><br>Entsperren Sie die PV-Fläche über den Sperr-Button in der PV-Liste, um die Koordinaten bearbeiten zu können."></i>
                            ` : `
                                <button class="btn btn-sm btn-link text-primary p-0" onclick="CornerDetailsManager.startEdit(${index})" title="Koordinaten bearbeiten">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                            `))}
                    </div>
                    
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="form-label small mb-1">Breitengrad</label>
                            <input type="text" 
                                   class="form-control form-control-sm" 
                                   id="lat-${index}"
                                   value="${corner.lat ? corner.lat().toFixed(8) : corner.lat || 0}"
                                   onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lat', this.value)"
                                   ${pv.type === 'roof-mounted' ? (pv.locked ? 'readonly' : '') : (this.editingCorner === index ? '' : 'readonly')}>
                        </div>
                        <div class="col-6">
                            <label class="form-label small mb-1">Längengrad</label>
                            <input type="text" 
                                   class="form-control form-control-sm" 
                                   id="lng-${index}"
                                   value="${corner.lng ? corner.lng().toFixed(8) : corner.lng || 0}"
                                   onchange="CornerDetailsManager.directUpdateCoordinate(${index}, 'lng', this.value)"
                                   ${pv.type === 'roof-mounted' ? (pv.locked ? 'readonly' : '') : (this.editingCorner === index ? '' : 'readonly')}>
                        </div>
                    </div>
                    
                    ${pv.type === 'roof-mounted' && pv.cornerHeights && pv.cornerHeights[index] !== undefined ? `
                        <div class="mt-2">
                            <label class="form-label small mb-1">Höhe über Referenz</label>
                            <div class="input-group input-group-sm">
                                <input type="number" 
                                       class="form-control" 
                                       id="height-${index}"
                                       value="${pv.cornerHeights[index].toFixed(2)}"
                                       step="0.1"
                                       onchange="CornerDetailsManager.updateCornerHeight(${index}, this.value)"
                                       ${pv.locked ? 'readonly' : ''}>
                                <span class="input-group-text">m</span>
                            </div>
                        </div>
                        <div class="mt-2">
                            <label class="form-label small mb-1">Resultierende Höhe (Best-Fit)</label>
                            <div class="input-group input-group-sm">
                                <input type="text" 
                                       class="form-control" 
                                       id="resulting-height-${index}"
                                       value="${this.calculateBestFitHeight(pv, index)}"
                                       disabled
                                       style="background-color: #e9ecef; cursor: not-allowed;">
                                <span class="input-group-text">m</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${this.editingCorner === index && pv.type !== 'roof-mounted' ? `
                        <div class="mt-3 pt-2 border-top d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="CornerDetailsManager.cancelEdit()">
                                <i class="bi bi-x-lg"></i> Abbrechen
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="CornerDetailsManager.applyEdit(${index})">
                                <i class="bi bi-check-lg"></i> Anwenden
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
            </div>
            
            ${corners.length === 0 ? '<p class="text-muted">Keine Eckpunkte vorhanden</p>' : ''}
            
            <div class="mt-4 pt-3 border-top">
                <button class="btn btn-secondary w-100" onclick="CornerDetailsManager.close()">
                    <i class="bi bi-x-circle me-2"></i>Schließen
                </button>
            </div>
        `;
        }
        
        // Initialize Bootstrap tooltips for lock icons
        setTimeout(() => {
            const tooltipTriggerList = document.querySelectorAll('#cornerDetailsContent [data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }, 50);
    },
    
    /**
     * Update only the coordinate values (for live updates)
     */
    updateCoordinates() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;

        // Don't update any coordinates if we're editing
        if (this.editingCorner !== null) return;

        const path = pv.polygon.getPath();
        let coordinatesChanged = false;

        for (let i = 0; i < path.getLength(); i++) {
            const corner = path.getAt(i);
            const latInput = document.getElementById(`lat-${i}`);
            const lngInput = document.getElementById(`lng-${i}`);

            if (latInput) {
                const decimals = (pv.type === 'field' || pv.type === 'ground') ? 6 : 8;
                const newLatValue = corner.lat().toFixed(decimals);
                if (latInput.value !== newLatValue) {
                    coordinatesChanged = true;
                    latInput.value = newLatValue;
                }
            }
            if (lngInput) {
                const decimals = (pv.type === 'field' || pv.type === 'ground') ? 6 : 8;
                const newLngValue = corner.lng().toFixed(decimals);
                if (lngInput.value !== newLngValue) {
                    coordinatesChanged = true;
                    lngInput.value = newLngValue;
                }
            }
        }

        // For field installations with auto-calculate, update terrain heights when dragging
        if (coordinatesChanged && (pv.type === 'field' || pv.type === 'ground') && pv.autoCalculateTerrainHeights !== false) {
            // Debounce the terrain height calculation
            if (this._terrainUpdateTimeoutDrag) {
                clearTimeout(this._terrainUpdateTimeoutDrag);
            }
            this._terrainUpdateTimeoutDrag = setTimeout(() => {
                this.calculateTerrainHeights();
            }, 1000); // Wait 1 second after dragging stops
        }
    },
    
    /**
     * Direct update for coordinates
     */
    directUpdateCoordinate(cornerIndex, type, value) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;
        
        // Check if PV area is locked
        if (pv.locked) return;
        
        const newValue = parseFloat(value);
        if (isNaN(newValue)) return;
        
        // Handle both polygon and polyline (facade)
        const shape = pv.polygon || pv.polyline;
        if (!shape) return;
        
        const path = shape.getPath();
        const currentCorner = path.getAt(cornerIndex);
        
        // Update the specific corner directly
        if (type === 'lat') {
            path.setAt(cornerIndex, new google.maps.LatLng(newValue, currentCorner.lng()));
        } else if (type === 'lng') {
            path.setAt(cornerIndex, new google.maps.LatLng(currentCorner.lat(), newValue));
        }
        
        // Update state with new corners
        const newCorners = [];
        for (let i = 0; i < path.getLength(); i++) {
            const corner = path.getAt(i);
            newCorners.push({
                lat: corner.lat(),
                lng: corner.lng()
            });
        }
        
        // For facade, also update endpoint markers if they exist
        if (pv.type === 'facade' && pv.endpointMarkers && pv.endpointMarkers[cornerIndex]) {
            pv.endpointMarkers[cornerIndex].setPosition(path.getAt(cornerIndex));
            
            // Update orange line
            if (pv.orangeLine) {
                const map = MapManager.getMap();
                const projection = map.getProjection();
                
                if (projection && path.getLength() === 2) {
                    // Convert to pixels
                    const startPixel = projection.fromLatLngToPoint(path.getAt(0));
                    const endPixel = projection.fromLatLngToPoint(path.getAt(1));
                    
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
                        
                        pv.orangeLine.setPath([offsetStart, offsetEnd]);
                    }
                }
            }
            
            // Recalculate azimuth if auto-calculate is enabled
            if (pv.autoCalculateAzimuth !== false && path.getLength() === 2) {
                const heading = google.maps.geometry.spherical.computeHeading(path.getAt(0), path.getAt(1));
                let azimuth = (heading + 90) % 360;
                if (azimuth < 0) azimuth += 360;
                StateManager.updatePVArea(this.currentPVId, { azimuth: Math.round(azimuth) });
            }
        }
        
        StateManager.updatePVArea(this.currentPVId, { 
            corners: newCorners,
            facadeLine: pv.type === 'facade' ? newCorners : undefined
        });
        
        // Update corner markers if they exist
        if (pv.cornerMarkers && pv.cornerMarkers[cornerIndex]) {
            pv.cornerMarkers[cornerIndex].setPosition(path.getAt(cornerIndex));
        }
        
        // Update dimensions if shown
        if (pv.showDimensions && window.Dimensions) {
            window.Dimensions.update(pv);
        }
        
        // Trigger any edge markers updates for roof-parallel
        if (pv.type === 'roof-parallel' && pv.edgeHighlights) {
            // The edgeHighlights should auto-update via the path listener
            // but we can force a visual update if needed
        }
        
        // Update best-fit plane display
        this.render();

        // For field installations with auto-calculate enabled, update terrain height
        if ((pv.type === 'field' || pv.type === 'ground') && pv.autoCalculateTerrainHeights !== false) {
            // Debounce the terrain height calculation
            if (this._terrainUpdateTimeout) {
                clearTimeout(this._terrainUpdateTimeout);
            }
            this._terrainUpdateTimeout = setTimeout(() => {
                this.calculateSingleTerrainHeight(cornerIndex);
            }, 500);
        }
    },
    
    /**
     * Start editing a corner
     */
    startEdit(cornerIndex) {
        // Check if PV area is locked
        const pv = StateManager.getPVArea(this.currentPVId);
        if (pv && pv.locked) {
            // Don't allow editing if locked
            return;
        }
        
        this.editingCorner = cornerIndex;
        this.render();
    },
    
    /**
     * Cancel editing
     */
    cancelEdit() {
        this.editingCorner = null;
        this.render();
    },
    
    /**
     * Apply coordinate edit
     */
    applyEdit(cornerIndex) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;
        
        // Check if PV area is locked
        if (pv.locked) {
            alert('Diese PV-Fläche ist gesperrt und kann nicht bearbeitet werden.');
            this.cancelEdit();
            return;
        }
        
        const latInput = document.getElementById(`lat-${cornerIndex}`);
        const lngInput = document.getElementById(`lng-${cornerIndex}`);
        
        const newLat = parseFloat(latInput.value);
        const newLng = parseFloat(lngInput.value);
        
        if (isNaN(newLat) || isNaN(newLng)) {
            alert('Bitte geben Sie gültige Koordinaten ein');
            return;
        }
        
        const path = pv.polygon.getPath();
        
        // For roof-mounted PV areas, only update the specific corner (no teleport)
        if (pv.type === 'roof-mounted') {
            // Update only the specific corner
            path.setAt(cornerIndex, new google.maps.LatLng(newLat, newLng));
        } else {
            // For other types (roof-parallel), teleport the entire area
            const currentCorner = path.getAt(cornerIndex);
            
            // Calculate offset
            const latOffset = newLat - currentCorner.lat();
            const lngOffset = newLng - currentCorner.lng();
            
            // Update each point in the path
            for (let i = 0; i < path.getLength(); i++) {
                const corner = path.getAt(i);
                path.setAt(i, new google.maps.LatLng(
                    corner.lat() + latOffset,
                    corner.lng() + lngOffset
                ));
            }
        }
        
        // Update state with new corners
        const newCorners = [];
        for (let i = 0; i < path.getLength(); i++) {
            const corner = path.getAt(i);
            newCorners.push({
                lat: corner.lat(),
                lng: corner.lng()
            });
        }
        StateManager.updatePVArea(this.currentPVId, { corners: newCorners });
        
        // Update enhanced elements that don't update automatically
        if (pv.type === 'roof-parallel') {
            const enhancedElements = pv.enhancedElements || pv.polygon.enhancedElements;
            
            // Update edge move markers positions
            if (enhancedElements && enhancedElements.edgeMoveMarkers) {
                if (enhancedElements.edgeMoveMarkers[0]) {
                    const midpoint12 = new google.maps.LatLng(
                        (path.getAt(0).lat() + path.getAt(1).lat()) / 2,
                        (path.getAt(0).lng() + path.getAt(1).lng()) / 2
                    );
                    enhancedElements.edgeMoveMarkers[0].setPosition(midpoint12);
                }
                if (enhancedElements.edgeMoveMarkers[1]) {
                    const midpoint34 = new google.maps.LatLng(
                        (path.getAt(2).lat() + path.getAt(3).lat()) / 2,
                        (path.getAt(2).lng() + path.getAt(3).lng()) / 2
                    );
                    enhancedElements.edgeMoveMarkers[1].setPosition(midpoint34);
                }
            }
            
            // Update rotation marker position
            if (enhancedElements && enhancedElements.rotationMarker) {
                const center = new google.maps.LatLng(
                    (path.getAt(0).lat() + path.getAt(1).lat() + path.getAt(2).lat() + path.getAt(3).lat()) / 4,
                    (path.getAt(0).lng() + path.getAt(1).lng() + path.getAt(2).lng() + path.getAt(3).lng()) / 4
                );
                enhancedElements.rotationMarker.setPosition(center);
            }
            
            // Update rotation marker in associatedElements if it exists
            if (pv.polygon.associatedElements && pv.polygon.associatedElements.rotationMarker) {
                const center = new google.maps.LatLng(
                    (path.getAt(0).lat() + path.getAt(1).lat() + path.getAt(2).lat() + path.getAt(3).lat()) / 4,
                    (path.getAt(0).lng() + path.getAt(1).lng() + path.getAt(2).lng() + path.getAt(3).lng()) / 4
                );
                pv.polygon.associatedElements.rotationMarker.setPosition(center);
            }
        }
        
        // Update dimensions if shown
        const updatedPV = StateManager.getPVArea(this.currentPVId);
        if (updatedPV && updatedPV.showDimensions && window.Dimensions) {
            // Force dimension update
            window.Dimensions.hide(updatedPV);
            window.Dimensions.show(updatedPV);
        }
        
        // Center map on new location
        const map = MapManager.getMap();
        map.panTo(new google.maps.LatLng(newLat, newLng));
        
        // Exit edit mode
        this.editingCorner = null;
        this.render();
    },
    
    /**
     * Calculate best fit height for a corner
     */
    calculateBestFitHeight(pv, cornerIndex) {
        if (!pv.cornerHeights || pv.cornerHeights.length < 3) {
            // If less than 3 points, just return the actual height
            const referenceHeight = pv.referenceHeight || 0;
            const heightAboveReference = pv.cornerHeights ? pv.cornerHeights[cornerIndex] || 0 : 0;
            return (referenceHeight + heightAboveReference).toFixed(2);
        }
        
        // Prepare points for best fit plane calculation
        const points = [];
        const path = pv.polygon.getPath();
        
        for (let i = 0; i < path.getLength() && i < pv.cornerHeights.length; i++) {
            const corner = path.getAt(i);
            const height = (pv.referenceHeight || 0) + (pv.cornerHeights[i] || 0);
            
            // Convert lat/lng to local coordinates (simplified projection)
            // Using the first point as origin
            if (i === 0) {
                this.origin = corner;
            }
            
            const x = this.latLngToMeters(corner.lat(), this.origin.lat());
            const y = this.latLngToMeters(corner.lng(), this.origin.lng());
            
            points.push({ x, y, z: height });
        }
        
        // Calculate best fit plane
        const plane = this.calculateBestFitPlane(points);
        if (!plane) {
            return ((pv.referenceHeight || 0) + (pv.cornerHeights[cornerIndex] || 0)).toFixed(2);
        }
        
        // Calculate the height at this corner according to the best fit plane
        const corner = path.getAt(cornerIndex);
        const x = this.latLngToMeters(corner.lat(), this.origin.lat());
        const y = this.latLngToMeters(corner.lng(), this.origin.lng());
        
        const bestFitHeight = -(plane.normal.x * x + plane.normal.y * y + plane.d) / plane.normal.z;
        return bestFitHeight.toFixed(2);
    },
    
    /**
     * Convert lat/lng difference to meters (simplified)
     */
    latLngToMeters(value, origin) {
        // Approximate conversion: 1 degree ≈ 111,111 meters
        return (value - origin) * 111111;
    },
    
    /**
     * Calculate best fit plane for a set of 3D points using least squares
     */
    calculateBestFitPlane(points) {
        const n = points.length;
        if (n < 3) return null;
        
        // For exactly 3 points, use cross product (exact solution)
        if (n === 3) {
            const v1 = {
                x: points[1].x - points[0].x,
                y: points[1].y - points[0].y,
                z: points[1].z - points[0].z
            };
            const v2 = {
                x: points[2].x - points[0].x,
                y: points[2].y - points[0].y,
                z: points[2].z - points[0].z
            };
            
            const normal = {
                x: v1.y * v2.z - v1.z * v2.y,
                y: v1.z * v2.x - v1.x * v2.z,
                z: v1.x * v2.y - v1.y * v2.x
            };
            
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
            if (length > 0) {
                normal.x /= length;
                normal.y /= length;
                normal.z /= length;
            }
            
            const d = -(normal.x * points[0].x + normal.y * points[0].y + normal.z * points[0].z);
            return { normal, d };
        }
        
        // For more than 3 points, use least squares fitting
        // We want to fit z = ax + by + c
        let sumX = 0, sumY = 0, sumZ = 0;
        let sumXX = 0, sumXY = 0, sumXZ = 0;
        let sumYY = 0, sumYZ = 0;
        
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumZ += p.z;
            sumXX += p.x * p.x;
            sumXY += p.x * p.y;
            sumXZ += p.x * p.z;
            sumYY += p.y * p.y;
            sumYZ += p.y * p.z;
        });
        
        // Build the normal equations matrix
        const A = [
            [sumXX, sumXY, sumX],
            [sumXY, sumYY, sumY],
            [sumX, sumY, n]
        ];
        
        const b = [sumXZ, sumYZ, sumZ];
        
        // Solve using Cramer's rule (for 3x3 system)
        const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
                    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
                    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
        
        if (Math.abs(det) < 0.0001) {
            // Singular matrix, fall back to simple method
            return this.calculateBestFitPlaneSimple(points);
        }
        
        // Calculate coefficients
        const a = (b[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
                   A[0][1] * (b[1] * A[2][2] - A[1][2] * b[2]) +
                   A[0][2] * (b[1] * A[2][1] - A[1][1] * b[2])) / det;
        
        const b_coef = (A[0][0] * (b[1] * A[2][2] - A[1][2] * b[2]) -
                        b[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
                        A[0][2] * (A[1][0] * b[2] - b[1] * A[2][0])) / det;
        
        const c = (A[0][0] * (A[1][1] * b[2] - b[1] * A[2][1]) -
                   A[0][1] * (A[1][0] * b[2] - b[1] * A[2][0]) +
                   b[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])) / det;
        
        // Convert to normal form: ax + by - z + c = 0
        // Normal is (a, b, -1), needs normalization
        const normal = { x: a, y: b_coef, z: -1 };
        const length = Math.sqrt(a * a + b_coef * b_coef + 1);
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
        
        const d = c / length;
        
        return { normal, d };
    },
    
    calculateBestFitPlaneSimple(points) {
        // Fallback: use first 3 points
        if (points.length >= 3) {
            const v1 = {
                x: points[1].x - points[0].x,
                y: points[1].y - points[0].y,
                z: points[1].z - points[0].z
            };
            const v2 = {
                x: points[2].x - points[0].x,
                y: points[2].y - points[0].y,
                z: points[2].z - points[0].z
            };
            
            const normal = {
                x: v1.y * v2.z - v1.z * v2.y,
                y: v1.z * v2.x - v1.x * v2.z,
                z: v1.x * v2.y - v1.y * v2.x
            };
            
            const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
            if (length > 0) {
                normal.x /= length;
                normal.y /= length;
                normal.z /= length;
            }
            
            const d = -(normal.x * points[0].x + normal.y * points[0].y + normal.z * points[0].z);
            return { normal, d };
        }
        return null;
    },
    
    /**
     * Update reference height
     */
    updateReferenceHeight(value) {
        const height = parseFloat(value);
        if (!isNaN(height)) {
            StateManager.updatePVArea(this.currentPVId, { referenceHeight: height });
            // Re-render to update Best-Fit calculations
            this.render();
        }
    },
    
    /**
     * Toggle auto-calculate for reference height
     */
    toggleAutoCalculateReference(checked) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;
        
        StateManager.updatePVArea(this.currentPVId, { 
            autoCalculateReferenceHeight: checked 
        });
        
        if (checked) {
            // Calculate reference height
            this.calculateReferenceHeight();
        }
        
        // Re-render to update input state
        this.render();
    },
    
    /**
     * Calculate reference height from Google Elevation API (placeholder)
     */
    calculateReferenceHeight() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;
        
        // TODO: This should call Google Elevation API for each corner
        // For now, use a placeholder calculation
        const path = pv.polygon.getPath();
        
        // Simulate API call with a default value - round to 2 decimal places
        const simulatedHeight = parseFloat((250 + Math.random() * 50).toFixed(2));
        
        StateManager.updatePVArea(this.currentPVId, { referenceHeight: simulatedHeight });
        this.render();
    },
    
    /**
     * Update corner height
     */
    updateCornerHeight(cornerIndex, value) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;

        const height = parseFloat(value);
        if (!isNaN(height)) {
            const cornerHeights = [...(pv.cornerHeights || [0, 0, 0, 0])];
            cornerHeights[cornerIndex] = height;
            StateManager.updatePVArea(this.currentPVId, { cornerHeights });

            // Update best-fit plane display for roof-mounted
            if (pv.type === 'roof-mounted') {
                this.render();
            }
        }
    },

    /**
     * Update terrain height for a corner in field installations
     */
    updateTerrainHeight(cornerIndex, value) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || pv.type !== 'field') return;

        const height = parseFloat(value);
        if (!isNaN(height)) {
            const terrainHeights = [...(pv.terrainHeights || new Array(pv.corners ? pv.corners.length : 4).fill(0))];
            terrainHeights[cornerIndex] = height;
            StateManager.updatePVArea(this.currentPVId, { terrainHeights });
        }
    },

    /**
     * Calculate terrain height for a single corner
     */
    async calculateSingleTerrainHeight(cornerIndex) {
        console.log('calculateSingleTerrainHeight called for index:', cornerIndex);
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || pv.type !== 'field') {
            console.log('PV not found or not field type');
            return;
        }

        // Get the specific corner
        let corner;
        if (pv.polygon) {
            const path = pv.polygon.getPath();
            if (cornerIndex < path.getLength()) {
                const point = path.getAt(cornerIndex);
                corner = { lat: point.lat(), lng: point.lng() };
                console.log('Got corner from polygon:', corner);
            }
        } else if (pv.corners && pv.corners[cornerIndex]) {
            corner = pv.corners[cornerIndex];
            console.log('Got corner from stored corners:', corner);
        }

        if (!corner) {
            console.log('Corner not found');
            return;
        }

        // Use Google Elevation API
        const elevator = new google.maps.ElevationService();

        try {
            const response = await new Promise((resolve, reject) => {
                elevator.getElevationForLocations({
                    locations: [{ lat: corner.lat, lng: corner.lng }]
                }, (results, status) => {
                    if (status === 'OK' && results.length > 0) {
                        resolve(results[0]);
                    } else {
                        reject(new Error(`Elevation API error: ${status}`));
                    }
                });
            });

            console.log('Elevation API response:', response);

            // Update only the specific terrain height
            const terrainHeights = [...(pv.terrainHeights || new Array(pv.corners ? pv.corners.length : 4).fill(0))];
            terrainHeights[cornerIndex] = response.elevation;
            console.log('Updating terrain heights:', terrainHeights);
            StateManager.updatePVArea(this.currentPVId, { terrainHeights });

            // Update UI
            const input = document.getElementById(`terrain-height-${cornerIndex}`);
            if (input) {
                input.value = response.elevation.toFixed(1);
                console.log('Updated input field with value:', response.elevation.toFixed(1));
            } else {
                console.log('Input field not found for terrain-height-' + cornerIndex);
            }

        } catch (error) {
            console.error('Error fetching elevation data for corner:', error);
        }
    },

    /**
     * Calculate terrain heights using Google Elevation API
     */
    async calculateTerrainHeights() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || pv.type !== 'field') return;

        // Get corners from polygon
        let corners = [];
        if (pv.polygon) {
            const path = pv.polygon.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                corners.push({ lat: point.lat(), lng: point.lng() });
            }
        } else if (pv.corners) {
            corners = pv.corners;
        }

        if (corners.length === 0) return;

        // Use Google Elevation API
        const elevator = new google.maps.ElevationService();
        const locations = corners.map(corner => ({
            lat: corner.lat,
            lng: corner.lng
        }));

        try {
            const response = await new Promise((resolve, reject) => {
                elevator.getElevationForLocations({
                    locations: locations
                }, (results, status) => {
                    if (status === 'OK') {
                        resolve(results);
                    } else {
                        reject(new Error(`Elevation API error: ${status}`));
                    }
                });
            });

            // Update terrain heights
            const terrainHeights = response.map(result => result.elevation);
            StateManager.updatePVArea(this.currentPVId, { terrainHeights });

            // Update UI
            terrainHeights.forEach((height, index) => {
                const input = document.getElementById(`terrain-height-${index}`);
                if (input) {
                    input.value = height.toFixed(1);
                }
            });

            // Success - no message needed, heights are updated silently

        } catch (error) {
            console.error('Error fetching elevation data:', error);

            // Show error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
            alertDiv.style.fontSize = '0.875rem';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>
                Fehler beim Abrufen der Geländehöhen. Bitte versuchen Sie es erneut.
                <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert"></button>
            `;

            const content = document.getElementById('cornerDetailsContent');
            const existingAlert = content.querySelector('.alert-danger');
            if (existingAlert) {
                existingAlert.remove();
            }
            content.insertBefore(alertDiv, content.querySelector('.mt-3'));
        }
    },
    
    /**
     * Add a new corner to the polygon
     */
    addCorner() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon || pv.locked) return;
        
        const path = pv.polygon.getPath();
        const center = new google.maps.LatLng(0, 0);
        
        // Calculate center of existing polygon
        let sumLat = 0, sumLng = 0;
        for (let i = 0; i < path.getLength(); i++) {
            sumLat += path.getAt(i).lat();
            sumLng += path.getAt(i).lng();
        }
        const centerLat = sumLat / path.getLength();
        const centerLng = sumLng / path.getLength();
        
        // Add new point near the center
        const newPoint = new google.maps.LatLng(
            centerLat + (Math.random() - 0.5) * 0.0001,
            centerLng + (Math.random() - 0.5) * 0.0001
        );
        
        path.push(newPoint);
        
        // Update corner heights array
        const cornerHeights = [...(pv.cornerHeights || [])];
        cornerHeights.push(0); // New corner starts at height 0
        StateManager.updatePVArea(this.currentPVId, { cornerHeights });
        
        // Update corners in state
        const corners = [];
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            corners.push({ lat: point.lat(), lng: point.lng() });
        }
        StateManager.updatePVArea(this.currentPVId, { corners });
        
        // Re-render
        this.render();
    },
    
    /**
     * Delete a corner from the polygon
     */
    deleteCorner(cornerIndex) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon || pv.locked) return;
        
        const path = pv.polygon.getPath();
        if (path.getLength() <= 3) {
            alert('Eine PV-Fläche muss mindestens 3 Eckpunkte haben.');
            return;
        }
        
        // Remove the corner
        path.removeAt(cornerIndex);
        
        // Update corner heights array
        const cornerHeights = [...(pv.cornerHeights || [])];
        cornerHeights.splice(cornerIndex, 1);
        StateManager.updatePVArea(this.currentPVId, { cornerHeights });
        
        // Update corners in state
        const corners = [];
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            corners.push({ lat: point.lat(), lng: point.lng() });
        }
        StateManager.updatePVArea(this.currentPVId, { corners });
        
        // Re-render
        this.render();
    },

    /**
     * Show grid generator dialog
     */
    showGridGeneratorDialog() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || pv.locked) return;

        // Create modal
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="gridGeneratorModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-grid me-2"></i>Raster generieren
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Rasterweite (m)</label>
                                <input type="number" class="form-control" id="gridSpacing"
                                       value="100" min="50" max="500" step="10">
                                <small class="text-muted">Zwischen 50m und 500m</small>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="includeBoundary" checked>
                                <label class="form-check-label" for="includeBoundary">
                                    Punkte entlang der Grenzen hinzufügen
                                </label>
                            </div>
                            <div class="alert alert-info" style="font-size: 0.875rem;">
                                <i class="bi bi-info-circle me-2"></i>
                                Das Raster wird innerhalb der PV-Fläche generiert.
                                Bestehende Stützpunkte werden überschrieben.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
                            <button type="button" class="btn btn-primary" onclick="CornerDetailsManager.generateGrid()">
                                <i class="bi bi-grid-3x3 me-2"></i>Generieren
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal.firstElementChild);

        const modalInstance = new bootstrap.Modal(document.getElementById('gridGeneratorModal'));
        modalInstance.show();

        // Clean up after modal is hidden
        document.getElementById('gridGeneratorModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    },

    /**
     * Set support point mode
     */
    setSupportMode(mode) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;

        switch(mode) {
            case 'grid':
                // Only grid points, remove manual ones
                const gridPoints = pv.supportPoints?.filter(p => !p.manual) || [];
                StateManager.updatePVArea(this.currentPVId, {
                    supportPoints: gridPoints,
                    gridActive: true,
                    hasManualPoints: false,
                    supportMode: 'grid',
                    gridNeedsUpdate: gridPoints.length === 0 // Need update if no grid yet
                });

                // Don't generate automatically - user must click the update button
                break;

            case 'manual':
                // Only manual points, clear grid flag
                const manualPoints = pv.supportPoints?.filter(p => p.manual) || [];
                StateManager.updatePVArea(this.currentPVId, {
                    supportPoints: manualPoints,
                    gridActive: false,
                    hasManualPoints: true,
                    supportMode: 'manual',
                    gridNeedsUpdate: false
                });
                break;

            case 'both':
                // Keep ALL points (both manual and grid)
                const currentManualPoints = pv.supportPoints?.filter(p => p.manual) || [];
                const currentGridPoints = pv.supportPoints?.filter(p => !p.manual) || [];

                StateManager.updatePVArea(this.currentPVId, {
                    supportPoints: pv.supportPoints, // Keep all existing points
                    gridActive: true,
                    hasManualPoints: currentManualPoints.length > 0,
                    supportMode: 'both',
                    gridNeedsUpdate: currentGridPoints.length === 0 // Need update if no grid points
                });

                // Show update button if no grid exists yet
                if (currentGridPoints.length === 0) {
                    this.render();
                }
                break;
        }

        // Refresh display
        this.render();
        this.showSupportPointsOnMap();
    },

    /**
     * Toggle auto-calculate for support heights
     */
    toggleAutoCalculateSupportHeights(checked) {
        StateManager.updatePVArea(this.currentPVId, {
            autoCalculateSupportHeights: checked
        });

        // Update input readonly state
        const pv = StateManager.getPVArea(this.currentPVId);
        if (pv && pv.supportPoints) {
            pv.supportPoints.forEach((_, index) => {
                const input = document.getElementById(`support-height-${index}`);
                if (input) {
                    input.readOnly = checked;
                }
            });
        }

        // If enabling, calculate all heights
        if (checked) {
            this.updateAllSupportPointHeights();
        }
    },

    /**
     * Confirm grid update after geometry changes
     */
    async confirmGridUpdate() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;

        // Make sure grid is active before recalculating
        StateManager.updatePVArea(this.currentPVId, {
            gridActive: true,
            gridNeedsUpdate: false
        });

        // Recalculate the grid
        await this.recalculateGrid();

        // Recalculate terrain heights if auto-calculate is enabled
        if (pv.autoCalculateTerrainHeights !== false) {
            await this.calculateTerrainHeights();
        }

        // Recalculate support heights if auto-calculate is enabled
        if (pv.autoCalculateSupportHeights !== false) {
            await this.updateAllSupportPointHeights();
        }

        // Refresh the display
        this.render();
        this.showSupportPointsOnMap();

        // Show success message
        UIManager.showNotification('Raster und Höhen wurden erfolgreich aktualisiert', 'success');
    },

    /**
     * Recalculate grid when corners change
     */
    async recalculateGrid() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;

        // Note: Don't check gridActive here since confirmGridUpdate sets it to true

        const spacing = pv.gridSpacing || 100;
        const path = pv.polygon.getPath();
        const bounds = new google.maps.LatLngBounds();
        for (let i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }

        // Keep manually added points
        const manualPoints = pv.supportPoints?.filter(p => p.manual) || [];

        // Generate new grid points
        const gridPoints = [];
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
                if (google.maps.geometry.poly.containsLocation(point, pv.polygon)) {
                    gridPoints.push({
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
                gridPoints.push({
                    lat: interpolated.lat(),
                    lng: interpolated.lng(),
                    height: 0
                });
            }
        }

        // Combine grid and manual points
        const supportPoints = [...gridPoints, ...manualPoints];

        // Update state
        StateManager.updatePVArea(this.currentPVId, { supportPoints });

        // Calculate heights if auto-calculate is enabled
        if (pv.autoCalculateSupportHeights !== false) {
            await this.updateAllSupportPointHeights();
        }

        // Update display
        this.render();
        this.showSupportPointsOnMap();
    },

    /**
     * Disable grid
     */
    disableGrid() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;

        const manualPointsCount = pv.supportPoints?.filter(p => p.manual).length || 0;
        const gridPointsCount = pv.supportPoints?.filter(p => !p.manual).length || 0;

        // Create confirmation modal
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="disableGridModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                                Raster deaktivieren
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Möchten Sie das automatische Raster wirklich deaktivieren?</p>
                            <div class="alert alert-info">
                                <small>
                                    <strong>Aktuelle Stützpunkte:</strong><br>
                                    • ${gridPointsCount} Rasterpunkte werden entfernt<br>
                                    ${manualPointsCount > 0 ? `• ${manualPointsCount} manuelle Punkte bleiben erhalten` : '• Keine manuellen Punkte vorhanden'}
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
                            <button type="button" class="btn btn-danger" onclick="CornerDetailsManager.confirmDisableGrid()">
                                <i class="bi bi-x-circle me-2"></i>Raster deaktivieren
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal.firstElementChild);

        const modalInstance = new bootstrap.Modal(document.getElementById('disableGridModal'));
        modalInstance.show();

        // Clean up after modal is hidden
        document.getElementById('disableGridModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    },

    /**
     * Confirm grid disable
     */
    confirmDisableGrid() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv) return;

        // Keep manually added points if any
        const manualPoints = pv.supportPoints?.filter(p => p.manual) || [];

        StateManager.updatePVArea(this.currentPVId, {
            gridActive: false,
            gridSpacing: null,
            supportPoints: manualPoints,
            supportMode: manualPoints.length > 0 ? 'manual' : 'grid'
        });

        // Close modal
        const modalElement = document.getElementById('disableGridModal');
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }

        this.render();
        if (manualPoints.length > 0) {
            this.showSupportPointsOnMap();
        } else {
            this.hideSupportPointsOnMap();
        }
    },

    /**
     * Show topography configuration dialog
     */
    showTopographyDialog(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;

        // Create modal
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="topographyModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-layers-fill me-2"></i>
                                Topografie für "${pv.name || 'PV-Fläche ' + pv.id.slice(-4)}" definieren
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info mb-4">
                                <h6 class="alert-heading">
                                    <i class="bi bi-info-circle me-2"></i>Warum ist das wichtig?
                                </h6>
                                <p class="mb-0 small">
                                    Die Topografie beeinflusst maßgeblich die Glare-Berechnung.
                                    Wählen Sie, wie die Geländehöhen für Ihre PV-Fläche erfasst werden sollen.
                                </p>
                            </div>

                            <div class="row g-3">
                                <!-- Option 1: Automatic Grid -->
                                <div class="col-md-6">
                                    <div class="card h-100 border-primary topography-option" data-option="grid">
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
                                    <div class="card h-100 topography-option" data-option="manual">
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
                                    <div class="card h-100 topography-option" data-option="both">
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
                                    <div class="card h-100 topography-option" data-option="plane">
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
                            <button type="button" class="btn btn-secondary" id="skipTopographyBtn">
                                <i class="bi bi-x-circle me-2"></i>Abbrechen
                            </button>
                            <button type="button" class="btn btn-primary" id="confirmTopographyOption" disabled>
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
        style.innerHTML = \`
            .topography-option {
                cursor: pointer;
                transition: all 0.3s;
            }
            .topography-option:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .topography-option.selected {
                border-color: #0d6efd !important;
                border-width: 2px;
                background-color: #f0f8ff;
            }
        \`;
        document.head.appendChild(style);

        // Add click handlers for cards
        let selectedOption = null;
        document.querySelectorAll('.topography-option').forEach(card => {
            card.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.topography-option').forEach(c => c.classList.remove('selected'));

                // Add selection to clicked card
                card.classList.add('selected');
                selectedOption = card.dataset.option;

                // Enable confirm button
                document.getElementById('confirmTopographyOption').disabled = false;

                // Show/hide plane warning
                document.getElementById('planeWarning').classList.toggle('d-none', selectedOption !== 'plane');
            });
        });

        // Add confirm handler
        document.getElementById('confirmTopographyOption').addEventListener('click', () => {
            this.applyTopographyOption(pvId, selectedOption);

            // Close modal
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('topographyModal'));
            modalInstance.hide();
        });

        // Add skip handler
        document.getElementById('skipTopographyBtn').addEventListener('click', () => {
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('topographyModal'));
            modalInstance.hide();
        });

        // Show modal
        const modalInstance = new bootstrap.Modal(document.getElementById('topographyModal'));
        modalInstance.show();

        // Clean up after modal is hidden
        document.getElementById('topographyModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
            style.remove();
        });
    },

    /**
     * Apply selected topography option
     */
    applyTopographyOption(pvId, option) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;

        switch(option) {
            case 'grid':
                // Generate 100m grid automatically
                StateManager.updatePVArea(pvId, {
                    gridActive: true,
                    gridNeedsUpdate: false,
                    topographyMode: 'grid'
                });

                this.currentPVId = pvId;
                this.generateDefaultGrid();

                // Then open the panel to show results
                setTimeout(() => {
                    this.open(pvId);
                }, 500);
                break;

            case 'manual':
                StateManager.updatePVArea(pvId, {
                    gridActive: false,
                    topographyMode: 'manual'
                });

                // Open panel for manual entry
                this.open(pvId);
                break;

            case 'both':
                StateManager.updatePVArea(pvId, {
                    gridActive: true,
                    gridNeedsUpdate: false,
                    topographyMode: 'both'
                });

                this.currentPVId = pvId;
                this.generateDefaultGrid();

                // Open panel
                setTimeout(() => {
                    this.open(pvId);
                }, 500);
                break;

            case 'plane':
                // Use best-fit plane from corners
                StateManager.updatePVArea(pvId, {
                    gridActive: false,
                    useBestFitPlane: true,
                    topographyMode: 'plane'
                });

                UIManager.showNotification('Ebene Fläche angenommen - Best-Fit-Ebene wird aus Eckpunkten berechnet', 'info');

                // Open panel to show corner heights
                this.open(pvId);
                break;
        }
    },

    /**
     * Generate default grid with manual points preserved
     */
    async generateDefaultGridWithManual(manualPoints = []) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;

        // Set default spacing to 100m
        const spacing = 100;
        const includeBoundary = true;

        // Get polygon bounds
        const path = pv.polygon.getPath();
        const bounds = new google.maps.LatLngBounds();
        for (let i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }

        // Start with manual points
        const supportPoints = [...manualPoints];
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        // Convert spacing from meters to approximate degrees
        const metersPerDegreeLat = 111000;
        const metersPerDegreeLng = 111000 * Math.cos(sw.lat() * Math.PI / 180);
        const latSpacing = spacing / metersPerDegreeLat;
        const lngSpacing = spacing / metersPerDegreeLng;

        // Generate grid
        for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
            for (let lng = sw.lng(); lng <= ne.lng(); lng += lngSpacing) {
                const point = new google.maps.LatLng(lat, lng);
                if (google.maps.geometry.poly.containsLocation(point, pv.polygon)) {
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

        // Update state
        StateManager.updatePVArea(this.currentPVId, {
            supportPoints,
            gridActive: true,
            gridSpacing: spacing,
            gridNeedsUpdate: false,
            hasManualPoints: manualPoints.length > 0,
            supportMode: manualPoints.length > 0 ? 'both' : 'grid'
        });

        // Auto-calculate heights if enabled
        if (pv.autoCalculateSupportHeights !== false) {
            await this.updateAllSupportPointHeights();
        }

        // Re-render and show points on map
        this.render();
        this.showSupportPointsOnMap();
    },

    /**
     * Generate default 100m grid immediately
     */
    async generateDefaultGrid() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;

        // Set default spacing to 100m
        const spacing = 100;
        const includeBoundary = true;

        // Get polygon bounds
        const path = pv.polygon.getPath();
        const bounds = new google.maps.LatLngBounds();
        for (let i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }

        // Generate grid points
        const supportPoints = [];
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        // Convert spacing from meters to approximate degrees
        const metersPerDegreeLat = 111000;
        const metersPerDegreeLng = 111000 * Math.cos(sw.lat() * Math.PI / 180);
        const latSpacing = spacing / metersPerDegreeLat;
        const lngSpacing = spacing / metersPerDegreeLng;

        // Generate grid
        for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
            for (let lng = sw.lng(); lng <= ne.lng(); lng += lngSpacing) {
                const point = new google.maps.LatLng(lat, lng);
                if (google.maps.geometry.poly.containsLocation(point, pv.polygon)) {
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

        // Update state
        StateManager.updatePVArea(this.currentPVId, {
            supportPoints,
            gridActive: true,
            gridSpacing: spacing,
            gridNeedsUpdate: false,
            supportMode: 'grid'
        });

        // Auto-calculate heights if enabled
        if (pv.autoCalculateSupportHeights !== false) {
            await this.updateAllSupportPointHeights();
        }

        // Re-render and show points on map
        this.render();
        this.showSupportPointsOnMap();
    },

    /**
     * Generate grid of support points
     */
    async generateGrid() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.polygon) return;

        const spacing = parseFloat(document.getElementById('gridSpacing').value);
        const includeBoundary = document.getElementById('includeBoundary').checked;

        if (spacing < 50) {
            alert('Rasterweite muss mindestens 50m sein');
            return;
        }

        // Get polygon bounds
        const path = pv.polygon.getPath();
        const bounds = new google.maps.LatLngBounds();
        for (let i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }

        // Keep manual points if in "both" mode
        const existingManualPoints = (pv.supportMode === 'both' && pv.supportPoints)
            ? pv.supportPoints.filter(p => p.manual)
            : [];

        // Generate grid points
        const supportPoints = [...existingManualPoints]; // Start with manual points
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        // Convert spacing from meters to approximate degrees
        const metersPerDegreeLat = 111000; // approximately
        const metersPerDegreeLng = 111000 * Math.cos(sw.lat() * Math.PI / 180);
        const latSpacing = spacing / metersPerDegreeLat;
        const lngSpacing = spacing / metersPerDegreeLng;

        // Generate grid
        for (let lat = sw.lat(); lat <= ne.lat(); lat += latSpacing) {
            for (let lng = sw.lng(); lng <= ne.lng(); lng += lngSpacing) {
                const point = new google.maps.LatLng(lat, lng);

                // Check if point is inside polygon
                if (google.maps.geometry.poly.containsLocation(point, pv.polygon)) {
                    supportPoints.push({
                        lat: lat,
                        lng: lng,
                        height: 0
                    });
                }
            }
        }

        // Add boundary points if requested
        if (includeBoundary) {
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
        }

        // Update state with grid info and clear needs update flag
        const hasManualPoints = supportPoints.some(p => p.manual);
        StateManager.updatePVArea(this.currentPVId, {
            supportPoints,
            gridActive: true,
            gridSpacing: spacing,
            gridNeedsUpdate: false, // Clear flag since we just generated the grid
            hasManualPoints,
            supportMode: hasManualPoints ? 'both' : 'grid'
        });

        // Close modal
        const modalElement = document.getElementById('gridGeneratorModal');
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            // Clean up modal after hiding
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            }, { once: true });
        }

        // Auto-calculate heights if enabled
        if (pv.autoCalculateSupportHeights !== false) {
            await this.updateAllSupportPointHeights();
        }

        // Re-render and show points on map
        this.render();
        this.showSupportPointsOnMap();
    },

    /**
     * Start manual point placement
     */
    startManualPointPlacement() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || pv.locked) return;

        const map = MapManager.getMap();

        // Temporarily disable polygon clickability to allow clicks through
        if (pv.polygon) {
            pv.polygon.setOptions({ clickable: false });
        }

        // Change cursor
        map.setOptions({ draggableCursor: 'crosshair' });

        // Create info overlay
        const infoDiv = document.createElement('div');
        infoDiv.className = 'alert alert-info';
        infoDiv.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 10000; font-size: 0.875rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
        infoDiv.innerHTML = `
            <i class="bi bi-info-circle me-2"></i>
            Klicken Sie in die Fläche um Stützpunkte zu setzen.
            <button class="btn btn-sm btn-danger ms-3" onclick="CornerDetailsManager.stopManualPointPlacement()">
                <i class="bi bi-stop-circle me-1"></i>Beenden
            </button>
        `;
        document.body.appendChild(infoDiv);

        // Store click listener
        this._manualPointListener = google.maps.event.addListener(map, 'click', (event) => {
            // Check if click is inside polygon
            if (google.maps.geometry.poly.containsLocation(event.latLng, pv.polygon)) {
                const supportPoints = [...(pv.supportPoints || [])];
                supportPoints.push({
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng(),
                    height: 0,
                    manual: true  // Mark as manually added
                });

                // Update state and check if we have manual points now
                const hasManualPoints = supportPoints.some(p => p.manual);
                const hasGridPoints = supportPoints.some(p => !p.manual);

                // Update support mode if needed
                let newSupportMode = pv.supportMode;
                if (hasManualPoints && hasGridPoints) {
                    newSupportMode = 'both';
                } else if (hasManualPoints) {
                    newSupportMode = 'manual';
                } else if (hasGridPoints) {
                    newSupportMode = 'grid';
                }

                StateManager.updatePVArea(this.currentPVId, {
                    supportPoints,
                    hasManualPoints,
                    supportMode: newSupportMode
                });

                // Calculate height if auto-calculate is on
                const currentPV = StateManager.getPVArea(this.currentPVId);
                if (currentPV && currentPV.autoCalculateSupportHeights !== false) {
                    this.calculateSingleSupportPointHeight(supportPoints.length - 1);
                }

                // Just add the new marker without re-rendering everything
                this.addSingleSupportPointMarker(supportPoints.length - 1);
            } else {
                // Flash red border on polygon
                pv.polygon.setOptions({ strokeColor: '#FF0000' });
                setTimeout(() => {
                    pv.polygon.setOptions({ strokeColor: '#4285F4' });
                }, 200);
            }
        });

        // Store info div reference for cleanup
        this._manualPointInfoDiv = infoDiv;
    },

    /**
     * Stop manual point placement
     */
    stopManualPointPlacement() {
        const map = MapManager.getMap();

        // Reset cursor
        map.setOptions({ draggableCursor: null });

        // Re-enable polygon clickability
        const pv = StateManager.getPVArea(this.currentPVId);
        if (pv && pv.polygon) {
            pv.polygon.setOptions({ clickable: true });
        }

        // Remove listener
        if (this._manualPointListener) {
            google.maps.event.removeListener(this._manualPointListener);
            this._manualPointListener = null;
        }

        // Remove info div
        if (this._manualPointInfoDiv) {
            this._manualPointInfoDiv.remove();
            this._manualPointInfoDiv = null;
        }

        // Render the table to show all new points
        this.render();
    },

    /**
     * Show import dialog
     */
    showImportDialog() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="importModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-upload me-2"></i>Stützpunkte importieren
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Dateiformat</label>
                                <select class="form-select" id="importFormat">
                                    <option value="csv">CSV (Komma-getrennt)</option>
                                    <option value="xyz">XYZ (Space/Tab-getrennt)</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Datei auswählen</label>
                                <input type="file" class="form-control" id="importFile" accept=".csv,.xyz,.txt">
                            </div>
                            <div class="alert alert-info" style="font-size: 0.875rem;">
                                <p class="mb-2"><strong>CSV Format:</strong> Lng,Lat,Height oder X,Y,Z</p>
                                <p class="mb-2"><strong>XYZ Format:</strong> X Y Z (Space oder Tab getrennt)</p>
                                <p class="mb-0">Punkte außerhalb der PV-Fläche werden automatisch ignoriert.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
                            <button type="button" class="btn btn-primary" onclick="CornerDetailsManager.importPoints()">
                                <i class="bi bi-check-lg me-2"></i>Importieren
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal.firstElementChild);

        const modalInstance = new bootstrap.Modal(document.getElementById('importModal'));
        modalInstance.show();

        document.getElementById('importModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    },

    /**
     * Import points from file
     */
    async importPoints() {
        const fileInput = document.getElementById('importFile');
        const format = document.getElementById('importFormat').value;

        if (!fileInput.files[0]) {
            alert('Bitte wählen Sie eine Datei aus');
            return;
        }

        const file = fileInput.files[0];
        const text = await file.text();
        const pv = StateManager.getPVArea(this.currentPVId);

        let points = [];
        const lines = text.trim().split('\n');

        for (let line of lines) {
            if (!line.trim()) continue;

            let coords;
            if (format === 'csv') {
                // Skip header if present
                if (line.toLowerCase().includes('lat') || line.toLowerCase().includes('lng')) continue;

                coords = line.split(',').map(v => parseFloat(v.trim()));
            } else {
                coords = line.split(/\s+/).map(v => parseFloat(v));
            }

            if (coords.length >= 3 && !isNaN(coords[0]) && !isNaN(coords[1]) && !isNaN(coords[2])) {
                const point = new google.maps.LatLng(coords[1], coords[0]); // Assuming X=Lng, Y=Lat

                // Check if inside polygon
                if (google.maps.geometry.poly.containsLocation(point, pv.polygon)) {
                    points.push({
                        lng: coords[0],
                        lat: coords[1],
                        height: coords[2]
                    });
                }
            }
        }

        if (points.length > 0) {
            // Add to existing or replace
            const supportPoints = [...(pv.supportPoints || []), ...points];
            StateManager.updatePVArea(this.currentPVId, { supportPoints });

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();

            // Update display
            this.render();
            this.showSupportPointsOnMap();

            alert(`${points.length} Punkte erfolgreich importiert`);
        } else {
            alert('Keine gültigen Punkte innerhalb der Fläche gefunden');
        }
    },

    /**
     * Update support point height
     */
    updateSupportPointHeight(index, value) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints) return;

        const height = parseFloat(value);
        if (!isNaN(height)) {
            const supportPoints = [...pv.supportPoints];
            supportPoints[index].height = height;
            StateManager.updatePVArea(this.currentPVId, { supportPoints });
        }
    },

    /**
     * Delete support point
     */
    deleteSupportPoint(index) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints) return;

        const supportPoints = [...pv.supportPoints];
        supportPoints.splice(index, 1);
        StateManager.updatePVArea(this.currentPVId, { supportPoints });

        this.render();
        this.showSupportPointsOnMap();
    },

    /**
     * Clear all support points
     */
    clearAllSupportPoints() {
        if (confirm('Alle Stützpunkte löschen?')) {
            StateManager.updatePVArea(this.currentPVId, { supportPoints: [] });
            this.render();
            this.hideSupportPointsOnMap();
        }
    },

    /**
     * Update all support point heights
     */
    async updateAllSupportPointHeights() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints || pv.supportPoints.length === 0) return;

        const elevator = new google.maps.ElevationService();
        const locations = pv.supportPoints.map(p => ({ lat: p.lat, lng: p.lng }));

        try {
            // Process in batches of 256 (API limit)
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

                // Update heights
                response.forEach((result, j) => {
                    supportPoints[i + j].height = result.elevation;
                });
            }

            StateManager.updatePVArea(this.currentPVId, { supportPoints });
            this.render();

        } catch (error) {
            console.error('Error updating support point heights:', error);
            alert('Fehler beim Abrufen der Höhendaten');
        }
    },

    /**
     * Calculate height for single support point
     */
    async calculateSingleSupportPointHeight(index) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints || !pv.supportPoints[index]) return;

        const point = pv.supportPoints[index];
        const elevator = new google.maps.ElevationService();

        try {
            const response = await new Promise((resolve, reject) => {
                elevator.getElevationForLocations({
                    locations: [{ lat: point.lat, lng: point.lng }]
                }, (results, status) => {
                    if (status === 'OK' && results.length > 0) {
                        resolve(results[0]);
                    } else {
                        reject(new Error(`Elevation API error: ${status}`));
                    }
                });
            });

            const supportPoints = [...pv.supportPoints];
            supportPoints[index].height = response.elevation;
            StateManager.updatePVArea(this.currentPVId, { supportPoints });

            // Update UI if visible
            const input = document.querySelector(`#support-height-${index}`);
            if (input) {
                input.value = response.elevation.toFixed(1);
            }

        } catch (error) {
            console.error('Error fetching elevation for support point:', error);
        }
    },

    /**
     * Add single support point marker
     */
    addSingleSupportPointMarker(index) {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints || !pv.supportPoints[index]) return;

        const map = MapManager.getMap();
        const currentZoom = map.getZoom();
        const showLabels = currentZoom >= 16;
        const point = pv.supportPoints[index];

        // Initialize marker array if needed
        if (!this._supportPointMarkers) {
            this._supportPointMarkers = [];
        }

        const markerOptions = {
            position: { lat: point.lat, lng: point.lng },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: showLabels ? 6 : 4,
                fillColor: '#00FF00',
                fillOpacity: 0.8,
                strokeColor: '#008800',
                strokeWeight: 1
            },
            title: `Stützpunkt ${index + 1}: ${point.height?.toFixed(1) || '0.0'}m`,
            zIndex: 1000
        };

        if (showLabels) {
            markerOptions.label = {
                text: `S${index + 1}`,
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#000000'
            };
        }

        const marker = new google.maps.Marker(markerOptions);
        this._supportPointMarkers.push(marker);

        // Update badge count in UI if visible
        const badge = document.querySelector('.badge.bg-secondary');
        if (badge && pv.supportPoints) {
            badge.textContent = `${pv.supportPoints.length} Punkte`;
        }

        // Show legend if not already shown
        if (!this._legendDiv) {
            this.showPointLegend();
        }
    },

    /**
     * Show support points on map
     */
    showSupportPointsOnMap() {
        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints) return;

        // Clean up existing markers
        this.hideSupportPointsOnMap();

        const map = MapManager.getMap();
        const currentZoom = map.getZoom();
        this._supportPointMarkers = [];

        // Only show labels at zoom level 16 or higher
        const showLabels = currentZoom >= 16;

        pv.supportPoints.forEach((point, index) => {
            const markerOptions = {
                position: { lat: point.lat, lng: point.lng },
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: showLabels ? 6 : 4,
                    fillColor: '#00FF00',
                    fillOpacity: 0.8,
                    strokeColor: '#008800',
                    strokeWeight: 1
                },
                title: `Stützpunkt ${index + 1}: ${point.height?.toFixed(1) || '0.0'}m`,
                zIndex: 1000
            };

            // Only add label if zoomed in enough
            if (showLabels) {
                markerOptions.label = {
                    text: `S${index + 1}`,
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#000000'
                };
            }

            const marker = new google.maps.Marker(markerOptions);
            this._supportPointMarkers.push(marker);
        });

        // Set up zoom listener to update labels
        if (!this._zoomListener) {
            this._zoomListener = google.maps.event.addListener(map, 'zoom_changed', () => {
                // Debounce the update
                if (this._zoomUpdateTimeout) {
                    clearTimeout(this._zoomUpdateTimeout);
                }
                this._zoomUpdateTimeout = setTimeout(() => {
                    if (this._supportPointMarkers && this._supportPointMarkers.length > 0) {
                        this.updateSupportPointLabels();
                    }
                }, 100);
            });
        }

        // Show legend
        this.showPointLegend();
    },

    /**
     * Update support point labels based on zoom
     */
    updateSupportPointLabels() {
        const map = MapManager.getMap();
        const currentZoom = map.getZoom();
        const showLabels = currentZoom >= 16;

        const pv = StateManager.getPVArea(this.currentPVId);
        if (!pv || !pv.supportPoints || !this._supportPointMarkers) return;

        this._supportPointMarkers.forEach((marker, index) => {
            // Update icon scale
            const currentIcon = marker.getIcon();
            currentIcon.scale = showLabels ? 6 : 4;
            marker.setIcon(currentIcon);

            // Update label
            if (showLabels) {
                marker.setLabel({
                    text: `S${index + 1}`,
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#000000'
                });
            } else {
                marker.setLabel(null);
            }
        });
    },

    /**
     * Hide support points from map
     */
    hideSupportPointsOnMap() {
        if (this._supportPointMarkers) {
            this._supportPointMarkers.forEach(marker => marker.setMap(null));
            this._supportPointMarkers = [];
        }

        // Remove zoom listener
        if (this._zoomListener) {
            google.maps.event.removeListener(this._zoomListener);
            this._zoomListener = null;
        }

        // Clear timeout if exists
        if (this._zoomUpdateTimeout) {
            clearTimeout(this._zoomUpdateTimeout);
            this._zoomUpdateTimeout = null;
        }

        this.hidePointLegend();
    },

    /**
     * Show point type legend
     */
    showPointLegend() {
        if (this._legendDiv) return;

        const map = MapManager.getMap();
        this._legendDiv = document.createElement('div');
        this._legendDiv.style.cssText = `
            position: absolute;
            bottom: 30px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-size: 0.875rem;
            z-index: 1000;
        `;
        this._legendDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Legende</div>
            <div style="margin-bottom: 3px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #4285F4; border-radius: 50%; margin-right: 5px;"></span>
                Eckpunkte
            </div>
            <div>
                <span style="display: inline-block; width: 12px; height: 12px; background: #00FF00; border-radius: 50%; margin-right: 5px;"></span>
                Stützpunkte
            </div>
        `;

        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(this._legendDiv);
    },

    /**
     * Hide point legend
     */
    hidePointLegend() {
        if (this._legendDiv) {
            const map = MapManager.getMap();
            const index = map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].getArray().indexOf(this._legendDiv);
            if (index > -1) {
                map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].removeAt(index);
            }
            this._legendDiv = null;
        }
    }
};

// Make globally available
window.CornerDetailsManager = CornerDetailsManager;

export default CornerDetailsManager;