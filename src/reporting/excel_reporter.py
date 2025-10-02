"""Excel report generation using xlsxwriter."""

import logging
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from .base import BaseReporter, ReportConfig, get_labels, format_number

logger = logging.getLogger(__name__)

# Try to import xlsxwriter
try:
    import xlsxwriter
    XLSXWRITER_AVAILABLE = True
except ImportError:
    XLSXWRITER_AVAILABLE = False
    logger.warning("xlsxwriter not available. Excel reports will be disabled.")


class ExcelReporter(BaseReporter):
    """Excel report generator using xlsxwriter."""
    
    def __init__(self, config: ReportConfig, output_dir: Path):
        """Initialize Excel reporter.
        
        Args:
            config: Report configuration
            output_dir: Output directory
        """
        super().__init__(config, output_dir)
        
        if not XLSXWRITER_AVAILABLE:
            logger.error("xlsxwriter not available. Cannot create Excel reports.")
    
    def generate_report(self, data: Dict[str, Any]) -> Optional[Path]:
        """Generate Excel report.
        
        Args:
            data: Report data dictionary containing:
                - metadata: Project metadata
                - glare_results: DataFrame with glare analysis results
                - simulation_parameters: Simulation parameters
                - statistics: Summary statistics
                
        Returns:
            Path to generated Excel file or None if failed
        """
        if not XLSXWRITER_AVAILABLE:
            logger.error("Cannot generate Excel report: xlsxwriter not available")
            return None
        
        if not self.validate_data(data):
            return None
        
        output_path = self.get_output_path('aggregated_glare_results.xlsx')
        
        try:
            # Create workbook
            workbook = xlsxwriter.Workbook(str(output_path))
            
            # Create formats
            formats = self._create_formats(workbook)
            
            # Create sheets
            self._create_documentation_sheet(workbook, data, formats)
            self._create_results_sheets(workbook, data, formats)
            self._create_summary_sheet(workbook, data, formats)
            
            # Close workbook
            workbook.close()
            
            logger.info(f"Excel report generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to generate Excel report: {e}")
            return None
    
    def _create_formats(self, workbook) -> Dict[str, Any]:
        """Create cell formats for the workbook.
        
        Args:
            workbook: xlsxwriter workbook object
            
        Returns:
            Dictionary of format objects
        """
        return {
            'header': workbook.add_format({
                'bold': True,
                'font_color': 'white',
                'bg_color': '#366092',
                'border': 1
            }),
            'subheader': workbook.add_format({
                'bold': True,
                'bg_color': '#E6F3FF',
                'border': 1
            }),
            'cell': workbook.add_format({
                'border': 1
            }),
            'number': workbook.add_format({
                'num_format': '#,##0.0',
                'border': 1
            }),
            'integer': workbook.add_format({
                'num_format': '#,##0',
                'border': 1
            }),
            'date': workbook.add_format({
                'num_format': 'yyyy-mm-dd hh:mm:ss',
                'border': 1
            }),
            'percentage': workbook.add_format({
                'num_format': '0.0%',
                'border': 1
            }),
            'title': workbook.add_format({
                'bold': True,
                'font_size': 14,
                'bg_color': '#D9E1F2'
            })
        }
    
    def _create_documentation_sheet(self, workbook, data: Dict[str, Any], formats: Dict) -> None:
        """Create documentation sheet with metadata and parameters.
        
        Args:
            workbook: xlsxwriter workbook object
            data: Report data
            formats: Format dictionary
        """
        worksheet = workbook.add_worksheet('Documentation')
        row = 0
        
        # Project metadata
        worksheet.write(row, 0, 'Project Metadata', formats['title'])
        row += 2
        
        metadata = data.get('metadata', {})
        meta_items = [
            ('User ID', metadata.get('user_id', 'N/A')),
            ('Project ID', metadata.get('project_id', 'N/A')),
            ('Simulation ID', metadata.get('sim_id', 'N/A')),
            ('Project Name', metadata.get('project_name', 'N/A')),
            ('Timestamp', str(datetime.fromtimestamp(metadata.get('timestamp', 0)))),
            ('UTC Offset', f"+{metadata.get('utc', 0)} hours"),
            ('Calculator', 'pv-glarecheck.com')
        ]
        
        worksheet.write(row, 0, 'Field', formats['header'])
        worksheet.write(row, 1, 'Value', formats['header'])
        row += 1
        
        for field, value in meta_items:
            worksheet.write(row, 0, field, formats['cell'])
            worksheet.write(row, 1, value, formats['cell'])
            row += 1
        
        row += 2
        
        # Simulation parameters
        worksheet.write(row, 0, 'Simulation Parameters', formats['title'])
        row += 2
        
        sim_params = data.get('simulation_parameters', {})
        param_items = [
            ('Grid Width', f"{sim_params.get('grid_width', 1.0)}°", 'Grid size used for simulation'),
            ('Resolution', sim_params.get('resolution', '10min'), 'Time resolution for simulation'),
            ('Sun Elevation Threshold', f"{sim_params.get('sun_elevation_threshold', 3.0)}°", 'Minimum sun elevation'),
            ('Beam Spread', f"{sim_params.get('beam_spread', 0.5)}°", 'Spread of reflected beam'),
            ('Sun Angle', f"{sim_params.get('sun_angle', 0.53)}°", 'Apparent sun diameter'),
            ('Intensity Threshold', f"{sim_params.get('intensity_threshold', 30000)} cd/m²", 'Minimum luminance threshold'),
            ('Module Type', str(sim_params.get('module_type', 1)), 'Module type identifier')
        ]
        
        headers = ['Parameter', 'Value', 'Description']
        for i, header in enumerate(headers):
            worksheet.write(row, i, header, formats['header'])
        row += 1
        
        for param, value, description in param_items:
            worksheet.write(row, 0, param, formats['cell'])
            worksheet.write(row, 1, value, formats['cell'])
            worksheet.write(row, 2, description, formats['cell'])
            row += 1
        
        row += 2
        
        # Column descriptions
        worksheet.write(row, 0, 'Column Descriptions', formats['title'])
        row += 2
        
        column_descriptions = [
            ('DNI', 'Direct Normal Irradiance (W/m²)'),
            ('Incidence Angle', 'Angle between sun vector and panel normal (°)'),
            ('Sun Azimuth', 'Sun azimuth angle (°)'),
            ('Sun Elevation', 'Sun elevation angle (°)'),
            ('Reflection Azimuth', 'Reflected ray azimuth (°)'),
            ('Reflection Elevation', 'Reflected ray elevation (°)'),
            ('DI on Module', 'Direct irradiance on module (W/m²)'),
            ('Luminance', 'Calculated luminance of reflection (cd/m²)'),
            ('Neglectable Glare', 'Boolean flag for negligible glare')
        ]
        
        worksheet.write(row, 0, 'Column', formats['header'])
        worksheet.write(row, 1, 'Description', formats['header'])
        row += 1
        
        for column, description in column_descriptions:
            worksheet.write(row, 0, column, formats['cell'])
            worksheet.write(row, 1, description, formats['cell'])
            row += 1
        
        # Set column widths
        worksheet.set_column(0, 0, 25)
        worksheet.set_column(1, 1, 30)
        worksheet.set_column(2, 2, 50)
    
    def _create_results_sheets(self, workbook, data: Dict[str, Any], formats: Dict) -> None:
        """Create result sheets for each observation point.
        
        Args:
            workbook: xlsxwriter workbook object
            data: Report data
            formats: Format dictionary
        """
        glare_results = data.get('glare_results', pd.DataFrame())
        
        # Handle None case
        if glare_results is None or (isinstance(glare_results, pd.DataFrame) and glare_results.empty):
            # Create empty results sheet
            worksheet = workbook.add_worksheet('Results')
            worksheet.write(0, 0, 'No glare results available', formats['cell'])
            return
        
        # Clean data for Excel output
        df_clean = self._clean_data_for_excel(glare_results)
        
        # Group by observation point
        if 'op_number' in df_clean.columns:
            op_numbers = df_clean['op_number'].unique()
        else:
            op_numbers = [1]  # Default single observation point
        
        for op_num in sorted(op_numbers):
            # Filter data for this observation point
            if 'op_number' in df_clean.columns:
                op_data = df_clean[df_clean['op_number'] == op_num]
            else:
                op_data = df_clean
            
            # Create sheet for this observation point
            sheet_name = f'OP_{op_num}_Results'
            worksheet = workbook.add_worksheet(sheet_name)
            
            if not op_data.empty:
                # Write headers
                for col_idx, column in enumerate(op_data.columns):
                    worksheet.write(0, col_idx, column, formats['header'])
                
                # Write data
                for row_idx, (_, row) in enumerate(op_data.iterrows(), 1):
                    for col_idx, value in enumerate(row):
                        cell_format = formats['cell']
                        
                        # Choose appropriate format based on data type
                        if isinstance(value, datetime):
                            cell_format = formats['date']
                        elif isinstance(value, (int, float)) and not pd.isna(value):
                            if column in ['DNI', 'Luminance', 'DI on Module']:
                                cell_format = formats['number']
                            elif 'Angle' in column:
                                cell_format = formats['number']
                        
                        worksheet.write(row_idx, col_idx, value, cell_format)
                
                # Auto-adjust column widths
                for col_idx, column in enumerate(op_data.columns):
                    max_length = max(len(str(column)), 15)
                    worksheet.set_column(col_idx, col_idx, min(max_length, 30))
    
    def _create_summary_sheet(self, workbook, data: Dict[str, Any], formats: Dict) -> None:
        """Create summary sheet with statistics.
        
        Args:
            workbook: xlsxwriter workbook object  
            data: Report data
            formats: Format dictionary
        """
        worksheet = workbook.add_worksheet('Summary')
        row = 0
        
        # Title
        worksheet.write(row, 0, 'Glare Analysis Summary', formats['title'])
        row += 2
        
        # Statistics
        statistics = data.get('statistics', {})
        
        summary_items = [
            ('Total Glare Events', statistics.get('total_events', 0)),
            ('Total Glare Hours', f"{statistics.get('total_hours', 0):.1f}"),
            ('Days with Glare', statistics.get('days_with_glare', 0)),
            ('Maximum Daily Duration (min)', f"{statistics.get('max_daily_minutes', 0):.0f}"),
            ('Average Daily Duration (min)', f"{statistics.get('avg_daily_minutes', 0):.1f}"),
            ('Peak Intensity (cd/m²)', format_number(statistics.get('max_intensity', 0), 0)),
            ('Average Intensity (cd/m²)', format_number(statistics.get('avg_intensity', 0), 0))
        ]
        
        worksheet.write(row, 0, 'Metric', formats['header'])
        worksheet.write(row, 1, 'Value', formats['header'])
        row += 1
        
        for metric, value in summary_items:
            worksheet.write(row, 0, metric, formats['cell'])
            worksheet.write(row, 1, value, formats['cell'])
            row += 1
        
        # Set column widths
        worksheet.set_column(0, 0, 30)
        worksheet.set_column(1, 1, 20)
    
    def _clean_data_for_excel(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean data for Excel output.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        df_clean = df.copy()
        
        # Remove unwanted columns
        columns_to_drop = ['Inverse Azimuth', 'Inverse Elevation']
        for col in columns_to_drop:
            if col in df_clean.columns:
                df_clean = df_clean.drop(columns=[col])
        
        # Rename columns for better presentation
        column_renames = {
            'di_plane': 'DI on Module',
            'Within Threshold': 'Neglectable Glare',
            'Within_Threshold': 'Neglectable Glare'
        }
        
        for old_name, new_name in column_renames.items():
            if old_name in df_clean.columns:
                df_clean = df_clean.rename(columns={old_name: new_name})
        
        # Handle timezone-aware datetime columns
        for col in df_clean.columns:
            if pd.api.types.is_datetime64_any_dtype(df_clean[col]):
                if hasattr(df_clean[col].dtype, 'tz') and df_clean[col].dt.tz is not None:
                    # Convert to UTC and remove timezone info
                    df_clean[col] = df_clean[col].dt.tz_convert('UTC').dt.tz_localize(None)
        
        return df_clean