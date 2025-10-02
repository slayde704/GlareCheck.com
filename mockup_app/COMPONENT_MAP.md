# Component Map - Glare Simulation Mockup

## Übersicht der Module

### 1. **MapManager** (Karten-Verwaltung)
- Google Maps Initialisierung
- Karten-Styles und Controls
- Drawing Manager Setup
- Basis: Zeilen ~490-660

### 2. **DrawingEngine** (Zeichen-System)
- Alle `startDrawing*` Funktionen
- Shape-Erstellung (Rectangle, Parallelogram, RoofParallel)
- Completion Handlers
- Basis: Zeilen ~1400-1900

### 3. **ShapeEditor** (Bearbeitungs-System)
- `enhancePolygonEditing()` - Hauptfunktion für erweiterte Bearbeitung
- Vertex-Manipulation
- Edge-Movement und Rotation
- Corner-Marker Management
- Basis: Zeilen ~2700-3400

### 4. **UIManager** (UI-Verwaltung)
- Panel-Switching
- Modal-Handling
- Dynamic Content Generation
- Message Display
- Basis: Zeilen ~400-500, ~3900-4200

### 5. **DataManager** (Daten-Verwaltung)
- PV Areas Array Management
- Observation Points Management
- Project Save/Load
- Parameter Updates
- Basis: Zeilen ~5000-5400

### 6. **GeometryUtils** (Geometrie-Berechnungen)
- 3D Mathematik (Rotation, Matrix)
- Best-Fit-Plane Berechnung
- Azimuth/Tilt Berechnungen
- Koordinaten-Transformationen
- Basis: Zeilen ~4500-4900

### 7. **ModuleTypeManager** (Modultyp-Verwaltung)
- CRUD für Modultypen
- Reflection Profile Management
- UI für Modultypen
- Basis: Zeilen ~5400-5600

## Abhängigkeiten

### Kritische Abhängigkeiten:
1. **Global State**: `map`, `drawingManager`, `pvAreas`, `observationPoints`
2. **UI ↔ Drawing**: Drawing funktionen updaten direkt UI
3. **Events**: Gemischte Google Maps und DOM Events

### Refactoring Priorität:
1. **GeometryUtils** - Keine UI Dependencies, reine Berechnungen ✅
2. **ModuleTypeManager** - Isolierter Bereich ✅
3. **UIManager** - Klare Trennung möglich ✅
4. **DataManager** - State Management zentral
5. **MapManager** - Core Funktionalität
6. **DrawingEngine** - Komplex, viele Dependencies
7. **ShapeEditor** - Sehr komplex, eng mit Map verbunden