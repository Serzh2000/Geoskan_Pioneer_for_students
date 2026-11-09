"""Строит траекторию полёта по CSV-логу из примера 10 (запускается на компьютере).

python 10b_plot_log.py flight_20261014_120000.csv
"""
import csv
import sys
import matplotlib.pyplot as plt

rows = []
with open(sys.argv[1], encoding="utf-8") as file:
    for row in csv.DictReader(file):
        if row["x"] not in ("", "None"):           # пропускаем строки без координат
            rows.append({k: float(row[k]) for k in ("t", "x", "y", "z")})

t = [r["t"] for r in rows]
fig, (top, side) = plt.subplots(1, 2, figsize=(11, 4.5))

top.plot([r["x"] for r in rows], [r["y"] for r in rows], marker=".")
top.set_title("Вид сверху")
top.set_xlabel("x, м")
top.set_ylabel("y, м")
top.axis("equal")
top.grid(True)

side.plot(t, [r["z"] for r in rows])
side.set_title("Высота от времени")
side.set_xlabel("t, с")
side.set_ylabel("z, м")
side.grid(True)

plt.tight_layout()
plt.savefig(sys.argv[1].replace(".csv", ".png"), dpi=150)
plt.show()
