import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TARGET_FILE = resolve(__dirname, '../public/modules/environment/obstacles/marker-dictionaries.ts');

const SOURCES = [
  {
    url: 'https://raw.githubusercontent.com/opencv/opencv/4.x/modules/objdetect/src/aruco/predefined_dictionaries.hpp',
    names: [
      'DICT_ARUCO',
      'DICT_4X4_1000',
      'DICT_5X5_1000',
      'DICT_6X6_1000',
      'DICT_7X7_1000'
    ]
  },
  {
    url: 'https://raw.githubusercontent.com/opencv/opencv/4.x/modules/objdetect/src/aruco/apriltag/predefined_dictionaries_apriltag.hpp',
    names: [
      'DICT_APRILTAG_16h5',
      'DICT_APRILTAG_25h9',
      'DICT_APRILTAG_36h10',
      'DICT_APRILTAG_36h11'
    ]
  }
];

const dictionaryConfig = {
  DICT_ARUCO_ORIGINAL: { sourceName: 'DICT_ARUCO', kind: 'aruco', markerSize: 5, markerCount: 1024, label: 'DICT_ARUCO_ORIGINAL' },
  DICT_4X4_50: { sourceName: 'DICT_4X4_1000', kind: 'aruco', markerSize: 4, markerCount: 50, label: 'DICT_4X4_50' },
  DICT_4X4_100: { sourceName: 'DICT_4X4_1000', kind: 'aruco', markerSize: 4, markerCount: 100, label: 'DICT_4X4_100' },
  DICT_4X4_250: { sourceName: 'DICT_4X4_1000', kind: 'aruco', markerSize: 4, markerCount: 250, label: 'DICT_4X4_250' },
  DICT_4X4_1000: { sourceName: 'DICT_4X4_1000', kind: 'aruco', markerSize: 4, markerCount: 1000, label: 'DICT_4X4_1000' },
  DICT_5X5_50: { sourceName: 'DICT_5X5_1000', kind: 'aruco', markerSize: 5, markerCount: 50, label: 'DICT_5X5_50' },
  DICT_5X5_100: { sourceName: 'DICT_5X5_1000', kind: 'aruco', markerSize: 5, markerCount: 100, label: 'DICT_5X5_100' },
  DICT_5X5_250: { sourceName: 'DICT_5X5_1000', kind: 'aruco', markerSize: 5, markerCount: 250, label: 'DICT_5X5_250' },
  DICT_5X5_1000: { sourceName: 'DICT_5X5_1000', kind: 'aruco', markerSize: 5, markerCount: 1000, label: 'DICT_5X5_1000' },
  DICT_6X6_50: { sourceName: 'DICT_6X6_1000', kind: 'aruco', markerSize: 6, markerCount: 50, label: 'DICT_6X6_50' },
  DICT_6X6_100: { sourceName: 'DICT_6X6_1000', kind: 'aruco', markerSize: 6, markerCount: 100, label: 'DICT_6X6_100' },
  DICT_6X6_250: { sourceName: 'DICT_6X6_1000', kind: 'aruco', markerSize: 6, markerCount: 250, label: 'DICT_6X6_250' },
  DICT_6X6_1000: { sourceName: 'DICT_6X6_1000', kind: 'aruco', markerSize: 6, markerCount: 1000, label: 'DICT_6X6_1000' },
  DICT_7X7_50: { sourceName: 'DICT_7X7_1000', kind: 'aruco', markerSize: 7, markerCount: 50, label: 'DICT_7X7_50' },
  DICT_7X7_100: { sourceName: 'DICT_7X7_1000', kind: 'aruco', markerSize: 7, markerCount: 100, label: 'DICT_7X7_100' },
  DICT_7X7_250: { sourceName: 'DICT_7X7_1000', kind: 'aruco', markerSize: 7, markerCount: 250, label: 'DICT_7X7_250' },
  DICT_7X7_1000: { sourceName: 'DICT_7X7_1000', kind: 'aruco', markerSize: 7, markerCount: 1000, label: 'DICT_7X7_1000' },
  DICT_APRILTAG_16h5: { sourceName: 'DICT_APRILTAG_16h5', kind: 'apriltag', markerSize: 4, markerCount: 30, label: 'tag16h5' },
  DICT_APRILTAG_25h9: { sourceName: 'DICT_APRILTAG_25h9', kind: 'apriltag', markerSize: 5, markerCount: 35, label: 'tag25h9' },
  DICT_APRILTAG_36h10: { sourceName: 'DICT_APRILTAG_36h10', kind: 'apriltag', markerSize: 6, markerCount: 2320, label: 'tag36h10' },
  DICT_APRILTAG_36h11: { sourceName: 'DICT_APRILTAG_36h11', kind: 'apriltag', markerSize: 6, markerCount: 587, label: 'tag36h11' }
} ;

