import {lt_fetchKernel, type lt_MathBlock} from "./scanner";
import {lt_toMathBlockMarkdown} from "./parser";

export async function lt_updateMathBlock(lt_block: lt_MathBlock, lt_markdown: string): Promise<void> {
    if (lt_block.lt_markdown === lt_markdown) {
        return;
    }

    await lt_fetchKernel("/api/block/updateBlock", {
        id: lt_block.lt_id,
        dataType: "markdown",
        data: lt_toMathBlockMarkdown(lt_markdown),
    });
}
