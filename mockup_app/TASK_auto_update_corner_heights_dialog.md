# TASK: Automatische Aktualisierung des Eckpunkt-Höhen Dialogs

## Aufgabenbeschreibung
Wenn das Eckpunkt-Höhen Menü geöffnet ist und der Benutzer neue Eckpunkte zum Polygon hinzufügt oder entfernt, soll das Menü automatisch aktualisiert werden, um die neuen Punkte anzuzeigen.

## Implementierung

### 1. Neue Funktionen erstellt:
- `updateCornerHeightsDialogIfOpen(pvId)` - Prüft ob das Dialog für die gegebene PV-Fläche offen ist und aktualisiert es
- `buildCornerHeightsContent(pvId)` - Extrahierte wiederverwendbare Funktion zum Aufbau des Dialog-Inhalts

### 2. Event Handler erweitert:
- `insert_at` Event für neue Polygon-Punkte ruft jetzt `updateCornerHeightsDialogIfOpen` auf
- `remove_at` Event für entfernte Polygon-Punkte ruft jetzt `updateCornerHeightsDialogIfOpen` auf
- Beide Handler für normale PV-Flächen und roof-parallel Typen wurden aktualisiert

### 3. Code-Refactoring:
- Duplizierter Code in `openCornerHeightsDialog` wurde entfernt
- Gemeinsame Logik wurde in `buildCornerHeightsContent` extrahiert
- Bessere Wiederverwendbarkeit und Wartbarkeit

## Features:
- ✅ Automatische Aktualisierung bei neuen Eckpunkten
- ✅ Automatische Aktualisierung bei entfernten Eckpunkten
- ✅ Erhaltung der eingegebenen Werte für bestehende Punkte
- ✅ Neue Punkte erhalten Standard-Werte (0m über Referenz)
- ✅ Best-Fit-Ebene wird automatisch neu berechnet

## Status
✅ Abgeschlossen