"""Base classes and utilities for report generation."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Any, Union
from datetime import datetime
import shutil

logger = logging.getLogger(__name__)


@dataclass
class ReportConfig:
    """Configuration for report generation."""
    language: str = 'en'
    report_type: str = 'full'  # 'full' or 'free'
    include_raw_data: bool = True
    include_visualizations: bool = True
    corporate_branding: bool = True
    watermark_text: Optional[str] = None
    output_format: str = 'pdf'  # 'pdf', 'html', 'xlsx'
    
    def __post_init__(self):
        """Validate configuration."""
        if self.language not in ['en', 'de']:
            logger.warning(f"Unknown language {self.language}, using 'en'")
            self.language = 'en'
        
        if self.report_type not in ['full', 'free']:
            logger.warning(f"Unknown report type {self.report_type}, using 'full'")
            self.report_type = 'full'


class BaseReporter:
    """Base class for all report generators."""
    
    def __init__(self, config: ReportConfig, output_dir: Path):
        """Initialize reporter.
        
        Args:
            config: Report configuration
            output_dir: Output directory for reports
        """
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.labels = get_labels(config.language)
        
        # Setup environment
        self.setup_environment()
    
    def setup_environment(self) -> None:
        """Setup the reporting environment."""
        # Copy assets if needed
        self._copy_assets()
    
    def _copy_assets(self) -> None:
        """Copy required assets to output directory."""
        try:
            # Copy logo if exists
            logo_sources = ['logo.png', 'logo.jpg', 'logo.svg']
            for logo_name in logo_sources:
                logo_src = Path(__file__).parent.parent.parent / 'assets' / logo_name
                if logo_src.exists():
                    logo_dst = self.output_dir / logo_name
                    if not logo_dst.exists():
                        shutil.copy2(logo_src, logo_dst)
                    break
        except Exception as e:
            logger.warning(f"Could not copy assets: {e}")
    
    def generate_report(self, data: Dict[str, Any]) -> Optional[Path]:
        """Generate report. To be implemented by subclasses.
        
        Args:
            data: Report data dictionary
            
        Returns:
            Path to generated report or None if failed
        """
        raise NotImplementedError("Subclasses must implement generate_report")
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """Validate input data.
        
        Args:
            data: Data dictionary to validate
            
        Returns:
            True if data is valid
        """
        required_keys = ['metadata', 'glare_results']
        
        for key in required_keys:
            if key not in data:
                logger.error(f"Missing required data key: {key}")
                return False
        
        return True
    
    def get_output_path(self, filename: str) -> Path:
        """Get full output path for a file.
        
        Args:
            filename: Base filename
            
        Returns:
            Full path to output file
        """
        return self.output_dir / filename


def get_labels(language: str) -> Dict[str, str]:
    """Get localized labels for reports.
    
    Args:
        language: Language code ('en' or 'de')
        
    Returns:
        Dictionary of localized labels
    """
    labels = {
        'en': {
            # General
            'title': 'Glare Simulation Report',
            'page': 'Page',
            'date': 'Date',
            'project_name': 'Project Name',
            'user_id': 'User ID',
            'project_id': 'Project ID',
            'simulation_id': 'Simulation ID',
            'timestamp': 'Timestamp',
            'version_calculator': 'Calculator Version',
            
            # Report sections
            'executive_summary': 'Executive Summary',
            'table_of_contents': 'Table of Contents',
            'overview_map': 'Overview Map',
            'simulation_parameters': 'Simulation Parameters',
            'evaluation_of_results': 'Evaluation of Results',
            'summary_of_results': 'Summary of Results',
            'detailed_analysis': 'Detailed Analysis',
            'pv_areas_details': 'PV Areas Details',
            'detection_points_details': 'Detection Points Details',
            'disclaimer_label': 'Disclaimer',
            
            # Data labels
            'dni': 'Direct Normal Irradiance (W/m²)',
            'incidence_angle': 'Incidence Angle (°)',
            'sun_azimuth': 'Sun Azimuth (°)',
            'sun_elevation': 'Sun Elevation (°)',
            'reflection_azimuth': 'Reflection Azimuth (°)',
            'reflection_elevation': 'Reflection Elevation (°)',
            'luminance': 'Luminance (cd/m²)',
            'di_on_module': 'Direct Irradiance on Module (W/m²)',
            'neglectable_glare': 'Neglectable Glare',
            
            # Statistics
            'total_hours': 'Total Glare Hours',
            'max_daily': 'Maximum Daily Duration (min)',
            'days_with_glare': 'Days with Glare',
            'peak_intensity': 'Peak Intensity (cd/m²)',
            
            # Traffic light system
            'green_label': 'Green – No or Low Glare Impact',
            'yellow_label': 'Yellow – Increased Glare',
            'red_label': 'Red – Significant Glare Impact',
            
            # Visualization labels
            'glare_periods_label': 'Glare periods',
            'glare_duration_label': 'Glare duration',
            'glare_intensity_label': 'Glare intensity',
            
            # Free version
            'free_version_alert': 'Free Version: Not all details are visible.',
            
            # Legal
            'disclaimer_text': (
                'This document is an automatically generated report produced by our software. '
                'The information contained herein is provided solely for informational purposes and should not be considered as professional advice. '
                'Although every effort has been made to ensure the accuracy and reliability of the data and analysis, the report is generated without manual review and may contain errors, omissions, or inaccuracies. '
                'The developers, licensors, and affiliated parties disclaim any liability for any direct or indirect damages or consequences arising from the use of this information. '
                'Users are encouraged to verify the data independently and consult with qualified professionals before making any decisions based on the content of this report.'
            )
        },
        'de': {
            # General
            'title': 'Blendungsanalysebericht',
            'page': 'Seite',
            'date': 'Datum',
            'project_name': 'Projektname',
            'user_id': 'Benutzer-ID',
            'project_id': 'Projekt-ID',
            'simulation_id': 'Simulations-ID',
            'timestamp': 'Zeitstempel',
            'version_calculator': 'Rechner-Version',
            
            # Report sections
            'executive_summary': 'Zusammenfassung',
            'table_of_contents': 'Inhaltsverzeichnis',
            'overview_map': 'Übersichtskarte',
            'simulation_parameters': 'Simulationsparameter',
            'evaluation_of_results': 'Bewertung der Ergebnisse',
            'summary_of_results': 'Zusammenfassung der Ergebnisse',
            'detailed_analysis': 'Detaillierte Analyse',
            'pv_areas_details': 'PV-Anlagen Details',
            'detection_points_details': 'Messpunkte Details',
            'disclaimer_label': 'Haftungsausschluss',
            
            # Data labels  
            'dni': 'Direkte Normalstrahlung (W/m²)',
            'incidence_angle': 'Einfallswinkel (°)',
            'sun_azimuth': 'Sonnenazimut (°)',
            'sun_elevation': 'Sonnenhöhe (°)',
            'reflection_azimuth': 'Reflexionsazimut (°)',
            'reflection_elevation': 'Reflexionshöhe (°)',
            'luminance': 'Leuchtdichte (cd/m²)',
            'di_on_module': 'Direktstrahlung auf Modul (W/m²)',
            'neglectable_glare': 'Vernachlässigbare Blendung',
            
            # Statistics
            'total_hours': 'Gesamte Blendungsstunden',
            'max_daily': 'Maximale Tagesdauer (min)',
            'days_with_glare': 'Tage mit Blendung',
            'peak_intensity': 'Spitzenintensität (cd/m²)',
            
            # Traffic light system
            'green_label': 'Grün – Keine oder geringe Blendwirkung',
            'yellow_label': 'Gelb – Erhöhte Blendung',
            'red_label': 'Rot – Erhebliche Blendwirkung',
            
            # Visualization labels
            'glare_periods_label': 'Blendungszeiten',
            'glare_duration_label': 'Blendungsdauer',
            'glare_intensity_label': 'Blendungsintensität',
            
            # Free version
            'free_version_alert': 'Kostenlose Version: Nicht alle Details sind sichtbar.',
            
            # Legal
            'disclaimer_text': (
                'Dieses Dokument ist ein automatisch generierter Bericht unserer Software. '
                'Die hierin enthaltenen Informationen werden ausschließlich zu Informationszwecken bereitgestellt und sollten nicht als professionelle Beratung betrachtet werden. '
                'Obwohl alle Anstrengungen unternommen wurden, um die Genauigkeit und Zuverlässigkeit der Daten und Analysen sicherzustellen, wird der Bericht ohne manuelle Überprüfung erstellt und kann Fehler, Auslassungen oder Ungenauigkeiten enthalten. '
                'Die Entwickler, Lizenzgeber und verbundenen Parteien lehnen jede Haftung für direkte oder indirekte Schäden oder Folgen ab, die aus der Nutzung dieser Informationen entstehen. '
                'Nutzer werden ermutigt, die Daten unabhängig zu überprüfen und qualifizierte Fachkräfte zu konsultieren, bevor sie Entscheidungen auf Basis des Inhalts dieses Berichts treffen.'
            )
        }
    }
    
    return labels.get(language, labels['en'])


def format_number(value: Union[int, float], decimal_places: int = 1) -> str:
    """Format number with thousands separator.
    
    Args:
        value: Number to format
        decimal_places: Number of decimal places
        
    Returns:
        Formatted number string
    """
    if isinstance(value, (int, float)):
        return f"{value:,.{decimal_places}f}"
    return str(value)


def format_percentage(value: Union[int, float], decimal_places: int = 1) -> str:
    """Format percentage value.
    
    Args:
        value: Percentage value (0-100)
        decimal_places: Number of decimal places
        
    Returns:
        Formatted percentage string
    """
    if isinstance(value, (int, float)):
        return f"{value:.{decimal_places}f}%"
    return str(value)


def get_traffic_light_color(daily_minutes: float, annual_hours: float = None) -> str:
    """Determine traffic light color based on glare duration.
    
    Args:
        daily_minutes: Daily glare duration in minutes
        annual_hours: Annual glare hours (optional)
        
    Returns:
        Color code: 'green', 'yellow', or 'red'
    """
    # Based on German LAI guidelines and Swiss guidelines
    if daily_minutes <= 30 and (annual_hours is None or annual_hours <= 30):
        return 'green'
    elif daily_minutes <= 60 and (annual_hours is None or annual_hours <= 50):
        return 'yellow'
    else:
        return 'red'


def create_summary_statistics(glare_data) -> Dict[str, Any]:
    """Create summary statistics from glare data.
    
    Args:
        glare_data: DataFrame with glare events
        
    Returns:
        Dictionary with summary statistics
    """
    if glare_data.empty:
        return {
            'total_events': 0,
            'total_hours': 0,
            'days_with_glare': 0,
            'max_daily_minutes': 0,
            'avg_daily_minutes': 0,
            'max_intensity': 0,
            'avg_intensity': 0
        }
    
    # Basic statistics
    total_events = len(glare_data)
    
    # Time-based statistics
    if 'timestamp' in glare_data.columns:
        glare_data['date'] = glare_data['timestamp'].dt.date
        daily_counts = glare_data.groupby('date').size()
        days_with_glare = len(daily_counts)
        
        # Assuming each event is 1 minute (configurable)
        minutes_per_event = 1
        total_minutes = total_events * minutes_per_event
        total_hours = total_minutes / 60
        
        max_daily_minutes = daily_counts.max() * minutes_per_event
        avg_daily_minutes = total_minutes / 365 if days_with_glare > 0 else 0
    else:
        days_with_glare = 0
        total_hours = 0
        max_daily_minutes = 0
        avg_daily_minutes = 0
    
    # Intensity statistics
    if 'luminance' in glare_data.columns:
        max_intensity = glare_data['luminance'].max()
        avg_intensity = glare_data['luminance'].mean()
    else:
        max_intensity = 0
        avg_intensity = 0
    
    return {
        'total_events': total_events,
        'total_hours': total_hours,
        'days_with_glare': days_with_glare,
        'max_daily_minutes': max_daily_minutes,
        'avg_daily_minutes': avg_daily_minutes,
        'max_intensity': max_intensity,
        'avg_intensity': avg_intensity
    }