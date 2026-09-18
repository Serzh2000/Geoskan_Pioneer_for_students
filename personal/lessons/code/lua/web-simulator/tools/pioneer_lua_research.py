#!/usr/bin/env python3
"""Offline Pioneer firmware/Lua evidence collector. Never opens a serial port.

Reads installed JARs/images, invokes javap and luac locally, and optionally runs
only the fixed numeric probe in the project's Fengari VM. No firmware is flashed.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import re
import struct
import subprocess
import zipfile
import zlib
from pathlib import Path


TARGETS = {
    "aero.geoscan.pioneer.lua.LuaCompiler",
    "aero.geoscan.gcs.uav.devhub.cmd.LuaScriptUploadCommand",
    "aero.geoscan.gcs.plazlink.control.pl1_4.Plazlink1_4LuaScriptBinding$LuaScriptStartHandler",
    "aero.geoscan.gcs.plazlink.control.pl1_4.Plazlink1_4LuaScriptBinding$LuaScriptStopHandler",
    "aero.geoscan.gcs.plazlink.control.pl1_4.Plazlink1_4LuaScriptBinding$LuaScriptUploadHandler",
    "aero.geoscan.pioneer.app.fastload.com.UploadLuaScriptFLJob",
    "aero.geoscan.pioneer.app.flashing.FlashingWizard",
    "aero.geoscan.gcs.uav.payload.impl.FlashingJob",
    "aero.geoscan.gcs.plazlink.control.Plazlink1_4FileUploader",
    "aero.geoscan.gcs3.control.plazlink.model.device.component.definition.flags.luascript.LuaScript",
    "aero.geoscan.gcs3.control.plazlink.model.device.component.definition.flags.luascript.LuaScript$1",
    "aero.geoscan.gcs3.logic.file.PioneerUploadFirmwareService",
    "aero.geoscan.gcs3.logic.firmware.impl.FirmwareValidatorImpl",
    "aero.geoscan.gcs3.logic.flashing.strategy.plazlink.PlazlinkFlashingStrategy",
    "aero.geoscan.gcs3.logic.flashing.strategy.payload.PayloadFlashingStrategy",
}
NUMERIC_PROBE = b"return 1.5, 16777217.0, 2147483647, math.maxinteger, 1 << 31, 7 // 2\n"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def entropy(data: bytes) -> float:
    if not data:
        return 0.0
    return -sum((n / len(data)) * math.log2(n / len(data))
                for n in collections.Counter(data).values())


def image_info(source: str, data: bytes) -> dict:
    """Heuristics are measurements, not a declaration of encryption/CPU type."""
    strings = re.findall(rb"[ -~]{8,}", data)
    blocks = [data[i:i + 16] for i in range(0, len(data) - 15, 16)]
    signatures = {"ELF": b"\x7fELF", "ZIP": b"PK\x03\x04", "gzip": b"\x1f\x8b",
                  "xz": b"\xfd7zXZ\x00", "Lua53": b"\x1bLua\x53"}
    # Restrictive STM32 flash/SRAM heuristic; absence is not proof of encryption.
    vectors = []
    for offset in range(0, len(data) - 64 + 1, 4):
        sp, reset = struct.unpack_from('<II', data, offset)
        if not (0x20000000 <= sp <= 0x20080000 and sp % 8 == 0
                and 0x08000000 <= reset < 0x08200000 and reset & 1):
            continue
        words = struct.unpack_from('<16I', data, offset)
        valid = sum(w == 0 or (0x08000000 <= w < 0x08200000 and w & 1)
                    for w in words[2:])
        if valid >= 12:
            vectors.append(offset)
    return {
        "source": source, "size": len(data), "sha256": sha(data),
        "crc32": f"{zlib.crc32(data):08x}", "entropy": entropy(data),
        "size_mod_16": len(data) % 16, "prefix32": data[:32].hex(),
        "duplicate_aligned_16byte_blocks": len(blocks) - len(set(blocks)),
        "prefix_signature": [name for name, sig in signatures.items() if data.startswith(sig)],
        "lua53_signature_offsets": [m.start() for m in re.finditer(re.escape(b'\x1bLua\x53'), data)],
        "candidate_stm32_vector_offsets": vectors,
        "lua_api_strings": [s.decode('ascii') for s in strings
                            if re.search(rb'(?i)\blua\b|lua_[A-Za-z]|Ledbar|Timer\.|lpsPosition|MCE_|FreeRTOS', s)][:30],
        "entropy_64k": [round(entropy(data[i:i + 65536]), 6)
                        for i in range(0, len(data), 65536)],
    }


def run(argv: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(argv, capture_output=True, timeout=30, check=True, **kwargs)


def collect(args) -> dict:
    args.output.mkdir(parents=True, exist_ok=True)
    evidence = {"schema": 1, "images": [], "classes": [], "compiler": {}}
    for root in [args.station / 'firmware', args.firmware_root]:
        for path in sorted(root.rglob('*.bin')):
            evidence['images'].append(image_info(str(path.resolve()), path.read_bytes()))
    for root in [args.station / 'plugins', args.station2 / 'libs']:
        for jar in sorted(root.glob('*.jar')):
            with zipfile.ZipFile(jar) as archive:
                names = archive.namelist()
                selected = [(name, name[:-6].replace('/', '.')) for name in names
                            if name.endswith('.class') and name[:-6].replace('/', '.') in TARGETS]
                embedded = [name for name in names if name.endswith('.bin')]
                if not selected and not embedded:
                    continue
                jar_sha = sha(jar.read_bytes())
                for name in embedded:
                    item = image_info(f"{jar.resolve()}!/{name}", archive.read(name))
                    item['jar_sha256'] = jar_sha
                    evidence['images'].append(item)
                for name, cls in selected:
                    result = run([str(args.javap), '-c', '-p', '-constants', '-classpath', str(jar), cls])
                    destination = args.output / (cls + '.txt')
                    destination.write_bytes(result.stdout)
                    evidence['classes'].append({
                        "class": cls, "jar": str(jar.resolve()), "jar_sha256": jar_sha,
                        "class_sha256": sha(archive.read(name)), "javap_file": destination.name,
                    })
    missing = sorted(TARGETS - {c['class'] for c in evidence['classes']})
    evidence['missing_classes'] = missing
    compiler = args.station / 'tools' / 'luac.exe'
    binary = args.output / 'numeric-probe.luac'
    source = args.output / 'numeric-probe.lua'
    source.write_bytes(NUMERIC_PROBE)
    version = run([str(compiler), '-v'])
    run([str(compiler), '-s', '-o', str(binary), '-'], input=NUMERIC_PROBE)
    listing = run([str(compiler), '-l', '-l', '-p', str(source)])
    (args.output / 'numeric-probe-listing.txt').write_bytes(listing.stdout)
    data = binary.read_bytes()
    if data[:12] != b'\x1bLua\x53\x00\x19\x93\r\n\x1a\n':
        raise ValueError('Unexpected bytecode header; do not apply Lua 5.3 layout')
    sizes = dict(zip(['int', 'size_t', 'instruction', 'lua_Integer', 'lua_Number'], data[12:17]))
    byteorder = 'little' if int.from_bytes(data[17:17 + sizes['lua_Integer']], 'little') == 0x5678 else 'unknown'
    evidence['compiler'] = {
        "path": str(compiler.resolve()), "sha256": sha(compiler.read_bytes()),
        "version": (version.stdout + version.stderr).decode(errors='replace').strip(),
        "probe_source": NUMERIC_PROBE.decode(), "probe_sha256": sha(data),
        "header_hex": data[:29].hex(' '), "sizes_bytes": sizes, "byteorder": byteorder,
    }
    # Check every prepared hardware probe's syntax only; never execute it here.
    evidence['probe_compilation'] = []
    for path in sorted((Path(__file__).parent / 'pioneer-lua-probes').glob('*.lua')):
        run([str(compiler), '-p', str(path)])
        evidence['probe_compilation'].append({"file": path.name, "sha256": sha(path.read_bytes()), "status": 'passed'})
    evidence['official_example_compilation'] = []
    examples_dir = args.output / 'compiled-examples'
    examples_dir.mkdir(exist_ok=True)
    for path in sorted((args.station / 'examples').glob('*.lua')):
        target = examples_dir / (path.stem + '.luac')
        item = {"source": str(path.resolve()), "source_sha256": sha(path.read_bytes())}
        try:
            run([str(compiler), '-s', '-o', str(target), str(path)])
            item.update(status='passed', binary=str(target.resolve()), binary_sha256=sha(target.read_bytes()))
        except subprocess.CalledProcessError as error:
            item.update(status='failed', error=error.stderr.decode(errors='replace'))
        evidence['official_example_compilation'].append(item)
    if args.node:
        js = r"""
