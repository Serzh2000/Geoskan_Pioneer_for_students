import type { ScriptLanguage } from '../api-docs/sections.js';

export type GuideMethodLink = {
    label: string;
    query: string;
    previewKey?: string;
};

export type GuideApiFocusItem = {
    title: string;
    summary: string;
    example?: string;
};

export type GuideDiagnosticKind = 'error' | 'warning' | 'success' | 'info';

export type GuideDiagnostic = {
    kind: GuideDiagnosticKind;
    title: string;
    reason: string;
    fix: string;
};

export type GuideBlockStyle = 'setup' | 'action' | 'wait' | 'check';

export type GuideBlockKind = 'statement' | 'timer' | 'event';

export type GuideBlock = {
    id: string;
    label: string;
    codeLabel: string;
    explanation: string;
    style: GuideBlockStyle;
    kind: GuideBlockKind;
    code: string;
    seconds?: number;
    eventName?: string;
};

export type GuideOrderRule = {
    before: string;
    after: string;
    title: string;
    reason: string;
    fix: string;
};

export type GuideTabId = 'tutorial' | 'trainer';

export type GuideThemeId = 'dark' | 'light';

export type GuidePortalPageId = 'intro' | 'lesson';

export type GuideLessonProgressState = 'locked' | 'available' | 'in_progress' | 'completed';

export type GuideTheorySection = {
    title: string;
    paragraphs: string[];
    bullets?: string[];
    takeaway?: string;
};

export type GuidePracticeTask = {
    lessonId: string;
    title: string;
    summary: string;
    difficulty: 'basic' | 'intermediate' | 'advanced';
};

export type GuideChapter = {
    id: string;
    badge: string;
    title: string;
    summary: string;
    theoryIntro: string;
    theorySections: GuideTheorySection[];
    practiceHeading: string;
    practiceIntro: string;
    practiceTasks: GuidePracticeTask[];
    primaryLessonId: string;
};

export type GuideLesson = {
    id: string;
    chapterId: string;
    badge: string;
    title: string;
    goal: string;
    summary: string;
    lessonIntro: string;
    expectedOutcome: string;
    builderHint: string;
    apiFocus: GuideApiFocusItem[];
    targetBlockIds: string[];
    blocks: GuideBlock[];
    links: GuideMethodLink[];
    solutionCode: string;
    actionLabel: string;
    actionQuery: string;
    actionPreviewKey?: string;
    errorCatalog: GuideDiagnostic[];
    missingBlockDiagnostics: Record<string, GuideDiagnostic>;
    extraBlockDiagnostics?: Record<string, GuideDiagnostic>;
    orderRules?: GuideOrderRule[];
    compile: (sequenceIds: string[], blocks: GuideBlock[]) => string;
};

export type GuideLessonState = {
    activeLessonId: string;
    heroEyebrow: string;
    heroTitle: string;
    heroText: string;
    heroFlow: string;
    chapters: GuideChapter[];
    lessons: GuideLesson[];
};

export type GuideEvaluation = {
    solved: boolean;
    complete: boolean;
    diagnostics: GuideDiagnostic[];
};

export type RuntimeBanner = {
    kind: 'info' | 'success' | 'warning';
    message: string;
};

export type DragPayload = {
    blockId: string;
    origin: 'library' | 'workspace';
    index: number;
};

export type RenderMissionGuidePanel = (language?: ScriptLanguage) => void;
