/**
 * @fileoverview User Interface management and event handling
 * @module ui
 * @requires config
 * @requires state
 * @requires utils
 * @requires calculations
 * @requires map
 * @requires pv-areas
 */

/**
 * UI Manager class
 * Handles all UI updates, form interactions, and user events
 */
class UIManager {
    constructor() {
        /**
         * @type {Object} UI element references
         */
        this.elements = {
            pvAreasList: null,
            toolButtons: {},
            modals: {},
            forms: {}
        };
        
        /**
         * @type {Object} Active tool state
         */
        this.activeTool = null;
        
        /**
         * @type {boolean} UI initialization status
         */
        this.isInitialized = false;
    }
    
    /**
     * Initializes the UI manager
     */
    initialize() {
        // Cache DOM elements
        this.cacheElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Load module types
        this.loadModuleTypes();
        
        // Initial UI update
        this.updateUI();
        
        this.isInitialized = true;
        state.emit('ui:initialized');
    }
    
    /**
     * Caches frequently used DOM elements
     * @private
     */
    cacheElements() {
        // Lists
        this.elements.pvAreasList = document.getElementById('pv-areas-list');
        this.elements.observationPointsList = document.getElementById('observation-points-list');
        
        // Tool buttons
        this.elements.toolButtons = {
            drawRoofParallel: document.querySelector('[data-tool="draw-roof-parallel"]'),
            drawRoofMounted: document.querySelector('[data-tool="draw-roof-mounted"]'),
            drawFacade: document.querySelector('[data-tool="draw-facade"]'),
            drawGround: document.querySelector('[data-tool="draw-ground"]'),
            drawObservation: document.querySelector('[data-tool="draw-observation"]'),
            editMode: document.querySelector('[data-tool="edit-mode"]'),
            clearAll: document.querySelector('[data-tool="clear-all"]')
        };
        
        // Modals
        this.elements.modals = {
            info: document.getElementById('infoModal'),
            deleteConfirmation: document.getElementById('deleteConfirmationModal'),
            moduleType: document.getElementById('moduleTypeModal')
        };
        
        // Forms
        this.elements.forms = {
            moduleType: document.getElementById('moduleTypeForm')
        };
    }
    
