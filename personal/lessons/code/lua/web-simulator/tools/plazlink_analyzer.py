#!/usr/bin/env python3
"""Read-only Plazlink log and firmware analyzer.

This tool deliberately does not open serial ports and never sends commands.
It is intended for .msg/.bin files exported by Pioneer Station.
"""

from __future__ import annotations

import argparse
import binascii
import collections
import hashlib
import math
import os
import re
from pathlib import Path


COMMANDS = {
    1: "DeviceInfoRequest",
    3: "SetValueRequest",
    4: "GetValueRequest",
    5: "FieldDescriptionRequest",
    7: "FileInfoRequest",
    8: "FileWriteRequest",
    9: "FileReadRequest",
}


def entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = collections.Counter(data)
    size = len(data)
    return -sum((n / size) * math.log2(n / size) for n in counts.values())


def firmware_report(path: Path) -> None:
    data = path.read_bytes()
    print(f"FILE {path}")
    print(f"  size       : {len(data)} bytes")
    print(f"  sha256     : {hashlib.sha256(data).hexdigest()}")
    print(f"  crc32      : 0x{binascii.crc32(data) & 0xffffffff:08x}")
    print(f"  entropy    : {entropy(data):.6f} bits/byte")
    print(f"  blocks/48  : {len(data) // 48} full + {len(data) % 48} bytes")
    print(f"  first 32   : {data[:32].hex(' ')}")
    print(f"  last  32   : {data[-32:].hex(' ')}")


def log_chunks(data: bytes) -> list[bytes]:
    """Split Pioneer Station logger output at its ASCII ``pl`` markers."""
    chunks = []
    positions = [m.start() for m in re.finditer(b"pl", data)]
    for index, start in enumerate(positions):
        end = positions[index + 1] if index + 1 < len(positions) else len(data)
        chunk = data[start + 2 : end]
        if chunk:
            chunks.append(chunk)
    return chunks


def log_report(path: Path, limit: int) -> None:
    data = path.read_bytes()
    chunks = log_chunks(data)
    print(f"LOG {path}")
    print(f"  size       : {len(data)} bytes")
    print(f"  pl chunks  : {len(chunks)}")
    if not chunks:
        return

    lengths = collections.Counter(len(chunk) for chunk in chunks)
    print("  chunk sizes:", ", ".join(f"{size}:{count}" for size, count in lengths.most_common(12)))
    print("  samples:")
    for index, chunk in enumerate(chunks[:limit]):
        candidates = []
        for offset, value in enumerate(chunk[: min(len(chunk), 16)]):
            if value in COMMANDS:
                candidates.append(f"+{offset}={COMMANDS[value]}")
        hint = f" candidates={','.join(candidates)}" if candidates else ""
        print(f"    {index:5d} len={len(chunk):4d}{hint}  {chunk[:80].hex(' ')}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only Pioneer Station Plazlink analyzer")
    parser.add_argument("paths", nargs="+", type=Path, help=".msg or .bin files/directories")
    parser.add_argument("--limit", type=int, default=20, help="number of log samples to print")
    args = parser.parse_args()

    for input_path in args.paths:
        paths = sorted(input_path.rglob("*") if input_path.is_dir() else [input_path])
        for path in paths:
            if not path.is_file():
                continue
            if path.suffix.lower() == ".bin":
                firmware_report(path)
            elif path.suffix.lower() == ".msg":
                log_report(path, max(0, args.limit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
