# Notification Pattern - Best Practice

## Regel: Immer Benachrichtigungen verwenden

**WICHTIG**: Bei allen User-Interaktionen, die blockiert werden oder Erklärungen benötigen, IMMER Notifications verwenden statt Alerts!

## Warum?

- ✅ Nicht-blockierend (User kann weiterarbeiten)
- ✅ Konsistente UX
- ✅ Professionelles Erscheinungsbild
- ✅ i18n-Support integriert
- ❌ Alerts sind blockierend und veraltet

## Verwendung

### UIManager.showNotification()

```javascript
UIManager.showNotification(message, type);
```

**Parameter:**
- `message`: String - Die Nachricht (idealerweise i18n key)
- `type`: String - 'success' | 'error' | 'warning' | 'info'

### Beispiele

#### 1. Gesperrte Features (Warning)

```javascript
// Wenn User Feature ohne Voraussetzung nutzen will
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
UIManager.showNotification(t('topo.requiredMessage'), 'warning');
```

**Anwendung:**
- Gesperrte Menüpunkte
- Fehlende Voraussetzungen
- Unvollständige Konfiguration

#### 2. Erfolgreiche Aktionen (Success)

```javascript
UIManager.showNotification(t('topo.success'), 'success');
```

**Anwendung:**
- Datei erfolgreich hochgeladen
- Einstellungen gespeichert
- Quelle ausgewählt

#### 3. Fehler (Error)

```javascript
UIManager.showNotification(t('topo.invalidResolution'), 'error');
```

**Anwendung:**
- Validierungsfehler
- Datei-Upload fehlgeschlagen
- Ungültige Eingaben

#### 4. Information (Info)

```javascript
UIManager.showNotification(t('topo.processing'), 'info');
```

**Anwendung:**
- Lade-Status
- Hinweise während Verarbeitung
- Allgemeine Informationen

## Pattern für gesperrte Features

### Standard-Implementierung:

```javascript
// 1. Feature sperren mit Attribut
element.setAttribute('data-locked', 'true');
element.style.cursor = 'not-allowed';
element.style.opacity = '0.5';

// 2. Globaler Click Handler (Event Capture)
document.addEventListener('click', (e) => {
    const lockedElement = e.target.closest('[data-locked="true"]');
    if (lockedElement) {
        e.preventDefault();
        e.stopPropagation();
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        UIManager.showNotification(t('feature.requiredMessage'), 'warning');
    }
}, true); // Capture phase!

// 3. Feature entsperren
element.removeAttribute('data-locked');
element.style.cursor = 'pointer';
element.style.opacity = '1';
```

### Warum Event Capture?

- Fängt Events VOR Panel-Switching ab
- Verhindert ungewollte Navigation
- Zuverlässiger als Event Listener pro Element

## i18n Integration

**IMMER Translation Keys verwenden:**

```javascript
// ✅ RICHTIG
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
UIManager.showNotification(t('error.invalidInput'), 'error');

// ❌ FALSCH
UIManager.showNotification('Invalid input', 'error');
```

### Translation Keys Struktur

```javascript
// translations.js
{
    de: {
        'feature.required': 'Bitte wählen Sie zuerst...',
        'feature.requiredMessage': 'Um fortzufahren, müssen Sie zunächst...',
        'feature.success': 'Erfolgreich geladen',
        'feature.error': 'Fehler beim Laden',
    },
    en: {
        'feature.required': 'Please select first...',
        'feature.requiredMessage': 'To continue, you must first...',
        'feature.success': 'Successfully loaded',
        'feature.error': 'Error loading',
    }
}
```

## Checkliste für neue Features

- [ ] Notification statt Alert verwenden?
- [ ] i18n Keys definiert (DE + EN)?
- [ ] Richtiger Notification-Typ gewählt?
- [ ] Bei gesperrten Features: data-locked Attribut?
- [ ] Bei gesperrten Features: Hilfreiche Erklärung in Message?
- [ ] Event Handler in Capture Phase für gesperrte Features?

## Beispiel: Topografie-Quelle (Referenz-Implementation)

### Locked State

```javascript
// topography-source-manager.js
lockMenuItems() {
    const menuItems = document.querySelectorAll('.menu-item:not([data-panel="search"]):not([data-panel="topo-source"])');
    menuItems.forEach(item => {
        item.setAttribute('data-locked', 'true');
        item.style.opacity = '0.5';
        item.style.cursor = 'not-allowed';
    });
}
```

### Global Handler

```javascript
// index_modular.html
document.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item');
    if (menuItem && menuItem.getAttribute('data-locked') === 'true') {
        e.preventDefault();
        e.stopPropagation();
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        UIManager.showNotification(t('topo.requiredMessage'), 'warning');
    }
}, true);
```

### Unlock

```javascript
unlockMenuItems() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.removeAttribute('data-locked');
        item.style.opacity = '1';
        item.style.cursor = 'pointer';
    });
}
```

## Zusammenfassung

**Merke:**
- 🚫 Niemals `alert()` verwenden
- ✅ Immer `UIManager.showNotification()`
- ✅ Immer i18n Keys verwenden
- ✅ Gesperrte Features mit `data-locked` + Event Capture
- ✅ Hilfreiche, erklärende Messages
