/**
 * @fileoverview State management for the Glare Check application
 * @module state
 * @requires utils
 */

/**
 * Application state manager
 * Centralized state management with event system
 */
class StateManager {
    constructor() {
        /**
         * @type {Array<Object>} PV areas array
         */
        this.pvAreas = [];
        
        /**
         * @type {Array<Object>} Module types array
         */
        this.moduleTypes = [];
        
        /**
         * @type {Array<Object>} Observation points array
         */
        this.observationPoints = [];
        
        /**
         * @type {Object} Project metadata
         */
        this.projectMeta = {
            name: '',
            description: '',
            createdAt: new Date(),
            modifiedAt: new Date()
        };
        
        /**
         * @type {Object} Current tool/mode state
         */
        this.currentMode = {
            tool: null, // 'draw-pv', 'draw-op', 'edit', etc.
            pvType: 'roof-parallel',
            editMode: false
        };
        
        /**
         * @type {Object} UI state
         */
        this.ui = {
            selectedPvAreaId: null,
            cornerHeightsPanelOpen: false,
            cornerHeightsPvId: null
        };
        
        /**
         * @type {Map} Event listeners
         */
        this.listeners = new Map();
        
        /**
         * @type {Array} State history for undo/redo
         */
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
    }
    
    /**
     * Gets a PV area by ID
     * @param {string} id - PV area ID
     * @returns {Object|null} PV area object or null
     */
    getPvArea(id) {
        return this.pvAreas.find(pv => pv.id === id) || null;
    }
    
    /**
     * Gets a PV area by its polygon instance
     * @param {google.maps.Polygon} polygon - The polygon
     * @returns {Object|null} PV area object or null if not found
     */
    getPvAreaByPolygon(polygon) {
        if (!polygon || !polygon.pvAreaData) return null;
        return this.getPvArea(polygon.pvAreaData.id);
    }
    
    /**
     * Adds a new PV area
     * @param {Object} pvArea - PV area object
     * @fires state:pvarea:added
     */
    addPvArea(pvArea) {
        this.pvAreas.push(pvArea);
        this.saveToHistory();
        this.emit('pvarea:added', pvArea);
        this.emit('pvarea:changed');
    }
    
    /**
     * Updates a PV area
     * @param {string} id - PV area ID
     * @param {Object} updates - Properties to update
     * @fires state:pvarea:updated
     */
    updatePvArea(id, updates) {
        const pvArea = this.getPvArea(id);
        if (!pvArea) return;
        
        Object.assign(pvArea, updates);
        pvArea.modifiedAt = new Date();
        
        this.saveToHistory();
        this.emit('pvarea:updated', pvArea);
        this.emit('pvarea:changed');
    }
    
    /**
     * Removes a PV area
     * @param {string} id - PV area ID
     * @fires state:pvarea:removed
     */
    removePvArea(id) {
        const index = this.pvAreas.findIndex(pv => pv.id === id);
        if (index === -1) return;
        
        const removed = this.pvAreas.splice(index, 1)[0];
        this.saveToHistory();
        this.emit('pvarea:removed', removed);
        this.emit('pvarea:changed');
    }
    
    /**
     * Gets a module type by ID
     * @param {number} id - Module type ID
     * @returns {Object|null} Module type object or null
     */
    getModuleType(id) {
        return this.moduleTypes.find(mt => mt.id === id) || null;
    }
    
    /**
     * Sets the module types
     * @param {Array<Object>} moduleTypes - Array of module types
     * @fires state:moduletypes:changed
     */
    setModuleTypes(moduleTypes) {
        this.moduleTypes = moduleTypes;
        this.emit('moduletypes:changed', moduleTypes);
    }
    
    /**
     * Adds an observation point
     * @param {Object} op - Observation point object
     * @fires state:op:added
     */
    addObservationPoint(op) {
        this.observationPoints.push(op);
        this.saveToHistory();
        this.emit('op:added', op);
        this.emit('op:changed');
    }
    
    /**
     * Updates an observation point
     * @param {string} id - Observation point ID
     * @param {Object} updates - Properties to update
     * @fires state:op:updated
     */
    updateObservationPoint(id, updates) {
        const op = this.observationPoints.find(o => o.id === id);
        if (!op) return;
        
        Object.assign(op, updates);
        this.emit('op:updated', op);
        this.emit('op:changed');
    }
    
    /**
     * Removes an observation point
     * @param {string} id - Observation point ID
     * @fires state:op:removed
     */
    removeObservationPoint(id) {
        const index = this.observationPoints.findIndex(o => o.id === id);
        if (index === -1) return;
        
        const removed = this.observationPoints.splice(index, 1)[0];
        this.saveToHistory();
        this.emit('op:removed', removed);
        this.emit('op:changed');
    }
    
