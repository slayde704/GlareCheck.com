"""Visualization module for glare analysis plots and maps."""

from .base import PlotConfig, setup_matplotlib
from .glare_plots import GlarePlotter
from .effects import apply_blur_effect

# Add compatibility methods
from .glare_plots_extension import add_compatibility_methods
add_compatibility_methods()

__all__ = [
    'PlotConfig',
    'setup_matplotlib', 
    'GlarePlotter',
    'apply_blur_effect'
]