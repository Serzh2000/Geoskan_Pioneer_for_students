#!/usr/bin/env python3
"""Plazlink over a serial port: list components and fields, optionally upload a Lua script.

Frame (from Pioneer Station's gcs-plazlink): 'p' 'l' | id | len | payload | ckA ckB, where the 8-bit Fletcher sum is
taken over id..payload and numbers are little-endian. Reading is the default; writing needs --upload / --run.
"""
from __future__ import annotations

import argparse
import struct
import subprocess
import sys
import time

import serial

ID = dict(
    PROTO_REQ=34, PROTO_INFO=35, COUNT_REQ=41, COUNT=42, INFO_REQ=43, FIELD_REQ=46, FIELD_SET=47, FIELD=47,
    FIELD_RESP=48, FIELD_DESC=49, FILE_DESC=60, FILE_INFO=61, FILE_WRITE=63, FILE_WRITE_RESP=64,
    INFO_EXT=73, FIELD_INFO_EXT=74,
)


def frame(msg_id: int, payload: bytes = b"") -> bytes:
    body = bytes([msg_id, len(payload)]) + payload
    a = b = 0
    for byte in body:
        a = (a + byte) & 0xFF
        b = (b + a) & 0xFF
    return b"pl" + body + bytes([a, b])


class Link:
    def __init__(self, port: str, baud: int) -> None:
        self.ser = serial.Serial(port, baud, timeout=0.05, write_timeout=2)
        self.buf = bytearray()

    def send(self, msg_id: int, payload: bytes = b"") -> None:
        self.ser.write(frame(msg_id, payload))

    def messages(self, wait: float):
        """Yield (id, payload) for every valid frame that arrives within `wait` seconds."""
        end = time.time() + wait
        while time.time() < end:
            self.buf += self.ser.read(256)
            while True:
                start = self.buf.find(b"pl")
                if start < 0 or len(self.buf) < start + 4:
                    break
                msg_id, length = self.buf[start + 2], self.buf[start + 3]
                total = 4 + length + 2
                if len(self.buf) < start + total:
                    break
                body = bytes(self.buf[start + 2 : start + 4 + length])
                a = b = 0
                for byte in body:
                    a = (a + byte) & 0xFF
                    b = (b + a) & 0xFF
                got = self.buf[start + 4 + length : start + total]
                if (a, b) == tuple(got):
                    del self.buf[: start + total]
                    yield msg_id, bytes(body[2:])
                else:
                    del self.buf[: start + 2]  # bad checksum: resync on the next marker

    def request(self, msg_id: int, payload: bytes, want: int, wait: float = 1.0, match=None):
        self.ser.reset_input_buffer()
        self.buf.clear()
        self.send(msg_id, payload)
        for got_id, data in self.messages(wait):
            if got_id == want and (match is None or match(data)):
                return data
        return None


def pascal(data: bytes, offset: int):
    n = data[offset]
    return data[offset + 1 : offset + 1 + n].decode("utf-8", "replace"), offset + 1 + n


def list_components(link: Link):
    count = link.request(ID["COUNT_REQ"], b"", ID["COUNT"])
    if not count:
        print("no answer to the component-count request")
        return []
    print("components:", count[0], "raw", count.hex(" "))
    found = []
    for index in range(count[0]):
        info = link.request(ID["INFO_REQ"], bytes([index]), ID["INFO_EXT"], match=lambda d, i=index: d[0] == i)
        if not info:
            print(f"  [{index}] no info")
            continue
        comp, kind, fields, sw_major, sw_minor = info[0], info[1], info[2], info[3], info[4]
        sw_rev = struct.unpack_from("<I", info, 5)[0]
        name, _ = pascal(info, 5 + 4 + 2 + 4)
        print(f"  [{comp}] type={kind} fields={fields} sw={sw_major}.{sw_minor}.{sw_rev} name={name!r}")
        found.append((comp, kind, fields, name))
    return found


