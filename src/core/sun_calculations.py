"""Sun position and irradiance calculations for glare analysis.

This module provides functions for calculating sun positions, solar irradiance,
and related astronomical data using the pvlib library.
"""

import logging
from typing import Optional, Tuple, Union, Dict, Any
from datetime import datetime, date, timedelta
import pandas as pd
import numpy as np
import pytz

try:
    import pvlib
    from pvlib import location, solarposition, irradiance, atmosphere
    PVLIB_AVAILABLE = True
except ImportError:
    PVLIB_AVAILABLE = False
    pvlib = None

from .models import Coordinate, SunPosition


logger = logging.getLogger(__name__)


class SunCalculationError(Exception):
    """Exception raised for sun calculation errors."""
    pass


def _check_pvlib_available() -> None:
    """Check if pvlib is available and raise error if not."""
    if not PVLIB_AVAILABLE:
        raise SunCalculationError(
            "pvlib is required for sun calculations. Install with: pip install pvlib"
        )


def _ensure_utc(dt: datetime) -> datetime:
    """Ensure datetime is in UTC timezone.
    
    Args:
        dt: Datetime to convert
        
    Returns:
        Datetime in UTC timezone
        
    Raises:
        ValueError: If datetime is naive (no timezone)
    """
    if dt.tzinfo is None:
        raise ValueError("Datetime must have timezone information")
    
    return dt.astimezone(pytz.UTC)


def generate_sun_positions(
    coordinate: Coordinate,
    start_time: datetime,
    end_time: datetime,
    time_resolution_minutes: int = 10,
    min_elevation: float = -90.0
) -> pd.DataFrame:
    """Generate sun positions for a time range.
    
    Calculates sun positions (azimuth and elevation) for the specified
    location and time range using pvlib.
    
    Args:
        coordinate: Location coordinates with optional elevation
        start_time: Start time (must have timezone)
        end_time: End time (must have timezone)
        time_resolution_minutes: Time step in minutes (1-60)
        min_elevation: Minimum sun elevation to include (degrees)
        
    Returns:
        DataFrame with columns:
        - index: datetime in UTC
        - azimuth: Sun azimuth angle (degrees, 0=North, 90=East)
        - elevation: Sun elevation angle (degrees, 0=horizon, 90=zenith)
        - apparent_elevation: Elevation corrected for refraction
        - zenith: Sun zenith angle (degrees, 0=zenith, 90=horizon)
        - apparent_zenith: Zenith corrected for refraction
        
    Raises:
        SunCalculationError: If pvlib is not available
        ValueError: If inputs are invalid
        
    Example:
        >>> coord = Coordinate(52.5200, 13.4050, 34.0)
        >>> start = datetime(2023, 6, 21, 0, 0, tzinfo=pytz.UTC)
        >>> end = start + timedelta(days=1)
        >>> df = generate_sun_positions(coord, start, end, 60)
        >>> print(f"Noon elevation: {df.loc['2023-06-21 12:00:00', 'elevation']:.1f}°")
        Noon elevation: 60.9°
    """
    # Validate inputs
    if not (1 <= time_resolution_minutes <= 60):
        raise ValueError("Time resolution must be between 1 and 60 minutes")
    
    if end_time <= start_time:
        raise ValueError("End time must be after start time")
    
    # Ensure UTC
    start_time = _ensure_utc(start_time)
    end_time = _ensure_utc(end_time)
    
    # Use pvlib if available, otherwise use simple fallback
    if PVLIB_AVAILABLE:
        return _generate_sun_positions_pvlib(coordinate, start_time, end_time, time_resolution_minutes, min_elevation)
    else:
        logger.warning("pvlib not available. Using simplified sun position calculations.")
        return _generate_sun_positions_simple(coordinate, start_time, end_time, time_resolution_minutes, min_elevation)


