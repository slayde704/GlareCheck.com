# Restrukturierungs-Plan für Mockup App

## Sicherheit
✅ Backup erstellt: `mockup_app_backup_20250805_184002`

## Schritt-für-Schritt Plan

### Phase 1: Analyse & Planung (AKTUELL)
- [ ] Identifiziere Hauptkomponenten in index.html
- [ ] Erstelle Modul-Struktur-Plan
- [ ] Dokumentiere Abhängigkeiten

### Phase 2: Basis-Struktur
- [ ] Erstelle neue Ordnerstruktur:
  ```
  /static/js/
    ├── core/
    │   ├── map-manager.js
    │   ├── state-manager.js
    │   └── utils.js
    ├── pv-areas/
    │   ├── drawing.js
    │   ├── editing.js
    │   └── types.js
    ├── ui/
    │   ├── panels.js
    │   ├── modals.js
    │   └── forms.js
    └── main.js
  ```

### Phase 3: Schrittweise Migration
1. **Core Module** (niedrigstes Risiko)
   - [ ] Extrahiere Utility-Funktionen
   - [ ] Teste mit alter index.html parallel

2. **UI Module** 
   - [ ] Extrahiere Modal-Funktionen
   - [ ] Extrahiere Panel-Management

3. **PV Area Module** (höchstes Risiko)
   - [ ] Zeichnen-Funktionen
   - [ ] Bearbeitungs-Funktionen
   - [ ] Typen-spezifische Logik

### Phase 4: Integration
- [ ] Erstelle index_modular.html als Test
- [ ] Lade Module einzeln
- [ ] Vergleiche mit Original-Funktionalität

### Phase 5: Testing & Rollback-Strategie
- [ ] Paralleler Betrieb: index.html (alt) vs index_modular.html (neu)
- [ ] Feature-by-Feature Testing
- [ ] Bei Problemen: Sofortiger Rollback möglich

## Regeln für sicheres Refactoring:
1. **Niemals** die funktionierende index.html löschen/überschreiben
2. **Immer** neue Dateien erstellen (nicht ersetzen)
3. **Testen** nach jedem kleinen Schritt
4. **Dokumentieren** was verschoben wurde

## Nächster konkreter Schritt:
Soll ich mit der Analyse der index.html beginnen und die Hauptkomponenten identifizieren?