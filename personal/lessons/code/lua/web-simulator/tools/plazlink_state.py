import sys, struct, time
sys.path.insert(0, "tools")
from plazlink_probe import Link, ID
l = Link("COM10", 115200)
for f, name in ((0, "run"), (1, "status"), (2, "memoryUsage")):
    r = l.request(ID["FIELD_REQ"], bytes([10, f]), ID["FIELD"], match=lambda d, f=f: d[0] == 10 and d[1] == f)
    print(name, r.hex(" ") if r else None)
for third in (0, 1, 2):
    r = l.request(ID["FILE_DESC"], bytes([10, 0, third]), ID["FILE_INFO"], wait=1.0)
    print("file info (third byte %d):" % third, r.hex(" ") if r else None)
