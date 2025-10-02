"""HTML report generation using Jinja2 templates."""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
import shutil

from .base import BaseReporter, ReportConfig

logger = logging.getLogger(__name__)

# Try to import template engine
try:
    from jinja2 import Environment, FileSystemLoader, Template
    JINJA2_AVAILABLE = True
except ImportError:
    JINJA2_AVAILABLE = False
    logger.warning("jinja2 not available. HTML reports will be disabled.")

# Try to import HTML to PDF converter
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    logger.warning("weasyprint not available. HTML to PDF conversion will be disabled.")


class HTMLReporter(BaseReporter):
    """HTML report generator using Jinja2 templates."""
    
    def __init__(self, config: ReportConfig, output_dir: Path):
        """Initialize HTML reporter.
        
        Args:
            config: Report configuration
            output_dir: Output directory
        """
        super().__init__(config, output_dir)
        
        if not JINJA2_AVAILABLE:
            logger.error("jinja2 not available. Cannot create HTML reports.")
        
        # Setup template environment
        self.template_dir = Path(__file__).parent / 'templates'
        if JINJA2_AVAILABLE:
            self.env = Environment(loader=FileSystemLoader(str(self.template_dir)))
    
    def generate_report(self, data: Dict[str, Any]) -> Optional[Path]:
        """Generate HTML report.
        
        Args:
            data: Report data dictionary
            
        Returns:
            Path to generated HTML file or None if failed
        """
        if not JINJA2_AVAILABLE:
            logger.error("Cannot generate HTML report: jinja2 not available")
            return None
        
        if not self.validate_data(data):
            return None
        
        # Determine output filename based on report type
        if self.config.report_type == 'free':
            filename = 'free_report.html'
        else:
            filename = 'full_report.html'
        
        output_path = self.get_output_path(filename)
        
        try:
            # Prepare template data
            template_data = self._prepare_template_data(data)
            
            # Load and render template
            template_content = self._get_template_content()
            template = Template(template_content)
            html_content = template.render(**template_data)
            
            # Save HTML file
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            logger.info(f"HTML report generated: {output_path}")
            
            # Generate PDF version if weasyprint is available
            if WEASYPRINT_AVAILABLE:
                pdf_path = output_path.with_suffix('.pdf')
                try:
                    HTML(string=html_content, base_url=str(output_path.parent)).write_pdf(str(pdf_path))
                    logger.info(f"PDF version generated: {pdf_path}")
                except Exception as e:
                    logger.warning(f"Could not generate PDF from HTML: {e}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate HTML report: {e}")
            return None
    
    def _prepare_template_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare data for template rendering.
        
        Args:
            data: Raw report data
            
        Returns:
            Template data dictionary
        """
        metadata = data.get('metadata', {})
        statistics = data.get('statistics', {})
        simulation_parameters = data.get('simulation_parameters', {})
        
        # Prepare template context
        template_data = {
            'config': self.config,
            'labels': self.labels,
            'metadata': metadata,
            'statistics': statistics,
            'simulation_parameters': simulation_parameters,
            'project_name': metadata.get('project_name', 'Solar Installation Project'),
            'user_id': metadata.get('user_id', 'N/A'),
            'project_id': metadata.get('project_id', 'N/A'),
            'timestamp': metadata.get('timestamp', 'N/A'),
            'language': self.config.language,
            'is_free_version': self.config.report_type == 'free'
        }
        
        # Add glare results summary
        glare_results = data.get('glare_results')
        if glare_results is not None and not glare_results.empty:
            template_data['has_glare_results'] = True
            template_data['total_events'] = len(glare_results)
            
            # Group by observation point
            if 'op_number' in glare_results.columns:
                op_summary = []
                for op_num in sorted(glare_results['op_number'].unique()):
                    op_data = glare_results[glare_results['op_number'] == op_num]
                    
                    summary = {
                        'op_number': op_num,
                        'event_count': len(op_data),
                        'avg_intensity': op_data['luminance'].mean() if 'luminance' in op_data.columns else 0,
                        'max_intensity': op_data['luminance'].max() if 'luminance' in op_data.columns else 0
                    }
                    op_summary.append(summary)
                
                template_data['observation_points'] = op_summary
        else:
            template_data['has_glare_results'] = False
            template_data['total_events'] = 0
            template_data['observation_points'] = []
        
        # Add visualization paths
        visualization_paths = data.get('visualization_paths', {})
        template_data['visualizations'] = self._process_visualization_paths(visualization_paths)
        
        return template_data
    
    def _process_visualization_paths(self, visualization_paths: Dict) -> Dict:
        """Process visualization paths for template.
        
        Args:
            visualization_paths: Dictionary of visualization paths
            
        Returns:
            Processed visualization data
        """
        processed = {}
        
        for plot_type, paths in visualization_paths.items():
            if isinstance(paths, dict):
                processed[plot_type] = {}
                for op_num, path in paths.items():
                    # Use blurred version for free reports
                    if self.config.report_type == 'free':
                        blur_path = Path(path).parent / f"blur_{Path(path).name}"
                        if blur_path.exists():
                            path = blur_path
                    
                    # Use relative path for HTML
                    relative_path = Path(path).name
                    processed[plot_type][op_num] = relative_path
            else:
                # Single path
                if self.config.report_type == 'free':
                    blur_path = Path(paths).parent / f"blur_{Path(paths).name}"
                    if blur_path.exists():
                        paths = blur_path
                
                processed[plot_type] = Path(paths).name
        
        return processed
    
    def _get_template_content(self) -> str:
        """Get HTML template content.
        
        Returns:
            HTML template string
        """
        # Try to load external template first
        template_path = self.output_dir / 'html_template.html'
        if template_path.exists():
            try:
                return template_path.read_text(encoding='utf-8')
            except Exception as e:
                logger.warning(f"Could not load external template: {e}")
        
        # Fallback to embedded template
        return self._get_embedded_template()
    
    def _get_embedded_template(self) -> str:
        """Get embedded HTML template.
        
        Returns:
            HTML template string
        """
        return """
