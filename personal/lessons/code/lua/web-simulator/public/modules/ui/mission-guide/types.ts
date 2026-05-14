import type { ScriptLanguage } from '../api-docs/sections.js';

export type GuideMethodLink = {
    label: string;
    query: string;
    previewKey?: string;
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

export type GuideLesson = {
    id: string;
    badge: string;
    title: string;
    goal: string;
    summary: string;
    expectedOutcome: string;
    builderHint: string;
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
