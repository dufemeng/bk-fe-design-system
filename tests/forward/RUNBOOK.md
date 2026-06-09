# BFDS 前向测试运行手册

前向测试是 agent 行为测试，不是单元测试。修改两个 BFDS skill 后，用这份手册做行为验证。

## 规则

- 每个场景使用新的 thread 或 subagent。
- 传入 skill 路径和接近真实用户的请求。
- 不要把“期望行为”段落贴进 agent prompt。
- 不要告诉 agent 你怀疑的问题。
- 记录 transcript、读取文件、停止点和生成的设计产物。
- 每个场景之间清理生成的 `docs/design/<slug>/` 设计产物，除非该场景明确需要保留。

## 提示词形态

使用这类提示词：

```text
Use $bfds-design at /path/to/skills/bfds-design. Here is the user request:
这是 PRD，开始设计。

Use the repository at /path/to/project.
```

不要这样写：

```text
Review this skill and confirm it reads intent-router.md.
```

## 最小新会话场景

1. `bfds-design-start.md`：应触发 `bfds-design`，并停在目标界面与变更边界确认。
2. `bfds-design-selection.md`：只有已有评审工作台/status.json 时，才生成设计交付包。
3. `bfds-implement-no-artifacts.md`：缺设计交付包时，应拒绝写代码。
4. `bfds-implement-resume-many-slugs.md`：应列出候选设计任务，并等待用户选择。
5. `bfds-negative-api-database-bug.md`：普通 API、数据库、debug 工作不应进入 BFDS。

## 压力测试

前向测试描述期望行为。压力测试验证新会话 agent 在真实诱导下不会走捷径。

修改设计上下文、门禁、设计方向探索、评审工作台或设计交付包流程后，必须按 `tests/pressure/RUNBOOK.md` 跑压力测试，再判断 `bfds-design` 是否稳定。

## 证据模板

```text
场景：
Agent/thread：
Prompt：
读取文件：
决策：
停止/继续点：
生成产物：
异常行为：
通过/失败：
```
