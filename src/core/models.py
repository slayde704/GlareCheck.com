"""Data models and type definitions for the glare analysis system."""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime
import numpy as np
import pandas as pd


@dataclass
class Coordinate:
    """Represents a geographic coordinate with optional elevation data."""
    
    latitude: float
    longitude: float
    ground_elevation: float = 0.0
    height_above_ground: float = 0.0
    name: str = ""
    
    def __post_init__(self):
        """Validate coordinate values."""
        if not (-90 <= self.latitude <= 90):
            raise ValueError(f"Latitude must be between -90 and 90, got {self.latitude}")
        if not (-180 <= self.longitude <= 180):
            raise ValueError(f"Longitude must be between -180 and 180, got {self.longitude}")
        if self.ground_elevation < 0:
            raise ValueError(f"Ground elevation cannot be negative, got {self.ground_elevation}")
        if self.height_above_ground < 0:
            raise ValueError(f"Height above ground cannot be negative, got {self.height_above_ground}")
    
    @property
    def total_height(self) -> float:
        """Get total height above sea level."""
        return self.ground_elevation + self.height_above_ground


@dataclass
class ObserverPoint(Coordinate):
    """Represents an observation point with viewing characteristics."""
    
    dp_type: str = "default"
    fov_direction: Optional[float] = None  # degrees
    fov_expansion: Optional[float] = None  # degrees
    
    def __post_init__(self):
        """Validate observer point values."""
        super().__post_init__()
        if self.fov_direction is not None and not (0 <= self.fov_direction <= 360):
            raise ValueError(f"FOV direction must be between 0 and 360, got {self.fov_direction}")
        if self.fov_expansion is not None and not (0 <= self.fov_expansion <= 180):
            raise ValueError(f"FOV expansion must be between 0 and 180, got {self.fov_expansion}")


@dataclass
class ObservationPoint:
    """Represents an observation point for glare analysis."""
    
    name: str
    coordinate: Coordinate
    
    def __post_init__(self):
        """Validate observation point."""
        if not self.name:
            raise ValueError("Observation point name cannot be empty")


@dataclass
class Polygon:
    """Represents a polygon geometry."""
    
    coordinates: List[Coordinate]
    
    def __post_init__(self):
        """Validate polygon."""
        if len(self.coordinates) < 3:
            raise ValueError("Polygon must have at least 3 coordinates")


@dataclass
class Hole:
    """Represents a hole in a polygon."""
    
    coordinates: List[Coordinate]
    
    def __post_init__(self):
        """Validate hole."""
        if len(self.coordinates) < 3:
            raise ValueError("Hole must have at least 3 coordinates")


@dataclass
class PVArea:
    """Represents a photovoltaic area with orientation and location."""
    
    name: str
    polygon: Polygon
    holes: List[Hole]
    azimuth: float  # degrees (0 = North, 90 = East, 180 = South, 270 = West)
    tilt: float     # degrees (0 = horizontal, 90 = vertical)
    module_type: int = 1
    
    def __post_init__(self):
        """Validate PV area values."""
        if not self.name:
            raise ValueError("PV area name cannot be empty")
        if not (0 <= self.azimuth <= 360):
            raise ValueError(f"Azimuth must be between 0 and 360, got {self.azimuth}")
        if not (0 <= self.tilt <= 90):
            raise ValueError(f"Tilt must be between 0 and 90, got {self.tilt}")
        if self.module_type not in [0, 1, 2]:
            raise ValueError(f"Module type must be 0, 1, or 2, got {self.module_type}")
    
    @property
    def coordinates(self) -> List[Coordinate]:
        """Get coordinates for backward compatibility."""
        return self.polygon.coordinates
    
    @property
    def centroid(self) -> Coordinate:
        """Calculate the centroid of the PV area."""
        coords = self.polygon.coordinates
        if not coords:
            raise ValueError("Cannot calculate centroid of empty coordinate list")
        
        lat_sum = sum(coord.latitude for coord in coords)
        lon_sum = sum(coord.longitude for coord in coords)
        count = len(coords)
        
        return Coordinate(
            latitude=lat_sum / count,
            longitude=lon_sum / count,
            ground_elevation=coords[0].ground_elevation,
            name=f"{self.name}_centroid"
        )


@dataclass
class SunPosition:
    """Represents the sun's position at a specific time."""
    
    azimuth: float      # degrees
    elevation: float    # degrees
    timestamp: datetime
    
    def __post_init__(self):
        """Validate sun position values."""
        if not (0 <= self.azimuth <= 360):
            raise ValueError(f"Sun azimuth must be between 0 and 360, got {self.azimuth}")
        if not (-90 <= self.elevation <= 90):
            raise ValueError(f"Sun elevation must be between -90 and 90, got {self.elevation}")
    
    @property
    def is_above_horizon(self) -> bool:
        """Check if sun is above horizon."""
        return self.elevation > 0