<!DOCTYPE html>
<html lang="{{ language }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ labels.title }} - {{ project_name }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #366092;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #366092;
            margin-bottom: 10px;
        }
        .alert {
            background-color: #ffebee;
            border: 1px solid #f44336;
            color: #f44336;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: center;
            font-weight: bold;
        }
        .section {
            margin: 30px 0;
        }
        .section h2 {
            color: #366092;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .info-table th, .info-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .info-table th {
            background-color: #366092;
            color: white;
        }
        .info-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #366092;
        }
        .stat-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }
        .visualization {
            text-align: center;
            margin: 30px 0;
        }
        .visualization img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .disclaimer {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            margin: 30px 0;
            border-radius: 4px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>{{ labels.title }}</h1>
            <p><strong>{{ labels.project_name }}:</strong> {{ project_name }}</p>
            {% if is_free_version %}
            <div class="alert">
                {{ labels.free_version_alert }}
            </div>
            {% endif %}
        </div>

        <!-- Project Information -->
        <div class="section">
            <h2>{{ labels.executive_summary }}</h2>
            <table class="info-table">
                <tr>
                    <th>{{ labels.user_id }}</th>
                    <td>{{ user_id }}</td>
                </tr>
                <tr>
                    <th>{{ labels.project_id }}</th>
                    <td>{{ project_id }}</td>
                </tr>
                <tr>
                    <th>{{ labels.timestamp }}</th>
                    <td>{{ timestamp }}</td>
                </tr>
            </table>
        </div>

        <!-- Statistics -->
        <div class="section">
            <h2>{{ labels.summary_of_results }}</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">{{ statistics.total_events | default(0) }}</div>
                    <div class="stat-label">Total Glare Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ "%.1f" | format(statistics.total_hours | default(0)) }}</div>
                    <div class="stat-label">Total Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ statistics.days_with_glare | default(0) }}</div>
                    <div class="stat-label">Days with Glare</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ "{:,.0f}".format(statistics.max_intensity | default(0)) }}</div>
                    <div class="stat-label">Peak Intensity (cd/m²)</div>
                </div>
            </div>
        </div>

        <!-- Observation Points -->
        {% if observation_points %}
        <div class="section">
            <h2>{{ labels.detection_points_details }}</h2>
            <table class="info-table">
                <thead>
                    <tr>
                        <th>Observation Point</th>
                        <th>Events</th>
                        <th>Avg Intensity (cd/m²)</th>
                        <th>Max Intensity (cd/m²)</th>
                    </tr>
                </thead>
                <tbody>
                    {% for op in observation_points %}
                    <tr>
                        <td>OP {{ op.op_number }}</td>
                        <td>{{ op.event_count }}</td>
                        <td>{{ "{:,.0f}".format(op.avg_intensity) }}</td>
                        <td>{{ "{:,.0f}".format(op.max_intensity) }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <!-- Visualizations -->
        {% if visualizations %}
        <div class="section">
            <h2>Visualizations</h2>
            {% for plot_type, paths in visualizations.items() %}
                {% if paths is mapping %}
                    {% for op_num, path in paths.items() %}
                    <div class="visualization">
                        <h3>{{ plot_type.replace('_', ' ').title() }} - Observation Point {{ op_num }}</h3>
                        <img src="{{ path }}" alt="{{ plot_type }} for OP {{ op_num }}">
                    </div>
                    {% endfor %}
                {% else %}
                    <div class="visualization">
                        <h3>{{ plot_type.replace('_', ' ').title() }}</h3>
                        <img src="{{ paths }}" alt="{{ plot_type }}">
                    </div>
                {% endif %}
            {% endfor %}
        </div>
        {% endif %}

        <!-- Disclaimer -->
        <div class="section">
            <h2>{{ labels.disclaimer_label }}</h2>
            <div class="disclaimer">
                {{ labels.disclaimer_text }}
            </div>
        </div>
    </div>
</body>
</html>
        """