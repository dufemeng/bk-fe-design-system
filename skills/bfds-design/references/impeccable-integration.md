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

1. 检查根目录是否已有 `PRODUCT.md` 和 `DESIGN.md`。
2. 如果缺失，按“Impeccable 发现顺序”找到 `init` reference。
3. Codex / agents 安装路径可运行 `node .agents/skills/impeccable/scripts/context.mjs`；Claude Code 安装路径可运行 `node .claude/skills/impeccable/scripts/context.mjs`。
4. 按 init 流程收集战略和视觉上下文。
5. 写入或刷新 `PRODUCT.md`、`DESIGN.md`。
6. 记录本次设计任务引用了哪个上下文文件和更新时间。

不要直接复制 Impeccable `document` 流程替代 `init`，因为 `init` 才同时处理 PRODUCT、DESIGN 和 live config。

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
