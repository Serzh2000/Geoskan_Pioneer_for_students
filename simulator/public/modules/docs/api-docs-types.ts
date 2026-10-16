export interface ApiDoc {
    desc: string;
    syntax?: string;
    params?: string;
    returns?: string;
    example?: string;
    kind?: string;
    insertText?: string;
    aliases?: string[];
    direction?: 'to-autopilot' | 'from-autopilot';
}
