"""Coordinate transformation utilities for glare analysis.

This module provides functions for converting between different coordinate systems,
primarily WGS84 (latitude/longitude) and UTM (Universal Transverse Mercator).
"""

import math
from typing import List, Tuple, Optional, Union
from dataclasses import dataclass

try:
    from pyproj import CRS, Transformer
    PYPROJ_AVAILABLE = True
except ImportError:
    PYPROJ_AVAILABLE = False
    CRS = None
    Transformer = None

from .models import Coordinate, ObserverPoint, CoordinateList


class CoordinateTransformationError(Exception):
    """Exception raised for coordinate transformation errors."""
    pass


@dataclass
class UTMCoordinate:
    """Represents a UTM coordinate."""
    
    x: float
    y: float
    zone: int
    hemisphere: str  # 'N' or 'S'
    epsg_code: str
    
    def __post_init__(self):
        """Validate UTM coordinate values."""
        if not (1 <= self.zone <= 60):
            raise ValueError(f"UTM zone must be between 1 and 60, got {self.zone}")
        if self.hemisphere not in ['N', 'S']:
            raise ValueError(f"Hemisphere must be 'N' or 'S', got {self.hemisphere}")


class CoordinateTransformer:
    """Handles coordinate transformations between WGS84 and UTM systems.
    
    This class provides bidirectional transformation capabilities between
    WGS84 (latitude/longitude) and UTM coordinates.
    
    Attributes:
        to_local: Transformer for WGS84 to UTM conversion
        to_wgs84: Transformer for UTM to WGS84 conversion
        epsg_code: EPSG code for the UTM zone
        utm_zone: UTM zone number
        hemisphere: 'N' for northern, 'S' for southern hemisphere
    """
    
    def __init__(self, latitude: float, longitude: float):
        """Initialize coordinate transformer for a specific location.
        
        Args:
            latitude: Latitude in decimal degrees (-90 to 90)
            longitude: Longitude in decimal degrees (-180 to 180)
            
        Raises:
            ValueError: If coordinates are out of valid range
            CoordinateTransformationError: If transformation setup fails
        """
        if not PYPROJ_AVAILABLE:
            raise CoordinateTransformationError("pyproj is required for coordinate transformations. Install with: pip install pyproj")
            
        if not (-90 <= latitude <= 90):
            raise ValueError(f"Latitude must be between -90 and 90, got {latitude}")
        if not (-180 <= longitude <= 180):
            raise ValueError(f"Longitude must be between -180 and 180, got {longitude}")
        
        try:
            self.epsg_code = get_epsg_for_coordinates(latitude, longitude)
            self.utm_zone = get_utm_zone(longitude)
            self.hemisphere = 'N' if latitude >= 0 else 'S'
            
            # Create transformers
            wgs84_crs = CRS.from_epsg(4326)  # WGS84
            utm_crs = CRS.from_epsg(int(self.epsg_code))
            
            self.to_local = Transformer.from_crs(wgs84_crs, utm_crs, always_xy=False)
            self.to_wgs84 = Transformer.from_crs(utm_crs, wgs84_crs, always_xy=False)
            
        except Exception as e:
            raise CoordinateTransformationError(f"Failed to initialize coordinate transformer: {e}")
    
    def transform_to_utm(self, coordinate: Coordinate) -> UTMCoordinate:
        """Transform a WGS84 coordinate to UTM.
        
        Args:
            coordinate: WGS84 coordinate to transform
            
        Returns:
            UTM coordinate with zone and hemisphere information
            
        Raises:
            CoordinateTransformationError: If transformation fails
        """
        try:
            x, y = self.to_local.transform(coordinate.latitude, coordinate.longitude)
            return UTMCoordinate(
                x=x,
                y=y,
                zone=self.utm_zone,
                hemisphere=self.hemisphere,
                epsg_code=self.epsg_code
            )
        except Exception as e:
            raise CoordinateTransformationError(f"Failed to transform to UTM: {e}")
    
    def transform_to_wgs84(self, utm_coord: UTMCoordinate) -> Coordinate:
        """Transform a UTM coordinate to WGS84.
        
        Args:
            utm_coord: UTM coordinate to transform
            
        Returns:
            WGS84 coordinate
            
        Raises:
            CoordinateTransformationError: If transformation fails
        """
        try:
            lat, lon = self.to_wgs84.transform(utm_coord.x, utm_coord.y)
            return Coordinate(latitude=lat, longitude=lon)
        except Exception as e:
            raise CoordinateTransformationError(f"Failed to transform to WGS84: {e}")


