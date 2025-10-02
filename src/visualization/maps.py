"""Geographic and spatial visualization functions."""

import logging
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Polygon, Circle, FancyArrowPatch
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint

from .base import PlotConfig, save_figure, close_figure, get_labels
from .effects import apply_blur_effect
from ..core.models import PVArea, ObservationPoint

logger = logging.getLogger(__name__)


class MapPlotter:
    """Class for generating geographic visualizations."""
    
    def __init__(self, config: PlotConfig):
        """Initialize map plotter.
        
        Args:
            config: Plot configuration
        """
        self.config = config
        self.labels = get_labels(config.language)
    
    def plot_pv_area_map(
        self,
        pv_areas: List[PVArea],
        observation_points: List[ObservationPoint],
        output_path: Path,
        show_glare_paths: bool = False,
        glare_data: Optional[Dict] = None
    ) -> bool:
        """Create a map showing PV areas and observation points.
        
        Args:
            pv_areas: List of PV areas to plot
            observation_points: List of observation points
            output_path: Path to save map
            show_glare_paths: Whether to show glare reflection paths
            glare_data: Optional glare data for paths
            
        Returns:
            True if successful
        """
        fig, ax = plt.subplots(figsize=(12, 10))
        
        # Convert coordinates to local system (simplified - using lon/lat as x/y)
        # In production, would transform to appropriate UTM zone
        
        # Plot PV areas
        for pv_area in pv_areas:
            # Extract coordinates
            coords = [(c.longitude, c.latitude) for c in pv_area.corners]
            
            # Create polygon patch
            poly = Polygon(coords, facecolor='lightblue', edgecolor='darkblue', 
                          linewidth=2, alpha=0.7, label=pv_area.name)
            ax.add_patch(poly)
            
            # Add label at centroid
            centroid_x = np.mean([c[0] for c in coords])
            centroid_y = np.mean([c[1] for c in coords])
            ax.text(centroid_x, centroid_y, pv_area.name, 
                   ha='center', va='center', fontsize=10, weight='bold')
            
            # Plot holes if any
            if hasattr(pv_area, 'holes') and pv_area.holes:
                for hole in pv_area.holes:
                    hole_coords = [(p.longitude, p.latitude) for p in hole]
                    hole_poly = Polygon(hole_coords, facecolor='white', 
                                      edgecolor='darkblue', linewidth=1)
                    ax.add_patch(hole_poly)
        
        # Plot observation points
        for i, obs_point in enumerate(observation_points):
            x = obs_point.coordinate.longitude
            y = obs_point.coordinate.latitude
            
            # Plot marker
            circle = Circle((x, y), radius=0.0001, color='red', zorder=10)
            ax.add_patch(circle)
            
            # Add label
            ax.text(x, y + 0.0002, f"OP{i+1}\n{obs_point.name}", 
                   ha='center', va='bottom', fontsize=9,
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='yellow', alpha=0.7))
        
        # Add glare paths if requested
        if show_glare_paths and glare_data:
            self._add_glare_paths(ax, pv_areas, observation_points, glare_data)
        
        # Add map elements
        self._add_north_arrow(ax)
        self._add_scale_bar(ax)
        
        # Set equal aspect ratio
        ax.set_aspect('equal')
        
        # Labels
        ax.set_xlabel('Longitude')
        ax.set_ylabel('Latitude')
        ax.set_title('PV Installation Overview Map')
        ax.grid(True, linestyle='--', alpha=0.5)
        
        # Adjust limits with margin
        all_lons = []
        all_lats = []
        for pv_area in pv_areas:
            all_lons.extend([c.longitude for c in pv_area.corners])
            all_lats.extend([c.latitude for c in pv_area.corners])
        for op in observation_points:
            all_lons.append(op.coordinate.longitude)
            all_lats.append(op.coordinate.latitude)
        
        margin = 0.001  # degrees
        ax.set_xlim(min(all_lons) - margin, max(all_lons) + margin)
        ax.set_ylim(min(all_lats) - margin, max(all_lats) + margin)
        
        # Save
        success = save_figure(fig, output_path, dpi=self.config.dpi)
        
        if success and self.config.apply_blur:
            apply_blur_effect(output_path, radius=self.config.blur_radius)
        
        close_figure(fig)
        return success
    
    def _add_glare_paths(
        self,
        ax: plt.Axes,
        pv_areas: List[PVArea],
        observation_points: List[ObservationPoint],
        glare_data: Dict
    ) -> None:
        """Add glare reflection paths to map.
        
        Args:
            ax: Matplotlib axes
            pv_areas: List of PV areas
            observation_points: List of observation points
            glare_data: Glare data with reflection information
        """
        # Simplified - would use actual glare calculation results
        for pv_area in pv_areas:
            pv_center_x = np.mean([c.longitude for c in pv_area.corners])
            pv_center_y = np.mean([c.latitude for c in pv_area.corners])
            
            for op in observation_points:
                # Draw arrow from PV to observer
                arrow = FancyArrowPatch(
                    (pv_center_x, pv_center_y),
                    (op.coordinate.longitude, op.coordinate.latitude),
                    arrowstyle='->', 
                    color='orange',
                    linewidth=2,
                    alpha=0.6,
                    connectionstyle="arc3,rad=0.1"
                )
                ax.add_patch(arrow)
    
    def _add_north_arrow(self, ax: plt.Axes) -> None:
        """Add north arrow to map.
        
        Args:
            ax: Matplotlib axes
        """
        # Get axis limits
        xlim = ax.get_xlim()
        ylim = ax.get_ylim()
        
        # Position in upper right
        x = xlim[1] - 0.1 * (xlim[1] - xlim[0])
        y = ylim[1] - 0.1 * (ylim[1] - ylim[0])
        
        # Arrow length
        length = 0.05 * (ylim[1] - ylim[0])
        
        # Draw arrow
        ax.annotate('N', xy=(x, y), xytext=(x, y - length),
                   arrowprops=dict(arrowstyle='->', lw=2),
                   ha='center', va='bottom', fontsize=14, weight='bold')
    
    def _add_scale_bar(self, ax: plt.Axes) -> None:
        """Add scale bar to map.
        
        Args:
            ax: Matplotlib axes
        """
        # Simplified - would calculate actual distance
        xlim = ax.get_xlim()
        ylim = ax.get_ylim()
        
        # Position in lower left
        x = xlim[0] + 0.1 * (xlim[1] - xlim[0])
        y = ylim[0] + 0.05 * (ylim[1] - ylim[0])
        
        # Bar length (rough approximation)
        bar_length = 0.1 * (xlim[1] - xlim[0])
        
        # Draw bar
        ax.plot([x, x + bar_length], [y, y], 'k-', linewidth=3)
        ax.plot([x, x], [y - 0.002, y + 0.002], 'k-', linewidth=3)
        ax.plot([x + bar_length, x + bar_length], [y - 0.002, y + 0.002], 'k-', linewidth=3)
        
        # Add label (rough approximation of distance)
        distance_m = bar_length * 111000  # Very rough: 1 degree ≈ 111 km
        if distance_m < 1000:
            label = f"{distance_m:.0f} m"
        else:
            label = f"{distance_m/1000:.1f} km"
        
        ax.text(x + bar_length/2, y - 0.003, label, ha='center', va='top')
    
    def create_utm_map(
        self,
        pv_areas: List[PVArea],
        observation_points: List[ObservationPoint],
        output_path: Path,
        utm_zone: Optional[int] = None
    ) -> bool:
        """Create a map in UTM coordinates.
        
        Args:
            pv_areas: List of PV areas
            observation_points: List of observation points
            output_path: Path to save map
            utm_zone: Optional UTM zone (will auto-detect if None)
            
        Returns:
            True if successful
        """
        # This would use pyproj to transform to UTM
        # For now, redirect to regular map
        return self.plot_pv_area_map(pv_areas, observation_points, output_path)