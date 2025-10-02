"""Reflection calculations for glare analysis.

This module provides functions for calculating reflection directions,
coefficients, and intensities based on sun position and panel orientation.
"""

import logging
import math
from typing import Dict, List, Tuple, Optional, Union, Callable
import numpy as np
import pandas as pd
from pathlib import Path
from .models import PVArea, SunPosition
from .geometry import get_panel_normal, get_sun_vector, calculate_incidence_angle
from ..config import config
from .reflection_csv_loader import load_reflection_profiles_auto
from .reflection_base import ReflectionProfile, ReflectionError

# Optional scipy import for advanced interpolation
try:
    from scipy.interpolate import interp1d
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("scipy not available. Using linear interpolation for reflection profiles.")


logger = logging.getLogger(__name__)


def calculate_reflection_direction(
    sun_az: float,
    sun_el: float,
    pan_az: float,
    pan_tilt: float
) -> Tuple[float, float]:
    """Calculate the direction of reflected sunlight.
    
    Uses the law of reflection: angle of incidence equals angle of reflection.
    The reflection occurs in the plane containing the incident ray and surface normal.
    
    Args:
        sun_az: Sun azimuth in degrees (0=North, 90=East)
        sun_el: Sun elevation in degrees (0=horizon, 90=zenith)
        pan_az: Panel azimuth in degrees
        pan_tilt: Panel tilt in degrees (0=horizontal, 90=vertical)
        
    Returns:
        Tuple of (reflected_azimuth, reflected_elevation) in degrees
        
    Example:
        >>> # Sun from south at 60°, south-facing panel tilted 30°
        >>> refl_az, refl_el = calculate_reflection_direction(180, 60, 180, 30)
        >>> print(f"Reflection: azimuth {refl_az:.1f}°, elevation {refl_el:.1f}°")
    """
    # Get sun vector (from sun to ground)
    sun_vec = get_sun_vector(sun_az, sun_el)
    
    # Get panel normal
    panel_normal = get_panel_normal(pan_az, pan_tilt)
    
    # Calculate incident vector (from ground to sun = negative of sun vector)
    incident_vec = -sun_vec
    
    # Apply reflection law: r = i - 2(i·n)n
    dot_product = np.dot(incident_vec, panel_normal)
    reflection_vec = incident_vec - 2 * dot_product * panel_normal
    
    # Convert reflection vector to azimuth and elevation
    # Note: reflection_vec points away from panel
    x, y, z = reflection_vec
    
    # Calculate elevation
    reflection_el = math.degrees(math.asin(z))
    
    # Calculate azimuth
    reflection_az = math.degrees(math.atan2(x, y))
    if reflection_az < 0:
        reflection_az += 360
    
    return reflection_az, reflection_el


def load_reflection_profiles(csv_path: Union[str, Path]) -> Dict[int, ReflectionProfile]:
    """Load reflection profiles from CSV file.
    
    This function now auto-detects the CSV format and handles both:
    - Original format: IA,Value,ModuleType
    - Standard format: Incident Angle,Module Type 0,Module Type 1,Module Type 2
    
    Args:
        csv_path: Path to CSV file with reflection data
        
    Returns:
        Dictionary mapping module type to ReflectionProfile
        
    Raises:
        ReflectionError: If file cannot be loaded or parsed
    """
    return load_reflection_profiles_auto(csv_path)


def calculate_reflection_coefficient(
    incidence_angle: float,
    module_type: int,
    profiles: Dict[int, ReflectionProfile]
) -> float:
    """Get reflection coefficient for given angle and module type.
    
    Args:
        incidence_angle: Angle of incidence in degrees
        module_type: Module type (0, 1, or 2)
        profiles: Dictionary of reflection profiles
        
    Returns:
        Reflection coefficient (0-1)
        
    Raises:
        ValueError: If module type not found in profiles
    """
    if module_type not in profiles:
        raise ValueError(f"Module type {module_type} not found in profiles")
    
    return profiles[module_type].get_coefficient(incidence_angle)


def calculate_direct_irradiance_on_plane(
    dni: float,
    sun_el: float,
    sun_az: float,
    pan_tilt: float,
    pan_az: float
) -> float:
    """Calculate direct irradiance on a tilted plane.
    
    Uses the cosine of the incidence angle to project DNI onto the plane.
    
    Args:
        dni: Direct Normal Irradiance in W/m²
        sun_el: Sun elevation in degrees
        sun_az: Sun azimuth in degrees
        pan_tilt: Panel tilt in degrees
        pan_az: Panel azimuth in degrees
        
    Returns:
        Direct irradiance on plane in W/m²
        
    Example:
        >>> # Sun at 60° elevation, 30° tilted panel, both facing south
        >>> di = calculate_direct_irradiance_on_plane(800, 60, 180, 30, 180)
        >>> print(f"Direct irradiance on plane: {di:.0f} W/m²")
        Direct irradiance on plane: 800 W/m²
    """
    # Get incidence angle
    incidence_angle = calculate_incidence_angle(sun_az, sun_el, pan_az, pan_tilt)
    
    # Calculate cosine factor
    cos_factor = math.cos(math.radians(incidence_angle))
    
    # DNI on plane = DNI * cos(incidence_angle)
    # But ensure non-negative (sun behind panel)
    di_plane = max(0, dni * cos_factor)
    
    return di_plane


