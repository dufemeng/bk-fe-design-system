# 设计阶段的 Impeccable 集成

BFDS 只在上下文缺失或局部微调时复用 Impeccable，不把 Impeccable vendor 到 BFDS skill 内部。

## 上下文缺失

gate 输出 `CONTEXT_BLOCKED` 时，只补项目级上下文。不要继续目标界面确认、设计方向、评审工作台或设计交付包。

## 分车道

- 父会话：逐题问用户并等待回答，写 `docs/design/<slug>/evidence/init-interview.json`。
- 隔离写作：优先用 fresh subagent 根据 `init-interview.json`、代码扫描和 Impeccable 规范摘要写 `PRODUCT.md` / `DESIGN.md`。
- gate：验证访谈证据、`PRODUCT.md` 形状、`DESIGN.md` 形状。gate 未解除 `CONTEXT_BLOCKED` 前，不进入 BFDS 后续阶段。

## 必问主题

逐题问用户，用户未回答前禁止写 `PRODUCT.md` / `DESIGN.md`，禁止代答：

- 默认 register 是 `brand` 还是 `product`。
- 当前项目服务谁、主要场景是什么、产品目的是什么。
- 品牌人格、语气、反参考、设计原则和可访问性要求。
- 已有视觉系统、组件体系、design token 或参考来源。

不要在 Impeccable init 阶段追问当前任务级目标界面、入口、信息结构、状态、文案、卡片、表单或数据来源。

## 文件契约

`PRODUCT.md` 是项目级战略上下文，必须包含：

- `## Register`，值只能是裸 `brand` 或 `product`。
- 用户、产品目的、品牌人格、反参考、设计原则、可访问性等项目级信息。

`DESIGN.md` 是 Google Stitch 风格视觉系统文档，必须包含 token frontmatter，并使用 Overview、Colors、Typography、Elevation、Components、Do's and Don'ts 等视觉规范章节。

`DESIGN.md` 禁止写成技术架构文档；出现技术栈、项目结构、目录结构、包管理、运行环境、前端架构等标题时，gate/hook 会拒绝。

## 宿主 bundle

优先使用目标项目同级宿主 bundle：

- Codex / agents：`.agents/skills/impeccable/`
- Claude Code：`.claude/skills/impeccable/`

如果宿主 bundle 不存在，但可信 `PRODUCT.md` / `DESIGN.md` 已存在，仍必须让用户确认并写 `init-interview.json` 后才能继续 BFDS；否则停止并要求安装或提供可信上下文。

## Claude Code hook

Claude Code 环境应把 `bfds-guard-hook.mjs` 挂到 `PreToolUse` 的 `Edit|Write` 和 `Bash`。hook 只做硬拦截：阶段不对、缺访谈证据、手写 `status.json`、或 `DESIGN.md` 像架构文档时拒绝写入。

## 局部实时微调

局部微调只作用于当前 BFDS 设计任务的局部区域。入口、dev server 或 live config 不可验证时停止，不伪造 live 结果。
