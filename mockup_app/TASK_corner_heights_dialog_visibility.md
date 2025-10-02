# TASK: Eckpunkt-Höhen Dialog mit Kartenansicht

## Aufgabenbeschreibung
Der Eckpunkt-Höhen Dialog soll so gestaltet werden, dass die Karte weiterhin sichtbar und bedienbar bleibt, damit man die Eckpunkte auf der Karte sehen und die Karte scrollen/zoomen kann.

## Lösungsansätze

### Option A: Seitliches Panel (Empfohlen)
- Dialog als Seitenpanel (rechts oder links)
- Karte bleibt vollständig bedienbar
- Ähnlich wie die bestehende Sidebar

### Option B: Verschiebbares/Verkleinerbares Modal
- Modal draggable machen
- Resizable Option hinzufügen
- User kann es selbst positionieren

### Option C: Transparentes/Halbtransparentes Modal
- Modal mit reduzierter Opacity
- Oder nur teilweise Abdeckung

### Option D: Split-View
- Bildschirm in zwei Bereiche teilen
- Links Karte, rechts Dialog

## Implementierungsplan

1. [x] Modal in Seitenpanel umwandeln
2. [x] Panel rechts positionieren (oder toggle links/rechts)
3. [x] Karte-Container anpassen bei geöffnetem Panel
4. [x] Close-Button und ESC-Funktionalität beibehalten
5. [x] Animation für smooth open/close

## Implementierte Lösung

### Seitenpanel statt Modal:
- 600px breites Panel von rechts
- Feste Position mit smooth slide-in Animation
- Karte wird automatisch verkleinert (margin-right: 600px)

### Features:
- **Karte bleibt bedienbar**: Scrollen, Zoomen, Punkte anklicken möglich
- **ESC-Taste**: Schließt das Panel
- **Close-Button**: Oben rechts und unten als "Schließen" Button
- **Speichern**: Schließt automatisch das Panel
- **Animation**: 0.3s ease-in-out für smooth transitions

### Vorteile:
- Eckpunkte auf der Karte bleiben sichtbar
- Karte kann während der Eingabe navigiert werden
- Keine Überlagerung der wichtigen Kartenelemente
- Responsive: Panel nimmt nur den benötigten Platz ein

## Status
✅ Abgeschlossen