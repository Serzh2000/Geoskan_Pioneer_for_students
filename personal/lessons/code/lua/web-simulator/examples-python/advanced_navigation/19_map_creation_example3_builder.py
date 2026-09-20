import json
import math
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path
import numpy as np

class Marker:
    def __init__(self, marker_id, size, x, y, z, yaw=0, dictionary="DICT_6X6_250"):
        self.id = marker_id
        self.size = size  # in meters
        self.x = x        # local x (meters)
        self.y = y        # local y (meters)
        self.z = z        # local z (meters) - height
        self.yaw = yaw    # orientation (degrees)
        self.dictionary = dictionary

    def to_dict(self):
        return {
            "id": self.id,
            "size": self.size,
            "position": {"x": self.x, "y": self.y, "z": self.z},
            "orientation": {"yaw": self.yaw},
            "dictionary": self.dictionary
        }

class MarkerMap:
    def __init__(self, name="MyMap", origin_gps=(0, 0)):
        self.name = name
        self.origin_lat = origin_gps[0]
        self.origin_lon = origin_gps[1]
        self.markers = []

    def add_marker(self, marker):
        self.markers.append(marker)

    def generate_grid(self, rows, cols, step_x, step_y, start_id=0, marker_size=0.2, dictionary="DICT_4X4_50"):
        """
        Generates a grid of markers.
        """
        for i in range(rows):
            for j in range(cols):
                # Calculate position
                # Assuming grid starts at (0,0) and extends in +X and +Y
                x = i * step_x
                y = j * step_y
                z = 0  # On the floor
                
                marker_id = start_id + i * cols + j
                
                self.add_marker(Marker(
                    marker_id=marker_id,
                    size=marker_size,
                    x=x,
                    y=y,
                    z=z,
                    yaw=0,
                    dictionary=dictionary
                ))
        print(f"Generated grid: {rows}x{cols}, {len(self.markers)} markers.")

    def save_yaml(self, filename):
        """
        Exports map to YAML format (Clever 4 style).
        """
        import yaml
        
        # Prepare data structure for ROS/Clever
        # Usually it's a list of markers with id, size, frame_id, pose
        markers_data = []
        for m in self.markers:
            markers_data.append({
                "id": int(m.id),
                "size": float(m.size),
                "frame_id": "map", # Global frame
                "pose": {
                    "position": {
                        "x": float(m.x),
                        "y": float(m.y),
                        "z": float(m.z)
                    },
                    "orientation": {
                        # Simplified quaternion for yaw rotation around Z
                        "x": 0.0,
                        "y": 0.0,
                        "z": math.sin(math.radians(m.yaw)/2),
                        "w": math.cos(math.radians(m.yaw)/2)
                    }
                }
            })
            
        with open(filename, 'w') as f:
            yaml.dump({"markers": markers_data}, f, default_flow_style=False)
        print(f"Map YAML saved to {filename}")

    def save_png_grid(self, filename, resolution_px=4096):
        """
        Exports the map as a high-resolution PNG grid (Clever 4 style).
        """
        import cv2
        import cv2.aruco as aruco
        
        # Determine map bounds
        xs = [m.x for m in self.markers]
        ys = [m.y for m in self.markers]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        
        # Add padding (e.g., 1 meter)
        padding_m = 1.0
        width_m = (max_x - min_x) + 2 * padding_m
        height_m = (max_y - min_y) + 2 * padding_m
        
        # Calculate scale (pixels per meter)
        # We want the largest dimension to fit in resolution_px
        scale = resolution_px / max(width_m, height_m)
        
        # Create white image
        img_h = int(height_m * scale)
        img_w = int(width_m * scale)
        image = np.ones((img_h, img_w), dtype=np.uint8) * 255
        
        print(f"Generating PNG map: {img_w}x{img_h} pixels (scale: {scale:.1f} px/m)")
        
        # Draw markers
        for m in self.markers:
            # Get marker dictionary
            try:
                # Map string dictionary name to cv2.aruco constant
                if hasattr(aruco, m.dictionary):
                    adict = aruco.getPredefinedDictionary(getattr(aruco, m.dictionary))
                else:
                    # Fallback to default
                    adict = aruco.getPredefinedDictionary(aruco.DICT_6X6_250)
                
                # Generate marker image
                marker_size_px = int(m.size * scale)
                marker_img = aruco.generateImageMarker(adict, m.id, marker_size_px)
                
                # Calculate position in image
                # Transform (x,y) from center-based to top-left image coordinates
                # Image origin is top-left. Map origin (0,0) is somewhere in the middle.
                # x_img = (m.x - min_x + padding) * scale
                # y_img = (max_y - m.y + padding) * scale (invert Y for image coords if needed, but typically maps align X-right Y-up vs image X-right Y-down)
                
                # Let's assume standard map: X right, Y up. Image: X right, Y down.
                # So we flip Y.
                
                center_x_px = int((m.x - min_x + padding_m) * scale)
                center_y_px = int((max_y - m.y + padding_m) * scale) # Invert Y
                
                top_left_x = center_x_px - marker_size_px // 2
                top_left_y = center_y_px - marker_size_px // 2
                
                # Place marker
                if 0 <= top_left_y < img_h - marker_size_px and 0 <= top_left_x < img_w - marker_size_px:
                    image[top_left_y:top_left_y+marker_size_px, top_left_x:top_left_x+marker_size_px] = marker_img
                    
                    # Add simple text ID for verification (optional, might clutter)
                    # cv2.putText(image, str(m.id), (top_left_x, top_left_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
                    
            except Exception as e:
                print(f"Error drawing marker {m.id}: {e}")
                
        cv2.imwrite(filename, image)
        print(f"Map PNG saved to {filename}")

    def save_json(self, filename):
        data = {
            "map_name": self.name,
            "origin": {"lat": self.origin_lat, "lon": self.origin_lon},
            "markers": [m.to_dict() for m in self.markers]
        }
        with open(filename, 'w') as f:
            json.dump(data, f, indent=4)
        print(f"Map saved to {filename}")

    def save_pdf(self, filename, trajectory=None):
        """
        Exports the map to a PDF file for printing/visualization.
        Includes marker positions, IDs, and optional trajectory.
        """
        fig, ax = plt.subplots(figsize=(11.69, 8.27))  # A4 Landscape (inches)
        
        # Plot markers
        x_coords = []
        y_coords = []
        
        for m in self.markers:
            x_coords.append(m.x)
            y_coords.append(m.y)
            
            # Draw marker as a square
            # m.x, m.y is the center of the marker
            half_size = m.size / 2
            rect = patches.Rectangle(
                (m.x - half_size, m.y - half_size), 
                m.size, m.size, 
                linewidth=1, edgecolor='black', facecolor='none'
            )
            ax.add_patch(rect)
            
            # Add ID text
            ax.text(m.x, m.y, str(m.id), ha='center', va='center', fontsize=8, fontweight='bold')
            
            # Add orientation arrow (small)
            # Arrow pointing in yaw direction
            arrow_len = m.size * 0.4
            dx = arrow_len * math.cos(math.radians(m.yaw))
            dy = arrow_len * math.sin(math.radians(m.yaw))
            ax.arrow(m.x, m.y, dx, dy, head_width=m.size*0.1, head_length=m.size*0.1, fc='blue', ec='blue', alpha=0.5)

        # Plot trajectory if provided
        if trajectory:
            traj_x = [p[0] for p in trajectory]
            traj_y = [p[1] for p in trajectory]
            ax.plot(traj_x, traj_y, 'r--', label='Drone Trajectory', linewidth=2, alpha=0.7)
            
            # Mark start and end
            ax.scatter(traj_x[0], traj_y[0], c='green', marker='o', label='Start')
            ax.scatter(traj_x[-1], traj_y[-1], c='red', marker='x', label='End')
            ax.legend()

        # Set plot limits with some padding
        if x_coords and y_coords:
            ax.set_xlim(min(x_coords) - 1, max(x_coords) + 1)
            ax.set_ylim(min(y_coords) - 1, max(y_coords) + 1)
        
        ax.set_aspect('equal')
        ax.set_xlabel('X (meters)')
        ax.set_ylabel('Y (meters)')
        ax.set_title(f'Marker Map: {self.name}')
        ax.grid(True, linestyle=':', alpha=0.6)
        
        # Add metadata text
        info_text = f"Total Markers: {len(self.markers)}\nOrigin: {self.origin_lat}, {self.origin_lon}"
        plt.figtext(0.02, 0.02, info_text, fontsize=10)

        plt.savefig(filename, format='pdf')
        plt.close()
        print(f"Map visualization saved to {filename}")

    def save_kml(self, filename):
        """
        Simple KML export for Google Earth.
        Note: This uses a rough approximation for meters to degrees (1 deg lat ~ 111km).
        For production, use a proper geodetic library like 'pyproj'.
        """
        kml_header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{name}</name>
