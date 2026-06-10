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
node <bfds-design-skill-dir>/scripts/bfds-gate.mjs <slug>
```

gate 是阶段裁判。只按 gate 输出的 `BFDS_GATE` 阶段继续；`CONTEXT_BLOCKED` 或 `INCONSISTENT` 时停止，不走人工 fallback，不凭聊天记忆继续。

模型只写 `docs/design/<slug>/evidence/*.json` 和设计产物；`status.json` 由 gate 同步。

如果本轮可能进入 `CONTEXT_BLOCKED`，可加 `--request "<用户原始请求摘要>"`，gate 会把挂起请求写入 `evidence/pending-request.json`。

## 阶段入口

- `CONTEXT_BLOCKED`：读 [impeccable-integration.md](references/impeccable-integration.md)，只补项目级 `PRODUCT.md` / `DESIGN.md`。
- `NEEDS_SURFACE`：读 [surface-change-framing.md](references/surface-change-framing.md)，写 `evidence/surface.json` 后重跑 gate。
- `NEEDS_DIRECTIONS`：读 [design-brainstorm.md](references/design-brainstorm.md)，写 `evidence/directions.json` 后重跑 gate。
- `NEEDS_WORKBENCH`：读 [workbench-authoring.md](references/workbench-authoring.md)，生成 `workbench.html` 和 `option-a/b/c.html` 后重跑 gate。
- `NEEDS_SELECTION`：等待用户明确选择 A/B/C 或合并方案；写 `evidence/selection.json` 后重跑 gate。
- `NEEDS_CONTRACT`：读 [contract-pack.md](references/contract-pack.md)，生成设计交付包并校验。
- `CONTRACT_READY` / `IMPLEMENT_READY`：设计交付包已就绪，等待实现或验收请求。

## 证据文件

证据写入 `docs/design/<slug>/evidence/`：

- `surface.json`：目标界面、现状来源、改动类型、必须保留、允许改变、必须避免、用户确认原话。
- `directions.json`：A/B/C 三个方向规格和自检结果。
- `selection.json`：用户选择原话、选中方案、工作台与三个方案路径。

schema 在 `assets/templates/artifacts/`。写完任何 evidence 或产物后都重跑 gate。

## 不触发

- “实现这个 API 方案。”
- “修一下数据库 migration。”
- “重构这个 hook。”
- “这个组件报错了，帮我 debug。”
