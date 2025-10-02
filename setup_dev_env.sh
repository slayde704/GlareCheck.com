#!/bin/bash
# Development Environment Setup Script

echo "Setting up development environment for Glare Analysis System..."

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed or not in PATH"
    exit 1
fi

echo "Python version: $(python3 --version)"

# Create virtual environment (skip if venv package not available)
if python3 -m venv --help &> /dev/null; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Virtual environment created and activated"
else
    echo "Warning: python3-venv not available. Using system Python."
    echo "To install: sudo apt install python3-venv (on Ubuntu/Debian)"
fi

# Install dependencies
echo "Installing dependencies..."
pip3 install -r requirements.txt
pip3 install -r requirements-dev.txt

# Create basic test file
echo "Creating test file..."
cat > tests/test_basic.py << 'EOF'
"""Basic tests to verify setup."""

def test_imports():
    """Test that basic imports work."""
    import sys
    import os
    
    # Add src to path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
    
    # Test imports
    from src.config import config
    assert config is not None
    
def test_config():
    """Test configuration loading."""
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
    
    from src.config import Config
    cfg = Config()
    assert cfg.DEFAULT_GRID_WIDTH > 0
    assert cfg.DPI > 0
EOF

echo "Running basic tests..."
python3 -m pytest tests/test_basic.py -v

echo "Setup completed!"
echo ""
echo "To activate the virtual environment (if created):"
echo "  source venv/bin/activate"
echo ""
echo "To run tests:"
echo "  python3 -m pytest"
echo ""
echo "To run with coverage:"
echo "  python3 -m pytest --cov=src"