def list_fields(link: Link, comp: int, fields: int):
    out = {}
    for index in range(fields):
        info = link.request(ID["FIELD_DESC"], bytes([comp, index]), ID["FIELD_INFO_EXT"], match=lambda d, i=index: d[1] == i)
        if not info:
            continue
        # component, field, type, size, flags, scale, name, unit, min, max
        name, off = pascal(info, 6)
        unit, _ = pascal(info, off)
        out[name] = (index, info[2], info[3], info[4])
        print(f"      field {index}: {name!r} type={info[2]} size={info[3]} flags={info[4]} unit={unit!r}")
    return out


def compile_lua(source: str, luac: str) -> bytes:
    # Through a file, as Pioneer Station does: on Windows luac's stdout is a text stream that rewrites line feeds.
    import os, tempfile
    handle, path = tempfile.mkstemp(suffix=".luac")
    os.close(handle)
    try:
        subprocess.run([luac, "-o", path, "-s", "-"], input=source.encode(), capture_output=True, check=True)
        return open(path, "rb").read()
    finally:
        os.remove(path)


def upload(link: Link, comp: int, file_id: int, data: bytes) -> bool:
    """Write the file in 40-byte pieces, waiting for the answer to each (the Station sends 4 ahead; one at a time is slower but safe)."""
    if link.request(ID["FILE_WRITE"], bytes([comp, file_id]) + struct.pack("<I", 0), ID["FILE_WRITE_RESP"]) is None:
        print("the device did not answer the open request")
        return False
    position = 0
    while position < len(data):
        chunk = data[position : position + 40]
        reply = link.request(
            ID["FILE_WRITE"], bytes([comp, file_id]) + struct.pack("<I", position) + chunk, ID["FILE_WRITE_RESP"], wait=2.0
        )
        if reply is None:
            print(f"no answer at offset {position}")
            return False
        result = reply[6]
        if result != 0:
            print(f"device refused offset {position}: result={result} raw={reply.hex(' ')}")
            return False
        position += len(chunk)
    # Closing write, as Pioneer Station sends it: position = file size, no data.
    done = link.request(ID["FILE_WRITE"], bytes([comp, file_id]) + struct.pack("<I", len(data)), ID["FILE_WRITE_RESP"], wait=2.0)
    if done is None or done[6] != 0:
        print("the device did not confirm the file:", done.hex(" ") if done else None)
        return False
    print(f"uploaded {len(data)} bytes")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="COM10")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--fields", action="store_true", help="also list each component's fields")
    ap.add_argument("--upload", help="Lua source file to compile and write to the Lua component's file 0")
    ap.add_argument("--luac", default=r"C:\PioneerStation\tools\luac.exe")
    ap.add_argument("--run", choices=["0", "1"], help="set the Lua component's 'run' field")
    args = ap.parse_args()

    link = Link(args.port, args.baud)
    components = list_components(link)
    lua = next((c for c in components if "lua" in c[3].lower()), None)
    for comp, _kind, fields, _name in components:
        if args.fields or (lua and comp == lua[0]):
            print(f"  fields of component {comp}:")
            table = list_fields(link, comp, fields)
            if lua and comp == lua[0]:
                lua_fields = table
    if args.upload or args.run:
        if not lua:
            print("no Lua component found; not writing")
            return 1
        if args.upload:
            # Stop the running script first: a loaded file is only picked up by a fresh start.
            run0 = lua_fields.get("run")
            if run0:
                stop = link.request(ID["FIELD_SET"], bytes([lua[0], run0[0], 2, 0]), ID["FIELD_RESP"])
                print("stop reply:", stop.hex(" ") if stop else None)
                time.sleep(0.3)
            data = compile_lua(open(args.upload, encoding="utf-8").read(), args.luac)
            print(f"compiled {len(data)} bytes of bytecode")
            if not upload(link, lua[0], 0, data):
                return 1
        if args.run:
            run = lua_fields.get("run")
            if run is None:
                print("no 'run' field; not starting")
                return 1
            # field set: component, field, then a typed value (type code + bytes) - Int8 per the Station
            reply = link.request(ID["FIELD_SET"], bytes([lua[0], run[0], 2, int(args.run)]), ID["FIELD_RESP"])
            print("run ->", args.run, "reply:", reply.hex(" ") if reply else None)
    return 0


if __name__ == "__main__":
    sys.exit(main())
