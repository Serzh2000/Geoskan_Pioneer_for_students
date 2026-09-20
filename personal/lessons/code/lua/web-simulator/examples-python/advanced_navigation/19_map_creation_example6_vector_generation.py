import cv2
import cv2.aruco as aruco
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import os

# Define output directory
output_dir = "../../../images/markers/vector"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Helper function to generate raw bits of a marker
def get_marker_bits(dictionary, marker_id, side_pixels):
    """
    Generates a marker image with the exact pixel size matching its bit grid.
    For ArUco 4x4, the grid is 4x4 + 1 bit border = 6x6.
    For ArUco 6x6, the grid is 6x6 + 1 bit border = 8x8.
    For AprilTag 36h11, the grid is 8x8 + 1 bit border = 10x10.
    """
    # Create a small image (e.g. 10x10) to get raw bits
    # generateImageMarker scales up, but if we request small size it should work
    # OpenCV's generateImageMarker takes sidePixels as argument.
    # If sidePixels is small, it returns the raw bits.
    img = aruco.generateImageMarker(dictionary, marker_id, side_pixels)
    return img

def draw_vector_marker(ax, img, x_offset=0, y_offset=0, size=1.0):
    """
    Draws a marker on a matplotlib axis using Rectangle patches (Vector format).
    """
    rows, cols = img.shape
    pixel_size = size / rows
    
    # Draw white background
    rect = patches.Rectangle((x_offset, y_offset), size, size, linewidth=0, facecolor='white')
    ax.add_patch(rect)
    
    # Draw black pixels
    for r in range(rows):
        for c in range(cols):
            if img[r, c] == 0:
                # In matplotlib, origin is bottom-left usually, but we can invert axis
                # Let's assume standard image coordinates (0,0 is top-left) and invert Y later or now
                # Drawing from top-left (y = size - ...)
                rect_x = x_offset + c * pixel_size
                rect_y = y_offset + (rows - 1 - r) * pixel_size
                
                rect = patches.Rectangle((rect_x, rect_y), pixel_size, pixel_size, linewidth=0, facecolor='black')
                ax.add_patch(rect)

def save_single_marker(dict_name, marker_id, bit_size, filename):
    dictionary = aruco.getPredefinedDictionary(getattr(aruco, dict_name))
    img = get_marker_bits(dictionary, marker_id, bit_size)
    
    fig, ax = plt.subplots(figsize=(4, 4))
    draw_vector_marker(ax, img, size=10)
    
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    ax.set_aspect('equal')
    
    plt.savefig(filename, format='pdf', bbox_inches='tight', pad_inches=0)
    plt.close()
    print(f"Saved vector marker: {filename}")

def save_grid_map(dict_name, rows, cols, bit_size, filename):
    dictionary = aruco.getPredefinedDictionary(getattr(aruco, dict_name))
    
    # A4 Page size approx (8.27 x 11.69 inches)
    fig, ax = plt.subplots(figsize=(8.27, 11.69))
    
    margin_x = 1
    margin_y = 1
    cell_width = (8.27 - 2 * margin_x) / cols
    cell_height = (11.69 - 2 * margin_y) / rows
    marker_size = min(cell_width, cell_height) * 0.8
    
    # Start drawing from top-left
    start_x = margin_x
    start_y = 11.69 - margin_y - cell_height
    
    for i in range(rows):
        for j in range(cols):
            marker_id = i * cols + j
            img = get_marker_bits(dictionary, marker_id, bit_size)
            
            x = start_x + j * cell_width + (cell_width - marker_size) / 2
            y = start_y - i * cell_height + (cell_height - marker_size) / 2
            
            draw_vector_marker(ax, img, x_offset=x, y_offset=y, size=marker_size)
            
            # Add label
            ax.text(x + marker_size/2, y - 0.2, f"ID: {marker_id}", ha='center', va='top', fontsize=8)

    ax.set_xlim(0, 8.27)
    ax.set_ylim(0, 11.69)
    ax.axis('off')
    ax.set_aspect('equal')
    
    plt.savefig(filename, format='pdf', bbox_inches='tight')
    plt.close()
    print(f"Saved vector grid: {filename}")

if __name__ == "__main__":
    # 1. Single Markers
    # ArUco 4x4 (Size 6x6 pixels)
    save_single_marker("DICT_4X4_50", 0, 6, f"{output_dir}/aruco_4x4_id0.pdf")
    # AprilTag 36h11 (Size 10x10 pixels usually? Let's verify)
    # AprilTag 36h11 is 8x8 data + 1 bit border = 10x10 total
    save_single_marker("DICT_APRILTAG_36h11", 0, 10, f"{output_dir}/apriltag_id0.pdf")
    
    # 2. Grid Maps (4x4 = 16 markers)
    save_grid_map("DICT_4X4_50", 4, 4, 6, f"{output_dir}/aruco_grid_4x4.pdf")
    save_grid_map("DICT_APRILTAG_36h11", 4, 4, 10, f"{output_dir}/apriltag_grid_4x4.pdf")