    /**
     * Sets up all event listeners
     * @private
     */
    setupEventListeners() {
        // Menu item clicks
        document.querySelectorAll('.menu-item[data-panel]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const panel = item.getAttribute('data-panel');
                this.switchToPanel(panel);
            });
        });
        
        // Tool button clicks
        Object.entries(this.elements.toolButtons).forEach(([tool, button]) => {
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleToolClick(tool);
                });
            }
        });
        
        // State change listeners
        state.on('pvarea:changed', () => this.updatePVAreasList());
        state.on('op:changed', () => this.updateObservationPointsList());
        state.on('mode:changed', (data) => this.updateActiveToolDisplay(data.new.tool));
        state.on('pvarea:dimensions_changed', (pvArea) => this.updatePVAreaDimensions(pvArea));
        
        // Map events
        state.on('map:initialized', () => {
            // Don't show message on map init - it causes modal backdrop issues
            console.log('Map initialized successfully');
        });
        
        // PV area events
        state.on('pvarea:added', (pvArea) => {
            // Don't show modal - just log and scroll
            console.log('PV area created:', pvArea.id);
            this.scrollToPVArea(pvArea.id);
        });
        
        state.on('pvarea:removed', (pvArea) => {
            // Don't show modal - just log
            console.log('PV area removed:', pvArea.id);
        });
        
        // Window resize
        window.addEventListener('resize', debounce(() => {
            mapManager.triggerResize();
        }, 300));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
        
        // Form submissions
        if (this.elements.forms.moduleType) {
            this.elements.forms.moduleType.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveModuleType();
            });
        }
        
        // Delete confirmation
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDelete();
            });
        }
    }
    
    /**
     * Updates the main UI based on current state
     */
    updateUI() {
        this.updatePVAreasList();
        this.updateObservationPointsList();
        this.updateToolbarState();
        this.updateProjectInfo();
    }
    
    /**
     * Updates the PV areas list
     * @private
     */
    updatePVAreasList() {
        if (!this.elements.pvAreasList) return;
        
        const pvAreas = state.pvAreas;
        
        if (pvAreas.length === 0) {
            this.elements.pvAreasList.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-solar-panel fa-3x mb-3"></i>
                    <p>Keine PV-Flächen vorhanden</p>
                    <small>Verwenden Sie die Werkzeuge oben, um PV-Flächen zu zeichnen</small>
                </div>
            `;
            return;
        }
        
        let html = '';
        pvAreas.forEach((pv, index) => {
            const pvIndex = index + 1;
            const typeConfig = CONFIG.pvArea.types[pv.type];
            const isSelected = state.ui.selectedPvAreaId === pv.id;
            
            html += `
                <div class="pv-area-item ${isSelected ? 'selected' : ''}" 
                     data-pv-id="${pv.id}">
                    <div class="card mb-3 ${pv.locked ? 'border-warning' : ''}">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <i class="fas ${typeConfig.icon} me-2" 
                                   style="color: ${typeConfig.color}"></i>
                                <strong>PV${pvIndex}: ${pv.name || typeConfig.name}</strong>
                                ${pv.locked ? '<i class="fas fa-lock ms-2 text-warning"></i>' : ''}
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button class="btn ${pv.visible ? 'btn-outline-primary' : 'btn-outline-secondary'}" 
                                        onclick="ui.togglePVVisibility('${pv.id}')" 
                                        title="Sichtbarkeit">
                                    <i class="fas fa-eye${pv.visible ? '' : '-slash'}"></i>
                                </button>
                                <button class="btn ${pv.locked ? 'btn-warning' : 'btn-outline-secondary'}" 
                                        onclick="pvAreaManager.toggleLock('${pv.id}')" 
                                        title="${pv.locked ? 'Entsperren' : 'Sperren'}">
                                    <i class="fas fa-${pv.locked ? 'lock' : 'unlock'}"></i>
                                </button>
                                <button class="btn btn-outline-danger" 
                                        onclick="ui.deletePVArea('${pv.id}')" 
                                        title="Löschen">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            ${this.renderPVAreaForm(pv, pvIndex)}
                        </div>
                    </div>
                </div>
            `;
        });
        
        this.elements.pvAreasList.innerHTML = html;
        
        // Re-initialize tooltips for new elements
        this.initializeTooltips();
        
        // Add input event listeners
        this.attachPVAreaFormListeners();
    }
    
    /**
     * Renders the form for a PV area
     * @private
     * @param {Object} pv - PV area object
     * @param {number} pvIndex - Display index
     * @returns {string} HTML string
     */
    renderPVAreaForm(pv, pvIndex) {
        const moduleTypes = state.moduleTypes;
        const showEffectiveValues = pv.crossTilt && pv.crossTilt !== 0;
        
        let html = `
            <form class="pv-area-form" data-pv-id="${pv.id}">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">
                            Bezeichnung
                            <i class="bi bi-info-circle text-muted ms-1" 
                               data-bs-toggle="tooltip" 
                               title="Optionale Bezeichnung für diese PV-Fläche">
                            </i>
                        </label>
                        <input type="text" class="form-control" 
                               name="name" 
                               value="${pv.name || ''}" 
                               placeholder="${CONFIG.pvArea.types[pv.type].name}"
                               ${pv.locked ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Modultyp</label>
                        <select class="form-select" 
                                name="moduleType" 
                                ${pv.locked ? 'disabled' : ''}>
                            ${moduleTypes.map(mt => `
                                <option value="${mt.id}" ${pv.moduleType === mt.id ? 'selected' : ''}>
                                    ${mt.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
        `;
        
        // Type-specific fields
        if (pv.type === 'roof-parallel') {
            html += this.renderRoofParallelFields(pv);
        } else {
            html += this.renderStandardFields(pv);
        }
        
        // Cross tilt field (for all types except roof-parallel)
        if (pv.type !== 'roof-parallel') {
            html += this.renderCrossTiltField(pv);
        }
        
        // Effective values display
        if (showEffectiveValues) {
            const effective = calculateEffectiveValues(pv.azimuth, pv.tilt, pv.crossTilt);
            html += `
                <div class="row mt-2">
                    <div class="col-md-6">
                        <small class="text-muted">
                            Effektiver Azimut: <strong>${effective.effectiveAzimuth}°</strong>
                        </small>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">
                            Effektive Neigung: <strong>${effective.effectiveTilt}°</strong>
                        </small>
                    </div>
                </div>
            `;
        }
        
        // Corner heights button for appropriate types
        if (pv.type !== 'roof-parallel' && CONFIG.pvArea.types[pv.type].hasCornerHeights) {
            html += `
                <div class="mt-3">
                    <button type="button" 
                            class="btn btn-outline-primary btn-sm w-100"
                            onclick="cornerHeightsManager.openDialog('${pv.id}')"
                            ${pv.locked ? 'disabled' : ''}>
                        <i class="fas fa-ruler-vertical me-2"></i>
                        Eckpunkt-Höhen verwalten
                    </button>
                </div>
            `;
        }
        
        html += '</form>';
        return html;
    }
    
    /**
     * Renders roof-parallel specific fields
     * @private
     * @param {Object} pv - PV area object
     * @returns {string} HTML string
     */
    renderRoofParallelFields(pv) {
        return `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">
                        Azimut (°)
                        <i class="bi bi-info-circle text-muted ms-1" 
                           data-bs-toggle="tooltip" 
                           title="Ausrichtung der PV-Fläche (0°=Nord, 90°=Ost, 180°=Süd, 270°=West)">
                        </i>
                    </label>
                    <div class="input-group">
                        <input type="number" class="form-control" 
                               name="azimuth" 
                               value="${pv.azimuth}" 
                               min="0" max="360" step="0.1"
                               ${pv.locked || pv.autoCalculateAzimuth ? 'disabled' : ''}>
                        <div class="input-group-text">
                            <input class="form-check-input mt-0" 
                                   type="checkbox" 
                                   name="autoCalculateAzimuth"
                                   ${pv.autoCalculateAzimuth ? 'checked' : ''}
                                   ${pv.locked ? 'disabled' : ''}>
                            <span class="ms-2">Auto</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">
                        Neigung (°)
                        <i class="bi bi-info-circle text-muted ms-1" 
                           data-bs-toggle="tooltip" 
                           title="Neigungswinkel der PV-Fläche (0°=horizontal, 90°=vertikal)">
                        </i>
                    </label>
                    <div class="input-group">
                        <input type="number" class="form-control" 
                               name="tilt" 
                               value="${pv.tilt}" 
                               min="0" max="89" step="0.1"
                               ${pv.locked || pv.autoCalculateTilt ? 'disabled' : ''}>
                        <div class="input-group-text">
                            <input class="form-check-input mt-0" 
                                   type="checkbox" 
                                   name="autoCalculateTilt"
                                   ${pv.autoCalculateTilt ? 'checked' : ''}
                                   ${pv.locked ? 'disabled' : ''}>
                            <span class="ms-2">Auto</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Höhe Oberkante (m)</label>
                    <div class="input-group">
                        <input type="number" class="form-control" 
                               name="topHeight" 
                               value="${pv.topHeight}" 
                               min="0" step="0.1"
                               ${pv.locked || pv.autoCalculateField ? 'disabled' : ''}>
                        <div class="input-group-text" style="width: 80px;">
                            <input class="form-check-input mt-0" 
                                   type="checkbox" 
                                   name="autoCalculateField"
                                   ${pv.autoCalculateField ? 'checked' : ''}
                                   ${pv.locked ? 'disabled' : ''}>
                            <span class="ms-2">Auto</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Höhe Unterkante (m)</label>
                    <input type="number" class="form-control" 
                           name="bottomHeight" 
                           value="${pv.bottomHeight}" 
                           min="0" step="0.1"
                           ${pv.locked || pv.autoCalculateField ? 'disabled' : ''}>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <small class="text-muted">
                        Abstand Ober-/Unterkante: <strong>${formatGermanNumber(pv.perpendicularDistance || 0)} m</strong>
                    </small>
                </div>
            </div>
        `;
    }
    
    /**
     * Renders standard fields for non-roof-parallel types
     * @private
     * @param {Object} pv - PV area object
     * @returns {string} HTML string
     */
    renderStandardFields(pv) {
        return `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">
                        Azimut (°)
                        <i class="bi bi-info-circle text-muted ms-1" 
                           data-bs-toggle="tooltip" 
                           title="Ausrichtung der PV-Fläche (0°=Nord, 90°=Ost, 180°=Süd, 270°=West)">
                        </i>
                    </label>
                    <input type="number" class="form-control" 
                           name="azimuth" 
                           value="${pv.azimuth}" 
                           min="0" max="360" step="0.1"
                           ${pv.locked ? 'disabled' : ''}>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">
                        Neigung (°)
                        <i class="bi bi-info-circle text-muted ms-1" 
                           data-bs-toggle="tooltip" 
                           title="Neigungswinkel der PV-Fläche (0°=horizontal, 90°=vertikal)">
                        </i>
                    </label>
                    <input type="number" class="form-control" 
                           name="tilt" 
                           value="${pv.tilt}" 
                           min="0" max="89" step="0.1"
                           ${pv.locked ? 'disabled' : ''}>
                </div>
            </div>
        `;
    }
    
    /**
     * Renders cross tilt field
     * @private
     * @param {Object} pv - PV area object
     * @returns {string} HTML string
     */
    renderCrossTiltField(pv) {
        const direction = this.getCrossTiltDirection(pv.azimuth);
        
        return `
            <div class="row">
                <div class="col-12 mb-3">
                    <label class="form-label">
                        Querneigung (°)
                        <i class="bi bi-info-circle text-muted ms-1" 
                           data-bs-toggle="tooltip"
                           data-bs-html="true"
                           title="Neigung quer zur Hauptausrichtung<br>
                                  Positiv = nach ${direction.positive}<br>
                                  Negativ = nach ${direction.negative}">
                        </i>
                    </label>
                    <div class="d-flex align-items-center">
                        <span class="me-2">${direction.negative}</span>
                        <input type="range" class="form-range flex-grow-1" 
                               name="crossTilt"
                               value="${pv.crossTilt || 0}" 
                               min="-45" max="45" step="0.1"
                               ${pv.locked ? 'disabled' : ''}
                               oninput="this.nextElementSibling.nextElementSibling.value = this.value">
                        <span class="ms-2">${direction.positive}</span>
                        <input type="number" class="form-control ms-3" 
                               style="width: 80px;"
                               value="${pv.crossTilt || 0}" 
                               min="-45" max="45" step="0.1"
                               ${pv.locked ? 'disabled' : ''}
                               oninput="this.previousElementSibling.previousElementSibling.value = this.value">
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Gets cross tilt direction labels based on azimuth
     * @private
     * @param {number} azimuth - Azimuth angle
     * @returns {Object} Direction labels
     */
    getCrossTiltDirection(azimuth) {
        // Normalize azimuth to 0-360
        azimuth = normalizeAngle(azimuth);
        
        // Calculate perpendicular directions
        const leftDir = normalizeAngle(azimuth - 90);
        const rightDir = normalizeAngle(azimuth + 90);
        
        // Get compass directions
        const leftCompass = getCompassDirection(leftDir);
        const rightCompass = getCompassDirection(rightDir);
        
        return {
            positive: rightCompass,
            negative: leftCompass
        };
    }
    
    /**
     * Attaches event listeners to PV area form inputs
     * @private
     */
    attachPVAreaFormListeners() {
        const forms = document.querySelectorAll('.pv-area-form');
        
        forms.forEach(form => {
            const pvId = form.dataset.pvId;
            
            // Text inputs
            form.querySelectorAll('input[type="text"], input[type="number"], select').forEach(input => {
                input.addEventListener('change', (e) => {
                    this.updatePVParameter(pvId, e.target.name, e.target.value);
                });
            });
            
            // Checkboxes
            form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.updatePVParameter(pvId, e.target.name, e.target.checked);
                });
            });
            
            // Range inputs
            form.querySelectorAll('input[type="range"]').forEach(range => {
                range.addEventListener('input', (e) => {
                    this.updatePVParameter(pvId, e.target.name, e.target.value);
                });
            });
        });
    }
    
    /**
     * Updates a PV area parameter
     * @param {string} pvId - PV area ID
     * @param {string} parameter - Parameter name
     * @param {*} value - New value
     */
    updatePVParameter(pvId, parameter, value) {
        const pvArea = state.getPvArea(pvId);
        if (!pvArea || pvArea.locked) return;
        
        // Parse numeric values
        if (['azimuth', 'tilt', 'crossTilt', 'topHeight', 'bottomHeight', 'moduleType'].includes(parameter)) {
            value = parseGermanNumber(value);
        }
        
        // Validate values
        if (parameter === 'azimuth') {
            value = normalizeAngle(value);
        } else if (parameter === 'tilt') {
            value = Math.max(0, Math.min(89, value));
        } else if (parameter === 'crossTilt') {
            value = Math.max(-45, Math.min(45, value));
        }
        
        // Update state
        const updates = { [parameter]: value };
        
        // Handle auto-calculate changes
        if (parameter === 'autoCalculateAzimuth' && value) {
            const polygon = pvAreaManager.getPolygon(pvId);
            if (polygon) {
                updates.azimuth = calculatePVAreaAzimuth(polygon);
            }
        } else if (parameter === 'autoCalculateTilt' && value) {
            const polygon = pvAreaManager.getPolygon(pvId);
            if (polygon) {
                updates.tilt = calculatePVAreaTilt(polygon);
            }
        }
        
        state.updatePvArea(pvId, updates);
        
        // Update display if needed
        if (['azimuth', 'tilt', 'crossTilt'].includes(parameter)) {
            this.updateEffectiveValues(pvId);
        }
    }
    
    /**
     * Updates effective values display
     * @private
     * @param {string} pvId - PV area ID
     */
    updateEffectiveValues(pvId) {
        const pvArea = state.getPvArea(pvId);
        if (!pvArea || !pvArea.crossTilt) return;
        
        const effective = calculateEffectiveValues(pvArea.azimuth, pvArea.tilt, pvArea.crossTilt);
        
        // Update display in form
        const form = document.querySelector(`.pv-area-form[data-pv-id="${pvId}"]`);
        if (form) {
            const effectiveDisplay = form.querySelector('.effective-values');
            if (effectiveDisplay) {
                effectiveDisplay.innerHTML = `
                    <small class="text-muted">
                        Effektiver Azimut: <strong>${effective.effectiveAzimuth}°</strong> | 
                        Effektive Neigung: <strong>${effective.effectiveTilt}°</strong>
                    </small>
                `;
            }
        }
    }
    
    /**
     * Updates observation points list
     * @private
     */
    updateObservationPointsList() {
        if (!this.elements.observationPointsList) return;
        
        const ops = state.observationPoints;
        
        if (ops.length === 0) {
            this.elements.observationPointsList.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-eye fa-3x mb-3"></i>
                    <p>Keine Beobachtungspunkte vorhanden</p>
                    <small>Verwenden Sie das Werkzeug oben, um Beobachtungspunkte zu setzen</small>
                </div>
            `;
            return;
        }
        
        let html = '<div class="list-group">';
        ops.forEach((op, index) => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">OP${index + 1}: ${op.name || 'Beobachtungspunkt'}</h6>
                            <small class="text-muted">
                                ${op.lat.toFixed(6)}, ${op.lng.toFixed(6)}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="ui.deleteObservationPoint('${op.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        this.elements.observationPointsList.innerHTML = html;
    }
    
    /**
     * Updates toolbar state based on current mode
     * @private
     */
    updateToolbarState() {
        const currentTool = state.currentMode.tool;
        
        // Update active button state
        Object.entries(this.elements.toolButtons).forEach(([tool, button]) => {
            if (button) {
                const isActive = tool === currentTool || 
                    (tool.startsWith('draw') && currentTool === 'draw-pv' && 
                     tool.includes(state.currentMode.pvType));
                
                button.classList.toggle('active', isActive);
            }
        });
    }
    
    /**
     * Updates project info display
     * @private
     */
    updateProjectInfo() {
        const projectName = document.getElementById('project-name');
        if (projectName) {
            projectName.textContent = state.projectMeta.name || 'Neues Projekt';
        }
        
        const pvCount = document.getElementById('pv-count');
        if (pvCount) {
            pvCount.textContent = state.pvAreas.length;
        }
        
        const opCount = document.getElementById('op-count');
        if (opCount) {
            opCount.textContent = state.observationPoints.length;
        }
    }
    
    /**
     * Handles tool button clicks
     * @private
     * @param {string} tool - Tool identifier
     */
    handleToolClick(tool) {
        switch (tool) {
            case 'drawRoofParallel':
                state.setCurrentMode('draw-pv', { pvType: 'roof-parallel' });
                break;
            case 'drawRoofMounted':
                state.setCurrentMode('draw-pv', { pvType: 'roof-mounted' });
                break;
            case 'drawFacade':
                state.setCurrentMode('draw-pv', { pvType: 'facade' });
                break;
            case 'drawGround':
                state.setCurrentMode('draw-pv', { pvType: 'ground' });
                break;
            case 'drawObservation':
                state.setCurrentMode('draw-op');
                break;
            case 'editMode':
                const newMode = state.currentMode.tool === 'edit' ? null : 'edit';
                state.setCurrentMode(newMode);
                break;
            case 'clearAll':
                this.confirmClearAll();
                break;
        }
    }
    
    /**
     * Handles keyboard shortcuts
     * @private
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcut(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case 'Escape':
                state.setCurrentMode(null);
                break;
            case 'Delete':
                if (state.ui.selectedPvAreaId) {
                    this.deletePVArea(state.ui.selectedPvAreaId);
                }
                break;
            case 'e':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.handleToolClick('editMode');
                }
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        state.redo();
                    } else {
                        state.undo();
                    }
                }
                break;
        }
    }
    
    /**
     * Shows an info message
     * @param {string} title - Message title
     * @param {string} message - Message content
     * @param {string} [type='info'] - Message type
     */
    showInfoMessage(title, message, type = 'info') {
        showModal(title, message, type);
    }
    
    /**
     * Toggles PV area visibility
     * @param {string} pvId - PV area ID
     */
    togglePVVisibility(pvId) {
        const pvArea = state.getPvArea(pvId);
        if (!pvArea) return;
        
        state.updatePvArea(pvId, { visible: !pvArea.visible });
        pvAreaManager.updatePVAreaDisplay(pvId);
    }
    
    /**
     * Deletes a PV area with confirmation
     * @param {string} pvId - PV area ID
     */
    deletePVArea(pvId) {
        const pvArea = state.getPvArea(pvId);
        if (!pvArea) return;
        
        const pvIndex = state.pvAreas.indexOf(pvArea) + 1;
        const displayName = `PV${pvIndex}${pvArea.name ? `: ${pvArea.name}` : ''}`;
        
        // Store ID for confirmation
        this.pendingDeleteId = pvId;
        this.pendingDeleteType = 'pv';
        
        // Update modal content
        const modalBody = document.getElementById('deleteConfirmationBody');
        if (modalBody) {
            modalBody.innerHTML = `Möchten Sie die PV-Fläche "<strong>${displayName}</strong>" wirklich löschen?`;
        }
        
        // Show modal
        const modal = bootstrap.Modal.getOrCreateInstance(this.elements.modals.deleteConfirmation);
        modal.show();
    }
    
    /**
     * Deletes an observation point with confirmation
     * @param {string} opId - Observation point ID
     */
    deleteObservationPoint(opId) {
        const op = state.observationPoints.find(o => o.id === opId);
        if (!op) return;
        
        const opIndex = state.observationPoints.indexOf(op) + 1;
        const displayName = `OP${opIndex}${op.name ? `: ${op.name}` : ''}`;
        
        // Store ID for confirmation
        this.pendingDeleteId = opId;
        this.pendingDeleteType = 'op';
        
        // Update modal content
        const modalBody = document.getElementById('deleteConfirmationBody');
        if (modalBody) {
            modalBody.innerHTML = `Möchten Sie den Beobachtungspunkt "<strong>${displayName}</strong>" wirklich löschen?`;
        }
        
        // Show modal
        const modal = bootstrap.Modal.getOrCreateInstance(this.elements.modals.deleteConfirmation);
        modal.show();
    }
    
    /**
     * Confirms pending deletion
     */
    confirmDelete() {
        if (!this.pendingDeleteId) return;
        
        if (this.pendingDeleteType === 'pv') {
            state.removePvArea(this.pendingDeleteId);
        } else if (this.pendingDeleteType === 'op') {
            state.removeObservationPoint(this.pendingDeleteId);
        }
        
        // Reset pending delete
        this.pendingDeleteId = null;
        this.pendingDeleteType = null;
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(this.elements.modals.deleteConfirmation);
        if (modal) modal.hide();
    }
    
    /**
     * Confirms clear all action
     * @private
     */
    confirmClearAll() {
        const totalItems = state.pvAreas.length + state.observationPoints.length;
        
        if (totalItems === 0) {
            this.showInfoMessage('Nichts zu löschen', 'Es sind keine Elemente vorhanden.', 'info');
            return;
        }
        
        // Use delete confirmation modal
        const modalBody = document.getElementById('deleteConfirmationBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <p>Möchten Sie wirklich <strong>alle Elemente</strong> löschen?</p>
                <ul>
                    <li>${state.pvAreas.length} PV-Flächen</li>
                    <li>${state.observationPoints.length} Beobachtungspunkte</li>
                </ul>
                <p class="text-danger mb-0">Diese Aktion kann nicht rückgängig gemacht werden!</p>
            `;
        }
        
        // Store special flag for clear all
        this.pendingDeleteId = 'CLEAR_ALL';
        this.pendingDeleteType = 'all';
        
        // Override confirm handler temporarily
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const originalHandler = confirmBtn.onclick;
        confirmBtn.onclick = () => {
            if (this.pendingDeleteId === 'CLEAR_ALL') {
                state.clear();
                mapManager.setDrawingMode(null);
                this.showInfoMessage('Alle gelöscht', 'Alle Elemente wurden gelöscht.', 'success');
            }
            confirmBtn.onclick = originalHandler;
            
            const modal = bootstrap.Modal.getInstance(this.elements.modals.deleteConfirmation);
            if (modal) modal.hide();
        };
        
        // Show modal
        const modal = bootstrap.Modal.getOrCreateInstance(this.elements.modals.deleteConfirmation);
        modal.show();
    }
    
    /**
     * Scrolls to a PV area in the list
     * @private
     * @param {string} pvId - PV area ID
     */
    scrollToPVArea(pvId) {
        setTimeout(() => {
            const element = document.querySelector(`[data-pv-id="${pvId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                element.classList.add('highlight');
                setTimeout(() => {
                    element.classList.remove('highlight');
                }, 2000);
            }
        }, 100);
    }
    
    /**
     * Updates PV area dimensions display
     * @private
     * @param {Object} pvArea - PV area object
     */
    updatePVAreaDimensions(pvArea) {
        const form = document.querySelector(`.pv-area-form[data-pv-id="${pvArea.id}"]`);
        if (!form) return;
        
        // Update perpendicular distance for roof-parallel
        if (pvArea.type === 'roof-parallel') {
            const distanceDisplay = form.querySelector('.perpendicular-distance');
            if (distanceDisplay) {
                distanceDisplay.textContent = formatGermanNumber(pvArea.perpendicularDistance || 0);
            }
        }
    }
    
    /**
     * Initializes Bootstrap tooltips
     * @private
     */
    initializeTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            // Dispose existing tooltip if any
            const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (existingTooltip) {
                existingTooltip.dispose();
            }
            // Create new tooltip
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    /**
     * Loads module types from server or uses defaults
     * @private
     */
    async loadModuleTypes() {
        try {
            const response = await fetch('/api/module_types');
            if (response.ok) {
                const moduleTypes = await response.json();
                state.setModuleTypes(moduleTypes);
            } else {
                throw new Error('Failed to load module types');
            }
        } catch (error) {
            console.warn('Using default module types:', error);
            state.setModuleTypes(CONFIG.moduleTypes.defaults);
        }
    }
    
    /**
     * Opens module type management modal
     */
    openModuleTypeModal() {
        this.updateModuleTypesList();
        const modal = bootstrap.Modal.getOrCreateInstance(this.elements.modals.moduleType);
        modal.show();
    }
    
    /**
     * Updates module types list in modal
     * @private
     */
    updateModuleTypesList() {
        const container = document.getElementById('moduleTypesList');
        if (!container) return;
        
        const moduleTypes = state.moduleTypes;
        
        let html = '<div class="list-group">';
        moduleTypes.forEach(mt => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${mt.name}</h6>
                            <small class="text-muted">${mt.manufacturer} - ${mt.model}</small>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" 
                                    onclick="ui.editModuleType(${mt.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" 
                                    onclick="ui.deleteModuleType(${mt.id})"
                                    ${moduleTypes.length <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    /**
     * Saves module type from form
     * @private
     */
    saveModuleType() {
        const form = this.elements.forms.moduleType;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const moduleType = {
            id: parseInt(formData.get('id')) || Date.now(),
            name: formData.get('name'),
            manufacturer: formData.get('manufacturer'),
            model: formData.get('model'),
            reflectionProfile: {}
        };
        
        // Get reflection values
        for (let angle = 0; angle <= 90; angle += 10) {
            const value = parseFloat(formData.get(`reflection_${angle}`));
            if (!isNaN(value)) {
                moduleType.reflectionProfile[angle] = value;
            }
        }
        
        // Update or add module type
        const moduleTypes = [...state.moduleTypes];
        const existingIndex = moduleTypes.findIndex(mt => mt.id === moduleType.id);
        
        if (existingIndex >= 0) {
            moduleTypes[existingIndex] = moduleType;
        } else {
            moduleTypes.push(moduleType);
        }
        
        state.setModuleTypes(moduleTypes);
        
        // Save to server
        this.saveModuleTypesToServer(moduleTypes);
        
        // Reset form and update list
        form.reset();
        this.updateModuleTypesList();
        
        this.showInfoMessage('Gespeichert', 'Modultyp wurde erfolgreich gespeichert.', 'success');
    }
    
    /**
     * Saves module types to server
     * @private
     * @param {Array} moduleTypes - Module types array
     */
    async saveModuleTypesToServer(moduleTypes) {
        try {
            await fetch('/api/module_types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(moduleTypes)
            });
        } catch (error) {
            console.error('Error saving module types:', error);
        }
    }
    
    /**
     * Updates active tool display
     * @private
     * @param {string} tool - Current tool
     */
    updateActiveToolDisplay(tool) {
        // Update cursor
        if (tool && tool.startsWith('draw')) {
            document.body.style.cursor = 'crosshair';
        } else {
            document.body.style.cursor = '';
        }
        
        // Update toolbar
        this.updateToolbarState();
    }
    
    /**
     * Switches to a specific panel
     * @param {string} panelName - Name of the panel to switch to
     */
    switchToPanel(panelName) {
        // Hide all panels
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Show selected panel
        const selectedPanel = document.getElementById(`panel-${panelName}`);
        if (selectedPanel) {
            selectedPanel.classList.add('active');
        }
        
        // Update menu item active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeMenuItem = document.querySelector(`.menu-item[data-panel="${panelName}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
        
        // Collapse menu and show current function
        const menuSection = document.getElementById('menu-section');
        const currentFunctionText = document.getElementById('current-function-text');
        
        if (menuSection && currentFunctionText && activeMenuItem) {
            menuSection.classList.add('collapsed');
            currentFunctionText.textContent = activeMenuItem.textContent.trim();
        }
    }
    
    /**
     * Goes back to main menu
     */
    backToMenu() {
        const menuSection = document.getElementById('menu-section');
        if (menuSection) {
            menuSection.classList.remove('collapsed');
        }
        
        // Show default hint panel
        this.switchToPanel('default-hint');
    }
    
    /**
     * Shows the PV type selection modal
     */
    showPVTypeModal() {
        const modal = document.getElementById('pvTypeModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }
    
    /**
     * Handles PV type selection
     * @param {string} pvType - The selected PV type
     */
    selectPVType(pvType) {
        // Close the modal
        const modal = document.getElementById('pvTypeModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
        
        // Don't set the mode yet - wait until after instructions
        // Just show the drawing instructions
        this.showDrawingInstructions(pvType);
    }
    
    /**
     * Shows drawing instructions for a PV type
     * @param {string} pvType - The PV type
     */
    showDrawingInstructions(pvType) {
        const typeConfig = CONFIG.pvArea.types[pvType];
        if (!typeConfig) return;
        
        // Store current PV type for later
        this.currentDrawingType = pvType;
        
        // Get instructions based on type
        let instructions = '';
        switch (pvType) {
            case 'roof-parallel':
                instructions = `
                    <div class="mb-3">
                        <h6 class="text-primary"><i class="fas fa-info-circle"></i> Dachparallele PV-Fläche</h6>
                    </div>
                    <div class="alert alert-info">
                        <p class="mb-2"><strong>So zeichnen Sie die Fläche:</strong></p>
                        <ol class="mb-0">
                            <li>Zeichnen Sie die erste Linie entlang der oberen oder unteren Kante der PV-Fläche</li>
                            <li>Versuchen Sie die PV-Fläche so gut es geht mit einem Viereck zu erfassen</li>
                            <li>Das Viereck kann nach Vollendung noch frei angepasst werden</li>
                        </ol>
                    </div>
                    <p class="small text-muted mb-0">
                        <i class="fas fa-keyboard"></i> Mit <kbd>ESC</kbd> können Sie jederzeit abbrechen<br>
                        <i class="fas fa-edit"></i> Im Nachgang können Eckpunkte, Kantenpositionen und Kantenlängen angepasst werden<br>
                        <i class="fas fa-ban"></i> Mit der Funktion "PV-Fläche ausschließen" können Sie noch Bereiche ausschließen (z.B. Dachfenster, Schornsteine etc.), die Sie ggf. überzeichnen
                    </p>
                `;
                break;
            case 'roof-mounted':
                instructions = `
                    <div class="mb-3">
                        <h6 class="text-primary"><i class="fas fa-solar-panel"></i> Aufgeständerte Module auf Dach</h6>
                    </div>
                    <div class="alert alert-info">
                        <p class="mb-2"><strong>So zeichnen Sie die Fläche:</strong></p>
                        <ol class="mb-0">
                            <li>Klicken Sie auf die Karte, um die Eckpunkte der Dachfläche zu setzen</li>
                            <li>Schließen Sie das Polygon durch Klick auf den ersten Punkt oder Doppelklick</li>
                            <li>Die Ausrichtung und Neigung der Module können Sie im Anschluss einstellen</li>
                        </ol>
                    </div>
                    <p class="small text-muted mb-0">
                        <i class="fas fa-keyboard"></i> Mit <kbd>ESC</kbd> können Sie jederzeit abbrechen<br>
                        <i class="fas fa-ruler-combined"></i> Eckpunkt-Höhen können nach dem Zeichnen eingegeben werden
                    </p>
                `;
                break;
            case 'facade':
                instructions = `
                    <div class="mb-3">
                        <h6 class="text-primary"><i class="fas fa-building"></i> Fassadenanlage</h6>
                    </div>
                    <div class="alert alert-info">
                        <p class="mb-2"><strong>So zeichnen Sie die Fläche:</strong></p>
                        <ol class="mb-0">
                            <li>Klicken Sie auf die Karte, um die Eckpunkte der Fassadenfläche zu setzen</li>
                            <li>Schließen Sie das Polygon durch Klick auf den ersten Punkt</li>
                            <li>Die Module werden standardmäßig vertikal (90°) ausgerichtet</li>
                        </ol>
                    </div>
                    <p class="small text-muted mb-0">
                        <i class="fas fa-keyboard"></i> Mit <kbd>ESC</kbd> können Sie jederzeit abbrechen<br>
                        <i class="fas fa-arrows-alt-v"></i> Höhenangaben für Ober- und Unterkante können nachträglich angepasst werden
                    </p>
                `;
                break;
            case 'ground':
                instructions = `
                    <div class="mb-3">
                        <h6 class="text-primary"><i class="fas fa-seedling"></i> Freiflächenanlage</h6>
                    </div>
                    <div class="alert alert-info">
                        <p class="mb-2"><strong>So zeichnen Sie die Fläche:</strong></p>
                        <ol class="mb-0">
                            <li>Klicken Sie auf die Karte, um das Grundstück zu umranden</li>
                            <li>Setzen Sie Punkt für Punkt die Grundstücksgrenzen</li>
                            <li>Schließen Sie das Polygon durch Klick auf den ersten Punkt</li>
                        </ol>
                    </div>
                    <p class="small text-muted mb-0">
                        <i class="fas fa-keyboard"></i> Mit <kbd>ESC</kbd> können Sie jederzeit abbrechen<br>
                        <i class="fas fa-compass"></i> Modulausrichtung und -neigung können Sie nachträglich festlegen
                    </p>
                `;
                break;
        }
        
        // Show modal with instructions
        const modalHtml = `
            <div class="modal fade" id="drawingInstructionsModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Zeichenanleitung</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${instructions}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="ui.startDrawingAfterInstructions()">
                                <i class="fas fa-pencil-alt"></i> Zeichnen starten
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('drawingInstructionsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('drawingInstructionsModal'));
        modal.show();
    }
    
    /**
     * Starts drawing after showing instructions
     */
    startDrawingAfterInstructions() {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('drawingInstructionsModal'));
        if (modal) {
            modal.hide();
        }
        
        // Set the drawing mode now
        if (this.currentDrawingType) {
            state.setMode({
                tool: 'draw-pv',
                pvType: this.currentDrawingType
            });
            
            // The mode change event will trigger the drawing to start
            // through the event listeners in pvAreaManager or drawingManager
        }
    }
    
    /**
     * Starts drawing observation point
     */
    startDrawingOP() {
        state.setMode({
            tool: 'draw-op'
        });
        
        mapManager.setDrawingMode('marker');
    }
    
    /**
     * Opens module type manager
     */
    openModuleTypeManager() {
        const modal = document.getElementById('moduleTypeModal');
        if (modal) {
            this.updateModuleTypesList();
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }
    
    /**
     * Searches for an address
     */
    searchAddress() {
        const input = document.getElementById('address-search');
        if (!input || !input.value.trim()) return;
        
        const address = input.value.trim();
        
        // Check if it's coordinates (lat,lng format)
        const coordMatch = address.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            mapManager.map.setCenter({ lat, lng });
            mapManager.map.setZoom(18);
            return;
        }
        
        // Use Google Geocoding
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                mapManager.map.setCenter(results[0].geometry.location);
                mapManager.map.setZoom(18);
                
                // Clear the input
                input.value = '';
            } else {
                console.error('Geocoding failed:', status);
                alert('Adresse konnte nicht gefunden werden');
            }
        });
    }
}

// Create global UI manager instance
const ui = new UIManager();

// Make it globally accessible
window.ui = ui;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ui;
}