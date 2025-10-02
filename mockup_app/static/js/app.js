/**
 * @fileoverview Main application entry point for Glare Check
 * @module app
 * @requires config
 * @requires utils
 * @requires state
 * @requires calculations
 * @requires map
 * @requires pv-areas
 * @requires drawing
 * @requires ui
 * @requires corner-heights
 */

/**
 * Main Application class
 * Coordinates all modules and handles application lifecycle
 */
class GlareCheckApp {
    constructor() {
        /**
         * @type {boolean} Application initialization status
         */
        this.isInitialized = false;
        
        /**
         * @type {Object} Module references
         */
        this.modules = {
            state: null,
            map: null,
            pvAreas: null,
            drawing: null,
            ui: null,
            cornerHeights: null
        };
        
        /**
         * @type {Object} Application metadata
         */
        this.metadata = {
            version: '1.0.0',
            buildDate: '2025-01-07',
            environment: 'production'
        };
    }
    
    /**
     * Initializes the application
     */
    async initialize() {
        try {
            console.log(`🚀 Glare Check v${this.metadata.version} initializing...`);
            
            // Check browser compatibility
            this.checkBrowserCompatibility();
            
            // Clean up any lingering modal backdrops
            this.cleanupModalBackdrops();
            
            // Load configuration
            await this.loadConfiguration();
            
            // Initialize modules
            await this.initializeModules();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up application event listeners
            this.setupApplicationListeners();
            
            // Initialize Google Maps
            await this.initializeMap();
            
            // Load saved state if any
            await this.loadSavedState();
            
            this.isInitialized = true;
            console.log('✅ Application initialized successfully');
            
            // Emit ready event
            state.emit('app:ready');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Checks browser compatibility
     * @private
     * @throws {Error} If browser is not compatible
     */
    checkBrowserCompatibility() {
        const requiredFeatures = [
            'Promise',
            'fetch',
            'FormData',
            'Map',
            'Set',
            'Array.from',
            'Object.assign'
        ];
        
        const missingFeatures = requiredFeatures.filter(feature => {
            try {
                return !eval(feature);
            } catch {
                return true;
            }
        });
        
        if (missingFeatures.length > 0) {
            throw new Error(`Browser missing required features: ${missingFeatures.join(', ')}`);
        }
        
        // Check for Google Maps
        if (!window.google || !window.google.maps) {
            throw new Error('Google Maps API not loaded');
        }
    }
    
    /**
     * Cleans up any lingering modal backdrops
     * @private
     */
    cleanupModalBackdrops() {
        // Remove all modal backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        
        // Reset body padding
        document.body.style.paddingRight = '';
        
        // Close all modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }
    
    /**
     * Loads application configuration
     * @private
     */
    async loadConfiguration() {
        // Configuration is already loaded from config.js
        // Here we could load additional runtime config from server
        
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const runtimeConfig = await response.json();
                // Merge with existing config
                Object.assign(CONFIG, runtimeConfig);
            }
        } catch (error) {
            console.warn('Using default configuration:', error);
        }
    }
    
    /**
     * Initializes all modules
     * @private
     */
    async initializeModules() {
        // Store module references
        this.modules = {
            state: state,
            map: mapManager,
            pvAreas: pvAreaManager,
            drawing: drawingManager,
            ui: ui,
            cornerHeights: cornerHeightsManager
        };
        
        // Initialize UI first
        ui.initialize();
        
        console.log('✅ Modules initialized');
    }
    
    /**
     * Sets up global error handling
     * @private
     */
    setupErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
            event.preventDefault();
        });
        
        // Handle general errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error);
            event.preventDefault();
        });
    }
    
    /**
     * Sets up application-level event listeners
     * @private
     */
    setupApplicationListeners() {
        // Listen for state changes that need persistence
        let saveTimeout;
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => this.autoSave(), 1000);
        };
        
        state.on('pvarea:changed', debouncedSave);
        state.on('op:changed', debouncedSave);
        state.on('moduletypes:changed', debouncedSave);
        
        // Handle before unload
        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich die Seite verlassen?';
            }
        });
        
        // Handle visibility change for auto-save
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.autoSave();
            }
        });
        
        // Handle online/offline
        window.addEventListener('online', () => {
            ui.showInfoMessage('Online', 'Verbindung wiederhergestellt', 'success');
        });
        
        window.addEventListener('offline', () => {
            ui.showInfoMessage('Offline', 'Keine Internetverbindung', 'warning');
        });
    }
    
    /**
     * Initializes Google Maps
     * @private
     */
    async initializeMap() {
        try {
            await mapManager.initialize('map');
            console.log('✅ Map initialized');
        } catch (error) {
            throw new Error(`Map initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Loads saved application state
     * @private
     */
    async loadSavedState() {
        try {
            // Try to load from localStorage first
            const savedState = localStorage.getItem('glarecheck_state');
            if (savedState) {
                const data = JSON.parse(savedState);
                await this.restoreState(data);
                console.log('✅ Restored state from localStorage');
                return;
            }
            
            // Try to load from server
            const response = await fetch('/api/state');
            if (response.ok) {
                const data = await response.json();
                await this.restoreState(data);
                console.log('✅ Restored state from server');
            }
        } catch (error) {
            console.warn('No saved state found or error loading:', error);
        }
    }
    
    /**
     * Restores application state from data
     * @private
     * @param {Object} data - State data
     */
    async restoreState(data) {
        try {
            // Import state
            state.importState(data);
            
            // Recreate map elements
            state.pvAreas.forEach(pvArea => {
                pvAreaManager.createPolygonOnMap(pvArea);
            });
            
            // TODO: Restore observation points when implemented
            
            console.log('State restored successfully');
            
        } catch (error) {
            console.error('Error restoring state:', error);
            // Don't show error modal - it causes backdrop issues
        }
    }
    
    /**
     * Auto-saves the current state
     * @private
     */
    autoSave() {
        try {
            const stateData = state.exportState();
            
            // Save to localStorage
            localStorage.setItem('glarecheck_state', JSON.stringify(stateData));
            localStorage.setItem('glarecheck_state_timestamp', new Date().toISOString());
            
            // Also try to save to server
            this.saveToServer(stateData);
            
            console.log('✅ State auto-saved');
            
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    /**
     * Saves state to server
     * @private
     * @param {Object} stateData - State data to save
     */
    async saveToServer(stateData) {
        try {
            await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateData)
            });
        } catch (error) {
            console.warn('Server save failed:', error);
        }
    }
    
    /**
     * Checks if there are unsaved changes
     * @private
     * @returns {boolean}
     */
    hasUnsavedChanges() {
        // For now, always return false as we auto-save
        // In future, could track changes since last save
        return false;
    }
    
    /**
     * Handles initialization errors
     * @private
     * @param {Error} error - The error
     */
    handleInitializationError(error) {
        const errorContainer = document.getElementById('app-error');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger m-3" role="alert">
                    <h4 class="alert-heading">Initialisierungsfehler</h4>
                    <p>${error.message}</p>
                    <hr>
                    <p class="mb-0">
                        Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.
                    </p>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }
    
    /**
     * Handles runtime errors
     * @private
     * @param {Error} error - The error
     */
    handleError(error) {
        console.error('Runtime error:', error);
        
        // Don't show UI errors in production
        if (this.metadata.environment === 'development') {
            ui.showInfoMessage('Fehler', error.message, 'error');
        }
    }
    
    /**
     * Exports the current project
     * @returns {Object} Project data
     */
    exportProject() {
        const projectData = {
            ...state.exportState(),
            metadata: {
                ...this.metadata,
                exportDate: new Date().toISOString()
            }
        };
        
        return projectData;
    }
    
    /**
     * Imports a project
     * @param {Object} projectData - Project data to import
     */
    async importProject(projectData) {
        try {
            // Clear current state
            state.clear();
            
            // Remove all map elements
            pvAreaManager.getAllPolygons().forEach(polygon => {
                polygon.setMap(null);
            });
            
            // Import new state
            await this.restoreState(projectData);
            
            ui.showInfoMessage('Importiert', 'Projekt wurde erfolgreich importiert', 'success');
            
        } catch (error) {
            console.error('Import failed:', error);
            ui.showInfoMessage('Import fehlgeschlagen', 'Das Projekt konnte nicht importiert werden', 'error');
            throw error;
        }
    }
    
    /**
     * Downloads project as JSON file
     */
    downloadProject() {
        const projectData = this.exportProject();
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `glarecheck_project_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }
    
    /**
     * Uploads and imports a project file
     */
    uploadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const projectData = JSON.parse(text);
                await this.importProject(projectData);
            } catch (error) {
                ui.showInfoMessage('Fehler', 'Die Datei konnte nicht gelesen werden', 'error');
            }
        });
        
        input.click();
    }
    
    /**
     * Starts the glare simulation
     */
    async startSimulation() {
        try {
            // Validate inputs
            if (state.pvAreas.length === 0) {
                ui.showInfoMessage('Keine PV-Flächen', 'Bitte zeichnen Sie mindestens eine PV-Fläche', 'warning');
                return;
            }
            
            if (state.observationPoints.length === 0) {
                ui.showInfoMessage('Keine Beobachtungspunkte', 'Bitte setzen Sie mindestens einen Beobachtungspunkt', 'warning');
                return;
            }
            
            // Prepare simulation data
            const simulationData = {
                pv_areas: state.pvAreas,
                observation_points: state.observationPoints,
                simulation_parameters: {
                    start_date: '2025-01-01',
                    end_date: '2025-12-31',
                    time_step: 60, // minutes
                    // Add more parameters as needed
                }
            };
            
            // Show loading
            ui.showInfoMessage('Simulation gestartet', 'Die Simulation wird durchgeführt...', 'info');
            
            // Send to backend
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(simulationData)
            });
            
            if (response.ok) {
                const results = await response.json();
                this.handleSimulationResults(results);
            } else {
                throw new Error('Simulation failed');
            }
            
        } catch (error) {
            console.error('Simulation error:', error);
            ui.showInfoMessage('Simulationsfehler', 'Die Simulation konnte nicht durchgeführt werden', 'error');
        }
    }
    
    /**
     * Handles simulation results
     * @private
     * @param {Object} results - Simulation results
     */
    handleSimulationResults(results) {
        console.log('Simulation results:', results);
        ui.showInfoMessage('Simulation abgeschlossen', 'Die Ergebnisse sind verfügbar', 'success');
        
        // TODO: Display results in UI
        // - Show glare periods
        // - Display visualizations
        // - Generate reports
    }
    
    /**
     * Gets application info
     * @returns {Object} Application information
     */
    getInfo() {
        return {
            ...this.metadata,
            modules: Object.keys(this.modules),
            state: {
                pvAreas: state.pvAreas.length,
                observationPoints: state.observationPoints.length,
                moduleTypes: state.moduleTypes.length
            },
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                online: navigator.onLine
            }
        };
    }
}

// Create global application instance
const app = new GlareCheckApp();

// Initialize when Google Maps is ready
window.initMap = function() {
    console.log('Google Maps callback triggered');
    app.initialize();
};

// Make app globally accessible for debugging
window.GlareCheckApp = app;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
}