import matplotlib.pyplot as plt

def plot_map(self):
    x_coords = [m.x for m in self.markers]
    y_coords = [m.y for m in self.markers]
    ids = [m.id for m in self.markers]

    plt.figure(figsize=(10, 10))
    plt.scatter(x_coords, y_coords, c='red', marker='s', s=100)
    
    for i, txt in enumerate(ids):
        plt.annotate(f"ID {txt}", (x_coords[i], y_coords[i]), xytext=(5, 5), textcoords='offset points')
        
    plt.grid(True)
    plt.axis('equal')
    plt.title(f"Map: {self.name}")
    plt.xlabel("X (meters)")
    plt.ylabel("Y (meters)")
    plt.show()