def _generate_sun_positions_pvlib(
    coordinate: Coordinate,
    start_time: datetime,
    end_time: datetime,
    time_resolution_minutes: int,
    min_elevation: float
) -> pd.DataFrame:
    """Generate sun positions using pvlib library."""
    # Create location object
    loc = location.Location(
        latitude=coordinate.latitude,
        longitude=coordinate.longitude,
        altitude=coordinate.ground_elevation,
        tz='UTC'
    )
    
    # Generate time index
    times = pd.date_range(
        start=start_time,
        end=end_time,
        freq=f'{time_resolution_minutes}min',
        tz='UTC'
    )
    
    # Calculate solar positions
    logger.debug(f"Calculating sun positions for {len(times)} timestamps")
    solar_pos = loc.get_solarposition(times)
    
    # Create result DataFrame
    result = pd.DataFrame({
        'azimuth': solar_pos['azimuth'].round(2),
        'elevation': solar_pos['elevation'].round(2),
        'apparent_elevation': solar_pos['apparent_elevation'].round(2),
        'zenith': solar_pos['zenith'].round(2),
        'apparent_zenith': solar_pos['apparent_zenith'].round(2)
    })
    
    # Filter by minimum elevation
    if min_elevation > -90:
        result = result[result['apparent_elevation'] >= min_elevation]
        logger.debug(f"Filtered to {len(result)} timestamps with elevation >= {min_elevation}°")
    
    return result


def _generate_sun_positions_simple(
    coordinate: Coordinate,
    start_time: datetime,
    end_time: datetime,
    time_resolution_minutes: int,
    min_elevation: float
) -> pd.DataFrame:
    """Generate sun positions using simplified astronomical calculations."""
    # Generate time index
    times = pd.date_range(
        start=start_time,
        end=end_time,
        freq=f'{time_resolution_minutes}min',
        tz='UTC'
    )
    
    # Simple sun position calculation
    positions = []
    for time in times:
        azimuth, elevation = _calculate_sun_position_simple(coordinate.latitude, coordinate.longitude, time)
        
        # Only include if above minimum elevation
        if elevation >= min_elevation:
            positions.append({
                'azimuth': round(azimuth, 2),
                'elevation': round(elevation, 2),
                'apparent_elevation': round(elevation, 2),  # Same as elevation in simple model
                'zenith': round(90 - elevation, 2),
                'apparent_zenith': round(90 - elevation, 2)
            })
    
    # Create result DataFrame
    result = pd.DataFrame(positions)
    if len(result) == 0:
        # Create empty DataFrame with correct columns
        result = pd.DataFrame(columns=['azimuth', 'elevation', 'apparent_elevation', 'zenith', 'apparent_zenith'])
    
    logger.debug(f"Generated {len(result)} sun positions using simple calculations")
    return result


def _calculate_sun_position_simple(latitude: float, longitude: float, time: datetime) -> tuple:
    """Simple sun position calculation without external libraries.
    
    Uses simplified astronomical formulas for basic sun position.
    Not as accurate as pvlib but sufficient for testing.
    """
    # Day of year
    day_of_year = time.timetuple().tm_yday
    
    # Hour of day in decimal
    hour = time.hour + time.minute / 60.0 + time.second / 3600.0
    
    # Solar declination (simplified)
    declination = 23.45 * np.sin(np.radians(360 * (284 + day_of_year) / 365))
    
    # Hour angle
    hour_angle = 15 * (hour - 12)  # 15 degrees per hour from solar noon
    
    # Convert to radians
    lat_rad = np.radians(latitude)
    dec_rad = np.radians(declination)
    hour_rad = np.radians(hour_angle)
    
    # Solar elevation
    elevation = np.degrees(np.arcsin(
        np.sin(lat_rad) * np.sin(dec_rad) + 
        np.cos(lat_rad) * np.cos(dec_rad) * np.cos(hour_rad)
    ))
    
    # Solar azimuth (simplified)
    azimuth = np.degrees(np.arctan2(
        np.sin(hour_rad),
        np.cos(hour_rad) * np.sin(lat_rad) - np.tan(dec_rad) * np.cos(lat_rad)
    ))
    
    # Adjust azimuth to 0-360 range
    if azimuth < 0:
        azimuth += 360
    
    # Adjust for longitude (very simplified)
    azimuth = (azimuth + longitude / 15) % 360
    
    return azimuth, elevation


