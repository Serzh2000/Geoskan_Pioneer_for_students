/**
 * What a lesson says before the student writes anything: a theory about the fragment the lesson is built for,
 * a short example of it, and what to look at when the example runs in the simulator.
 */
export type ExampleStep = {
    /** The fragment of the example this note is about, as it is written in each language. */
    lua?: string;
    python?: string;
    /** One or two sentences of what the fragment does. */
    text: string;
};

export type LessonExample = {
    /** Two to four short paragraphs explaining the fragment. Backticks mark code. */
    theory: string[];
    /** The example program in each language: it runs as it is, and differs from the lesson's task. */
    lua?: string;
    python?: string;
    /** The example read fragment by fragment, in the order it runs. */
    steps: ExampleStep[];
    /** One sentence: what the student should see in the scene while the example runs. */
    watch: string;
};

/** Examples of one chapter, by the number of the lesson in the course. */
export type ChapterExamples = Record<number, LessonExample>;
