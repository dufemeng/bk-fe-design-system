# Impeccable Integration for BFDS Implement

BFDS 实现和 QA 阶段复用 Impeccable 的 detector、critique 和 live 协议，但 BFDS 仍负责 contract 对齐、状态/交互覆盖、视觉纪律和 QA 报告。

## Detect

按顺序尝试：

1. 当前目标仓库有 `vendor/impeccable/cli/bin/cli.js`：使用 vendored CLI。
2. 当前目标仓库或全局命令可验证 `impeccable` CLI：使用 `impeccable detect <target>`。
3. 当前环境已安装 Impeccable skill 且包含 detector 脚本：使用该 skill 的 detect 脚本。
4. 都不可验证：记录“Impeccable detect 未运行：入口或依赖未验证”，不要把未运行写成通过。

开发态 BFDS repo 已验证的调用方式：

```bash
node vendor/impeccable/cli/bin/cli.js detect <target>
```

如果 vendor 依赖未安装、Node 版本不满足 Impeccable 要求，或 CLI 子命令不可验证，停止并记录未运行。

## Critique

`critique` 是设计评审增强：

1. 优先读取已安装 Impeccable skill 的 `critique` reference；开发态可读取 `vendor/impeccable/skill/reference/critique.md`。
2. 对实现截图、目标页面或关键 surface 做评审。
3. 把结果作为 QA evidence。

Critique 不替代 BFDS 的 contract QA，也不能推翻用户已确认的 contract，除非发现 P0/P1 级可用性或可访问性问题。

## Live Region Iteration

局部微调按 `live-region-iteration.md` 执行，并读取：

- 优先读取已安装 Impeccable skill 的 `live` reference；开发态可读取 `vendor/impeccable/skill/reference/live.md`。

如果目标页面不能运行、不能截图、live helper 未配置或入口不可验证，停止并要求用户确认下一步。

## BFDS 自己负责

- 读取 `design-contract.json`。
- 读取 `implementation-handoff.md`。
- 读取 `qa-plan.json`。
- 组织实现截图和 reference artifact 对比。
- 检查字体、间距、颜色、资产、copy、icon、state、interaction、responsive、accessibility。
- 写 `docs/design/<slug>/qa-report.md`。
