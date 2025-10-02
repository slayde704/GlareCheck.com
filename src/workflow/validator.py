"""Input data validation for glare analysis."""

import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class InputValidator:
    """Validates input data for glare analysis."""
    
    def __init__(self):
        """Initialize validator."""
        self.errors: List[str] = []
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate complete input data structure.
        
        Args:
            data: Input data dictionary
            
        Returns:
            True if valid, False otherwise
        """
        self.errors = []
        
        # Check required top-level keys
        required_keys = ['pv_areas', 'list_of_ops', 'meta_data', 'simulation_parameter']
        for key in required_keys:
            if key not in data:
                self.errors.append(f"Missing required key: {key}")
        
        if self.errors:
            return False
        
        # Validate individual sections
        self._validate_pv_areas(data['pv_areas'])
        self._validate_observation_points(data['list_of_ops'])
        self._validate_metadata(data['meta_data'])
        self._validate_simulation_parameters(data['simulation_parameter'])
        
        return len(self.errors) == 0
    
    def _validate_pv_areas(self, pv_areas: List[Dict]) -> None:
        """Validate PV areas data.
        
        Args:
            pv_areas: List of PV area definitions
        """
        if not isinstance(pv_areas, list):
            self.errors.append("pv_areas must be a list")
            return
        
        if len(pv_areas) == 0:
            self.errors.append("At least one PV area is required")
            return
        
        for i, pv_area in enumerate(pv_areas):
            self._validate_pv_area(pv_area, i)
    
    def _validate_pv_area(self, pv_area: Dict, index: int) -> None:
        """Validate single PV area.
        
        Args:
            pv_area: PV area definition
            index: Index in list for error reporting
        """
        required_fields = ['name', 'corners', 'azimuth', 'tilt', 'module_type']
        for field in required_fields:
            if field not in pv_area:
                self.errors.append(f"PV area {index}: missing {field}")
        
        # Validate corners
        corners = pv_area.get('corners', [])
        if len(corners) < 3:
            self.errors.append(f"PV area {index}: at least 3 corners required")
        
        for j, corner in enumerate(corners):
            if not all(key in corner for key in ['latitude', 'longitude']):
                self.errors.append(f"PV area {index}, corner {j}: missing coordinates")
            
            # Validate coordinate ranges
            if 'latitude' in corner:
                lat = corner['latitude']
                if not isinstance(lat, (int, float)) or not -90 <= lat <= 90:
                    self.errors.append(f"PV area {index}, corner {j}: invalid latitude {lat}")
            
            if 'longitude' in corner:
                lon = corner['longitude']
                if not isinstance(lon, (int, float)) or not -180 <= lon <= 180:
                    self.errors.append(f"PV area {index}, corner {j}: invalid longitude {lon}")
        
        # Validate angles
        if 'azimuth' in pv_area:
            az = pv_area['azimuth']
            if not isinstance(az, (int, float)) or not 0 <= az <= 360:
                self.errors.append(f"PV area {index}: invalid azimuth {az}")
        
        if 'tilt' in pv_area:
            tilt = pv_area['tilt']
            if not isinstance(tilt, (int, float)) or not 0 <= tilt <= 90:
                self.errors.append(f"PV area {index}: invalid tilt {tilt}")
    
    def _validate_observation_points(self, ops: List[Dict]) -> None:
        """Validate observation points.
        
        Args:
            ops: List of observation point definitions
        """
        if not isinstance(ops, list):
            self.errors.append("list_of_ops must be a list")
            return
        
        if len(ops) == 0:
            self.errors.append("At least one observation point is required")
            return
        
        for i, op in enumerate(ops):
            self._validate_observation_point(op, i)
    
    def _validate_observation_point(self, op: Dict, index: int) -> None:
        """Validate single observation point.
        
        Args:
            op: Observation point definition
            index: Index in list for error reporting
        """
        required_fields = ['name', 'latitude', 'longitude']
        for field in required_fields:
            if field not in op:
                self.errors.append(f"Observation point {index}: missing {field}")
        
        # Validate coordinates
        if 'latitude' in op:
            lat = op['latitude']
            if not isinstance(lat, (int, float)) or not -90 <= lat <= 90:
                self.errors.append(f"Observation point {index}: invalid latitude {lat}")
        
        if 'longitude' in op:
            lon = op['longitude']
            if not isinstance(lon, (int, float)) or not -180 <= lon <= 180:
                self.errors.append(f"Observation point {index}: invalid longitude {lon}")
        
        # Validate optional heights
        if 'ground_elevation' in op:
            elev = op['ground_elevation']
            if not isinstance(elev, (int, float)) or elev < -500 or elev > 9000:
                self.errors.append(f"Observation point {index}: invalid ground elevation {elev}")
        
        if 'height_above_ground' in op:
            height = op['height_above_ground']
            if not isinstance(height, (int, float)) or height < 0 or height > 100:
                self.errors.append(f"Observation point {index}: invalid height above ground {height}")
    
    def _validate_metadata(self, metadata: Dict) -> None:
        """Validate metadata.
        
        Args:
            metadata: Metadata dictionary
        """
        required_fields = ['user_id', 'project_id', 'project_name']
        for field in required_fields:
            if field not in metadata or not metadata[field]:
                self.errors.append(f"Metadata: missing or empty {field}")
        
        # Validate language
        if 'language' in metadata:
            lang = metadata['language']
            if lang not in ['en', 'de']:
                self.errors.append(f"Metadata: unsupported language {lang}")
        
        # Validate UTC offset
        if 'utc' in metadata:
            utc = metadata['utc']
            if not isinstance(utc, (int, float)) or not -12 <= utc <= 14:
                self.errors.append(f"Metadata: invalid UTC offset {utc}")
    
    def _validate_simulation_parameters(self, params: Dict) -> None:
        """Validate simulation parameters.
        
        Args:
            params: Simulation parameters dictionary
        """
        # Validate grid width
        if 'grid_width' in params:
            grid_width = params['grid_width']
            if not isinstance(grid_width, (int, float)) or not 0.1 <= grid_width <= 10:
                self.errors.append(f"Simulation: invalid grid_width {grid_width}")
        
        # Validate resolution
        if 'resolution' in params:
            resolution = params['resolution']
            valid_resolutions = ['1min', '5min', '10min', '30min', '60min']
            if resolution not in valid_resolutions:
                self.errors.append(f"Simulation: invalid resolution {resolution}")
        
        # Validate thresholds
        if 'sun_elevation_threshold' in params:
            threshold = params['sun_elevation_threshold']
            if not isinstance(threshold, (int, float)) or not 0 <= threshold <= 10:
                self.errors.append(f"Simulation: invalid sun_elevation_threshold {threshold}")
        
        if 'intensity_threshold' in params:
            threshold = params['intensity_threshold']
            if not isinstance(threshold, (int, float)) or not 1000 <= threshold <= 100000:
                self.errors.append(f"Simulation: invalid intensity_threshold {threshold}")
        
        # Validate module type
        if 'module_type' in params:
            module_type = params['module_type']
            if not isinstance(module_type, int) or module_type not in [0, 1, 2]:
                self.errors.append(f"Simulation: invalid module_type {module_type}")