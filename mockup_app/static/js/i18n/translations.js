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
        'module.addNew': 'Neuer Modultyp',
        'module.edit': 'Bearbeiten',
        'module.editType': 'Modultyp bearbeiten',
        'module.delete': 'Löschen',
        'module.save': 'Speichern',
        'module.cancel': 'Abbrechen',
        'module.namePlaceholder': 'z.B. Standard-Modul',
        'module.nameRequired': 'Bitte geben Sie einen Namen ein',
        'module.nameDuplicate': 'Ein Modultyp mit diesem Namen existiert bereits',
        'module.beamSpread': 'Bündelaufweitung',
        'module.usage': 'Verwendungen',
        'module.protected': 'Geschützt',
        'module.reflectionProfile': 'Reflexionsprofil (Leuchtdichte in cd/m² bei 100.000 lx Bestrahlungsstärke)',
        'module.incidentAngle': 'Einfallswinkel',
        'module.luminance': 'Leuchtdichte',
        'module.noProfile': 'Kein Reflexionsprofil definiert',
        'module.noTypes': 'Keine Modultypen vorhanden',
        'module.created': 'Modultyp erstellt',
        'module.updated': 'Modultyp aktualisiert',
        'module.deleted': 'Modultyp gelöscht',
        'module.deleteConfirm': 'Möchten Sie den Modultyp "<strong>{name}</strong>" wirklich löschen?',
        'module.deleteInUse': 'Der Modultyp "<strong>{name}</strong>" wird aktuell von <strong>{count} PV-Fläche{plural}</strong> verwendet.',
        'module.area': '',
        'module.areas': 'n',

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
        'common.apply': 'Übernehmen',
        'common.details': 'Details',
        'common.recommended': 'Empfohlen',

        // Menu
        'menu.main': 'Hauptmenü',
        'menu.backToMain': 'Zurück zum Hauptmenü',
        'menu.pvAreas': 'PV-Flächen',
        'menu.observationPoints': 'Betrachtungspunkte',
        'menu.excludedAreas': 'Ausschlussbereiche',
        'menu.obstacles': 'Hindernisse',
        'menu.selectFunction': 'Wählen Sie eine Funktion aus dem Menü, um zu beginnen.',

        // PV List Extended
        'pvList.existing': 'Vorhandene PV-Flächen:',
        'pvList.exampleNameRoof': 'Süddach Haus A',
        'pvList.exampleNameRoof2': 'Nordfläche Scheune',
        'pvList.exampleNameFacade': 'Südfassade Gebäude 1',
        'pvList.nameHelp': 'Optionale Bezeichnung: Geben Sie der PV-Fläche einen Namen zur besseren Identifizierung.',
        'pvList.dimension': 'Bemaßen',
        'pvList.duplicated': 'PV-Fläche wurde dupliziert!',
        'pvList.lockedHelp': 'PV-Fläche ist gesperrt. Entsperren Sie die PV-Fläche über den Sperr-Button in der PV-Liste.',
        'pvList.lockedEditHelp': 'PV-Fläche ist gesperrt. Entsperren Sie die PV-Fläche über den Sperr-Button in der PV-Liste, um die Koordinaten bearbeiten zu können.',
        'pvList.lockedAlert': 'Diese PV-Fläche ist gesperrt und kann nicht bearbeitet werden.',

        // PV Type Extended
        'pvType.select': 'PV-Anlagentyp auswählen',
        'pvType.roofParallelDesc': 'Module parallel zur Dachfläche montiert',
        'pvType.roofMountedTitle': 'Dachanlage mit aufgeständerten Modulen',
        'pvType.fieldTitle': 'Freiflächenanlage',

        // Parameters Extended
        'param.azimuth2': 'Azimut 2 (°)',
        'param.tilt': 'Neigung (°)',
        'param.crossTilt': 'Querneigung (°)',
        'param.mountHeight': 'Höhe Module über Dachfläche (m)',
        'param.moduleHeightAboveGround': 'Höhe Module über Gelände (m)',
        'param.heightAboveReference': 'Höhe über Referenzhöhe (m)',
        'param.referenceHeight': 'Referenzhöhe / Geländeoberkante (m über NN)',
        'param.topEdge': 'Oberkante',
        'param.bottomEdge': 'Unterkante',
        'param.edgeDistance': 'Distanz Ober- zur Unterkante (m)',
        'param.swapEdges': 'Ober-/Unterkante tauschen',
        'param.effectiveAzimuth': 'Effektiver Azimut',
        'param.eastWest': 'Ost-West',
        'param.azimuthHelp': 'Der Azimut definiert die Ausrichtung der PV-Module.<br><br>360° Referenzsystem:<br>0° = Norden<br>90° = Osten<br>180° = Süden<br>270° = Westen',
        'param.azimuth2Help': 'Zweite Ausrichtung für Ost-West System. Automatisch 180° versetzt zur ersten Ausrichtung.',
        'param.tiltHelp': 'Die Neigung beschreibt den Winkel der PV-Module gegenüber der Horizontalen.<br><br>0° = horizontal (flach)<br>90° = vertikal (senkrecht)',
        'param.crossTiltHelp': 'Die Querneigung beschreibt die Neigung entlang der Tischachse (orthogonal zum Azimut).',
        'param.mountHeightHelp': 'Höhe der aufgeständerten Module über der Dachfläche.',
        'param.facadeTiltHelp': 'Neigungswinkel zur Horizontalen. 0° = horizontal, 90° = vertikal.',
        'param.referenceHeightHelp': 'Referenzhöhe über NN: Höhe des Geländes über dem Meeresspiegel.',
        'param.referenceHeightRoofHelp': 'Referenzhöhe über NN: Höhe des Geländes über dem Meeresspiegel. Auto-Calculate ermittelt die Höhe über Google Elevation API.',
        'param.heightAboveGroundHelp': 'Höhe der PV-Fläche über der Referenzhöhe (Geländeoberkante).',
        'param.fieldMountHeightHelp': 'Höhe der aufgeständerten Module über dem Gelände.',
        'param.moduleAzimuthHelp': 'Modul-Ausrichtung (Azimut): Die Himmelsrichtung, in die die PV-Module blicken.',
        'param.moduleTiltHelp': 'Neigungswinkel der PV-Module: 0°=horizontal, 30-35°=typisch für Schrägdächer, 90°=vertikal.',
        'param.roofAzimuthHelp': 'Modul-Ausrichtung (Azimut): Die Himmelsrichtung, in die die PV-Module blicken. Auto-Calculate berechnet dies aus der gezeichneten Oberkante.',
        'param.heightCalcHelp': 'Höhenberechnung bei dachparallelen PV-Flächen: Die drei Werte Neigung, Höhe Oberkante und Höhe Unterkante sind mathematisch verknüpft.',
        'param.topEdgeHelp': 'Oberkante der PV-Fläche (Türkis): Die höher gelegene Kante der PV-Fläche.',
        'param.bottomEdgeHelp': 'Unterkante der PV-Fläche (Orange): Die tiefer gelegene Kante der PV-Fläche.',
        'param.verticalDistanceHelp': 'Senkrechte Distanz: Der rechtwinklige Abstand zwischen Ober- und Unterkante.',
        'param.swapEdgesHelp': 'PV-Flächen-Kanten vertauschen: Tauscht die Ober- und Unterkante der PV-Fläche.',
        'param.facadeAzimuthHelp': 'Ausrichtung der reflektierenden Seite (orange markiert).',

        // Corner Details Extended
        'corner.roofHeights': 'Dachhöhen eingeben',
        'corner.heights': 'Eckpunkt-Höhen',
        'corner.heightsSaved': 'Eckpunkt-Höhen wurden gespeichert',
        'corner.heightPlaceholder': 'Höhe in m',
        'corner.fetchHeights': 'Höhen automatisch aus Google Elevation API abrufen',
        'corner.fetchHeightsNow': 'Höhen jetzt abrufen',
        'corner.heightAboveSeaLevel': 'Höhe über NN (Normalnull)',
        'corner.deletePoint': 'Eckpunkt löschen',
        'corner.description': 'Definieren Sie die Höhen der einzelnen Eckpunkte. Die Werte werden automatisch auf eine Best-Fit-Ebene projiziert.',
        'corner.enterHeightsPrompt': '➤ Geben Sie die Höhen der Dacheckpunkte ein!',
        'corner.heightInstructions': 'In der Spalte "Höhe über GOK" (grün markiert) tragen Sie die tatsächlichen Höhen der Dacheckpunkte über dem Gelände ein.',
        'corner.whatIsBestFit': 'Was ist die Best-Fit-Ebene?',
        'corner.gokLabel': 'GOK = Geländeoberkante',
        'corner.bestFit': 'Best-Fit',
        'corner.resultingHeight': 'Resultierende Höhe (Best-Fit)',
        'corner.enterHeight': 'Höhe eingeben',

        // Topography Extended
        'topo.check': 'Topografie prüfen',
        'topo.skipMessage': 'Sie können die Topografie später über "Geländehöhe verwalten" definieren',
        'topo.confirmed': 'Topografie bestätigt',

        // Grid Extended
        'grid.recalculate': 'Raster neu berechnen',
        'grid.updateRequired': 'Raster-Update erforderlich!',
        'grid.geometryChanged': 'Die Flächengeometrie wurde geändert. Klicken Sie auf "Raster neu berechnen", um die Stützpunkte und Höhen zu aktualisieren.',
        'grid.updated': 'Raster und Höhen wurden erfolgreich aktualisiert',
        'grid.quickAnalysisHint': 'Für eine schnelle Analyse nutzen Sie das 100 m Raster',

        // Import/Export Extended
        'import.selectFile': 'Bitte wählen Sie eine Datei aus',
        'import.noValidPoints': 'Keine gültigen Punkte in der Datei gefunden oder alle Punkte liegen außerhalb der PV-Fläche',
        'import.noPointsInArea': 'Keine gültigen Punkte innerhalb der Fläche gefunden',
        'export.kml': 'KML Exportieren',

        // Error Messages Extended
        'error.invalidCoordinates': 'Bitte geben Sie gültige Koordinaten ein',
        'error.minPoints': 'Eine PV-Fläche muss mindestens 3 Eckpunkte haben.',
        'error.noPVArea': 'Keine PV-Fläche gefunden',
        'error.heightDataFetch': 'Fehler beim Abrufen der Höhendaten',

        // Support Points Extended
        'support.deleteAll': 'Alle Stützpunkte löschen?',

        // Delete Extended
        'delete.confirmPVWithName': 'Möchten Sie die PV-Fläche "<strong>{name}</strong>" wirklich löschen?',

        // Module Extended
        'module.deleteTitle': 'Modultyp löschen',

        // Drawing Instructions
        'draw.howToDraw': 'So zeichnen Sie die Fläche:',
        'draw.howToDrawVertical': 'So zeichnen Sie die vertikale PV-Fläche:',
        'draw.escToCancel': 'Mit <kbd>ESC</kbd> können Sie jederzeit abbrechen',
        'draw.tip': 'Tipp:',

        // Roof Parallel
        'draw.roofParallel.title': 'Dachparallele PV-Fläche',
        'draw.roofParallel.step1': 'Zeichnen Sie die erste Linie entlang der oberen oder unteren Kante der PV-Fläche',
        'draw.roofParallel.step2': 'Versuchen Sie die PV-Fläche so gut es geht mit einem Viereck zu erfassen',
        'draw.roofParallel.step3': 'Das Viereck kann nach Vollendung noch frei angepasst werden',
        'draw.roofParallel.tip1': 'Im Nachgang können Eckpunkte, Kantenpositionen und Kantenlängen angepasst werden',
        'draw.roofParallel.tip2': 'Mit der Funktion "PV-Fläche ausschließen" können Sie noch Bereiche ausschließen (z.B. Dachfenster, Schornsteine etc.), die Sie ggf. überzeichnen',

        // Roof Mounted
        'draw.roofMounted.title': 'Aufgeständerte Dachanlage',
        'draw.roofMounted.step1': 'Klicken Sie nacheinander die Eckpunkte der Aufstellfläche',
        'draw.roofMounted.step2': 'Schließen Sie das Polygon mit Doppelklick',

        // Field
        'draw.field.title': 'Freiflächenanlage',
        'draw.field.step1': 'Klicken Sie nacheinander die Eckpunkte der Aufstellfläche',
        'draw.field.step2': 'Schließen Sie das Polygon mit Doppelklick',
        'draw.field.step3': 'Die Fläche kann nach Erstellung angepasst werden',
        'draw.field.stepAlt1': 'Umfahren Sie die gewünschte Fläche mit Klicks',

        // Facade
        'draw.facade.title': 'Fassadenanlage / Vertikale PV',
        'draw.facade.step1': 'Klicken Sie auf den <strong>Startpunkt</strong>',
        'draw.facade.step2': 'Klicken Sie auf den <strong>Endpunkt</strong>',
        'draw.facade.step3': 'Eine <span style="color: #FF8C00; font-weight: bold;">orange Linie</span> zeigt die reflektierende Seite',
        'draw.facade.tip': 'Die Zeichenrichtung bestimmt die Ausrichtung. Von links nach rechts = Südausrichtung.',

        // Search
        'search.title': 'Adresssuche',
        'search.placeholder': 'Adresse oder Koordinaten eingeben...',
        'search.button': 'Suchen',
        'search.tip': 'Tipp:',
        'search.tipCoordinates': 'Auch Koordinaten möglich',
        'search.formatExample': 'Format: 48.1351, 11.5820 oder 48.1351 11.5820',
        'search.exampleAddress': 'z.B. Marienplatz, München',
        'search.searching': 'Suche läuft...',
        'search.noResults': 'Keine Ergebnisse gefunden',
        'search.error': 'Fehler bei der Suche',
        'search.invalidCoordinates': 'Ungültige Koordinaten. Bitte verwenden Sie das Format: Breitengrad, Längengrad',
        'search.locationFound': 'Standort gefunden',

        // Topography Source
        'topo.source': 'Topografie-Quelle',
        'topo.title': 'Höhendaten-Quelle wählen',
        'topo.required': 'Bitte wählen Sie zuerst eine Höhendaten-Quelle',
        'topo.requiredMessage': 'Um fortzufahren, müssen Sie zunächst eine Höhendaten-Quelle auswählen. Diese wird benötigt, um Geländehöhen für Ihre PV-Flächen und Betrachtungspunkte zu bestimmen.',
        'topo.intro': 'Wählen Sie eine Quelle für die Geländehöhendaten. Falls Sie keine eigenen Höhendaten haben, verwenden Sie einfach Google.',
        'topo.googleApi': 'Google Elevation API',
        'topo.googleApiDesc': 'Automatische Höhenbestimmung weltweit verfügbar',
        'topo.googleApiDetail': 'Schnell und einfach, keine Datei erforderlich',
        'topo.customData': 'Eigene präzise Höhendaten',
        'topo.customDataDesc': 'Für beste Ergebnisse: DGM1, LiDAR oder eigene Vermessungsdaten',
        'topo.customDataDetail': 'Upload als GeoTIFF oder XYZ (ASCII)',
        'topo.uploadFile': 'Datei hochladen',
        'topo.dragDrop': 'Datei hier ablegen oder klicken zum Auswählen',
        'topo.fileFormats': 'Unterstützte Formate: GeoTIFF (.tif, .tiff), XYZ (.xyz, .txt)',
        'topo.coordinateSystem': 'Koordinatensystem: EPSG:4326 (WGS84) empfohlen',
        'topo.minResolution': 'Unterstützte Auflösung: 1 bis 50 Meter Gitterweite',
        'topo.bestPractice': 'Beste Ergebnisse mit DGM1 (1m Raster) oder vergleichbaren hochauflösenden Geländemodellen',
        'topo.warning': 'Hinweis: Objekte können nur im Bereich der hochgeladenen Höhendaten platziert werden.',
        'topo.fileSelected': 'Datei: {filename}',
        'topo.processing': 'Datei wird verarbeitet...',
        'topo.success': 'Höhendaten erfolgreich geladen',
        'topo.error': 'Fehler beim Laden der Höhendaten',
        'topo.invalidResolution': 'Ungültige Auflösung. Unterstützt werden 1m bis 50m Gitterweite.',
        'topo.invalidFormat': 'Ungültiges Dateiformat. Bitte GeoTIFF oder XYZ verwenden.',
        'topo.geotiffNotSupported': 'GeoTIFF-Bibliothek konnte nicht geladen werden.',
        'topo.noValidData': 'Keine gültigen Höhendaten in der GeoTIFF-Datei gefunden.',
        'topo.boundingBox': 'Abgedeckter Bereich',
        'topo.resolution': 'Auflösung',
        'topo.changeSource': 'Quelle ändern',
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
        'module.addNew': 'New Module Type',
        'module.edit': 'Edit',
        'module.editType': 'Edit Module Type',
        'module.delete': 'Delete',
        'module.save': 'Save',
        'module.cancel': 'Cancel',
        'module.namePlaceholder': 'e.g. Standard Module',
        'module.nameRequired': 'Please enter a name',
        'module.nameDuplicate': 'A module type with this name already exists',
        'module.beamSpread': 'Beam Spread',
        'module.usage': 'Usage',
        'module.protected': 'Protected',
        'module.reflectionProfile': 'Reflection Profile (Luminance in cd/m² at 100,000 lx irradiance)',
        'module.incidentAngle': 'Incident Angle',
        'module.luminance': 'Luminance',
        'module.noProfile': 'No reflection profile defined',
        'module.noTypes': 'No module types available',
        'module.created': 'Module type created',
        'module.updated': 'Module type updated',
        'module.deleted': 'Module type deleted',
        'module.deleteConfirm': 'Do you really want to delete the module type "<strong>{name}</strong>"?',
        'module.deleteInUse': 'The module type "<strong>{name}</strong>" is currently used by <strong>{count} PV area{plural}</strong>.',
        'module.area': '',
        'module.areas': 's',

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
        'common.apply': 'Apply',
        'common.details': 'Details',
        'common.recommended': 'Recommended',

        // Menu
        'menu.main': 'Main Menu',
        'menu.backToMain': 'Back to Main Menu',
        'menu.pvAreas': 'PV Areas',
        'menu.observationPoints': 'Observation Points',
        'menu.excludedAreas': 'Excluded Areas',
        'menu.obstacles': 'Obstacles',
        'menu.selectFunction': 'Select a function from the menu to begin.',

        // PV List Extended
        'pvList.existing': 'Existing PV Areas:',
        'pvList.exampleNameRoof': 'South Roof House A',
        'pvList.exampleNameRoof2': 'North Surface Barn',
        'pvList.exampleNameFacade': 'South Facade Building 1',
        'pvList.nameHelp': 'Optional name: Give the PV area a name for better identification.',
        'pvList.dimension': 'Dimension',
        'pvList.duplicated': 'PV area has been duplicated!',
        'pvList.lockedHelp': 'PV area is locked. Unlock the PV area via the lock button in the PV list.',
        'pvList.lockedEditHelp': 'PV area is locked. Unlock the PV area via the lock button in the PV list to edit coordinates.',
        'pvList.lockedAlert': 'This PV area is locked and cannot be edited.',

        // PV Type Extended
        'pvType.select': 'Select PV System Type',
        'pvType.roofParallelDesc': 'Modules mounted parallel to roof surface',
        'pvType.roofMountedTitle': 'Roof System with Tilted Modules',
        'pvType.fieldTitle': 'Ground-Mounted System',

        // Parameters Extended
        'param.azimuth2': 'Azimuth 2 (°)',
        'param.tilt': 'Tilt (°)',
        'param.crossTilt': 'Cross Tilt (°)',
        'param.mountHeight': 'Module Height Above Roof (m)',
        'param.moduleHeightAboveGround': 'Module Height Above Ground (m)',
        'param.heightAboveReference': 'Height Above Reference (m)',
        'param.referenceHeight': 'Reference Height / Ground Level (m MSL)',
        'param.topEdge': 'Top Edge',
        'param.bottomEdge': 'Bottom Edge',
        'param.edgeDistance': 'Distance Top to Bottom Edge (m)',
        'param.swapEdges': 'Swap Top/Bottom Edges',
        'param.effectiveAzimuth': 'Effective Azimuth',
        'param.eastWest': 'East-West',
        'param.azimuthHelp': 'Azimuth defines the orientation of PV modules.<br><br>360° reference:<br>0° = North<br>90° = East<br>180° = South<br>270° = West',
        'param.azimuth2Help': 'Second orientation for East-West system. Automatically offset 180° from first orientation.',
        'param.tiltHelp': 'Tilt describes the angle of PV modules relative to horizontal.<br><br>0° = horizontal (flat)<br>90° = vertical (upright)',
        'param.crossTiltHelp': 'Cross tilt describes the tilt along the table axis (orthogonal to azimuth).',
        'param.mountHeightHelp': 'Height of tilted modules above roof surface.',
        'param.facadeTiltHelp': 'Tilt angle to horizontal. 0° = horizontal, 90° = vertical.',
        'param.referenceHeightHelp': 'Reference height MSL: Terrain elevation above sea level.',
        'param.referenceHeightRoofHelp': 'Reference height MSL: Terrain elevation above sea level. Auto-Calculate retrieves height via Google Elevation API.',
        'param.heightAboveGroundHelp': 'Height of PV area above reference height (ground level).',
        'param.fieldMountHeightHelp': 'Height of tilted modules above ground.',
        'param.moduleAzimuthHelp': 'Module orientation (Azimuth): The compass direction the PV modules face.',
        'param.moduleTiltHelp': 'Module tilt angle: 0°=horizontal, 30-35°=typical for pitched roofs, 90°=vertical.',
        'param.roofAzimuthHelp': 'Module orientation (Azimuth): The compass direction the PV modules face. Auto-Calculate determines this from the drawn top edge.',
        'param.heightCalcHelp': 'Height calculation for roof-parallel PV areas: The three values tilt, top edge height, and bottom edge height are mathematically linked.',
        'param.topEdgeHelp': 'Top edge of PV area (Turquoise): The higher edge of the PV area.',
        'param.bottomEdgeHelp': 'Bottom edge of PV area (Orange): The lower edge of the PV area.',
        'param.verticalDistanceHelp': 'Vertical distance: The perpendicular distance between top and bottom edge.',
        'param.swapEdgesHelp': 'Swap PV area edges: Swaps the top and bottom edges of the PV area.',
        'param.facadeAzimuthHelp': 'Orientation of the reflecting side (marked in orange).',

        // Corner Details Extended
        'corner.roofHeights': 'Enter Roof Heights',
        'corner.heights': 'Corner Point Heights',
        'corner.heightsSaved': 'Corner point heights have been saved',
        'corner.heightPlaceholder': 'Height in m',
        'corner.fetchHeights': 'Automatically retrieve heights from Google Elevation API',
        'corner.fetchHeightsNow': 'Retrieve heights now',
        'corner.heightAboveSeaLevel': 'Height above MSL (Mean Sea Level)',
        'corner.deletePoint': 'Delete corner point',
        'corner.description': 'Define the heights of individual corner points. Values are automatically projected onto a best-fit plane.',
        'corner.enterHeightsPrompt': '➤ Enter the roof corner point heights!',
        'corner.heightInstructions': 'In the "Height above GL" column (marked in green), enter the actual heights of the roof corner points above ground.',
        'corner.whatIsBestFit': 'What is the Best-Fit Plane?',
        'corner.gokLabel': 'GL = Ground Level',
        'corner.bestFit': 'Best-Fit',
        'corner.resultingHeight': 'Resulting Height (Best-Fit)',
        'corner.enterHeight': 'Enter height',

        // Topography Extended
        'topo.check': 'Check Topography',
        'topo.skipMessage': 'You can define topography later via "Manage Terrain Height"',
        'topo.confirmed': 'Topography confirmed',

        // Grid Extended
        'grid.recalculate': 'Recalculate Grid',
        'grid.updateRequired': 'Grid Update Required!',
        'grid.geometryChanged': 'Area geometry has changed. Click "Recalculate Grid" to update support points and heights.',
        'grid.updated': 'Grid and heights have been successfully updated',
        'grid.quickAnalysisHint': 'For quick analysis, use the 100 m grid',

        // Import/Export Extended
        'import.selectFile': 'Please select a file',
        'import.noValidPoints': 'No valid points found in file or all points are outside the PV area',
        'import.noPointsInArea': 'No valid points found within the area',
        'export.kml': 'Export KML',

        // Error Messages Extended
        'error.invalidCoordinates': 'Please enter valid coordinates',
        'error.minPoints': 'A PV area must have at least 3 corner points.',
        'error.noPVArea': 'No PV area found',
        'error.heightDataFetch': 'Error retrieving height data',

        // Support Points Extended
        'support.deleteAll': 'Delete all support points?',

        // Delete Extended
        'delete.confirmPVWithName': 'Do you really want to delete the PV area "<strong>{name}</strong>"?',

        // Module Extended
        'module.deleteTitle': 'Delete Module Type',

        // Drawing Instructions
        'draw.howToDraw': 'How to draw the area:',
        'draw.howToDrawVertical': 'How to draw the vertical PV area:',
        'draw.escToCancel': 'Press <kbd>ESC</kbd> to cancel at any time',
        'draw.tip': 'Tip:',

        // Roof Parallel
        'draw.roofParallel.title': 'Roof-Parallel PV Area',
        'draw.roofParallel.step1': 'Draw the first line along the top or bottom edge of the PV area',
        'draw.roofParallel.step2': 'Try to capture the PV area as well as possible with a quadrilateral',
        'draw.roofParallel.step3': 'The quadrilateral can be freely adjusted after completion',
        'draw.roofParallel.tip1': 'Corner points, edge positions and edge lengths can be adjusted afterwards',
        'draw.roofParallel.tip2': 'Use the "Exclude PV Area" function to exclude areas (e.g. roof windows, chimneys, etc.) that you may have drawn over',

        // Roof Mounted
        'draw.roofMounted.title': 'Roof-Mounted System',
        'draw.roofMounted.step1': 'Click the corner points of the installation area in sequence',
        'draw.roofMounted.step2': 'Close the polygon with a double-click',

        // Field
        'draw.field.title': 'Ground-Mounted System',
        'draw.field.step1': 'Click the corner points of the installation area in sequence',
        'draw.field.step2': 'Close the polygon with a double-click',
        'draw.field.step3': 'The area can be adjusted after creation',
        'draw.field.stepAlt1': 'Click around the desired area',

        // Facade
        'draw.facade.title': 'Facade System / Vertical PV',
        'draw.facade.step1': 'Click on the <strong>start point</strong>',
        'draw.facade.step2': 'Click on the <strong>end point</strong>',
        'draw.facade.step3': 'An <span style="color: #FF8C00; font-weight: bold;">orange line</span> shows the reflecting side',
        'draw.facade.tip': 'The drawing direction determines the orientation. Left to right = South orientation.',

        // Search
        'search.title': 'Address Search',
        'search.placeholder': 'Enter address or coordinates...',
        'search.button': 'Search',
        'search.tip': 'Tip:',
        'search.tipCoordinates': 'Coordinates also supported',
        'search.formatExample': 'Format: 48.1351, 11.5820 or 48.1351 11.5820',
        'search.exampleAddress': 'e.g. Marienplatz, Munich',
        'search.searching': 'Searching...',
        'search.noResults': 'No results found',
        'search.error': 'Search error',
        'search.invalidCoordinates': 'Invalid coordinates. Please use format: Latitude, Longitude',
        'search.locationFound': 'Location found',

        // Topography Source
        'topo.source': 'Topography Source',
        'topo.title': 'Select Elevation Data Source',
        'topo.required': 'Please select an elevation data source first',
        'topo.requiredMessage': 'To continue, you must first select an elevation data source. This is required to determine terrain heights for your PV areas and observation points.',
        'topo.intro': 'Choose a source for terrain elevation data. If you don\'t have your own elevation data, simply use Google.',
        'topo.googleApi': 'Google Elevation API',
        'topo.googleApiDesc': 'Automatic elevation determination available worldwide',
        'topo.googleApiDetail': 'Quick and easy, no file required',
        'topo.customData': 'Custom High-Precision Elevation Data',
        'topo.customDataDesc': 'For best results: DTM1, LiDAR or custom survey data',
        'topo.customDataDetail': 'Upload as GeoTIFF or XYZ (ASCII)',
        'topo.uploadFile': 'Upload File',
        'topo.dragDrop': 'Drop file here or click to select',
        'topo.fileFormats': 'Supported formats: GeoTIFF (.tif, .tiff), XYZ (.xyz, .txt)',
        'topo.coordinateSystem': 'Coordinate system: EPSG:4326 (WGS84) recommended',
        'topo.minResolution': 'Supported resolution: 1 to 50 meter grid spacing',
        'topo.bestPractice': 'Best results with DTM1 (1m grid) or comparable high-resolution terrain models',
        'topo.warning': 'Note: Objects can only be placed within the uploaded elevation data coverage area.',
        'topo.fileSelected': 'File: {filename}',
        'topo.processing': 'Processing file...',
        'topo.success': 'Elevation data successfully loaded',
        'topo.error': 'Error loading elevation data',
        'topo.invalidResolution': 'Invalid resolution. Supported range: 1m to 50m grid spacing.',
        'topo.invalidFormat': 'Invalid file format. Please use GeoTIFF or XYZ.',
        'topo.geotiffNotSupported': 'GeoTIFF library could not be loaded.',
        'topo.noValidData': 'No valid elevation data found in GeoTIFF file.',
        'topo.boundingBox': 'Coverage Area',
        'topo.resolution': 'Resolution',
        'topo.changeSource': 'Change Source',
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