"""
        kml_footer = """  </Document>
</kml>"""
        
        kml_body = ""
        
        # Approximate conversion (very rough, valid only for small areas)
        lat_deg_per_meter = 1 / 111132.928
        lon_deg_per_meter = 1 / (111132.928 * math.cos(math.radians(self.origin_lat)))

        for m in self.markers:
            # Calculate GPS position from local offset
            m_lat = self.origin_lat + (m.x * lat_deg_per_meter)
            m_lon = self.origin_lon + (m.y * lon_deg_per_meter)
            
            kml_body += f"""
    <Placemark>
      <name>Marker {m.id}</name>
      <description>Size: {m.size}m, Yaw: {m.yaw}</description>
      <Point>
        <coordinates>{m_lon},{m_lat},{m.z}</coordinates>
      </Point>
    </Placemark>"""

        with open(filename, 'w') as f:
            f.write(kml_header.format(name=self.name) + kml_body + kml_footer)
        print(f"KML saved to {filename}")

    def save_xml(self, filename):
        """
        Generic XML export.
        """
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<map>
    <name>{self.name}</name>
    <origin>
        <lat>{self.origin_lat}</lat>
        <lon>{self.origin_lon}</lon>
    </origin>
    <markers>
"""
        for m in self.markers:
            xml_content += f"""        <marker id="{m.id}">
            <size>{m.size}</size>
            <position>
                <x>{m.x}</x>
                <y>{m.y}</y>
                <z>{m.z}</z>
            </position>
            <orientation>
                <yaw>{m.yaw}</yaw>
            </orientation>
            <dictionary>{m.dictionary}</dictionary>
        </marker>
"""
        xml_content += """    </markers>
</map>"""
        
        with open(filename, 'w') as f:
            f.write(xml_content)
        print(f"XML saved to {filename}")