def calculate_sun_position_single(
    coordinate: Coordinate,
    time: datetime
) -> SunPosition:
    """Calculate sun position for a single point in time.
    
    Args:
        coordinate: Location coordinates
        time: Time (must have timezone)
        
    Returns:
        SunPosition object with azimuth and elevation
        
    Example:
        >>> coord = Coordinate(52.5200, 13.4050)
        >>> time = datetime(2023, 6, 21, 12, 0, tzinfo=pytz.UTC)
        >>> pos = calculate_sun_position_single(coord, time)
        >>> print(f"Sun at azimuth {pos.azimuth:.1f}°, elevation {pos.elevation:.1f}°")
    """
    _check_pvlib_available()
    
    time = _ensure_utc(time)
    
    # Create location object
    loc = location.Location(
        latitude=coordinate.latitude,
        longitude=coordinate.longitude,
        altitude=coordinate.ground_elevation,
        tz='UTC'
    )
    
    # Calculate position
    solar_pos = loc.get_solarposition(pd.DatetimeIndex([time], tz='UTC'))
    
    return SunPosition(
        azimuth=float(solar_pos['azimuth'].iloc[0]),
        elevation=float(solar_pos['apparent_elevation'].iloc[0]),
        timestamp=time
    )


def generate_sun_positions_with_irradiance(
    coordinate: Coordinate,
    start_time: datetime,
    end_time: datetime,
    time_resolution_minutes: int = 10,
    min_elevation: float = -90.0,
    model: str = 'ineichen'
) -> pd.DataFrame:
    """Generate sun positions with clear-sky irradiance values.
    
    Calculates sun positions and clear-sky irradiance (DNI, DHI, GHI)
    for the specified location and time range.
    
    Args:
        coordinate: Location coordinates with optional elevation
        start_time: Start time (must have timezone)
        end_time: End time (must have timezone)  
        time_resolution_minutes: Time step in minutes (1-60)
        min_elevation: Minimum sun elevation to include (degrees)
        model: Clear-sky model ('ineichen', 'haurwitz', 'simplified_solis')
        
    Returns:
        DataFrame with sun positions and irradiance columns:
        - All columns from generate_sun_positions()
        - dni: Direct Normal Irradiance (W/m²)
        - dhi: Diffuse Horizontal Irradiance (W/m²)
        - ghi: Global Horizontal Irradiance (W/m²)
        - air_mass: Relative air mass
        
    Example:
        >>> coord = Coordinate(52.5200, 13.4050, 34.0)
        >>> time = datetime(2023, 6, 21, 12, 0, tzinfo=pytz.UTC)
        >>> df = generate_sun_positions_with_irradiance(
        ...     coord, time, time + timedelta(hours=1), 60
        ... )
        >>> print(f"DNI: {df['dni'].iloc[0]:.0f} W/m²")
        DNI: 867 W/m²
    """
    _check_pvlib_available()
    
    # Get sun positions first
    sun_df = generate_sun_positions(
        coordinate, start_time, end_time, time_resolution_minutes, min_elevation
    )
    
    if len(sun_df) == 0:
        # No sun above minimum elevation
        sun_df['dni'] = 0.0
        sun_df['dhi'] = 0.0
        sun_df['ghi'] = 0.0
        sun_df['air_mass'] = np.nan
        return sun_df
    
    # Create location object
    loc = location.Location(
        latitude=coordinate.latitude,
        longitude=coordinate.longitude,
        altitude=coordinate.ground_elevation,
        tz='UTC'
    )
    
    # Calculate clear-sky irradiance
    clearsky = loc.get_clearsky(sun_df.index, model=model)
    
    # Calculate air mass
    air_mass = atmosphere.get_relative_airmass(sun_df['apparent_zenith'])
    
    # Add irradiance columns
    sun_df['dni'] = clearsky['dni'].round(2)
    sun_df['dhi'] = clearsky['dhi'].round(2)  
    sun_df['ghi'] = clearsky['ghi'].round(2)
    sun_df['air_mass'] = air_mass.round(3)
    
    # Set irradiance to 0 when sun is below horizon
    below_horizon = sun_df['apparent_elevation'] <= 0
    sun_df.loc[below_horizon, ['dni', 'dhi', 'ghi']] = 0
    
    return sun_df


