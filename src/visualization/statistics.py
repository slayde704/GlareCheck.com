"""Statistical visualization functions."""

import logging
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, List, Optional
import calendar

from .base import PlotConfig, save_figure, close_figure, get_labels
from .effects import apply_blur_effect

logger = logging.getLogger(__name__)


class StatisticsPlotter:
    """Class for generating statistical visualizations."""
    
    def __init__(self, config: PlotConfig, output_dir: Path):
        """Initialize statistics plotter.
        
        Args:
            config: Plot configuration
            output_dir: Output directory
        """
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.labels = get_labels(config.language)
    
    def plot_monthly_statistics(
        self,
        glare_data: pd.DataFrame,
        observation_points: List,
        output_path: Optional[Path] = None
    ) -> Path:
        """Create bar chart of monthly glare statistics.
        
        Args:
            glare_data: DataFrame with glare events
            observation_points: List of observation points
            output_path: Optional output path
            
        Returns:
            Path to saved plot
        """
        if output_path is None:
            output_path = self.output_dir / "monthly_statistics.png"
        
        # Prepare data
        if 'timestamp' in glare_data.columns:
            glare_data['month'] = pd.to_datetime(glare_data['timestamp']).dt.month
            glare_data['op_number'] = glare_data.get('op_number', glare_data.get('OP Number', 1))
        
        # Create figure with subplots for each OP
        n_ops = len(observation_points)
        fig, axes = plt.subplots(n_ops, 1, figsize=(12, 4 * n_ops), squeeze=False)
        
        for idx, op in enumerate(observation_points):
            ax = axes[idx, 0]
            op_num = idx + 1
            
            # Filter data for this OP
            op_data = glare_data[glare_data['op_number'] == op_num]
            
            if not op_data.empty and 'month' in op_data.columns:
                # Count events by month
                monthly_counts = op_data.groupby('month').size()
                
                # Ensure all months are represented
                all_months = range(1, 13)
                counts = [monthly_counts.get(m, 0) for m in all_months]
            else:
                counts = [0] * 12
            
            # Create bar chart
            months = [calendar.month_abbr[i] for i in range(1, 13)]
            bars = ax.bar(months, counts, color='skyblue', edgecolor='navy')
            
            # Highlight summer months
            for i in [5, 6, 7]:  # June, July, August (0-indexed)
                bars[i].set_color('orange')
            
            # Labels and title
            ax.set_xlabel('Month')
            ax.set_ylabel('Number of Glare Events')
            op_name = op.name if hasattr(op, 'name') else f"OP {op_num}"
            ax.set_title(f'Monthly Glare Distribution - {op_name}')
            ax.grid(True, axis='y', alpha=0.3)
            
            # Add value labels on bars
            for bar, count in zip(bars, counts):
                if count > 0:
                    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                           str(int(count)), ha='center', va='bottom')
        
        plt.tight_layout()
        
        # Save
        if save_figure(fig, output_path, dpi=self.config.dpi):
            if self.config.apply_blur:
                apply_blur_effect(output_path, radius=self.config.blur_radius)
        
        close_figure(fig)
        return output_path
    
    def plot_annual_summary(
        self,
        glare_statistics: Dict,
        output_path: Optional[Path] = None
    ) -> Path:
        """Create annual summary visualizations.
        
        Args:
            glare_statistics: Dictionary with annual statistics
            output_path: Optional output path
            
        Returns:
            Path to saved plot
        """
        if output_path is None:
            output_path = self.output_dir / "annual_summary.png"
        
        fig = plt.figure(figsize=(15, 10))
        
        # Create grid for subplots
        gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)
        
        # 1. Pie chart: Days with/without glare
        ax1 = fig.add_subplot(gs[0, 0])
        days_with = glare_statistics.get('days_with_glare', 0)
        days_without = 365 - days_with
        
        wedges, texts, autotexts = ax1.pie(
            [days_with, days_without],
            labels=['Days with Glare', 'Days without Glare'],
            colors=['orange', 'lightgreen'],
            autopct='%1.1f%%',
            startangle=90
        )
        ax1.set_title('Annual Glare Occurrence')
        
        # 2. Bar chart: Total glare hours by observation point
        ax2 = fig.add_subplot(gs[0, 1])
        if 'op_statistics' in glare_statistics:
            op_names = list(glare_statistics['op_statistics'].keys())
            op_hours = [stats.get('total_hours', 0) for stats in glare_statistics['op_statistics'].values()]
            
            bars = ax2.bar(op_names, op_hours, color='coral')
            ax2.set_xlabel('Observation Point')
            ax2.set_ylabel('Total Glare Hours')
            ax2.set_title('Total Annual Glare Hours by Observation Point')
            
            # Add value labels
            for bar, hours in zip(bars, op_hours):
                ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                        f'{hours:.1f}', ha='center', va='bottom')
        
        # 3. Line chart: Average daily glare duration by month
        ax3 = fig.add_subplot(gs[1, :])
        if 'monthly_average_minutes' in glare_statistics:
            months = list(range(1, 13))
            month_names = [calendar.month_abbr[i] for i in months]
            avg_minutes = glare_statistics['monthly_average_minutes']
            
            ax3.plot(month_names, avg_minutes, 'o-', linewidth=2, markersize=8, color='darkblue')
            ax3.fill_between(range(12), avg_minutes, alpha=0.3, color='skyblue')
            ax3.set_xlabel('Month')
            ax3.set_ylabel('Average Daily Glare Minutes')
            ax3.set_title('Average Daily Glare Duration Throughout the Year')
            ax3.grid(True, alpha=0.3)
            ax3.set_ylim(bottom=0)
        
        # Overall title
        fig.suptitle('Annual Glare Analysis Summary', fontsize=16, fontweight='bold')
        
        # Save
        if save_figure(fig, output_path, dpi=self.config.dpi):
            if self.config.apply_blur:
                apply_blur_effect(output_path, radius=self.config.blur_radius)
        
        close_figure(fig)
        return output_path
    
    def plot_comparison_chart(
        self,
        glare_data: pd.DataFrame,
        observation_points: List,
        metric: str = 'duration',
        output_path: Optional[Path] = None
    ) -> Path:
        """Create comparison chart between observation points.
        
        Args:
            glare_data: DataFrame with glare events
            observation_points: List of observation points
            metric: Metric to compare ('duration', 'intensity', 'frequency')
            output_path: Optional output path
            
        Returns:
            Path to saved plot
        """
        if output_path is None:
            output_path = self.output_dir / f"comparison_{metric}.png"
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Prepare data by OP
        op_metrics = {}
        
        for idx, op in enumerate(observation_points):
            op_num = idx + 1
            op_data = glare_data[glare_data.get('op_number', glare_data.get('OP Number')) == op_num]
            
            if metric == 'duration':
                # Total glare minutes
                value = len(op_data) * glare_data.get('minutes_per_step', 1)
                label = 'Total Glare Minutes'
            elif metric == 'intensity':
                # Average intensity
                if 'Luminance' in op_data.columns:
                    value = op_data['Luminance'].mean() if not op_data.empty else 0
                else:
                    value = 0
                label = 'Average Luminance (cd/m²)'
            else:  # frequency
                # Number of glare events
                value = len(op_data)
                label = 'Number of Glare Events'
            
            op_name = op.name if hasattr(op, 'name') else f"OP{op_num}"
            op_metrics[op_name] = value
        
        # Create horizontal bar chart
        op_names = list(op_metrics.keys())
        values = list(op_metrics.values())
        
        y_pos = np.arange(len(op_names))
        bars = ax.barh(y_pos, values, color='teal', alpha=0.8)
        
        # Add value labels
        for i, (bar, value) in enumerate(zip(bars, values)):
            ax.text(bar.get_width() + max(values) * 0.01, bar.get_y() + bar.get_height()/2,
                   f'{value:.1f}' if metric != 'frequency' else f'{int(value)}',
                   ha='left', va='center')
        
        # Customize plot
        ax.set_yticks(y_pos)
        ax.set_yticklabels(op_names)
        ax.set_xlabel(label)
        ax.set_title(f'Glare {metric.capitalize()} Comparison Between Observation Points')
        ax.grid(True, axis='x', alpha=0.3)
        
        # Save
        if save_figure(fig, output_path, dpi=self.config.dpi):
            if self.config.apply_blur:
                apply_blur_effect(output_path, radius=self.config.blur_radius)
        
        close_figure(fig)
        return output_path
    
    def create_summary_table(
        self,
        glare_statistics: Dict,
        output_path: Optional[Path] = None
    ) -> Path:
        """Create a summary table as an image.
        
        Args:
            glare_statistics: Dictionary with statistics
            output_path: Optional output path
            
        Returns:
            Path to saved table image
        """
        if output_path is None:
            output_path = self.output_dir / "summary_table.png"
        
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.axis('tight')
        ax.axis('off')
        
        # Prepare table data
        headers = ['Metric', 'Value']
        data = []
        
        # Add statistics
        data.append(['Total Days with Glare', f"{glare_statistics.get('days_with_glare', 0)} days"])
        data.append(['Total Glare Hours', f"{glare_statistics.get('total_hours', 0):.1f} hours"])
        data.append(['Maximum Daily Duration', f"{glare_statistics.get('max_daily_minutes', 0):.0f} minutes"])
        data.append(['Average Daily Duration', f"{glare_statistics.get('avg_daily_minutes', 0):.1f} minutes"])
        data.append(['Peak Glare Intensity', f"{glare_statistics.get('max_intensity', 0):,.0f} cd/m²"])
        
        # Create table
        table = ax.table(cellText=data, colLabels=headers, loc='center', cellLoc='left')
        table.auto_set_font_size(False)
        table.set_fontsize(12)
        table.scale(1.2, 1.5)
        
        # Style the table
        for i in range(len(headers)):
            table[(0, i)].set_facecolor('#4CAF50')
            table[(0, i)].set_text_props(weight='bold', color='white')
        
        # Alternate row colors
        for i in range(1, len(data) + 1):
            if i % 2 == 0:
                for j in range(len(headers)):
                    table[(i, j)].set_facecolor('#f0f0f0')
        
        ax.set_title('Glare Analysis Summary', fontsize=16, fontweight='bold', pad=20)
        
        # Save
        if save_figure(fig, output_path, dpi=self.config.dpi):
            if self.config.apply_blur:
                apply_blur_effect(output_path, radius=self.config.blur_radius)
        
        close_figure(fig)
        return output_path