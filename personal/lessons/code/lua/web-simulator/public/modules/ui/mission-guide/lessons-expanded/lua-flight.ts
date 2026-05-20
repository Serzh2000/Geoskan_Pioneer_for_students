import { createEventBlock, createStatementBlock, createTimerBlock } from '../lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getLuaFlightExpandedLessons(): GuideLesson[] {
    return [
        {
            id: 'lua-route',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Р—Р°РґР°РЅРёРµ 7',
            title: 'РџРѕР»РµС‚ Рє Р»РѕРєР°Р»СЊРЅРѕР№ С‚РѕС‡РєРµ',
            goal: 'РЎРѕР±РµСЂРёС‚Рµ FSM-С†РµРїРѕС‡РєСѓ, РіРґРµ `goToLocalPoint(...)` РІС‹Р·С‹РІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ СЃРѕР±С‹С‚РёСЏ `TAKEOFF_COMPLETE`.',
            summary: 'РЈСЂРѕРє РѕС‚РґРµР»СЏРµС‚ СЃР°Рј С„Р°РєС‚ РІР·Р»РµС‚Р° РѕС‚ РЅР°С‡Р°Р»Р° РЅР°РІРёРіР°С†РёРё Рё РїРѕРєР°Р·С‹РІР°РµС‚, С‡С‚Рѕ РјР°СЂС€СЂСѓС‚ С‚РѕР¶Рµ РґРѕР»Р¶РµРЅ РёРјРµС‚СЊ СЃРІРѕР№ РѕСЃРјС‹СЃР»РµРЅРЅС‹Р№ РјРѕРјРµРЅС‚ Р·Р°РїСѓСЃРєР°.',
            lessonIntro: 'Р’ Р»РёРЅРµР№РЅРѕРј СЃРєСЂРёРїС‚Рµ РјС‹ РёСЃРїРѕР»СЊР·РѕРІР°Р»Рё РїР°СѓР·С‹. Р’ FSM РјС‹ РѕР¶РёРґР°РµРј СЃРѕР±С‹С‚РёРµ `TAKEOFF_COMPLETE`, Рё С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ СЌС‚РѕРіРѕ РѕС‚РїСЂР°РІР»СЏРµРј РґСЂРѕРЅ Рє Р»РѕРєР°Р»СЊРЅРѕР№ С‚РѕС‡РєРµ.',
            expectedOutcome: 'Р’С‹Р·С‹РІР°РµС‚СЃСЏ СЃРѕР±С‹С‚РёРµ `PREFLIGHT`, РЅР° `ENGINES_STARTED` РІС‹РґР°РµС‚СЃСЏ `TAKEOFF`, Р° РЅР° `TAKEOFF_COMPLETE` РІС‹Р·С‹РІР°РµС‚СЃСЏ `ap.goToLocalPoint(...)`.',
            builderHint: 'РЎР»РµРґРёС‚Рµ Р·Р° С‚РµРј, С‡С‚РѕР±С‹ `goToLocalPoint(...)` РІС‹Р·С‹РІР°Р»СЃСЏ РІ Р±Р»РѕРєРµ `TAKEOFF_COMPLETE`, Р° РЅРµ СЃСЂР°Р·Сѓ РІ СЃС‚Р°СЂС‚РѕРІРѕРј.',
            apiFocus: [
                apiFocus('Ev.TAKEOFF_COMPLETE', 'РЎРѕР±С‹С‚РёРµ, СЃРёРіРЅР°Р»РёР·РёСЂСѓСЋС‰РµРµ, С‡С‚Рѕ РІР·Р»РµС‚ Р·Р°РІРµСЂС€РµРЅ Рё РґСЂРѕРЅ РіРѕС‚РѕРІ Рє РЅР°РІРёРіР°С†РёРё.', 'if event == Ev.TAKEOFF_COMPLETE then ... end'),
                apiFocus('ap.goToLocalPoint(x, y, z)', 'РћС‚РїСЂР°РІР»СЏРµС‚ РґСЂРѕРЅ Рє Р»РѕРєР°Р»СЊРЅРѕР№ РєРѕРѕСЂРґРёРЅР°С‚Рµ РїРѕСЃР»Рµ РІР·Р»РµС‚Р°.', 'ap.goToLocalPoint(1, 0, 1)')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua8-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'РџРѕРґРіРѕС‚РѕРІРєР° Рє РїРѕР»РµС‚Сѓ.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua8-engines', 'СЃРѕР±С‹С‚РёРµ ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'РћР¶РёРґР°РЅРёРµ СЃС‚Р°СЂС‚Р° РјРѕС‚РѕСЂРѕРІ.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua8-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'РљРѕРјР°РЅРґР° РІР·Р»РµС‚Р°.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua8-complete', 'СЃРѕР±С‹С‚РёРµ TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'РЎРёРіРЅР°Р» Р·Р°РІРµСЂС€РµРЅРёСЏ РІР·Р»РµС‚Р°.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua8-goto', 'РїРѕР»РµС‚ Рє С‚РѕС‡РєРµ', 'ap.goToLocalPoint(1, 0, 1)', 'Р¦РµР»РµРІРѕР№ РјР°СЂС€СЂСѓС‚.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createStatementBlock('lua8-print', 'СЃРѕРѕР±С‰РµРЅРёРµ РІ РєРѕРЅСЃРѕР»СЊ', 'print("РњР°СЂС€СЂСѓС‚ РѕС‚РїСЂР°РІР»РµРЅ")', 'Р›РѕРіРёСЂРѕРІР°РЅРёРµ С€Р°РіР°.', 'check', 'print("РњР°СЂС€СЂСѓС‚ РѕС‚РїСЂР°РІР»РµРЅ")'),
                createStatementBlock('lua_callback_open', 'СЃРѕР·РґР°С‚СЊ callback', 'function callback(event)', 'РћРїСЂРµРґРµР»РµРЅРёРµ С„СѓРЅРєС†РёРё.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'Р·Р°РєСЂС‹С‚СЊ callback', 'end', 'Р—Р°РєСЂС‹С‚РёРµ С„СѓРЅРєС†РёРё.', 'setup', 'end')
            ],
            links: [
                { label: 'Ev.TAKEOFF_COMPLETE', query: 'Ev.TAKEOFF_COMPLETE' },
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' }
            ],
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)\n\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end\n\n    if event == Ev.TAKEOFF_COMPLETE then\n        ap.goToLocalPoint(1, 0, 1)\n    end\nend`,
            actionLabel: 'РћС‚РєСЂС‹С‚СЊ РјР°СЂС€СЂСѓС‚',
            actionQuery: 'Ev.TAKEOFF_COMPLETE ap.goToLocalPoint',
            actionPreviewKey: 'ap.goToLocalPoint',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'РњР°СЂС€СЂСѓС‚ РѕС‚РїСЂР°РІР»РµРЅ СЃР»РёС€РєРѕРј СЂР°РЅРѕ',
                    reason: 'Р‘РµР· РїРѕРґРіРѕС‚РѕРІРєРё Рё РІР·Р»РµС‚Р° РєРѕРјР°РЅРґР° `goToLocalPoint(...)` РЅРµ РѕС‚СЂР°Р¶Р°РµС‚ РєРѕСЂСЂРµРєС‚РЅС‹Р№ СЌС‚Р°Рї РјРёСЃСЃРёРё.',
                    fix: 'РЎРЅР°С‡Р°Р»Р° СЃРѕР±РµСЂРёС‚Рµ С†РµРїРѕС‡РєСѓ РІР·Р»РµС‚Р°, Р·Р°С‚РµРј РїРµСЂРµС…РѕРґРёС‚Рµ Рє РјР°СЂС€СЂСѓС‚Сѓ РІ `TAKEOFF_COMPLETE`.'
                }
            ],
            missingBlockDiagnostics: {
                lua_ap_push: {
                    kind: 'error',
                    title: 'РќРµС‚ РєРѕРјР°РЅРґС‹ РїРѕРґРіРѕС‚РѕРІРєРё',
                    reason: 'РќРµС‚ РєРѕРјР°РЅРґ РґР»СЏ РїРѕРґРіРѕС‚РѕРІРєРё Рє РІР·Р»РµС‚Сѓ.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ РєРѕРјР°РЅРґС‹ `PREFLIGHT` Рё `TAKEOFF`.'
                },
                lua_event_callback: {
                    kind: 'error',
                    title: 'РќРµ С…РІР°С‚Р°РµС‚ РѕР±СЂР°Р±РѕС‚РєРё СЃРѕР±С‹С‚РёР№',
                    reason: 'РЎС†РµРЅР°СЂРёР№ РґРѕР»Р¶РµРЅ СЂРµР°РіРёСЂРѕРІР°С‚СЊ РЅР° СЃРѕР±С‹С‚РёСЏ `ENGINES_STARTED` Рё `TAKEOFF_COMPLETE`.',
                    fix: 'РСЃРїРѕР»СЊР·СѓР№С‚Рµ РѕР±СЂР°Р±РѕС‚С‡РёРєРё `ENGINES_STARTED` Рё `TAKEOFF_COMPLETE`.'
                },
                lua_goto_local_point: {
                    kind: 'error',
                    title: 'РќРµС‚ РєРѕРјР°РЅРґС‹ РјР°СЂС€СЂСѓС‚Р°',
                    reason: 'РЈСЂРѕРє С‚СЂРµР±СѓРµС‚ РїРµСЂРµС…РѕРґ РёРјРµРЅРЅРѕ Рє Р»РѕРєР°Р»СЊРЅРѕР№ С‚РѕС‡РєРµ.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ `goToLocalPoint(...)` РІ СЃРѕР±С‹С‚РёРё `TAKEOFF_COMPLETE`.'
                },
                'lua_callback_open': {
                    kind: 'error',
                    title: 'РќРµС‚ С„СѓРЅРєС†РёРё callback',
                    reason: 'РќРµ РѕР±СЉСЏРІР»РµРЅР° С„СѓРЅРєС†РёСЏ callback.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ РѕР±СЉСЏРІР»РµРЅРёРµ С„СѓРЅРєС†РёРё callback.'
                },
                'lua_callback_end': {
                    kind: 'error',
                    title: 'РќРµС‚ РєРѕРЅС†Р° callback',
                    reason: 'Р¤СѓРЅРєС†РёСЏ callback РЅРµ Р·Р°РєСЂС‹С‚Р°.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ `end` РґР»СЏ С„СѓРЅРєС†РёРё callback.'
                }
            },
            extraBlockDiagnostics: {
                lua_print: {
                    kind: 'warning',
                    title: 'Р›РёС€РЅРёР№ РІС‹РІРѕРґ',
                    reason: 'Р’С‹РІРѕРґ РІ РєРѕРЅСЃРѕР»СЊ РЅРµ С‚СЂРµР±СѓРµС‚СЃСЏ.',
                    fix: 'РЈРґР°Р»РёС‚Рµ Р±Р»РѕРє РІС‹РІРѕРґР° РІ РєРѕРЅСЃРѕР»СЊ.'
                }
            },
            orderRules: [
                {
                    before: 'lua_ap_push',
                    after: 'lua_event_callback',
                    title: 'РџРѕСЂСЏРґРѕРє РєРѕРјР°РЅРґ',
                    reason: 'РџРѕРґРіРѕС‚РѕРІРєР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РґРѕ СЃРѕР±С‹С‚РёР№.',
                    fix: 'РџРµСЂРµРјРµСЃС‚РёС‚Рµ `PREFLIGHT` РІ РЅР°С‡Р°Р»Рѕ.'
                }
            ],
            compile: compileLuaEvents
        },
        {
            id: 'lua-point-confirm',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Р—Р°РґР°РЅРёРµ 8',
            title: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РґРѕСЃС‚РёР¶РµРЅРёСЏ С‚РѕС‡РєРё',
            goal: 'Р”РѕР±Р°РІСЊС‚Рµ РѕР¶РёРґР°РЅРёРµ СЃРѕР±С‹С‚РёСЏ `POINT_REACHED` Рё С‚РѕР»СЊРєРѕ Р·Р°С‚РµРј РІС‹РІРµРґРёС‚Рµ СЃРѕРѕР±С‰РµРЅРёРµ РѕР± СѓСЃРїРµС…Рµ.',
            summary: 'РЈСЂРѕРє Р·Р°РєСЂРµРїР»СЏРµС‚ РєР»СЋС‡РµРІСѓСЋ РјС‹СЃР»СЊ: РѕС‚РїСЂР°РІРєР° РјР°СЂС€СЂСѓС‚Р° Рё Р·Р°РІРµСЂС€РµРЅРёРµ РјР°СЂС€СЂСѓС‚Р° СЌС‚Рѕ СЂР°Р·РЅС‹Рµ РІРµС‰Рё.',
            lessonIntro: 'Р’ FSM Р°СЂС…РёС‚РµРєС‚СѓСЂРµ РґРѕСЃС‚РёР¶РµРЅРёРµ С‚РѕС‡РєРё РїРѕРґС‚РІРµСЂР¶РґР°РµС‚СЃСЏ РѕС‚РґРµР»СЊРЅС‹Рј СЃРѕР±С‹С‚РёРµРј `POINT_REACHED`. РћР±СЂР°Р±РѕС‚Р°Р№С‚Рµ РµРіРѕ.',
            expectedOutcome: 'РЎС†РµРЅР°СЂРёР№ РґРѕР»РµС‚Р°РµС‚ РґРѕ С‚РѕС‡РєРё, РѕР±СЂР°Р±Р°С‚С‹РІР°РµС‚ `POINT_REACHED` Рё РїРµС‡Р°С‚Р°РµС‚ СЃРѕРѕР±С‰РµРЅРёРµ.',
            builderHint: 'РќРµ РїСѓС‚Р°Р№С‚Рµ СЃРѕР±С‹С‚РёСЏ. Р’С‹РІРѕРґ СЃРѕРѕР±С‰РµРЅРёСЏ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ Р±Р»РѕРєРµ `POINT_REACHED`.',
            apiFocus: [
                apiFocus('Ev.POINT_REACHED', 'РЎРѕР±С‹С‚РёРµ, РєРѕРіРґР° РґСЂРѕРЅ РґРµР№СЃС‚РІРёС‚РµР»СЊРЅРѕ РґРѕСЃС‚РёРі Р·Р°РґР°РЅРЅРѕР№ РєРѕРѕСЂРґРёРЅР°С‚С‹.', 'if event == Ev.POINT_REACHED then ... end'),
                apiFocus('print(...)', 'РўРµРєСЃС‚РѕРІРѕРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ.', 'print("РўРѕС‡РєР° РґРѕСЃС‚РёРіРЅСѓС‚Р°")')
            ],
            targetBlockIds: ['lua_ap_push', 'lua_event_callback', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_event_callback', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
            blocks: [
                createStatementBlock('lua9-preflight', 'PREFLIGHT', 'ap.push(Ev.MCE_PREFLIGHT)', 'РџРѕРґРіРѕС‚РѕРІРєР°.', 'setup', 'ap.push(Ev.MCE_PREFLIGHT)'),
                createEventBlock('lua9-engines', 'СЃРѕР±С‹С‚РёРµ ENGINES_STARTED', 'if event == Ev.ENGINES_STARTED', 'РћР¶РёРґР°РЅРёРµ.', 'Ev.ENGINES_STARTED'),
                createStatementBlock('lua9-takeoff', 'TAKEOFF', 'ap.push(Ev.MCE_TAKEOFF)', 'Р’Р·Р»РµС‚.', 'action', 'ap.push(Ev.MCE_TAKEOFF)'),
                createEventBlock('lua9-complete', 'СЃРѕР±С‹С‚РёРµ TAKEOFF_COMPLETE', 'if event == Ev.TAKEOFF_COMPLETE', 'Р—Р°РІРµСЂС€РµРЅРёРµ РІР·Р»РµС‚Р°.', 'Ev.TAKEOFF_COMPLETE'),
                createStatementBlock('lua9-goto', 'РјР°СЂС€СЂСѓС‚', 'ap.goToLocalPoint(1, 0, 1)', 'РЎС‚Р°СЂС‚ РјР°СЂС€СЂСѓС‚Р°.', 'action', 'ap.goToLocalPoint(1, 0, 1)'),
                createEventBlock('lua9-point', 'СЃРѕР±С‹С‚РёРµ POINT_REACHED', 'if event == Ev.POINT_REACHED', 'РўРѕС‡РєР° РґРѕСЃС‚РёРіРЅСѓС‚Р°.', 'Ev.POINT_REACHED'),
                createStatementBlock('lua9-print', 'СЃРѕРѕР±С‰РёС‚СЊ РѕР± СѓСЃРїРµС…Рµ', 'print("РўРѕС‡РєР° РґРѕСЃС‚РёРіРЅСѓС‚Р°")', 'РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ.', 'check', 'print("РўРѕС‡РєР° РґРѕСЃС‚РёРіРЅСѓС‚Р°")'),
                createStatementBlock('lua_callback_open', 'СЃРѕР·РґР°С‚СЊ callback', 'function callback(event)', 'Р¤СѓРЅРєС†РёСЏ.', 'setup', 'function callback(event)'),
                createStatementBlock('lua_callback_end', 'Р·Р°РєСЂС‹С‚СЊ callback', 'end', 'РљРѕРЅРµС†.', 'setup', 'end')
            ],
            links: [
                { label: 'Ev.POINT_REACHED', query: 'Ev.POINT_REACHED' },
                { label: 'ap.goToLocalPoint', query: 'ap.goToLocalPoint', previewKey: 'ap.goToLocalPoint' }
            ],
            solutionCode: `ap.push(Ev.MCE_PREFLIGHT)\n\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end\n\n    if event == Ev.TAKEOFF_COMPLETE then\n        ap.goToLocalPoint(1, 0, 1)\n    end\n\n    if event == Ev.POINT_REACHED then\n        print("РўРѕС‡РєР° РґРѕСЃС‚РёРіРЅСѓС‚Р°")\n    end\nend`,
            actionLabel: 'Р”РѕР¶РґР°С‚СЊСЃСЏ С‚РѕС‡РєРё',
            actionQuery: 'Ev.POINT_REACHED ap.goToLocalPoint print',
            actionPreviewKey: 'ap.goToLocalPoint',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'РќРµС‚ РѕР¶РёРґР°РЅРёСЏ С‚РѕС‡РєРё',
                    reason: 'Р‘РµР· РѕР¶РёРґР°РЅРёСЏ `POINT_REACHED` РјРёСЃСЃРёСЏ РјРѕР¶РµС‚ Р·Р°РІРµСЂС€РёС‚СЊСЃСЏ СЃР»РёС€РєРѕРј СЂР°РЅРѕ.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ РїСЂРѕРІРµСЂРєСѓ СЃРѕР±С‹С‚РёСЏ `POINT_REACHED`.'
                }
            ],
            missingBlockDiagnostics: {
                lua_goto_local_point: {
                    kind: 'error',
                    title: 'РќРµС‚ РєРѕРјР°РЅРґС‹ РјР°СЂС€СЂСѓС‚Р°',
                    reason: 'РћС‚СЃСѓС‚СЃС‚РІСѓРµС‚ РІС‹Р·РѕРІ `goToLocalPoint`.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ `goToLocalPoint(...)`.'
                },
                lua_print: {
                    kind: 'error',
                    title: 'РќРµС‚ РІС‹РІРѕРґР° РІ РєРѕРЅСЃРѕР»СЊ',
                    reason: 'РўСЂРµР±СѓРµС‚СЃСЏ РїРѕРґС‚РІРµСЂРґРёС‚СЊ РґРѕСЃС‚РёР¶РµРЅРёРµ С‚РѕС‡РєРё.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ РІС‹РІРѕРґ РІ СЃРѕР±С‹С‚РёРё `POINT_REACHED`.'
                },
                'lua_callback_open': {
                    kind: 'error',
                    title: 'РќРµС‚ С„СѓРЅРєС†РёРё callback',
                    reason: 'РћС‚СЃСѓС‚СЃС‚РІСѓРµС‚ callback.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ С„СѓРЅРєС†РёСЋ callback.'
                },
                'lua_callback_end': {
                    kind: 'error',
                    title: 'РќРµС‚ РєРѕРЅС†Р° callback',
                    reason: 'Р¤СѓРЅРєС†РёСЏ callback РЅРµ Р·Р°РєСЂС‹С‚Р°.',
                    fix: 'Р”РѕР±Р°РІСЊС‚Рµ `end`.'
                }
            },
            extraBlockDiagnostics: {},
            orderRules: [],
            compile: compileLuaEvents
        }
    ];
}
