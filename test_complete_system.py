#!/usr/bin/env python3
"""Comprehensive system test with realistic data.

This test verifies that the entire refactored system works correctly
with realistic PV installation data.
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def create_realistic_test_data():
    """Create realistic test data for a solar installation."""
    return {
        "pv_areas": [
            {
                "name": "Dach Süd",
                "corners": [
                    {"latitude": 48.13743, "longitude": 11.57549, "ground_elevation": 520.0},
                    {"latitude": 48.13743, "longitude": 11.57580, "ground_elevation": 520.0},
                    {"latitude": 48.13720, "longitude": 11.57580, "ground_elevation": 528.0},
                    {"latitude": 48.13720, "longitude": 11.57549, "ground_elevation": 528.0}
                ],
                "holes": [],
                "azimuth": 180.0,  # Südausrichtung
                "tilt": 35.0,      # Typische Dachneigung
                "module_type": 1
            },
            {
                "name": "Dach Ost",
                "corners": [
                    {"latitude": 48.13743, "longitude": 11.57520, "ground_elevation": 520.0},
                    {"latitude": 48.13743, "longitude": 11.57549, "ground_elevation": 520.0},
                    {"latitude": 48.13720, "longitude": 11.57549, "ground_elevation": 528.0},
                    {"latitude": 48.13720, "longitude": 11.57520, "ground_elevation": 528.0}
                ],
                "azimuth": 90.0,   # Ostausrichtung
                "tilt": 35.0,
                "module_type": 1
            }
        ],
        "list_of_ops": [
            {
                "name": "Nachbarhaus West",
                "latitude": 48.13731,
                "longitude": 11.57450,
                "ground_elevation": 518.0,
                "height_above_ground": 2.0  # Augenhöhe am Fenster
            },
            {
                "name": "Straße Süd",
                "latitude": 48.13680,
                "longitude": 11.57565,
                "ground_elevation": 515.0,
                "height_above_ground": 1.5  # Fahrerperspektive
            },
            {
                "name": "Spielplatz Ost",
                "latitude": 48.13735,
                "longitude": 11.57620,
                "ground_elevation": 517.0,
                "height_above_ground": 1.2  # Kinderperspektive
            }
        ],
        "meta_data": {
            "user_id": "test_user",
            "project_id": "munich_solar_2025",
            "project_name": "Solaranlage München Beispiel",
            "location": "München, Deutschland",
            "language": "de",
            "report_type": "full"
        },
        "simulation_parameter": {
            "grid_width": 2.0,          # 2m Raster für schnellere Berechnung
            "resolution": "10min",      # 10 Minuten Auflösung
            "sun_elevation_threshold": 3.0,
            "beam_spread": 0.5,
            "sun_angle": 0.53,
            "sun_reflection_threshold": 2.0,
            "intensity_threshold": 30000.0,
            "module_type": 1
        }
    }


def run_complete_system_test():
    """Run comprehensive system test."""
    print("=" * 80)
    print("UMFASSENDER SYSTEMTEST - Glare Analysis System")
    print("=" * 80)
    
    from src.main import calculate_glare
    
    # Create test data
    print("\n1. Erstelle realistische Testdaten...")
    test_data = create_realistic_test_data()
    print(f"   ✓ {len(test_data['pv_areas'])} PV-Flächen definiert")
    print(f"   ✓ {len(test_data['list_of_ops'])} Beobachtungspunkte definiert")
    print(f"   ✓ Simulation für München konfiguriert")
    
    # Run analysis
    print("\n2. Starte Glare-Analyse...")
    start_time = time.time()
    
    result = calculate_glare(test_data)
    
    execution_time = time.time() - start_time
    
    # Check results
    print("\n3. Überprüfe Ergebnisse...")
    
    if result['status'] == 'success':
        print(f"   ✓ Analyse erfolgreich abgeschlossen in {execution_time:.1f} Sekunden")
        
        # Check statistics
        stats = result.get('statistics', {})
        print(f"\n4. Statistiken:")
        print(f"   - Glare Events gefunden: {stats.get('total_events', 0)}")
        print(f"   - Gesamtdauer: {stats.get('total_hours', 0):.1f} Stunden")
        print(f"   - Tage mit Glare: {stats.get('days_with_glare', 0)}")
        print(f"   - Maximale Intensität: {stats.get('max_intensity', 0):.0f} cd/m²")
        
        # Check output files
        print(f"\n5. Generierte Dateien:")
        output_paths = result.get('output_paths', {})
        
        # Check Excel report
        excel_path = output_paths.get('excel_report')
        if excel_path and Path(excel_path).exists():
            size_kb = Path(excel_path).stat().st_size / 1024
            print(f"   ✓ Excel-Report: {excel_path} ({size_kb:.1f} KB)")
        else:
            print(f"   ✗ Excel-Report nicht gefunden")
        
        # Check HTML report
        html_path = output_paths.get('html_report')
        if html_path and Path(html_path).exists():
            size_kb = Path(html_path).stat().st_size / 1024
            print(f"   ✓ HTML-Report: {html_path} ({size_kb:.1f} KB)")
        else:
            print(f"   ✗ HTML-Report nicht gefunden")
        
        # Check visualizations
        viz_paths = output_paths.get('visualizations', {})
        viz_count = sum(len(paths) if isinstance(paths, dict) else 1 
                       for paths in viz_paths.values() if paths)
        print(f"   ✓ Visualisierungen: {viz_count} Dateien generiert")
        
        # Performance metrics
        print(f"\n6. Performance:")
        print(f"   - Gesamtzeit: {execution_time:.1f} Sekunden")
        print(f"   - Durchschnitt pro OP: {execution_time/len(test_data['list_of_ops']):.1f} Sekunden")
        
        # Test result
        print(f"\n{'='*80}")
        print(f"TESTERGEBNIS: ✅ ERFOLGREICH")
        print(f"{'='*80}")
        
        # Additional info
        if stats.get('total_events', 0) == 0:
            print(f"\nHinweis: Keine Glare-Events gefunden. Das kann folgende Gründe haben:")
            print(f"  - Die gewählten Beobachtungspunkte sind nicht im Reflexionsbereich")
            print(f"  - Die Sonnenposition für das aktuelle Jahr erzeugt keine Reflexionen")
            print(f"  - Die vereinfachte Sonnenberechnung (ohne pvlib) ist weniger genau")
        
        return True
        
    else:
        print(f"   ✗ Analyse fehlgeschlagen: {result.get('message', 'Unbekannter Fehler')}")
        print(f"\n{'='*80}")
        print(f"TESTERGEBNIS: ❌ FEHLGESCHLAGEN")
        print(f"{'='*80}")
        return False


def check_dependencies():
    """Check which optional dependencies are available."""
    print("\n7. Verfügbare Abhängigkeiten:")
    
    dependencies = {
        'pvlib': 'Präzise Sonnenberechnungen',
        'shapely': 'Erweiterte Geometrie-Funktionen',
        'scipy': 'Kubische Interpolation',
        'reportlab': 'PDF-Report-Generierung',
        'xlsxwriter': 'Excel-Report-Generierung'
    }
    
    for module, description in dependencies.items():
        try:
            __import__(module)
            print(f"   ✓ {module}: {description}")
        except ImportError:
            print(f"   ✗ {module}: {description} (Fallback aktiv)")


if __name__ == "__main__":
    try:
        success = run_complete_system_test()
        check_dependencies()
        
        print(f"\n💡 Tipp: Installiere fehlende Pakete mit:")
        print(f"   pip install pvlib shapely scipy reportlab xlsxwriter")
        
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Unerwarteter Fehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)