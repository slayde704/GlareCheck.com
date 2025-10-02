"""Geometric calculations for glare analysis.

This module provides functions for geometric operations including:
- Angular calculations (circular mean, azimuth)
- Distance calculations (haversine)
- Vector operations (normals, dot products)
- Plane fitting and interpolation
"""

import math
from typing import List, Tuple, Union, Optional, Sequence
import numpy as np
import numpy.typing as npt

from .models import Coordinate, Vector3D


class GeometryError(Exception):
    """Exception raised for geometry calculation errors."""
    pass


def circular_mean(angles: Sequence[float]) -> float:
    """Calculate the circular mean of angles.
    
    This function correctly handles the circular nature of angles where
    0° = 360°. For example, the mean of 350° and 10° is 0°, not 180°.
    
    Args:
        angles: Sequence of angles in degrees
        
    Returns:
        Circular mean angle in degrees (0-360)
        
    Raises:
        ValueError: If angles list is empty
        
    Example:
        >>> circular_mean([350, 10])
        0.0
        >>> circular_mean([90, 180, 270])
        180.0
    """
    if not angles:
        raise ValueError("Cannot calculate circular mean of empty list")
    
    # Convert to radians
    angles_rad = [math.radians(a) for a in angles]
    
    # Calculate mean of sin and cos components
    sin_mean = sum(math.sin(a) for a in angles_rad) / len(angles_rad)
    cos_mean = sum(math.cos(a) for a in angles_rad) / len(angles_rad)
    
    # Calculate mean angle
    mean_angle = math.atan2(sin_mean, cos_mean)
    
    # Convert back to degrees and ensure 0-360 range
    mean_degrees = math.degrees(mean_angle)
    if mean_degrees < 0:
        mean_degrees += 360
        
    return mean_degrees


def recenter_azimuth(az: float, center_az: float) -> float:
    """Recenter an azimuth angle around a given center.
    
    This function recenters an azimuth angle to be within ±180° of
    a center azimuth. Useful for avoiding discontinuities at 0°/360°.
    
    Args:
        az: Azimuth angle to recenter (degrees)
        center_az: Center azimuth (degrees)
        
    Returns:
        Recentered azimuth in range [center_az - 180, center_az + 180]
        
    Example:
        >>> recenter_azimuth(10, 180)
        -170.0
        >>> recenter_azimuth(350, 180)
        170.0
    """
    diff = az - center_az
    
    # Wrap to ±180
    while diff > 180:
        diff -= 360
    while diff < -180:
        diff += 360
        
    return diff


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on Earth.
    
    Uses the haversine formula to calculate distance accounting for
    Earth's spherical shape.
    
    Args:
        lat1: Latitude of first point (degrees)
        lon1: Longitude of first point (degrees)
        lat2: Latitude of second point (degrees)
        lon2: Longitude of second point (degrees)
        
    Returns:
        Distance in meters
        
    Example:
        >>> haversine(52.5200, 13.4050, 48.1351, 11.5820)  # Berlin to Munich
        504238.7
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    # Earth radius in meters
    R = 6371000
    
    return R * c


