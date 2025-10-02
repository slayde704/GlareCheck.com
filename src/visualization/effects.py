"""Image effects and post-processing for visualizations."""

import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Try to import PIL
try:
    from PIL import Image, ImageFilter, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL/Pillow not available. Image effects will be disabled.")


def apply_blur_effect(
    image_path: Path,
    radius: int = 85,
    output_path: Optional[Path] = None
) -> Optional[Path]:
    """Apply Gaussian blur to an image.
    
    Args:
        image_path: Path to input image
        radius: Blur radius in pixels
        output_path: Optional output path (default: blur_<original_name>)
        
    Returns:
        Path to blurred image or None if failed
    """
    if not PIL_AVAILABLE:
        logger.warning("PIL not available, skipping blur effect")
        return None
    
    try:
        # Open image
        img = Image.open(image_path)
        
        # Apply blur
        blurred = img.filter(ImageFilter.GaussianBlur(radius=radius))
        
        # Determine output path
        if output_path is None:
            output_path = image_path.parent / f"blur_{image_path.name}"
        
        # Save blurred image
        blurred.save(output_path)
        logger.debug(f"Created blurred image: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Failed to apply blur effect: {e}")
        return None


def resize_image(
    image_path: Path,
    size: Tuple[int, int],
    output_path: Optional[Path] = None,
    maintain_aspect: bool = True
) -> Optional[Path]:
    """Resize an image to specified dimensions.
    
    Args:
        image_path: Path to input image
        size: Target size (width, height)
        output_path: Optional output path
        maintain_aspect: Whether to maintain aspect ratio
        
    Returns:
        Path to resized image or None if failed
    """
    if not PIL_AVAILABLE:
        logger.warning("PIL not available, skipping resize")
        return None
    
    try:
        img = Image.open(image_path)
        
        if maintain_aspect:
            # Calculate aspect ratio
            img.thumbnail(size, Image.Resampling.LANCZOS)
        else:
            # Force exact size
            img = img.resize(size, Image.Resampling.LANCZOS)
        
        # Determine output path
        if output_path is None:
            output_path = image_path.parent / f"resized_{image_path.name}"
        
        img.save(output_path)
        logger.debug(f"Resized image saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Failed to resize image: {e}")
        return None


def add_watermark(
    image_path: Path,
    text: str,
    position: str = 'bottom-right',
    opacity: float = 0.5,
    font_size: int = 20,
    output_path: Optional[Path] = None
) -> Optional[Path]:
    """Add a text watermark to an image.
    
    Args:
        image_path: Path to input image
        text: Watermark text
        position: Position ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')
        opacity: Text opacity (0-1)
        font_size: Font size in pixels
        output_path: Optional output path
        
    Returns:
        Path to watermarked image or None if failed
    """
    if not PIL_AVAILABLE:
        logger.warning("PIL not available, skipping watermark")
        return None
    
    try:
        # Open image and create drawing context
        img = Image.open(image_path).convert('RGBA')
        txt_layer = Image.new('RGBA', img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(txt_layer)
        
        # Try to load a font
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
        
        # Get text size
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Calculate position
        margin = 10
        if position == 'top-left':
            x, y = margin, margin
        elif position == 'top-right':
            x, y = img.width - text_width - margin, margin
        elif position == 'bottom-left':
            x, y = margin, img.height - text_height - margin
        elif position == 'bottom-right':
            x, y = img.width - text_width - margin, img.height - text_height - margin
        else:  # center
            x, y = (img.width - text_width) // 2, (img.height - text_height) // 2
        
        # Draw text with transparency
        alpha = int(255 * opacity)
        draw.text((x, y), text, font=font, fill=(255, 255, 255, alpha))
        
        # Composite the text layer onto the image
        watermarked = Image.alpha_composite(img, txt_layer)
        
        # Convert back to RGB for saving as JPEG/PNG
        watermarked = watermarked.convert('RGB')
        
        # Determine output path
        if output_path is None:
            output_path = image_path.parent / f"watermarked_{image_path.name}"
        
        watermarked.save(output_path)
        logger.debug(f"Added watermark to: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Failed to add watermark: {e}")
        return None


def create_image_grid(
    image_paths: list,
    grid_size: Tuple[int, int],
    output_path: Path,
    image_size: Optional[Tuple[int, int]] = None,
    padding: int = 10
) -> Optional[Path]:
    """Create a grid of images.
    
    Args:
        image_paths: List of image paths
        grid_size: Grid dimensions (columns, rows)
        output_path: Path for output image
        image_size: Size for each image in grid (default: use first image size)
        padding: Padding between images
        
    Returns:
        Path to grid image or None if failed
    """
    if not PIL_AVAILABLE:
        logger.warning("PIL not available, skipping image grid")
        return None
    
    try:
        cols, rows = grid_size
        
        # Load first image to get size
        if image_size is None:
            first_img = Image.open(image_paths[0])
            image_size = first_img.size
            first_img.close()
        
        # Calculate grid dimensions
        grid_width = cols * image_size[0] + (cols - 1) * padding
        grid_height = rows * image_size[1] + (rows - 1) * padding
        
        # Create blank grid
        grid_img = Image.new('RGB', (grid_width, grid_height), 'white')
        
        # Place images
        for idx, img_path in enumerate(image_paths[:cols * rows]):
            row = idx // cols
            col = idx % cols
            
            x = col * (image_size[0] + padding)
            y = row * (image_size[1] + padding)
            
            # Open and resize image
            img = Image.open(img_path)
            img = img.resize(image_size, Image.Resampling.LANCZOS)
            
            # Paste into grid
            grid_img.paste(img, (x, y))
            img.close()
        
        # Save grid
        grid_img.save(output_path)
        logger.debug(f"Created image grid: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Failed to create image grid: {e}")
        return None


def optimize_image(
    image_path: Path,
    output_path: Optional[Path] = None,
    quality: int = 85,
    max_size: Optional[Tuple[int, int]] = None
) -> Optional[Path]:
    """Optimize image file size while maintaining quality.
    
    Args:
        image_path: Path to input image
        output_path: Optional output path
        quality: JPEG quality (1-100)
        max_size: Maximum dimensions (will maintain aspect ratio)
        
    Returns:
        Path to optimized image or None if failed
    """
    if not PIL_AVAILABLE:
        logger.warning("PIL not available, skipping optimization")
        return None
    
    try:
        img = Image.open(image_path)
        
        # Resize if needed
        if max_size and (img.width > max_size[0] or img.height > max_size[1]):
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Determine output path
        if output_path is None:
            output_path = image_path.parent / f"optimized_{image_path.name}"
        
        # Save with optimization
        if output_path.suffix.lower() in ['.jpg', '.jpeg']:
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
        elif output_path.suffix.lower() == '.png':
            img.save(output_path, 'PNG', optimize=True)
        else:
            img.save(output_path)
        
        # Log size reduction
        original_size = image_path.stat().st_size
        new_size = output_path.stat().st_size
        reduction = (1 - new_size / original_size) * 100
        logger.debug(f"Optimized image: {reduction:.1f}% size reduction")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Failed to optimize image: {e}")
        return None