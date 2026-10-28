/** @returns {{ok: true, content: any} | {ok: false, error: string}} */
export function validateGameContent(input: any, slug: any): {
    ok: true;
    content: any;
} | {
    ok: false;
    error: string;
};
export function sampleContent(slug: any): {
    gameSlug: any;
    questions: {
        text: string;
        options: string[];
        answerIndex: number;
        explanation: string;
    }[];
} | {
    gameSlug: any;
    questions: {
        text: string;
        answer: number;
        min: number;
        max: number;
        step: number;
        unit: string;
        explanation: string;
    }[];
} | {
    gameSlug: any;
    questions: {
        text: string;
        options: string[];
        outcomes: number[];
    }[];
};
export function adaptFiveGameContent(content: any, products: any): {
    questions: any;
} | {
    rounds?: undefined;
    pairs?: undefined;
} | {
    rounds: any;
    pairs?: undefined;
} | {
    pairs: any;
    rounds?: undefined;
};
export const QUESTION_GAME_SLUGS: string[];
export const MATCH_RESULTS: string[];
export const CARD_IMAGE_MAX_CHARS: 700000;
//# sourceMappingURL=index.d.ts.map