function parseSourceArrays(sourceText, allowedNames) {
  const arrays = new Map();
  const regex = /static unsigned char\s+([A-Za-z0-9_]+)_BYTES\[\]\[4\]\[(\d+)\]\s*=\s*\{([\s\S]*?)\}\s*;/g;
  for (const match of sourceText.matchAll(regex)) {
    const name = match[1];
    if (!allowedNames.includes(name)) continue;
    const byteWidth = Number.parseInt(match[2], 10);
    const numbers = (match[3].match(/\d+/g) || []).map((value) => Number.parseInt(value, 10));
    const markerStride = byteWidth * 4;
    const markerCount = Math.floor(numbers.length / markerStride);
    const firstRotation = [];
    for (let index = 0; index < markerCount; index++) {
      const start = index * markerStride;
      firstRotation.push(numbers.slice(start, start + byteWidth));
    }
    arrays.set(name, { byteWidth, firstRotation });
  }
  return arrays;
}

function formatDataBlock(data) {
  return JSON.stringify(data)
    .replace(/\],\[/g, '], [')
    .replace(/\[\[/g, '[[')
    .replace(/\]\]/g, ']]');
}

async function loadSources() {
  const parsed = new Map();
  for (const source of SOURCES) {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to download ${source.url}: ${response.status}`);
    }
    const text = await response.text();
    const arrays = parseSourceArrays(text, source.names);
    for (const [name, value] of arrays.entries()) parsed.set(name, value);
  }
  return parsed;
}

async function main() {
  const parsedSources = await loadSources();
  const output = [];

  output.push('/* Auto-generated from official OpenCV predefined marker dictionaries. */');
  output.push('export type MarkerDictionaryKind = \'aruco\' | \'apriltag\';');
  output.push('');
  output.push('export interface MarkerDictionaryDefinition {');
  output.push('    kind: MarkerDictionaryKind;');
  output.push('    markerSize: number;');
  output.push('    markerCount: number;');
  output.push('    label: string;');
  output.push('    firstRotationBytes: number[][];');
  output.push('}');
  output.push('');
  output.push('export const DEFAULT_ARUCO_DICTIONARY = \'DICT_6X6_250\' as const;');
  output.push('export const DEFAULT_APRILTAG_DICTIONARY = \'DICT_APRILTAG_36h11\' as const;');
  output.push('');
  output.push('export const MARKER_DICTIONARIES = {');

  for (const [dictionaryId, config] of Object.entries(dictionaryConfig)) {
    const source = parsedSources.get(config.sourceName);
    if (!source) throw new Error(`Missing source dictionary ${config.sourceName}`);
    const rows = source.firstRotation.slice(0, config.markerCount);
    output.push(`    ${dictionaryId}: {`);
    output.push(`        kind: '${config.kind}',`);
    output.push(`        markerSize: ${config.markerSize},`);
    output.push(`        markerCount: ${config.markerCount},`);
    output.push(`        label: '${config.label}',`);
    output.push(`        firstRotationBytes: ${formatDataBlock(rows)}`);
    output.push('    },');
  }

  output.push('} as const satisfies Record<string, MarkerDictionaryDefinition>;');
  output.push('');
  output.push('export type MarkerDictionaryId = keyof typeof MARKER_DICTIONARIES;');
  output.push('');
  output.push('export const MARKER_DICTIONARY_OPTIONS = {');

  const groups = { aruco: [], apriltag: [] };
  for (const [dictionaryId, config] of Object.entries(dictionaryConfig)) {
    groups[config.kind].push(`        { id: '${dictionaryId}', label: '${config.label}' }`);
  }

  output.push('    aruco: [');
  output.push(groups.aruco.join(',\n'));
  output.push('    ],');
  output.push('    apriltag: [');
  output.push(groups.apriltag.join(',\n'));
  output.push('    ]');
  output.push('} as const;');

  await writeFile(TARGET_FILE, `${output.join('\n')}\n`, 'utf8');
  console.log(`Generated ${TARGET_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
