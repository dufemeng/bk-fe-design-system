# BFDS Forward Test Runbook

Forward tests are agent-behavior tests, not unit tests. Use this runbook when validating the two BFDS skills after edits.

## Rules

- Run each scenario in a fresh thread or subagent.
- Pass the skill path and user-like request.
- Do not paste the expected behavior section into the agent prompt.
- Do not tell the agent what bug you suspect.
- Record the transcript, files read, stop point, and produced artifacts.
- 每个场景之间清理生成的 `docs/design/<slug>/` 设计产物，除非该场景明确需要保留。

## Prompt Shape

Use prompts like:

```text
Use $bfds-design at /path/to/skills/bfds-design. Here is the user request:
这是 PRD，开始设计。

Use the repository at /path/to/project.
```

Not:

```text
Review this skill and confirm it reads intent-router.md.
```

## Minimum Fresh-Agent Scenarios

1. `bfds-design-start.md`: should trigger `bfds-design` and stop at 目标界面与变更边界确认。
2. `bfds-design-selection.md`: should generate 设计交付包 only after an existing 评审工作台/status.json is available.
3. `bfds-implement-no-artifacts.md`: should refuse to write code without 设计交付包.
4. `bfds-implement-resume-many-slugs.md`: should list candidates and wait for user choice.
5. `bfds-negative-api-database-bug.md`: should not route ordinary API/database/debug work into BFDS.

## Evidence Template

```text
Scenario:
Agent/thread:
Prompt:
Files read:
Decision:
Stop/continue point:
Artifacts produced:
Unexpected behavior:
Pass/fail:
```
