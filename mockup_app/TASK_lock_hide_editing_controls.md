# TASK: Verstecke Bearbeitungs-Elemente beim Sperren von PV-Flächen

## Aufgabenbeschreibung
Wenn eine Dachanlage mit aufgeständerten Modulen gesperrt wird (durch den Knopf in der Toolbar), sollen alle Bearbeitungselemente verschwinden:
- Eckpunkt-Nummerierungen
- Eckpunkte (Marker)
- Mittelpunkt-Marker
- Damit kann der Benutzer die Form nicht mehr verändern

## Implementierung

### Änderungen in `togglePVLock` Funktion:

1. **Beim Sperren (Lock)**:
   - `polygon.setDraggable(false)` - Polygon kann nicht mehr verschoben werden
   - `polygon.setEditable(false)` - Polygon kann nicht mehr bearbeitet werden
   - Alle Marker werden versteckt (bereits implementiert)
   - **NEU**: Eckpunkt-Nummerierungen werden versteckt:
     ```javascript
     if (pvArea.cornerMarkers) {
         pvArea.cornerMarkers.forEach(overlay => {
             overlay.setMap(null);
         });
     }
     ```

2. **Beim Entsperren (Unlock)**:
   - Polygon wird wieder verschiebbar
   - Alle Marker werden wieder angezeigt
   - **NEU**: Eckpunkt-Nummerierungen werden wieder angezeigt:
     ```javascript
     if (pvArea.cornerMarkers) {
         pvArea.cornerMarkers.forEach(overlay => {
             overlay.setMap(map);
         });
     } else {
         // Re-create corner markers if they don't exist
         updateCornerMarkers(pvArea);
     }
     ```

## Betroffene Elemente beim Sperren:
- ✅ Polygon wird nicht verschiebbar (`draggable: false`)
- ✅ Eckpunkt-Marker werden versteckt
- ✅ Mittelpunkt-Marker werden versteckt
- ✅ Kanten-Verschiebe-Marker werden versteckt
- ✅ Rotations-Marker wird versteckt
- ✅ Azimut-Pfeil wird versteckt
- ✅ Eckpunkt-Nummerierungen werden versteckt
- ✅ Schloss-Icon wird in der Mitte angezeigt

## Status
✅ Abgeschlossen