"""
Mockup App für Glare Simulation Tool
Mit Google Maps Integration zum Erstellen von Simulationsrequests
"""

from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Import configuration
try:
    from config import GOOGLE_MAPS_API_KEY
except ImportError:
    # Fallback if config.py doesn't exist
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from src.main import calculate_glare

app = Flask(__name__)

# Store current project data
current_project = {
    "pv_areas": [],
    "observation_points": [],
    "simulation_params": {
        "grid_width": 0.5,
        "resolution": 1,
        "glare_threshold": 50000
    }
}

@app.route('/')
def index():
    """Main page with Google Maps"""
    # Use the original index.html with all features
    return render_template('index.html', 
                         google_maps_api_key=GOOGLE_MAPS_API_KEY)

@app.route('/modular')
def index_modular():
    """Modular version for testing"""
    return render_template('index_modular.html',
                         google_maps_api_key=GOOGLE_MAPS_API_KEY)

@app.route('/logos/<path:filename>')
def serve_logo(filename):
    """Serve logo files"""
    logos_dir = os.path.join(app.root_path, 'logos')
    return send_from_directory(logos_dir, filename)

@app.route('/api/pv_area', methods=['POST'])
def add_pv_area():
    """Add a PV area from map drawing"""
    data = request.json
    
    pv_area = {
        "id": len(current_project["pv_areas"]) + 1,
        "name": data.get("name", f"PV Area {len(current_project['pv_areas']) + 1}"),
        "corners": data["corners"],
        "azimuth": data.get("azimuth", 180),
        "tilt": data.get("tilt", 30),
        "type": data.get("type", "tilted")  # tilted, vertical, or field
    }
    
    current_project["pv_areas"].append(pv_area)
    return jsonify({"success": True, "pv_area": pv_area})

@app.route('/api/observation_point', methods=['POST'])
def add_observation_point():
    """Add an observation point"""
    data = request.json
    
    op = {
        "id": len(current_project["observation_points"]) + 1,
        "name": data.get("name", f"OP {len(current_project['observation_points']) + 1}"),
        "latitude": data["latitude"],
        "longitude": data["longitude"],
        "height_observer": data.get("height_observer", 1.5),
        "height_object": data.get("height_object", 10.0)
    }
    
    current_project["observation_points"].append(op)
    return jsonify({"success": True, "observation_point": op})

@app.route('/api/clear', methods=['POST'])
def clear_project():
    """Clear current project"""
    current_project["pv_areas"] = []
    current_project["observation_points"] = []
    return jsonify({"success": True})

@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    """Run the glare simulation"""
    try:
        # Convert to required format
        simulation_data = {
            "pv_areas": [],
            "list_of_pv_area_information": [],
            "list_of_ops": [],
            "meta_data": {
                "project_name": "Mockup Simulation",
                "created_at": datetime.now().isoformat()
            },
            "simulation_parameter": {
                "grid_width": current_project["simulation_params"]["grid_width"],
                "resolution": current_project["simulation_params"]["resolution"],
                "glare_threshold": current_project["simulation_params"]["glare_threshold"]
            }
        }
        
        # Convert PV areas
        for pv in current_project["pv_areas"]:
            simulation_data["pv_areas"].append({
                "name": pv["name"],
                "corners": pv["corners"]
            })
            simulation_data["list_of_pv_area_information"].append({
                "azimuth": pv["azimuth"],
                "tilt": pv["tilt"],
                "module_type": 0
            })
        
        # Convert observation points
        for op in current_project["observation_points"]:
            simulation_data["list_of_ops"].append({
                "name": op["name"],
                "latitude": op["latitude"],
                "longitude": op["longitude"],
                "height_observer": op["height_observer"],
                "height_object": op["height_object"]
            })
        
        # Run simulation
        result = calculate_glare(json.dumps(simulation_data))
        
        return jsonify({
            "success": True,
            "message": "Simulation completed successfully",
            "output_dir": "output"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/export', methods=['GET'])
def export_json():
    """Export current project as JSON"""
    # Convert to simulation format
    export_data = {
        "pv_areas": [],
        "list_of_pv_area_information": [],
        "list_of_ops": [],
        "meta_data": {
            "project_name": "Mockup Export",
            "created_at": datetime.now().isoformat()
        },
        "simulation_parameter": current_project["simulation_params"]
    }
    
    # Convert PV areas
    for pv in current_project["pv_areas"]:
        export_data["pv_areas"].append({
            "name": pv["name"],
            "corners": pv["corners"]
        })
        export_data["list_of_pv_area_information"].append({
            "azimuth": pv["azimuth"],
            "tilt": pv["tilt"],
            "module_type": 0
        })
    
    # Convert observation points
    for op in current_project["observation_points"]:
        export_data["list_of_ops"].append({
            "name": op["name"],
            "latitude": op["latitude"],
            "longitude": op["longitude"],
            "height_observer": op["height_observer"],
            "height_object": op["height_object"]
        })
    
    return jsonify(export_data)

@app.route('/api/project', methods=['GET'])
def get_project():
    """Get current project data"""
    return jsonify(current_project)

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get runtime configuration"""
    # Return empty config for now, can be extended later
    return jsonify({})

@app.route('/api/state', methods=['GET'])
def get_state():
    """Get saved application state"""
    # For now, return empty state
    return jsonify({
        "pvAreas": [],
        "observationPoints": [],
        "moduleTypes": [
            {
                "id": 1,
                "name": "Standardmodul",
                "beamSpread": 0.5,
                "reflectionProfile": {
                    "0": 70000.00,
                    "10": 70000.00,
                    "20": 71000.00,
                    "30": 79000.00,
                    "40": 120000.00,
                    "50": 280000.00,
                    "60": 930000.00,
                    "70": 3900000.00,
                    "80": 16134855.82,
                    "90": 58377635.77
                }
            },
            {
                "id": 2,
                "name": "Phytonics Anti Glare",
                "beamSpread": 40,
                "reflectionProfile": {
                    "0": 2800.00,
                    "10": 2900.00,
                    "20": 3200.00,
                    "30": 3900.00,
                    "40": 5400.00,
                    "50": 9500.00,
                    "60": 21000.00,
                    "70": 65000.00,
                    "80": 180000.00,
                    "90": 510000.00
                }
            }
        ]
    })

@app.route('/api/state', methods=['POST'])
def save_state():
    """Save application state"""
    # For now, just return success
    return jsonify({"success": True})

@app.route('/api/module_types', methods=['GET'])
def get_module_types():
    """Get available module types"""
    # Return default module types
    return jsonify([
        {
            "id": 0,
            "name": "Standard Modul",
            "manufacturer": "Generic",
            "model": "Standard",
            "reflectionProfile": {
                "0": 70000, "10": 70000, "20": 71000, "30": 79000, "40": 120000,
                "50": 280000, "60": 930000, "70": 3900000, "80": 16134855, "90": 58377635
            }
        },
        {
            "id": 1,
            "name": "Anti-Reflex Modul",
            "manufacturer": "Phytonics",
            "model": "Anti-Glare",
            "reflectionProfile": {
                "0": 2800, "10": 2900, "20": 3200, "30": 3900, "40": 5400,
                "50": 9500, "60": 21000, "70": 65000, "80": 180000, "90": 510000
            }
        },
        {
            "id": 2,
            "name": "Strukturglas Modul",
            "manufacturer": "Generic",
            "model": "Textured",
            "reflectionProfile": {
                "0": 8000, "10": 8000, "20": 8000, "30": 8000, "40": 12000,
                "50": 16000, "60": 20000, "70": 24000, "80": 28000, "90": 32000
            }
        }
    ])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)