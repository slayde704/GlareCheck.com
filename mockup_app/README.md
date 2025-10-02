# Glare Simulation Mockup App

Eine interaktive Web-App mit Google Maps zum Erstellen von Simulationsrequests für das Glare Analysis Tool.

## Features

- 🗺️ **Google Maps Integration**
  - Zeichnen von PV-Flächen als Polygone (verschiedene Typen)
  - Setzen von Beobachtungspunkten als Marker
  - Satelliten- und Kartenansicht
  - Ortungsbasierte Suche

- 🎨 **Intuitive Benutzeroberfläche**
  - Drei Modi: PV-Fläche zeichnen, Beobachter setzen, Ansicht
  - Echtzeit-Updates der gezeichneten Elemente
  - Rechtsklick-Kontextmenü für erweiterte Optionen
  - Bootstrap-basiertes modernes Design

- ⚙️ **Erweiterte PV-Konfiguration**
  - **PV-Typen**: Dachparallel, Aufgeständert, Fassade, Freifläche
  - **Parameter**: Azimut (0-360°), Neigung (0-89°)
  - **Höhenberechnung**: Automatische Berechnung von Oberkante/Unterkante
  - **Modultypen**: Verschiedene Reflexionsprofile (Standard, Anti-Glare)
  - **Rotation**: Präzise Rotation mit orthogonaler Ausrichtung

- 🔧 **Neue Features (Dezember 2024)**
  - Checkbox-basiertes Auto-Calculate System
  - Dezimaltrennzeichen-Unterstützung (Komma und Punkt)
  - Verbesserte Validierung mit Bootstrap Modals
  - Farbcodierte Kanten (Türkis: Oberkante, Orange: Unterkante)
  - Pixel-perfekte Rotation für geometrische Präzision

- 🚀 **Simulation & Export**
  - Direkte Simulation mit dem Backend
  - Export als JSON für spätere Verwendung
  - Vollständige Integration mit dem Glare Analysis Tool

## Installation

1. **Google Maps API Key**:
   - Besorgen Sie einen API Key von [Google Cloud Console](https://console.cloud.google.com/)
   - Aktivieren Sie "Maps JavaScript API" und "Drawing Library"
   - Ersetzen Sie `YOUR_API_KEY` in `templates/index.html`

2. **Dependencies installieren**:
   ```bash
   pip install -r mockup_app/requirements.txt
   ```

## Verwendung

1. **App starten**:
   ```bash
   cd mockup_app
   python app.py
   ```

2. **Browser öffnen**:
   - Navigieren Sie zu http://localhost:5000

3. **PV-Flächen zeichnen**:
   - Klicken Sie auf "PV-Fläche"
   - Zeichnen Sie ein Polygon auf der Karte
   - Passen Sie Azimut und Neigung an

4. **Beobachtungspunkte setzen**:
   - Klicken Sie auf "Beobachter"
   - Klicken Sie auf die Karte
   - Stellen Sie Höhen ein

5. **Simulation starten**:
   - Klicken Sie auf "Simulation starten"
   - Ergebnisse werden im `output/` Verzeichnis gespeichert

## API Endpoints

- `GET /` - Hauptseite mit Google Maps
- `POST /api/pv_area` - PV-Fläche hinzufügen
- `POST /api/observation_point` - Beobachtungspunkt hinzufügen
- `POST /api/simulate` - Simulation starten
- `GET /api/export` - Projekt als JSON exportieren
- `POST /api/clear` - Projekt löschen

## Beispiel JSON Export

```json
{
  "pv_areas": [{
    "name": "PV Area 1",
    "corners": [
      {"latitude": 48.1351, "longitude": 11.5820, "ground_elevation": 0},
      {"latitude": 48.1352, "longitude": 11.5821, "ground_elevation": 0},
      ...
    ]
  }],
  "list_of_pv_area_information": [{
    "azimuth": 180,
    "tilt": 30,
    "module_type": 0
  }],
  "list_of_ops": [{
    "name": "OP 1",
    "latitude": 48.1350,
    "longitude": 11.5819,
    "height_observer": 1.5,
    "height_object": 10.0
  }],
  "simulation_parameter": {
    "grid_width": 0.5,
    "resolution": 1,
    "glare_threshold": 50000
  }
}
```