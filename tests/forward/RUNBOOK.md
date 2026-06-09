# BFDS Forward Test Runbook

Forward tests are agent-behavior tests, not unit tests. Use this runbook when validating the two BFDS skills after edits.

## Rules

- Run each scenario in a fresh thread or subagent.
- Pass the skill path and user-like request.
- Do not paste the expected behavior section into the agent prompt.
- Do not tell the agent what bug you suspect.
- Record the transcript, files read, stop point, and produced artifacts.
- Clean up generated `docs/design/<slug>/` artifacts between runs unless the scenario explicitly needs them.

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

1. `bfds-design-start.md`: should trigger `bfds-design` and stop at Surface Change Framing.
2. `bfds-design-selection.md`: should generate contract pack only after an existing workbench/status is available.
3. `bfds-implement-no-artifacts.md`: should refuse to write code without contract pack.
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
