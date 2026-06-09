# BFDS 设计阶段的 Impeccable 集成

BFDS 在设计阶段复用 Impeccable 的上下文和局部实时微调纪律，不 fork Impeccable。

## 安装模型

BFDS 仓库内置 Impeccable 源码和宿主 bundle，但安装后 Impeccable 必须作为目标项目的同级宿主 skill 存在：

- Codex / agents：`.agents/skills/impeccable/`
- Claude Code：`.claude/skills/impeccable/`

不要把 `vendor/impeccable/.agents` 复制到 `bfds-design/` 内部。Impeccable 的 reference 里有项目根相对命令，例如 `node .agents/skills/impeccable/scripts/context.mjs`；嵌入 BFDS skill 会让这些命令失效。

开发态 BFDS repo 的安装源：

- Codex / agents：`vendor/impeccable/.agents/skills/impeccable/`
- Claude Code：`vendor/impeccable/.claude/skills/impeccable/`

## Impeccable 发现顺序

按顺序尝试：

1. 当前目标仓库有 `.agents/skills/impeccable/`：读取 `.agents/skills/impeccable/SKILL.md` 和 `reference/init.md`、`reference/live.md`。
2. 当前目标仓库有 `.claude/skills/impeccable/`：读取 `.claude/skills/impeccable/SKILL.md` 和 `reference/init.md`、`reference/live.md`。
3. 当前目标仓库有 `vendor/impeccable/`：读取 `vendor/impeccable/skill/SKILL.src.md` 和对应 reference。
4. 当前目标仓库或全局命令可验证 `impeccable` CLI：只把它用于已确认支持的 CLI 子命令，例如 `detect`；不要假设它有 `init` 或 `live` CLI。
5. 找不到 Impeccable：如果 `PRODUCT.md` 和 `DESIGN.md` 已存在，可以继续 BFDS 设计；如果缺失，则停止并要求用户安装内置 Impeccable bundle 或提供设计上下文，不要伪造 `init` 结果。

在本 BFDS repo 的开发态中，已验证 `vendor/impeccable/cli/bin/cli.js` 支持 `detect` 和 `skills`，Impeccable skill reference 包含 `init`、`document`、`critique`、`live`。

## 设计上下文梳理

优先复用 Impeccable `init` skill 流程：

1. 先运行 `node <bfds-design-skill-dir>/scripts/bfds-context.mjs --json`。
2. 只有返回 `CONTEXT_READY` 时，才把输出里的 `productPath` 和 `designPath` 当作当前目标项目上下文。
3. 如果返回 `NO_CONTEXT`、`NO_PRODUCT_MD` 或 `NO_DESIGN_MD`，按“Impeccable 发现顺序”找到 `init` / `document` reference。
4. Codex / agents 安装路径可运行 `node .agents/skills/impeccable/scripts/context.mjs`；Claude Code 安装路径可运行 `node .claude/skills/impeccable/scripts/context.mjs`。
5. 按 init 流程收集项目级战略上下文；按 document 流程补齐或刷新视觉上下文。
6. 写入或刷新可信位置下的 `PRODUCT.md`、`DESIGN.md`。
7. 重新运行 `bfds-context.mjs --json`，确认返回 `CONTEXT_READY` 后再进入目标界面与变更边界门禁。
8. 记录本次设计任务引用了哪个上下文文件和更新时间。

不要直接复制 Impeccable `document` 流程替代 `init`，因为 `init` 才同时处理 PRODUCT、DESIGN 和 live config。

## 原始设计请求隔离

当 `bfds-design` 因可信 `PRODUCT.md` / `DESIGN.md` 缺失而进入 Impeccable `init` 时，必须把用户当前输入拆成两层：

- **挂起的任务级设计请求**：用户这次想新增、修改、替换、删除或微调的目标界面。
- **项目级初始化上下文**：当前目标项目的用户、目的、默认设计 register、品牌语气、反参考、设计原则、可访问性和已有视觉系统。

`init` 阶段只处理项目级初始化上下文。挂起的任务级设计请求只能用于说明“init 完成后要恢复哪个 BFDS 设计任务”，不能作为 `PRODUCT.md` 采访主题，不能直接写入产品目的、用户画像、品牌人格或设计原则。

`init` 阶段允许问：

- 当前项目服务谁、主要使用场景是什么、默认设计 register 是 brand 还是 product。
- 项目的目的、成功状态、语气、品牌人格、反参考和可访问性要求。
- 代码库扫描后仍无法确定的项目级视觉系统、组件体系或设计 token 来源。

`init` 阶段禁止问当前任务目标界面的任务级信息，包括：

- 目标界面的具体内容范围、信息结构、入口位置或导航组织。
- 本次改动的功能细节、数据来源、业务状态、交互状态或验收状态。
- 本次新增/修改区域的文案、栏目、卡片、表单、筛选、列表、详情、空状态等具体设计取舍。

这些任务级问题必须等 `PRODUCT.md` / `DESIGN.md` 就绪并重新进入 BFDS 后，在“目标界面与变更边界确认”或后续设计阶段再问。完成 `init` / `document` 后，先重跑 `bfds-context.mjs --json`；只有 `CONTEXT_READY` 后，才恢复挂起的原始设计请求。

## 上下文路径硬规则

BFDS 只接受 `bfds-context.mjs` 认可的目标项目上下文。以下路径中的文件不算当前项目上下文：

- `vendor/**`
- `open-sources/**`
- `fixtures/**`
- 第三方源码仓库
- 样例、demo、测试夹具

如果这些路径里存在 `PRODUCT.md` / `DESIGN.md`，只能作为参考材料，不能解除设计上下文门禁。

## 局部实时微调

用户对已生成或已实现设计提出局部微调时：

1. 恢复当前 BFDS 设计任务。
2. 按“Impeccable 发现顺序”找到 `live` reference。
3. 确认目标项目有可运行页面或静态 HTML。
4. 如果入口、dev server 或 live config 未验证，停止并要求确认。
5. 将局部实时微调结果记录回当前设计任务的 `status.json` 或验收报告。

## 不做

- 不 vendor Product Design。
- 不把 BFDS 产物写入 `.impeccable/`。
- 不在 `vendor/impeccable/` 内加入 BFDS 定制逻辑。
- 不假设存在未验证的 `impeccable init` 或 `impeccable live` CLI 子命令。
