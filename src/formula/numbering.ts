import {lt_removeLatexTags, lt_setLatexTag} from "./parser";
import {lt_scanMathBlocks} from "./scanner";
import {lt_updateMathBlock} from "./updater";

export async function lt_renumberCurrentDocument(lt_rootId: string, lt_orderedIds: string[] = []): Promise<number> {
    const lt_blocks = (await lt_scanMathBlocks(lt_rootId, lt_orderedIds))
        .filter((lt_block) => lt_block.lt_markdown.trim().length > 0);
    let lt_changed = 0;

    for (let lt_index = 0; lt_index < lt_blocks.length; lt_index += 1) {
        const lt_block = lt_blocks[lt_index];
        const lt_nextMarkdown = lt_setLatexTag(lt_block.lt_markdown, lt_index + 1);
        if (lt_nextMarkdown !== lt_block.lt_markdown) {
            await lt_updateMathBlock(lt_block, lt_nextMarkdown);
            lt_changed += 1;
        }
    }

    return lt_changed;
}

export async function lt_clearCurrentDocumentTags(lt_rootId: string): Promise<number> {
    const lt_blocks = await lt_scanMathBlocks(lt_rootId);
    let lt_changed = 0;

    for (const lt_block of lt_blocks) {
        const lt_nextMarkdown = lt_removeLatexTags(lt_block.lt_markdown);
        if (lt_nextMarkdown !== lt_block.lt_markdown) {
            await lt_updateMathBlock(lt_block, lt_nextMarkdown);
            lt_changed += 1;
        }
    }

    return lt_changed;
}
