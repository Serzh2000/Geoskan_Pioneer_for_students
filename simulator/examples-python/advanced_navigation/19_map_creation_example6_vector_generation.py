"""Векторные (PDF) маркеры и лист-карта маркеров для печати без потери чёткости.

Запуск на компьютере: pip install opencv-contrib-python matplotlib
Файлы появятся в папке markers/vector рядом с местом запуска.
"""
import os

import cv2.aruco as aruco
import matplotlib.pyplot as plt
import matplotlib.patches as patches

output_dir = os.path.join("markers", "vector")
os.makedirs(output_dir, exist_ok=True)


def get_marker_bits(dictionary, marker_id, side_pixels):
    """
    Маркер, в котором один пиксель - одна клетка. side_pixels - сетка данных
    плюс чёрная рамка шириной в клетку с каждой стороны:
    ArUco 4x4 -> 6, ArUco 6x6 -> 8, AprilTag 36h11 (6x6 бит данных) -> 8.
    Если задать другое число, OpenCV растянет картинку и клетки станут неровными.
    """
    return aruco.generateImageMarker(dictionary, marker_id, side_pixels)

def draw_vector_marker(ax, img, x_offset=0, y_offset=0, size=1.0):
    """Рисует маркер квадратами matplotlib - получается векторная графика."""
    rows, cols = img.shape
    pixel_size = size / rows
    
    # Белый фон
    rect = patches.Rectangle((x_offset, y_offset), size, size, linewidth=0, facecolor='white')
    ax.add_patch(rect)
    
    # Чёрные клетки; строка 0 картинки - верх, а у matplotlib ось Y идёт вверх
    for r in range(rows):
        for c in range(cols):
            if img[r, c] == 0:
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
    print(f"Сохранён маркер: {filename}")

def save_grid_map(dict_name, rows, cols, bit_size, filename):
    dictionary = aruco.getPredefinedDictionary(getattr(aruco, dict_name))
    
    # Лист A4: 8.27 x 11.69 дюйма
    fig, ax = plt.subplots(figsize=(8.27, 11.69))
    
    margin_x = 1
    margin_y = 1
    cell_width = (8.27 - 2 * margin_x) / cols
    cell_height = (11.69 - 2 * margin_y) / rows
    marker_size = min(cell_width, cell_height) * 0.8
    
    # Заполняем лист с левого верхнего угла
    start_x = margin_x
    start_y = 11.69 - margin_y - cell_height
    
    for i in range(rows):
        for j in range(cols):
            marker_id = i * cols + j
            img = get_marker_bits(dictionary, marker_id, bit_size)
            
            x = start_x + j * cell_width + (cell_width - marker_size) / 2
            y = start_y - i * cell_height + (cell_height - marker_size) / 2
            
            draw_vector_marker(ax, img, x_offset=x, y_offset=y, size=marker_size)
            
            # Подпись с номером
            ax.text(x + marker_size/2, y - 0.2, f"ID: {marker_id}", ha='center', va='top', fontsize=8)

    ax.set_xlim(0, 8.27)
    ax.set_ylim(0, 11.69)
    ax.axis('off')
    ax.set_aspect('equal')
    
    plt.savefig(filename, format='pdf', bbox_inches='tight')
    plt.close()
    print(f"Сохранён лист: {filename}")

if __name__ == "__main__":
    # 1. Отдельные маркеры
    save_single_marker("DICT_4X4_50", 0, 6, f"{output_dir}/aruco_4x4_id0.pdf")
    save_single_marker("DICT_6X6_250", 12, 8, f"{output_dir}/aruco_6x6_id12.pdf")
    save_single_marker("DICT_APRILTAG_36h11", 0, 8, f"{output_dir}/apriltag_id0.pdf")

    # 2. Листы-карты: 4 x 4 = 16 маркеров
    save_grid_map("DICT_4X4_50", 4, 4, 6, f"{output_dir}/aruco_grid_4x4.pdf")
    save_grid_map("DICT_APRILTAG_36h11", 4, 4, 8, f"{output_dir}/apriltag_grid_4x4.pdf")
