import {fetchSyncPost as lt_fetchSyncPost} from "siyuan";
import {lt_normalizeLatex} from "./parser";

export interface lt_MathBlock {
    lt_id: string;
    lt_markdown: string;
    lt_sort: number;
}

interface lt_SqlBlockRow {
    id: string;
    markdown?: string;
    content?: string;
    sort?: number;
}

interface lt_KernelResponse<lt_T> {
    code: number;
    msg?: string;
    data: lt_T;
}

export async function lt_scanMathBlocks(lt_rootId: string, lt_orderedIds: string[] = []): Promise<lt_MathBlock[]> {
    const lt_response = await lt_fetchKernel<lt_SqlBlockRow[]>("/api/query/sql", {
        stmt: [
            "SELECT id, markdown, content, sort",
            "FROM blocks",
            `WHERE root_id = '${lt_escapeSql(lt_rootId)}' AND type = 'm'`,
            "ORDER BY sort ASC",
        ].join(" "),
    });

    const lt_blocks = lt_response.map((lt_row, lt_index) => ({
        lt_id: lt_row.id,
        lt_markdown: lt_normalizeLatex(lt_row.markdown ?? lt_row.content ?? ""),
        lt_sort: lt_row.sort ?? lt_index,
    }));

    return lt_sortByVisibleOrder(lt_blocks, lt_orderedIds);
}

export async function lt_fetchKernel<lt_T>(lt_url: string, lt_data: unknown): Promise<lt_T> {
    const lt_response = await lt_fetchSyncPost(lt_url, lt_data) as lt_KernelResponse<lt_T>;
    if (lt_response.code !== 0) {
        throw new Error(lt_response.msg || `SiYuan kernel request failed: ${lt_url}`);
    }
    return lt_response.data;
}

function lt_escapeSql(lt_value: string): string {
    return lt_value.replace(/'/g, "''");
}

function lt_sortByVisibleOrder(lt_blocks: lt_MathBlock[], lt_orderedIds: string[]): lt_MathBlock[] {
    if (lt_orderedIds.length === 0) {
        return lt_blocks;
    }

    const lt_order = new Map(lt_orderedIds.map((lt_id, lt_index) => [lt_id, lt_index]));
    return [...lt_blocks].sort((lt_left, lt_right) => {
        const lt_leftOrder = lt_order.get(lt_left.lt_id) ?? Number.MAX_SAFE_INTEGER;
        const lt_rightOrder = lt_order.get(lt_right.lt_id) ?? Number.MAX_SAFE_INTEGER;
        if (lt_leftOrder !== lt_rightOrder) {
            return lt_leftOrder - lt_rightOrder;
        }
        return lt_left.lt_sort - lt_right.lt_sort;
    });
}
