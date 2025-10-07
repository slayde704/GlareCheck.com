/**
 * Module Type Manager
 * Handles the management of PV module types and their reflection profiles
 */

import { StateManager } from '../core/state-manager.js';
import { UIManager } from './ui-manager.js';

// i18n helper
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;

export const ModuleTypeManager = {
    editingModuleId: null,

    /**
     * Open the module type manager modal
     */
    open() {
        const modal = document.getElementById('moduleTypeModal');
        const bootstrapModal = new bootstrap.Modal(modal);

        // Populate module types list
        this.updateList();

        bootstrapModal.show();
    },

    /**
     * Update the module types list in the modal
     */
    updateList() {
        const listContainer = document.getElementById('moduleTypesList');
        const moduleTypes = StateManager.getAllModuleTypes();

        listContainer.innerHTML = moduleTypes.map((module, index) => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div style="flex: 1;">
                            <h5 class="mb-1">${module.name}</h5>
                            ${module.manufacturer ? `<small class="text-muted">${module.manufacturer}</small>` : ''}
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <div class="text-center">
                                <small class="text-muted d-block">${t('module.beamSpread')}</small>
                                <strong>${module.beamSpread}°</strong>
                            </div>
                            <div class="text-center">
                                <small class="text-muted d-block">${t('module.usage')}</small>
                                <span class="badge ${this.countUsage(module.id) > 0 ? 'bg-primary' : 'bg-secondary'}">
                                    ${this.countUsage(module.id)}
                                </span>
                            </div>
                            ${!module.isProtected ? `
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-outline-primary"
                                            onclick="ModuleTypeManager.edit(${module.id})"
                                            title="${t('module.edit')}">
                                        <i class="bi bi-pencil me-1"></i>${t('module.edit')}
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger"
                                            onclick="ModuleTypeManager.delete(${module.id})"
                                            title="${t('module.delete')}">
                                        <i class="bi bi-trash me-1"></i>${t('module.delete')}
                                    </button>
                                </div>
                            ` : `<span class="badge bg-secondary">${t('module.protected')}</span>`}
                        </div>
                    </div>

                    <div>
                        <small class="text-muted d-block mb-2">${t('module.reflectionProfile')}</small>
                        ${module.reflectionProfile ? `
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="text-center" style="width: 10%;">${t('module.incidentAngle')}</th>
                                            <th class="text-center" style="width: 9%;">0°</th>
                                            <th class="text-center" style="width: 9%;">10°</th>
                                            <th class="text-center" style="width: 9%;">20°</th>
                                            <th class="text-center" style="width: 9%;">30°</th>
                                            <th class="text-center" style="width: 9%;">40°</th>
                                            <th class="text-center" style="width: 9%;">50°</th>
                                            <th class="text-center" style="width: 9%;">60°</th>
                                            <th class="text-center" style="width: 9%;">70°</th>
                                            <th class="text-center" style="width: 9%;">80°</th>
                                            <th class="text-center" style="width: 9%;">90°</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <th class="text-center table-light">${t('module.luminance')}</th>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["0"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["10"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["20"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["30"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["40"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["50"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["60"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["70"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["80"])}</td>
                                            <td class="text-center">${this.formatNumber(module.reflectionProfile["90"])}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ` : `<span class="text-muted">${t('module.noProfile')}</span>`}
                    </div>
                </div>
            </div>
        `).join('');

        if (moduleTypes.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-muted">${t('module.noTypes')}</p>`;
        }
    },

    /**
     * Format large numbers with thousand separators
     */
    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k';
        }
        const locale = window.i18n?.getLanguage() === 'en' ? 'en-US' : 'de-DE';
        return value.toLocaleString(locale);
    },

    /**
     * Count how many PV areas use this module type
     */
    countUsage(moduleId) {
        const pvAreas = StateManager.getAllPVAreas();
        return pvAreas.filter(pv => pv.moduleType === moduleId).length;
    },

    /**
     * Add a new module type
     */
    addNew() {
        // Reset form
        document.getElementById('moduleTypeForm').reset();
        document.getElementById('moduleTypeFormModalLabel').textContent = t('module.addNew');

        // Clear module ID (for new module)
        this.editingModuleId = null;

        // Hide the module types list modal first
        const listModal = bootstrap.Modal.getInstance(document.getElementById('moduleTypeModal'));
        if (listModal) {
            listModal.hide();
        }

        // Show form modal after a short delay to prevent stacking
        setTimeout(() => {
            const modal = new bootstrap.Modal(document.getElementById('moduleTypeFormModal'));
            modal.show();
        }, 300);
    },

    /**
     * Edit an existing module type
     */
    edit(moduleId) {
        const moduleTypes = StateManager.getAllModuleTypes();
        const module = moduleTypes.find(m => m.id === moduleId);
        if (!module) return;

        // Set form title
        document.getElementById('moduleTypeFormModalLabel').textContent = t('module.editType');

        // Fill form with module data
        document.getElementById('moduleTypeName').value = module.name;
        document.getElementById('moduleTypeBeamSpread').value = module.beamSpread;

        // Fill reflection profile
        if (module.reflectionProfile) {
            Object.entries(module.reflectionProfile).forEach(([angle, value]) => {
                const input = document.getElementById(`reflection${angle}`);
                if (input) {
                    input.value = value;
                }
            });
        }

        // Store module ID for editing
        this.editingModuleId = moduleId;

        // Hide the module types list modal first
        const listModal = bootstrap.Modal.getInstance(document.getElementById('moduleTypeModal'));
        if (listModal) {
            listModal.hide();
        }

        // Show form modal after a short delay
        setTimeout(() => {
            const modal = new bootstrap.Modal(document.getElementById('moduleTypeFormModal'));
            modal.show();
        }, 300);
    },

    /**
     * Save module type (create or update)
     */
    save() {
        const form = document.getElementById('moduleTypeForm');

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Get form data
        const name = document.getElementById('moduleTypeName').value.trim();
        const beamSpread = parseFloat(document.getElementById('moduleTypeBeamSpread').value);

        // Validate name is not empty
        if (!name) {
            UIManager.showMessage(t('module.nameRequired'), t('validation.required'));
            return;
        }

        // Check for duplicate names (except when editing the same module)
        const moduleTypes = StateManager.getAllModuleTypes();
        const duplicate = moduleTypes.find(m =>
            m.name.toLowerCase() === name.toLowerCase() && m.id !== this.editingModuleId
        );

        if (duplicate) {
            UIManager.showMessage(t('module.nameDuplicate'), t('common.error'));
            return;
        }

        // Build reflection profile
        const reflectionProfile = {};
        [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(angle => {
            const input = document.getElementById(`reflection${angle}`);
            if (input) {
                reflectionProfile[angle] = parseFloat(input.value);
            }
        });

        if (this.editingModuleId) {
            // Update existing module type
            StateManager.updateModuleType(this.editingModuleId, {
                name,
                beamSpread,
                reflectionProfile
            });
            UIManager.showNotification(t('module.updated'), 'success');
        } else {
            // Create new module type
            StateManager.addModuleType({
                name,
                beamSpread,
                reflectionProfile
            });
            UIManager.showNotification(t('module.created'), 'success');
        }

        // Close form modal
        const formModal = bootstrap.Modal.getInstance(document.getElementById('moduleTypeFormModal'));
        if (formModal) {
            formModal.hide();
        }

        // Show the list modal again after a short delay
        setTimeout(() => {
            const listModal = new bootstrap.Modal(document.getElementById('moduleTypeModal'));
            listModal.show();
            this.updateList();
        }, 300);

        // Update all PV area displays
        window.PVListRenderer?.render();
    },

    /**
     * Delete a module type
     */
    delete(moduleId) {
        const moduleTypes = StateManager.getAllModuleTypes();
        const module = moduleTypes.find(m => m.id === moduleId);
        if (!module) return;

        // Store the module ID for deletion
        this.deletingModuleId = moduleId;

        // Check if module type is in use
        const usageCount = this.countUsage(moduleId);
        const isInUse = usageCount > 0;

        // Update modal content
        const message = document.getElementById('moduleTypeDeleteMessage');
        const warning = document.getElementById('moduleTypeInUseWarning');
        const confirmBtn = document.getElementById('confirmDeleteModuleType');

        if (isInUse) {
            message.innerHTML = t('module.deleteInUse', {
                name: module.name,
                count: usageCount,
                plural: usageCount > 1 ? t('module.areas') : t('module.area')
            });
            warning.classList.remove('d-none');
            confirmBtn.disabled = true;
        } else {
            message.innerHTML = t('module.deleteConfirm', { name: module.name });
            warning.classList.add('d-none');
            confirmBtn.disabled = false;
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('moduleTypeDeleteModal'));
        modal.show();
    },

    /**
     * Confirm deletion of module type
     */
    confirmDelete() {
        if (this.deletingModuleId) {
            StateManager.deleteModuleType(this.deletingModuleId);
            this.updateList();

            // Update all PV area displays
            window.PVListRenderer?.render();

            UIManager.showNotification(t('module.deleted'), 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('moduleTypeDeleteModal'));
            if (modal) {
                modal.hide();
            }

            this.deletingModuleId = null;
        }
    }
};

// Make ModuleTypeManager globally available
window.ModuleTypeManager = ModuleTypeManager;

export default ModuleTypeManager;
