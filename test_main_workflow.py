#!/usr/bin/env python3
"""Comprehensive tests for main workflow module."""

import sys
import json
import tempfile
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def test_input_validation():
    """Test input validation component."""
    print("Testing input validation...")
    
    from src.workflow import InputValidator
    
    validator = InputValidator()
    
    # Test valid data
    valid_data = {
        "pv_areas": [
            {
                "name": "TestArea1",
                "corners": [
                    {"latitude": 48.1234, "longitude": 11.5678, "ground_elevation": 500.0},
                    {"latitude": 48.1244, "longitude": 11.5678, "ground_elevation": 500.0},
                    {"latitude": 48.1244, "longitude": 11.5688, "ground_elevation": 500.0},
                    {"latitude": 48.1234, "longitude": 11.5688, "ground_elevation": 500.0}
                ],
                "azimuth": 180.0,
                "tilt": 30.0,
                "module_type": 1
            }
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
            "project_name": "Test Solar Installation",
            "language": "en"
        },
        "simulation_parameter": {
            "grid_width": 1.0,
            "resolution": "60min",
            "sun_elevation_threshold": 3.0,
            "intensity_threshold": 30000.0,
            "module_type": 1
        }
    }
    
    # Test valid data
    assert validator.validate(valid_data), f"Valid data failed validation: {validator.errors}"
    print("✓ Valid data passes validation")
    
    # Test missing required key
    invalid_data = valid_data.copy()
    del invalid_data["pv_areas"]
    assert not validator.validate(invalid_data), "Missing required key should fail validation"
    assert "Missing required key: pv_areas" in validator.errors
    print("✓ Missing required key correctly rejected")
    
    # Test invalid coordinates
    invalid_coords = valid_data.copy()
    invalid_coords["pv_areas"][0]["corners"][0]["latitude"] = 95.0  # Invalid latitude
    assert not validator.validate(invalid_coords), "Invalid coordinates should fail validation"
    print("✓ Invalid coordinates correctly rejected")
    
    print("✓ Input validation tests passed\n")


def test_data_processing():
    """Test data processing component."""
    print("Testing data processing...")
    
    from src.workflow import DataProcessor
    from src.config import Config
    
    config = Config()
    processor = DataProcessor(config)
    
    # Test data
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
                "azimuth": 180.0,
                "tilt": 30.0,
                "module_type": 1
            }
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
            "project_name": "Test Solar Installation",
            "language": "en"
        },
        "simulation_parameter": {
            "grid_width": 1.0,
            "resolution": "60min",
            "sun_elevation_threshold": 3.0,
            "intensity_threshold": 30000.0,
            "module_type": 1
        }
    }
    
    # Process data
    processed = processor.process(test_data)
    
    # Verify processing results
    assert len(processed.pv_areas) == 1, f"Expected 1 PV area, got {len(processed.pv_areas)}"
    assert len(processed.observation_points) == 1, f"Expected 1 observation point, got {len(processed.observation_points)}"
    assert processed.simulation_params.grid_width == 1.0, "Grid width not preserved"
    assert processed.simulation_params.resolution_minutes == 60, "Resolution not converted correctly"
    assert processed.metadata["project_name"] == "Test Solar Installation", "Metadata not preserved"
    
    # Verify PV area structure
    pv_area = processed.pv_areas[0]
    assert pv_area.name == "TestArea1", "PV area name not preserved"
    assert pv_area.azimuth == 180.0, "PV area azimuth not preserved"
    assert pv_area.tilt == 30.0, "PV area tilt not preserved"
    assert len(pv_area.coordinates) == 4, "PV area coordinates not preserved"
    
    # Verify observation point structure
    op = processed.observation_points[0]
    assert op.name == "TestOP1", "Observation point name not preserved"
    assert op.coordinate.latitude == 48.1200, "Observation point latitude not preserved"
    assert op.coordinate.longitude == 11.5650, "Observation point longitude not preserved"
    
    print("✓ Data processing tests passed\n")


def test_workflow_integration():
    """Test complete workflow integration."""
    print("Testing workflow integration...")
    
    from src.main import calculate_glare
    
    # Test data
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
                "azimuth": 180.0,
                "tilt": 30.0,
                "module_type": 1
            }
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
            "project_name": "Test Solar Installation",
            "language": "en"
        },
        "simulation_parameter": {
            "grid_width": 2.0,  # Larger grid for faster testing
            "resolution": "60min",  # Lower resolution for faster testing
            "sun_elevation_threshold": 3.0,
            "intensity_threshold": 30000.0,
            "module_type": 1
        }
    }
    
    # Test JSON string input
    json_data = json.dumps(test_data)
    result = calculate_glare(json_data)
    
    # Verify result structure
    assert result["status"] == "success", f"Expected success, got: {result.get('message', 'unknown error')}"
    assert "execution_time" in result, "Execution time not reported"
    assert "output_paths" in result, "Output paths not reported"
    assert "statistics" in result, "Statistics not reported"
    assert "metadata" in result, "Metadata not reported"
    
    # Verify metadata
    metadata = result["metadata"]
    assert "analysis_timestamp" in metadata, "Analysis timestamp not reported"
    assert "version" in metadata, "Version not reported"
    assert "input_summary" in metadata, "Input summary not reported"
    
    input_summary = metadata["input_summary"]
    assert input_summary["pv_areas"] == 1, "PV area count incorrect"
    assert input_summary["observation_points"] == 1, "Observation point count incorrect"
    
    print("✓ Workflow integration tests passed\n")


def test_error_handling():
    """Test error handling in workflow."""
    print("Testing error handling...")
    
    from src.main import calculate_glare
    
    # Test invalid JSON
    result = calculate_glare("invalid json")
    assert result["status"] == "error", "Invalid JSON should return error status"
    assert "Invalid JSON" in result["message"], "Error message should mention JSON"
    
    # Test missing required data
    incomplete_data = {"pv_areas": []}
    result = calculate_glare(incomplete_data)
    assert result["status"] == "error", "Incomplete data should return error status"
    assert "validation failed" in result["message"].lower(), "Error message should mention validation"
    
    print("✓ Error handling tests passed\n")


def test_test_function():
    """Test the built-in test function."""
    print("Testing built-in test function...")
    
    from src.main import test
    
    # Run the test function
    result = test()
    
    # Verify it completes successfully
    assert result["status"] == "success", f"Test function failed: {result.get('message', 'unknown error')}"
    assert result["execution_time"] > 0, "Execution time should be positive"
    
    print("✓ Built-in test function passed\n")


def run_all_tests():
    """Run all workflow tests."""
    print("Running comprehensive main workflow tests...\n")
    
    try:
        test_input_validation()
        test_data_processing()
        test_workflow_integration()
        test_error_handling()
        test_test_function()
        
        print("✅ All main workflow tests passed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)