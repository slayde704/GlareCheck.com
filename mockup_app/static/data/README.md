# Default Module Types Configuration

## Übersicht

Die Datei `default-module-types.json` definiert die Standard-Modultypen, die in der GlareCheck-Anwendung verfügbar sind.

## Struktur

```json
{
    "moduleTypes": [
        {
            "id": 0,
            "name": "Modulname",
            "manufacturer": "Hersteller",
            "model": "Modell",
            "beamSpread": 0.5,
            "isProtected": true,
            "reflectionProfile": {
                "0": 70000,
                "10": 70000,
                ...
            }
        }
    ]
}
```

## Felder

- **id**: Eindeutige ID des Modultyps (Nummer)
- **name**: Anzeigename des Moduls
- **manufacturer**: Hersteller (optional)
- **model**: Modellbezeichnung (optional)
- **beamSpread**: Bündelaufweitung in Grad
- **isProtected**: `true` = Modul kann nicht bearbeitet/gelöscht werden
- **reflectionProfile**: Leuchtdichte-Werte (cd/m²) bei 100.000 lx Bestrahlungsstärke für verschiedene Einfallswinkel (0° bis 90° in 10° Schritten)

## Neue Module hinzufügen

Um neue Standard-Module hinzuzufügen:

1. Öffnen Sie `default-module-types.json`
2. Fügen Sie ein neues Objekt im `moduleTypes` Array hinzu
3. Verwenden Sie eine eindeutige ID (höher als bestehende IDs)
4. Setzen Sie `isProtected: true` wenn das Modul nicht editierbar sein soll

### Beispiel für ein neues Modul:

```json
{
    "id": 2,
    "name": "Bifazial Modul",
    "manufacturer": "SolarTech",
    "model": "BF-400",
    "beamSpread": 1.0,
    "isProtected": true,
    "reflectionProfile": {
        "0": 50000,
        "10": 50000,
        "20": 52000,
        "30": 60000,
        "40": 95000,
        "50": 200000,
        "60": 700000,
        "70": 2500000,
        "80": 10000000,
        "90": 40000000
    }
}
```

## Wichtige Hinweise

- Die Leuchtdichte-Werte müssen physikalisch sinnvoll sein
- Höhere Winkel haben typischerweise höhere Reflexionswerte
- Die Werte basieren auf einer Bestrahlungsstärke von 100.000 lx
- Nach Änderungen muss die Anwendung neu geladen werden