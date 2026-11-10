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

export type GuideTextLesson = {
    academy?: {
        number: number;
        mode: 'code' | 'inspect';
        waitMs?: number;
        doneMessage?: string;
        hints: string[];
        experiment: string;
        teaching: {
            deviceTitle: string; device: string; question: string;
            choices: Array<{ text: string; feedback: string }>;
            correct: number; takeaway: string;
        };
    };
    id: string;
    topicId: string;
    chapterId: string;
    badge: string;
    title: string;
    goal: string;
    taskSteps?: string[];
    summary: string;
    lessonIntro: string;
    expectedOutcome: string;
    builderHint: string;
    apiFocus: GuideApiFocusItem[];
    links: GuideMethodLink[];
    starterCode: string;
    solutionCode: string;
};

export type GuideEvaluation = {
    academyTrial?: string;
    solved: boolean;
    complete: boolean;
    diagnostics: GuideDiagnostic[];
    timeline?: import('./evaluation/text/timeline.js').FlightTimeline;
};
