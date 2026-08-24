# Executable Lessons

Use this reference to turn architecture paths and invariants into observable,
repeatable learning demonstrations.

During Round 1 of the parent skill, use this reference only to design and
classify proposed scenarios. Do not create test files, install dependencies,
start infrastructure, or run stateful demonstrations. During Round 2, create
and run only the scenarios and environment actions included in the learner's
confirmed preview.

## Choose the Honest Test Level

### Unit Test

Use as a microscope for one function, policy, or state transition. A unit test
can explain a local invariant but cannot prove system wiring or infrastructure
behavior.

### Hermetic Scenario Test

Use the real application entrypoint and internal orchestration while replacing
remote systems with controlled fakes. This is often the best default teaching
environment because it is fast, deterministic, and able to demonstrate the
complete internal decision path.

Examples:

- HTTP request through real routing and graph orchestration.
- Cache hit short-circuiting retrieval and model calls.
- Insufficient context dispatching a background-ingestion contract.
- API response completing without waiting for a fake worker.

Call this a scenario test rather than claiming it validates real infrastructure.

### Local Integration E2E

Use real local or dedicated test infrastructure when the lesson concerns
protocol or lifecycle behavior that fakes cannot establish.

Examples:

- A BullMQ job entering Redis and being consumed by a Worker.
- Worker outage leaving a job waiting.
- Retry interacting with idempotent database writes.
- Migrations, vector dimensions, or transaction behavior in PostgreSQL.

Keep the environment isolated, reproducible, and disposable. Do not introduce
containers or services unless the user requested test creation or environment
setup.

### Remote Smoke Test

Use real hosted models, databases, caches, browsers, or websites only for a few
assumptions that cannot be validated locally. Require explicit authorization
when credentials, cost, external writes, or operational impact are involved.

Remote smoke tests should not be the default regression or teaching loop.

## Map README Paths to Demonstrations

For each important path or invariant, record:

| Field | Meaning |
| --- | --- |
| Scenario | Learner-facing behavior being demonstrated |
| Concept | Architecture or agent concept taught |
| Test level | Unit, scenario, local E2E, or remote smoke |
| Preconditions | Services, fixtures, credentials, and process state |
| Action | User-visible operation or triggering event |
| Observation | Response, state transition, queue state, row count, or trace |
| Code scope | Small set of relevant implementation and test files |
| Proves | Claim supported by the result |
| Does not prove | Nearby claim that remains unverified |

Include a compact scenario table in the project README when the user authorized
documentation changes. Link architecture concepts to test commands rather than
listing every test file.

## Classroom Demonstration Loop

### Predict

Ask the learner what should happen before revealing the result. Target a
specific routing, state, or failure question.

### Demonstrate

Run or inspect one scenario. Prefer observable behavior over mock-call counts:

- HTTP status and response body.
- Graph node or state transitions.
- Queue waiting/active/completed state.
- Durable row counts or content hashes.
- Retry, fallback, or timeout result.

### Explain

Connect the observation to the README map, relevant code contract, and test
assertions. Separate observed facts from inferred design intent.

### Vary

Change one condition only: stop a worker, force a cache hit, inject a timeout,
repeat a job, return malformed model output, or make browser fetching fail.
Show how the system boundary becomes visible.

### Reconstruct

Ask the learner to add a small scenario, predict an assertion, implement a fake
boundary, or explain the required module changes.

## Design Teaching-Friendly Tests

Prefer:

- One teaching point per scenario.
- Behavior-oriented names.
- Visible Given/When/Then structure.
- Small, explicit fixtures.
- Minimal helper indirection.
- Failure scenarios as first-class lessons.
- Assertions on outcomes and durable state.

Avoid tests that only prove an internal method was called unless that call is
the contract being taught. Do not make teaching tests artificially clever or
DRY when indirection hides the scenario.

Example shape:

```ts
it('returns the answer without waiting for background ingestion', async () => {
  // Given: retrieval is insufficient and the worker is unavailable
  // When: the learner submits a search request
  // Then: the API returns an answer and an ingestion job ID
  // And: durable ingestion has not completed yet
});
```

## Failure Demonstrations

Choose failures that expose an architectural boundary:

- Cache unavailable.
- Queue producer unavailable.
- Worker offline or restarted.
- Duplicate or retried job.
- Partial durable write.
- Browser timeout or blocked page.
- Invalid structured model output.
- Empty retrieval context.
- Incompatible job payload version.

For each failure, explain the trigger, visible symptom, recovery behavior,
invariant, and detection signal.

## Reporting Results

Always disclose:

- The exact command or scenario inspected.
- Which dependencies were real and which were fake.
- The observed result.
- What the scenario proves.
- What remains unverified.

Do not convert a skipped, mocked, or unavailable integration into a passing
claim. An inability to run a realistic scenario is itself useful learning
evidence about the project's operability.
