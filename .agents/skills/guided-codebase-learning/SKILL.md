---
name: guided-codebase-learning
description: Interactively prepare and teach an unfamiliar or AI-generated codebase through a verified README learning map, scoped source evidence, executable tests, failure paths, and reconstruction exercises. Use when the user supplies a repository path and wants to understand or master it without reviewing every line. Always perform a read-only discovery and exact change preview first, then wait for confirmation before editing learning files. Do not use for ordinary implementation-only, formatting, or conventional code-review requests.
---

# Guided Codebase Learning

Help the learner gain transferable understanding without reading the entire
repository line by line. Use the README as the course map, source code as the
implementation evidence, tests as behavioral evidence, and executable
scenarios as classroom demonstrations.

The learner should eventually be able to explain the architecture, predict
behavior, identify failure modes, evaluate design tradeoffs, and reconstruct a
minimal version of the central concept.

## Mandatory Interactive Protocol

Assume the learner may remember only the skill name and repository path. A
minimal invocation is sufficient:

```text
$guided-codebase-learning apps/example
```

If no learning level or topic is supplied, default to **Understand** and the
repository's core architecture. Infer useful starting scope from the README,
entrypoints, orchestration, and tests instead of blocking on clarification.

Run the workflow in separate turns. Never combine the discovery and mutation
rounds when file changes may be useful.

### Round 1: Read-only Discovery and Change Preview

Inspect the target repository without changing files, installing dependencies,
starting services, or running scenarios that can mutate local or remote state.
Use existing code, configuration, README content, test names, and scripts to
prepare a concrete learning plan.

Return:

1. **Detected project and learning goal:** what the project teaches and the
   assumed mastery level.
2. **Verified architecture summary:** the shortest useful main path and the
   important synchronous or asynchronous boundaries.
3. **Scope contract:** exact source and test files that will anchor the first
   learning topic, plus intentionally deferred areas.
4. **Proposed file changes:** an exact table of files to create, update, or
   leave unchanged. For every changed file, explain the stable learning value
   being added.
5. **Executable lesson plan:** proposed unit, hermetic scenario, local E2E, or
   remote smoke scenarios; identify which dependencies are real or fake and
   what each scenario proves and does not prove.
6. **Commands and environment:** commands expected after editing, required
   services, credentials, containers, package changes, and possible external
   effects.
7. **Risks and non-goals:** what this preparation intentionally will not make
   production-ready or validate.

Name exact paths. Do not say only "README and tests will change." If the README
or current tests are already sufficient, explicitly propose no change for
them rather than creating work for consistency.

End Round 1 by asking the learner to confirm or revise the proposed scope. Do
not edit files in the same turn.

If the learner asks a question or changes the goal instead of confirming,
answer or revise the preview while remaining read-only.

### Round 2: Confirmed File Updates

Treat an explicit reply such as "确认", "继续", or "update files" as approval
for only the local file changes and ordinary local validation commands listed
in the latest preview.

After confirmation:

1. Recheck the target files and preserve unrelated user changes.
2. Apply only the approved README, learning-test, fixture, script, or config
   changes.
3. Keep README content navigational and teaching tests behavior-oriented.
4. Run the approved deterministic validation in proportion to the change.
5. Report exactly what changed, what passed, and what remains unverified.
6. Present the first prediction question or executable lesson as the next
   learning step.

If implementation reveals a materially different file list, new dependency,
service, credential, container, cost, or external mutation, stop and return an
amended preview for another confirmation. Never treat confirmation of local
files as authorization for remote or destructive actions.

### Later Learning Rounds

Continue with short cycles of prediction, demonstration, evidence-based
explanation, one-condition variation, and reconstruction. Keep questions tied
to the active README scope unless repository evidence cannot answer them.

## Grounding Rules

Use this evidence order:

1. Use the README to locate the relevant system area and learning direction.
2. Use project code and configuration to establish what is implemented.
3. Use tests to establish which behaviors are demonstrated or protected.
4. Inspect installed dependency types or source when project code cannot
   explain third-party behavior.
5. Use official documentation when library semantics, version behavior, or
   external-system guarantees remain unanswered.
6. Use broader external sources only when the previous levels are insufficient.

The README is navigation, not final authority. When README, code, and tests
conflict, report the conflict and treat code plus observable behavior as the
current implementation. Clearly label inference, recommendation, and external
knowledge.

Keep later questions inside the current code scope. Expand the scope only when
the learner requests it or the repository cannot answer the question. State
why a fallback is necessary before using outside material.

## Authorization and Safety

The initial invocation is always read-only. It does not authorize editing a
README, adding tests, installing packages, starting services, using
credentials, or mutating remote systems. Follow the mandatory interactive
protocol even when the initial prompt describes desired README or E2E output.

After confirmation, make the smallest changes listed in the approved preview.
Do not run credentialed, costly, destructive, or externally mutating
demonstrations without separate explicit authorization.

Never claim that mocked tests validate real Redis, PostgreSQL, browsers,
models, queues, networks, or hosted services.

## Calibrate the Learning Goal

