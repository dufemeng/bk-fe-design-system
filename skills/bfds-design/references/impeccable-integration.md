# 设计阶段的 Impeccable 集成

BFDS 只在上下文缺失或局部微调时复用 Impeccable，不把 Impeccable vendor 到 BFDS skill 内部。

## 上下文缺失

gate 输出 `CONTEXT_BLOCKED` 时，只补项目级上下文：

- 当前项目服务谁、主要场景是什么、默认 register 是 brand 还是 product。
- 项目的目的、语气、品牌人格、反参考、设计原则和可访问性要求。
- 已有视觉系统、组件体系或 design token 来源。

不要在 Impeccable init 阶段追问当前任务级目标界面、入口、信息结构、状态、文案、卡片、表单或数据来源。

优先使用目标项目同级宿主 bundle：

- Codex / agents：`.agents/skills/impeccable/`
- Claude Code：`.claude/skills/impeccable/`

如果宿主 bundle 不存在，但 `PRODUCT.md` / `DESIGN.md` 已在可信位置存在，可以继续 BFDS；否则停止并要求安装或提供可信上下文。

## 局部实时微调

局部微调只作用于当前 BFDS 设计任务的局部区域。入口、dev server 或 live config 不可验证时停止，不伪造 live 结果。