@dataclass
class Vector3D:
    """Represents a 3D vector."""
    
    x: float
    y: float
    z: float
    
    def __post_init__(self):
        """Validate that vector components are finite."""
        if not all(np.isfinite([self.x, self.y, self.z])):
            raise ValueError("Vector components must be finite numbers")
    
    def normalize(self) -> "Vector3D":
        """Return normalized vector."""
        magnitude = self.magnitude()
        if magnitude == 0:
            raise ValueError("Cannot normalize zero vector")
        return Vector3D(self.x / magnitude, self.y / magnitude, self.z / magnitude)
    
    def magnitude(self) -> float:
        """Calculate vector magnitude."""
        return np.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def dot(self, other: "Vector3D") -> float:
        """Calculate dot product with another vector."""
        return self.x * other.x + self.y * other.y + self.z * other.z
    
    def cross(self, other: "Vector3D") -> "Vector3D":
        """Calculate cross product with another vector."""
        return Vector3D(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x
        )


@dataclass
class ReflectionResult:
    """Result of a reflection calculation."""
    
    reflection_direction: Vector3D
    incidence_angle: float  # degrees
    reflection_coefficient: float
    timestamp: datetime
    
    def __post_init__(self):
        """Validate reflection result values."""
        if not (0 <= self.incidence_angle <= 90):
            raise ValueError(f"Incidence angle must be between 0 and 90, got {self.incidence_angle}")
        if not (0 <= self.reflection_coefficient <= 1):
            raise ValueError(f"Reflection coefficient must be between 0 and 1, got {self.reflection_coefficient}")


@dataclass
class GlareEvent:
    """Represents a single glare event."""
    
    timestamp: datetime
    luminance: float  # cd/m²
    reflection_azimuth: float
    reflection_elevation: float
    sun_azimuth: float = 0.0
    sun_elevation: float = 0.0
    op_number: int = 1
    
    def __post_init__(self):
        """Validate glare event values."""
        if self.luminance < 0:
            raise ValueError(f"Luminance cannot be negative, got {self.luminance}")


@dataclass
class AngularGridPoint:
    """Represents a point in an angular grid."""
    
    azimuth: float
    elevation: float
    solid_angle: float = 0.0
    
    def __post_init__(self):
        """Validate angular grid point values."""
        if not (0 <= self.azimuth <= 360):
            raise ValueError(f"Azimuth must be between 0 and 360, got {self.azimuth}")
        if not (-90 <= self.elevation <= 90):
            raise ValueError(f"Elevation must be between -90 and 90, got {self.elevation}")


@dataclass
class GlareResult:
    """Result of a glare analysis calculation."""
    
    intensity: float        # cd/m²
    duration: float         # minutes
    risk_level: str         # 'low', 'medium', 'high'
    pv_area: PVArea
    observer: ObserverPoint
    sun_position: SunPosition
    reflection_result: ReflectionResult
    metadata: Dict[str, Any]
    
    def __post_init__(self):
        """Validate glare result values."""
        if self.intensity < 0:
            raise ValueError(f"Intensity cannot be negative, got {self.intensity}")
        if self.duration < 0:
            raise ValueError(f"Duration cannot be negative, got {self.duration}")
        if self.risk_level not in ['low', 'medium', 'high']:
            raise ValueError(f"Risk level must be 'low', 'medium', or 'high', got {self.risk_level}")


@dataclass
class SimulationParameters:
    """Parameters for glare simulation."""
    
    grid_width: float = 1.0
    resolution_minutes: int = 10
    sun_elevation_threshold: float = 3.0
    beam_spread: float = 0.5
    sun_angle: float = 0.53
    sun_reflection_threshold: float = 2.0
    intensity_threshold: float = 30000.0  # cd/m²
    module_type: int = 1
    max_calculation_distance: float = 10000.0  # meters
    use_multiprocessing: bool = True
    max_workers: Optional[int] = None
    
    def __post_init__(self):
        """Validate simulation parameters."""
        if self.grid_width <= 0:
            raise ValueError(f"Grid width must be positive, got {self.grid_width}")
        if self.resolution_minutes <= 0:
            raise ValueError(f"Resolution must be positive, got {self.resolution_minutes}")
        if self.intensity_threshold <= 0:
            raise ValueError(f"Intensity threshold must be positive, got {self.intensity_threshold}")
        if self.max_calculation_distance <= 0:
            raise ValueError(f"Max calculation distance must be positive, got {self.max_calculation_distance}")
        if not (-90 <= self.sun_elevation_threshold <= 90):
            raise ValueError(f"Sun elevation threshold must be between -90 and 90, got {self.sun_elevation_threshold}")


@dataclass
class ProjectMetadata:
    """Metadata for a glare analysis project."""
    
    project_name: str
    description: str = ""
    client: str = ""
    date_created: datetime = None
    analysis_type: str = "glare_analysis"
    version: str = "1.0.0"
    
    def __post_init__(self):
        """Set default values."""
        if self.date_created is None:
            self.date_created = datetime.now()


# Type aliases for common data structures
CoordinateList = List[Coordinate]
ObserverPointList = List[ObserverPoint]
PVAreaList = List[PVArea]
GlareResultList = List[GlareResult]
SunPositionList = List[SunPosition]

# Numpy array type aliases
NumpyArray = np.ndarray
PandasDataFrame = pd.DataFrame
PandasSeries = pd.Series

# Input/Output type aliases
JSONData = Dict[str, Any]
ExcelData = Dict[str, PandasDataFrame]
ReportData = Dict[str, Union[str, int, float, List, Dict]]