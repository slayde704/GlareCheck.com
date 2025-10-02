"""Base classes for reflection module."""

import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)


class ReflectionError(Exception):
    """Exception raised for reflection calculation errors."""
    pass


class ReflectionProfile:
    """Container for module reflection characteristics.
    
    Stores and interpolates reflection coefficients based on incidence angle.
    This is a simplified version without scipy dependency for basic functionality.
    """
    
    def __init__(self, angles: List[float], coefficients: List[float], module_type: int):
        """Initialize reflection profile.
        
        Args:
            angles: List of incidence angles in degrees
            coefficients: List of reflection coefficients (0-1)
            module_type: Module type identifier (0, 1, or 2)
        """
        if len(angles) != len(coefficients):
            raise ValueError("Angles and coefficients must have same length")
        
        self.module_type = module_type
        self.angles = np.array(angles)
        self.coefficients = np.array(coefficients)
        
        # Sort by angles to ensure proper interpolation
        sort_idx = np.argsort(self.angles)
        self.angles = self.angles[sort_idx]
        self.coefficients = self.coefficients[sort_idx]
    
    def get_coefficient(self, angle: float) -> float:
        """Get reflection coefficient for given incidence angle.
        
        Uses linear interpolation between known values.
        
        Args:
            angle: Incidence angle in degrees
            
        Returns:
            Reflection coefficient (0-1)
        """
        # Ensure angle is in valid range
        angle = np.clip(angle, 0, 90)
        
        # Handle edge cases
        if angle <= self.angles[0]:
            return float(self.coefficients[0])
        if angle >= self.angles[-1]:
            return float(self.coefficients[-1])
        
        # Linear interpolation
        idx = np.searchsorted(self.angles, angle)
        x0, x1 = self.angles[idx-1], self.angles[idx]
        y0, y1 = self.coefficients[idx-1], self.coefficients[idx]
        
        # Interpolate
        t = (angle - x0) / (x1 - x0)
        coeff = y0 + t * (y1 - y0)
        
        return float(coeff)
    
    def __repr__(self) -> str:
        return f"ReflectionProfile(module_type={self.module_type}, angles={len(self.angles)})"