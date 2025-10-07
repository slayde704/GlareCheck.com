/**
 * Translation Manager for GlareCheck Application
 * Supports German (de) and English (en)
 */

const translations = {
    de: {
        // Navigation & General
        'app.title': 'Blendgutachten',
        'language.german': 'Deutsch',
        'language.english': 'English',

        // Main Menu
        'menu.newPV': 'Neue PV-Fläche',
        'menu.newOP': 'Neuer Beobachtungspunkt',
        'menu.calculate': 'Berechnen',
        'menu.moduleTypes': 'Modultypen verwalten',

        // PV Types
        'pvType.roofParallel': 'Dachparallel',
        'pvType.roofMounted': 'Aufgeständert (Dach)',
        'pvType.facade': 'Fassade',
        'pvType.field': 'Freifläche',
        'pvType.ground': 'Freifläche',

        // PV List
        'pvList.title': 'PV-Flächen',
        'pvList.empty': 'Noch keine PV-Flächen definiert',
        'pvList.area': 'Fläche',
        'pvList.azimuth': 'Azimut',
        'pvList.tilt': 'Neigung',
        'pvList.moduleType': 'Modultyp',
        'pvList.topography': 'Topografie',
        'pvList.delete': 'Löschen',
        'pvList.duplicate': 'Duplizieren',
        'pvList.zoom': 'Zoom',

        // Drawing
        'draw.instruction': 'Klicken Sie auf die Karte, um Punkte zu setzen. Doppelklick zum Beenden.',
        'draw.roofParallel': 'Zeichnen Sie das Rechteck parallel zur Dachkante',
        'draw.roofMounted': 'Zeichnen Sie die PV-Fläche mit 4 Punkten',
        'draw.facade': 'Zeichnen Sie eine Linie für die Fassade',
        'draw.field': 'Zeichnen Sie das Polygon der Freifläche',

        // Corner Details Panel
        'corner.title': 'Eckpunkte & Parameter',
        'corner.coordinates': 'Koordinaten',
        'corner.parameters': 'Parameter',
        'corner.point': 'Punkt',
        'corner.latitude': 'Breite',
        'corner.longitude': 'Länge',
        'corner.terrainHeight': 'Geländehöhe',
        'corner.delete': 'Eckpunkt löschen',
        'corner.close': 'Schließen',

        // Parameters
        'param.azimuth': 'Azimut',
        'param.azimuth.desc': 'Horizontale Ausrichtung',
        'param.tilt': 'Neigung',
        'param.tilt.desc': 'Vertikal-Winkel',
        'param.moduleType': 'Modultyp',
        'param.moduleType.select': 'Modultyp auswählen',
        'param.height': 'Höhe',
        'param.heightTop': 'Höhe Oberkante',
        'param.heightBottom': 'Höhe Unterkante',
        'param.referenceHeight': 'Referenzhöhe',
        'param.autoCalculate': 'Auto-Calculate',
        'param.autoCalculateTerrainHeight': 'Auto-Calculate Geländehöhe',

        // Topography
        'topo.title': 'Topografie-Definition',
        'topo.whyImportant': 'Warum ist die Topografie wichtig?',
        'topo.description': 'Die Topografie (Geländehöhe) beeinflusst die Blend-Berechnung erheblich:',
        'topo.supportPoints': 'Stützpunkte',
        'topo.supportPoints.desc': 'Definieren die exakte Geländeform innerhalb der PV-Fläche',
        'topo.cornerPoints': 'Eckpunkte',
        'topo.cornerPoints.desc': 'Definieren die Höhe an den Ecken der PV-Fläche',
        'topo.bestFit': 'Best-Fit-Ebene',
        'topo.bestFit.desc': 'Berechnet eine geneigte Ebene aus den Eckpunkten (nur sinnvoll bei planarer Fläche, benötigt keine extra Stützpunkte)',
        'topo.tip': 'Tipp:',
        'topo.tipText': 'Für eine schnelle Analyse nutzen Sie das 100 m Raster.',
        'topo.updateRequired': 'Update erforderlich',
        'topo.configured': 'Konfiguriert',
        'topo.notConfigured': 'Nicht konfiguriert',

        // Topography Actions
        'topo.create100mGrid': '100 m Raster erstellen',
        'topo.createCustomGrid': 'Custom Raster',
        'topo.addManualPoints': 'Punkte manuell setzen',
        'topo.importPoints': 'XYZ/CSV importieren',
        'topo.useBestFit': 'Best-Fit-Ebene verwenden',
        'topo.switchMethod': 'Andere Methode wählen',
        'topo.deleteAllPoints': 'Alle Punkte löschen',
        'topo.tooltip100m': 'Für eine schnelle Analyse nutzen Sie das 100 m Raster',

        // Topography Status
        'topo.bestFitActive': 'Best-Fit-Ebene aktiv',
        'topo.bestFitActive.desc': 'Eine geneigte Ebene wird aus den {count} Eckpunkt-Höhen berechnet',
        'topo.noPoints': 'Keine Stützpunkte definiert',
        'topo.noPoints.desc': 'Wählen Sie eine Methode zur Stützpunkt-Definition',
        'topo.areaChanged': 'Fläche wurde verändert',
        'topo.areaChanged.desc': 'Bitte prüfen und bestätigen Sie die Topografie oder passen Sie sie an.',
        'topo.confirmCorrect': 'Topografie ist korrekt',
        'topo.gridPoints': 'Rasterpunkte',
        'topo.manualPoints': 'Manuell',

        // Support Points
        'support.title': 'Stützpunkte',
        'support.height': 'Höhe',
        'support.delete': 'Löschen',
        'support.none': 'Noch keine Stützpunkte definiert',
        'support.updateHeights': 'Höhen abrufen',

        // Best-Fit Plane
        'bestFit.terrain': 'Gelände',
        'bestFit.calculated': 'Best-Fit',
        'bestFit.info': 'Best-Fit-Ebene:',
        'bestFit.infoText': 'Die berechneten Höhen zeigen die optimale Ebene durch alle Eckpunkte. Abweichungen werden farblich hervorgehoben:',
        'bestFit.deviation.low': '< 0.5m',
        'bestFit.deviation.medium': '0.5-1.0m',
        'bestFit.deviation.high': '> 1.0m',

        // Manual Point Placement
        'manual.active': 'Manueller Modus aktiv',
        'manual.instruction': 'Klicken Sie auf die Karte, um Stützpunkte zu setzen',
        'manual.stop': 'Beenden',

        // Grid Generator
        'grid.title': 'Raster generieren',
        'grid.spacing': 'Abstand',
        'grid.spacing.unit': 'm',
        'grid.includeBoundary': 'Randpunkte einschließen',
        'grid.generate': 'Generieren',
        'grid.cancel': 'Abbrechen',
        'grid.minSpacing': 'Der minimale Abstand beträgt 50m',

        // Import Dialog
        'import.title': 'Punkte importieren',
        'import.format': 'Format: X Y Z (durch Leerzeichen oder Komma getrennt)',
        'import.example': 'Beispiel: 48.123456 11.123456 450.5',
        'import.textarea': 'Fügen Sie Ihre Punkte hier ein...',
        'import.file': 'Datei auswählen',
        'import.import': 'Importieren',
        'import.close': 'Schließen',
        'import.success': '{count} Punkte erfolgreich importiert',
        'import.error': 'Keine gültigen Punkte in der Datei gefunden oder alle Punkte liegen außerhalb der PV-Fläche',

        // Delete Confirmation
        'delete.title': 'Löschen bestätigen',
        'delete.confirmPoints': 'Möchten Sie wirklich alle Stützpunkte löschen?',
        'delete.confirmPV': 'Möchten Sie diese PV-Fläche wirklich löschen?',
        'delete.warning': 'Diese Aktion kann nicht rückgängig gemacht werden.',
        'delete.cancel': 'Abbrechen',
        'delete.confirm': 'Löschen',

        // Notifications
        'notify.pvCreated': 'PV-Fläche erstellt',
        'notify.pvDeleted': 'PV-Fläche gelöscht',
        'notify.pvDuplicated': 'PV-Fläche dupliziert',
        'notify.topographyConfirmed': 'Topografie bestätigt',
        'notify.gridUpdated': 'Raster und Höhen wurden erfolgreich aktualisiert',
        'notify.heightsUpdated': 'Höhen aktualisiert',
        'notify.error': 'Fehler',
        'notify.success': 'Erfolgreich',

        // Validation
        'validation.required': 'Dieses Feld ist erforderlich',
        'validation.invalidNumber': 'Bitte geben Sie eine gültige Zahl ein',
        'validation.invalidCoordinates': 'Bitte geben Sie gültige Koordinaten ein',
        'validation.min3Points': 'Mindestens 3 Punkte erforderlich',
        'validation.pvLocked': 'Diese PV-Fläche ist gesperrt und kann nicht bearbeitet werden.',

        // Module Types
        'module.manage': 'Modultypen verwalten',
        'module.name': 'Name',
        'module.add': 'Neuen Modultyp hinzufügen',
        'module.edit': 'Bearbeiten',
        'module.delete': 'Löschen',
        'module.save': 'Speichern',
        'module.cancel': 'Abbrechen',
        'module.namePlaceholder': 'z.B. Standard-Modul',
        'module.nameRequired': 'Bitte geben Sie einen Namen ein',
        'module.nameDuplicate': 'Ein Modultyp mit diesem Namen existiert bereits',

        // Units
        'unit.degrees': '°',
        'unit.meters': 'm',
        'unit.squareMeters': 'm²',

        // Common
        'common.yes': 'Ja',
        'common.no': 'Nein',
        'common.ok': 'OK',
        'common.cancel': 'Abbrechen',
        'common.save': 'Speichern',
        'common.close': 'Schließen',
        'common.delete': 'Löschen',
        'common.edit': 'Bearbeiten',
        'common.add': 'Hinzufügen',
        'common.create': 'Erstellen',
        'common.confirm': 'Bestätigen',
        'common.loading': 'Laden...',
        'common.error': 'Fehler',
        'common.success': 'Erfolgreich',
        'common.warning': 'Warnung',
        'common.info': 'Information',
    },

    en: {
        // Navigation & General
        'app.title': 'Glare Assessment',
        'language.german': 'Deutsch',
        'language.english': 'English',

        // Main Menu
        'menu.newPV': 'New PV Area',
        'menu.newOP': 'New Observation Point',
        'menu.calculate': 'Calculate',
        'menu.moduleTypes': 'Manage Module Types',

        // PV Types
        'pvType.roofParallel': 'Roof Parallel',
        'pvType.roofMounted': 'Roof Mounted',
        'pvType.facade': 'Facade',
        'pvType.field': 'Field',
        'pvType.ground': 'Ground',

        // PV List
        'pvList.title': 'PV Areas',
        'pvList.empty': 'No PV areas defined yet',
        'pvList.area': 'Area',
        'pvList.azimuth': 'Azimuth',
        'pvList.tilt': 'Tilt',
        'pvList.moduleType': 'Module Type',
        'pvList.topography': 'Topography',
        'pvList.delete': 'Delete',
        'pvList.duplicate': 'Duplicate',
        'pvList.zoom': 'Zoom',

        // Drawing
        'draw.instruction': 'Click on the map to add points. Double-click to finish.',
        'draw.roofParallel': 'Draw the rectangle parallel to the roof edge',
        'draw.roofMounted': 'Draw the PV area with 4 points',
        'draw.facade': 'Draw a line for the facade',
        'draw.field': 'Draw the polygon of the field area',

        // Corner Details Panel
        'corner.title': 'Corner Points & Parameters',
        'corner.coordinates': 'Coordinates',
        'corner.parameters': 'Parameters',
        'corner.point': 'Point',
        'corner.latitude': 'Latitude',
        'corner.longitude': 'Longitude',
        'corner.terrainHeight': 'Terrain Height',
        'corner.delete': 'Delete corner point',
        'corner.close': 'Close',

        // Parameters
        'param.azimuth': 'Azimuth',
        'param.azimuth.desc': 'Horizontal orientation',
        'param.tilt': 'Tilt',
        'param.tilt.desc': 'Vertical angle',
        'param.moduleType': 'Module Type',
        'param.moduleType.select': 'Select module type',
        'param.height': 'Height',
        'param.heightTop': 'Height Top Edge',
        'param.heightBottom': 'Height Bottom Edge',
        'param.referenceHeight': 'Reference Height',
        'param.autoCalculate': 'Auto-Calculate',
        'param.autoCalculateTerrainHeight': 'Auto-Calculate Terrain Height',

        // Topography
        'topo.title': 'Topography Definition',
        'topo.whyImportant': 'Why is topography important?',
        'topo.description': 'Topography (terrain elevation) significantly affects glare calculations:',
        'topo.supportPoints': 'Support Points',
        'topo.supportPoints.desc': 'Define the exact terrain shape within the PV area',
        'topo.cornerPoints': 'Corner Points',
        'topo.cornerPoints.desc': 'Define the height at the corners of the PV area',
        'topo.bestFit': 'Best-Fit Plane',
        'topo.bestFit.desc': 'Calculates an inclined plane from corner points (only useful for planar surfaces, requires no additional support points)',
        'topo.tip': 'Tip:',
        'topo.tipText': 'For quick analysis, use the 100 m grid.',
        'topo.updateRequired': 'Update Required',
        'topo.configured': 'Configured',
        'topo.notConfigured': 'Not Configured',

        // Topography Actions
        'topo.create100mGrid': 'Create 100 m Grid',
        'topo.createCustomGrid': 'Custom Grid',
        'topo.addManualPoints': 'Add Points Manually',
        'topo.importPoints': 'Import XYZ/CSV',
        'topo.useBestFit': 'Use Best-Fit Plane',
        'topo.switchMethod': 'Choose Different Method',
        'topo.deleteAllPoints': 'Delete All Points',
        'topo.tooltip100m': 'For quick analysis, use the 100 m grid',

        // Topography Status
        'topo.bestFitActive': 'Best-Fit Plane Active',
        'topo.bestFitActive.desc': 'An inclined plane is calculated from {count} corner point heights',
        'topo.noPoints': 'No Support Points Defined',
        'topo.noPoints.desc': 'Select a method for defining support points',
        'topo.areaChanged': 'Area Has Changed',
        'topo.areaChanged.desc': 'Please review and confirm the topography or adjust it.',
        'topo.confirmCorrect': 'Topography is Correct',
        'topo.gridPoints': 'Grid Points',
        'topo.manualPoints': 'Manual',

        // Support Points
        'support.title': 'Support Points',
        'support.height': 'Height',
        'support.delete': 'Delete',
        'support.none': 'No support points defined yet',
        'support.updateHeights': 'Fetch Heights',

        // Best-Fit Plane
        'bestFit.terrain': 'Terrain',
        'bestFit.calculated': 'Best-Fit',
        'bestFit.info': 'Best-Fit Plane:',
        'bestFit.infoText': 'The calculated heights show the optimal plane through all corner points. Deviations are color-coded:',
        'bestFit.deviation.low': '< 0.5m',
        'bestFit.deviation.medium': '0.5-1.0m',
        'bestFit.deviation.high': '> 1.0m',

        // Manual Point Placement
        'manual.active': 'Manual Mode Active',
        'manual.instruction': 'Click on the map to place support points',
        'manual.stop': 'Stop',

        // Grid Generator
        'grid.title': 'Generate Grid',
        'grid.spacing': 'Spacing',
        'grid.spacing.unit': 'm',
        'grid.includeBoundary': 'Include boundary points',
        'grid.generate': 'Generate',
        'grid.cancel': 'Cancel',
        'grid.minSpacing': 'Minimum spacing is 50m',

        // Import Dialog
        'import.title': 'Import Points',
        'import.format': 'Format: X Y Z (space or comma separated)',
        'import.example': 'Example: 48.123456 11.123456 450.5',
        'import.textarea': 'Paste your points here...',
        'import.file': 'Choose File',
        'import.import': 'Import',
        'import.close': 'Close',
        'import.success': '{count} points imported successfully',
        'import.error': 'No valid points found in file or all points are outside the PV area',

        // Delete Confirmation
        'delete.title': 'Confirm Deletion',
        'delete.confirmPoints': 'Do you really want to delete all support points?',
        'delete.confirmPV': 'Do you really want to delete this PV area?',
        'delete.warning': 'This action cannot be undone.',
        'delete.cancel': 'Cancel',
        'delete.confirm': 'Delete',

        // Notifications
        'notify.pvCreated': 'PV area created',
        'notify.pvDeleted': 'PV area deleted',
        'notify.pvDuplicated': 'PV area duplicated',
        'notify.topographyConfirmed': 'Topography confirmed',
        'notify.gridUpdated': 'Grid and heights successfully updated',
        'notify.heightsUpdated': 'Heights updated',
        'notify.error': 'Error',
        'notify.success': 'Success',

        // Validation
        'validation.required': 'This field is required',
        'validation.invalidNumber': 'Please enter a valid number',
        'validation.invalidCoordinates': 'Please enter valid coordinates',
        'validation.min3Points': 'At least 3 points required',
        'validation.pvLocked': 'This PV area is locked and cannot be edited.',

        // Module Types
        'module.manage': 'Manage Module Types',
        'module.name': 'Name',
        'module.add': 'Add New Module Type',
        'module.edit': 'Edit',
        'module.delete': 'Delete',
        'module.save': 'Save',
        'module.cancel': 'Cancel',
        'module.namePlaceholder': 'e.g. Standard Module',
        'module.nameRequired': 'Please enter a name',
        'module.nameDuplicate': 'A module type with this name already exists',

        // Units
        'unit.degrees': '°',
        'unit.meters': 'm',
        'unit.squareMeters': 'm²',

        // Common
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.ok': 'OK',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.create': 'Create',
        'common.confirm': 'Confirm',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.warning': 'Warning',
        'common.info': 'Information',
    }
};

/**
 * i18n Manager Class
 */
class I18nManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'de';
        this.translations = translations;
        this.subscribers = [];
    }

    /**
     * Get current language
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Set language
     */
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.error('Language not supported:', lang);
            return;
        }

        this.currentLanguage = lang;
        localStorage.setItem('language', lang);

        // Notify subscribers
        this.subscribers.forEach(callback => callback(lang));

        // Update document language
        document.documentElement.lang = lang;
    }

    /**
     * Subscribe to language changes
     */
    subscribe(callback) {
        this.subscribers.push(callback);
    }

    /**
     * Translate a key
     */
    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage][key] || key;

        // Replace parameters in translation
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    /**
     * Check if a translation exists
     */
    has(key) {
        return !!this.translations[this.currentLanguage][key];
    }
}

// Create global instance
window.i18n = new I18nManager();
