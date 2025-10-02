"""Main entry point for glare analysis.

This module provides the primary calculate_glare() function that orchestrates
the complete glare analysis workflow.
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Union, Optional

from .config import Config
from .core.models import (
    PVArea, ObservationPoint, Coordinate, SimulationParameters
)
from .workflow.pipeline import GlareAnalysisWorkflow
from .workflow.validator import InputValidator
from .workflow.data_processor import DataProcessor

# Setup logging
logger = logging.getLogger(__name__)

# Version information
__version__ = "1.0.0"


def calculate_glare(
    input_data: Union[str, Dict[str, Any]], 
    config: Optional[Config] = None
) -> Dict[str, Any]:
    """
    Calculate glare from solar PV installations.
    
    This is the main entry point that matches the original API while using
    the refactored modular architecture underneath.
    
    Args:
        input_data: JSON string or dictionary containing:
            - pv_areas: List of PV area definitions
            - list_of_ops: List of observation points
            - meta_data: Project metadata
            - simulation_parameter: Analysis parameters
        config: Optional configuration override
        
    Returns:
        Dictionary containing:
            - status: 'success' or 'error'
            - message: Status message
            - execution_time: Processing time in seconds
            - output_paths: Dictionary of generated file paths
            - statistics: Summary statistics
            - metadata: Analysis metadata
            
    Example:
        >>> with open('project.json') as f:
        ...     data = json.load(f)
        >>> result = calculate_glare(data)
        >>> print(f"Status: {result['status']}")
        >>> print(f"Excel report: {result['output_paths']['excel_report']}")
    """
    start_time = time.time()
    
    try:
        # Setup configuration
        if config is None:
            config = Config()
        
        # Setup logging
        _setup_logging(config)
        
        logger.info(f"Starting glare analysis v{__version__}")
        logger.info(f"Configuration: {config}")
        
        # Parse input data
        if isinstance(input_data, str):
            try:
                input_data = json.loads(input_data)
            except json.JSONDecodeError as e:
                return _create_error_response(f"Invalid JSON input: {e}", start_time)
        
        # Validate input data
        validator = InputValidator()
        if not validator.validate(input_data):
            return _create_error_response(
                f"Input validation failed: {'; '.join(validator.errors)}", 
                start_time
            )
        
        logger.info("Input validation successful")
        
        # Process input data
        processor = DataProcessor(config)
        processed_data = processor.process(input_data)
        
        logger.info(f"Data processing complete: "
                   f"{len(processed_data.pv_areas)} PV areas, "
                   f"{len(processed_data.observation_points)} observation points")
        
        # Execute workflow
        workflow = GlareAnalysisWorkflow(config)
        results = workflow.execute(processed_data)
        
        execution_time = time.time() - start_time
        logger.info(f"Glare analysis completed successfully in {execution_time:.1f}s")
        
        # Create success response
        return {
            'status': 'success',
            'message': 'Glare analysis completed successfully',
            'execution_time': execution_time,
            'output_paths': results.output_paths,
            'statistics': results.statistics,
            'metadata': {
                'analysis_timestamp': datetime.now().isoformat(),
                'version': __version__,
                'processing_time': execution_time,
                'input_summary': {
                    'pv_areas': len(processed_data.pv_areas),
                    'observation_points': len(processed_data.observation_points),
                    'time_resolution': f"{processed_data.simulation_params.resolution_minutes}min",
                    'grid_width': processed_data.simulation_params.grid_width
                }
            }
        }
        
    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"Glare analysis failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        return _create_error_response(error_msg, start_time, execution_time)


def test() -> Dict[str, Any]:
    """
    Run a test simulation with hardcoded example data.
    
    This function provides a simple way to test the glare analysis
    with predefined data, similar to the original test() function.
    
    Returns:
        Dictionary with analysis results
    """
    logger.info("Running test simulation")
    
    # Create test data
    test_data = {
        "pv_areas": [
            {
                "name": "TestArea1",
                "corners": [
                    {"latitude": 48.1234, "longitude": 11.5678, "ground_elevation": 500.0},
                    {"latitude": 48.1244, "longitude": 11.5678, "ground_elevation": 500.0},
                    {"latitude": 48.1244, "longitude": 11.5688, "ground_elevation": 500.0},
                    {"latitude": 48.1234, "longitude": 11.5688, "ground_elevation": 500.0}
                ],
                "holes": [],
                "azimuth": 180.0,
                "tilt": 30.0,
                "module_type": 1
            }
        ],
        "list_of_pv_area_information": [
            {"azimuth": 180.0, "tilt": 30.0}
        ],
        "list_of_ops": [
            {
                "name": "TestOP1",
                "latitude": 48.1200,
                "longitude": 11.5650,
                "ground_elevation": 495.0,
                "height_above_ground": 2.0
            }
        ],
        "meta_data": {
            "user_id": "test_user",
            "project_id": "test_project", 
            "sim_id": "test_simulation",
            "project_name": "Test Solar Installation",
            "timestamp": int(datetime.now().timestamp()),
            "utc": 1.0,
            "language": "en"
        },
        "simulation_parameter": {
            "grid_width": 1.0,
            "resolution": "60min",  # Faster for testing
            "sun_elevation_threshold": 3.0,
            "beam_spread": 0.5,
            "sun_angle": 0.53,
            "sun_reflection_threshold": 2.0,
            "intensity_threshold": 30000.0,
            "module_type": 1
        }
    }
    
    # Run analysis
    return calculate_glare(test_data)


def _setup_logging(config: Config) -> None:
    """Setup logging configuration.
    
    Args:
        config: Configuration object
    """
    # Create log directory
    log_dir = config.BASE_DIR / 'log'
    log_dir.mkdir(exist_ok=True)
    
    # Configure logging
    log_file = log_dir / 'glare_simulation.log'
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_file, encoding='utf-8')
        ]
    )
    
    # Reduce verbosity of external libraries
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    logging.getLogger('PIL').setLevel(logging.WARNING)


def _create_error_response(
    error_message: str, 
    start_time: float, 
    execution_time: Optional[float] = None
) -> Dict[str, Any]:
    """Create standardized error response.
    
    Args:
        error_message: Error description
        start_time: Analysis start time
        execution_time: Optional execution time
        
    Returns:
        Error response dictionary
    """
    if execution_time is None:
        execution_time = time.time() - start_time
    
    return {
        'status': 'error',
        'message': error_message,
        'execution_time': execution_time,
        'output_paths': {},
        'statistics': {},
        'metadata': {
            'analysis_timestamp': datetime.now().isoformat(),
            'version': __version__,
            'processing_time': execution_time
        }
    }


# For backward compatibility and direct script execution
if __name__ == "__main__":
    # Run test if executed directly
    result = test()
    print(f"Test result: {result['status']}")
    if result['status'] == 'success':
        print(f"Execution time: {result['execution_time']:.1f}s")
        print(f"Output files: {len(result['output_paths'])} generated")
    else:
        print(f"Error: {result['message']}")