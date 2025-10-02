"""Glare analysis module for solar PV installations.

This module provides the core functionality for analyzing glare from photovoltaic
panels, including grid generation, visibility checks, and intensity calculations.
"""

import logging
import math
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Union
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Try to import shapely
try:
    from shapely.geometry import Polygon, Point as ShapelyPoint
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False
    logger.warning("shapely not available. Using simplified geometry calculations.")

from .models import PVArea, ObservationPoint, Coordinate
from .geometry import (
    calculate_azimuth, get_panel_normal, haversine, point_in_polygon
)
from .reflection import ReflectionProfile
from ..config import Config


@dataclass
class GridPoint:
    """Represents a calculation point in the PV grid."""
    x: float
    y: float
    z: float
    area: float  # Area represented by this grid point


@dataclass
class AngularGridPoint:
    """Represents a calculation point in angular coordinates."""
    azimuth: float  # degrees
    elevation: float  # degrees
    op_number: int
    pv_area_name: str


@dataclass
class GlareEvent:
    """Represents a single glare event."""
    timestamp: pd.Timestamp
    op_number: int
    pv_area_name: str
    sun_azimuth: float
    sun_elevation: float
    reflection_azimuth: float
    reflection_elevation: float
    incidence_angle: float
    dni: float
    intensity: float  # cd/m²
    duration_minutes: float = 1.0


