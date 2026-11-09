"""Конструктор карты маркеров: сетка маркеров и экспорт в JSON, XML, KML, YAML, PDF и PNG.

Запуск на компьютере: pip install opencv-contrib-python matplotlib numpy pyyaml
Файлы появятся в папке maps рядом с местом запуска.
Координаты - локальная система Пионера: X вперёд от старта, Y влево, Z вверх, метры.
"""
import json
import math
import os

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np


class Marker:
    def __init__(self, marker_id, size, x, y, z, yaw=0, dictionary="DICT_6X6_250"):
        self.id = marker_id
        self.size = size  # сторона чёрного квадрата, м
        self.x = x        # локальные координаты центра, м
        self.y = y
        self.z = z        # высота (0 - на полу)
        self.yaw = yaw    # поворот маркера, градусы
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
        self.origin_lat = origin_gps[0]  # широта точки старта, градусы
        self.origin_lon = origin_gps[1]  # долгота точки старта, градусы
        self.markers = []

    def add_marker(self, marker):
        self.markers.append(marker)

    def generate_grid(self, rows, cols, step_x, step_y, start_id=0, marker_size=0.2, dictionary="DICT_6X6_250"):
        """Сетка rows x cols маркеров на полу; первый - в начале координат."""
        for i in range(rows):
            for j in range(cols):
                self.add_marker(Marker(
                    marker_id=start_id + i * cols + j,
                    size=marker_size,
                    x=i * step_x,
                    y=j * step_y,
                    z=0,
                    yaw=0,
                    dictionary=dictionary
                ))
        print(f"Сетка {rows}x{cols}: {len(self.markers)} маркеров.")

    def save_json(self, filename):
        data = {
            "map_name": self.name,
            "origin": {"lat": self.origin_lat, "lon": self.origin_lon},
            "markers": [m.to_dict() for m in self.markers]
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"JSON: {filename}")

    def save_yaml(self, filename):
        """YAML со списком маркеров и их поз: такой формат читают инструменты на ROS."""
        import yaml

        markers_data = []
        for m in self.markers:
            markers_data.append({
                "id": int(m.id),
                "size": float(m.size),
                "frame_id": "map",
                "pose": {
                    "position": {"x": float(m.x), "y": float(m.y), "z": float(m.z)},
                    # Поворот вокруг оси Z в виде кватерниона
                    "orientation": {
                        "x": 0.0,
                        "y": 0.0,
                        "z": math.sin(math.radians(m.yaw) / 2),
                        "w": math.cos(math.radians(m.yaw) / 2)
                    }
                }
            })
        with open(filename, "w", encoding="utf-8") as f:
            yaml.dump({"markers": markers_data}, f, default_flow_style=False)
        print(f"YAML: {filename}")

    def save_png_grid(self, filename, resolution_px=4096):
        """Карта одной картинкой: маркеры в масштабе, для печати на баннере."""
        import cv2
        import cv2.aruco as aruco

        xs = [m.x for m in self.markers]
        ys = [m.y for m in self.markers]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        padding_m = 1.0  # белое поле вокруг карты, м
        width_m = (max_y - min_y) + 2 * padding_m    # по горизонтали картинки идёт Y
        height_m = (max_x - min_x) + 2 * padding_m   # по вертикали - X
        scale = resolution_px / max(width_m, height_m)  # пикселей на метр

        img_h = int(height_m * scale)
        img_w = int(width_m * scale)
        image = np.full((img_h, img_w), 255, dtype=np.uint8)
        print(f"PNG: {img_w}x{img_h} пикселей, {scale:.1f} пикс/м")

        for m in self.markers:
            name = m.dictionary if hasattr(aruco, m.dictionary) else "DICT_6X6_250"
            adict = aruco.getPredefinedDictionary(getattr(aruco, name))
            side = int(m.size * scale)
            marker_img = aruco.generateImageMarker(adict, m.id, side)

            # Вид сверху, X - вверх по листу, Y - влево: у картинки строки идут вниз,
            # столбцы - вправо, поэтому обе координаты отражаем.
            center_col = int((max_y - m.y + padding_m) * scale)
            center_row = int((max_x - m.x + padding_m) * scale)
            top, left = center_row - side // 2, center_col - side // 2
            if 0 <= top <= img_h - side and 0 <= left <= img_w - side:
                image[top:top + side, left:left + side] = marker_img
            else:
                print(f"Маркер {m.id} не помещается на лист")

        cv2.imwrite(filename, image)
        print(f"PNG: {filename}")

    def save_pdf(self, filename, trajectory=None):
        """Схема карты на листе A4: квадраты маркеров, номера, ориентация, маршрут."""
        fig, ax = plt.subplots(figsize=(11.69, 8.27))  # A4, альбомный лист (дюймы)

        for m in self.markers:
            half = m.size / 2
            ax.add_patch(patches.Rectangle(
                (m.x - half, m.y - half), m.size, m.size,
                linewidth=1, edgecolor="black", facecolor="none"))
            ax.text(m.x, m.y, str(m.id), ha="center", va="center", fontsize=8, fontweight="bold")
            # Стрелка показывает поворот маркера
            arrow_len = m.size * 0.4
            dx = arrow_len * math.cos(math.radians(m.yaw))
            dy = arrow_len * math.sin(math.radians(m.yaw))
            ax.arrow(m.x, m.y, dx, dy, head_width=m.size * 0.1, head_length=m.size * 0.1,
                     fc="blue", ec="blue", alpha=0.5)

        if trajectory:
            traj_x = [p[0] for p in trajectory]
            traj_y = [p[1] for p in trajectory]
            ax.plot(traj_x, traj_y, "r--", label="маршрут", linewidth=2, alpha=0.7)
            ax.scatter(traj_x[0], traj_y[0], c="green", marker="o", label="старт")
            ax.scatter(traj_x[-1], traj_y[-1], c="red", marker="x", label="финиш")
            ax.legend()

        if self.markers:
            ax.set_xlim(min(m.x for m in self.markers) - 1, max(m.x for m in self.markers) + 1)
            ax.set_ylim(min(m.y for m in self.markers) - 1, max(m.y for m in self.markers) + 1)
        ax.set_aspect("equal")
        ax.set_xlabel("X, м")
        ax.set_ylabel("Y, м")
        ax.set_title(f"Карта маркеров: {self.name}")
        ax.grid(True, linestyle=":", alpha=0.6)
        plt.figtext(0.02, 0.02, f"Маркеров: {len(self.markers)}\nСтарт: {self.origin_lat}, {self.origin_lon}", fontsize=10)

        plt.savefig(filename, format="pdf")
        plt.close()
        print(f"PDF: {filename}")

    def local_to_gps(self, x, y):
        """
        Приближённый перевод метров в градусы для небольших участков.
        Считаем, что на старте дрон смотрит на север: X - на север, Y (влево) - на запад.
        Для геодезической точности нужна библиотека pyproj и проекция UTM.
        """
        lat_deg_per_meter = 1 / 111132.928
        lon_deg_per_meter = 1 / (111132.928 * math.cos(math.radians(self.origin_lat)))
        lat = self.origin_lat + x * lat_deg_per_meter
        lon = self.origin_lon - y * lon_deg_per_meter  # влево = на запад = долгота меньше
        return lat, lon

    def save_kml(self, filename):
        """KML для Google Earth и QGIS: каждый маркер - метка на карте."""
        kml_header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{name}</name>
