# TODO - Glare Simulation Mockup App

## Aktueller Status
Stand: Januar 2025

✅ **Abgeschlossene Aufgaben**
- [x] Rotation-Mechanismus mit perfekter Orthogonalität
- [x] Checkbox-basiertes Auto-Calculate System
- [x] Dezimaltrennzeichen-Unterstützung
- [x] Bootstrap Modal statt Alerts
- [x] Modultyp-Verwaltung mit CRUD
- [x] Farbcodierte Kanten für bessere Visualisierung
- [x] PV Array Funktionen entfernt
- [x] Info-Icons für Azimut, Neigung und Bezeichnung
- [x] Querneigung (Cross Tilt) implementiert
- [x] Effektive Werte Berechnung
- [x] Eckpunkt-Höhen Management mit Best-Fit-Ebene
- [x] Permanente Eckpunkt-Nummerierung
- [x] TypeError beim Eckpunkt-Höhen Dialog behoben
- [x] Automatische Aktualisierung des Eckpunkt-Höhen Dialogs bei Polygon-Änderungen
- [x] Bearbeitungselemente beim Sperren verstecken (inkl. Nummerierungen)

## 🚧 In Bearbeitung
- [ ] Beobachtungspunkte (Observation Points) vollständig implementieren
- [ ] Export/Import Funktionalität für Projekte

## 📋 Offene Aufgaben

### High Priority
1. **Beobachtungspunkte vervollständigen**
   - UI für Beobachtungspunkt-Parameter
   - Höhenangaben (Beobachter/Objekt)
   - Visuelle Darstellung auf der Karte

2. **Backend-Integration**
   - API-Endpoints verbinden
   - Authentifizierung implementieren
   - Fehlerbehandlung verbessern

3. **Simulation starten**
   - Validierung aller Parameter
   - Progress-Anzeige
   - Ergebnis-Darstellung

### Medium Priority
4. **Export/Import**
   - JSON Export der aktuellen Konfiguration
   - Import von gespeicherten Projekten
   - Validierung beim Import

5. **Erweiterte Features**
   - Mehrere PV-Arrays auf einer Fläche
   - Verschattungsobjekte
   - Ausschlusszonen definieren

6. **UI/UX Verbesserungen**
   - Dark Mode
   - Responsive Design für Mobile
   - Keyboard Shortcuts
   - Undo/Redo Funktionalität

### Low Priority
7. **Dokumentation**
   - API-Dokumentation
   - Benutzerhandbuch
   - Video-Tutorials

8. **Internationalisierung**
   - Englische Übersetzung
   - Sprachauswahl
   - Lokalisierte Zahlenformate

9. **Performance**
   - Optimierung für große Projekte
   - Caching-Strategien
   - Progressive Web App Features

## 🐛 Bekannte Bugs
1. **initMap Fehler** - Gelegentliche Probleme beim Laden der Google Maps API
   - Workaround implementiert
   - Langfristige Lösung erforderlich

2. **Modal Stacking** - Bei schnellem Öffnen mehrerer Modals
   - Teilweise behoben
   - Weitere Tests erforderlich

## 💡 Ideen für die Zukunft
- 3D-Visualisierung der PV-Anlagen
- Echtzeit-Kollaboration
- Integration mit Wetterdaten
- Mobile App
- Automatische Flächenerkennung aus Satellitenbildern

## 📝 Notizen
- Google Maps API Key sollte in Umgebungsvariable ausgelagert werden
- Module types JSON könnte in Datenbank migriert werden
- Consider WebSocket für Echtzeit-Updates