def get_epsg_for_coordinates(latitude: float, longitude: float) -> str:
    """Get the EPSG code for the UTM zone containing the given coordinates.
    
    Args:
        latitude: Latitude in decimal degrees (-90 to 90)
        longitude: Longitude in decimal degrees (-180 to 180)
        
    Returns:
        EPSG code as string (e.g., "32632" for UTM Zone 32N)
        
    Raises:
        ValueError: If coordinates are out of valid range
        
    Example:
        >>> get_epsg_for_coordinates(52.5200, 13.4050)  # Berlin
        '32633'
        >>> get_epsg_for_coordinates(-33.8688, 151.2093)  # Sydney
        '32756'
    """
    if not (-90 <= latitude <= 90):
        raise ValueError(f"Latitude must be between -90 and 90, got {latitude}")
    if not (-180 <= longitude <= 180):
        raise ValueError(f"Longitude must be between -180 and 180, got {longitude}")
    
    utm_zone = get_utm_zone(longitude)
    
    # Northern hemisphere: 326XX, Southern hemisphere: 327XX
    if latitude >= 0:
        epsg_code = f"326{utm_zone:02d}"
    else:
        epsg_code = f"327{utm_zone:02d}"
    
    return epsg_code


def get_utm_zone(longitude: float) -> int:
    """Get the UTM zone number for the given longitude.
    
    Args:
        longitude: Longitude in decimal degrees (-180 to 180)
        
    Returns:
        UTM zone number (1-60)
        
    Raises:
        ValueError: If longitude is out of valid range
        
    Example:
        >>> get_utm_zone(13.4050)  # Berlin
        33
        >>> get_utm_zone(-74.0060)  # New York
        18
    """
    if not (-180 <= longitude <= 180):
        raise ValueError(f"Longitude must be between -180 and 180, got {longitude}")
    
    # UTM zone calculation
    zone = int((longitude + 180) // 6) + 1
    return zone


def transform_to_local_coordinates(
    coordinates: CoordinateList,
    transformer: CoordinateTransformer
) -> List[Tuple[float, float, float, float]]:
    """Transform a list of WGS84 coordinates to local UTM coordinates.
    
    Args:
        coordinates: List of WGS84 coordinates to transform
        transformer: Coordinate transformer instance
        
    Returns:
        List of tuples (x, y, ground_elevation, height_above_ground)
        
    Raises:
        CoordinateTransformationError: If any transformation fails
        
    Example:
        >>> coords = [Coordinate(52.5200, 13.4050, 100.0, 1.5)]
        >>> transformer = CoordinateTransformer(52.5200, 13.4050)
        >>> local_coords = transform_to_local_coordinates(coords, transformer)
        >>> print(local_coords[0])
        (392128.31, 5819698.12, 100.0, 1.5)
    """
    if not coordinates:
        return []
    
    local_coords = []
    
    for coord in coordinates:
        try:
            utm_coord = transformer.transform_to_utm(coord)
            local_coords.append((
                utm_coord.x,
                utm_coord.y,
                coord.ground_elevation,
                coord.height_above_ground
            ))
        except Exception as e:
            raise CoordinateTransformationError(f"Failed to transform coordinate {coord}: {e}")
    
    return local_coords


def transform_to_wgs84_coordinates(
    x: float,
    y: float,
    transformer: CoordinateTransformer
) -> Tuple[float, float]:
    """Transform UTM coordinates to WGS84.
    
    Args:
        x: UTM X coordinate (easting)
        y: UTM Y coordinate (northing)
        transformer: Coordinate transformer instance
        
    Returns:
        Tuple of (latitude, longitude) in decimal degrees
        
    Raises:
        CoordinateTransformationError: If transformation fails
        
    Example:
        >>> transformer = CoordinateTransformer(52.5200, 13.4050)
        >>> lat, lon = transform_to_wgs84_coordinates(392128.31, 5819698.12, transformer)
        >>> print(f"Lat: {lat:.4f}, Lon: {lon:.4f}")
        Lat: 52.5200, Lon: 13.4050
    """
    try:
        utm_coord = UTMCoordinate(
            x=x,
            y=y,
            zone=transformer.utm_zone,
            hemisphere=transformer.hemisphere,
            epsg_code=transformer.epsg_code
        )
        wgs84_coord = transformer.transform_to_wgs84(utm_coord)
        return wgs84_coord.latitude, wgs84_coord.longitude
    except Exception as e:
        raise CoordinateTransformationError(f"Failed to transform UTM coordinates: {e}")


def decdeg2dms(decimal_degrees: float) -> Tuple[int, int, float]:
    """Convert decimal degrees to degrees, minutes, seconds.
    
    Args:
        decimal_degrees: Decimal degrees value
        
    Returns:
        Tuple of (degrees, minutes, seconds)
        
    Example:
        >>> decdeg2dms(52.5200)
        (52, 31, 12.0)
        >>> decdeg2dms(-13.4050)
        (-13, 24, 18.0)
    """
    is_negative = decimal_degrees < 0
    decimal_degrees = abs(decimal_degrees)
    
    degrees = int(decimal_degrees)
    minutes_float = (decimal_degrees - degrees) * 60
    minutes = int(minutes_float)
    seconds = (minutes_float - minutes) * 60
    
    if is_negative:
        degrees = -degrees
    
    return degrees, minutes, seconds


def dms2decdeg(degrees: int, minutes: int, seconds: float) -> float:
    """Convert degrees, minutes, seconds to decimal degrees.
    
    Args:
        degrees: Degrees component
        minutes: Minutes component
        seconds: Seconds component
        
    Returns:
        Decimal degrees value
        
    Example:
        >>> dms2decdeg(52, 31, 12.0)
        52.52
        >>> dms2decdeg(-13, 24, 18.0)
        -13.405
    """
    if degrees < 0:
        return degrees - minutes / 60.0 - seconds / 3600.0
    else:
        return degrees + minutes / 60.0 + seconds / 3600.0


def calculate_distance(coord1: Coordinate, coord2: Coordinate) -> float:
    """Calculate the great circle distance between two coordinates.
    
    Uses the Haversine formula to calculate the distance between two points
    on the Earth's surface.
    
    Args:
        coord1: First coordinate
        coord2: Second coordinate
        
    Returns:
        Distance in meters
        
    Example:
        >>> berlin = Coordinate(52.5200, 13.4050)
        >>> munich = Coordinate(48.1351, 11.5820)
        >>> distance = calculate_distance(berlin, munich)
        >>> print(f"Distance: {distance:.0f} meters")
        Distance: 504228 meters
    """
    # Convert to radians
    lat1 = math.radians(coord1.latitude)
    lon1 = math.radians(coord1.longitude)
    lat2 = math.radians(coord2.latitude)
    lon2 = math.radians(coord2.longitude)
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of Earth in meters
    r = 6371000
    
    return c * r


def calculate_bearing(coord1: Coordinate, coord2: Coordinate) -> float:
    """Calculate the bearing from coord1 to coord2.
    
    Args:
        coord1: Starting coordinate
        coord2: Destination coordinate
        
    Returns:
        Bearing in degrees (0-360, where 0 is North)
        
    Example:
        >>> berlin = Coordinate(52.5200, 13.4050)
        >>> munich = Coordinate(48.1351, 11.5820)
        >>> bearing = calculate_bearing(berlin, munich)
        >>> print(f"Bearing: {bearing:.1f}°")
        Bearing: 205.2°
    """
    # Convert to radians
    lat1 = math.radians(coord1.latitude)
    lon1 = math.radians(coord1.longitude)
    lat2 = math.radians(coord2.latitude)
    lon2 = math.radians(coord2.longitude)
    
    dlon = lon2 - lon1
    
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    bearing = math.atan2(y, x)
    
    # Convert to degrees and normalize to 0-360
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360
    
    return bearing


def validate_coordinates(coordinates: CoordinateList) -> List[str]:
    """Validate a list of coordinates and return any validation errors.
    
    Args:
        coordinates: List of coordinates to validate
        
    Returns:
        List of validation error messages (empty if all valid)
        
    Example:
        >>> coords = [Coordinate(91.0, 0.0)]  # Invalid latitude
        >>> errors = validate_coordinates(coords)
        >>> print(errors)
        ['Latitude must be between -90 and 90, got 91.0']
    """
    errors = []
    
    for i, coord in enumerate(coordinates):
        try:
            # This will raise ValueError if invalid
            _ = Coordinate(
                latitude=coord.latitude,
                longitude=coord.longitude,
                ground_elevation=coord.ground_elevation,
                height_above_ground=coord.height_above_ground
            )
        except ValueError as e:
            errors.append(f"Coordinate {i}: {e}")
    
    return errors


def get_coordinate_bounds(coordinates: CoordinateList) -> Tuple[float, float, float, float]:
    """Get the bounding box of a list of coordinates.
    
    Args:
        coordinates: List of coordinates
        
    Returns:
        Tuple of (min_lat, max_lat, min_lon, max_lon)
        
    Raises:
        ValueError: If coordinates list is empty
        
    Example:
        >>> coords = [Coordinate(52.5, 13.4), Coordinate(48.1, 11.6)]
        >>> bounds = get_coordinate_bounds(coords)
        >>> print(f"Bounds: {bounds}")
        Bounds: (48.1, 52.5, 11.6, 13.4)
    """
    if not coordinates:
        raise ValueError("Cannot calculate bounds of empty coordinate list")
    
    latitudes = [coord.latitude for coord in coordinates]
    longitudes = [coord.longitude for coord in coordinates]
    
    return (
        min(latitudes),
        max(latitudes),
        min(longitudes),
        max(longitudes)
    )