import type { ScriptLanguage } from '../api-docs/sections.js';
import type { GuideChapter } from './types.js';
import { GUIDE_CHAPTER_IDS } from './curriculum-shared.js';
import { buildLuaChapters } from './curriculum-lua.js';
import { buildPythonChapters } from './curriculum-python.js';

export { GUIDE_CHAPTER_IDS } from './curriculum-shared.js';

export function getGuideChapters(language: ScriptLanguage): GuideChapter[] {
    return language === 'python' ? buildPythonChapters() : buildLuaChapters();
}
