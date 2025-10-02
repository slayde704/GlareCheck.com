# CLAUDE.md - Glare Simulation Mockup App

## Projektübersicht

Dies ist eine webbasierte Mockup-Anwendung für die Simulation von Solarblendungen (Glare) bei Photovoltaik-Anlagen. Die App ermöglicht es Benutzern, PV-Flächen auf einer Google Maps-Karte zu zeichnen und deren Parameter für Glare-Berechnungen zu konfigurieren.

## Technologie-Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **UI Framework**: Bootstrap 5.1.3
- **Karten**: Google Maps JavaScript API mit Drawing Library
- **Icons**: Font Awesome 6.0.0, Bootstrap Icons 1.11.2
- **Backend**: Python Flask (einfacher Entwicklungsserver)

## Hauptfunktionen

### 1. PV-Flächen Management
- Zeichnen von PV-Flächen auf Google Maps
- Verschiedene PV-Typen: Dachparallel, Aufgeständert, Fassade, Freifläche
- Bearbeitung von Geometrie durch Drag & Drop
- Rotation von PV-Flächen mit präziser Orthogonalität

### 2. Parameter-Konfiguration
- **Azimut**: Ausrichtung der PV-Fläche (0-360°)
- **Neigung**: Tilt-Winkel (0-89°)
- **Höhen**: Oberkante/Unterkante mit Auto-Berechnung
- **Modultyp**: Verschiedene Reflexionsprofile

### 3. Spezielle Features
- **Auto-Calculate**: Automatische Berechnung von Neigung/Höhen basierend auf Geometrie
- **Modultyp-Verwaltung**: CRUD-Operationen für Modultypen mit Reflexionsprofilen
- **Dezimaltrennzeichen**: Unterstützung für Komma und Punkt
- **Bootstrap Modals**: Für Benutzerinteraktionen statt Alerts

## Kürzlich implementierte Features (Dezember 2024)

### Rotation Mechanism
- **Pixel-perfekte Rotation**: Alle Berechnungen im Pixel-Koordinatensystem für präzise Orthogonalität
- **Vektor w**: Orthogonale Verbindung zwischen Oberkante (P1-P2) und Unterkante (P3-P4)
- **Intuitive Bedienung**: Roter Pfeil folgt der Maus, PV-Fläche rotiert entsprechend

### UI Verbesserungen
- Checkbox-basiertes Auto-Calculate System (ersetzt Radio-Buttons)
- Verbesserte Validierung mit Bootstrap Modals
- Farbcodierte Kanten: Türkis (Oberkante), Orange (Unterkante)
- Doppelpfeil-Symbole zeigen erlaubte Bewegungsrichtungen

## Wichtige Dateien

- `/templates/index.html` - Haupt-HTML mit gesamtem JavaScript
- `/templates/module_types.json` - Modultyp-Definitionen
- `/app.py` - Flask Server

## Bekannte Probleme & Lösungen

### initMap Fehler
- Google Maps API kann initMap nicht finden
- Lösung: Sicherheits-Wrapper und explizite window.initMap Zuweisung

### Geometrische Verzerrung
- Lat/Lng Koordinaten verzerren bei verschiedenen Breitengraden
- Lösung: Berechnungen im Pixel-Raum durchführen

## Entwicklungshinweise

1. **Dezimaltrennzeichen**: Immer `.replace(',', '.')` vor parseFloat verwenden
2. **Rotation**: Verwende Pixel-Koordinaten für präzise geometrische Berechnungen
3. **Modals**: Vorherige Modals schließen bevor neue geöffnet werden (vermeidet Stacking)
4. **Validierung**: Leere Namen und Duplikate verhindern

## Nächste Schritte

- Integration mit Backend-API für echte Glare-Berechnungen
- Beobachtungspunkte (Observation Points) implementieren
- Export/Import Funktionalität
- Mehrsprachigkeit

## Letzte Aktualisierung

Januar 2025 - Eckpunkt-Höhen Management mit Best-Fit-Ebene implementiert

## Workflow-Regeln für Claude

### 1. Bei jeder neuen Aufgabe:
- Erstelle eine `TASK_[beschreibung].md` Datei
- Dokumentiere Aufgabenbeschreibung, Implementierungsplan und Status
- Nutze Checkboxen für Teil-Aufgaben

### 2. Todo-Listen Management:
- Pflege `TODO.md` aktiv mit aktuellen Status
- Verschiebe abgeschlossene Tasks in "Completed" Sektion
- Halte Prioritäten aktuell

### 3. CLAUDE.md Updates:
- Aktualisiere bei jeder größeren Änderung
- Dokumentiere neue Features und Breaking Changes
- Halte "Letzte Aktualisierung" aktuell

### 4. Commit-Nachrichten:
- Referenziere relevante TASK-Dateien
- Nutze klare, beschreibende Nachrichten