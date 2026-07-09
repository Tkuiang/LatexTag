# SiYuan 插件开发背景知识

这份文档用于给后续工程或自动化代理快速了解 SiYuan 插件开发要点，特别是本项目 `LatexTag` 这类需要读取和更新文档块内容的插件。

## 相关仓库

- SiYuan 主仓库：`siyuan-note/siyuan`
- 插件 API 类型：`siyuan-note/petal`
- 官方插件模板：`siyuan-note/plugin-sample`

开发新插件时优先参考官方插件模板和 `siyuan` npm 包类型声明。

## 插件目录结构

SiYuan 插件目录通常放在：

```text
{SiYuan 工作空间}/data/plugins/{插件名}
```

调试时，SiYuan 会直接从插件目录根部加载：

```text
plugin.json
index.js
index.css
i18n/*
icon.png
preview.png
README*.md
```

注意：如果构建产物只在 `dist/` 中，而插件根目录没有 `index.js` / `index.css`，SiYuan 可能不会正确加载插件。

## plugin.json

`plugin.json` 是插件元信息入口，常见字段包括：

```json
{
  "name": "LatexTag",
  "author": "",
  "url": "",
  "version": "0.1.0",
  "minAppVersion": "3.7.0",
  "backends": ["all"],
  "frontends": ["desktop", "desktop-window", "browser-desktop"],
  "displayName": {
    "default": "LaTeX Tag",
    "zh-CN": "LaTeX 公式编号"
  },
  "description": {
    "default": "Automatically number display math blocks in the current SiYuan document.",
    "zh-CN": "自动为当前思源文档中的块级公式添加和修正 LaTeX 编号。"
  },
  "readme": {
    "default": "README.md",
    "zh-CN": "README.zh-CN.md"
  }
}
```

`name` 最好和插件目录名、仓库名保持一致。

## 构建与调试

本项目使用 Vite + TypeScript。

常用命令：

```bash
pnpm install
pnpm run build:dev
pnpm run dev
pnpm run package
```

其中：

- `build:dev`：生成根目录 `index.js` / `index.css`，供 SiYuan 本地调试加载。
- `dev`：监听源码变化并持续生成根目录构建产物。
- `package`：生成 `dist/` 和 `package.zip`，用于发布。

## 插件生命周期

插件入口一般继承 `Plugin`：

```ts
import {Plugin} from "siyuan";

export default class MyPlugin extends Plugin {
    onload() {
        // 插件加载时执行
    }

    onunload() {
        // 插件卸载时清理事件监听
    }

    openSetting() {
        // SiYuan 设置 -> 集市 -> 插件设置按钮会调用这里
    }
}
```

如果要支持 SiYuan 插件管理页的“设置”按钮，需要实现 `openSetting()`。

## 顶部工具栏按钮

可通过 `addTopBar` 添加顶部按钮：

```ts
const element = this.addTopBar({
    icon: "iconLatexTag",
    title: "当前文档公式自动编号",
    position: "right",
    callback: () => {
        // 左键点击
    },
});

element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    // 右键菜单或设置页
});
```

图标可以通过 `addIcons` 注入 SVG symbol：

```ts
this.addIcons(`<symbol id="iconLatexTag" viewBox="0 0 32 32">...</symbol>`);
```

若需要启用状态明显，可给顶部按钮添加 class，并使用主题主色：

```css
.latextag-toolbar--enabled {
    color: var(--b3-theme-primary) !important;
}

.latextag-toolbar--enabled svg,
.latextag-toolbar--enabled use {
    fill: var(--b3-theme-primary) !important;
}
```

## 设置持久化

插件可使用 `loadData` / `saveData` 保存配置：

```ts
const settings = await this.loadData("settings");
await this.saveData("settings", nextSettings);
```

本项目当前设置模型：

```ts
interface PluginSettings {
    lt_globalEnabled: boolean;
    lt_defaultEnableNewDocuments: boolean;
    lt_defaultEnableNewDocumentsSince: string;
    lt_enabledByDoc: Record<string, boolean>;
}
```

含义：

- `lt_globalEnabled`：是否全局启用。
- `lt_defaultEnableNewDocuments`：非全局模式下，新建文档是否默认启用。
- `lt_defaultEnableNewDocumentsSince`：开启“新建文档默认启用”的时间戳，用于判断之后创建的新文档。
- `lt_enabledByDoc`：按文档根块 ID 存储单独启停状态。

## Dialog 设置页

可使用 `Dialog` 创建设置面板：

```ts
import {Dialog} from "siyuan";

const dialog = new Dialog({
    title: "LaTeX Tag",
    content: `<div class="b3-dialog__content">...</div>`,
    width: "520px",
});
```

SiYuan 内置样式类常用：

- `b3-dialog__content`
- `b3-dialog__action`
- `b3-button`
- `b3-button--cancel`
- `b3-button--text`
- `b3-switch`
- `fn__space`

## 读取当前文档

当前活动编辑器可用：

```ts
import {getActiveEditor} from "siyuan";

const activeEditor = getActiveEditor();
const rootId = activeEditor?.protyle?.block?.rootID ?? "";
const editorElement = activeEditor?.protyle?.element;
```

`rootID` 是当前文档根块 ID。按文档控制插件状态时应使用这个 ID。

