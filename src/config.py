"""Central configuration for the Glare Analysis System."""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
import json


@dataclass
class Config:
    """Central configuration class for the application."""
    
    # Paths
    BASE_DIR: Path = field(default_factory=lambda: Path(__file__).parent.parent)
    ASSETS_DIR: Path = field(init=False)
    OUTPUT_DIR: Path = field(init=False)
    LOG_DIR: Path = field(init=False)
    
    # Simulation parameters
    DEFAULT_GRID_WIDTH: float = 1.0
    DEFAULT_SUN_RESOLUTION_MIN: int = 10
    DEFAULT_GLARE_THRESHOLD: float = 30000.0  # cd/m²
    DEFAULT_MODULE_TYPE: int = 1
    
    # Calculation parameters
    MAX_CALCULATION_DISTANCE_M: float = 10000.0
    MIN_SUN_ELEVATION_DEG: float = 0.0
    REFLECTION_ANGLE_TOLERANCE_DEG: float = 1.0
    
    # Performance settings
    USE_MULTIPROCESSING: bool = True
    MAX_WORKERS: Optional[int] = None  # None = use all available cores
    CHUNK_SIZE: int = 1000  # For batch processing
    
    # Visualization settings
    DPI: int = 150
    FIGURE_SIZE: tuple = (10, 8)
    COLORMAP: str = "viridis"
    BLUR_RADIUS: int = 5
    
    # Report settings
    REPORT_LANGUAGE: str = "en"
    REPORT_TYPE: str = "full"  # Can be 'full' or 'free'
    INCLUDE_TECHNICAL_DETAILS: bool = True
    COMPANY_NAME: str = "GlareCheck"
    COMPANY_LOGO: Optional[Path] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE_MAX_BYTES: int = 10 * 1024 * 1024  # 10 MB
    LOG_FILE_BACKUP_COUNT: int = 5
    
    def __post_init__(self):
        """Initialize computed fields after dataclass initialization."""
        self.ASSETS_DIR = self.BASE_DIR / "assets"
        self.OUTPUT_DIR = self.BASE_DIR / "output"
        self.LOG_DIR = self.BASE_DIR / "log"
        
        # Create directories if they don't exist
        for directory in [self.OUTPUT_DIR, self.LOG_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
            
        # Set company logo if exists
        logo_path = self.ASSETS_DIR / "logo.png"
        if logo_path.exists():
            self.COMPANY_LOGO = logo_path
    
    @property
    def language(self) -> str:
        """Get language for backward compatibility."""
        return self.REPORT_LANGUAGE
    
    @property
    def report_type(self) -> str:
        """Get report type for backward compatibility."""
        return self.REPORT_TYPE
    
    @classmethod
    def from_json(cls, json_path: Path) -> "Config":
        """Load configuration from JSON file.
        
        Args:
            json_path: Path to JSON configuration file.
            
        Returns:
            Config instance with values from JSON file.
        """
        with open(json_path, 'r') as f:
            data = json.load(f)
        return cls(**data)
    
    @classmethod
    def from_env(cls) -> "Config":
        """Load configuration from environment variables.
        
        Environment variables should be prefixed with GLARE_.
        For example: GLARE_LOG_LEVEL, GLARE_DPI, etc.
        
        Returns:
            Config instance with values from environment.
        """
        kwargs = {}
        prefix = "GLARE_"
        
        for key in cls.__dataclass_fields__:
            env_key = f"{prefix}{key}"
            if env_key in os.environ:
                field_type = cls.__dataclass_fields__[key].type
                value = os.environ[env_key]
                
                # Type conversion
                if field_type == bool:
                    kwargs[key] = value.lower() in ('true', '1', 'yes')
                elif field_type == int:
                    kwargs[key] = int(value)
                elif field_type == float:
                    kwargs[key] = float(value)
                elif field_type == Path:
                    kwargs[key] = Path(value)
                else:
                    kwargs[key] = value
                    
        return cls(**kwargs)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary.
        
        Returns:
            Dictionary representation of configuration.
        """
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, Path):
                result[key] = str(value)
            else:
                result[key] = value
        return result
    
    def validate(self) -> None:
        """Validate configuration values.
        
        Raises:
            ValueError: If any configuration value is invalid.
        """
        if self.DEFAULT_GRID_WIDTH <= 0:
            raise ValueError("DEFAULT_GRID_WIDTH must be positive")
            
        if self.DEFAULT_SUN_RESOLUTION_MIN <= 0:
            raise ValueError("DEFAULT_SUN_RESOLUTION_MIN must be positive")
            
        if self.DEFAULT_GLARE_THRESHOLD <= 0:
            raise ValueError("DEFAULT_GLARE_THRESHOLD must be positive")
            
        if self.DPI <= 0:
            raise ValueError("DPI must be positive")
            
        if self.LOG_LEVEL not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            raise ValueError(f"Invalid LOG_LEVEL: {self.LOG_LEVEL}")
            
        if not self.ASSETS_DIR.exists():
            raise ValueError(f"ASSETS_DIR does not exist: {self.ASSETS_DIR}")


# Global configuration instance
config = Config()

# Allow configuration from environment or file
CONFIG_FILE = os.environ.get("GLARE_CONFIG_FILE")
if CONFIG_FILE and Path(CONFIG_FILE).exists():
    config = Config.from_json(Path(CONFIG_FILE))
elif any(key.startswith("GLARE_") for key in os.environ):
    config = Config.from_env()

# Validate configuration
config.validate()