# Pitfall Checklists

Read only the sections relevant to the active learning scope. Use these prompts
to discover invariants and executable failure scenarios, not to demand
production hardening from every learning project.

## Cross-Boundary Questions

- Who owns each piece of state?
- Which operation is synchronous, asynchronous, durable, cached, or ephemeral?
- What is the retry boundary?
- What happens after partial success?
- Can the same operation run twice safely?
- What does the caller observe while background work is incomplete?
- Which timeout or cancellation boundary applies?
- What operational signal reveals failure?

## Cache

- Is the cache a performance layer or the only copy of important data?
- What forms the key, and does it include relevant model or configuration
  versions?
- Is TTL intentional and bounded?
- What happens on malformed cached data?
- Does force refresh bypass only the intended layer?
- Can concurrent misses create a stampede?
- Does a lock have safe expiry and ownership semantics?

## Queue and Worker

- What happens when the producer succeeds but the worker is offline?
- Is job creation idempotent?
- Is job processing independently idempotent?
- Can retries duplicate durable writes or external effects?
- What are the attempts, backoff, retention, and concurrency policies?
- Does the request accidentally wait for background work?
- How are waiting, failed, stalled, and incompatible jobs observed?
- Can a payload outlive the code version that created it?
- What provides backpressure when producers outrun workers?

## Database and Retrieval

- What is the durable source of truth?
- Are related writes transactional?
- How are duplicate documents, URLs, chunks, or jobs identified?
- What happens when content changes but identifiers do not?
- Does embedding dimension match the schema and index?
- How is embedding-model versioning handled?
- Can stale or partial ingestion affect later retrieval?
- Which query threshold or ranking behavior is guaranteed by code versus merely
  assumed?

## Browser and Web Content

- What navigation timeout and content limit apply?
- Are redirects and canonical URLs handled consistently?
- What happens on launch failure, blocked pages, empty bodies, or dynamic
  rendering?
- Does one failing page discard successful pages?
- Are browser, context, and page resources always closed?
- Is untrusted content separated from instructions sent to the model?
- Does the demonstration rely on a website that may change independently?

## LLM and Agent Workflow

- Which model outputs are structured and validated?
- Can the model invent identifiers, URLs, citations, or routing decisions?
- What limits loops, retries, search rounds, and tool calls?
- What happens with empty, irrelevant, or contradictory context?
- Which state is request-local and which is durable?
- Are prompt, model, and embedding versions reflected in cache identity?
- Can secrets, upstream response bodies, or raw stacks reach users or logs?
- Are citations derived from known documents rather than trusted from model
  text?

## Test Realism

- Which components are real, fake, mocked, recorded, or skipped?
- Does the test assert observable behavior or only internal calls?
- Can the scenario pass while the real integration remains broken?
- Is the environment deterministic and isolated?
- Does the test demonstrate a single learning point?
- Does it state what it proves and what it does not prove?
- Is there at least one failure scenario for the central boundary?

## README Accuracy

- Does the documented startup model match the actual entrypoints?
- Do Mermaid edges match orchestration code?
- Are synchronous and asynchronous steps distinguished?
- Are environment variables current and correctly classified?
- Do test commands exist and demonstrate the stated scenarios?
- Are future ideas clearly separated from implemented behavior?
- Is the recommended reading order still the shortest route through the core
  concept?
