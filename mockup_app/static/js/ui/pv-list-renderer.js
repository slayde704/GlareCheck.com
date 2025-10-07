/**
 * PV List Renderer Module
 * Renders and manages the PV areas list in the UI
 */

import { StateManager } from '../core/state-manager.js';
import { UIManager } from './ui-manager.js';
import { MapManager } from '../core/map-manager.js';
import { Dimensions } from '../pv-areas/dimensions.js';
import { KMLExporter } from '../utils/kml-exporter.js';

export const PVListRenderer = {
    // Container element ID
    containerId: 'pv-list',
    
    /**
     * Initialize the renderer and set up listeners
     */
    initialize() {
        // Subscribe to state changes
        StateManager.subscribe((type, data) => {
            if (type === 'pv-area-added') {
                // Store the new PV ID to expand it in render
                this.newPvToExpand = data.id;
                // Render with the new PV expanded (others maintain their state)
                this.render();
                // Clear the flag after a short delay
                setTimeout(() => {
                    this.newPvToExpand = null;
                }, 100);
            } else if (type.startsWith('pv-area-') || type === 'pv-areas-reordered') {
                this.render();
            }
        });
        
        // Initial render
        this.render();
    },
    
    /**
     * Get display name for a PV area
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
     * Render the complete PV areas list
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const pvAreas = StateManager.getAllPVAreas();
        
        if (pvAreas.length === 0) {
            container.innerHTML = '<p class="text-muted small">Keine PV-Flächen vorhanden</p>';
            return;
        }
        
        container.innerHTML = pvAreas.map((pv, index) => this.renderPVItem(pv, index)).join('');
        
        // Set up event handlers
        this.setupEventHandlers();
    },
    
    /**
     * Render a single PV area item
     */
    renderPVItem(pv, index) {
        const pvNumber = index + 1;
        const typeLabels = {
            'roof-parallel': 'Dachparallel',
            'roof-mounted': 'Aufgeständert (Dach)',
            'tilted': 'Aufgeständert',
            'facade': 'Fassade / Vertikale PV',
            'field': 'Freiflächenanlage',
            'ground': 'Freifläche'
        };
        
        const displayType = typeLabels[pv.type] || pv.type;
        // Check if this should be expanded
        // If we have a new PV, only expand that one
        let isExpanded;
        if (this.newPvToExpand) {
            isExpanded = this.newPvToExpand === pv.id;
        } else {
            // Otherwise maintain current state
            const existingDetails = document.getElementById(`details-${pv.id}`);
            isExpanded = existingDetails && existingDetails.classList.contains('expanded');
        }
        const isLocked = pv.locked || false;
        
        return `
            <div class="pv-area-item" 
                 id="pv-item-${pv.id}"
                 data-pv-id="${pv.id}"
                 ondragover="PVListRenderer.handleDragOver(event)"
                 ondrop="PVListRenderer.handleDrop(event, '${pv.id}')"
                 ondragenter="PVListRenderer.handleDragEnter(event)"
                 ondragleave="PVListRenderer.handleDragLeave(event)">
                <div class="element-item d-flex align-items-center" style="cursor: pointer;" onclick="PVListRenderer.toggleDetails('${pv.id}')">
                    <i class="fas fa-grip-vertical text-muted me-2" style="cursor: grab;" 
                       draggable="true" 
                       ondragstart="PVListRenderer.handleDragStart(event, '${pv.id}')" 
                       ondragend="PVListRenderer.handleDragEnd(event)"
                       onclick="event.stopPropagation()"></i>
                    <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}" id="chevron-${pv.id}" class="me-2" style="width: 20px;"></i>
                    <span class="flex-grow-1">PV${pvNumber}${pv.name ? `: ${pv.name}` : ''}</span>
                    <button class="btn btn-link btn-sm p-0 text-danger" onclick="event.stopPropagation(); PVListRenderer.deletePVArea('${pv.id}')" title="Löschen">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                
                <div class="pv-details ${isExpanded ? 'expanded' : ''}" id="details-${pv.id}">
                    <div class="small">
                        ${this.renderPVDetails(pv, displayType)}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Render PV area details
     */
    renderPVDetails(pv, displayType) {
        return `
            <div class="d-flex gap-1 mb-2 pb-2 border-bottom">
                <button class="btn btn-sm btn-outline-secondary flex-fill" style="padding: 0.2rem;"
                        onclick="PVListRenderer.focusPVArea('${pv.id}')" title="Auf Karte zeigen">
                    <i class="fas fa-crosshairs"></i>
                </button>
                <button class="btn btn-sm ${pv.locked ? 'btn-warning' : 'btn-outline-secondary'} flex-fill" style="padding: 0.2rem;"
                        onclick="PVListRenderer.toggleLock('${pv.id}')" title="${pv.locked ? 'Entsperren' : 'Sperren'}">
                    <i class="fas fa-${pv.locked ? 'lock' : 'unlock'}"></i>
                </button>
                <button class="btn btn-sm ${pv.showDimensions ? 'btn-primary' : 'btn-outline-secondary'} flex-fill" style="padding: 0.2rem;"
                        onclick="PVListRenderer.toggleDimensions('${pv.id}')" title="Bemaßen">
                    <i class="fas fa-ruler-combined"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary flex-fill" style="padding: 0.2rem;"
                        onclick="PVListRenderer.openCornerDetails('${pv.id}')" 
                        title="${pv.type === 'roof-mounted' ? 'Dachhöhen eingeben' : 'Eckpunkte Details'}">
                    <i class="bi bi-geo-alt"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary flex-fill" style="padding: 0.2rem;"
                        onclick="PVListRenderer.exportPVArea('${pv.id}')" title="KML Exportieren">
                    <i class="fas fa-download"></i>
                </button>
            </div>
            
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">Typ</label>
                <input type="text" class="form-control form-control-sm" value="${displayType}" 
                       style="background-color: #f8f9fa;"
                       disabled>
            </div>
            
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Bezeichnung
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                       data-bs-toggle="tooltip" data-bs-placement="top"
                       title="Optionale Bezeichnung: Geben Sie der PV-Fläche einen Namen zur besseren Identifizierung. Z.B.: 'Süddach Haus A' oder 'Nordfläche Scheune'"></i>
                </label>
                <input type="text" class="form-control form-control-sm" 
                       value="${pv.name || ''}" 
                       placeholder="${pv.type === 'facade' ? 'z.B. Südfassade Gebäude 1' : 'z.B. Süddach Haus A'}"
                       onchange="PVListRenderer.updatePVName('${pv.id}', this.value)">
            </div>
            
            ${pv.type === 'roof-mounted' ? `
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    ${pv.eastWest ? 'Azimut 1' : 'Azimut'} (°)
                    <i class="bi bi-info-circle text-primary ms-1" 
                       style="cursor: help; font-size: 0.75rem;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       data-bs-html="true"
                       title="Der Azimut definiert die Ausrichtung der PV-Module.<br><br>360° Referenzsystem:<br>0° = Norden<br>90° = Osten<br>180° = Süden<br>270° = Westen">
                    </i>
                </label>
                <div style="display: flex; align-items: center;">
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.azimuth || 180}" 
                           min="0" max="360" step="1"
                           style="max-width: 80px;"
                           id="azimuth-${pv.id}"
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'azimuth', this.value)">
                    <span style="margin-left: 10px;">
                        <input type="checkbox" 
                               id="east-west-${pv.id}"
                               ${pv.eastWest ? 'checked' : ''}
                               style="margin-right: 3px; vertical-align: middle;"
                               onchange="PVListRenderer.toggleEastWest('${pv.id}', this.checked)">
                        <label for="east-west-${pv.id}" style="font-size: 0.875rem; vertical-align: middle; cursor: pointer;">
                            Ost-West
                        </label>
                    </span>
                </div>
            </div>
            ${pv.eastWest ? `
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Azimut 2 (°)
                    <i class="bi bi-info-circle text-primary ms-1" 
                       style="cursor: help; font-size: 0.75rem;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       data-bs-html="true"
                       title="Zweite Ausrichtung für Ost-West System. Automatisch 180° versetzt zur ersten Ausrichtung.">
                    </i>
                </label>
                <input type="number" class="form-control form-control-sm" 
                       value="${((pv.azimuth || 180) + 180) % 360}" 
                       min="0" max="360" step="1"
                       style="max-width: 80px;"
                       disabled>
            </div>
            ` : ''}
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Neigung (°)
                    <i class="bi bi-info-circle text-primary ms-1" 
                       style="cursor: help; font-size: 0.75rem;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       data-bs-html="true"
                       title="Die Neigung beschreibt den Winkel der PV-Module gegenüber der Horizontalen.<br><br>0° = horizontal (flach)<br>90° = vertikal (senkrecht)">
                    </i>
                </label>
                <input type="number" class="form-control form-control-sm" 
                       value="${pv.tilt || 30}"
                       min="0" max="90" step="1"
                       style="max-width: 80px;"
                       onchange="PVListRenderer.updatePVParameter('${pv.id}', 'tilt', this.value)">
            </div>
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Querneigung (°) <small id="cross-tilt-direction-${pv.id}" class="text-muted" style="font-size: 0.65rem;">${this.getCrossTiltDirection(pv.azimuth || 180)}</small>
                    <i class="bi bi-info-circle text-primary ms-1" 
                       style="cursor: help; font-size: 0.75rem;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       data-bs-html="true"
                       title="Die Querneigung beschreibt die Neigung entlang der Tischachse (orthogonal zum Azimut).<br><br>Dies beeinflusst die effektive Ausrichtung der PV-Module.<br><br><strong>Hinweis:</strong> Wenn eine Fläche unterschiedliche Querneigungen aufweist, sollte diese durch entsprechende Einzelflächen dargestellt werden.">
                    </i>
                </label>
                <input type="number" class="form-control form-control-sm" 
                       value="${pv.crossTilt || 0}"
                       min="-45" max="45" step="0.1"
                       style="max-width: 80px;"
                       onchange="PVListRenderer.updatePVParameter('${pv.id}', 'crossTilt', this.value)">
                ${Math.abs(pv.crossTilt || 0) > 0.01 ? `
                <div class="text-muted small mt-1">
                    <strong>Effektiver Azimut:</strong> ${this.calculateEffectiveAzimuth(pv.azimuth || 180, pv.tilt || 30, pv.crossTilt || 0)}°
                </div>
                ` : ''}
            </div>
            <div class="border rounded p-2 mb-3 mt-3" style="background-color: rgba(76, 175, 80, 0.05);">
                <div class="mb-2">
                    <label class="form-label mb-1" style="font-size: 0.75rem; font-weight: 600;">
                        <i class="bi bi-arrows-expand text-success me-1"></i>
                        Höhe Module über Dachfläche (m)
                        <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                           data-bs-toggle="tooltip" data-bs-placement="top"
                           title="Höhe der aufgeständerten Module über der Dachfläche. Bei aufgeständerten Systemen befinden sich die Module in einem bestimmten Abstand über dem Dach."></i>
                    </label>
                </div>
                <div class="row g-2">
                    <div class="col-6">
                        <label class="form-label mb-1" style="font-size: 0.7rem;">Unterkante</label>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   value="${pv.moduleHeightBottom || 0.2}" 
                                   min="0" max="10" step="0.01"
                                   id="module-height-bottom-${pv.id}"
                                   onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleHeightBottom', this.value)">
                            <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <label class="form-label mb-1" style="font-size: 0.7rem;">Oberkante</label>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   value="${pv.moduleHeightTop || 1.2}" 
                                   min="0" max="10" step="0.01"
                                   id="module-height-top-${pv.id}"
                                   onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleHeightTop', this.value)">
                            <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mb-2">
                <button class="btn btn-outline-primary btn-sm w-100" 
                        onclick="PVListRenderer.openCornerHeightsDialog('${pv.id}')"
                        style="font-size: 0.875rem;">
                    <i class="fas fa-sort-amount-up me-2"></i>
                    Dachhöhen eingeben
                </button>
            </div>
            ` : pv.type === 'facade' ? `
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Azimut (°)
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                       data-bs-toggle="tooltip" data-bs-placement="top"
                       title="Ausrichtung der reflektierenden Seite (orange markiert). Auto-Calculate berechnet den Azimut basierend auf der Linienrichtung."></i>
                </label>
                <div class="d-flex align-items-center gap-1">
                    <input type="number" class="form-control form-control-sm" 
                           value="${Math.round(pv.azimuth || 180)}" 
                           min="0" max="360" step="1"
                           id="azimuth-${pv.id}"
                           style="max-width: 80px;"
                           ${pv.autoCalculateAzimuth !== false ? 'disabled' : ''}
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'azimuth', this.value)">
                    <input class="form-check-input" type="checkbox" 
                           id="auto-calc-azimuth-${pv.id}" 
                           ${pv.autoCalculateAzimuth !== false ? 'checked' : ''}
                           onchange="PVListRenderer.toggleAutoCalculateAzimuth('${pv.id}', this.checked)">
                    <label class="form-check-label small" for="auto-calc-azimuth-${pv.id}" style="white-space: nowrap;">
                        Auto-Calculate
                    </label>
                </div>
            </div>
            <div class="text-muted" style="font-size: 0.65rem; margin-top: -0.5rem; margin-bottom: 0.75rem;">
                <i class="bi bi-info-circle me-1"></i>
                Die <span style="color: #FF8C00; font-weight: bold;">orange Seite</span> zeigt die reflektierende Seite
            </div>
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Neigung (°)
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                       data-bs-toggle="tooltip" data-bs-placement="top"
                       title="Neigungswinkel zur Horizontalen. 0° = horizontal (flach liegend), 90° = vertikal (senkrecht stehend). Bei Fassaden bedeuten Werte unter 90°, dass die Fläche nach außen geneigt ist."></i>
                </label>
                <input type="number" class="form-control form-control-sm" 
                       value="${pv.tilt !== undefined ? pv.tilt : 90}" 
                       min="0" max="90" step="1"
                       style="max-width: 80px;"
                       onchange="PVListRenderer.updatePVParameter('${pv.id}', 'tilt', Math.min(90, Math.max(0, this.value)))">
            </div>
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Referenzhöhe / Geländeoberkante (m)
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       title="Referenzhöhe über NN: Höhe des Geländes über dem Meeresspiegel. Auto-Calculate ermittelt die Höhe über Google Elevation API.">
                    </i>
                </label>
                <div class="d-flex align-items-center gap-1">
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.referenceHeight || 0}"
                           min="-100" max="5000" step="0.01" 
                           id="reference-height-${pv.id}"
                           style="max-width: 80px;"
                           ${pv.autoCalculateReferenceHeight !== false ? 'disabled' : ''}
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'referenceHeight', this.value)">
                    <input class="form-check-input" type="checkbox" 
                           id="auto-calc-ref-${pv.id}" 
                           ${pv.autoCalculateReferenceHeight !== false ? 'checked' : ''}
                           onchange="PVListRenderer.toggleAutoCalculateReference('${pv.id}', this.checked)">
                    <label class="form-check-label small" for="auto-calc-ref-${pv.id}" style="white-space: nowrap;">
                        Auto-Calculate
                    </label>
                </div>
            </div>
            <div class="border rounded p-2 mb-3 mt-3" style="background-color: rgba(255, 140, 0, 0.05);">
                <div class="mb-2">
                    <label class="form-label mb-1" style="font-size: 0.75rem; font-weight: 600;">
                        <i class="bi bi-arrows-expand text-warning me-1"></i>
                        Höhe über Referenzhöhe (m)
                        <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                           data-bs-toggle="tooltip" data-bs-placement="top"
                           title="Höhe der PV-Fläche über der Referenzhöhe (Geländeoberkante). Die tatsächliche Höhe über NN ergibt sich aus Referenzhöhe + diesen Werten."></i>
                    </label>
                </div>
                <div class="row g-2">
                    <div class="col-6">
                        <label class="form-label mb-1" style="font-size: 0.7rem;">
                            <i class="bi bi-arrow-down-short"></i> Unterkante
                        </label>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   value="${pv.moduleHeightBottom || 0}" 
                                   min="0" max="20" step="0.1"
                                   onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleHeightBottom', this.value)">
                            <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <label class="form-label mb-1" style="font-size: 0.7rem;">
                            <i class="bi bi-arrow-up-short"></i> Oberkante
                        </label>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   value="${pv.moduleHeightTop || 3.0}" 
                                   min="0" max="20" step="0.1"
                                   onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleHeightTop', this.value)">
                            <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                        </div>
                    </div>
                </div>
            </div>
            ` : pv.type === 'field' ? `
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    ${pv.eastWest ? 'Azimut 1' : 'Azimut'} (°)
                    <i class="bi bi-info-circle text-primary ms-1" 
                       style="cursor: help; font-size: 0.75rem;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       data-bs-html="true"
                       title="Der Azimut definiert die Ausrichtung der PV-Module.<br><br>360° Referenzsystem:<br>0° = Norden<br>90° = Osten<br>180° = Süden<br>270° = Westen">
                    </i>
                </label>
                <div style="display: flex; align-items: center;">
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.azimuth || 180}" 
                           min="0" max="360" step="1"
                           style="max-width: 80px;"
                           id="azimuth-${pv.id}"
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'azimuth', this.value)">
                    <span style="margin-left: 10px;">
                        <input type="checkbox" 
                               id="east-west-${pv.id}"
                               ${pv.eastWest ? 'checked' : ''}
                               style="margin-right: 3px; vertical-align: middle;"
                               onchange="PVListRenderer.toggleEastWest('${pv.id}', this.checked)">
                        <label for="east-west-${pv.id}" style="font-size: 0.875rem; vertical-align: middle; cursor: pointer;">
                            Ost-West
                        </label>
                    </span>
                </div>
            </div>
            ${pv.eastWest ? `
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Azimut 2 (°)
                </label>
                <input type="number" class="form-control form-control-sm" 
                       value="${((pv.azimuth || 180) + 180) % 360}" 
                       min="0" max="360" step="1"
                       style="max-width: 80px;"
                       disabled>
            </div>
            ` : ''}
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Neigung (°)
                    <i class="bi bi-info-circle text-primary ms-1" 
                       style="cursor: help; font-size: 0.75rem;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       data-bs-html="true"
                       title="Die Neigung beschreibt den Winkel der PV-Module gegenüber der Horizontalen.<br><br>0° = horizontal (flach)<br>90° = vertikal (senkrecht)">
                    </i>
                </label>
                <input type="number" class="form-control form-control-sm" 
                       value="${pv.tilt || 30}"
                       min="0" max="90" step="1"
                       style="max-width: 80px;"
                       onchange="PVListRenderer.updatePVParameter('${pv.id}', 'tilt', this.value)">
            </div>
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Referenzhöhe / Geländeoberkante (m)
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       title="Referenzhöhe über NN: Höhe des Geländes über dem Meeresspiegel. Auto-Calculate ermittelt die Höhe über Google Elevation API.">
                    </i>
                </label>
                <div class="d-flex align-items-center gap-1">
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.referenceHeight || 0}"
                           min="-100" max="5000" step="0.01" 
                           id="reference-height-${pv.id}"
                           style="max-width: 80px;"
                           ${pv.autoCalculateReferenceHeight !== false ? 'disabled' : ''}
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'referenceHeight', this.value)">
                    <input class="form-check-input" type="checkbox" 
                           id="auto-calc-ref-${pv.id}" 
                           ${pv.autoCalculateReferenceHeight !== false ? 'checked' : ''}
                           onchange="PVListRenderer.toggleAutoCalculateReference('${pv.id}', this.checked)">
                    <label class="form-check-label small" for="auto-calc-ref-${pv.id}" style="white-space: nowrap;">
                        Auto-Calculate
                    </label>
                </div>
            </div>
            <div class="border rounded p-2 mb-3 mt-3" style="background-color: rgba(76, 175, 80, 0.05);">
                <div class="mb-2">
                    <label class="form-label mb-1" style="font-size: 0.75rem; font-weight: 600;">
                        <i class="bi bi-arrows-expand text-success me-1"></i>
                        Höhe Module über Gelände (m)
                        <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                           data-bs-toggle="tooltip" data-bs-placement="top"
                           title="Höhe der aufgeständerten Module über dem Gelände. Bei Freiflächenanlagen befinden sich die Module in einem bestimmten Abstand über dem Boden."></i>
                    </label>
                </div>
                <div class="row g-2">
                    <div class="col-6">
                        <label class="form-label mb-1" style="font-size: 0.7rem;">Unterkante</label>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   value="${pv.moduleHeightBottom || 0.8}" 
                                   min="0" max="10" step="0.1"
                                   onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleHeightBottom', this.value)">
                            <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <label class="form-label mb-1" style="font-size: 0.7rem;">Oberkante</label>
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   value="${pv.moduleHeightTop || 2.5}" 
                                   min="0" max="10" step="0.1"
                                   onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleHeightTop', this.value)">
                            <span class="input-group-text" style="font-size: 0.75rem;">m</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mb-2">
                ${this.getTopographyStatus(pv)}
                <button class="btn ${this.getTopographyButtonClass(pv)} btn-sm w-100"
                        onclick="PVListRenderer.openTerrainHeightManager('${pv.id}')"
                        style="font-size: 0.875rem;">
                    ${this.getTopographyButtonContent(pv)}
                </button>
            </div>
            ` : pv.type !== 'roof-parallel' ? `
            <div class="row g-1 mb-2">
                <div class="col-6">
                    <label class="form-label mb-1" style="font-size: 0.75rem;">
                        Azimut (°)
                        <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                           data-bs-toggle="tooltip" data-bs-placement="top"
                           title="Modul-Ausrichtung (Azimut): Die Himmelsrichtung, in die die PV-Module blicken. 0°/360°=Nord, 90°=Ost, 180°=Süd, 270°=West"></i>
                    </label>
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.azimuth || 180}" 
                           min="0" max="360" step="0.1"
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'azimuth', this.value)">
                </div>
                <div class="col-6">
                    <label class="form-label mb-1" style="font-size: 0.75rem;">
                        Neigung (°)
                        <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;"
                           data-bs-toggle="tooltip" data-bs-placement="top"
                           title="Neigungswinkel der PV-Module: 0°=horizontal, 30-35°=typisch für Schrägdächer, 90°=vertikal (Fassade)"></i>
                    </label>
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.tilt || 0}" 
                           min="0" max="90" step="0.1"
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'tilt', this.value)">
                </div>
            </div>
            ` : `
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Azimut (°)
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       title="Modul-Ausrichtung (Azimut): Die Himmelsrichtung, in die die PV-Module blicken. Bei dachparallelen Flächen ist dies senkrecht zur Firstrichtung. 0°=Nord, 90°=Ost, 180°=Süd, 270°=West. Auto-Calculate berechnet dies aus der gezeichneten Oberkante.">
                    </i>
                </label>
                <div class="d-flex align-items-center gap-1">
                    <input type="number" class="form-control form-control-sm" value="${pv.azimuth || 180}" 
                           min="0" max="360" step="1" id="azimuth-${pv.id}"
                           style="max-width: 80px;"
                           ${pv.autoCalculateAzimuth !== false ? 'disabled' : ''}
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'azimuth', this.value)">
                    <input class="form-check-input" type="checkbox" 
                           id="auto-calc-azimuth-${pv.id}"
                           ${pv.autoCalculateAzimuth !== false ? 'checked' : ''}
                           onchange="PVListRenderer.toggleAutoCalculate('${pv.id}', 'azimuth', this.checked)">
                    <label class="form-check-label small" for="auto-calc-azimuth-${pv.id}" style="white-space: nowrap;">
                        Auto-calculate
                    </label>
                </div>
            </div>
            `}
            
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">Modultyp</label>
                <div class="input-group input-group-sm">
                    <select class="form-select form-select-sm" 
                            onchange="PVListRenderer.updatePVParameter('${pv.id}', 'moduleType', this.value)">
                        ${StateManager.getAllModuleTypes().map(module => 
                            `<option value="${module.id}" ${pv.moduleType === module.id ? 'selected' : ''}>
                                ${module.name}
                            </option>`
                        ).join('')}
                    </select>
                    <button class="btn btn-sm btn-outline-secondary" type="button" 
                            onclick="ModuleTypeManager.open()"
                            title="Modultypen verwalten">
                        <i class="bi bi-gear"></i>
                    </button>
                </div>
            </div>
            
            ${pv.type === 'roof-parallel' ? `
            <div class="mb-2">
                <div class="mb-2">
                    <label class="form-label mb-1" style="font-size: 0.75rem;">
                        Neigung (°)
                        <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;" 
                           data-bs-toggle="tooltip" 
                           data-bs-placement="top"
                           title="Höhenberechnung bei dachparallelen PV-Flächen: Die drei Werte Neigung, Höhe Oberkante und Höhe Unterkante sind mathematisch verknüpft. Mit Auto-Calculate können Sie einen Wert automatisch berechnen lassen."></i>
                    </label>
                    <div class="d-flex align-items-center gap-1">
                        <input type="number" class="form-control form-control-sm" 
                               value="${pv.tilt || 0}"
                               min="0" max="89" step="0.1" 
                               id="tilt-${pv.id}"
                               style="max-width: 80px;"
                               ${pv.autoCalculateField === 'tilt' ? 'disabled' : ''}
                               onchange="PVListRenderer.updatePVParameter('${pv.id}', 'tilt', this.value)">
                        <input class="form-check-input" type="checkbox" 
                               id="auto-calc-tilt-${pv.id}"
                               ${pv.autoCalculateField === 'tilt' ? 'checked' : ''}
                               onchange="PVListRenderer.setAutoCalculateField('${pv.id}', 'tilt', this.checked)">
                        <label class="form-check-label small" for="auto-calc-tilt-${pv.id}" style="white-space: nowrap;">
                            Auto-calculate
                        </label>
                    </div>
                </div>
                
                <div class="mb-2">
                    <label class="form-label mb-1" style="font-size: 0.75rem;">
                        Höhe Oberkante (m) <span style="color: #00CED1; font-weight: bold; font-size: 1.2em;">━━</span>
                        <i class="bi bi-info-circle text-primary ms-1" 
                           style="font-size: 0.75rem; cursor: help;" 
                           data-bs-toggle="tooltip" 
                           data-bs-placement="top"
                               title="Oberkante der PV-Fläche (Türkis): Die höher gelegene Kante der PV-Fläche, typischerweise die Firstseite des Daches. Die türkise Linie auf der Karte markiert diese PV-Flächen-Kante.">
                        </i>
                    </label>
                    <div class="d-flex align-items-center gap-1">
                        <input type="number" class="form-control form-control-sm" 
                               value="${pv.heightTop || ''}"
                               min="0" max="1000" step="0.01" 
                               id="height-top-${pv.id}"
                               style="max-width: 80px;"
                               ${pv.autoCalculateField === 'heightTop' ? 'disabled' : ''}
                               onchange="PVListRenderer.updatePVParameter('${pv.id}', 'heightTop', this.value)">
                        <input class="form-check-input" type="checkbox" 
                               id="auto-calc-height-top-${pv.id}"
                               ${pv.autoCalculateField === 'heightTop' ? 'checked' : ''}
                               onchange="PVListRenderer.setAutoCalculateField('${pv.id}', 'heightTop', this.checked)">
                        <label class="form-check-label small" for="auto-calc-height-top-${pv.id}" style="white-space: nowrap;">
                            Auto-calculate
                        </label>
                    </div>
                </div>
                
                <div class="mb-2">
                    <label class="form-label mb-1" style="font-size: 0.75rem;">
                        Höhe Unterkante (m) <span style="color: #FF8C00; font-weight: bold; font-size: 1.2em;">━━</span>
                        <i class="bi bi-info-circle text-primary ms-1" 
                           style="font-size: 0.75rem; cursor: help;" 
                           data-bs-toggle="tooltip" 
                           data-bs-placement="top"
                               title="Unterkante der PV-Fläche (Orange): Die tiefer gelegene Kante der PV-Fläche, typischerweise die Traufseite des Daches. Die orange Linie auf der Karte markiert diese PV-Flächen-Kante.">
                        </i>
                    </label>
                    <div class="d-flex align-items-center gap-1">
                        <input type="number" class="form-control form-control-sm" 
                               value="${pv.heightBottom || ''}"
                               min="0" max="1000" step="0.01" 
                               id="height-bottom-${pv.id}"
                               style="max-width: 80px;"
                               ${pv.autoCalculateField === 'heightBottom' ? 'disabled' : ''}
                               onchange="PVListRenderer.updatePVParameter('${pv.id}', 'heightBottom', this.value)">
                        <input class="form-check-input" type="checkbox" 
                               id="auto-calc-height-bottom-${pv.id}"
                               ${pv.autoCalculateField === 'heightBottom' ? 'checked' : ''}
                               onchange="PVListRenderer.setAutoCalculateField('${pv.id}', 'heightBottom', this.checked)">
                        <label class="form-check-label small" for="auto-calc-height-bottom-${pv.id}" style="white-space: nowrap;">
                            Auto-calculate
                        </label>
                    </div>
                </div>
                
                <div>
                    <label class="form-label mb-1" style="font-size: 0.75rem;">
                        Distanz Ober- zur Unterkante (m)
                        <i class="bi bi-info-circle text-primary ms-1" 
                           style="font-size: 0.75rem; cursor: help;" 
                           data-bs-toggle="tooltip" 
                           data-bs-placement="top"
                               title="Senkrechte Distanz: Der rechtwinklige Abstand zwischen Ober- und Unterkante der PV-Fläche (horizontale Projektion, nicht die schräge Dachlänge). Wird automatisch aus der Geometrie berechnet.">
                        </i>
                    </label>
                    <input type="text" class="form-control form-control-sm" 
                           value="${pv.perpendicularDistance ? pv.perpendicularDistance.toFixed(1) : '—'}"
                           style="max-width: 80px;"
                           disabled>
                </div>
                
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-secondary w-100" 
                            onclick="PVListRenderer.swapTopBottom('${pv.id}')"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                                 title="PV-Flächen-Kanten vertauschen: Tauscht die Ober- und Unterkante der PV-Fläche, wenn diese bei der Erstellung falsch zugeordnet wurden. Die Höhenwerte werden ebenfalls getauscht.">
                        <i class="fas fa-exchange-alt fa-rotate-90"></i> Ober-/Unterkante tauschen
                    </button>
                </div>
            </div>
            
            <div class="mb-2">
                <label class="form-label mb-1" style="font-size: 0.75rem;">
                    Referenzhöhe / Geländeoberkante (m)
                    <i class="bi bi-info-circle text-primary ms-1" style="font-size: 0.75rem; cursor: help;" 
                       data-bs-toggle="tooltip" 
                       data-bs-placement="top"
                       title="Referenzhöhe über NN: Höhe des Geländes über dem Meeresspiegel. Auto-Calculate ermittelt die Höhe über Google Elevation API. Die Höhen der PV-Flächen-Kanten werden relativ zu dieser Höhe angegeben.">
                    </i>
                </label>
                <div class="d-flex align-items-center gap-1">
                    <input type="number" class="form-control form-control-sm" 
                           value="${pv.referenceHeight || 0}"
                           min="-100" max="5000" step="0.01" 
                           id="reference-height-${pv.id}"
                           style="max-width: 80px;"
                           ${pv.autoCalculateReferenceHeight !== false ? 'disabled' : ''}
                           onchange="PVListRenderer.updatePVParameter('${pv.id}', 'referenceHeight', this.value)">
                    <input class="form-check-input" type="checkbox" 
                           id="auto-calc-ref-${pv.id}" 
                           ${pv.autoCalculateReferenceHeight !== false ? 'checked' : ''}
                           onchange="PVListRenderer.toggleAutoCalculateReference('${pv.id}', this.checked)">
                    <label class="form-check-label small" for="auto-calc-ref-${pv.id}" style="white-space: nowrap;">
                        Auto-calculate
                    </label>
                </div>
            </div>
            
            ` : ''}
        `;
    },
    
    /**
     * Focus on PV area on map
     */
    focusPVArea(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (pv && pv.corners && pv.corners.length > 0) {
            // Calculate center of PV area
            let sumLat = 0;
            let sumLng = 0;
            pv.corners.forEach(corner => {
                sumLat += corner.lat;
                sumLng += corner.lng;
            });
            const centerLat = sumLat / pv.corners.length;
            const centerLng = sumLng / pv.corners.length;
            
            // Pan to center without changing zoom
            const map = window.MapManager ? window.MapManager.getMap() : window.map;
            if (map) {
                map.panTo(new google.maps.LatLng(centerLat, centerLng));
            }
            
            // Highlight the polygon briefly
            if (pv.polygon) {
                pv.polygon.setOptions({
                    fillOpacity: 0.7,
                    strokeWeight: 4
                });
                
                setTimeout(() => {
                    pv.polygon.setOptions({
                        fillOpacity: 0.35,
                        strokeWeight: 2
                    });
                }, 500);
            }
        }
    },
    
    /**
     * Delete PV area
     */
    toggleDetails(pvId) {
        // Clear the auto-expand flag when user manually toggles
        this.newPvToExpand = null;
        
        const details = document.getElementById(`details-${pvId}`);
        const chevron = document.getElementById(`chevron-${pvId}`);
        
        if (details && chevron) {
            if (details.classList.contains('expanded')) {
                // Collapse
                details.classList.remove('expanded');
                chevron.classList.remove('fa-chevron-down');
                chevron.classList.add('fa-chevron-right');
            } else {
                // Just expand this one without collapsing others
                details.classList.add('expanded');
                chevron.classList.remove('fa-chevron-right');
                chevron.classList.add('fa-chevron-down');
                
                // Initialize tooltips for the newly expanded section
                setTimeout(() => {
                    const tooltips = details.querySelectorAll('[data-bs-toggle="tooltip"]');
                    tooltips.forEach(tooltipTriggerEl => {
                        // Check if tooltip already exists
                        const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                        if (!existingTooltip) {
                            new bootstrap.Tooltip(tooltipTriggerEl, {
                                delay: { show: 200, hide: 0 },
                                placement: 'auto',
                                html: true
                            });
                        }
                    });
                }, 50);
            }
        }
    },
    
    /**
     * Collapse all PV areas except the specified one
     */
    collapseAllExcept(exceptPvId) {
        const allPvAreas = StateManager.getAllPVAreas();
        allPvAreas.forEach(pv => {
            if (pv.id !== exceptPvId) {
                const details = document.getElementById(`details-${pv.id}`);
                const chevron = document.getElementById(`chevron-${pv.id}`);
                if (details && chevron) {
                    details.classList.remove('expanded');
                    chevron.classList.remove('fa-chevron-down');
                    chevron.classList.add('fa-chevron-right');
                }
            }
        });
    },
    
    /**
     * Expand a specific PV area
     */
    expandPVArea(pvId) {
        const details = document.getElementById(`details-${pvId}`);
        const chevron = document.getElementById(`chevron-${pvId}`);
        if (details && chevron) {
            details.classList.add('expanded');
            chevron.classList.remove('fa-chevron-right');
            chevron.classList.add('fa-chevron-down');
        }
    },
    
    deletePVArea(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;
        
        // Store the PV ID for deletion
        this.deletingPVId = pvId;
        
        // Get display name using helper function
        const displayName = this.getDisplayName(pv);
        
        // Update modal content
        const message = document.getElementById('pvAreaDeleteMessage');
        message.innerHTML = `Möchten Sie die PV-Fläche "<strong>${displayName}</strong>" wirklich löschen?`;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('pvAreaDeleteModal'));
        modal.show();
    },
    
    async confirmDelete() {
        const pvId = this.deletingPVId;
        if (!pvId) return;
        const pv = StateManager.getPVArea(pvId);
        // Deleting PV area
        
        // Always try to use PolygonEnhancer for roof-parallel areas
        if (pv && (pv.enhancedElements || pv.edgeLines || pv.type === 'roof-parallel')) {
            // Removing enhancements
            
            // Import and use PolygonEnhancer to properly clean up all elements
            try {
                const module = await import('../pv-areas/polygon-enhancer.js');
                const PolygonEnhancer = module.default;
                PolygonEnhancer.removeEnhancements(pv);
                // Successfully removed enhancements
            } catch (error) {
                console.error('Error removing enhancements:', error);
            }
        }
        
        StateManager.deletePVArea(pvId);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('pvAreaDeleteModal'));
        if (modal) modal.hide();
        
        // Reset the deleting ID
        this.deletingPVId = null;
    },
    
    /**
     * Get topography status for a PV area
     */
    getTopographyStatus(pv) {
        // Show warning if area changed but Best-Fit is not active
        if (pv.topographyOutdated && pv.topographyMode !== 'plane') {
            return '<div class="text-danger small mb-2" style="font-size: 0.75rem;"><i class="bi bi-exclamation-triangle me-1"></i>Fläche wurde verändert - Topografie prüfen</div>';
        }
        return '';
    },

    /**
     * Get topography button class
     */
    getTopographyButtonClass(pv) {
        console.log('getTopographyButtonClass for', pv.id, 'mode:', pv.topographyMode, 'outdated:', pv.topographyOutdated);

        if (!pv.topographyMode || pv.topographyMode === 'none') {
            console.log('  -> returning btn-warning (no mode)');
            return 'btn-warning';  // Yellow for "needs decision"
        }
        if (pv.topographyOutdated && pv.topographyMode !== 'plane') {
            console.log('  -> returning btn-outline-danger (outdated)');
            return 'btn-outline-danger';
        }
        // All defined topography modes get blue outline
        if (pv.topographyMode === 'plane' || pv.topographyMode === 'grid' ||
            pv.topographyMode === 'manual' || pv.topographyMode === 'both') {
            console.log('  -> returning btn-outline-primary (configured)');
            return 'btn-outline-primary';
        }
        console.log('  -> returning btn-outline-primary (default)');
        return 'btn-outline-primary';
    },

    /**
     * Get topography button content
     */
    getTopographyButtonContent(pv) {
        if (!pv.topographyMode || pv.topographyMode === 'none') {
            return '<i class="bi bi-exclamation-circle me-2"></i>Topografie definieren!';
        }
        if (pv.topographyOutdated && pv.topographyMode !== 'plane') {
            return '<i class="bi bi-arrow-repeat me-2"></i>Topografie prüfen';
        }
        // All properly defined topography modes show "Topografie verwalten"
        return '<i class="bi bi-geo-alt me-2"></i>Topografie verwalten';
    },

    /**
     * Update PV parameters
     */
    updatePVName(pvId, name) {
        StateManager.updatePVArea(pvId, { name });
    },
    
    updatePVParameter(pvId, parameter, value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            StateManager.updatePVArea(pvId, { [parameter]: numValue });
            
            // Trigger auto-calculation if needed
            const pv = StateManager.getPVArea(pvId);
            if (pv && pv.autoCalculateField && (parameter === 'tilt' || parameter === 'heightTop' || parameter === 'heightBottom')) {
                this.calculateAutoField(pv);
            }
            
            // Update display for roof-mounted if relevant parameters changed
            if (pv && pv.type === 'roof-mounted') {
                const updatedPV = StateManager.getPVArea(pvId);
                
                // Update cross-tilt direction if azimuth changed
                if (parameter === 'azimuth') {
                    const directionSpan = document.getElementById(`cross-tilt-direction-${pvId}`);
                    if (directionSpan) {
                        directionSpan.textContent = this.getCrossTiltDirection(updatedPV.azimuth || 180);
                    }
                    
                    // Update second azimuth field if East-West mode is active
                    if (updatedPV.eastWest) {
                        // Force re-render to update the second azimuth field
                        this.render();
                    }
                }
                
                // Update effective azimuth display if crossTilt, azimuth or tilt changed
                if (parameter === 'crossTilt' || parameter === 'azimuth' || parameter === 'tilt') {
                    // Force re-render to update effective values
                    this.render();
                }
            }
        }
    },
    
    /**
     * Duplicate PV area
     */
    duplicatePVArea(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;
        
        const duplicate = {
            ...pv,
            id: undefined,
            name: `${pv.name} (Kopie)`,
            // Offset corners slightly
            corners: pv.corners.map(corner => ({
                lat: corner.lat + 0.0001,
                lng: corner.lng + 0.0001
            }))
        };
        
        StateManager.addPVArea(duplicate);
        UIManager.showMessage('PV-Fläche wurde dupliziert!', 'Erfolg');
    },
    
    /**
     * Toggle dimensions display
     */
    toggleDimensions(pvId) {
        console.log('toggleDimensions called for:', pvId);
        const pv = StateManager.getPVArea(pvId);
        if (pv) {
            const newState = !pv.showDimensions;
            console.log('PV type:', pv.type, 'New dimension state:', newState);
            
            // Update the PV area with the new state
            pv.showDimensions = newState;
            StateManager.updatePVArea(pvId, { showDimensions: newState });
            
            // Update dimension display on map
            if (newState) {
                console.log('Showing dimensions...');
                Dimensions.show(pv);
                
                // Set up live dimension updates for roof-mounted PV areas (facade doesn't need this)
                if (pv.type === 'roof-mounted' && pv.polygon) {
                    console.log('PV is roof-mounted, setting up live updates...');
                    this._setupLiveDimensionUpdates(pv);
                } else if (pv.type === 'facade' && pv.polyline) {
                    // For facades, set up live updates similar to roof-mounted
                    console.log('PV is facade, setting up live updates...');
                    this._setupLiveFacadeUpdates(pv);
                } else {
                    console.log('Not setting up live updates. Type:', pv.type, 'Has polygon:', !!pv.polygon, 'Has polyline:', !!pv.polyline);
                }
            } else {
                console.log('Hiding dimensions...');
                Dimensions.hide(pv);
                
                // Clean up monitoring when dimensions are hidden
                if (pv._monitoringInterval) {
                    clearInterval(pv._monitoringInterval);
                    pv._monitoringInterval = null;
                }
                if (pv._stopMonitoring) {
                    pv._stopMonitoring();
                    pv._stopMonitoring = null;
                }
                // Clean up facade monitoring
                if (pv._facadeMonitoringInterval) {
                    clearInterval(pv._facadeMonitoringInterval);
                    pv._facadeMonitoringInterval = null;
                }
                if (pv._stopFacadeMonitoring) {
                    pv._stopFacadeMonitoring();
                    pv._stopFacadeMonitoring = null;
                }
            }
        } else {
            console.log('PV not found:', pvId);
        }
    },
    
    /**
     * Export PV area to KML
     */
    exportPVArea(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (pv) {
            // Get display name for the PV area
            const allPVs = StateManager.getAllPVAreas();
            const index = allPVs.findIndex(p => p.id === pvId);
            const pvNumber = `PV${index + 1}`;
            
            // Build filename: PV1 or PV1_Bezeichnung if name exists
            let filename = pvNumber;
            if (pv.name && pv.name.trim() !== '') {
                // Replace invalid filename characters
                const safeName = pv.name.trim()
                    .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars with underscore
                    .replace(/\s+/g, '_');           // Replace spaces with underscore
                filename = `${pvNumber}_${safeName}`;
            }
            
            // Pass both the PV area and the desired filename
            KMLExporter.exportPVArea(pv, filename);
        }
    },
    
    /**
     * Toggle auto calculate
     */
    toggleAutoCalculate(pvId, field, checked) {
        const pv = StateManager.getPVArea(pvId);
        if (pv) {
            if (field === 'azimuth') {
                StateManager.updatePVArea(pvId, { autoCalculateAzimuth: checked });
                // TODO: Recalculate azimuth if enabled
            }
        }
    },
    
    /**
     * Set auto-calculate field
     */
    setAutoCalculateField(pvId, field, checked) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;
        
        if (checked) {
            // Clear other auto-calculate fields
            StateManager.updatePVArea(pvId, { autoCalculateField: field });
            
            // Calculate the field value
            this.calculateAutoField(pv);
        } else {
            StateManager.updatePVArea(pvId, { autoCalculateField: null });
        }
    },
    
    /**
     * Calculate auto field based on other values
     */
    calculateAutoField(pv) {
        if (!pv.autoCalculateField || !pv.perpendicularDistance) return;
        
        const distance = pv.perpendicularDistance;
        
        switch(pv.autoCalculateField) {
            case 'tilt':
                if (pv.heightTop !== null && pv.heightBottom !== null) {
                    const heightDiff = pv.heightTop - pv.heightBottom;
                    const tiltRad = Math.atan(heightDiff / distance);
                    const tiltDeg = tiltRad * 180 / Math.PI;
                    StateManager.updatePVArea(pv.id, { tilt: Math.round(tiltDeg * 10) / 10 });
                }
                break;
                
            case 'heightTop':
                if (pv.tilt !== null && pv.heightBottom !== null) {
                    const tiltRad = pv.tilt * Math.PI / 180;
                    const heightDiff = distance * Math.tan(tiltRad);
                    const heightTop = Math.round((pv.heightBottom + heightDiff) * 100) / 100;
                    StateManager.updatePVArea(pv.id, { heightTop: heightTop });
                }
                break;
                
            case 'heightBottom':
                if (pv.tilt !== null && pv.heightTop !== null) {
                    const tiltRad = pv.tilt * Math.PI / 180;
                    const heightDiff = distance * Math.tan(tiltRad);
                    const heightBottom = Math.round((pv.heightTop - heightDiff) * 100) / 100;
                    StateManager.updatePVArea(pv.id, { heightBottom: heightBottom });
                }
                break;
        }
    },
    
    /**
     * Toggle auto-calculate reference height
     */
    toggleAutoCalculateReference(pvId, checked) {
        StateManager.updatePVArea(pvId, { autoCalculateReferenceHeight: checked });
        
        if (checked) {
            this.calculateReferenceHeight(pvId);
        }
    },
    
    /**
     * Toggle auto-calculate azimuth for facade
     */
    toggleAutoCalculateAzimuth(pvId, checked) {
        StateManager.updatePVArea(pvId, { autoCalculateAzimuth: checked });
        
        const azimuthInput = document.getElementById(`azimuth-${pvId}`);
        if (azimuthInput) {
            azimuthInput.disabled = checked;
        }
        
        if (checked) {
            this.calculateFacadeAzimuth(pvId);
        }
    },
    
    /**
     * Calculate azimuth from facade line
     */
    calculateFacadeAzimuth(pvId) {
        const pvArea = StateManager.getPVArea(pvId);
        if (!pvArea || !pvArea.polyline) {
            return;
        }
        
        const path = pvArea.polyline.getPath();
        if (path.getLength() === 2) {
            const p0 = path.getAt(0);
            const p1 = path.getAt(1);
            
            // Calculate heading and convert to azimuth (perpendicular to line)
            const heading = google.maps.geometry.spherical.computeHeading(p0, p1);
            let azimuth = (heading + 90) % 360; // Right side is reflective
            if (azimuth < 0) azimuth += 360;
            azimuth = Math.round(azimuth);
            
            // Update state and UI
            StateManager.updatePVArea(pvId, { azimuth: azimuth });
            
            const azimuthInput = document.getElementById(`azimuth-${pvId}`);
            if (azimuthInput) {
                azimuthInput.value = azimuth;
            }
        }
    },
    
    /**
     * Calculate reference height using Google Elevation API
     */
    async calculateReferenceHeight(pvId) {
        const pvArea = StateManager.getPVArea(pvId);
        if (!pvArea) {
            return;
        }
        
        const locations = [];
        
        // Handle both polygon and polyline (facade)
        if (pvArea.polygon) {
            const path = pvArea.polygon.getPath();
            // Get all corner points
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                locations.push({
                    lat: point.lat(),
                    lng: point.lng()
                });
            }
        } else if (pvArea.polyline) {
            const path = pvArea.polyline.getPath();
            // Get all points (facade has 2 points)
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                locations.push({
                    lat: point.lat(),
                    lng: point.lng()
                });
            }
        } else {
            return;
        }
        
        // Create Elevation Service
        const elevator = new google.maps.ElevationService();
        
        try {
            const response = await elevator.getElevationForLocations({
                locations: locations
            });
            
            if (response.results && response.results.length > 0) {
                // Calculate average elevation
                let totalElevation = 0;
                response.results.forEach(result => {
                    totalElevation += result.elevation;
                });
                
                const averageElevation = totalElevation / response.results.length;
                const roundedElevation = Math.round(averageElevation * 100) / 100; // Round to 0.01m
                
                
                // Update state
                StateManager.updatePVArea(pvId, { referenceHeight: roundedElevation });
                
                // Update UI
                const referenceInput = document.getElementById(`reference-height-${pvId}`);
                if (referenceInput) {
                    referenceInput.value = roundedElevation;
                } else {
                    // Retry after a delay if element not found
                    setTimeout(() => {
                        const retryInput = document.getElementById(`reference-height-${pvId}`);
                        if (retryInput) {
                            retryInput.value = roundedElevation;
                        }
                    }, 1000);
                }
                
                // Recalculate heights if auto-calculate is enabled
                const updatedPV = StateManager.getPVArea(pvId);
                if (updatedPV.autoCalculateField) {
                    this.calculateAutoField(updatedPV);
                }
            }
        } catch (error) {
            console.error('Error fetching elevation data:', error);
            UIManager.showMessage('Fehler beim Abrufen der Höhendaten. Bitte manuell eingeben.', 'Fehler');
        }
    },
    
    /**
     * Swap top and bottom
     */
    async swapTopBottom(pvId) {
        // Hide all tooltips before executing the function
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(element => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(element);
            if (tooltipInstance) {
                tooltipInstance.hide();
            }
        });
        
        const pv = StateManager.getPVArea(pvId);
        if (!pv || pv.type !== 'roof-parallel') return;
        
        // Swapping top and bottom edges
        
        // Swap heights
        const tempHeight = pv.heightTop;
        StateManager.updatePVArea(pvId, { 
            heightTop: pv.heightBottom,
            heightBottom: tempHeight 
        });
        
        // Swap polygon points
        if (pv.polygon) {
            const path = pv.polygon.getPath();
            const points = [];
            for (let i = 0; i < path.getLength(); i++) {
                points.push(path.getAt(i));
            }
            
            // Swap points: P1<->P3, P2<->P4
            if (points.length === 4) {
                const newPath = [points[2], points[3], points[0], points[1]];
                path.clear();
                newPath.forEach(p => path.push(p));
                
                // Update stored corners
                const corners = newPath.map(p => ({
                    lat: p.lat(),
                    lng: p.lng()
                }));
                StateManager.updatePVArea(pvId, { corners });
                
                // Update edge lines if they exist (check on polygon first, then on pv)
                const edgeLines = pv.polygon.edgeLines || pv.edgeLines;
                if (edgeLines && edgeLines.length >= 2) {
                    // Swap the edge lines (top becomes bottom, bottom becomes top)
                    edgeLines[0].setPath([path.getAt(0), path.getAt(1)]);
                    edgeLines[1].setPath([path.getAt(2), path.getAt(3)]);
                }
                
                // Update enhanced elements (markers, edge move markers, rotation marker)
                const enhancedElements = pv.polygon.enhancedElements || pv.enhancedElements;
                if (enhancedElements) {
                    // Update vertex markers
                    if (enhancedElements.markers && enhancedElements.markers.length === 4) {
                        enhancedElements.markers[0].setPosition(path.getAt(0));
                        enhancedElements.markers[1].setPosition(path.getAt(1));
                        enhancedElements.markers[2].setPosition(path.getAt(2));
                        enhancedElements.markers[3].setPosition(path.getAt(3));
                        
                        // Update double arrows if they exist
                        enhancedElements.markers.forEach((marker, i) => {
                            if (marker.doubleArrowMarker) {
                                marker.doubleArrowMarker.setPosition(path.getAt(i));
                            }
                        });
                    }
                    
                    // Update edge move markers
                    if (enhancedElements.edgeMoveMarkers && enhancedElements.edgeMoveMarkers.length >= 2) {
                        const midpoint12 = new google.maps.LatLng(
                            (path.getAt(0).lat() + path.getAt(1).lat()) / 2,
                            (path.getAt(0).lng() + path.getAt(1).lng()) / 2
                        );
                        const midpoint34 = new google.maps.LatLng(
                            (path.getAt(2).lat() + path.getAt(3).lat()) / 2,
                            (path.getAt(2).lng() + path.getAt(3).lng()) / 2
                        );
                        enhancedElements.edgeMoveMarkers[0].setPosition(midpoint12);
                        enhancedElements.edgeMoveMarkers[1].setPosition(midpoint34);
                    }
                    
                    // Update rotation marker
                    if (enhancedElements.rotationMarker) {
                        const center = new google.maps.LatLng(
                            (path.getAt(0).lat() + path.getAt(1).lat() + path.getAt(2).lat() + path.getAt(3).lat()) / 4,
                            (path.getAt(0).lng() + path.getAt(1).lng() + path.getAt(2).lng() + path.getAt(3).lng()) / 4
                        );
                        enhancedElements.rotationMarker.setPosition(center);
                    }
                }
                
                // Import PolygonEnhancer for perpendicular distance update
                try {
                    const module = await import('../pv-areas/polygon-enhancer.js');
                    const PolygonEnhancer = module.default;
                    
                    // Recalculate perpendicular distance
                    PolygonEnhancer._updatePerpendicularDistance(pv);
                    
                    // Get updated PV area for auto-calculate
                    const updatedPv = StateManager.getPVArea(pvId);
                    
                    // Recalculate if auto-calculate is enabled
                    if (updatedPv && updatedPv.autoCalculateField) {
                        this.calculateAutoField(updatedPv);
                    }
                } catch (error) {
                    console.error('Error updating perpendicular distance:', error);
                }
            }
        }
        
        // Success message removed - swap is immediately visible
    },
    
    /**
     * Open corner details panel
     */
    openCornerDetails(pvId) {
        if (window.CornerDetailsManager) {
            window.CornerDetailsManager.open(pvId);
        }
    },
    
    /**
     * Toggle East-West mode for roof-mounted PV areas
     */
    toggleEastWest(pvId, checked) {
        StateManager.updatePVArea(pvId, { eastWest: checked });
    },
    
    /**
     * Get cross tilt direction display
     */
    getCrossTiltDirection(azimuth) {
        const rightDirection = (azimuth + 90) % 360;
        const leftDirection = (azimuth + 270) % 360;
        return `(+ nach ${rightDirection.toFixed(0)}° / - nach ${leftDirection.toFixed(0)}°)`;
    },
    
    /**
     * Calculate effective azimuth considering cross tilt
     */
    calculateEffectiveAzimuth(azimuth, tilt, crossTilt) {
        const values = this.calculateEffectiveValues(azimuth, tilt, crossTilt);
        return values.azimuth;
    },
    
    /**
     * Calculate effective tilt considering cross tilt
     */
    calculateEffectiveTilt(azimuth, tilt, crossTilt) {
        const values = this.calculateEffectiveValues(azimuth, tilt, crossTilt);
        return values.tilt;
    },
    
    /**
     * Calculate effective azimuth and tilt considering cross tilt
     */
    calculateEffectiveValues(azimuth, tilt, crossTilt) {
        // Convert to radians
        const tilRad = tilt * Math.PI / 180;
        const rotRad = crossTilt * Math.PI / 180;
        
        // Rotation axis orientation (perpendicular to azimuth)
        const rotDir = azimuth - 90;
        const rotDirRad = rotDir * Math.PI / 180;
        
        // Rotation axis in 3D
        const rotAxisX = Math.sin(rotDirRad - Math.PI/2);
        const rotAxisY = Math.cos(rotDirRad - Math.PI/2);
        const rotationAxis = [rotAxisX, rotAxisY, 0];
        
        // Convert tilt/azimuth to normal vector
        const a = -(azimuth - 90) * Math.PI / 180;
        const x = Math.sin(tilRad) * Math.cos(a);
        const y = Math.sin(tilRad) * Math.sin(a);
        const z = Math.cos(tilRad);
        
        let normal = [x, y, z];
        
        // Apply rotation if cross tilt is not zero
        if (Math.abs(crossTilt) > 0.01) {
            const rotMatrix = this.rotationMatrix(rotationAxis, rotRad);
            normal = this.matrixVectorMultiply(rotMatrix, normal);
        }
        
        // Calculate new azimuth
        const meridian = [0, 1, 0];
        const normalXY = [normal[0], normal[1], 0];
        const normalXYLength = Math.sqrt(normalXY[0]*normalXY[0] + normalXY[1]*normalXY[1]);
        
        let newAzimuth = 180; // Default south
        if (normalXYLength > 0.001) {
            normalXY[0] /= normalXYLength;
            normalXY[1] /= normalXYLength;
            newAzimuth = this.vectorAngle(normalXY, meridian, azimuth <= 180);
        }
        
        // Calculate new tilt
        let newTilt = 0;
        if (normalXYLength > 0.001) {
            newTilt = Math.atan(normal[2] / normalXYLength);
            newTilt = 90 - newTilt * 180 / Math.PI;
        } else {
            newTilt = normal[2] > 0 ? 0 : 180;
        }
        
        return {
            azimuth: Math.round(newAzimuth * 10) / 10,
            tilt: Math.round(newTilt * 10) / 10
        };
    },
    
    /**
     * Create rotation matrix
     */
    rotationMatrix(axis, theta) {
        // Normalize axis
        const axisLength = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
        axis = [axis[0]/axisLength, axis[1]/axisLength, axis[2]/axisLength];
        
        const a = Math.cos(theta / 2.0);
        const b = -axis[0] * Math.sin(theta / 2.0);
        const c = -axis[1] * Math.sin(theta / 2.0);
        const d = -axis[2] * Math.sin(theta / 2.0);
        
        const aa = a * a, bb = b * b, cc = c * c, dd = d * d;
        const bc = b * c, ad = a * d, ac = a * c, ab = a * b, bd = b * d, cd = c * d;
        
        return [
            [aa + bb - cc - dd, 2 * (bc + ad), 2 * (bd - ac)],
            [2 * (bc - ad), aa + cc - bb - dd, 2 * (cd + ab)],
            [2 * (bd + ac), 2 * (cd - ab), aa + dd - bb - cc]
        ];
    },
    
    /**
     * Matrix vector multiplication
     */
    matrixVectorMultiply(matrix, vector) {
        return [
            matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
            matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
            matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
        ];
    },
    
    /**
     * Calculate angle between vectors
     */
    vectorAngle(v1, v2, acute = true) {
        const dot = v1[0]*v2[0] + v1[1]*v2[1] + (v1[2] || 0)*(v2[2] || 0);
        const norm1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1] + (v1[2] || 0)*(v1[2] || 0));
        const norm2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1] + (v2[2] || 0)*(v2[2] || 0));
        let angle = Math.acos(dot / (norm1 * norm2));
        
        if (!acute) {
            angle = 2 * Math.PI - angle;
        }
        return angle * 180 / Math.PI;
    },
    
    /**
     * Open corner heights dialog for roof-mounted PV areas
     */
    openCornerHeightsDialog(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;
        
        // For roof-mounted areas, we manage corner heights similar to corner details
        // but with a focus on height management
        if (window.CornerDetailsManager) {
            // Open the corner details panel which already handles corner heights
            window.CornerDetailsManager.open(pvId);
            
            // Initialize corner heights if not already set
            if (!pv.cornerHeights) {
                const defaultHeight = pv.referenceHeight || 0;
                StateManager.updatePVArea(pvId, { 
                    cornerHeights: [defaultHeight, defaultHeight, defaultHeight, defaultHeight] 
                });
            }
        }
    },
    
    /**
     * Open terrain height manager for field installations
     */
    openTerrainHeightManager(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;
        
        // For field installations, open a specialized dialog for managing terrain heights
        if (window.CornerDetailsManager) {
            // We'll extend the corner details manager for field installations
            window.CornerDetailsManager.open(pvId);
        }
    },
    
    /**
     * Open corner heights dialog
     */
    openCornerHeights(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv || !pv.corners || pv.corners.length < 3) return;
        
        // Create content for corner heights dialog
        const content = `
            <div class="mb-3">
                <p class="small text-muted mb-3">Definieren Sie die Höhen der einzelnen Eckpunkte. Die Werte werden automatisch auf eine Best-Fit-Ebene projiziert.</p>
                
                ${pv.corners.map((corner, index) => `
                <div class="row mb-2">
                    <div class="col-3">
                        <label class="form-label small">Punkt ${index + 1}</label>
                    </div>
                    <div class="col-9">
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control" 
                                   id="corner-height-${index}" 
                                   value="${corner.height || ''}" 
                                   step="0.1" 
                                   placeholder="Höhe in m">
                            <span class="input-group-text">m</span>
                        </div>
                    </div>
                </div>
                `).join('')}
                
                <div class="mt-3 pt-3 border-top">
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="auto-heights" checked>
                        <label class="form-check-label small" for="auto-heights">
                            Höhen automatisch aus Google Elevation API abrufen
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="show-plane">
                        <label class="form-check-label small" for="show-plane">
                            Best-Fit-Ebene auf Karte anzeigen
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="d-flex justify-content-end gap-2 mt-3">
                <button class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
                <button class="btn btn-sm btn-primary" onclick="PVListRenderer.saveCornerHeights('${pvId}')">Übernehmen</button>
            </div>
        `;
        
        UIManager.showMessage(content, 'Eckpunkt-Höhen');
    },
    
    /**
     * Save corner heights
     */
    saveCornerHeights(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv || !pv.corners) return;
        
        // Get values from inputs
        const updatedCorners = pv.corners.map((corner, index) => {
            const input = document.getElementById(`corner-height-${index}`);
            const height = input ? parseFloat(input.value) : null;
            return {
                ...corner,
                height: isNaN(height) ? null : height
            };
        });
        
        // Update PV area
        StateManager.updatePVArea(pvId, { corners: updatedCorners });
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
        if (modal) modal.hide();
        
        UIManager.showMessage('Eckpunkt-Höhen wurden gespeichert', 'Erfolg');
    },
    
    /**
     * Toggle lock state
     */
    toggleLock(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv) return;
        
        // Check if it's a polygon or polyline (facade)
        const shape = pv.polygon || pv.polyline;
        if (!shape) return;
        
        const map = MapManager.getMap();
        const newLockState = !pv.locked;
        
        if (newLockState) {
            // Lock the PV area
            shape.setDraggable(false);
            
            // Make shape not editable
            if (pv.type === 'roof-mounted' && pv.polygon) {
                pv.polygon.setEditable(false);
            } else if (pv.type === 'facade' && pv.polyline) {
                // Polyline is already not editable, hide endpoint markers
                if (pv.endpointMarkers) {
                    pv.endpointMarkers.forEach(marker => {
                        marker.setDraggable(false);
                        marker.setVisible(false);
                    });
                }
            }
            
            // Hide corner markers if they exist (for roof-mounted)
            if (pv.cornerMarkers) {
                pv.cornerMarkers.forEach(marker => {
                    marker.setMap(null);
                });
            }
            
            // Also check if markers are stored on polygon
            if (pv.polygon && pv.polygon.cornerMarkers) {
                pv.polygon.cornerMarkers.forEach(marker => {
                    marker.setMap(null);
                });
            }
            
            // Hide all enhanced elements
            if (pv.enhancedElements) {
                const elements = pv.enhancedElements;
                
                // Hide corner markers
                if (elements.markers) {
                    elements.markers.forEach(marker => {
                        marker.setMap(null);
                        // Also hide double arrow markers
                        if (marker.doubleArrowMarker) {
                            marker.doubleArrowMarker.setMap(null);
                        }
                    });
                }
                
                // Hide edge move markers
                if (elements.edgeMoveMarkers) {
                    elements.edgeMoveMarkers.forEach(marker => {
                        marker.setMap(null);
                    });
                }
                
                // Hide rotation marker
                if (elements.rotationMarker) {
                    elements.rotationMarker.setMap(null);
                }
                
                // Hide double arrows
                if (elements.doubleArrows) {
                    elements.doubleArrows.forEach(arrow => {
                        arrow.setMap(null);
                    });
                }
            }
            
            // Also check if elements are stored on polygon
            if (pv.polygon && pv.polygon.enhancedElements) {
                const elements = pv.polygon.enhancedElements;
                
                if (elements.markers) {
                    elements.markers.forEach(marker => {
                        marker.setMap(null);
                        if (marker.doubleArrowMarker) {
                            marker.doubleArrowMarker.setMap(null);
                        }
                    });
                }
                
                if (elements.edgeMoveMarkers) {
                    elements.edgeMoveMarkers.forEach(marker => {
                        marker.setMap(null);
                    });
                }
                
                if (elements.rotationMarker) {
                    elements.rotationMarker.setMap(null);
                }
                
                if (elements.doubleArrows) {
                    elements.doubleArrows.forEach(arrow => {
                        arrow.setMap(null);
                    });
                }
            }
            
            // Create lock icon in center
            const bounds = new google.maps.LatLngBounds();
            let center;
            
            if (pv.polygon) {
                const path = pv.polygon.getPath();
                for (let i = 0; i < path.getLength(); i++) {
                    bounds.extend(path.getAt(i));
                }
                center = bounds.getCenter();
            } else if (pv.polyline) {
                const path = pv.polyline.getPath();
                for (let i = 0; i < path.getLength(); i++) {
                    bounds.extend(path.getAt(i));
                }
                center = bounds.getCenter();
            }
            
            const lockMarker = new google.maps.Marker({
                position: center,
                map: map,
                icon: {
                    path: 'M 5 8 V 7 A 5 5 0 0 1 15 7 V 8 M 7 8 L 7 8 A 3 3 0 0 0 7 14 L 13 14 A 3 3 0 0 0 13 8 L 7 8 M 10 10 V 12',
                    scale: 1.5,
                    fillColor: '#FFC107',
                    fillOpacity: 1,
                    strokeColor: '#F57C00',
                    strokeWeight: 2,
                    anchor: new google.maps.Point(10, 11)
                },
                clickable: false,
                zIndex: 1000
            });
            
            // Store lock marker reference
            pv.lockMarker = lockMarker;
            
        } else {
            // Unlock the PV area
            shape.setDraggable(true);
            
            // Make shape editable so corners/vertices can be dragged
            if (pv.type === 'roof-mounted' && pv.polygon) {
                console.log('Unlocking roof-mounted PV:', pv.id);
                pv.polygon.setEditable(true);
                
                // Re-attach dimension update event listeners if they're missing
                const path = pv.polygon.getPath();
                
                // Remove any existing listeners to avoid duplicates
                google.maps.event.clearListeners(path, 'set_at');
                
                // Add listener for final vertex changes
                google.maps.event.addListener(path, 'set_at', function(index) {
                    console.log('roof-mounted vertex moved at index:', index);
                    
                    // Update corners in state
                    const corners = [];
                    for (let i = 0; i < path.getLength(); i++) {
                        const point = path.getAt(i);
                        corners.push({ lat: point.lat(), lng: point.lng() });
                    }
                    StateManager.updatePVArea(pv.id, { corners });
                    
                    // Update corner marker position if it exists
                    if (pv.cornerMarkers && pv.cornerMarkers[index]) {
                        pv.cornerMarkers[index].setPosition(path.getAt(index));
                    }
                    
                    // Final dimension update
                    if (pv.showDimensions && Dimensions) {
                        console.log('Updating dimensions after set_at');
                        Dimensions.update(pv);
                    }
                });
                
                // Set up live dimension updates during dragging if dimensions are shown
                if (pv.showDimensions) {
                    console.log('Setting up live updates because showDimensions is true');
                    this._setupLiveDimensionUpdates(pv);
                }
            } else if (pv.type === 'facade' && pv.polyline) {
                console.log('Unlocking facade PV:', pv.id);
                // Polyline stays not editable, but show and enable endpoint markers
                if (pv.endpointMarkers) {
                    pv.endpointMarkers.forEach(marker => {
                        marker.setDraggable(true);
                        marker.setVisible(true);
                    });
                }
                
                // Re-attach dimension update event listeners if they're missing
                const path = pv.polyline.getPath();
                
                // Remove any existing listeners to avoid duplicates
                google.maps.event.clearListeners(path, 'set_at');
                
                // Add listener for path changes (from dragging endpoints)
                google.maps.event.addListener(path, 'set_at', () => {
                    console.log('facade vertex moved');
                    
                    // Update corners in state
                    const corners = [];
                    for (let i = 0; i < path.getLength(); i++) {
                        const point = path.getAt(i);
                        corners.push({ lat: point.lat(), lng: point.lng() });
                    }
                    StateManager.updatePVArea(pv.id, { 
                        corners: corners,
                        facadeLine: corners 
                    });
                    
                    // Update dimensions if shown
                    if (pv.showDimensions && Dimensions) {
                        console.log('Updating dimensions after set_at');
                        Dimensions.update(pv);
                    }
                    
                    // Update orange line if exists
                    if (pv.orangeLine) {
                        const p0 = path.getAt(0);
                        const p1 = path.getAt(1);
                        const map = MapManager.getMap();
                        const projection = map.getProjection();
                        
                        if (projection && path.getLength() === 2) {
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
                                
                                pv.orangeLine.setPath([offsetStart, offsetEnd]);
                            }
                        }
                    }
                    
                    // Recalculate azimuth if auto-calculate is enabled
                    if (pv.autoCalculateAzimuth !== false) {
                        PVListRenderer.calculateFacadeAzimuth(pv.id);
                    }
                });
                
                // Set up live dimension updates during dragging if dimensions are shown
                if (pv.showDimensions) {
                    console.log('Setting up live updates for facade because showDimensions is true');
                    this._setupLiveFacadeUpdates(pv);
                }
            }
            
            // Show corner markers if they exist (for roof-mounted)
            if (pv.cornerMarkers) {
                pv.cornerMarkers.forEach(marker => {
                    marker.setMap(map);
                });
            }
            
            // Also check if markers are stored on polygon
            if (pv.polygon && pv.polygon.cornerMarkers) {
                pv.polygon.cornerMarkers.forEach(marker => {
                    marker.setMap(map);
                });
            }
            
            // Show all enhanced elements
            if (pv.enhancedElements) {
                const elements = pv.enhancedElements;
                
                // Show corner markers
                if (elements.markers) {
                    elements.markers.forEach(marker => {
                        marker.setMap(map);
                        // Also show double arrow markers
                        if (marker.doubleArrowMarker) {
                            marker.doubleArrowMarker.setMap(map);
                        }
                    });
                }
                
                // Show edge move markers
                if (elements.edgeMoveMarkers) {
                    elements.edgeMoveMarkers.forEach(marker => {
                        marker.setMap(map);
                    });
                }
                
                // Show rotation marker
                if (elements.rotationMarker) {
                    elements.rotationMarker.setMap(map);
                }
                
                // Show double arrows
                if (elements.doubleArrows) {
                    elements.doubleArrows.forEach(arrow => {
                        arrow.setMap(map);
                    });
                }
            }
            
            // Also check if elements are stored on polygon
            if (pv.polygon && pv.polygon.enhancedElements) {
                const elements = pv.polygon.enhancedElements;
                
                if (elements.markers) {
                    elements.markers.forEach(marker => {
                        marker.setMap(map);
                        if (marker.doubleArrowMarker) {
                            marker.doubleArrowMarker.setMap(map);
                        }
                    });
                }
                
                if (elements.edgeMoveMarkers) {
                    elements.edgeMoveMarkers.forEach(marker => {
                        marker.setMap(map);
                    });
                }
                
                if (elements.rotationMarker) {
                    elements.rotationMarker.setMap(map);
                }
                
                if (elements.doubleArrows) {
                    elements.doubleArrows.forEach(arrow => {
                        arrow.setMap(map);
                    });
                }
            }
            
            // Remove lock marker
            if (pv.lockMarker) {
                pv.lockMarker.setMap(null);
                delete pv.lockMarker;
            }
        }
        
        // Update state
        StateManager.updatePVArea(pvId, { locked: newLockState });
        
        // Update UI to reflect new lock state
        this.update();
    },
    
    /**
     * Drag and drop handlers
     */
    draggedItem: null,
    draggedId: null,
    
    handleDragStart(event, pvId) {
        this.draggedItem = event.target.closest('.pv-area-item');
        this.draggedId = pvId;
        if (this.draggedItem) {
            this.draggedItem.classList.add('dragging');
            // Create a ghost image for dragging
            const dragImage = this.draggedItem.cloneNode(true);
            dragImage.style.opacity = '0.5';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            document.body.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, event.offsetX, event.offsetY);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        }
        event.dataTransfer.effectAllowed = 'move';
        // Store drag data for cross-browser compatibility
        event.dataTransfer.setData('text/plain', pvId);
    },
    
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const item = event.target.closest('.pv-area-item');
        if (item && item !== this.draggedItem) {
            // Clear all drag-over classes first
            document.querySelectorAll('.pv-area-item').forEach(el => {
                if (el !== item) {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });
            
            const rect = item.getBoundingClientRect();
            const mouseY = event.clientY;
            const elementMiddle = rect.top + rect.height / 2;
            
            // Remove both classes first to ensure clean state
            item.classList.remove('drag-over-top', 'drag-over-bottom');
            
            if (mouseY < elementMiddle) {
                item.classList.add('drag-over-top');
            } else {
                item.classList.add('drag-over-bottom');
            }
        }
    },
    
    handleDragEnter(event) {
        const item = event.target.closest('.pv-area-item');
        if (item && item !== this.draggedItem) {
            this.handleDragOver(event);
        }
    },
    
    handleDragLeave(event) {
        const item = event.target.closest('.pv-area-item');
        if (item) {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        }
    },
    
    handleDrop(event, targetPvId) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get the dragged ID from data transfer as fallback
        const draggedId = this.draggedId || event.dataTransfer.getData('text/plain');
        
        if (draggedId && targetPvId && draggedId !== targetPvId) {
            const pvAreas = StateManager.getAllPVAreas();
            const draggedIndex = pvAreas.findIndex(pv => pv.id === draggedId);
            const targetIndex = pvAreas.findIndex(pv => pv.id === targetPvId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Determine if we should insert before or after based on the drop position
                const item = event.target.closest('.pv-area-item');
                let adjustedTargetIndex = targetIndex;
                
                if (item) {
                    if (item.classList.contains('drag-over-bottom') && draggedIndex < targetIndex) {
                        // Dropping below and dragging from above - no adjustment needed
                    } else if (item.classList.contains('drag-over-top') && draggedIndex > targetIndex) {
                        // Dropping above and dragging from below - no adjustment needed  
                    } else if (item.classList.contains('drag-over-bottom')) {
                        // Dropping below
                        adjustedTargetIndex = targetIndex;
                    } else {
                        // Dropping above
                        adjustedTargetIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
                    }
                }
                
                StateManager.reorderPVAreas(draggedIndex, adjustedTargetIndex);
                
                // Provide visual feedback
                setTimeout(() => {
                    const movedItem = document.getElementById(`pv-item-${draggedId}`);
                    if (movedItem) {
                        movedItem.style.animation = 'pulse 0.5s ease';
                        setTimeout(() => {
                            movedItem.style.animation = '';
                        }, 500);
                    }
                }, 100);
            }
        }
        
        // Clean up with smooth transition
        this.cleanupDrag();
    },
    
    handleDragEnd(event) {
        this.cleanupDrag();
    },
    
    cleanupDrag() {
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
        }
        
        // Remove all drag-over classes with a small delay for smooth transition
        setTimeout(() => {
            document.querySelectorAll('.pv-area-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        }, 50);
        
        this.draggedItem = null;
        this.draggedId = null;
    },
    
    /**
     * Select PV area with visual effect when clicked on map
     */
    selectPVAreaWithEffect(pvId) {
        const pv = StateManager.getPVArea(pvId);
        if (!pv || pv.locked) return;
        
        // First, switch to PV-Areas panel if we're in a different panel
        UIManager.showPanel('pv-areas');
        
        // Focus on the PV area on the map
        if (pv.corners && pv.corners.length > 0) {
            // Calculate center of PV area
            let sumLat = 0;
            let sumLng = 0;
            pv.corners.forEach(corner => {
                sumLat += corner.lat;
                sumLng += corner.lng;
            });
            const centerLat = sumLat / pv.corners.length;
            const centerLng = sumLng / pv.corners.length;
            
            // Pan to center without changing zoom
            const map = window.MapManager ? window.MapManager.getMap() : window.map;
            if (map) {
                map.panTo(new google.maps.LatLng(centerLat, centerLng));
            }
        }
        
        // Use the same gentle highlight effect as "Show on map"
        if (pv.polygon) {
            pv.polygon.setOptions({
                fillOpacity: 0.7,
                strokeWeight: 4
            });
            
            setTimeout(() => {
                pv.polygon.setOptions({
                    fillOpacity: 0.35,
                    strokeWeight: 2
                });
            }, 500);
        }
        
        // Small delay to let panel switch complete first
        setTimeout(() => {
            // Collapse all OTHER PV areas and expand the selected one
            const allPVItems = document.querySelectorAll('.pv-area-item');
            allPVItems.forEach(item => {
                const pvItemId = item.getAttribute('data-pv-id');
                const details = document.getElementById(`details-${pvItemId}`);
                const chevron = document.getElementById(`chevron-${pvItemId}`);
                
                if (details && chevron) {
                    if (pvItemId === pvId) {
                        // Expand the selected PV area
                        details.classList.add('expanded');
                        chevron.classList.remove('fa-chevron-right');
                        chevron.classList.add('fa-chevron-down');
                    } else {
                        // Collapse all others
                        details.classList.remove('expanded');
                        chevron.classList.remove('fa-chevron-down');
                        chevron.classList.add('fa-chevron-right');
                    }
                }
            });
        }, 100);
        
        // Find the selected PV item for visual effect
        const pvItem = document.querySelector(`.pv-area-item[data-pv-id="${pvId}"]`);
        if (pvItem) {
            // Add more prominent highlight effect with animation
            pvItem.style.transition = 'all 0.3s ease';
            pvItem.style.backgroundColor = 'rgba(66, 116, 165, 0.2)';
            pvItem.style.transform = 'scale(1.02)';
            pvItem.style.boxShadow = '0 2px 8px rgba(66, 116, 165, 0.3)';
            pvItem.style.zIndex = '10';
            
            setTimeout(() => {
                pvItem.style.backgroundColor = '';
                pvItem.style.transform = '';
                pvItem.style.boxShadow = '';
                setTimeout(() => {
                    pvItem.style.zIndex = '';
                }, 300);
            }, 700);
            
            // Scroll the item into view within the scrollable wrapper
            setTimeout(() => {
                const scrollableWrapper = document.querySelector('#panel-pv-areas .scrollable-wrapper');
                const elementList = document.getElementById('pv-list');
                
                if (scrollableWrapper && elementList) {
                    // Calculate position relative to the scrollable wrapper
                    const itemRect = pvItem.getBoundingClientRect();
                    const wrapperRect = scrollableWrapper.getBoundingClientRect();
                    
                    // Check if item is not fully visible
                    if (itemRect.top < wrapperRect.top || itemRect.bottom > wrapperRect.bottom) {
                        // Scroll the item into the middle of the visible area
                        const itemOffsetTop = pvItem.offsetTop - elementList.offsetTop;
                        const targetScroll = itemOffsetTop - (scrollableWrapper.clientHeight / 2) + (pvItem.clientHeight / 2);
                        
                        scrollableWrapper.scrollTo({
                            top: Math.max(0, targetScroll),
                            behavior: 'smooth'
                        });
                    }
                }
            }, 100);
        }
    },
    
    /**
     * Set up event handlers after render
     */
    setupEventHandlers() {
        // Initialize Bootstrap tooltips with shorter delay
        const tooltipTriggerList = document.querySelectorAll('#pv-list [data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl, {
                delay: { show: 200, hide: 0 }, // Show after 200ms, hide immediately
                placement: 'auto',
                html: true // Enable HTML for formatted tooltips
            });
        });
    },
    
    /**
     * Set up live updates for facade PV areas during dragging
     * @private
     */
    _setupLiveFacadeUpdates(pv) {
        console.log('_setupLiveFacadeUpdates called');
        
        if (!pv.polyline || !pv.showDimensions) {
            console.log('Early return - missing polyline or showDimensions is false');
            return;
        }
        
        // Clean up any existing monitoring
        if (pv._facadeMonitoringInterval) {
            clearInterval(pv._facadeMonitoringInterval);
            pv._facadeMonitoringInterval = null;
        }
        
        const path = pv.polyline.getPath();
        const map = MapManager.getMap();
        
        // Store the last known state
        let lastKnownPositions = [];
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            lastKnownPositions.push({
                lat: point.lat(),
                lng: point.lng()
            });
        }
        
        // Helper function to update orange line with pixel offset
        const updateOrangeLine = () => {
            if (pv.orangeLine && path.getLength() === 2) {
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
                        
                        pv.orangeLine.setPath([offsetStart, offsetEnd]);
                    }
                }
            }
        };
        
        // Function to check and update
        const checkAndUpdate = () => {
            let hasChanged = false;
            
            // Check each vertex for changes
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                const currentLat = point.lat();
                const currentLng = point.lng();
                
                if (i < lastKnownPositions.length) {
                    const latDiff = Math.abs(currentLat - lastKnownPositions[i].lat);
                    const lngDiff = Math.abs(currentLng - lastKnownPositions[i].lng);
                    
                    if (latDiff > 0.0000001 || lngDiff > 0.0000001) {
                        hasChanged = true;
                        lastKnownPositions[i].lat = currentLat;
                        lastKnownPositions[i].lng = currentLng;
                    }
                }
            }
            
            // If something changed, update dimensions and orange line
            if (hasChanged) {
                console.log('Facade movement detected, updating dimensions and orange line');
                if (Dimensions && Dimensions.update) {
                    Dimensions.update(pv);
                }
                updateOrangeLine();
                
                // Update state with new positions
                const corners = [];
                for (let i = 0; i < path.getLength(); i++) {
                    const point = path.getAt(i);
                    corners.push({ lat: point.lat(), lng: point.lng() });
                }
                StateManager.updatePVArea(pv.id, { 
                    corners: corners,
                    facadeLine: corners
                });
                
                // If auto-calculate azimuth is enabled, recalculate it
                if (pv.autoCalculateAzimuth !== false) {
                    this.calculateFacadeAzimuth(pv.id);
                }
            }
        };
        
        // Check if polyline is editable
        const isEditable = pv.polyline.getEditable();
        console.log('Polyline editable state:', isEditable);
        
        // Start continuous monitoring while editable
        if (isEditable) {
            console.log('Polyline is editable, starting continuous monitoring');
            
            // Monitor for changes with high frequency
            pv._facadeMonitoringInterval = setInterval(checkAndUpdate, 16); // ~60fps
            
            // Store cleanup function
            pv._stopFacadeMonitoring = () => {
                if (pv._facadeMonitoringInterval) {
                    clearInterval(pv._facadeMonitoringInterval);
                    pv._facadeMonitoringInterval = null;
                }
            };
        }
        
        // Also add event listeners as backup
        google.maps.event.addListener(path, 'set_at', () => {
            checkAndUpdate();
        });
        
        google.maps.event.addListener(pv.polyline, 'drag', () => {
            checkAndUpdate();
        });
    },
    
    /**
     * Set up live dimension updates for roof-mounted PV areas during vertex dragging
     * @private
     */
    _setupLiveDimensionUpdates(pv) {
        console.log('_setupLiveDimensionUpdates called');
        console.log('pv.polygon:', !!pv.polygon, 'pv.showDimensions:', pv.showDimensions);
        
        if (!pv.polygon || !pv.showDimensions) {
            console.log('Early return - missing polygon or showDimensions is false');
            return;
        }
        
        console.log('Setting up live dimension updates for PV:', pv.id);
        
        // Clean up any existing monitoring
        if (pv._monitoringInterval) {
            console.log('Clearing existing interval');
            clearInterval(pv._monitoringInterval);
            pv._monitoringInterval = null;
        }
        
        const path = pv.polygon.getPath();
        console.log('Path length:', path.getLength());
        
        // Store the last known state
        let lastKnownPositions = [];
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            lastKnownPositions.push({
                lat: point.lat(),
                lng: point.lng()
            });
        }
        
        // Function to check and update
        const checkAndUpdate = () => {
            let hasChanged = false;
            
            // Check each vertex for changes
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                const currentLat = point.lat();
                const currentLng = point.lng();
                
                // Check if this vertex has moved (using small threshold for floating point comparison)
                if (i < lastKnownPositions.length) {
                    const latDiff = Math.abs(currentLat - lastKnownPositions[i].lat);
                    const lngDiff = Math.abs(currentLng - lastKnownPositions[i].lng);
                    
                    if (latDiff > 0.0000001 || lngDiff > 0.0000001) {
                        hasChanged = true;
                        // Update the stored position
                        lastKnownPositions[i].lat = currentLat;
                        lastKnownPositions[i].lng = currentLng;
                    }
                }
            }
            
            // If something changed, update dimensions
            if (hasChanged) {
                console.log('Vertex movement detected, updating dimensions');
                // Use the imported Dimensions module directly
                if (Dimensions && Dimensions.update) {
                    Dimensions.update(pv);
                } else {
                    console.log('Dimensions module not available or update method missing');
                }
            }
        };
        
        // Check if polygon is editable
        const isEditable = pv.polygon.getEditable();
        console.log('Polygon editable state:', isEditable);
        
        // Start continuous monitoring while editable
        if (isEditable) {
            console.log('Polygon is editable, starting continuous monitoring');
            
            // Check every 50ms (20 FPS - good balance between performance and smoothness)
            pv._monitoringInterval = setInterval(checkAndUpdate, 50);
            console.log('Interval started with ID:', pv._monitoringInterval);
            
            // Also add direct path listeners as backup
            google.maps.event.addListener(path, 'set_at', function(index) {
                console.log('Path set_at event fired for index:', index);
                checkAndUpdate();
            });
            
            google.maps.event.addListener(path, 'insert_at', function(index) {
                console.log('Path insert_at event fired');
                // Update stored positions array
                const point = path.getAt(index);
                lastKnownPositions.splice(index, 0, {
                    lat: point.lat(),
                    lng: point.lng()
                });
                checkAndUpdate();
            });
            
            google.maps.event.addListener(path, 'remove_at', function(index) {
                console.log('Path remove_at event fired');
                // Update stored positions array
                lastKnownPositions.splice(index, 1);
                checkAndUpdate();
            });
        } else {
            console.log('Polygon is not editable - cannot set up live updates');
            console.log('Make sure to unlock the PV area first!');
        }
    }
};

// Make functions available globally for onclick handlers
window.PVListRenderer = PVListRenderer;