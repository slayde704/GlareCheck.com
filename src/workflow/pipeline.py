"""Main workflow pipeline for glare analysis.

This module orchestrates the complete glare analysis workflow by coordinating
all analysis modules and managing the processing steps.
"""

import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from ..config import Config
from ..core.models import PVArea, ObservationPoint
from ..core.sun_calculations import generate_sun_positions
from ..core.reflection import calculate_reflection_direction, load_reflection_profiles
from ..core.glare_analysis import GlareAnalyzer
from ..visualization import GlarePlotter, apply_blur_effect
from ..reporting import ExcelReporter, HTMLReporter, PDFReporter
from .data_processor import ProcessedData

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResults:
    """Container for analysis results."""
    output_paths: Dict[str, Any]
    statistics: Dict[str, Any]
    glare_events: List[Any]
    processing_time: float


class GlareAnalysisWorkflow:
    """Main workflow coordinator for glare analysis."""
    
    def __init__(self, config: Config):
        """Initialize workflow.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.setup_directories()
        self.setup_components()
    
    def setup_directories(self) -> None:
        """Setup output directories."""
        self.output_dir = self.config.BASE_DIR / 'output'
        self.output_dir.mkdir(exist_ok=True)
        
        logger.info(f"Output directory: {self.output_dir}")
    
    def setup_components(self) -> None:
        """Initialize analysis components."""
        try:
            # Initialize glare analyzer
            self.glare_analyzer = GlareAnalyzer(self.config)
            
            # Initialize visualization components
            self.plotter = GlarePlotter(self.config, self.output_dir)
            
            # Initialize reporting components
            self.excel_reporter = ExcelReporter(self.config, self.output_dir)
            self.html_reporter = HTMLReporter(self.config, self.output_dir)
            self.pdf_reporter = PDFReporter(self.config, self.output_dir)
            
            # Load reflection profiles
            self.reflection_profiles = load_reflection_profiles(
                self.config.BASE_DIR / 'assets' / 'module_reflection_profiles.csv'
            )
            
            logger.info("Workflow components initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize workflow components: {e}")
            raise
    
    def execute(self, data: ProcessedData) -> AnalysisResults:
        """Execute complete glare analysis workflow.
        
        Args:
            data: Processed input data
            
        Returns:
            Analysis results
        """
        start_time = time.time()
        logger.info("Starting glare analysis workflow")
        
        try:
            # Step 1: Generate sun positions
            sun_positions = self._generate_sun_positions(data)
            logger.info(f"Generated {len(sun_positions)} sun positions")
            
            # Step 2: Run glare analysis for each observation point
            all_glare_events = []
            visualization_paths = {}
            
            for i, op in enumerate(data.observation_points):
                logger.info(f"Processing observation point {i+1}/{len(data.observation_points)}: {op.name}")
                
                # Analyze glare for this observation point
                glare_events = self._analyze_glare_for_observation_point(
                    op, data.pv_areas, sun_positions, data.simulation_params
                )
                
                # Add observation point number to events
                for event in glare_events:
                    event.op_number = i + 1
                
                all_glare_events.extend(glare_events)
                
                # Generate visualizations for this observation point
                op_viz_paths = self._generate_visualizations_for_op(
                    op, glare_events, data.pv_areas, i + 1
                )
                
                # Merge visualization paths
                for plot_type, path in op_viz_paths.items():
                    if plot_type not in visualization_paths:
                        visualization_paths[plot_type] = {}
                    visualization_paths[plot_type][i + 1] = path
            
            logger.info(f"Total glare events found: {len(all_glare_events)}")
            
            # Step 3: Calculate statistics
            statistics = self._calculate_statistics(all_glare_events, data)
            
            # Step 4: Generate reports
            report_paths = self._generate_reports(
                all_glare_events, statistics, data, visualization_paths
            )
            
            # Step 5: Apply effects to visualizations (blur for free version)
            if data.metadata.get('report_type', 'full') == 'free':
                self._apply_visual_effects(visualization_paths)
            
            # Combine all output paths
            output_paths = {**report_paths, 'visualizations': visualization_paths}
            
            processing_time = time.time() - start_time
            logger.info(f"Glare analysis workflow completed in {processing_time:.1f}s")
            
            return AnalysisResults(
                output_paths=output_paths,
                statistics=statistics,
                glare_events=all_glare_events,
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Workflow execution failed after {processing_time:.1f}s: {e}")
            raise
    
    def _generate_sun_positions(self, data: ProcessedData) -> List[Dict]:
        """Generate sun positions for analysis period.
        
        Args:
            data: Processed input data
            
        Returns:
            List of sun position dictionaries
        """
        # Use first observation point as reference for sun calculations
        reference_coordinate = data.observation_points[0].coordinate
        
        # Determine time range
        import pytz
        current_year = datetime.now().year
        start_time = datetime(current_year, 1, 1, tzinfo=pytz.UTC)
        end_time = datetime(current_year, 12, 31, 23, 59, 59, tzinfo=pytz.UTC)
        
        # Generate sun positions
        sun_df = generate_sun_positions(
            reference_coordinate,
            start_time,
            end_time,
            data.simulation_params.resolution_minutes,
            data.simulation_params.sun_elevation_threshold
        )
        
        # Convert to list of dictionaries, including the index as timestamp
        sun_df = sun_df.reset_index()  # Move index to a column
        if 'index' in sun_df.columns:
            sun_df = sun_df.rename(columns={'index': 'timestamp'})
        return sun_df.to_dict('records')
    
    def _analyze_glare_for_observation_point(
        self,
        observation_point: ObservationPoint,
        pv_areas: List[PVArea],
        sun_positions: List[Dict],
        simulation_params
    ) -> List[Any]:
        """Analyze glare for a single observation point.
        
        Args:
            observation_point: Observation point
            pv_areas: List of PV areas
            sun_positions: Sun position data
            simulation_params: Simulation parameters
            
        Returns:
            List of glare events
        """
        all_events = []
        
        for pv_area in pv_areas:
            # Generate angular grid for this PV area
            angular_grid = self.glare_analyzer.generate_angular_grid(
                observation_point, pv_area, simulation_params.grid_width
            )
            
            # Calculate reflections for this PV area
            reflection_data = []
            for sun_pos in sun_positions:
                reflection_az, reflection_el = calculate_reflection_direction(
                    sun_pos['azimuth'], sun_pos['elevation'],
                    pv_area.azimuth, pv_area.tilt
                )
                
                reflection_data.append({
                    'timestamp': sun_pos['timestamp'],
                    'sun_azimuth': sun_pos['azimuth'],
                    'sun_elevation': sun_pos['elevation'],
                    'reflection_azimuth': reflection_az,
                    'reflection_elevation': reflection_el,
                    'irradiance': sun_pos.get('dni', 800.0),  # Default DNI if not available
                    'pv_area_name': pv_area.name
                })
            
            # Convert to DataFrame for analysis
            import pandas as pd
            reflection_df = pd.DataFrame(reflection_data)
            
            # Detect glare events
            events = self.glare_analyzer.detect_glare_vectorized(
                reflection_df, angular_grid, pv_area
            )
            
            all_events.extend(events)
        
        return all_events
    
    def _generate_visualizations_for_op(
        self,
        observation_point: ObservationPoint,
        glare_events: List[Any],
        pv_areas: List[PVArea],
        op_number: int
    ) -> Dict[str, Path]:
        """Generate visualizations for an observation point.
        
        Args:
            observation_point: Observation point
            glare_events: Glare events for this OP
            pv_areas: PV areas
            op_number: Observation point number
            
        Returns:
            Dictionary of visualization paths
        """
        viz_paths = {}
        
        try:
            # Convert events to DataFrame for plotting
            if glare_events:
                import pandas as pd
                events_df = pd.DataFrame([
                    {
                        'timestamp': event.timestamp,
                        'luminance': event.luminance,
                        'duration': getattr(event, 'duration', 1),  # Default 1 minute
                        'azimuth': event.reflection_azimuth,
                        'elevation': event.reflection_elevation
                    }
                    for event in glare_events
                ])
            else:
                events_df = None
            
            # Generate glare plots
            try:
                period_path = self.plotter.create_glare_periods_plot(events_df, op_number)
                if period_path:
                    viz_paths['glare_periods'] = period_path
            except Exception as e:
                logger.warning(f"Failed to create glare periods plot: {e}")
            
            try:
                duration_path = self.plotter.create_glare_duration_plot(events_df, op_number)
                if duration_path:
                    viz_paths['glare_duration'] = duration_path
            except Exception as e:
                logger.warning(f"Failed to create glare duration plot: {e}")
            
            try:
                intensity_path = self.plotter.create_glare_intensity_plot(events_df, op_number)
                if intensity_path:
                    viz_paths['glare_intensity'] = intensity_path
            except Exception as e:
                logger.warning(f"Failed to create glare intensity plot: {e}")
            
            try:
                map_path = self.plotter.create_pv_areas_map(pv_areas, [observation_point], op_number)
                if map_path:
                    viz_paths['pv_areas'] = map_path
            except Exception as e:
                logger.warning(f"Failed to create PV areas map: {e}")
            
        except Exception as e:
            logger.warning(f"Failed to generate some visualizations for OP {op_number}: {e}")
        
        return viz_paths
    
    def _calculate_statistics(self, glare_events: List[Any], data: ProcessedData) -> Dict[str, Any]:
        """Calculate summary statistics.
        
        Args:
            glare_events: All glare events
            data: Processed input data
            
        Returns:
            Statistics dictionary
        """
        if not glare_events:
            return {
                'total_events': 0,
                'total_hours': 0.0,
                'days_with_glare': 0,
                'max_intensity': 0.0,
                'observation_points': len(data.observation_points),
                'pv_areas': len(data.pv_areas)
            }
        
        # Calculate total duration (assuming 1 minute per event)
        total_minutes = len(glare_events) * data.simulation_params.resolution_minutes
        total_hours = total_minutes / 60.0
        
        # Calculate days with glare
        event_dates = set()
        for event in glare_events:
            if hasattr(event, 'timestamp'):
                event_dates.add(event.timestamp.date())
        
        # Calculate max intensity
        max_intensity = max(event.luminance for event in glare_events)
        
        return {
            'total_events': len(glare_events),
            'total_hours': total_hours,
            'days_with_glare': len(event_dates),
            'max_intensity': max_intensity,
            'observation_points': len(data.observation_points),
            'pv_areas': len(data.pv_areas)
        }
    
    def _generate_reports(
        self,
        glare_events: List[Any],
        statistics: Dict[str, Any],
        data: ProcessedData,
        visualization_paths: Dict[str, Any]
    ) -> Dict[str, Path]:
        """Generate all reports.
        
        Args:
            glare_events: All glare events
            statistics: Summary statistics
            data: Processed input data
            visualization_paths: Visualization file paths
            
        Returns:
            Dictionary of report paths
        """
        report_paths = {}
        
        # Prepare report data
        report_data = {
            'glare_results': self._events_to_dataframe(glare_events),
            'statistics': statistics,
            'metadata': data.metadata,
            'simulation_parameters': {
                'grid_width': data.simulation_params.grid_width,
                'resolution': f"{data.simulation_params.resolution_minutes}min",
                'sun_elevation_threshold': data.simulation_params.sun_elevation_threshold,
                'intensity_threshold': data.simulation_params.intensity_threshold
            },
            'visualization_paths': visualization_paths
        }
        
        try:
            # Generate Excel report
            excel_path = self.excel_reporter.generate_report(report_data)
            if excel_path:
                report_paths['excel_report'] = excel_path
            
            # Generate HTML report
            html_path = self.html_reporter.generate_report(report_data)
            if html_path:
                report_paths['html_report'] = html_path
            
            # Generate PDF report
            pdf_path = self.pdf_reporter.generate_report(report_data)
            if pdf_path:
                report_paths['pdf_report'] = pdf_path
                
        except Exception as e:
            logger.error(f"Failed to generate some reports: {e}")
        
        return report_paths
    
    def _events_to_dataframe(self, glare_events: List[Any]) -> Optional[Any]:
        """Convert glare events to DataFrame.
        
        Args:
            glare_events: List of glare events
            
        Returns:
            DataFrame or None if no events
        """
        if not glare_events:
            return None
        
        try:
            import pandas as pd
            
            data = []
            for event in glare_events:
                data.append({
                    'timestamp': event.timestamp,
                    'op_number': getattr(event, 'op_number', 1),
                    'luminance': event.luminance,
                    'reflection_azimuth': event.reflection_azimuth,
                    'reflection_elevation': event.reflection_elevation,
                    'sun_azimuth': getattr(event, 'sun_azimuth', 0),
                    'sun_elevation': getattr(event, 'sun_elevation', 0)
                })
            
            return pd.DataFrame(data)
            
        except Exception as e:
            logger.error(f"Failed to convert events to DataFrame: {e}")
            return None
    
    def _apply_visual_effects(self, visualization_paths: Dict[str, Any]) -> None:
        """Apply visual effects to images (e.g., blur for free version).
        
        Args:
            visualization_paths: Dictionary of visualization paths
        """
        try:
            for plot_type, paths in visualization_paths.items():
                if isinstance(paths, dict):
                    for op_num, path in paths.items():
                        apply_blur_effect(Path(path))
                else:
                    apply_blur_effect(Path(paths))
                    
        except Exception as e:
            logger.warning(f"Failed to apply visual effects: {e}")