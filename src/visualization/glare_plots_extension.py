"""Extension methods for GlarePlotter to support pipeline compatibility."""

from pathlib import Path
from typing import Optional, List, Any
import pandas as pd
import logging

logger = logging.getLogger(__name__)


def create_glare_periods_plot(self, events_df: Optional[pd.DataFrame], op_number: int) -> Optional[Path]:
    """Create glare periods plot for a single observation point.
    
    Wrapper method for pipeline compatibility.
    """
    if events_df is None or events_df.empty:
        logger.warning(f"No events data for observation point {op_number}")
        return None
    
    # Create dummy observation point
    class DummyOP:
        def __init__(self, num):
            self.name = f"DP {num}"
    
    dummy_op = DummyOP(op_number)
    
    # Add op_number column if missing
    if 'op_number' not in events_df.columns:
        events_df = events_df.copy()
        events_df['op_number'] = op_number
    
    # Call the main method
    result = self.plot_glare_periods(events_df, [dummy_op])
    
    # Return the path for this OP
    return result.get(1, None)  # Use 1 because we process as first OP


def create_glare_duration_plot(self, events_df: Optional[pd.DataFrame], op_number: int) -> Optional[Path]:
    """Create glare duration plot for a single observation point.
    
    Wrapper method for pipeline compatibility.
    """
    if events_df is None or events_df.empty:
        logger.warning(f"No events data for observation point {op_number}")
        return None
    
    # Create dummy observation point
    class DummyOP:
        def __init__(self, num):
            self.name = f"DP {num}"
    
    dummy_op = DummyOP(op_number)
    
    # Add op_number column if missing
    if 'op_number' not in events_df.columns:
        events_df = events_df.copy()
        events_df['op_number'] = op_number
    
    # Call the main method
    result = self.plot_glare_duration(events_df, [dummy_op])
    
    # Return the path for this OP
    return result.get(1, None)


def create_glare_intensity_plot(self, events_df: Optional[pd.DataFrame], op_number: int) -> Optional[Path]:
    """Create glare intensity plot for a single observation point.
    
    Wrapper method for pipeline compatibility.
    """
    if events_df is None or events_df.empty:
        logger.warning(f"No events data for observation point {op_number}")
        return None
    
    # Create dummy observation point
    class DummyOP:
        def __init__(self, num):
            self.name = f"DP {num}"
    
    dummy_op = DummyOP(op_number)
    
    # Add op_number column if missing
    if 'op_number' not in events_df.columns:
        events_df = events_df.copy()
        events_df['op_number'] = op_number
    
    # Call the main method
    result = self.plot_glare_intensity(events_df, [dummy_op])
    
    # Return the path for this OP
    return result.get(1, None)


def create_pv_areas_map(self, pv_areas: List[Any], observation_points: List[Any], op_number: int) -> Optional[Path]:
    """Create PV areas map for a single observation point.
    
    Wrapper method for pipeline compatibility.
    """
    # For now, return None as this requires more complex data
    # This would need corner_data and calc_results DataFrames
    logger.info(f"PV areas map generation not yet implemented for OP {op_number}")
    return None


# Monkey patch the methods onto GlarePlotter
def add_compatibility_methods():
    """Add compatibility methods to GlarePlotter class."""
    from .glare_plots import GlarePlotter
    
    GlarePlotter.create_glare_periods_plot = create_glare_periods_plot
    GlarePlotter.create_glare_duration_plot = create_glare_duration_plot
    GlarePlotter.create_glare_intensity_plot = create_glare_intensity_plot
    GlarePlotter.create_pv_areas_map = create_pv_areas_map