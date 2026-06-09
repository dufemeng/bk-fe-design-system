# BFDS 新会话 agent 压力测试运行手册

压力测试是新会话 agent 或 fresh thread 的行为测试，用来验证 skill 在真实诱导下不会走捷径。

## 规则

- 每个场景都在 fresh thread 或 subagent 里运行。
- 只给 agent skill 路径和用户输入。
- 不要把“禁止行为”或“通过标准”段落贴进 agent prompt。
- 不要提及你怀疑的问题。
- 记录读取文件、运行命令、停止点、生成产物和任何跳步理由。

## 提示词形态

```text
Use $bfds-design at /path/to/skills/bfds-design. Here is the user request:
<只复制“用户输入”段落>

Use the repository at <临时场景仓库>.
```

## 证据模板

```text
场景：
Agent/thread：
提示词：
读取文件：
运行命令：
决策：
停止/继续点：
生成产物：
异常行为：
失败时的跳步理由：
通过/失败：
```