class GlareAnalyzer:
    """Main class for glare analysis calculations."""
    
    def __init__(
        self,
        reflection_profiles: Dict[int, ReflectionProfile],
        grid_width: float = 1.0,
        beam_spread: float = 0.5,
        sun_angle: float = 0.53,
        glare_threshold: float = 30000.0  # cd/m²
    ):
        """Initialize glare analyzer.
        
        Args:
            reflection_profiles: Module reflection profiles by type
            grid_width: Grid spacing in meters or degrees
            beam_spread: Beam spread angle in degrees
            sun_angle: Sun angular diameter in degrees
            glare_threshold: Minimum intensity to consider as glare
        """
        self.reflection_profiles = reflection_profiles
        self.grid_width = grid_width
        self.beam_spread = beam_spread
        self.sun_angle = sun_angle
        self.glare_threshold = glare_threshold
        self.angular_threshold = (beam_spread + sun_angle) / 2
    
    def generate_pv_grid(
        self,
        pv_area: PVArea,
        grid_spacing: Optional[float] = None
    ) -> List[GridPoint]:
        """Generate calculation grid for PV area.
        
        Creates a regular grid of points within the PV area polygon.
        
        Args:
            pv_area: PV area to generate grid for
            grid_spacing: Override default grid spacing
            
        Returns:
            List of grid points
        """
        if grid_spacing is None:
            grid_spacing = self.grid_width
        
        # Convert PV area corners to local coordinate system
        # For now, use a simple approach - proper implementation would
        # transform to UTM or local tangent plane
        
        corners = [(p.longitude, p.latitude) for p in pv_area.coordinates]
        
        if SHAPELY_AVAILABLE:
            polygon = Polygon(corners)
        else:
            polygon = None  # Will use point_in_polygon function instead
        
        # Get bounding box
        if SHAPELY_AVAILABLE and polygon:
            minx, miny, maxx, maxy = polygon.bounds
        else:
            # Calculate bounds manually
            lons = [c[0] for c in corners]
            lats = [c[1] for c in corners]
            minx, maxx = min(lons), max(lons)
            miny, maxy = min(lats), max(lats)
        
        # Generate grid points
        grid_points = []
        
        # Calculate grid dimensions
        nx = int((maxx - minx) / grid_spacing) + 1
        ny = int((maxy - miny) / grid_spacing) + 1
        
        # Cell area
        cell_area = grid_spacing * grid_spacing
        
        for i in range(nx):
            for j in range(ny):
                x = minx + i * grid_spacing
                y = miny + j * grid_spacing
                
                # Check if point is inside polygon
                if SHAPELY_AVAILABLE:
                    point = ShapelyPoint(x, y)
                    is_inside = polygon.contains(point)
                else:
                    # Use simple point-in-polygon check from geometry module
                    coords = [(c.latitude, c.longitude) for c in pv_area.coordinates]
                    is_inside = point_in_polygon((x, y), coords)
                
                if is_inside:
                    # Get elevation (would interpolate from corners in full implementation)
                    z = pv_area.coordinates[0].ground_elevation
                    
                    grid_points.append(GridPoint(x, y, z, cell_area))
        
        logger.info(f"Generated {len(grid_points)} grid points for PV area {pv_area.name}")
        
        return grid_points
    
    def generate_angular_grid(
        self,
        observer: ObservationPoint,
        pv_area: PVArea,
        angular_spacing: Optional[float] = None
    ) -> List[AngularGridPoint]:
        """Generate calculation points in angular domain.
        
        Creates a grid of azimuth/elevation angles from observer's perspective
        that covers the PV area.
        
        Args:
            observer: Observation point
            pv_area: PV area to cover
            angular_spacing: Override default angular grid spacing
            
        Returns:
            List of angular grid points
        """
        if angular_spacing is None:
            angular_spacing = self.grid_width
        
        # Calculate angular bounds of PV area from observer
        azimuths = []
        elevations = []
        
        for corner in pv_area.coordinates:
            # Calculate azimuth and elevation from observer to corner
            az = calculate_azimuth(
                observer.coordinate.latitude,
                observer.coordinate.longitude,
                corner.latitude,
                corner.longitude
            )
            
            # Calculate distance and elevation angle
            dist_horiz = haversine(
                observer.coordinate.latitude, observer.coordinate.longitude,
                corner.latitude, corner.longitude
            )
            
            height_diff = corner.ground_elevation - observer.coordinate.ground_elevation
            el = math.degrees(math.atan2(height_diff, dist_horiz))
            
            azimuths.append(az)
            elevations.append(el)
        
        # Handle azimuth wraparound
        azimuths = np.array(azimuths)
        # Normalize to handle 0/360 boundary
        for i in range(1, len(azimuths)):
            while azimuths[i] - azimuths[i-1] > 180:
                azimuths[i] -= 360
            while azimuths[i] - azimuths[i-1] < -180:
                azimuths[i] += 360
        
        # Get bounds
        min_az = azimuths.min() - self.angular_threshold
        max_az = azimuths.max() + self.angular_threshold
        min_el = min(elevations) - self.angular_threshold
        max_el = max(elevations) + self.angular_threshold
        
        # Generate grid
        angular_grid = []
        
        az = min_az
        while az <= max_az:
            el = min_el
            while el <= max_el:
                # Check if point is inside PV area angular bounds
                # (simplified - full implementation would project back to check)
                angular_grid.append(AngularGridPoint(
                    azimuth=az % 360,  # Normalize to [0, 360)
                    elevation=el,
                    op_number=1,  # Default to 1, should be passed from calling function
                    pv_area_name=pv_area.name
                ))
                el += angular_spacing
            az += angular_spacing
        
        logger.debug(f"Generated {len(angular_grid)} angular grid points for observer {observer.name}")
        
        return angular_grid
    
    def check_glare_hit(
        self,
        reflection_az: float,
        reflection_el: float,
        target_az: float,
        target_el: float,
        threshold: Optional[float] = None
    ) -> bool:
        """Check if reflection hits target within threshold.
        
        Args:
            reflection_az: Reflection azimuth in degrees
            reflection_el: Reflection elevation in degrees
            target_az: Target azimuth in degrees
            target_el: Target elevation in degrees
            threshold: Angular threshold in degrees
            
        Returns:
            True if hit detected
        """
        if threshold is None:
            threshold = self.angular_threshold
        
        # Convert to radians
        refl_az_rad = math.radians(reflection_az)
        refl_el_rad = math.radians(reflection_el)
        target_az_rad = math.radians(target_az)
        target_el_rad = math.radians(target_el)
        
        # Calculate angular distance
        # Handle azimuth wraparound
        delta_az = abs(refl_az_rad - target_az_rad)
        if delta_az > math.pi:
            delta_az = 2 * math.pi - delta_az
        
        delta_el = abs(refl_el_rad - target_el_rad)
        
        # Euclidean distance in angular space
        angular_distance = math.sqrt(delta_az**2 + delta_el**2)
        
        return angular_distance <= math.radians(threshold)
    
    def calculate_glare_intensity(
        self,
        dni: float,
        incidence_angle: float,
        reflection_coeff: float,
        area: float,
        distance: float
    ) -> float:
        """Calculate glare intensity at observer.
        
        Args:
            dni: Direct normal irradiance in W/m²
            incidence_angle: Angle of incidence in degrees
            reflection_coeff: Reflection coefficient (0-1)
            area: Reflecting area in m²
            distance: Distance to observer in m
            
        Returns:
            Luminous intensity in cd/m²
        """
        # Direct irradiance on panel
        cos_inc = math.cos(math.radians(incidence_angle))
        irradiance_on_panel = dni * cos_inc
        
        # Reflected luminous flux
        # Using dynamic luminous efficacy
        k_dynamic = 130.0  # lm/W
        luminous_flux = irradiance_on_panel * area * reflection_coeff * k_dynamic
        
        # Solid angle subtended by observer
        # Simplified - assumes small angle
        solid_angle = 1.0 / (distance * distance)
        
        # Luminance
        luminance = luminous_flux * solid_angle / area
        
        return luminance
    
    def detect_glare_vectorized(
        self,
        reflection_df: pd.DataFrame,
        angular_grid: List[AngularGridPoint],
        pv_area: PVArea
    ) -> List[GlareEvent]:
        """Detect glare events using vectorized operations.
        
        Args:
            reflection_df: DataFrame with reflection calculations
            angular_grid: Angular grid points to check
            pv_area: PV area being analyzed
            
        Returns:
            List of glare events
        """
        # Filter angular grid for this PV area
        grid_points = [p for p in angular_grid if p.pv_area_name == pv_area.name]
        if not grid_points:
            return []
        
        # Extract grid angles
        grid_azimuths = np.array([p.azimuth for p in grid_points])
        grid_elevations = np.array([p.elevation for p in grid_points])
        
        # Filter reflection data for this PV area
        pv_reflections = reflection_df[reflection_df['pv_area_name'] == pv_area.name]
        if pv_reflections.empty:
            return []
        
        # Vectorized hit detection
        glare_events = []
        
        threshold_rad = math.radians(self.angular_threshold)
        
        # Process in chunks for memory efficiency
        chunk_size = 1000
        for i in range(0, len(pv_reflections), chunk_size):
            chunk = pv_reflections.iloc[i:i+chunk_size]
            
            # Get reflection angles
            refl_az = np.radians(chunk['reflection_azimuth'].values)
            refl_el = np.radians(chunk['reflection_elevation'].values)
            
            # Expand arrays for broadcasting
            refl_az_exp = refl_az[:, np.newaxis]
            refl_el_exp = refl_el[:, np.newaxis]
            grid_az_exp = np.radians(grid_azimuths[np.newaxis, :])
            grid_el_exp = np.radians(grid_elevations[np.newaxis, :])
            
            # Calculate angular distances
            delta_az = np.abs(refl_az_exp - grid_az_exp)
            delta_az = np.minimum(delta_az, 2 * np.pi - delta_az)  # Handle wraparound
            delta_el = np.abs(refl_el_exp - grid_el_exp)
            
            # Euclidean distance in angular space
            angular_distances = np.sqrt(delta_az**2 + delta_el**2)
            
            # Find hits
            hits = angular_distances <= threshold_rad
            hit_indices = np.where(hits)
            
            # Create glare events for hits
            for refl_idx, grid_idx in zip(hit_indices[0], hit_indices[1]):
                refl_row = chunk.iloc[refl_idx]
                grid_point = grid_points[grid_idx]
                
                # Skip if incidence angle too large
                if refl_row.get('incidence_angle', 0) > 89:
                    continue
                
                # Calculate intensity if we have the data
                intensity = 0.0
                if 'dni' in refl_row and 'incidence_angle' in refl_row:
                    # Get reflection coefficient
                    module_type = pv_area.module_type
                    if module_type in self.reflection_profiles:
                        profile = self.reflection_profiles[module_type]
                        refl_coeff = profile.get_coefficient(refl_row['incidence_angle'])
                        
                        # Simplified intensity calculation
                        # In full implementation, would calculate actual distance and area
                        intensity = self.calculate_glare_intensity(
                            refl_row['dni'],
                            refl_row['incidence_angle'],
                            refl_coeff,
                            area=1.0,  # Placeholder
                            distance=100.0  # Placeholder
                        )
                
                if intensity >= self.glare_threshold:
                    event = GlareEvent(
                        timestamp=refl_row.name if isinstance(refl_row.name, pd.Timestamp) else pd.Timestamp.now(),
                        op_number=grid_point.op_number,
                        pv_area_name=pv_area.name,
                        sun_azimuth=refl_row.get('sun_azimuth', 0),
                        sun_elevation=refl_row.get('sun_elevation', 0),
                        reflection_azimuth=refl_row.get('reflection_azimuth', 0),
                        reflection_elevation=refl_row.get('reflection_elevation', 0),
                        incidence_angle=refl_row.get('incidence_angle', 0),
                        dni=refl_row.get('dni', 0),
                        intensity=intensity
                    )
                    glare_events.append(event)
        
        return glare_events
    
    def aggregate_glare_periods(
        self,
        glare_events: List[GlareEvent],
        gap_threshold_minutes: int = 5
    ) -> pd.DataFrame:
        """Aggregate continuous glare periods.
        
        Args:
            glare_events: List of glare events
            gap_threshold_minutes: Maximum gap to consider continuous
            
        Returns:
            DataFrame with aggregated glare periods
        """
        if not glare_events:
            return pd.DataFrame()
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame([
            {
                'timestamp': e.timestamp,
                'op_number': e.op_number,
                'pv_area_name': e.pv_area_name,
                'intensity': e.intensity,
                'duration_minutes': e.duration_minutes
            }
            for e in glare_events
        ])
        
        # Sort by observation point, PV area, and time
        df = df.sort_values(['op_number', 'pv_area_name', 'timestamp'])
        
        # Group and aggregate
        periods = []
        
        for (op, pv_area), group in df.groupby(['op_number', 'pv_area_name']):
            # Find continuous periods
            group = group.reset_index(drop=True)
            
            period_start = group.iloc[0]['timestamp']
            period_end = period_start
            period_intensity_sum = 0
            period_count = 0
            
            for i in range(len(group)):
                current_time = group.iloc[i]['timestamp']
                
                # Check if this is part of the same period
                if i > 0:
                    time_gap = (current_time - period_end).total_seconds() / 60
                    if time_gap > gap_threshold_minutes:
                        # End current period
                        periods.append({
                            'op_number': op,
                            'pv_area_name': pv_area,
                            'start_time': period_start,
                            'end_time': period_end,
                            'duration_minutes': (period_end - period_start).total_seconds() / 60,
                            'average_intensity': period_intensity_sum / period_count if period_count > 0 else 0
                        })
                        
                        # Start new period
                        period_start = current_time
                        period_intensity_sum = 0
                        period_count = 0
                
                # Update current period
                period_end = current_time
                period_intensity_sum += group.iloc[i]['intensity']
                period_count += 1
            
            # Add final period
            if period_count > 0:
                periods.append({
                    'op_number': op,
                    'pv_area_name': pv_area,
                    'start_time': period_start,
                    'end_time': period_end,
                    'duration_minutes': (period_end - period_start).total_seconds() / 60,
                    'average_intensity': period_intensity_sum / period_count
                })
        
        return pd.DataFrame(periods)


def calculate_glare_statistics(glare_periods: pd.DataFrame) -> Dict:
    """Calculate summary statistics from glare periods.
    
    Args:
        glare_periods: DataFrame with aggregated glare periods
        
    Returns:
        Dictionary with statistics
    """
    if glare_periods.empty:
        return {
            'total_glare_minutes': 0,
            'days_with_glare': 0,
            'max_daily_minutes': 0,
            'average_daily_minutes': 0,
            'max_intensity': 0,
            'average_intensity': 0
        }
    
    # Add date column
    glare_periods['date'] = glare_periods['start_time'].dt.date
    
    # Daily statistics
    daily_stats = glare_periods.groupby('date').agg({
        'duration_minutes': 'sum',
        'average_intensity': 'mean'
    })
    
    return {
        'total_glare_minutes': glare_periods['duration_minutes'].sum(),
        'days_with_glare': len(daily_stats),
        'max_daily_minutes': daily_stats['duration_minutes'].max(),
        'average_daily_minutes': daily_stats['duration_minutes'].mean(),
        'max_intensity': glare_periods['average_intensity'].max(),
        'average_intensity': glare_periods['average_intensity'].mean()
    }