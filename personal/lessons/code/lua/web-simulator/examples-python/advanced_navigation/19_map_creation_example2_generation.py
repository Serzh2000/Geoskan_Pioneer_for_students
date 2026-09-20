import cv2
import cv2.aruco as aruco
import numpy as np
import os

# Create directory for output if it doesn't exist
output_dir = "../../../images/markers"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Define dictionaries to generate
dictionaries = {
    "DICT_4X4_50": aruco.DICT_4X4_50,
    "DICT_5X5_100": aruco.DICT_5X5_100,
    "DICT_6X6_250": aruco.DICT_6X6_250,
    "DICT_7X7_1000": aruco.DICT_7X7_1000,
    "DICT_APRILTAG_36h11": aruco.DICT_APRILTAG_36h11
}

def add_visual_aids(image, size_pixels):
    """
    Adds coordinate axes and grid to the marker image for educational purposes.
    """
    # Convert to color to add colored axes
    color_img = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    
    # Draw border
    border_size = int(size_pixels * 0.1)
    color_img = cv2.copyMakeBorder(color_img, border_size, border_size, border_size, border_size, 
                                   cv2.BORDER_CONSTANT, value=[255, 255, 255])
    
    new_size = color_img.shape[0]
    center = new_size // 2
    
    # Draw Axes (X - Red, Y - Green)
    # Origin is top-left of the marker content (inside border)
    origin_x = border_size
    origin_y = border_size
    
    # X Axis
    cv2.arrowedLine(color_img, (origin_x, origin_y), (origin_x + 100, origin_y), (0, 0, 255), 2)
    cv2.putText(color_img, "X", (origin_x + 110, origin_y + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
    
    # Y Axis
    cv2.arrowedLine(color_img, (origin_x, origin_y), (origin_x, origin_y + 100), (0, 255, 0), 2)
    cv2.putText(color_img, "Y", (origin_x + 10, origin_y + 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    return color_img

def generate_marker(dict_name, marker_id, size_pixels=200, visual_aids=False):
    """
    Generates a single ArUco marker image.
    """
    try:
        aruco_dict = aruco.getPredefinedDictionary(dictionaries[dict_name])
        
        # Draw the marker
        marker_image = np.zeros((size_pixels, size_pixels), dtype=np.uint8)
        marker_image = aruco.generateImageMarker(aruco_dict, marker_id, size_pixels)
        
        if visual_aids:
            final_image = add_visual_aids(marker_image, size_pixels)
            suffix = "_viz"
        else:
            final_image = marker_image
            suffix = ""
            
        # Save the marker
        filename = f"{output_dir}/{dict_name}_id{marker_id}{suffix}.png"
        cv2.imwrite(filename, final_image)
        print(f"Generated: {filename}")
    except Exception as e:
        print(f"Error generating marker {dict_name} ID {marker_id}: {e}")

def generate_json_metadata(dict_name, count, size_pixels):
    import json
    
    # Infer bits from name (e.g. DICT_4X4_50 -> 4)
    bits = 0
    if "4X4" in dict_name: bits = 4
    elif "5X5" in dict_name: bits = 5
    elif "6X6" in dict_name: bits = 6
    elif "7X7" in dict_name: bits = 7
    elif "APRILTAG" in dict_name: bits = "variable"
    
    data = {
        "dictionary": dict_name,
        "bits": bits,
        "count": count,
        "size_pixels": size_pixels,
        "description": "Marker set for Geoskan Pioneer"
    }
    filename = f"{output_dir}/{dict_name}_metadata.json"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Metadata saved: {filename}")

def generate_batch(dict_name, start_id, count, size_pixels=200, visual_aids=False):
    """
    Generates a batch of markers.
    """
    print(f"--- Generating {count} markers for {dict_name} ---")
    for i in range(start_id, start_id + count):
        generate_marker(dict_name, i, size_pixels, visual_aids)
    
    generate_json_metadata(dict_name, count, size_pixels)

if __name__ == "__main__":
    # 1. Standard sets
    generate_batch("DICT_4X4_50", 0, 5)
    generate_batch("DICT_5X5_100", 0, 2)
    generate_batch("DICT_6X6_250", 0, 5) # Standard for Pioneer
    generate_batch("DICT_7X7_1000", 0, 2)
    generate_batch("DICT_APRILTAG_36h11", 0, 5)
    
    # 2. Visualization examples (with axes)
    generate_marker("DICT_6X6_250", 0, 300, visual_aids=True)
    generate_marker("DICT_APRILTAG_36h11", 0, 300, visual_aids=True)
    
    # 3. Full range examples (uncomment to generate large sets)
    # generate_batch("DICT_6X6_250", 0, 50) 
    # generate_batch("DICT_APRILTAG_36h11", 0, 50)

    print(f"Done! Markers saved in '{output_dir}' folder.")
