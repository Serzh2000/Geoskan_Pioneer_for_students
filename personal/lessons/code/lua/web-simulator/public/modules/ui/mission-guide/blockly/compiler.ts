import * as Blockly from 'blockly';
import type { ScriptLanguage } from '../../api-docs/sections.js';

export { Blockly };

function quoteString(value: string): string {
    return JSON.stringify(value);
}

function indentLines(lines: string[], indent = '    '): string[] {
    return lines.map((line) => `${indent}${line}`);
}

function trimBlankLines(lines: string[]): string[] {
    const output = [...lines];
    while (output[0] === '') output.shift();
    while (output[output.length - 1] === '') output.pop();
    return output;
}

function appendSeparated(target: string[], lines: string[]): void {
    const normalized = trimBlankLines(lines);
    if (!normalized.length) return;
    if (target.length && target[target.length - 1] !== '') {
        target.push('');
    }
    target.push(...normalized);
}

function collectLuaCallbackBody(startBlock: Blockly.Block): { bodyLines: string[]; nextBlock: Blockly.Block | null } {
    const bodyLines: string[] = [];
    let current = startBlock.getNextBlock();

    while (current && current.type !== 'lua_callback_end') {
        appendSeparated(bodyLines, compileLuaBlock(current));
        current = current.getNextBlock();
    }

    return {
        bodyLines: trimBlankLines(bodyLines),
        nextBlock: current?.getNextBlock() || null
    };
}

function compileLuaBlock(block: Blockly.Block): string[] {
    switch (block.type) {
        case 'lua_ledbar_new':
            return [`local leds = Ledbar.new(${block.getFieldValue('COUNT')})`];
        case 'lua_led_set':
            return [
                `leds:set(${block.getFieldValue('INDEX')}, ${block.getFieldValue('R')}, ${block.getFieldValue('G')}, ${block.getFieldValue('B')})`
            ];
        case 'lua_print':
            return [`print(${quoteString(block.getFieldValue('TEXT') || '')})`];
        case 'lua_ap_push':
            return [`ap.push(${block.getFieldValue('EVENT')})`];
        case 'lua_goto_local_point':
            return [
                `ap.goToLocalPoint(${block.getFieldValue('X')}, ${block.getFieldValue('Y')}, ${block.getFieldValue('Z')})`
            ];
        case 'lua_timer_calllater': {
            const body = compileLuaChain(block.getInputTargetBlock('CALLBACK'));
            return [
                `Timer.callLater(${block.getFieldValue('DELAY')}, function()`,
                ...indentLines(body.length ? body : ['print("Timer callback is empty")']),
                'end)'
            ];
        }
        case 'lua_event_callback': {
            const body = compileLuaChain(block.getInputTargetBlock('DO'));
            return [
                `if event == ${block.getFieldValue('EVENT')} then`,
                ...indentLines(body.length ? body : ['print("Event callback is empty")']),
                'end'
            ];
        }
        case 'lua_callback_open':
        case 'lua_callback_end':
        case 'lua-callback-stub':
            return [];
        default:
            return [`-- Unsupported block: ${block.type}`];
    }
}

function compileLuaChain(startBlock: Blockly.Block | null): string[] {
    const lines: string[] = [];
    let current: Blockly.Block | null = startBlock;

    while (current) {
        appendSeparated(lines, compileLuaBlock(current));
        current = current.getNextBlock();
    }

    return trimBlankLines(lines);
}

