/**
 * Dimension Manager Module
 * Global management of all dimension overlays
 */

export const DimensionManager = {
    // Global registry of all dimension overlays
    _registry: new Map(),
    
    /**
     * Register dimension overlays for a PV area
     */
    register(pvAreaId, overlays) {
        // Clear any existing overlays for this PV area
        this.clear(pvAreaId);
        
        // Store new overlays
        this._registry.set(pvAreaId, overlays);
    },
    
    /**
     * Clear dimension overlays for a PV area
     */
    clear(pvAreaId) {
        const existing = this._registry.get(pvAreaId);
        if (existing) {
            existing.forEach(overlay => {
                if (overlay && overlay.setMap) {
                    overlay.setMap(null);
                }
            });
            this._registry.delete(pvAreaId);
        }
    },
    
    /**
     * Clear all dimension overlays
     */
    clearAll() {
        this._registry.forEach((overlays, pvAreaId) => {
            this.clear(pvAreaId);
        });
    },
    
    /**
     * Get overlays for a PV area
     */
    get(pvAreaId) {
        return this._registry.get(pvAreaId) || [];
    }
};

export default DimensionManager;