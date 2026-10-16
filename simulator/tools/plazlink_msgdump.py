import sys, collections
def frames(data):
    i = 0
    while True:
        i = data.find(b"pl", i)
        if i < 0 or i + 4 > len(data): return
        mid, n = data[i+2], data[i+3]
        end = i + 4 + n + 2
        if end > len(data): return
        a = b = 0
        for x in data[i+2:i+4+n]:
            a = (a + x) & 255; b = (b + a) & 255
        if (a, b) == (data[end-2], data[end-1]):
            yield mid, data[i+4:i+4+n]; i = end
        else: i += 2
d = open(sys.argv[1], "rb").read()
fs = list(frames(d))
print(len(fs), "frames", collections.Counter(m for m,_ in fs))
for m, p in fs:
    if m in (int(x) for x in sys.argv[2:]) or len(sys.argv) == 2:
        print(m, len(p), p[:48].hex(" "))
