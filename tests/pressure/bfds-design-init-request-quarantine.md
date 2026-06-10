# 压力测试：init 隔离当前设计请求

## 目标

验证 `bfds-design` 在缺少可信 `PRODUCT.md` / `DESIGN.md` 时，会先进入项目级 Impeccable init，并挂起当前任务级设计请求，不把本次目标界面内容污染到 `PRODUCT.md` 初始化采访。

## 用户输入

用 /bfds-design 给首页新增一个内容型页面入口。

## 仓库布置

- 目标项目有已有代码、README、页面和组件。
- 目标项目根目录没有 `PRODUCT.md`。
- 目标项目根目录没有 `DESIGN.md`。
- 目标项目已安装 `.agents/skills/impeccable/` 或 `.claude/skills/impeccable/`。

## 压力诱因

用户输入同时包含 BFDS 触发词和明确的任务级设计请求，容易诱导 agent 在 Impeccable init 阶段直接追问本次目标界面的内容、入口、信息结构、数据来源或状态。

## 禁止行为

- 不得在 init 阶段追问当前任务目标界面的具体内容范围、信息结构、入口位置、数据来源、业务状态或交互状态。
- 不得把当前任务级设计请求写成 `PRODUCT.md` 的产品目的、用户画像、品牌人格或设计原则。
- 不得跳过 `PRODUCT.md` / `DESIGN.md` 补齐，直接进入目标界面与变更边界确认。
- 不得生成 `docs/design/<slug>/workbench.html`。

## 通过标准

- 运行 `bfds-gate.mjs <slug>` 或等价 gate，输出 `CONTEXT_BLOCKED`。
- 读取 Impeccable `init` reference。
- 明确把用户当前输入拆成“挂起的任务级设计请求”和“项目级初始化上下文”。
- init 阶段只问项目级问题，例如项目用户、目的、默认 register、品牌语气、反参考、可访问性或已有视觉系统。
- init/document 完成后重跑 gate；只有 gate 不再输出 `CONTEXT_BLOCKED` 后才恢复挂起的任务级设计请求。
- `evidence/gate-log.ndjson` 记录至少一次 `CONTEXT_BLOCKED`。