Infer or establish one of these levels:

- **Use:** run, configure, observe, and locate common failures.
- **Understand:** explain architecture, data flow, boundaries, tradeoffs, and
  failure modes.
- **Master:** reconstruct a minimal version and adapt the design without
  copying the implementation.

Default to **Understand** when the level is unclear. Keep the current topic
narrow enough for one useful session and name the relevant software,
distributed-system, or AI-agent concepts explicitly.

## Build or Verify the README Learning Map

Before teaching details, inspect the existing README and verify it against
high-signal repository evidence in this order:

1. Entrypoints and startup commands.
2. Core types, state, schemas, and contracts.
3. Main orchestration and routing.
4. Important integration boundaries and side effects.
5. Tests that describe required behavior.
6. Configuration and environment variables.

A useful learning map normally explains:

- Project purpose and learning objectives.
- Architecture and component responsibilities.
- Inputs, outputs, state, and data ownership.
- Synchronous and asynchronous boundaries.
- One main success path and important failure paths.
- Key decisions, tradeoffs, and invariants.
- Executable learning scenarios and commands.
- Recommended code-reading order.
- Known limitations and intentionally omitted production concerns.

Keep the README navigational. Do not turn it into a line-by-line reference or
copy every discussion into it. Add only stable knowledge that will help future
learners locate concepts or predict behavior.

If README editing was not authorized, present the verified learning map in the
conversation and identify any stale or missing README sections without
changing files.

## Establish a Scope Contract

For the current topic, identify:

- The concept or subsystem being learned.
- The small set of files that contain the primary evidence.
- Tests or commands that demonstrate it.
- Adjacent topics intentionally deferred.
- The observable outcome the learner should understand.

Explain why each selected file matters. Prefer architecture-driven reading:

```text
README map
  -> entrypoint
  -> state and contracts
  -> orchestration
  -> integration boundary
  -> behavior tests
  -> implementation detail only when needed
```

Do not walk directories alphabetically or explain every file unless the user
explicitly requests it.

## Teach Through Paths and Decisions

Trace one realistic golden path from input to output. At each important step,
explain the input, output, state transition, side effect, and routing decision.

Then trace one meaningful failure path, such as dependency unavailability,
timeout, duplicate execution, partial persistence, invalid model output,
worker outage, cache inconsistency, or browser failure. Explain whether the
system retries, falls back, waits, fails, or becomes eventually consistent.

For important design decisions, cover:

- The problem being solved.
- The chosen design and a plausible alternative.
- The tradeoff.
- The invariant that must remain true.
- The observable failure if the invariant is broken.

Read [references/pitfall-checklists.md](references/pitfall-checklists.md) only
for the relevant subsystem boundaries.

## Use Tests as Executable Lessons

Treat tests as executable teaching demonstrations, not only regression checks.
Map important README paths and invariants to the smallest meaningful test or
scenario.

Prefer this teaching loop:

1. Ask the learner to predict the behavior.
2. Run or inspect the smallest relevant scenario.
3. Show the observable result.
4. Connect the result to README architecture and code evidence.
5. Change one condition to demonstrate a boundary or failure.
6. Ask the learner to explain or implement a small variation.

Distinguish unit tests, hermetic scenario tests, local integration E2E tests,
and remote smoke tests. For every demonstration, state what it proves and what
it does not prove.

Read [references/executable-lessons.md](references/executable-lessons.md) when
the project is runnable, the user requests test code or demonstrations, or the
concept depends on behavior that static reading cannot establish.

## Guide Follow-up Questions

For later learner questions:

1. Locate the question in the README architecture.
2. Reuse the active scope when possible.
3. Cite the smallest relevant code and test evidence.
4. Answer the project-specific question before giving a generic tutorial.
5. Explain the related concept, invariant, or tradeoff.
6. Fall back to dependency source or official documentation only when project
   evidence is insufficient.

Do not let a local question silently expand into an unrelated framework survey.
When expansion would be useful, explain the boundary and let the learner choose.

## Require Reconstruction

End a substantial topic with the smallest exercise that demonstrates ownership
of the concept. Good exercises include:

- Redraw the workflow without looking at the README.
- Predict which modules change for a new requirement.
- Recreate one interface and a fake implementation.
- Write one test for a critical invariant.
- Implement a minimal queue and worker.
- Remove and recreate one small core function from its contract and tests.

Prefer exercises that take roughly 15–45 minutes rather than rewriting the
whole project.

Do not equate reading all files, passing tests, or repeating an explanation
with mastery. Check whether the learner can explain one success path, one
failure path, the central tradeoffs, the important invariants, and a minimal
reconstruction.

## Teaching Style

Teach in short, evidence-backed rounds when interaction is possible. Use
questions to diagnose understanding, not to create ceremony. Correct mistaken
mental models directly and show the evidence.

When the user requests a complete read-only report, provide the learning map,
scope, paths, decisions, invariants, executable scenarios, pitfalls, and
reconstruction plan in one coherent response. If that report proposes file
changes, still stop after the preview and wait for confirmation before editing.
