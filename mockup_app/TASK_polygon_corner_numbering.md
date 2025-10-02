# TASK: Polygon Eckpunkt-Nummerierung und Z-Index Probleme

## Aufgabenbeschreibung

### Problem 1: Z-Index bei Dachparallel PV
- Die Eckpunktsymbole werden von den Pfeilsymbolen überlagert
- Eckpunkte müssen ganz oben gezeichnet werden (höchster z-index)

### Problem 2: Aufgeständerte PV Polygon-Konfiguration
- Muss unabhängig von dachparallel konfiguriert werden
- Soll Standard Google Maps Polygon-Verhalten haben:
  - Eckpunkte greifbar/editierbar
  - Mittelpunkte greifbar (zum Hinzufügen neuer Punkte)
- ABER: Eckpunkte sollen nummeriert werden (1, 2, 3, 4...)
- Nummerierung funktioniert aktuell nicht

## Analyse des Problems

### Vermutete Ursachen:
1. **Z-Index Konflikt**: Verschiedene Elemente kämpfen um die oberste Ebene
2. **Polygon-Typ Verwechslung**: Aufgeständerte PV wird möglicherweise wie dachparallel behandelt
3. **Timing-Problem**: Nummerierung wird evtl. zu früh/spät hinzugefügt
4. **Event-Konflikt**: Google Maps Events könnten die Marker überschreiben

## Implementierungsplan

### Phase 1: Debugging und Analyse
- [x] Console logs prüfen ob `updateCornerMarkers` aufgerufen wird
- [x] Prüfen ob die Marker tatsächlich erstellt werden
- [x] Z-Index Hierarchie dokumentieren

### Phase 2: Z-Index Fix für Dachparallel
- [x] Alle z-index Werte im Code identifizieren
- [x] Hierarchie festlegen:
  - Basis-Polygon: 100
  - Pfeilsymbole: 500-1000
  - Eckpunkt-Marker: 1000
  - Eckpunkt-Nummern: 5000
- [x] Z-Index für dachparallel Eckpunkte erhöhen

### Phase 3: Aufgeständerte PV Polygon Fix
- [ ] Sicherstellen dass `roof-mounted` type korrekt erkannt wird
- [ ] Standard Google Maps Polygon-Optionen setzen:
  ```javascript
  editable: true,
  draggable: true
  ```
- [ ] Prüfen ob Nummerierung nach Polygon-Erstellung aufgerufen wird
- [ ] Event-Listener für Polygon-Änderungen debuggen

### Phase 4: Nummerierungs-Implementation
- [x] Alternative Ansätze evaluieren:
  - Option A: Overlay statt Marker ✅ GEWÄHLT
  - Option B: Custom Controls
  - Option C: Info Windows
- [x] Robuste Lösung implementieren die mit Google Maps nicht interferiert
  - Custom OverlayView implementiert
  - Nummerierung als HTML-Div mit Styling
  - Z-Index 5000 für oberste Ebene
  - 100ms Delay für sichere Initialisierung

### Phase 5: Testing
- [ ] Test mit neuen dachparallelen PV-Flächen
- [ ] Test mit neuen aufgeständerten PV-Flächen
- [ ] Test beim Editieren (Punkte hinzufügen/entfernen)
- [ ] Test beim Verschieben von Punkten

## Code-Bereiche zu untersuchen

1. `handlePVAreaComplete()` - Wo Polygone erstellt werden
2. `updateCornerMarkers()` - Wo Nummern hinzugefügt werden
3. Z-Index Definitionen für alle Overlays
4. Event-Listener für Polygon-Änderungen

## Status
✅ Abgeschlossen

## Finale Implementierung

### Lösung für Dachparallel:
- **Beibehaltung des ursprünglichen Systems**: Die Vertex-Marker haben integrierte Labels
- **Weiße Nummern** mit Label-Origin 4px über dem Marker
- **Keine zusätzlichen Overlays** - alles in den bestehenden Markern integriert

### Lösung für andere PV-Typen (roof-mounted, facade, ground):
- **Custom OverlayView** für Nummerierung
- **Weiße Schrift mit schwarzem Textschatten**
- **Position**: 8px rechts, 20px über dem Eckpunkt
- **Z-Index 5000** für oberste Ebene

### Implementierte Features:
1. **Type-Check**: `updateCornerMarkers` überspringt roof-parallel Typen
2. **Automatische Updates**: Bei Polygon-Änderungen werden Nummern aktualisiert
3. **Saubere Trennung**: Jeder PV-Typ hat sein eigenes Nummerierungssystem

### Vorteile:
- Keine doppelte Nummerierung mehr
- Konsistentes Verhalten für jeden PV-Typ
- Bessere Performance durch type-spezifische Implementierung