def calculate_azimuth(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the azimuth from point 1 to point 2.
    
    Args:
        lat1: Latitude of start point (degrees)
        lon1: Longitude of start point (degrees)
        lat2: Latitude of end point (degrees)
        lon2: Longitude of end point (degrees)
        
    Returns:
        Azimuth in degrees (0-360, where 0=North, 90=East)
        
    Example:
        >>> calculate_azimuth(0, 0, 1, 0)  # North
        0.0
        >>> calculate_azimuth(0, 0, 0, 1)  # East
        90.0
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Calculate bearing
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    # Calculate azimuth
    azimuth = math.atan2(y, x)
    
    # Convert to degrees and normalize to 0-360
    azimuth_degrees = math.degrees(azimuth)
    return (azimuth_degrees + 360) % 360


def get_panel_normal(pan_az: float, pan_tilt: float) -> np.ndarray:
    """Calculate the normal vector of a tilted panel.
    
    The normal vector points outward from the panel surface.
    For a horizontal panel (tilt=0), the normal points straight up (0,0,1).
    
    Args:
        pan_az: Panel azimuth in degrees (0=North, 90=East, 180=South)
        pan_tilt: Panel tilt in degrees (0=horizontal, 90=vertical)
        
    Returns:
        3D normal vector as numpy array [x, y, z]
        
    Example:
        >>> get_panel_normal(180, 0)  # Horizontal panel
        array([0., 0., 1.])
        >>> get_panel_normal(180, 90)  # Vertical south-facing
        array([0., -1., 0.])
    """
    # Convert to radians
    az_rad = math.radians(pan_az)
    tilt_rad = math.radians(pan_tilt)
    
    # Calculate normal vector components
    # For a south-facing panel (az=180°), the normal should point south (negative y)
    # x: East-West component (positive = East)
    # y: North-South component (positive = North)
    # z: Vertical component (positive = Up)
    x = -math.sin(az_rad) * math.sin(tilt_rad)
    y = math.cos(az_rad) * math.sin(tilt_rad)
    z = math.cos(tilt_rad)
    
    return np.array([x, y, z])


def get_sun_vector(sun_az: float, sun_el: float) -> np.ndarray:
    """Calculate the unit vector from sun to observer.
    
    The vector points from the sun towards the ground/observer.
    
    Args:
        sun_az: Sun azimuth in degrees (0=North, 90=East, 180=South)
        sun_el: Sun elevation in degrees (0=horizon, 90=zenith)
        
    Returns:
        3D sun vector as numpy array [x, y, z]
        
    Example:
        >>> get_sun_vector(180, 45)  # Sun in south at 45° elevation
        array([0., -0.707, -0.707])
    """
    # Convert to radians
    az_rad = math.radians(sun_az)
    el_rad = math.radians(sun_el)
    
    # Calculate sun vector components (from sun to ground)
    # When sun is in the south (az=180), the vector should point north (positive y)
    # x: East-West component
    # y: North-South component  
    # z: Vertical component (negative because pointing down)
    x = math.sin(az_rad) * math.cos(el_rad)
    y = -math.cos(az_rad) * math.cos(el_rad)
    z = -math.sin(el_rad)
    
    return np.array([x, y, z])


def calculate_incidence_angle(sun_az: float, sun_el: float, 
                            pan_az: float, pan_tilt: float) -> float:
    """Calculate the angle of incidence of sunlight on a panel.
    
    The incidence angle is the angle between the incoming sunlight
    and the panel normal. 0° means perpendicular (direct) incidence.
    
    Args:
        sun_az: Sun azimuth in degrees
        sun_el: Sun elevation in degrees
        pan_az: Panel azimuth in degrees
        pan_tilt: Panel tilt in degrees
        
    Returns:
        Incidence angle in degrees (0-180)
        
    Example:
        >>> calculate_incidence_angle(180, 30, 180, 30)  # Optimal alignment
        0.0
    """
    # Get vectors
    sun_vec = get_sun_vector(sun_az, sun_el)
    panel_normal = get_panel_normal(pan_az, pan_tilt)
    
    # Calculate dot product (note: sun vector points from sun to ground)
    # So we need the negative for the angle with the normal
    cos_angle = -np.dot(sun_vec, panel_normal)
    
    # Clamp to valid range to handle numerical errors
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    
    # Calculate angle
    angle_rad = math.acos(cos_angle)
    return math.degrees(angle_rad)


def calculate_angle_between_vectors(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calculate the angle between two vectors in degrees.
    
    Args:
        v1: First vector
        v2: Second vector
        
    Returns:
        Angle between vectors in degrees (0-180)
        
    Example:
        >>> v1 = np.array([1, 0, 0])
        >>> v2 = np.array([0, 1, 0])
        >>> calculate_angle_between_vectors(v1, v2)
        90.0
    """
    # Normalize vectors
    v1_norm = v1 / np.linalg.norm(v1)
    v2_norm = v2 / np.linalg.norm(v2)
    
    # Calculate dot product
    cos_angle = np.dot(v1_norm, v2_norm)
    
    # Clamp to valid range
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    
    # Calculate angle
    angle_rad = math.acos(cos_angle)
    return math.degrees(angle_rad)


def fit_plane_least_squares(points: List[Tuple[float, float, float]]) -> Tuple[float, float, float]:
    """Fit a plane through 3D points using least squares.
    
    Fits a plane of the form z = A*x + B*y + C to the given points.
    
    Args:
        points: List of (x, y, z) tuples
        
    Returns:
        Tuple of (A, B, C) coefficients
        
    Raises:
        ValueError: If fewer than 3 points provided
        GeometryError: If points are colinear
        
    Example:
        >>> points = [(0, 0, 0), (1, 0, 1), (0, 1, 2)]
        >>> A, B, C = fit_plane_least_squares(points)
        >>> # z = 1*x + 2*y + 0
    """
    if len(points) < 3:
        raise ValueError("Need at least 3 points to fit a plane")
    
    # Extract coordinates
    points_array = np.array(points)
    x = points_array[:, 0]
    y = points_array[:, 1]
    z = points_array[:, 2]
    
    # Build matrix for least squares
    # We want to solve: A*x + B*y + C = z
    A_matrix = np.column_stack([x, y, np.ones(len(points))])
    
    # Solve least squares
    try:
        coeffs, residuals, rank, s = np.linalg.lstsq(A_matrix, z, rcond=None)
        
        if rank < 3:
            raise GeometryError("Points are colinear or coplanar, cannot fit unique plane")
            
        return float(coeffs[0]), float(coeffs[1]), float(coeffs[2])
        
    except np.linalg.LinAlgError as e:
        raise GeometryError(f"Failed to fit plane: {e}")


def bilinear_interpolate(x: float, y: float, 
                        grid_x: np.ndarray, grid_y: np.ndarray,
                        grid_z: np.ndarray) -> float:
    """Perform bilinear interpolation on a regular grid.
    
    Args:
        x: X coordinate to interpolate at
        y: Y coordinate to interpolate at
        grid_x: 1D array of x coordinates of grid
        grid_y: 1D array of y coordinates of grid
        grid_z: 2D array of z values at grid points [y, x]
        
    Returns:
        Interpolated z value
        
    Raises:
        ValueError: If point is outside grid
        
    Example:
        >>> grid_x = np.array([0, 1])
        >>> grid_y = np.array([0, 1])
        >>> grid_z = np.array([[1, 2], [3, 4]])
        >>> bilinear_interpolate(0.5, 0.5, grid_x, grid_y, grid_z)
        2.5
    """
    # Check if point is outside grid
    if x < grid_x[0] or x > grid_x[-1]:
        raise ValueError(f"x={x} is outside grid range [{grid_x[0]}, {grid_x[-1]}]")
    if y < grid_y[0] or y > grid_y[-1]:
        raise ValueError(f"y={y} is outside grid range [{grid_y[0]}, {grid_y[-1]}]")
    
    # Find surrounding grid points
    x_idx = np.searchsorted(grid_x, x) - 1
    y_idx = np.searchsorted(grid_y, y) - 1
    
    # Handle edge cases
    if x_idx < 0:
        x_idx = 0
    if y_idx < 0:
        y_idx = 0
    if x_idx >= len(grid_x) - 1:
        x_idx = len(grid_x) - 2
    if y_idx >= len(grid_y) - 1:
        y_idx = len(grid_y) - 2
    
    # Get corner points
    x1, x2 = grid_x[x_idx], grid_x[x_idx + 1]
    y1, y2 = grid_y[y_idx], grid_y[y_idx + 1]
    
    # Get corner values
    z11 = grid_z[y_idx, x_idx]
    z12 = grid_z[y_idx, x_idx + 1]
    z21 = grid_z[y_idx + 1, x_idx]
    z22 = grid_z[y_idx + 1, x_idx + 1]
    
    # Bilinear interpolation formula
    dx = x2 - x1
    dy = y2 - y1
    
    if dx == 0 or dy == 0:
        raise ValueError("Grid spacing cannot be zero")
    
    # Interpolate
    result = (z11 * (x2 - x) * (y2 - y) +
              z12 * (x - x1) * (y2 - y) +
              z21 * (x2 - x) * (y - y1) +
              z22 * (x - x1) * (y - y1)) / (dx * dy)
    
    return float(result)


def rotate_point_2d(x: float, y: float, angle: float, 
                    center_x: float = 0, center_y: float = 0) -> Tuple[float, float]:
    """Rotate a 2D point around a center.
    
    Args:
        x: X coordinate of point
        y: Y coordinate of point
        angle: Rotation angle in degrees (positive = counterclockwise)
        center_x: X coordinate of rotation center
        center_y: Y coordinate of rotation center
        
    Returns:
        Tuple of (rotated_x, rotated_y)
        
    Example:
        >>> rotate_point_2d(1, 0, 90)  # Rotate (1,0) by 90°
        (0.0, 1.0)
    """
    # Convert angle to radians
    angle_rad = math.radians(angle)
    
    # Translate to origin
    x_translated = x - center_x
    y_translated = y - center_y
    
    # Rotate
    cos_angle = math.cos(angle_rad)
    sin_angle = math.sin(angle_rad)
    
    x_rotated = x_translated * cos_angle - y_translated * sin_angle
    y_rotated = x_translated * sin_angle + y_translated * cos_angle
    
    # Translate back
    return x_rotated + center_x, y_rotated + center_y


def distance_point_to_line_3d(point: np.ndarray, line_point: np.ndarray, 
                             line_direction: np.ndarray) -> float:
    """Calculate the distance from a point to a line in 3D.
    
    Args:
        point: 3D point
        line_point: Any point on the line
        line_direction: Direction vector of the line
        
    Returns:
        Distance from point to line
        
    Example:
        >>> point = np.array([1, 1, 0])
        >>> line_point = np.array([0, 0, 0])
        >>> line_direction = np.array([1, 0, 0])  # X-axis
        >>> distance_point_to_line_3d(point, line_point, line_direction)
        1.0
    """
    # Vector from line point to point
    w = point - line_point
    
    # Normalize line direction
    line_dir_norm = line_direction / np.linalg.norm(line_direction)
    
    # Calculate perpendicular distance
    # |w - (w·d)d| where d is normalized line direction
    projection = np.dot(w, line_dir_norm) * line_dir_norm
    perpendicular = w - projection
    
    return float(np.linalg.norm(perpendicular))


def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """Check if point is inside polygon using ray casting algorithm.
    
    Args:
        point: Point coordinates (x, y)
        polygon: List of polygon vertices as (x, y) tuples
        
    Returns:
        True if point is inside polygon
        
    Example:
        >>> square = [(0, 0), (1, 0), (1, 1), (0, 1)]
        >>> point_in_polygon((0.5, 0.5), square)
        True
        >>> point_in_polygon((2, 2), square)
        False
    """
    x, y = point
    n = len(polygon)
    inside = False

    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside