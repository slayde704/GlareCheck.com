/**
 * State Manager Module
 * Centralized state management for the application
 */

import { DimensionManager } from '../pv-areas/dimension-manager.js';

export const StateManager = {
    // Private state
    _state: {
        pvAreas: [],
        observationPoints: [],
        excludedAreas: [],
        obstacles: [],
        moduleTypes: [],
        defaultModuleTypes: [], // Store the protected default types
        currentMode: 'view',
        projectMetadata: {
            name: '',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        }
    },

    // Flag to track if defaults are loaded
    _defaultsLoaded: false,

    // Listeners for state changes
    _listeners: [],
    
    /**
     * Initialize the state manager and load default module types
     */
    async initialize() {
        if (this._defaultsLoaded) return;
        
        try {
            // Load default module types from JSON
            const response = await fetch('/static/data/default-module-types.json');
            if (response.ok) {
                const data = await response.json();
                this._state.defaultModuleTypes = data.moduleTypes || [];
                this._state.moduleTypes = [...this._state.defaultModuleTypes];
                // Silent initialization
            } else {
                // Use fallback defaults if file not found
                this.loadFallbackDefaults();
            }
            
            this._defaultsLoaded = true;
        } catch (error) {
            // Use fallback defaults on error
            this.loadFallbackDefaults();
            this._defaultsLoaded = true;
        }
    },
    
    /**
     * Load fallback default module types
     */
    loadFallbackDefaults() {
        this._state.defaultModuleTypes = [
            {
                id: 0,
                name: "Standard Modul",
                manufacturer: "Generic",
                model: "Standard",
                beamSpread: 0.5,
                isProtected: true,
                reflectionProfile: {
                    "0": 70000, "10": 70000, "20": 71000, "30": 79000, "40": 120000,
                    "50": 280000, "60": 930000, "70": 3900000, "80": 16134855, "90": 58377635
                }
            },
            {
                id: 1,
                name: "Anti-Reflex Modul",
                manufacturer: "Phytonics",
                model: "Anti-Glare",
                beamSpread: 40,
                isProtected: true,
                reflectionProfile: {
                    "0": 2800, "10": 2900, "20": 3200, "30": 3900, "40": 5400,
                    "50": 9500, "60": 21000, "70": 65000, "80": 180000, "90": 510000
                }
            }
        ];
        this._state.moduleTypes = [...this._state.defaultModuleTypes];
    },

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    },

    /**
     * Notify all listeners of state change
     * @param {string} type - Type of change
     * @param {Object} data - Changed data
     */
    _notify(type, data) {
        this._listeners.forEach(listener => listener(type, data));
    },

    // PV Areas Management
    addPVArea(pvArea) {
        const newPVArea = {
            ...pvArea,
            id: pvArea.id || `pv-${Date.now()}`,
            name: pvArea.name || '',
            createdAt: new Date().toISOString()
        };
        this._state.pvAreas.push(newPVArea);
        this._notify('pv-area-added', newPVArea);
        return newPVArea;
    },

    updatePVArea(id, updates) {
        const index = this._state.pvAreas.findIndex(pv => pv.id === id);
        if (index !== -1) {
            this._state.pvAreas[index] = { ...this._state.pvAreas[index], ...updates };
            this._notify('pv-area-updated', this._state.pvAreas[index]);
            return this._state.pvAreas[index];
        }
        return null;
    },

    deletePVArea(id) {
        const index = this._state.pvAreas.findIndex(pv => pv.id === id);
        if (index !== -1) {
            const pvArea = this._state.pvAreas[index];
            
            // Remove visual elements if they exist
            if (pvArea.polygon) {
                // Remove edge lines stored on polygon
                if (pvArea.polygon.edgeLines) {
                    pvArea.polygon.edgeLines.forEach(line => line.setMap(null));
                }
                
                // Remove enhanced elements stored on polygon
                if (pvArea.polygon.enhancedElements) {
                    const elements = pvArea.polygon.enhancedElements;
                    
                    // Remove vertex markers and their double arrows
                    if (elements.markers) {
                        elements.markers.forEach(marker => {
                            if (marker.doubleArrowMarker) {
                                marker.doubleArrowMarker.setMap(null);
                            }
                            marker.setMap(null);
                        });
                    }
                    
                    // Remove edge move markers
                    if (elements.edgeMoveMarkers) {
                        elements.edgeMoveMarkers.forEach(marker => {
                            marker.setMap(null);
                        });
                    }
                    
                    // Remove rotation marker
                    if (elements.rotationMarker) {
                        elements.rotationMarker.setMap(null);
                    }
                    
                    // Remove double arrows
                    if (elements.doubleArrows) {
                        elements.doubleArrows.forEach(arrow => {
                            arrow.setMap(null);
                        });
                    }
                }
                
                pvArea.polygon.setMap(null);
            }
            
            // Also try to remove edge lines from pvArea directly (fallback)
            if (pvArea.edgeLines) {
                pvArea.edgeLines.forEach(line => line.setMap(null));
            }
            
            // Remove enhanced elements (markers, edge move markers, rotation marker, etc.)
            if (pvArea.enhancedElements) {
                // Remove vertex markers and their double arrows
                if (pvArea.enhancedElements.markers) {
                    pvArea.enhancedElements.markers.forEach(marker => {
                        if (marker.doubleArrowMarker) {
                            marker.doubleArrowMarker.setMap(null);
                        }
                        marker.setMap(null);
                    });
                }
                
                // Remove edge move markers
                if (pvArea.enhancedElements.edgeMoveMarkers) {
                    pvArea.enhancedElements.edgeMoveMarkers.forEach(marker => {
                        marker.setMap(null);
                    });
                }
                
                // Remove rotation marker
                if (pvArea.enhancedElements.rotationMarker) {
                    pvArea.enhancedElements.rotationMarker.setMap(null);
                }
                
                // Remove double arrows for corner markers
                if (pvArea.enhancedElements.doubleArrows) {
                    pvArea.enhancedElements.doubleArrows.forEach(arrow => {
                        arrow.setMap(null);
                    });
                }
            }
            
            // Remove corner markers
            if (pvArea.cornerMarkers) {
                pvArea.cornerMarkers.forEach(marker => marker.setMap(null));
            }
            
            // Remove orange highlight for facades
            if (pvArea.orangeHighlight) {
                pvArea.orangeHighlight.setMap(null);
            }
            
            // Remove polyline for facades
            if (pvArea.polyline) {
                pvArea.polyline.setMap(null);
            }
            
            // Remove enhanced elements
            if (pvArea.enhancedElements) {
                if (pvArea.enhancedElements.markers) {
                    pvArea.enhancedElements.markers.forEach(m => {
                        if (m.doubleArrowMarker) m.doubleArrowMarker.setMap(null);
                        m.setMap(null);
                    });
                }
                if (pvArea.enhancedElements.edgeMoveMarkers) {
                    pvArea.enhancedElements.edgeMoveMarkers.forEach(m => m.setMap(null));
                }
            }
            
            // Remove lock marker if it exists
            if (pvArea.lockMarker) {
                pvArea.lockMarker.setMap(null);
            }
            
            // Remove dimension overlays using central manager
            DimensionManager.clear(pvArea.id);
            
            const deleted = this._state.pvAreas.splice(index, 1)[0];
            this._notify('pv-area-deleted', deleted);
            return deleted;
        }
        return null;
    },

    getPVArea(id) {
        // Return the actual object from state, not a copy
        return this._state.pvAreas.find(pv => pv.id === id);
    },

    getAllPVAreas() {
        return [...this._state.pvAreas];
    },

    // Observation Points Management
    addObservationPoint(op) {
        const newOP = {
            ...op,
            id: op.id || `op-${Date.now()}`,
            name: op.name || `BP ${this._state.observationPoints.length + 1}`,
            createdAt: new Date().toISOString()
        };
        this._state.observationPoints.push(newOP);
        this._notify('observation-point-added', newOP);
        return newOP;
    },

    updateObservationPoint(id, updates) {
        const index = this._state.observationPoints.findIndex(op => op.id === id);
        if (index !== -1) {
            this._state.observationPoints[index] = { ...this._state.observationPoints[index], ...updates };
            this._notify('observation-point-updated', this._state.observationPoints[index]);
            return this._state.observationPoints[index];
        }
        return null;
    },

    deleteObservationPoint(id) {
        const index = this._state.observationPoints.findIndex(op => op.id === id);
        if (index !== -1) {
            const deleted = this._state.observationPoints.splice(index, 1)[0];
            this._notify('observation-point-deleted', deleted);
            return deleted;
        }
        return null;
    },

    getObservationPoint(id) {
        return this._state.observationPoints.find(op => op.id === id);
    },

    getAllObservationPoints() {
        return [...this._state.observationPoints];
    },

    // Module Types Management
    addModuleType(moduleType) {
        const newModule = {
            ...moduleType,
            id: moduleType.id || Math.max(...this._state.moduleTypes.map(m => m.id)) + 1
        };
        this._state.moduleTypes.push(newModule);
        this._notify('module-type-added', newModule);
        return newModule;
    },

    updateModuleType(id, updates) {
        const index = this._state.moduleTypes.findIndex(m => m.id === id);
        if (index !== -1) {
            this._state.moduleTypes[index] = { ...this._state.moduleTypes[index], ...updates };
            this._notify('module-type-updated', this._state.moduleTypes[index]);
            return this._state.moduleTypes[index];
        }
        return null;
    },

    deleteModuleType(id) {
        // Don't delete default module types (0, 1, 2)
        if (id <= 2) {
            console.warn('Cannot delete default module types');
            return null;
        }
        const index = this._state.moduleTypes.findIndex(m => m.id === id);
        if (index !== -1) {
            const deleted = this._state.moduleTypes.splice(index, 1)[0];
            this._notify('module-type-deleted', deleted);
            return deleted;
        }
        return null;
    },

    getModuleType(id) {
        return this._state.moduleTypes.find(m => m.id === id);
    },

    getAllModuleTypes() {
        return [...this._state.moduleTypes];
    },

    // Mode Management
    setMode(mode) {
        const oldMode = this._state.currentMode;
        this._state.currentMode = mode;
        this._notify('mode-changed', { oldMode, newMode: mode });
    },

    getMode() {
        return this._state.currentMode;
    },

    // Project Management
    setProjectMetadata(metadata) {
        this._state.projectMetadata = {
            ...this._state.projectMetadata,
            ...metadata,
            modifiedAt: new Date().toISOString()
        };
        this._notify('project-metadata-updated', this._state.projectMetadata);
    },

    getProjectMetadata() {
        return { ...this._state.projectMetadata };
    },

    // State Export/Import
    exportState() {
        return {
            pvAreas: this.getAllPVAreas(),
            observationPoints: this.getAllObservationPoints(),
            excludedAreas: [...this._state.excludedAreas],
            obstacles: [...this._state.obstacles],
            moduleTypes: this.getAllModuleTypes(),
            projectMetadata: this.getProjectMetadata()
        };
    },

    importState(state) {
        // Clear current state
        this._state.pvAreas = [];
        this._state.observationPoints = [];
        this._state.excludedAreas = [];
        this._state.obstacles = [];
        
        // Import new state
        if (state.pvAreas) {
            state.pvAreas.forEach(pv => this.addPVArea(pv));
        }
        if (state.observationPoints) {
            state.observationPoints.forEach(op => this.addObservationPoint(op));
        }
        if (state.excludedAreas) {
            this._state.excludedAreas = [...state.excludedAreas];
        }
        if (state.obstacles) {
            this._state.obstacles = [...state.obstacles];
        }
        if (state.moduleTypes) {
            // Only import custom module types (id > 2)
            state.moduleTypes.filter(m => m.id > 2).forEach(m => this.addModuleType(m));
        }
        if (state.projectMetadata) {
            this.setProjectMetadata(state.projectMetadata);
        }
        
        this._notify('state-imported', state);
    },

    // Clear all data
    clearAll() {
        this._state.pvAreas = [];
        this._state.observationPoints = [];
        this._state.excludedAreas = [];
        this._state.obstacles = [];
        this._state.projectMetadata = {
            name: '',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
        this._notify('state-cleared', {});
    },

    // PV Area ordering
    reorderPVAreas(fromIndex, toIndex) {
        const [removed] = this._state.pvAreas.splice(fromIndex, 1);
        this._state.pvAreas.splice(toIndex, 0, removed);
        this._notify('pv-areas-reordered', { fromIndex, toIndex });
    }
};

// For backward compatibility, also export individual functions
export const {
    subscribe,
    addPVArea,
    updatePVArea,
    deletePVArea,
    getPVArea,
    getAllPVAreas,
    addObservationPoint,
    updateObservationPoint,
    deleteObservationPoint,
    getObservationPoint,
    getAllObservationPoints,
    addModuleType,
    updateModuleType,
    deleteModuleType,
    getModuleType,
    getAllModuleTypes,
    setMode,
    getMode,
    exportState,
    importState,
    clearAll
} = StateManager;