"""Read-only: print type, scale byte, unit and current raw value of the telemetry fields of every component."""
import struct
import sys

sys.path.insert(0, "tools")
from plazlink_probe import ID, Link, pascal

SIZES = {0: 1, 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 2, 8: 4, 9: 8, 10: 4, 11: 8}
FMT = {0: "<B", 1: "<B", 2: "<b", 3: "<h", 4: "<i", 5: "<q", 6: "<B", 7: "<H", 8: "<I", 9: "<Q", 10: "<f", 11: "<d"}

link = Link("COM10", 115200)
count = link.request(ID["COUNT_REQ"], b"", ID["COUNT"])[0]
for comp in range(count):
    info = link.request(ID["INFO_REQ"], bytes([comp]), ID["INFO_EXT"], match=lambda d, c=comp: d[0] == c)
    name, _ = pascal(info, 15)
    print(f"== [{comp}] {name}")
    for index in range(info[2]):
        d = link.request(ID["FIELD_DESC"], bytes([comp, index]), ID["FIELD_INFO_EXT"], match=lambda x, i=index, c=comp: x[0] == c and x[1] == i)
        if not d:
            continue
        ftype, size, flags, scale = d[2], d[3], d[4], struct.unpack("<b", bytes([d[5]]))[0]
        fname, off = pascal(d, 6)
        unit, off = pascal(d, off)
        value = link.request(ID["FIELD_REQ"], bytes([comp, index]), ID["FIELD"], match=lambda x, i=index, c=comp: x[0] == c and x[1] == i)
        raw = struct.unpack(FMT[value[2]], value[3 : 3 + SIZES[value[2]]])[0] if value else None
        print(f"  {index:2d} {fname:20s} type={ftype:2d} scale={scale:3d} unit={unit!r:8} raw={raw}")
