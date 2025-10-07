# i18n Implementation Guide

This guide explains how to complete the internationalization (i18n) of the remaining UI components.

## ✅ Already Completed

1. **i18n Infrastructure** (`translations.js`)
   - Complete German and English translations (~200 keys)
   - Helper function `window.i18n.t(key, params)`
   - LocalStorage persistence

2. **Language Switcher** (`language-switcher.js`)
   - Dropdown in top-right corner with flags 🇩🇪 🇬🇧
   - Auto-updates all UI when language changes
   - Handles data-i18n attributes automatically

3. **UI-Manager** (`ui-manager.js`)
   - Fully translated
   - Uses `const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;`
   - All user-facing messages use t() function

## 📋 Remaining Files to Update

### 1. **PV-List-Renderer** (`pv-list-renderer.js`) - 2626 lines
### 2. **Corner-Details-Manager** (`corner-details-manager.js`) - 4282 lines
### 3. **Module-Type-Manager** (`module-type-manager.js`) - 318 lines
### 4. **Drawing-Manager** (`drawing-manager.js`)

## 🔧 Implementation Pattern

### Step 1: Add t() helper at the top of the file

```javascript
// After imports, add:
const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
```

### Step 2: Replace hardcoded German strings

**Before:**
```javascript
return `<h6>Eckpunkte & Parameter</h6>`;
```

**After:**
```javascript
return `<h6>${t('corner.title')}</h6>`;
```

### Step 3: Handle strings with variables

**Before:**
```javascript
alert(`${count} Punkte erfolgreich importiert`);
```

**After:**
```javascript
alert(t('import.success', { count }));
```

### Step 4: Update HTML template strings

**Before:**
```javascript
`<button class="btn btn-primary">
    <i class="bi bi-plus"></i>
    Neue PV-Fläche
</button>`
```

**After:**
```javascript
`<button class="btn btn-primary">
    <i class="bi bi-plus"></i>
    ${t('menu.newPV')}
</button>`
```

## 📝 Translation Keys Reference

### Common Keys
- `common.yes`, `common.no`, `common.ok`, `common.cancel`
- `common.save`, `common.close`, `common.delete`, `common.edit`
- `common.loading`, `common.error`, `common.success`

### PV-Related
- `pvList.title`, `pvList.empty`, `pvList.area`
- `pvType.roofParallel`, `pvType.roofMounted`, `pvType.facade`, `pvType.field`

### Parameters
- `param.azimuth`, `param.tilt`, `param.moduleType`
- `param.heightTop`, `param.heightBottom`
- `param.autoCalculate`, `param.autoCalculateTerrainHeight`

### Topography
- `topo.title`, `topo.whyImportant`, `topo.description`
- `topo.create100mGrid`, `topo.createCustomGrid`, `topo.addManualPoints`
- `topo.bestFitActive`, `topo.noPoints`, `topo.areaChanged`

### Support Points
- `support.title`, `support.height`, `support.delete`
- `support.updateHeights`

### Grid & Import
- `grid.title`, `grid.spacing`, `grid.generate`
- `import.title`, `import.format`, `import.import`

## 🎯 Priority Order

1. **Module-Type-Manager** (smallest, ~318 lines)
   - Simple CRUD interface
   - Few translation keys needed

2. **Drawing-Manager**
   - User-facing instructions
   - Error messages

3. **PV-List-Renderer** (~2626 lines)
   - Most visible component
   - Many template strings

4. **Corner-Details-Manager** (~4282 lines largest)
   - Complex UI with many sections
   - Most translation keys

## 🔍 Finding Strings to Translate

Use these grep patterns to find untranslated strings:

```bash
# Find German strings in template literals
grep -n "['\"]\w*[äöüßÄÖÜ]" file.js

# Find common German words
grep -n -E "(Neue|Löschen|Schließen|Speichern|Hinzufügen)" file.js

# Find alert/confirm calls
grep -n "alert\|confirm" file.js
```

## ✅ Testing

After each file update:

1. **Switch Language**: Click language switcher in header
2. **Test All Features**: Make sure UI updates correctly
3. **Check Console**: No missing translation key errors
4. **Verify Labels**: All buttons, labels, tooltips translated

## 📌 Important Notes

- **Fallback**: If translation key not found, original key is returned
- **Parameters**: Use `{paramName}` in translations, e.g. `"Imported {count} points"`
- **HTML**: For HTML content, use separate keys or escape properly
- **Units**: Keep symbols like °, m, m² in translations for localization

## 🚀 Next Steps

1. Start with **Module-Type-Manager** (smallest file)
2. Test thoroughly
3. Move to **Drawing-Manager**
4. Then tackle the larger files

All translation keys are already defined in `translations.js` - just need to use them!