if __name__ == "__main__":
    # Example: Create a grid map for a flight zone (Clever 4 Style)
    # Origin: Let's assume a field coordinate
    my_map = MarkerMap("Clever_Map_16x16", origin_gps=(59.9343, 30.3351)) # St. Petersburg center approx

    # Generate a 16x16 grid with 0.5m spacing, marker size 0.2m
    # Dictionary for Clever 4 is usually 4x4_50 or 6x6_250 depending on setup. Let's stick to 4x4_50 as per common educational kits or 6x6_250 for Pioneer.
    # User request mentions "0-999 for ArUco", which implies larger dictionary. But usually grid maps use a subset.
    # Let's use DICT_4X4_50 as it is common for small grids, or extend if needed. 16x16 = 256 markers. DICT_4X4_50 has only 50 markers!
    # We need a larger dictionary. DICT_6X6_250 has 250 markers (almost enough, need 256).
    # DICT_5X5_1000 or DICT_6X6_1000 is safer. Pioneer standard is DICT_6X6_50 (only 50!).
    # If we need 16x16=256 unique markers, we MUST use a larger dictionary.
    # Let's use DICT_6X6_1000 to be safe and cover 0-255 IDs.
    
    my_map.generate_grid(rows=16, cols=16, step_x=0.5, step_y=0.5, start_id=0, marker_size=0.2, dictionary="DICT_6X6_1000")

    # Define a dummy trajectory (square path)
    trajectory = [
        (0.5, 0.5, 1.0),
        (3.5, 0.5, 1.0),
        (3.5, 3.5, 1.0),
        (0.5, 3.5, 1.0),
        (0.5, 0.5, 1.0)
    ]

    # Export standard formats
    my_map.save_json("../../data/maps/field_map.json")
    my_map.save_pdf("../../data/maps/field_map.pdf", trajectory=trajectory)
    
    # Export Clever 4 style artifacts
    my_map.save_yaml("../../data/maps/clever_map.yaml")
    my_map.save_png_grid("../../data/maps/clever_map_4096.png", resolution_px=4096)
    
    # Save config
    config = {
        "grid": {
            "rows": 16,
            "cols": 16,
            "step_x": 0.5,
            "step_y": 0.5
        },
        "marker": {
            "size": 0.2,
            "dictionary": "DICT_6X6_1000"
        }
    }
    with open("../../data/maps/map_config.json", 'w') as f:
        json.dump(config, f, indent=4)
        print("Config saved to ../../data/maps/map_config.json")
        
    # my_map.save_kml("field_map.kml") # Optional
    # my_map.save_xml("field_map.xml") # Optional
