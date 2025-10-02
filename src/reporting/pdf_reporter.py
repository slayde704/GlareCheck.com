"""PDF report generation using reportlab."""

import logging
from pathlib import Path
from typing import Dict, Any, Optional

from .base import BaseReporter, ReportConfig

logger = logging.getLogger(__name__)

# Try to import reportlab
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("reportlab not available. PDF reports will be disabled.")


class PDFReporter(BaseReporter):
    """PDF report generator using reportlab."""
    
    def __init__(self, config: ReportConfig, output_dir: Path):
        """Initialize PDF reporter.
        
        Args:
            config: Report configuration
            output_dir: Output directory
        """
        super().__init__(config, output_dir)
        
        if not REPORTLAB_AVAILABLE:
            logger.error("reportlab not available. Cannot create PDF reports.")
    
    def generate_report(self, data: Dict[str, Any]) -> Optional[Path]:
        """Generate PDF report.
        
        Args:
            data: Report data dictionary
            
        Returns:
            Path to generated PDF file or None if failed
        """
        if not REPORTLAB_AVAILABLE:
            logger.error("Cannot generate PDF report: reportlab not available")
            return None
        
        if not self.validate_data(data):
            return None
        
        # Determine output filename based on report type
        if self.config.report_type == 'free':
            filename = 'free_report.pdf'
        else:
            filename = 'full_report.pdf'
        
        output_path = self.get_output_path(filename)
        
        try:
            # Create document
            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Build content
            story = []
            styles = getSampleStyleSheet()
            
            # Add content sections
            self._add_title_page(story, data, styles)
            self._add_executive_summary(story, data, styles)
            self._add_detailed_results(story, data, styles)
            self._add_visualizations(story, data, styles)
            self._add_disclaimer(story, data, styles)
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"PDF report generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate PDF report: {e}")
            return None
    
    def _add_title_page(self, story, data: Dict[str, Any], styles) -> None:
        """Add title page to PDF.
        
        Args:
            story: ReportLab story list
            data: Report data
            styles: ReportLab styles
        """
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        story.append(Paragraph(self.labels['title'], title_style))
        story.append(Spacer(1, 20))
        
        # Project information
        metadata = data.get('metadata', {})
        project_info = [
            [self.labels['project_name'], metadata.get('project_name', 'N/A')],
            [self.labels['project_id'], metadata.get('project_id', 'N/A')],
            [self.labels['user_id'], metadata.get('user_id', 'N/A')],
            [self.labels['date'], str(metadata.get('timestamp', 'N/A'))]
        ]
        
        info_table = Table(project_info, colWidths=[3*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 30))
        
        # Free version alert if applicable
        if self.config.report_type == 'free':
            alert_style = ParagraphStyle(
                'Alert',
                parent=styles['Normal'],
                fontSize=14,
                textColor=colors.red,
                alignment=TA_CENTER,
                spaceBefore=20,
                spaceAfter=20
            )
            story.append(Paragraph(self.labels['free_version_alert'], alert_style))
    
    def _add_executive_summary(self, story, data: Dict[str, Any], styles) -> None:
        """Add executive summary section.
        
        Args:
            story: ReportLab story list
            data: Report data
            styles: ReportLab styles
        """
        # Section header
        story.append(Paragraph(self.labels['executive_summary'], styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Summary statistics
        statistics = data.get('statistics', {})
        
        summary_text = f"""
        This report presents the results of a comprehensive glare analysis for the solar installation project.
        
        Key findings:
        • Total glare events: {statistics.get('total_events', 0)}
        • Total glare hours: {statistics.get('total_hours', 0):.1f}
        • Days with glare: {statistics.get('days_with_glare', 0)}
        • Peak intensity: {statistics.get('max_intensity', 0):,.0f} cd/m²
        """
        
        story.append(Paragraph(summary_text, styles['Normal']))
        story.append(Spacer(1, 20))
    
    def _add_detailed_results(self, story, data: Dict[str, Any], styles) -> None:
        """Add detailed results section.
        
        Args:
            story: ReportLab story list
            data: Report data
            styles: ReportLab styles
        """
        story.append(Paragraph(self.labels['detailed_analysis'], styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Results summary table
        glare_results = data.get('glare_results', None)
        
        if glare_results is not None and not glare_results.empty:
            # Create summary by observation point
            if 'op_number' in glare_results.columns:
                op_summary = glare_results.groupby('op_number').agg({
                    'luminance': ['count', 'mean', 'max'] if 'luminance' in glare_results.columns else 'count'
                }).round(1)
                
                # Create table data
                table_data = [['Observation Point', 'Events', 'Avg Intensity', 'Max Intensity']]
                
                for op_num in op_summary.index:
                    if 'luminance' in glare_results.columns:
                        row = [
                            f'OP {op_num}',
                            str(int(op_summary.loc[op_num, ('luminance', 'count')])),
                            f"{op_summary.loc[op_num, ('luminance', 'mean')]:,.0f}",
                            f"{op_summary.loc[op_num, ('luminance', 'max')]:,.0f}"
                        ]
                    else:
                        row = [f'OP {op_num}', str(len(glare_results[glare_results['op_number'] == op_num])), 'N/A', 'N/A']
                    table_data.append(row)
                
                results_table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1.5*inch, 1.5*inch])
                results_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(results_table)
                story.append(Spacer(1, 20))
        else:
            story.append(Paragraph("No glare events detected in this analysis.", styles['Normal']))
            story.append(Spacer(1, 20))
    
    def _add_visualizations(self, story, data: Dict[str, Any], styles) -> None:
        """Add visualizations section.
        
        Args:
            story: ReportLab story list
            data: Report data
            styles: ReportLab styles
        """
        story.append(Paragraph("Visualizations", styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Add visualization paths if available
        visualization_paths = data.get('visualization_paths', {})
        
        if visualization_paths:
            for plot_type, paths in visualization_paths.items():
                if isinstance(paths, dict):
                    for op_num, path in paths.items():
                        if Path(path).exists():
                            # Use blurred version for free reports
                            if self.config.report_type == 'free':
                                blur_path = Path(path).parent / f"blur_{Path(path).name}"
                                if blur_path.exists():
                                    path = blur_path
                            
                            try:
                                # Add image to PDF
                                img = Image(str(path), width=6*inch, height=4*inch)
                                story.append(img)
                                story.append(Spacer(1, 12))
                                
                                # Add caption
                                caption = f"{plot_type.replace('_', ' ').title()} - Observation Point {op_num}"
                                story.append(Paragraph(caption, styles['Normal']))
                                story.append(Spacer(1, 20))
                            except Exception as e:
                                logger.warning(f"Could not add image {path} to PDF: {e}")
        else:
            story.append(Paragraph("Visualizations are generated separately and can be found in the output directory.", styles['Normal']))
            story.append(Spacer(1, 20))
    
    def _add_disclaimer(self, story, data: Dict[str, Any], styles) -> None:
        """Add disclaimer section.
        
        Args:
            story: ReportLab story list
            data: Report data
            styles: ReportLab styles
        """
        story.append(Paragraph(self.labels['disclaimer_label'], styles['Heading1']))
        story.append(Spacer(1, 12))
        
        disclaimer_text = self.labels['disclaimer_text']
        story.append(Paragraph(disclaimer_text, styles['Normal']))