## 查询公式块

可通过内核 API `/api/query/sql` 查询 `blocks` 表：

```ts
import {fetchSyncPost} from "siyuan";

const response = await fetchSyncPost("/api/query/sql", {
    stmt: "SELECT id, markdown, content, sort FROM blocks WHERE root_id = '...' AND type = 'm' ORDER BY sort ASC",
});
```

公式块类型通常是：

```sql
type = 'm'
```

返回字段中：

- `id`：块 ID
- `markdown`：Markdown 内容
- `content`：块内容兜底字段
- `sort`：排序字段，可作为兜底排序

如果需要尽量符合当前界面顺序，可优先读取当前编辑器 DOM 中公式块顺序：

```ts
Array.from(editorElement.querySelectorAll(
    "[data-node-id][data-type='NodeMathBlock'], [data-node-id][data-subtype='math']",
));
```

## 更新公式块

更新块可用 `/api/block/updateBlock`：

```ts
await fetchSyncPost("/api/block/updateBlock", {
    id: blockId,
    dataType: "markdown",
    data: "$$\nE=mc^2\n\\tag{1}\n$$",
});
```

重要注意：

- 更新公式块时，传入裸公式内容可能被 SiYuan 解析为普通正文。
- 为避免 `\tag{x}` 插入到正文，应传完整块级公式 Markdown，即带 `$$ ... $$`。
- 扫描时最好把返回内容规范化为公式内部内容，更新时再包回 `$$ ... $$`。

## LaTeX tag 处理

本项目只处理块级公式，不处理行级公式。

常见处理逻辑：

- 查找未转义的 `\tag{...}`
- 没有则追加 `\tag{n}`
- 有则替换为正确编号
- 关闭功能时删除 `\tag{...}`

注意避免匹配转义文本，例如 `\\tag`。

## 事件监听与性能

SiYuan 插件可监听事件：

```ts
this.eventBus.on("ws-main", handler);
this.eventBus.on("loaded-protyle-static", handler);
this.eventBus.on("loaded-protyle-dynamic", handler);
this.eventBus.on("switch-protyle", handler);
this.eventBus.on("destroy-protyle", handler);
this.eventBus.on("open-noneditableblock" as any, handler);
```

建议：

- 对自动扫描和更新使用 debounce。
- 不要对每个输入事件立即更新。
- 插件自己正在更新块时，用 `isApplying` 防止递归触发。
- 正在编辑公式块时不要更新，避免覆盖用户未写入数据库的公式内容。
- 空公式块不要自动写入 `\tag{x}`。

## 公式块编辑状态

打开公式块编辑器时可通过 `open-noneditableblock` 事件记录当前公式编辑区域。

需要注意：

- 用户刚创建公式块时，数据库可能还没有稳定写入公式内容。
- 如果插件此时读取数据库并写回，可能把未完成输入覆盖为只有 `\tag{x}`。
- 应在公式块编辑器失焦后延迟编号。

## 已知注意事项

1. `ws-main` 是较宽泛事件，点击、刷新、插件自身更新都可能触发。
2. 如果自动编号时机太激进，可能出现公式块临时渲染状态和数据库内容不同步。
3. `\tag{x}` 的视觉位置由 SiYuan / KaTeX 渲染控制，可能看起来像公式块右侧或右上角数字。
4. 手动输入和 API 更新后的公式块在短时间内可能存在渲染路径差异。
5. 若出现偶发编号错误，应优先收紧事件触发条件和稳定等待时间，而不是先改解析逻辑。

## 当前项目交互约定

`LatexTag` 当前交互设计：

- 左键点击顶部图标：
  - 若全局启用，则关闭全局启用。
  - 若未全局启用，则切换当前文档启停状态。
- 右键点击顶部图标：
  - 打开设置页。
- SiYuan 设置 -> 集市 -> 插件设置：
  - 调用同一个设置页。
- 启用状态：
  - 顶部图标变为 `var(--b3-theme-primary)` 主题色。

## 内部状态封装

为了避免其他插件通过插件实例对象直接访问或修改本插件运行时变量，`LatexTag` 的核心状态使用 ECMAScript `#private` 字段保存，例如：

```ts
#lt_settings: lt_PluginSettings;
#lt_toolbar: lt_ToolbarController | undefined;
#lt_activeRootId: string;
#lt_isApplying: boolean;
```

约定：

- 本插件自定义变量、参数、函数、类型和运行时私有字段统一使用 `lt_` 前缀。
- 不把内部状态挂到 `window`。
- 不导出可修改运行状态的对象。
- 不把设置对象引用传给外部模块长期持有。
- 对外只暴露 SiYuan 插件生命周期要求的方法，例如 `onload`、`onunload`、`openSetting`。

注意：这能防止普通代码通过插件实例直接改内部字段，但不能防止其他插件使用 SiYuan 文件 API 或内核 API 读取插件数据文件。涉及文件级隔离时，需要依赖 SiYuan 自身的插件数据权限模型。

## 发布包要求

发布包 `package.zip` 中至少包含：

```text
i18n/*
icon.png
index.css
index.js
plugin.json
preview.png
README*.md
LICENSE
```

发布到集市前需要补全：

- `plugin.json.author`
- `plugin.json.url`
- README 中的项目说明和截图
