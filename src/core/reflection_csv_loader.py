"""CSV loader for reflection profiles with original format support."""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Union
import logging

from .reflection_base import ReflectionProfile, ReflectionError


logger = logging.getLogger(__name__)


def load_reflection_profiles_original_format(csv_path: Union[str, Path]) -> Dict[int, ReflectionProfile]:
    """Load reflection profiles from CSV file in original format.
    
    Expected CSV format:
    IA,Value,ModuleType
    0,2535.6,0
    10,1385.3,0
    ...
    
    Where:
    - IA: Incident Angle in degrees
    - Value: Reflection intensity value (not normalized)
    - ModuleType: 0, 1, or 2
    
    Args:
        csv_path: Path to CSV file with reflection data
        
    Returns:
        Dictionary mapping module type to ReflectionProfile
        
    Raises:
        ReflectionError: If file cannot be loaded or parsed
    """
    try:
        # Read CSV
        df = pd.read_csv(csv_path)
        
        # Validate columns
        required_columns = ['IA', 'Value', 'ModuleType']
        for col in required_columns:
            if col not in df.columns:
                raise ReflectionError(f"CSV must have '{col}' column")
        
        profiles = {}
        
        # Process each module type
        for module_type in df['ModuleType'].unique():
            # Filter data for this module type
            module_df = df[df['ModuleType'] == module_type].copy()
            
            # Sort by angle
            module_df = module_df.sort_values('IA')
            
            angles = module_df['IA'].values
            values = module_df['Value'].values
            
            # Normalize values to 0-1 range
            # The original values appear to be intensity values
            # We'll normalize by the maximum value for each module type
            if len(values) > 0 and values.max() > 0:
                # Normalize to 0-1 range
                coefficients = values / values.max()
            else:
                coefficients = values
            
            # Ensure coefficients are in valid range
            coefficients = np.clip(coefficients, 0, 1)
            
            profiles[module_type] = ReflectionProfile(
                angles.tolist(),
                coefficients.tolist(),
                int(module_type)
            )
            
            logger.info(
                f"Loaded reflection profile for module type {module_type}: "
                f"{len(angles)} angles, coeff range [{coefficients.min():.3f}, {coefficients.max():.3f}]"
            )
        
        if not profiles:
            raise ReflectionError("No valid module types found in CSV")
        
        # Validate we have the expected module types
        expected_types = [0, 1, 2]
        for mt in expected_types:
            if mt not in profiles:
                logger.warning(f"Module type {mt} not found in CSV")
        
        return profiles
        
    except Exception as e:
        raise ReflectionError(f"Failed to load reflection profiles: {e}")


def convert_to_standard_format(
    input_csv: Union[str, Path],
    output_csv: Union[str, Path]
) -> None:
    """Convert original format CSV to standard format.
    
    Converts from:
    IA,Value,ModuleType
    0,2535.6,0
    
    To:
    Incident Angle,Module Type 0,Module Type 1,Module Type 2
    0,0.162,1.000,0.185
    
    Args:
        input_csv: Path to original format CSV
        output_csv: Path to save standard format CSV
    """
    # Load profiles in original format
    profiles = load_reflection_profiles_original_format(input_csv)
    
    # Get all unique angles
    all_angles = set()
    for profile in profiles.values():
        all_angles.update(profile.angles)
    all_angles = sorted(all_angles)
    
    # Create DataFrame in new format
    data = {'Incident Angle': all_angles}
    
    for module_type in [0, 1, 2]:
        if module_type in profiles:
            # Get coefficients for all angles
            coeffs = [profiles[module_type].get_coefficient(angle) for angle in all_angles]
            data[f'Module Type {module_type}'] = coeffs
        else:
            # Fill with zeros if module type not found
            data[f'Module Type {module_type}'] = [0.0] * len(all_angles)
    
    # Save to CSV
    df = pd.DataFrame(data)
    df.to_csv(output_csv, index=False, float_format='%.3f')
    
    logger.info(f"Converted reflection profiles to standard format: {output_csv}")


# Update the main load function to handle both formats
def load_reflection_profiles_auto(csv_path: Union[str, Path]) -> Dict[int, ReflectionProfile]:
    """Load reflection profiles from CSV, auto-detecting format.
    
    Tries to detect whether the CSV is in original format (IA,Value,ModuleType)
    or standard format (Incident Angle,Module Type 0,Module Type 1,Module Type 2).
    
    Args:
        csv_path: Path to CSV file
        
    Returns:
        Dictionary mapping module type to ReflectionProfile
    """
    # Try to detect format by reading first line
    df = pd.read_csv(csv_path, nrows=1)
    
    if 'IA' in df.columns and 'Value' in df.columns and 'ModuleType' in df.columns:
        # Original format
        logger.info("Detected original CSV format")
        return load_reflection_profiles_original_format(csv_path)
    elif 'Incident Angle' in df.columns:
        # Standard format
        logger.info("Detected standard CSV format")
        return load_reflection_profiles_standard_format(csv_path)
    else:
        raise ReflectionError(
            "Unknown CSV format. Expected either "
            "'IA,Value,ModuleType' or 'Incident Angle,Module Type 0,Module Type 1,Module Type 2'"
        )


def load_reflection_profiles_standard_format(csv_path: Union[str, Path]) -> Dict[int, ReflectionProfile]:
    """Load reflection profiles from CSV file in standard format.
    
    Expected CSV format:
    Incident Angle,Module Type 0,Module Type 1,Module Type 2
    0,0.02,0.03,0.02
    10,0.02,0.03,0.02
    ...
    
    Args:
        csv_path: Path to CSV file with reflection data
        
    Returns:
        Dictionary mapping module type to ReflectionProfile
        
    Raises:
        ReflectionError: If file cannot be loaded or parsed
    """
    try:
        # Read CSV
        df = pd.read_csv(csv_path)
        
        # Validate columns
        if 'Incident Angle' not in df.columns:
            raise ReflectionError("CSV must have 'Incident Angle' column")
        
        profiles = {}
        
        # Extract profiles for each module type
        for module_type in [0, 1, 2]:
            col_name = f'Module Type {module_type}'
            if col_name in df.columns:
                angles = df['Incident Angle'].values
                coefficients = df[col_name].values
                
                # Validate data
                if np.any(coefficients < 0) or np.any(coefficients > 1):
                    logger.warning(f"Reflection coefficients for type {module_type} outside [0,1]")
                    coefficients = np.clip(coefficients, 0, 1)
                
                profiles[module_type] = ReflectionProfile(
                    angles.tolist(),
                    coefficients.tolist(),
                    module_type
                )
                
                logger.info(f"Loaded reflection profile for module type {module_type}")
        
        if not profiles:
            raise ReflectionError("No valid module types found in CSV")
        
        return profiles
        
    except Exception as e:
        raise ReflectionError(f"Failed to load reflection profiles: {e}")