def generate_reflection_dataframe(
    sun_df: pd.DataFrame,
    pv_areas: List[PVArea],
    profiles: Optional[Dict[int, ReflectionProfile]] = None
) -> pd.DataFrame:
    """Generate DataFrame with reflection calculations for all sun positions and PV areas.
    
    Args:
        sun_df: DataFrame with sun positions (must have azimuth, elevation columns)
        pv_areas: List of PV areas to calculate reflections for
        profiles: Optional reflection profiles (for coefficient calculation)
        
    Returns:
        DataFrame with columns:
        - pv_area_name: Name of PV area
        - timestamp: Time of calculation
        - sun_azimuth, sun_elevation: Sun position
        - reflection_azimuth, reflection_elevation: Reflection direction
        - incidence_angle: Angle between sun and panel normal
        - reflection_coefficient: Reflection coefficient (if profiles provided)
        - dni, dhi, ghi: Irradiance values (if present in sun_df)
        - di_plane: Direct irradiance on panel plane
        
    Example:
        >>> refl_df = generate_reflection_dataframe(sun_df, pv_areas, profiles)
        >>> print(f"Generated {len(refl_df)} reflection calculations")
    """
    results = []
    
    # Check if irradiance data is available
    has_irradiance = all(col in sun_df.columns for col in ['dni', 'dhi', 'ghi'])
    
    for pv_area in pv_areas:
        logger.debug(f"Calculating reflections for PV area: {pv_area.name}")
        
        for idx, sun_row in sun_df.iterrows():
            # Calculate reflection direction
            refl_az, refl_el = calculate_reflection_direction(
                sun_row['azimuth'],
                sun_row['elevation'],
                pv_area.azimuth,
                pv_area.tilt
            )
            
            # Calculate incidence angle
            inc_angle = calculate_incidence_angle(
                sun_row['azimuth'],
                sun_row['elevation'],
                pv_area.azimuth,
                pv_area.tilt
            )
            
            # Build result row
            result = {
                'pv_area_name': pv_area.name,
                'timestamp': idx,
                'sun_azimuth': sun_row['azimuth'],
                'sun_elevation': sun_row['elevation'],
                'reflection_azimuth': refl_az,
                'reflection_elevation': refl_el,
                'incidence_angle': inc_angle
            }
            
            # Add reflection coefficient if profiles available
            if profiles and pv_area.module_type in profiles:
                result['reflection_coefficient'] = calculate_reflection_coefficient(
                    inc_angle, pv_area.module_type, profiles
                )
            
            # Add irradiance data if available
            if has_irradiance:
                result['dni'] = sun_row['dni']
                result['dhi'] = sun_row['dhi']
                result['ghi'] = sun_row['ghi']
                
                # Calculate direct irradiance on plane
                result['di_plane'] = calculate_direct_irradiance_on_plane(
                    sun_row['dni'],
                    sun_row['elevation'],
                    sun_row['azimuth'],
                    pv_area.tilt,
                    pv_area.azimuth
                )
            
            results.append(result)
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Set timestamp as index if it exists
    if 'timestamp' in df.columns:
        df.set_index('timestamp', inplace=True)
    
    return df


def add_luminance_to_glare_results(
    df_glare: pd.DataFrame,
    profile_func: Callable[[float], float],
    k_dynamic: float = 130.0,
    scale_factor: float = 100000.0
) -> pd.DataFrame:
    """Calculate and add luminance values to glare results.
    
    Luminance is calculated based on:
    - Reflection coefficient (from incidence angle)
    - Direct irradiance on panel plane
    - Dynamic luminous efficacy
    
    Args:
        df_glare: DataFrame with glare results (must have incidence_angle, di_plane)
        profile_func: Function that returns reflection coefficient for given angle
        k_dynamic: Dynamic luminous efficacy in lm/W (default 130)
        scale_factor: Scale factor for luminance calculation (default 100000)
        
    Returns:
        DataFrame with added 'luminance' column in cd/m²
        
    Note:
        Formula: luminance = profile(angle) * di_plane * k_dynamic / scale_factor
    """
    df_result = df_glare.copy()
    
    # Calculate reflection coefficients
    reflection_coeffs = df_result['incidence_angle'].apply(profile_func)
    
    # Calculate luminance
    # Note: The scale factor converts from illuminance to luminance
    df_result['luminance'] = (
        reflection_coeffs * 
        df_result['di_plane'] * 
        k_dynamic / 
        scale_factor
    )
    
    # Ensure non-negative
    df_result['luminance'] = df_result['luminance'].clip(lower=0)
    
    logger.debug(f"Added luminance values, range: {df_result['luminance'].min():.0f} - {df_result['luminance'].max():.0f} cd/m²")
    
    return df_result


def create_reflection_interpolator(
    profiles: Dict[int, ReflectionProfile],
    module_type: int,
    fit_log: bool = True
) -> Callable[[float], float]:
    """Create an interpolation function for reflection coefficients.
    
    Args:
        profiles: Dictionary of reflection profiles
        module_type: Module type to create interpolator for
        fit_log: If True, fit in log space for better low-angle behavior (requires scipy)
        
    Returns:
        Function that maps incidence angle to reflection coefficient
        
    Raises:
        ValueError: If module type not found
    """
    if module_type not in profiles:
        raise ValueError(f"Module type {module_type} not found in profiles")
    
    profile = profiles[module_type]
    
    if fit_log and SCIPY_AVAILABLE:
        # Fit in log space for better low-angle behavior
        # Add small epsilon to avoid log(0)
        eps = 1e-6
        log_coeffs = np.log(profile.coefficients + eps)
        
        # Create interpolator in log space
        log_interp = interp1d(
            profile.angles,
            log_coeffs,
            kind='cubic',
            bounds_error=False,
            fill_value=(log_coeffs[0], log_coeffs[-1])
        )
        
        # Return function that converts back from log space
        def interpolator(angle: float) -> float:
            angle = np.clip(angle, 0, 90)
            return np.exp(log_interp(angle)) - eps
        
        return interpolator
    else:
        # Direct interpolation using built-in method
        return lambda angle: profile.get_coefficient(angle)