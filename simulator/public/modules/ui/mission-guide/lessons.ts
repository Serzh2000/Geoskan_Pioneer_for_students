import type { ScriptLanguage } from '../api-docs/sections.js';
import { getLuaLessonState } from './lessons/catalog/lua.js';
import { getPythonLessonState } from './lessons/catalog/python.js';

export function getGuideLessonState(language: ScriptLanguage) {
    return language === 'python' ? getPythonLessonState() : getLuaLessonState();
}
