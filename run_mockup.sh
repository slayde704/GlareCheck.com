#!/bin/bash
# Start the mockup app

echo "🚀 Starting Glare Simulation Mockup App..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt
pip install -r mockup_app/requirements.txt

# Start the app
echo "Starting Flask app on http://localhost:5000"
cd mockup_app
python app.py