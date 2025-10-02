/**
 * KML Exporter Module
 * Exports PV areas to KML format
 */

export const KMLExporter = {
    /**
     * Export a single PV area to KML (polygon only)
     */
    exportPVArea(pvArea, customFilename) {
        if (!pvArea || !pvArea.polygon) {
            console.error('No PV area or polygon to export');
            return;
        }
        
        const kml = this.generateSimpleKML(pvArea);
        // Use custom filename if provided, otherwise fall back to pvArea.name or 'pv-area'
        const filename = customFilename || pvArea.name || 'pv-area';
        this.downloadKML(kml, `${filename}.kml`);
    },
    
    /**
     * Generate simplified KML with just the polygon
     */
    generateSimpleKML(pvArea) {
        let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
        kml += '  <Document>\n';
        kml += `    <name>${this.escapeXML(pvArea.name || 'PV Area')}</name>\n`;
        kml += '    <description>Exported from GlareCheck.com</description>\n';
        kml += '    <Placemark>\n';
        kml += `      <name>${this.escapeXML(pvArea.name || 'PV Area')}</name>\n`;
        
        // Add polygon geometry
        kml += '      <Polygon>\n';
        kml += '        <tessellate>1</tessellate>\n';
        kml += '        <outerBoundaryIs>\n';
        kml += '          <LinearRing>\n';
        kml += '            <coordinates>\n';
        
        const path = pvArea.polygon.getPath();
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            kml += `              ${point.lng()},${point.lat()},0\n`;
        }
        // Close the polygon by repeating the first point
        if (path.getLength() > 0) {
            const firstPoint = path.getAt(0);
            kml += `              ${firstPoint.lng()},${firstPoint.lat()},0\n`;
        }
        
        kml += '            </coordinates>\n';
        kml += '          </LinearRing>\n';
        kml += '        </outerBoundaryIs>\n';
        kml += '      </Polygon>\n';
        kml += '    </Placemark>\n';
        kml += '  </Document>\n';
        kml += '</kml>';
        
        return kml;
    },
    
    /**
     * Export multiple PV areas to KML
     */
    exportPVAreas(pvAreas) {
        const kml = this.generateKML(pvAreas);
        this.downloadKML(kml, 'pv-areas.kml');
    },
    
    /**
     * Generate KML content for PV areas
     */
    generateKML(pvAreas) {
        let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
        kml += '  <Document>\n';
        kml += '    <name>PV Area Export</name>\n';
        kml += '    <description>Exported from GlareCheck.com</description>\n';
        
        // Add styles for different PV types
        kml += this.generateStyles();
        
        // Add folder for PV areas
        kml += '    <Folder>\n';
        kml += '      <name>PV Areas</name>\n';
        
        // Add each PV area
        pvAreas.forEach(pvArea => {
            if (pvArea.polygon) {
                kml += this.generatePlacemark(pvArea);
            }
        });
        
        kml += '    </Folder>\n';
        kml += '  </Document>\n';
        kml += '</kml>';
        
        return kml;
    },
    
    /**
     * Generate KML styles
     */
    generateStyles() {
        let styles = '';
        
        // Style for roof-parallel
        styles += '    <Style id="roof-parallel">\n';
        styles += '      <LineStyle>\n';
        styles += '        <color>ff00CED1</color>\n'; // Turquoise in KML format (AABBGGRR)
        styles += '        <width>2</width>\n';
        styles += '      </LineStyle>\n';
        styles += '      <PolyStyle>\n';
        styles += '        <color>7f4274a5</color>\n'; // Semi-transparent blue
        styles += '        <fill>1</fill>\n';
        styles += '        <outline>1</outline>\n';
        styles += '      </PolyStyle>\n';
        styles += '    </Style>\n';
        
        // Style for tilted
        styles += '    <Style id="tilted">\n';
        styles += '      <LineStyle>\n';
        styles += '        <color>ff4274a5</color>\n'; // Blue
        styles += '        <width>2</width>\n';
        styles += '      </LineStyle>\n';
        styles += '      <PolyStyle>\n';
        styles += '        <color>7f4274a5</color>\n';
        styles += '        <fill>1</fill>\n';
        styles += '        <outline>1</outline>\n';
        styles += '      </PolyStyle>\n';
        styles += '    </Style>\n';
        
        // Style for field
        styles += '    <Style id="field">\n';
        styles += '      <LineStyle>\n';
        styles += '        <color>ff4274a5</color>\n';
        styles += '        <width>2</width>\n';
        styles += '      </LineStyle>\n';
        styles += '      <PolyStyle>\n';
        styles += '        <color>7f4274a5</color>\n';
        styles += '        <fill>1</fill>\n';
        styles += '        <outline>1</outline>\n';
        styles += '      </PolyStyle>\n';
        styles += '    </Style>\n';
        
        // Style for facade
        styles += '    <Style id="facade">\n';
        styles += '      <LineStyle>\n';
        styles += '        <color>ffFF6B6B</color>\n'; // Red
        styles += '        <width>3</width>\n';
        styles += '      </LineStyle>\n';
        styles += '    </Style>\n';
        
        return styles;
    },
    
    /**
     * Generate a KML Placemark for a PV area
     */
    generatePlacemark(pvArea) {
        let placemark = '      <Placemark>\n';
        placemark += `        <name>${this.escapeXML(pvArea.name || 'PV Area')}</name>\n`;
        
        // Add description with PV area properties
        let description = `Type: ${pvArea.type}\n`;
        description += `Azimuth: ${pvArea.azimuth || 0}°\n`;
        description += `Tilt: ${pvArea.tilt || 0}°\n`;
        if (pvArea.heightTop !== undefined) {
            description += `Height Top: ${pvArea.heightTop}m\n`;
        }
        if (pvArea.heightBottom !== undefined) {
            description += `Height Bottom: ${pvArea.heightBottom}m\n`;
        }
        if (pvArea.perpendicularDistance !== undefined) {
            description += `Perpendicular Distance: ${pvArea.perpendicularDistance}m\n`;
        }
        placemark += `        <description>${this.escapeXML(description)}</description>\n`;
        
        // Add style reference
        placemark += `        <styleUrl>#${pvArea.type || 'field'}</styleUrl>\n`;
        
        // Add geometry
        if (pvArea.type === 'facade' && pvArea.facadeLine) {
            // Facade is a line
            placemark += '        <LineString>\n';
            placemark += '          <tessellate>1</tessellate>\n';
            placemark += '          <coordinates>\n';
            pvArea.facadeLine.forEach(point => {
                placemark += `            ${point.lng},${point.lat},0\n`;
            });
            placemark += '          </coordinates>\n';
            placemark += '        </LineString>\n';
        } else if (pvArea.polygon) {
            // Other types are polygons
            placemark += '        <Polygon>\n';
            placemark += '          <tessellate>1</tessellate>\n';
            placemark += '          <outerBoundaryIs>\n';
            placemark += '            <LinearRing>\n';
            placemark += '              <coordinates>\n';
            
            const path = pvArea.polygon.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                placemark += `                ${point.lng()},${point.lat()},0\n`;
            }
            // Close the polygon by repeating the first point
            if (path.getLength() > 0) {
                const firstPoint = path.getAt(0);
                placemark += `                ${firstPoint.lng()},${firstPoint.lat()},0\n`;
            }
            
            placemark += '              </coordinates>\n';
            placemark += '            </LinearRing>\n';
            placemark += '          </outerBoundaryIs>\n';
            placemark += '        </Polygon>\n';
        }
        
        placemark += '      </Placemark>\n';
        return placemark;
    },
    
    /**
     * Escape XML special characters
     */
    escapeXML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },
    
    /**
     * Download KML file
     */
    downloadKML(kmlContent, filename) {
        const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

export default KMLExporter;