# Glare Simulation Tool - Refactored Version

## Übersicht

Dies ist die komplett überarbeitete Version des Glare Simulation Tools mit modularer Architektur.

## Features

- ✅ **Modulare Architektur** - Saubere Trennung der Komponenten
- ✅ **Vollständige Testabdeckung** - Alle Module getestet
- ✅ **Fallback-Mechanismen** - Funktioniert ohne externe Dependencies
- ✅ **Performance-optimiert** - Vektorisierte Berechnungen
- ✅ **Rückwärtskompatibel** - Gleiche API wie Original

## Struktur

```
glare_simulation_refactored/
├── src/                      # Hauptcode
│   ├── config/              # Konfiguration & Models
│   ├── coordinates/         # Koordinaten-Transformation
│   ├── geometry/            # Geometrische Berechnungen
│   ├── sun_calculations/    # Sonnenstand-Berechnungen
│   ├── reflection/          # Reflexions-Berechnungen
│   ├── glare_analysis/      # Blendanalyse
│   ├── visualization/       # Visualisierung
│   ├── reporting/           # Report-Generierung
│   └── main.py             # Haupteinstiegspunkt
├── assets/                  # Statische Dateien
│   ├── module_reflection_profiles.csv
│   └── html_template.html
├── test_complete_system.py  # Kompletter Systemtest
└── test_main_workflow.py    # Workflow-Tests
```

## Installation

```bash
# Virtuelle Umgebung erstellen
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate     # Windows

# Dependencies installieren
pip install -r requirements.txt
```

## Verwendung

### Als Python-Modul

```python
from src.main import calculate_glare

# JSON-Daten vorbereiten
data = {
    "pv_areas": [...],
    "list_of_pv_area_information": [...],
    "list_of_ops": [...],
    "meta_data": {...},
    "simulation_parameter": {...}
}

# Berechnung durchführen
result = calculate_glare(data)
```

### Kommandozeile

```bash
# Eingebauter Test
python src/main.py

# Mit eigener JSON-Datei
python src/main.py --input data.json
```

### Tests ausführen

```bash
# Alle Workflow-Tests
python test_main_workflow.py

# Kompletter Systemtest mit Beispieldaten
python test_complete_system.py
```

## Output

Die Ergebnisse werden im `output/` Verzeichnis gespeichert:

- `aggregated_glare_results.xlsx` - Detaillierte numerische Ergebnisse
- `glare_duration_dp_*.png` - Visualisierungen der Blenddauer
- `glare_intensity_dp_*.png` - Intensitäts-Visualisierungen
- `glare_periods_dp_*.png` - Blendperioden-Visualisierungen
- `free_report.pdf/html` - Basis-Report
- `full_report.pdf/html` - Vollständiger Report

## Status

✅ **Production Ready** - Alle Tests bestehen, vollständig funktionsfähig

## Nächste Schritte

1. **Docker Container** - Für einfaches Deployment
2. **REST API** - FastAPI Integration
3. **Performance** - Weitere Optimierungen möglich

## Lizenz

Copyright (c) 2025 - Alle Rechte vorbehalten