# BFDS 实现阶段的 Impeccable 集成

BFDS 实现和验收阶段复用 Impeccable 的反模式扫描、设计评审增强和局部实时微调协议，但 BFDS 仍负责设计契约对齐、状态/交互覆盖、视觉纪律和验收报告。

## 安装模型

BFDS 仓库内置 Impeccable 安装源，但实现阶段只读取目标项目的宿主同级 bundle：

- Codex / agents：`.agents/skills/impeccable/`
- Claude Code：`.claude/skills/impeccable/`

不要把 `vendor/impeccable/.agents` 嵌到 `bfds-implement/` 内部。Impeccable 的反模式扫描、设计评审增强、局部实时微调 reference 都包含项目根相对脚本路径，嵌入后会让命令指向错误位置。

## 反模式扫描

按顺序尝试：

1. 当前目标仓库有 `.agents/skills/impeccable/scripts/detect.mjs`：运行 `node .agents/skills/impeccable/scripts/detect.mjs --json <target>`。
2. 当前目标仓库有 `.claude/skills/impeccable/scripts/detect.mjs`：运行 `node .claude/skills/impeccable/scripts/detect.mjs --json <target>`。
3. 当前目标仓库有 `vendor/impeccable/cli/bin/cli.js`：使用 vendored CLI。
4. 当前目标仓库或全局命令可验证 `impeccable` CLI：只使用已确认支持的 `detect` 子命令。
5. 都不可验证：记录“Impeccable 反模式扫描未运行：入口或依赖未验证”，不要把未运行写成通过。

开发态 BFDS repo 已验证的调用方式：

```bash
node vendor/impeccable/cli/bin/cli.js detect <target>
```

如果宿主 bundle 不存在、vendor 依赖未安装、Node 版本不满足 Impeccable 要求，或 CLI 子命令不可验证，停止并记录未运行。

扫描目标必须来自 `qa-plan.impeccable.detect.targets`、`qa-plan.targetRoutes` 或本轮实现改动文件。不得扫描评审工作台 HTML、选项 HTML、聊天里的临时目标描述或 `<...>` 占位目标。目标不可验证时记录未运行，不临时猜测。

## 设计评审增强

`critique` 是设计评审增强：

1. 优先读取 `.agents/skills/impeccable/reference/critique.md` 或 `.claude/skills/impeccable/reference/critique.md`；开发态可读取 `vendor/impeccable/skill/reference/critique.md`。
2. 先准备 BFDS 契约上下文包：设计任务标识、目标界面、`changeType`、已选方案摘要、`keep` / `change` / `avoid`、P0/P1/P2 `acceptanceRules` 和关键 `qa-plan.checks`。
3. 对实现截图、目标页面或关键目标界面做评审。
4. 把结果作为验收证据。

Critique 不替代 BFDS 的设计契约验收，也不能推翻用户已确认的设计契约。若 critique 发现 P0/P1 级可用性或可访问性问题，先记录为阻塞并说明它违反了哪个契约规则或验收检查；如果问题要求改变已确认设计方向，回到 `bfds-design` 重新固化设计，不在实现阶段直接改写。

## 局部实时微调

局部微调按 `live-region-iteration.md` 执行，并读取：

- 优先读取目标项目宿主同级 bundle 的 `live` reference；开发态可读取 `vendor/impeccable/skill/reference/live.md`。
- Codex / agents 对应 `.agents/skills/impeccable/reference/live.md`。
- Claude Code 对应 `.claude/skills/impeccable/reference/live.md`。

如果目标页面不能运行、不能截图、live helper 未配置或入口不可验证，停止并要求用户确认下一步。

Live 的自由文本和选区反馈只作用于当前 BFDS 设计任务的局部区域。接受 live 结果后，必须按 `live-region-iteration.md` 记录局部契约补丁；不能把 live 结果写成新的全局设计方向，也不能扩大产品范围、修改后端/API/权限或绕过 `qa-plan`。

## BFDS 自己负责

- 读取 `design-contract.json`。
- 读取 `implementation-handoff.md`。
- 读取 `qa-plan.json`。
- 组织实现截图和参考设计产物对比。
- 检查字体、间距、颜色、资产、copy、icon、state、interaction、responsive、accessibility。
- 写 `docs/design/<slug>/qa-report.md`。
