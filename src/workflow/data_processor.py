"""Data processing for glare analysis workflow.

This module transforms validated input data into internal model objects
that the analysis modules expect.
"""

import logging
from datetime import datetime
from typing import Dict, Any, List
from dataclasses import dataclass

from ..config import Config
from ..core.models import (
    PVArea, ObservationPoint, Coordinate, SimulationParameters,
    Polygon, Hole
)

logger = logging.getLogger(__name__)


@dataclass
class ProcessedData:
    """Container for processed input data."""
    pv_areas: List[PVArea]
    observation_points: List[ObservationPoint]
    simulation_params: SimulationParameters
    metadata: Dict[str, Any]


class DataProcessor:
    """Processes and transforms input data into internal model objects."""
    
    def __init__(self, config: Config):
        """Initialize data processor.
        
        Args:
            config: Configuration object
        """
        self.config = config
    
    def process(self, data: Dict[str, Any]) -> ProcessedData:
        """Process input data into internal models.
        
        Args:
            data: Validated input data dictionary
            
        Returns:
            Processed data container
            
        Raises:
            ValueError: If data processing fails
        """
        logger.info("Starting data processing")
        
        try:
            # Process PV areas
            pv_areas = self._process_pv_areas(data['pv_areas'])
            logger.info(f"Processed {len(pv_areas)} PV areas")
            
            # Process observation points
            observation_points = self._process_observation_points(data['list_of_ops'])
            logger.info(f"Processed {len(observation_points)} observation points")
            
            # Process simulation parameters
            simulation_params = self._process_simulation_parameters(
                data['simulation_parameter']
            )
            logger.info("Processed simulation parameters")
            
            # Extract metadata
            metadata = data['meta_data']
            
            return ProcessedData(
                pv_areas=pv_areas,
                observation_points=observation_points,
                simulation_params=simulation_params,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Data processing failed: {e}")
            raise ValueError(f"Data processing failed: {e}")
    
    def _process_pv_areas(self, pv_areas_data: List[Dict]) -> List[PVArea]:
        """Process PV areas data.
        
        Args:
            pv_areas_data: List of PV area definitions
            
        Returns:
            List of PVArea objects
        """
        pv_areas = []
        
        for i, pv_data in enumerate(pv_areas_data):
            try:
                # Process corners
                corners = [
                    Coordinate(
                        latitude=corner['latitude'],
                        longitude=corner['longitude'],
                        ground_elevation=corner.get('ground_elevation', 0.0),
                        height_above_ground=corner.get('height_above_ground', 0.0)
                    )
                    for corner in pv_data['corners']
                ]
                
                # Create polygon
                polygon = Polygon(coordinates=corners)
                
                # Process holes if present
                holes = []
                if 'holes' in pv_data:
                    for hole_data in pv_data['holes']:
                        hole_corners = [
                            Coordinate(
                                latitude=corner['latitude'],
                                longitude=corner['longitude'],
                                ground_elevation=corner.get('ground_elevation', 0.0),
                                height_above_ground=corner.get('height_above_ground', 0.0)
                            )
                            for corner in hole_data
                        ]
                        holes.append(Hole(coordinates=hole_corners))
                
                # Create PV area
                pv_area = PVArea(
                    name=pv_data['name'],
                    polygon=polygon,
                    holes=holes,
                    azimuth=pv_data['azimuth'],
                    tilt=pv_data['tilt'],
                    module_type=pv_data['module_type']
                )
                
                pv_areas.append(pv_area)
                
            except Exception as e:
                logger.error(f"Failed to process PV area {i}: {e}")
                raise ValueError(f"Failed to process PV area {i}: {e}")
        
        return pv_areas
    
    def _process_observation_points(self, ops_data: List[Dict]) -> List[ObservationPoint]:
        """Process observation points data.
        
        Args:
            ops_data: List of observation point definitions
            
        Returns:
            List of ObservationPoint objects
        """
        observation_points = []
        
        for i, op_data in enumerate(ops_data):
            try:
                coordinate = Coordinate(
                    latitude=op_data['latitude'],
                    longitude=op_data['longitude'],
                    ground_elevation=op_data.get('ground_elevation', 0.0),
                    height_above_ground=op_data.get('height_above_ground', 1.5)
                )
                
                observation_point = ObservationPoint(
                    name=op_data['name'],
                    coordinate=coordinate
                )
                
                observation_points.append(observation_point)
                
            except Exception as e:
                logger.error(f"Failed to process observation point {i}: {e}")
                raise ValueError(f"Failed to process observation point {i}: {e}")
        
        return observation_points
    
    def _process_simulation_parameters(self, params_data: Dict) -> SimulationParameters:
        """Process simulation parameters.
        
        Args:
            params_data: Simulation parameters dictionary
            
        Returns:
            SimulationParameters object
        """
        try:
            # Convert resolution string to minutes
            resolution_map = {
                '1min': 1,
                '5min': 5,
                '10min': 10,
                '30min': 30,
                '60min': 60
            }
            
            resolution_str = params_data.get('resolution', '10min')
            resolution_minutes = resolution_map.get(resolution_str, self.config.DEFAULT_SUN_RESOLUTION_MIN)
            
            return SimulationParameters(
                grid_width=params_data.get('grid_width', self.config.DEFAULT_GRID_WIDTH),
                resolution_minutes=resolution_minutes,
                sun_elevation_threshold=params_data.get('sun_elevation_threshold', 3.0),
                beam_spread=params_data.get('beam_spread', 0.5),
                sun_angle=params_data.get('sun_angle', 0.53),
                sun_reflection_threshold=params_data.get('sun_reflection_threshold', 2.0),
                intensity_threshold=params_data.get('intensity_threshold', self.config.DEFAULT_GLARE_THRESHOLD),
                module_type=params_data.get('module_type', 1)
            )
            
        except Exception as e:
            logger.error(f"Failed to process simulation parameters: {e}")
            raise ValueError(f"Failed to process simulation parameters: {e}")
    
    def _resolve_time_range(self, params_data: Dict, metadata: Dict) -> tuple:
        """Resolve time range for analysis.
        
        Args:
            params_data: Simulation parameters
            metadata: Metadata dictionary
            
        Returns:
            Tuple of (start_time, end_time)
        """
        # Get current year for analysis
        current_year = datetime.now().year
        
        # Check if specific time range is provided
        if 'start_date' in params_data and 'end_date' in params_data:
            start_time = datetime.fromisoformat(params_data['start_date'])
            end_time = datetime.fromisoformat(params_data['end_date'])
        else:
            # Default to full year analysis
            start_time = datetime(current_year, 1, 1)
            end_time = datetime(current_year, 12, 31, 23, 59, 59)
        
        logger.info(f"Analysis time range: {start_time} to {end_time}")
        return start_time, end_time