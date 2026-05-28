# Effect TS Learning Roadmap

Your goal when learning Effect TS is not to master all of Effect. The goal is to
build **foundational judgment + AI coding collaboration ability**.

That means you understand boundaries, errors, dependencies, and runtime behavior.
AI can help fill in implementations, and you review whether the generated code
preserves the Effect model.

The related AI and engineering concept is **typed effect**.

```ts
Effect<Success, Error, Requirements>
```

You can read it as:

```txt
Success = what the program returns when it succeeds
Error = how the program can fail
Requirements = which runtime dependencies the program needs
```

## Complete Roadmap

## Stage 1: Build The Effect Mental Model

Goal: understand what problem Effect is solving.

You need to understand:

```txt
Effect is not just a Promise replacement
Effect describes a program that has not run yet
Effect puts success values, errors, and dependencies into the type system
Effects are run at the application boundary
Business logic should avoid throw and runPromise
```

Recommended resources:

- [Typeonce Effect Beginners Course](https://www.typeonce.dev/course/effect-beginners-complete-getting-started)
- [Effect Quickstart](https://effect.website/docs/quickstart)
- [The Effect Type](https://effect.website/docs/getting-started/the-effect-type/)

The Typeonce course currently looks free and is a good fit for developers who
know some TypeScript or Node.js but are starting Effect from zero.

Completion standard:

```txt
You can explain Effect<A, E, R>
You know the difference between Effect and Promise
You know why you should not throw everywhere
You know why you should not call runPromise deep inside business logic
```

## Stage 2: Learn The Core APIs, Not Everything

Goal: learn only the APIs needed to collaborate well with AI coding tools.

Prioritize:

```txt
Effect.succeed
Effect.fail
Effect.sync
Effect.tryPromise
Effect.gen
Effect.all
Effect.catchTag
Effect.catchAll
Effect.match
Effect.runPromise
```

Core modules:

```txt
Data.TaggedError
Schema
Context
Layer
Config
```

Key meanings:

```txt
Data.TaggedError = typed business errors
Schema = input/output validation
Context = dependency declarations
Layer = dependency implementations
Config = environment configuration
```

Completion standard:

```txt
You can read an Effect.gen program
You can define a TaggedError
You can use Schema to validate AI or API responses
You can identify which services a function requires
```

## Stage 3: Build Demos To Strengthen Understanding

This stage matters most because you are not learning Effect for an exam. You are
learning it so you can build real projects.

### Demo 1: Basic Effect HTTP Demo

Build:

```txt
Call an external API
Handle network errors
Handle JSON parsing errors
Handle business errors
Run the final program with Effect.runPromise at the entrypoint
```

Concepts to practice:

```txt
Effect.tryPromise
TaggedError
Effect.gen
catchTag
```

### Demo 2: Effect + Hono API Demo

Build:

```txt
Write a Hono route
Validate the request body with Schema
Return Effect from business logic
Map different errors to different HTTP statuses
```

Concepts to practice:

```txt
Schema
error modeling
HTTP boundaries
converting Effect to Promise
```

### Demo 3: Effect + AI Coding Demo

Recommended project:

```txt
AI Agent Tool Runner
```

Feature design:

```txt
Accept a user question
Read local repo information
Call an AI SDK or LLM client to generate an answer
Validate AI output with Schema
Return structured errors on failure
Support timeout / retry / logging
```

Service boundaries:

```txt
RepoSearchService
LlmService
MemoryService optional
AnswerSchema
```

Error types:

```txt
MissingApiKey
RepoSearchError
ModelCallError
InvalidModelOutput
TimeoutError
```

You can prompt AI like this:

```txt
Please do not implement the business logic yet.
First help me design the Effect version of the type boundaries:

1. success value
2. error types
3. dependency services
4. each service interface
5. the final program's Effect type
```

Then, as the second step:

```txt
Now implement the smallest runnable version based on these boundaries.

Requirements:
- Do not call runPromise inside business functions
- Do not throw directly
- Inject external dependencies through Context/Layer
- Parse AI output with Schema
```

Completion standard:

```txt
You can ask AI to design Effect boundaries first
You can review whether AI throws incorrectly
You can detect whether AI hardcodes dependencies
You can judge whether runPromise appears only at the entrypoint layer
```

## Stage 4: Move Toward Production

Goal: do not migrate the whole project. Pick one small boundary and use Effect
there first.

Good production boundaries for Effect:

```txt
an external API client
a Hono route
a background job
a workflow node
an agent tool
an LLM call module
```

Production principles:

```txt
Call runPromise at the entrypoint
Return Effect from business logic
Use TaggedError for errors
Use Schema for input and output
Inject external dependencies through Context/Layer
Read environment variables with Config
Replace Layers in tests
```

Avoid at the beginning:

```txt
Effect-ifying the whole project
rewriting every service
forcing every Promise to become an Effect
learning too many advanced APIs at once
```

Completion standard:

```txt
You can safely add one small module to production
External callers can still receive a normal Promise
Internally, Effect manages errors, dependencies, and side effects
AI can help write the implementation, but you control the boundaries
```

## Final Target

The final target is not "become an Effect expert." It is reaching this level:

```txt
You can read Effect code
You can design Effect type boundaries
You can use AI to generate implementations
You can review AI-generated Effect code
You can add a small module to a real project
```

This path fits the AI coding era well. You do not need to memorize the complete
API, but you do need enough model sense to know what to ask AI to do and when AI
has drifted away from the Effect model.