const fs = require('fs'), f = require('fengari');
const L = f.lauxlib.luaL_newstate(); f.lualib.luaL_openlibs(L);
const b = fs.readFileSync(process.argv[1]);
const result = {loadStatus:f.lauxlib.luaL_loadbuffer(L,b,b.length,f.to_luastring('@numeric-probe'))};
if(result.loadStatus===0) {
 result.runStatus=f.lua.lua_pcall(L,0,f.lua.LUA_MULTRET,0); result.values=[];
 if(result.runStatus===0) for(let i=1;i<=f.lua.lua_gettop(L);i++)
   result.values.push({value:f.lua.lua_tonumber(L,i),integer:f.lua.lua_isinteger(L,i)});
}
if(result.loadStatus || result.runStatus) result.error=f.to_jsstring(f.lua.lua_tostring(L,-1));
f.lua.lua_close(L);
result.officialExampleLoads=[];
for(const path of JSON.parse(process.argv[2])) {
 const state=f.lauxlib.luaL_newstate(), bytes=fs.readFileSync(path);
 const loadStatus=f.lauxlib.luaL_loadbuffer(state,bytes,bytes.length,f.to_luastring('@official-example'));
 const item={file:path,loadStatus};
 if(loadStatus) item.error=f.to_jsstring(f.lua.lua_tostring(state,-1));
 result.officialExampleLoads.push(item);
 // Only deserialize bytecode. Official scripts may contain flight commands.
 f.lua.lua_close(state);
}
console.log(JSON.stringify(result));
"""
        example_paths = [item['binary'] for item in evidence['official_example_compilation'] if item['status'] == 'passed']
        result = run([str(args.node), '-e', js, str(binary.resolve()), json.dumps(example_paths)],
                     cwd=Path(__file__).resolve().parent.parent)
        evidence['fengari_execution'] = json.loads(result.stdout)
    (args.output / 'evidence.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--station', type=Path, default=Path('C:/PioneerStation'))
    parser.add_argument('--station2', type=Path, default=Path('C:/Program Files/Pioneer-Station-2.0'))
    parser.add_argument('--firmware-root', type=Path, required=True, help='Local repository firmware directory')
    parser.add_argument('--javap', type=Path, default=Path('C:/Program Files/Pioneer-Station-2.0/jre/bin/javap.exe'))
    parser.add_argument('--node', type=Path, help='Optional Node executable to verify numeric bytecode in Fengari')
    parser.add_argument('--output', type=Path, default=Path('.tmp/pioneer-firmware-research/repro'))
    args = parser.parse_args()
    evidence = collect(args)
    print(json.dumps({"images": len(evidence['images']), "classes": len(evidence['classes']),
                      "missing_classes": evidence['missing_classes'], "compiler": evidence['compiler'],
                      "fengari_execution": evidence.get('fengari_execution'),
                      "probe_compilation": evidence['probe_compilation'],
                      "evidence": str((args.output / 'evidence.json').resolve())}, indent=2))


if __name__ == '__main__':
    main()
