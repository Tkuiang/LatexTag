const lt_TAG_PATTERN = /(^|[^\\])\\tag\s*\{([^{}]*)\}/m;
const lt_ANY_TAG_PATTERN = /(^|[^\\])\\tag\s*\{[^{}]*\}/gm;
const lt_MATH_FENCE_PATTERN = /^\s*\$\$\s*\n?([\s\S]*?)\n?\s*\$\$\s*$/;

export interface lt_LatexTagMatch {
    lt_value: string;
    lt_start: number;
    lt_end: number;
}

export function lt_findLatexTag(lt_latex: string): lt_LatexTagMatch | undefined {
    const lt_match = lt_TAG_PATTERN.exec(lt_latex);
    if (!lt_match || lt_match.index < 0) {
        return undefined;
    }

    const lt_prefixLength = lt_match[1].length;
    const lt_start = lt_match.index + lt_prefixLength;
    const lt_value = lt_match[2].trim();

    return {
        lt_value,
        lt_start,
        lt_end: lt_start + lt_match[0].length - lt_prefixLength,
    };
}

export function lt_removeLatexTags(lt_latex: string): string {
    return lt_normalizeLatex(lt_latex)
        .replace(lt_ANY_TAG_PATTERN, (_lt_match, lt_prefix: string) => lt_prefix)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function lt_setLatexTag(lt_latex: string, lt_number: number): string {
    const lt_normalized = lt_normalizeLatex(lt_latex);
    const lt_nextTag = `\\tag{${lt_number}}`;
    const lt_existingTag = lt_findLatexTag(lt_normalized);

    if (!lt_existingTag) {
        return `${lt_normalized}\n${lt_nextTag}`;
    }

    return `${lt_normalized.slice(0, lt_existingTag.lt_start)}${lt_nextTag}${lt_normalized.slice(lt_existingTag.lt_end)}`.trim();
}

export function lt_normalizeLatex(lt_latex: string): string {
    const lt_match = lt_MATH_FENCE_PATTERN.exec(lt_latex);
    return (lt_match?.[1] ?? lt_latex).trim();
}

export function lt_toMathBlockMarkdown(lt_latex: string): string {
    return `$$\n${lt_normalizeLatex(lt_latex)}\n$$`;
}