    /**
     * Sets the current tool/mode
     * @param {string} tool - Tool name
     * @param {Object} [options] - Additional options
     * @fires state:mode:changed
     */
    setCurrentMode(tool, options = {}) {
        const oldMode = { ...this.currentMode };
        this.currentMode.tool = tool;
        Object.assign(this.currentMode, options);
        this.emit('mode:changed', { old: oldMode, new: this.currentMode });
    }
    
    /**
     * Sets the current mode (alias for setCurrentMode)
     * @param {Object} mode - Mode object with tool and options
     * @fires state:mode:changed
     */
    setMode(mode) {
        if (typeof mode === 'object' && mode.tool) {
            const { tool, ...options } = mode;
            this.setCurrentMode(tool, options);
        }
    }
    
    /**
     * Updates UI state
     * @param {Object} updates - UI state updates
     * @fires state:ui:changed
     */
    updateUI(updates) {
        Object.assign(this.ui, updates);
        this.emit('ui:changed', this.ui);
    }
    
    /**
     * Saves current state to history
     */
    saveToHistory() {
        // Remove any states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        const state = {
            pvAreas: deepClone(this.pvAreas),
            observationPoints: deepClone(this.observationPoints),
            timestamp: new Date()
        };
        
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    /**
     * Undoes the last action
     * @returns {boolean} True if undo was successful
     * @fires state:undo
     */
    undo() {
        if (this.historyIndex <= 0) return false;
        
        this.historyIndex--;
        const state = this.history[this.historyIndex];
        
        this.pvAreas = deepClone(state.pvAreas);
        this.observationPoints = deepClone(state.observationPoints);
        
        this.emit('undo', state);
        this.emit('pvarea:changed');
        this.emit('op:changed');
        
        return true;
    }
    
    /**
     * Redoes the last undone action
     * @returns {boolean} True if redo was successful
     * @fires state:redo
     */
    redo() {
        if (this.historyIndex >= this.history.length - 1) return false;
        
        this.historyIndex++;
        const state = this.history[this.historyIndex];
        
        this.pvAreas = deepClone(state.pvAreas);
        this.observationPoints = deepClone(state.observationPoints);
        
        this.emit('redo', state);
        this.emit('pvarea:changed');
        this.emit('op:changed');
        
        return true;
    }
    
    /**
     * Exports the current state
     * @returns {Object} Serializable state object
     */
    exportState() {
        return {
            version: '1.0',
            projectMeta: this.projectMeta,
            pvAreas: this.pvAreas.map(pv => {
                const { polygon, ...data } = pv;
                return data;
            }),
            observationPoints: this.observationPoints.map(op => {
                const { marker, ...data } = op;
                return data;
            }),
            moduleTypes: this.moduleTypes,
            exportedAt: new Date().toISOString()
        };
    }
    
    /**
     * Imports state from an object
     * @param {Object} data - State data to import
     * @throws {Error} If data is invalid
     * @fires state:imported
     */
    importState(data) {
        if (!data || data.version !== '1.0') {
            throw new Error('Invalid or unsupported data format');
        }
        
        // Clear current state
        this.pvAreas = [];
        this.observationPoints = [];
        
        // Import data
        if (data.projectMeta) {
            this.projectMeta = data.projectMeta;
        }
        
        if (data.pvAreas) {
            this.pvAreas = data.pvAreas;
        }
        
        if (data.observationPoints) {
            this.observationPoints = data.observationPoints;
        }
        
        if (data.moduleTypes) {
            this.moduleTypes = data.moduleTypes;
        }
        
        this.history = [];
        this.historyIndex = -1;
        this.saveToHistory();
        
        this.emit('imported', data);
        this.emit('pvarea:changed');
        this.emit('op:changed');
        this.emit('moduletypes:changed');
    }
    
    /**
     * Adds an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Removes an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }
    
    /**
     * Emits an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }
    
    /**
     * Clears all state
     * @fires state:cleared
     */
    clear() {
        this.pvAreas = [];
        this.observationPoints = [];
        this.history = [];
        this.historyIndex = -1;
        this.ui = {
            selectedPvAreaId: null,
            cornerHeightsPanelOpen: false,
            cornerHeightsPvId: null
        };
        
        this.emit('cleared');
        this.emit('pvarea:changed');
        this.emit('op:changed');
    }
}

// Create global state instance
const state = new StateManager();

// Make it globally accessible
window.state = state;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = state;
}