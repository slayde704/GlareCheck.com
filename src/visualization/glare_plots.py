"""Glare-specific visualization functions."""

import logging
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.colors as mcolors
from matplotlib.patches import Patch
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

from .base import PlotConfig, save_figure, close_figure, get_labels, recenter_azimuth, circular_mean
from .effects import apply_blur_effect
from ..core.models import ObservationPoint

logger = logging.getLogger(__name__)


class GlarePlotter:
    """Main class for generating glare visualizations."""
    
    def __init__(self, config: PlotConfig, output_dir: Path):
        """Initialize plotter with configuration.
        
        Args:
            config: Plot configuration
            output_dir: Base output directory
        """
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.labels = get_labels(config.language)
    
    def plot_glare_periods(
        self,
        glare_data: pd.DataFrame,
        observation_points: List[ObservationPoint],
        utc_offset: float = 0,
        intensity_threshold: float = 30000
    ) -> Dict[int, Path]:
        """Create scatter plots showing when glare occurs.
        
        Args:
            glare_data: DataFrame with glare events
            observation_points: List of observation points
            utc_offset: UTC offset for display
            intensity_threshold: Threshold for significant glare
            
        Returns:
            Dictionary mapping OP numbers to output paths
        """
        output_paths = {}
        
        # Ensure required columns
        if 'timestamp' not in glare_data.columns:
            logger.warning("No timestamp column in glare data")
            return output_paths
        
        # Convert timestamps
        if 'timestamp_local' not in glare_data.columns:
            glare_data['timestamp_local'] = pd.to_datetime(glare_data['timestamp'])
            if utc_offset != 0:
                glare_data['timestamp_local'] += pd.Timedelta(hours=utc_offset)
        
        glare_data['Date'] = glare_data['timestamp_local'].dt.date
        glare_data['Time'] = (
            glare_data['timestamp_local'].dt.hour +
            glare_data['timestamp_local'].dt.minute / 60.0
        )
        
        # Determine year
        if not glare_data.empty:
            year = glare_data['timestamp_local'].dt.year.iloc[0]
        else:
            year = datetime.now().year
        
        utc_offset_str = f"{utc_offset:+.0f})"
        
        # Create plot for each observation point
        for idx, op in enumerate(observation_points):
            op_num = idx + 1
            df_op = glare_data[glare_data.get('op_number', glare_data.get('OP Number')) == op_num].copy()
            
            fig, ax = plt.subplots(figsize=self.config.figure_size)
            
            if df_op.empty:
                # Empty plot with legend
                ax.scatter([], [], color='yellow', label=self.labels['glare_occurrence'], s=20)
                ax.scatter([], [], color='gray', label=self.labels['superimposed'], s=20)
            else:
                # Determine which points are superimposed
                if 'Within_Threshold' in df_op.columns and 'Luminance' in df_op.columns:
                    df_op['Superimposed'] = (
                        df_op['Within_Threshold'] | 
                        (df_op['Luminance'] < intensity_threshold)
                    )
                else:
                    df_op['Superimposed'] = False
                
                # Plot points
                glare_mask = ~df_op['Superimposed']
                if glare_mask.any():
                    ax.scatter(
                        df_op.loc[glare_mask, 'Date'],
                        df_op.loc[glare_mask, 'Time'],
                        color='yellow',
                        label=self.labels['glare_occurrence'],
                        s=20
                    )
                
                super_mask = df_op['Superimposed']
                if super_mask.any():
                    ax.scatter(
                        df_op.loc[super_mask, 'Date'],
                        df_op.loc[super_mask, 'Time'],
                        color='gray',
                        label=self.labels['superimposed'],
                        s=20
                    )
            
            # Format axes
            ax.xaxis.set_major_locator(mdates.MonthLocator())
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%b'))
            ax.set_xlim(pd.Timestamp(f'{year}-01-01'), pd.Timestamp(f'{year}-12-31'))
            ax.set_ylim(0, 24)
            ax.set_yticks(range(0, 25, 2))
            ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{int(x):02d}:00'))
            
            # Labels and title
            ax.set_xlabel(self.labels['date'])
            ax.set_ylabel(self.labels['time_of_day'] + utc_offset_str)
            op_name = op.name if hasattr(op, 'name') else f"DP {op_num}"
            ax.set_title(f"{self.labels['glare_periods_title']} {op_name}")
            ax.grid(True, linestyle='--', linewidth=0.5)
            ax.legend(loc='best')
            
            # Save
            output_path = self.output_dir / f"glare_periods_dp_{op_num}.png"
            if save_figure(fig, output_path, dpi=self.config.dpi):
                output_paths[op_num] = output_path
                
                # Create blur version if requested
                if self.config.apply_blur:
                    apply_blur_effect(output_path, radius=self.config.blur_radius)
            
            close_figure(fig)
        
        return output_paths
    
    def plot_glare_duration(
        self,
        glare_data: pd.DataFrame,
        observation_points: List[ObservationPoint],
        minutes_per_step: float = 1.0
    ) -> Dict[int, Path]:
        """Create bar charts showing daily glare duration.
        
        Args:
            glare_data: DataFrame with glare events
            observation_points: List of observation points
            minutes_per_step: Minutes per time step
            
        Returns:
            Dictionary mapping OP numbers to output paths
        """
        output_paths = {}
        
        if 'timestamp_local' not in glare_data.columns and 'timestamp' in glare_data.columns:
            glare_data['timestamp_local'] = pd.to_datetime(glare_data['timestamp'])
        
        if not glare_data.empty:
            glare_data['Day'] = glare_data['timestamp_local'].dt.date
        
        for idx, op in enumerate(observation_points):
            op_num = idx + 1
            df_op = glare_data[glare_data.get('op_number', glare_data.get('OP Number')) == op_num].copy()
            
            fig, ax = plt.subplots(figsize=self.config.figure_size)
            
            if not df_op.empty:
                # Aggregate by day
                daily_minutes = df_op.groupby('Day').size() * minutes_per_step
                
                # Create bar chart
                ax.bar(daily_minutes.index, daily_minutes.values, color='orange', edgecolor='black')
                
                # Format x-axis
                ax.xaxis.set_major_locator(mdates.MonthLocator())
                ax.xaxis.set_major_formatter(mdates.DateFormatter('%b'))
                ax.set_xlim(
                    pd.Timestamp(f'{daily_minutes.index[0].year}-01-01'),
                    pd.Timestamp(f'{daily_minutes.index[0].year}-12-31')
                )
            else:
                # Empty plot
                ax.bar([], [], color='orange')
            
            # Labels and title
            ax.set_xlabel(self.labels['date'])
            ax.set_ylabel(self.labels['minutes_per_day'])
            op_name = op.name if hasattr(op, 'name') else f"DP {op_num}"
            ax.set_title(f"{self.labels['glare_duration_title']} {op_name}")
            ax.grid(True, axis='y', linestyle='--', linewidth=0.5)
            
            # Save
            output_path = self.output_dir / f"glare_duration_dp_{op_num}.png"
            if save_figure(fig, output_path, dpi=self.config.dpi):
                output_paths[op_num] = output_path
                
                if self.config.apply_blur:
                    apply_blur_effect(output_path, radius=self.config.blur_radius)
            
            close_figure(fig)
        
        return output_paths
    
    def plot_glare_intensity(
        self,
        glare_data: pd.DataFrame,
        observation_points: List[ObservationPoint],
        utc_offset: float = 0
    ) -> Dict[int, Path]:
        """Create heatmaps showing glare intensity over time.
        
        Args:
            glare_data: DataFrame with glare events including luminance
            observation_points: List of observation points
            utc_offset: UTC offset for display
            
        Returns:
            Dictionary mapping OP numbers to output paths
        """
        output_paths = {}
        
        # Prepare data
        if 'timestamp' in glare_data.columns:
            glare_data['Date'] = pd.to_datetime(glare_data['timestamp']).dt.date
            glare_data['Time'] = (
                pd.to_datetime(glare_data['timestamp']).dt.hour +
                pd.to_datetime(glare_data['timestamp']).dt.minute / 60.0
            )
            if utc_offset != 0:
                glare_data['Time'] = (glare_data['Time'] + utc_offset) % 24
        
        utc_offset_str = f"{utc_offset:+.0f})"
        
        # Setup colormap
        cmap = plt.cm.RdYlGn_r
        norm = plt.Normalize(vmin=0, vmax=100000)
        
        for idx, op in enumerate(observation_points):
            op_num = idx + 1
            df_op = glare_data[glare_data.get('op_number', glare_data.get('OP Number')) == op_num].copy()
            
            fig, ax = plt.subplots(figsize=self.config.figure_size)
            
            if df_op.empty or 'Luminance' not in df_op.columns:
                # Empty scatter for colorbar
                sc = ax.scatter([0], [0], c=[0], cmap=cmap, norm=norm, s=5)
            else:
                sc = ax.scatter(
                    df_op['Date'],
                    df_op['Time'],
                    c=df_op['Luminance'],
                    cmap=cmap,
                    norm=norm,
                    s=5
                )
            
            # Colorbar
            cbar = fig.colorbar(sc, ax=ax, label=self.labels['luminance'])
            cbar.set_ticks([0, 25000, 50000, 75000, 100000])
            cbar.set_ticklabels(['0', '25,000', '50,000', '75,000', '≥ 100,000'])
            
            # Format axes
            if not df_op.empty:
                year = pd.to_datetime(df_op['Date'].iloc[0]).year
            else:
                year = datetime.now().year
            
            ax.xaxis.set_major_locator(mdates.MonthLocator())
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%b'))
            ax.set_xlim(pd.Timestamp(f'{year}-01-01'), pd.Timestamp(f'{year}-12-31'))
            ax.set_ylim(0, 24)
            ax.set_yticks(range(0, 25, 2))
            ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{int(x):02d}:00'))
            
            # Labels and title
            ax.set_xlabel(self.labels['date'])
            ax.set_ylabel(self.labels['time_of_day'] + utc_offset_str)
            op_name = op.name if hasattr(op, 'name') else f"DP {op_num}"
            ax.set_title(f"{self.labels['glare_intensity_title']} {op_name}")
            ax.grid(True, linestyle='--', linewidth=0.5)
            
            # Save
            output_path = self.output_dir / f"glare_intensity_dp_{op_num}.png"
            if save_figure(fig, output_path, dpi=self.config.dpi):
                output_paths[op_num] = output_path
                
                if self.config.apply_blur:
                    apply_blur_effect(output_path, radius=self.config.blur_radius)
            
            close_figure(fig)
        
        return output_paths
    
    def plot_pv_area_perspective(
        self,
        corner_data: pd.DataFrame,
        calc_results: pd.DataFrame,
        observation_points: List[ObservationPoint],
        pv_area_objects: Optional[Dict] = None,
        minutes_per_step: float = 1.0
    ) -> Dict[int, Path]:
        """Create perspective views of PV areas from observation points.
        
        Args:
            corner_data: DataFrame with PV area corner coordinates in angular space
            calc_results: DataFrame with calculation results and hit counts
            observation_points: List of observation points
            pv_area_objects: Optional dict of PV area objects with holes
            minutes_per_step: Minutes per time step for duration calculation
            
        Returns:
            Dictionary mapping OP numbers to output paths
        """
        output_paths = {}
        
        # Add original PV area name column
        if 'PV Area Name' in corner_data.columns:
            corner_data = corner_data.copy()
            corner_data['Original PV Area Name'] = corner_data['PV Area Name'].apply(
                lambda x: x.split('_')[0].strip()
            )
        
        if 'PV Area Name' in calc_results.columns:
            calc_results = calc_results.copy()
            calc_results['Original PV Area Name'] = calc_results['PV Area Name'].apply(
                lambda x: x.split('_')[0].strip()
            )
        
        for idx, op in enumerate(observation_points):
            op_num = idx + 1
            
            # Filter data for this OP
            op_corners = corner_data[corner_data.get('OP Number', corner_data.get('op_number')) == op_num]
            op_calcs = calc_results[calc_results.get('OP Number', calc_results.get('op_number')) == op_num].copy()
            
            if 'number_of_hits' in op_calcs.columns:
                op_calcs['glare_minutes'] = op_calcs['number_of_hits'] * minutes_per_step
            else:
                op_calcs['glare_minutes'] = 0
            
            # Setup plot
            fig, ax = plt.subplots(figsize=(16, 10))
            
            # Color mapping
            vmin, vmax = 0, max(1, op_calcs['glare_minutes'].max() if not op_calcs.empty else 1)
            norm = mcolors.TwoSlopeNorm(vmin=vmin, vcenter=(vmin + vmax) / 2, vmax=vmax)
            cmap = plt.cm.inferno
            
            # Calculate center for recentering
            if not op_corners.empty and 'Azimuth Angle' in op_corners.columns:
                center_az = circular_mean(op_corners['Azimuth Angle'].values)
                recenter_func = lambda az: recenter_azimuth(az, center_az)
            else:
                recenter_func = lambda az: az
            
            # Plot PV area outlines
            for area_name in op_corners.get('Original PV Area Name', []).unique():
                area_group = op_corners[op_corners['Original PV Area Name'] == area_name]
                
                for sub_name in area_group.get('PV Area Name', []).unique():
                    sub = area_group[area_group['PV Area Name'] == sub_name]
                    
                    if len(sub) >= 3 and 'Azimuth Angle' in sub.columns and 'Elevation Angle' in sub.columns:
                        azs = sub['Azimuth Angle'].apply(recenter_func).values
                        els = sub['Elevation Angle'].values
                        
                        # Close polygon
                        azs = np.append(azs, azs[0])
                        els = np.append(els, els[0])
                        
                        ax.plot(azs, els, 'k-', linewidth=1.5)
                        ax.fill(azs, els, color='lightgray', alpha=0.3)
            
            # Plot calculation points colored by glare minutes
            if not op_calcs.empty and 'Azimuth Angle' in op_calcs.columns:
                sc = ax.scatter(
                    op_calcs['Azimuth Angle'].apply(recenter_func),
                    op_calcs['Elevation Angle'],
                    c=op_calcs['glare_minutes'],
                    cmap=cmap,
                    norm=norm,
                    s=20,
                    alpha=0.8
                )
                
                # Colorbar
                cbar = fig.colorbar(sc, ax=ax, label=self.labels['colorbar_label'])
            
            # Format plot
            ax.set_xlabel(self.labels['azimuth'])
            ax.set_ylabel(self.labels['elevation'])
            op_name = op.name if hasattr(op, 'name') else f"DP {op_num}"
            ax.set_title(f"{self.labels['pv_area_title']} {op_name}")
            ax.grid(True, linestyle='--', linewidth=0.5)
            
            # Set reasonable limits
            if not op_corners.empty:
                az_margin = 10
                el_margin = 5
                ax.set_xlim(
                    op_corners['Azimuth Angle'].apply(recenter_func).min() - az_margin,
                    op_corners['Azimuth Angle'].apply(recenter_func).max() + az_margin
                )
                ax.set_ylim(
                    max(-90, op_corners['Elevation Angle'].min() - el_margin),
                    min(90, op_corners['Elevation Angle'].max() + el_margin)
                )
            
            # Save
            output_path = self.output_dir / f"pv_areas_dp_{op_num}.png"
            if save_figure(fig, output_path, dpi=self.config.dpi):
                output_paths[op_num] = output_path
                
                if self.config.apply_blur:
                    apply_blur_effect(output_path, radius=self.config.blur_radius)
            
            close_figure(fig)
        
        return output_paths