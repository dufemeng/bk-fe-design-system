---
name: bfds-design
description: 当用户明确要求从 PRD、产品方案、原型、截图、Figma、URL、现有页面或组件开始 BFDS 前端设计时使用；也用于继续已有 BFDS 设计、在已有评审工作台/status.json 上选择 A/B/C 或合并方案、固化 docs/design/<slug> 设计交付包、以及对当前 BFDS 设计做局部实时微调。不要用于后端、数据库、普通 bug 修复、纯代码重构、算法实现、接口实现、没有设计意图的请求，或未关联 BFDS 评审工作台/status.json 的泛泛前端工作。
---

# BFDS Design

BFDS 是设计补全层。它只补齐前端设计产物，不重新做产品规划、后端架构、API、数据库、权限或通用工程实现。

## 开场习惯

1. 先定位本 skill 目录。
2. 为本次设计确定一个 `<slug>`，使用小写短横线。
3. 立刻运行：

```bash
node <bfds-design-skill-dir>/scripts/bfds.mjs next <slug> --request "<用户原始请求摘要>"
```

next-card 是阶段指令卡。只按卡片里的 `phase`、`本阶段必须获得`、`禁止` 和 `完成后运行` 行动；`CONTEXT_BLOCKED` 或 `INCONSISTENT` 时停止，不走人工 fallback，不凭聊天记忆继续。

模型只提交当前阶段的用户回答、设计判断和确认原话；证据 JSON、`status.json`、设计交付包结构由 BFDS runtime 生成或校验。

Claude Code 中，单选、多选和确认类用户输入必须用 `AskUserQuestion`；开放式设计表达问题可以普通文本，但一次只问一个。

写命令成功、阻塞或字段非法时都会返回下一张 next-card；读取返回卡片继续，不要额外加载 reference，除非卡片明确要求。

## 阶段入口

- `CONTEXT_BLOCKED`：只补项目级 `PRODUCT.md` / `DESIGN.md`；按 next-card 用 `answer --stage init` 记录多轮访谈和用户确认。
- `NEEDS_SURFACE`：确认目标界面与变更边界；按 next-card 用 `answer --stage surface` 提交扁平字段。
- `NEEDS_DIRECTIONS`：先用 `answer --stage brainstorm` 做设计问答和方向取舍，再用 `directions` 提交 A/B/C 方向规格。
- `NEEDS_WORKBENCH`：用 `workbench --scaffold` 生成脚手架；填入真实三方案后用 `workbench --validate`，含 `BFDS_PLACEHOLDER` 的文件不能进入选择。
- `NEEDS_SELECTION`：用 `AskUserQuestion` 等待用户明确选择 A/B/C 或合并方案；用 `select` 提交选择证据。
- `NEEDS_CONTRACT`：用 `pack --add` 提交 contract 判断字段；runtime 回显后用 `AskUserQuestion` 确认，再用 `pack --confirm` 生成设计交付包。
- `CONTRACT_READY` / `IMPLEMENT_READY`：设计交付包已就绪，等待实现或验收请求。

## 证据文件

证据写入 `docs/design/<slug>/evidence/`：

- `init-interview.json`：Impeccable 项目级访谈问答、用户确认原话、PRODUCT/DESIGN 路径和生成模式。
- `surface.json`：目标界面、现状来源、改动类型、必须保留、允许改变、必须避免、用户确认原话。
- `brainstorm-dialogue.json`：设计表达问答、2-3 个方向取舍、用户确认原话。
- `directions.json`：A/B/C 三个方向规格和自检结果。
- `selection.json`：用户选择原话、选中方案、工作台与三个方案路径。

schema 和模板由本 skill 内置 runtime 管理。写完任何阶段输入后都读取命令返回的 next-card。

## 不触发

- “实现这个 API 方案。”
- “修一下数据库 migration。”
- “重构这个 hook。”
- “这个组件报错了，帮我 debug。”
