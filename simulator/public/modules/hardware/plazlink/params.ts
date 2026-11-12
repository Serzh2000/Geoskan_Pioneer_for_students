import { PlazlinkError, type PlazlinkClient } from './client.js';
import { MESSAGE_ID } from './frame.js';

/*
 * Autopilot parameters ("Параметры автопилота", the .properties profile) over Plazlink. Messages 5, 6 and 7 of the
 * protocol Pioneer Station calls ReqParam, ParamInfo and Param:
 *   request  (5): index, or 255 to ask how many parameters there are
 *   count    (6): one byte
 *   param    (7): index (1 byte) + value (float32, little-endian) + name (32 bytes, padded with zeros)
 * Sending a Param message writes the value; the drone answers with the same message, and we read it back to be sure.
 * Every value is a float32, so 0.07 comes back as 0.0700000003: compare with Math.fround.
 */

export const PARAM_NAME_BYTES = 32;
/** Index value of a request that asks for the number of parameters instead of one parameter. */
export const PARAM_COUNT_QUERY = 255;
const PARAM_PAYLOAD_BYTES = 1 + 4 + PARAM_NAME_BYTES;

export interface DroneParam {
    index: number;
    name: string;
    value: number;
}

export function sameFloat32(a: number, b: number): boolean {
    return Math.fround(a) === Math.fround(b);
}

/** A float32 shown the way a person wrote it: 0.0700000003 becomes 0.07. */
export function cleanFloat32(value: number): number {
    return Number(Math.fround(value).toPrecision(7));
}

export function encodeParam(index: number, name: string, value: number): Uint8Array {
    const nameBytes = new TextEncoder().encode(name);
    if (nameBytes.length === 0 || nameBytes.length >= PARAM_NAME_BYTES) {
        throw new RangeError(`Имя параметра «${name}» не помещается в ${PARAM_NAME_BYTES - 1} байт.`);
    }
    if (!Number.isInteger(index) || index < 0 || index >= PARAM_COUNT_QUERY) throw new RangeError(`Индекс параметра вне диапазона: ${index}.`);
    const out = new Uint8Array(PARAM_PAYLOAD_BYTES);
    const view = new DataView(out.buffer);
    out[0] = index;
    view.setFloat32(1, value, true);
    out.set(nameBytes, 5);
    return out;
}

export function decodeParam(payload: Uint8Array): DroneParam | null {
    if (payload.length < 6) return null;
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const nameField = payload.subarray(5, 5 + PARAM_NAME_BYTES);
    const end = nameField.indexOf(0);
    const name = new TextDecoder().decode(end < 0 ? nameField : nameField.subarray(0, end));
    return { index: payload[0], name, value: view.getFloat32(1, true) };
}

export async function readParamCount(client: PlazlinkClient): Promise<number> {
    const reply = await client.request(MESSAGE_ID.paramRequest, [PARAM_COUNT_QUERY], MESSAGE_ID.paramCount);
    return reply[0];
}

export async function readParam(client: PlazlinkClient, index: number): Promise<DroneParam> {
    const reply = await client.request(MESSAGE_ID.paramRequest, [index], MESSAGE_ID.param, (p) => p[0] === index);
    const param = decodeParam(reply);
    if (!param || !param.name) throw new PlazlinkError(`Дрон прислал параметр ${index} в непонятном виде.`, 'protocol');
    return param;
}

export async function readAllParams(client: PlazlinkClient, onProgress?: (done: number, total: number) => void): Promise<DroneParam[]> {
    const total = await readParamCount(client);
    if (total === 0) throw new PlazlinkError('Дрон сообщил, что у него нет параметров автопилота.', 'protocol');
    const params: DroneParam[] = [];
    for (let index = 0; index < total; index += 1) {
        params.push(await readParam(client, index));
        onProgress?.(index + 1, total);
    }
    return params;
}

/** Writes one value and reads it back; throws when the drone did not keep it. Returns the value the drone now holds. */
export async function writeParam(client: PlazlinkClient, param: { index: number; name: string }, value: number): Promise<number> {
    const echo = await client.request(MESSAGE_ID.param, encodeParam(param.index, param.name, value), MESSAGE_ID.param, (p) => p[0] === param.index);
    const decoded = decodeParam(echo);
    if (decoded && decoded.name && decoded.name !== param.name) {
        throw new PlazlinkError(`Индекс ${param.index} на этом дроне — «${decoded.name}», а не «${param.name}». Перечитайте параметры.`, 'protocol');
    }
    const stored = (await readParam(client, param.index)).value;
    if (!sameFloat32(stored, value)) {
        throw new PlazlinkError(`Дрон не сохранил ${param.name}: записано ${value}, после чтения ${cleanFloat32(stored)}.`, 'refused');
    }
    return stored;
}