def calculate_sunrise_sunset(
    coordinate: Coordinate,
    date: date,
    horizon_elevation: float = 0.0
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Calculate sunrise and sunset times for a given date.
    
    Args:
        coordinate: Location coordinates
        date: Date to calculate for
        horizon_elevation: Elevation of horizon in degrees (default 0)
        
    Returns:
        Tuple of (sunrise, sunset) as UTC datetimes
        Returns (None, None) if sun doesn't rise or set (polar regions)
        
    Example:
        >>> coord = Coordinate(52.5200, 13.4050)
        >>> sunrise, sunset = calculate_sunrise_sunset(coord, date(2023, 6, 21))
        >>> print(f"Sunrise: {sunrise.strftime('%H:%M')} UTC")
        Sunrise: 02:43 UTC
    """
    _check_pvlib_available()
    
    # Create datetime at midnight UTC
    dt = datetime.combine(date, datetime.min.time()).replace(tzinfo=pytz.UTC)
    
    # Generate positions for the whole day
    sun_df = generate_sun_positions(
        coordinate,
        dt,
        dt + timedelta(days=1),
        time_resolution_minutes=1,  # 1-minute resolution for accuracy
        min_elevation=-90
    )
    
    if len(sun_df) == 0:
        return None, None
    
    # Find transitions across horizon
    above_horizon = sun_df['apparent_elevation'] > horizon_elevation
    
    # Check for polar day/night
    if above_horizon.all():
        # Sun never sets
        return None, None
    elif not above_horizon.any():
        # Sun never rises
        return None, None
    
    # Find transitions
    transitions = above_horizon != above_horizon.shift(1)
    transition_times = sun_df.index[transitions]
    
    if len(transition_times) < 2:
        # Unusual case - maybe sun just touches horizon
        return None, None
    
    # First transition should be sunrise, second sunset
    # But verify by checking which way the transition goes
    sunrise = None
    sunset = None
    
    for i, time in enumerate(transition_times):
        if i < len(above_horizon) - 1:
            if not above_horizon.iloc[i-1] and above_horizon.iloc[i]:
                sunrise = time
            elif above_horizon.iloc[i-1] and not above_horizon.iloc[i]:
                sunset = time
    
    return sunrise, sunset


def calculate_solar_noon(
    coordinate: Coordinate,
    date: date
) -> Tuple[datetime, float]:
    """Calculate solar noon time and maximum elevation.
    
    Solar noon is when the sun reaches its highest point in the sky.
    
    Args:
        coordinate: Location coordinates
        date: Date to calculate for
        
    Returns:
        Tuple of (solar_noon_time, max_elevation)
        
    Example:
        >>> coord = Coordinate(52.5200, 13.4050)
        >>> noon, max_el = calculate_solar_noon(coord, date(2023, 6, 21))
        >>> print(f"Solar noon at {noon.strftime('%H:%M')} UTC, max elevation {max_el:.1f}°")
        Solar noon at 11:49 UTC, max elevation 60.9°
    """
    _check_pvlib_available()
    
    # Create datetime at midnight UTC
    dt = datetime.combine(date, datetime.min.time()).replace(tzinfo=pytz.UTC)
    
    # Generate positions for the whole day with fine resolution around noon
    sun_df = generate_sun_positions(
        coordinate,
        dt + timedelta(hours=10),  # Start at 10:00 UTC
        dt + timedelta(hours=14),  # End at 14:00 UTC
        time_resolution_minutes=1,  # 1-minute resolution
        min_elevation=-90
    )
    
    if len(sun_df) == 0:
        # Sun never rises high enough
        # Do full day calculation
        sun_df = generate_sun_positions(
            coordinate, dt, dt + timedelta(days=1), 1, -90
        )
    
    # Find maximum elevation
    max_idx = sun_df['apparent_elevation'].idxmax()
    max_elevation = sun_df.loc[max_idx, 'apparent_elevation']
    
    return max_idx.to_pydatetime(), float(max_elevation)


def filter_sun_positions_by_time(
    sun_df: pd.DataFrame,
    start_hour: int,
    end_hour: int
) -> pd.DataFrame:
    """Filter sun positions DataFrame by hour of day.
    
    Args:
        sun_df: DataFrame from generate_sun_positions()
        start_hour: Start hour (0-23)
        end_hour: End hour (0-23)
        
    Returns:
        Filtered DataFrame
        
    Example:
        >>> # Keep only positions between 9 AM and 5 PM
        >>> filtered = filter_sun_positions_by_time(sun_df, 9, 17)
    """
    if start_hour < 0 or start_hour > 23:
        raise ValueError("Start hour must be between 0 and 23")
    if end_hour < 0 or end_hour > 23:
        raise ValueError("End hour must be between 0 and 23")
    
    # Extract hour from index
    hours = sun_df.index.hour
    
    if start_hour <= end_hour:
        # Normal case: e.g., 9 to 17
        mask = (hours >= start_hour) & (hours <= end_hour)
    else:
        # Wrap around midnight: e.g., 22 to 2
        mask = (hours >= start_hour) | (hours <= end_hour)
    
    return sun_df[mask]


def calculate_yearly_sun_statistics(
    coordinate: Coordinate,
    year: int,
    min_elevation: float = 0.0
) -> Dict[str, Any]:
    """Calculate yearly sun statistics for a location.
    
    Args:
        coordinate: Location coordinates
        year: Year to calculate for
        min_elevation: Minimum elevation to consider
        
    Returns:
        Dictionary with statistics:
        - total_sun_hours: Total hours sun is above min_elevation
        - max_elevation: Maximum elevation reached during year
        - max_elevation_date: Date of maximum elevation
        - sunrise_times: Dict of month -> average sunrise time
        - sunset_times: Dict of month -> average sunset time
        
    Example:
        >>> coord = Coordinate(52.5200, 13.4050)
        >>> stats = calculate_yearly_sun_statistics(coord, 2023)
        >>> print(f"Total sun hours: {stats['total_sun_hours']:.0f}")
        Total sun hours: 4476
    """
    _check_pvlib_available()
    
    start_time = datetime(year, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    end_time = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    
    # Generate hourly positions for the year
    logger.info(f"Calculating yearly sun statistics for {year}")
    sun_df = generate_sun_positions(
        coordinate,
        start_time,
        end_time,
        time_resolution_minutes=60,
        min_elevation=min_elevation
    )
    
    # Calculate statistics
    stats = {
        'total_sun_hours': len(sun_df),
        'max_elevation': sun_df['apparent_elevation'].max(),
        'max_elevation_date': sun_df['apparent_elevation'].idxmax().date(),
        'sunrise_times': {},
        'sunset_times': {}
    }
    
    # Calculate monthly average sunrise/sunset
    for month in range(1, 13):
        month_dates = pd.date_range(
            start=datetime(year, month, 1),
            end=datetime(year, month, 1) + pd.DateOffset(months=1) - pd.DateOffset(days=1),
            freq='D'
        )
        
        sunrise_times = []
        sunset_times = []
        
        for date in month_dates:
            sunrise, sunset = calculate_sunrise_sunset(coordinate, date.date())
            if sunrise and sunset:
                sunrise_times.append(sunrise.hour + sunrise.minute / 60)
                sunset_times.append(sunset.hour + sunset.minute / 60)
        
        if sunrise_times:
            avg_sunrise = np.mean(sunrise_times)
            avg_sunset = np.mean(sunset_times)
            stats['sunrise_times'][month] = f"{int(avg_sunrise):02d}:{int((avg_sunrise % 1) * 60):02d}"
            stats['sunset_times'][month] = f"{int(avg_sunset):02d}:{int((avg_sunset % 1) * 60):02d}"
        else:
            stats['sunrise_times'][month] = "N/A"
            stats['sunset_times'][month] = "N/A"
    
    return stats


# Compatibility function to match old API
def generate_sun_df(
    lat: float,
    lon: float, 
    ground_elevation: float,
    timestamp: int,
    resolution: str = "1min",
    sun_elevation_threshold: float = 0
) -> pd.DataFrame:
    """Generate sun position DataFrame (compatibility function).
    
    This function maintains compatibility with the old API while using
    the new implementation.
    
    Args:
        lat: Latitude in degrees
        lon: Longitude in degrees  
        ground_elevation: Elevation in meters
        timestamp: Unix timestamp
        resolution: Time resolution (e.g., "1min", "10min")
        sun_elevation_threshold: Minimum sun elevation
        
    Returns:
        DataFrame with sun positions and irradiance
    """
    # Parse resolution
    res_match = pd.Timedelta(resolution).total_seconds() / 60
    res_minutes = int(res_match)
    
    # Convert timestamp to datetime
    dt = datetime.fromtimestamp(timestamp, tz=pytz.UTC)
    
    # Create time range for the year
    year_start = dt.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    year_end = year_start.replace(year=year_start.year + 1)
    
    # Create coordinate
    coord = Coordinate(latitude=lat, longitude=lon, ground_elevation=ground_elevation)
    
    # Generate positions with irradiance
    df = generate_sun_positions_with_irradiance(
        coordinate=coord,
        start_time=year_start,
        end_time=year_end,
        time_resolution_minutes=res_minutes,
        min_elevation=sun_elevation_threshold
    )
    
    # Rename columns to match old API
    df = df.rename(columns={
        'apparent_elevation': 'elevation'
    })
    
    # Add timestamp column
    df['timestamp'] = df.index
    
    return df