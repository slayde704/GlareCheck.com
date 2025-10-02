"""Base classes and utilities for visualization."""

import logging
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server environments
import matplotlib.pyplot as plt
from dataclasses import dataclass
from typing import Tuple, Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class PlotConfig:
    """Configuration for plot generation."""
    figure_size: Tuple[float, float] = (10, 8)
    dpi: int = 300
    font_size: int = 12
    color_scheme: str = 'viridis'
    output_format: str = 'png'
    apply_blur: bool = True
    blur_radius: int = 85
    language: str = 'en'
    
    def __post_init__(self):
        """Validate configuration."""
        if self.dpi < 72:
            logger.warning(f"DPI {self.dpi} is very low, using 72")
            self.dpi = 72
        if self.language not in ['en', 'de']:
            logger.warning(f"Unknown language {self.language}, using 'en'")
            self.language = 'en'


def setup_matplotlib(config: Optional[PlotConfig] = None) -> None:
    """Configure matplotlib for publication-quality plots.
    
    Args:
        config: Optional plot configuration
    """
    if config is None:
        config = PlotConfig()
    
    # Set global parameters
    plt.rcParams.update({
        'figure.dpi': config.dpi,
        'savefig.dpi': config.dpi,
        'font.size': config.font_size,
        'font.family': 'sans-serif',
        'font.sans-serif': ['DejaVu Sans', 'Arial', 'Helvetica'],
        'axes.labelsize': config.font_size,
        'axes.titlesize': config.font_size + 2,
        'xtick.labelsize': config.font_size - 2,
        'ytick.labelsize': config.font_size - 2,
        'legend.fontsize': config.font_size - 2,
        'figure.titlesize': config.font_size + 4,
        'axes.linewidth': 1.0,
        'axes.grid': True,
        'grid.linestyle': '--',
        'grid.linewidth': 0.5,
        'grid.alpha': 0.7,
        'figure.autolayout': True
    })
    
    logger.info(f"Matplotlib configured with DPI={config.dpi}, font_size={config.font_size}")


def get_labels(language: str) -> Dict[str, Dict[str, str]]:
    """Get localized labels for plots.
    
    Args:
        language: Language code ('en' or 'de')
        
    Returns:
        Dictionary of label dictionaries by plot type
    """
    labels = {
        'en': {
            # Common labels
            'date': 'Date',
            'time_of_day': 'Time of Day (HH:MM in UTC',
            'azimuth': 'Azimuth Angle (°)',
            'elevation': 'Elevation Angle (°)',
            
            # Glare duration plot
            'glare_occurrence': 'Glare Occurrence',
            'superimposed': 'Superimposed by Sun/Intensity below Threshold',
            'minutes_per_day': 'Minutes per Day',
            'glare_periods_title': 'Glare periods for DP',
            'glare_duration_title': 'Glare duration per Day for DP',
            
            # Glare intensity plot
            'luminance': 'Luminance (cd/m²)',
            'glare_intensity_title': 'Glare intensity for DP',
            
            # PV area plot
            'colorbar_label': 'Glare Minutes per Year',
            'pv_area_title': 'All PV Areas from the Perspective of DP',
            
            # Months
            'months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },
        'de': {
            # Common labels
            'date': 'Datum',
            'time_of_day': 'Tageszeit (HH:MM in UTC',
            'azimuth': 'Azimutwinkel (°)',
            'elevation': 'Elevationswinkel (°)',
            
            # Glare duration plot
            'glare_occurrence': 'Blendwirkung vorhanden',
            'superimposed': 'Überlagert durch Sonne/Intensität unter Schwellenwert',
            'minutes_per_day': 'Minuten pro Tag',
            'glare_periods_title': 'Blendungszeiten für MP',
            'glare_duration_title': 'Blendungsdauer pro Tag für MP',
            
            # Glare intensity plot
            'luminance': 'Leuchtdichte (cd/m²)',
            'glare_intensity_title': 'Blendstärke für MP',
            
            # PV area plot  
            'colorbar_label': 'Blendungsminuten pro Jahr',
            'pv_area_title': 'Alle PV-Flächen aus der Sicht von MP',
            
            # Months
            'months': ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
        }
    }
    
    return labels.get(language, labels['en'])


def save_figure(fig: plt.Figure, 
                output_path: Path,
                dpi: Optional[int] = None,
                format: Optional[str] = None) -> bool:
    """Save matplotlib figure to file.
    
    Args:
        fig: Matplotlib figure to save
        output_path: Path to save figure to
        dpi: DPI for output (overrides config)
        format: Output format (overrides extension)
        
    Returns:
        True if successful
    """
    try:
        # Ensure directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Determine format
        if format is None:
            format = output_path.suffix[1:] if output_path.suffix else 'png'
        
        # Save figure
        fig.savefig(
            output_path,
            format=format,
            dpi=dpi,
            bbox_inches='tight',
            pad_inches=0.1
        )
        
        logger.debug(f"Saved figure to {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to save figure: {e}")
        return False


def close_figure(fig: plt.Figure) -> None:
    """Properly close a matplotlib figure to free memory.
    
    Args:
        fig: Figure to close
    """
    plt.close(fig)
    
    # Force garbage collection for large figures
    import gc
    gc.collect()


def circular_mean(angles_deg: list) -> float:
    """Calculate circular mean of angles in degrees.
    
    Args:
        angles_deg: List of angles in degrees
        
    Returns:
        Circular mean in degrees [0, 360)
    """
    import numpy as np
    
    if not angles_deg:
        return 0.0
    
    # Convert to radians
    angles_rad = np.radians(angles_deg)
    
    # Calculate mean using complex numbers
    mean_sin = np.mean(np.sin(angles_rad))
    mean_cos = np.mean(np.cos(angles_rad))
    
    # Convert back to degrees
    mean_angle = np.degrees(np.arctan2(mean_sin, mean_cos))
    
    # Normalize to [0, 360)
    if mean_angle < 0:
        mean_angle += 360
    
    return mean_angle


def recenter_azimuth(azimuth: float, center: float) -> float:
    """Recenter azimuth around a given center angle.
    
    This is useful for preventing wraparound issues in plots.
    
    Args:
        azimuth: Azimuth angle in degrees
        center: Center angle in degrees
        
    Returns:
        Recentered azimuth
    """
    diff = azimuth - center
    
    # Normalize to [-180, 180]
    while diff > 180:
        diff -= 360
    while diff < -180:
        diff += 360
    
    return center + diff