function compileLuaWorkspace(workspace: Blockly.WorkspaceSvg): string {
    const rootLines: string[] = [];
    const callbackBodyLines: string[] = [];
    const hasExplicitCallback = workspace.getAllBlocks(false).some((block) => block.type === 'lua_callback_open');
    const hasLegacyCallbackStub = workspace.getAllBlocks(false).some((block) => block.type === 'lua-callback-stub');

    workspace.getTopBlocks(true).forEach((topBlock) => {
        let current: Blockly.Block | null = topBlock;
        while (current) {
            if (current.type === 'lua_callback_open') {
                const callbackBody = collectLuaCallbackBody(current);
                appendSeparated(callbackBodyLines, callbackBody.bodyLines);
                current = callbackBody.nextBlock;
                continue;
            }

            if (current.type === 'lua_callback_end') {
                current = current.getNextBlock();
                continue;
            }

            if (current.type === 'lua-callback-stub') {
                current = current.getNextBlock();
                continue;
            }

            if (current.type === 'lua_event_callback' && !hasExplicitCallback && hasLegacyCallbackStub) {
                appendSeparated(callbackBodyLines, compileLuaBlock(current));
            } else {
                appendSeparated(rootLines, compileLuaBlock(current));
            }
            current = current.getNextBlock();
        }
    });

    const output = [...rootLines];
    if (hasExplicitCallback || (hasLegacyCallbackStub && callbackBodyLines.length)) {
        if (output.length) output.push('');
        output.push('function callback(event)');
        output.push(...indentLines(callbackBodyLines));
        output.push('end');
    }

    return trimBlankLines(output).join('\n');
}

function compilePythonBlock(block: Blockly.Block): string[] {
    switch (block.type) {
        case 'py_led_control':
            return [
                `pioneer.led_control(r=${block.getFieldValue('R')}, g=${block.getFieldValue('G')}, b=${block.getFieldValue('B')})`
            ];
        case 'py_time_sleep':
            return [`time.sleep(${block.getFieldValue('TIME')})`];
        case 'py_print':
            return [`print(${quoteString(block.getFieldValue('TEXT') || '')})`];
        case 'py_arm':
            return ['pioneer.arm()'];
        case 'py_takeoff':
            return ['pioneer.takeoff()'];
        case 'py_land':
            return ['pioneer.land()'];
        case 'py_goto_local_point':
            return [
                `pioneer.go_to_local_point(x=${block.getFieldValue('X')}, y=${block.getFieldValue('Y')}, z=${block.getFieldValue('Z')})`
            ];
        case 'py_wait_point_reached':
            return ['while not pioneer.point_reached():', '    time.sleep(0.05)'];
        default:
            return [`# Unsupported block: ${block.type}`];
    }
}

function compilePythonWorkspace(workspace: Blockly.WorkspaceSvg): string {
    const bodyLines: string[] = [];

    workspace.getTopBlocks(true).forEach((topBlock) => {
        let current: Blockly.Block | null = topBlock;
        while (current) {
            appendSeparated(bodyLines, compilePythonBlock(current));
            current = current.getNextBlock();
        }
    });

    const lines = [
        '# Pioneer Python Script',
        'from pioneer_sdk import Pioneer',
        'import time',
        '',
        'pioneer = Pioneer(simulator=True)',
        '',
        ...bodyLines,
        '',
        'pioneer.close_connection()'
    ];

    return trimBlankLines(lines).join('\n');
}

function collectWorkspaceSequence(block: Blockly.Block | null, sequence: string[]): void {
    let current = block;
    while (current) {
        sequence.push(current.type);
        current.inputList.forEach((input) => {
            const child = input.connection?.targetBlock() || null;
            if (child) {
                collectWorkspaceSequence(child, sequence);
            }
        });
        current = current.getNextBlock();
    }
}

export function compileMissionGuideWorkspace(language: ScriptLanguage, workspace: Blockly.WorkspaceSvg): string {
    return language === 'lua'
        ? compileLuaWorkspace(workspace)
        : compilePythonWorkspace(workspace);
}

export function extractMissionGuideSequence(workspace: Blockly.WorkspaceSvg): string[] {
    const sequence: string[] = [];
    workspace.getTopBlocks(true).forEach((topBlock) => {
        collectWorkspaceSequence(topBlock, sequence);
    });
    return sequence;
}