"""
        kml_footer = """  </Document>
</kml>"""

        kml_body = ""
        for m in self.markers:
            m_lat, m_lon = self.local_to_gps(m.x, m.y)
            # В KML порядок координат: долгота, широта, высота
            kml_body += f"""
    <Placemark>
      <name>Marker {m.id}</name>
      <description>Size: {m.size} m, Yaw: {m.yaw}</description>
      <Point>
        <coordinates>{m_lon:.7f},{m_lat:.7f},{m.z}</coordinates>
      </Point>
    </Placemark>"""

        with open(filename, "w", encoding="utf-8") as f:
            f.write(kml_header.format(name=self.name) + kml_body + kml_footer)
        print(f"KML: {filename}")

    def save_xml(self, filename):
        """Простой XML-формат; разбор - через xml.etree.ElementTree."""
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

        with open(filename, "w", encoding="utf-8") as f:
            f.write(xml_content)
        print(f"XML: {filename}")


if __name__ == "__main__":
    out = "maps"
    os.makedirs(out, exist_ok=True)

    # Полигон 4.5 x 4.5 м: сетка 10 x 10 маркеров через 0.5 м, сторона маркера 0.2 м.
    # 100 номеров (0..99) помещаются в DICT_6X6_250 - словарь карт Пионера и симулятора.
    # Для сетки больше 250 маркеров нужен словарь крупнее, например DICT_6X6_1000.
    my_map = MarkerMap("Field_10x10", origin_gps=(59.9343, 30.3351))
    my_map.generate_grid(rows=10, cols=10, step_x=0.5, step_y=0.5, start_id=0,
                         marker_size=0.2, dictionary="DICT_6X6_250")

    # Маршрут для схемы: квадрат над картой на высоте 1 м
    trajectory = [(0.5, 0.5, 1.0), (4.0, 0.5, 1.0), (4.0, 4.0, 1.0), (0.5, 4.0, 1.0), (0.5, 0.5, 1.0)]

    my_map.save_json(os.path.join(out, "field_map.json"))
    my_map.save_xml(os.path.join(out, "field_map.xml"))
    my_map.save_kml(os.path.join(out, "field_map.kml"))
    my_map.save_pdf(os.path.join(out, "field_map.pdf"), trajectory=trajectory)
    my_map.save_yaml(os.path.join(out, "field_map.yaml"))
    my_map.save_png_grid(os.path.join(out, "field_map_4096.png"), resolution_px=4096)
