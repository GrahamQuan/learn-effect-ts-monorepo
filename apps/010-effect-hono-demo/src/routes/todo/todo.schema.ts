import { Effect, Schema } from 'effect';

import { ValidationError } from '@/routes/todo/todo.errors';

export class Todo extends Schema.Class<Todo>('Todo')({
  id: Schema.UUID,
  title: Schema.NonEmptyString,
  description: Schema.NullOr(Schema.String),
  completed: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
}) {}

export class CreateTodoInput extends Schema.Class<CreateTodoInput>('CreateTodoInput')({
  title: Schema.NonEmptyString,
  description: Schema.optional(Schema.String),
}) {}

export class UpdateTodoInput extends Schema.Class<UpdateTodoInput>('UpdateTodoInput')({
  title: Schema.optional(Schema.NonEmptyString),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  completed: Schema.optional(Schema.Boolean),
}) {}

export type TodoEvent =
  | Readonly<{ type: 'todo.created'; todoId: string }>
  | Readonly<{ type: 'todo.updated'; todoId: string }>
  | Readonly<{ type: 'todo.deleted'; todoId: string }>;

const TodoId = Schema.UUID;

const validationError = (message: string, cause: unknown) =>
  new ValidationError({
    message,
    issues: [String(cause)],
  });

export const decodeTodoId = (input: unknown) =>
  Schema.decodeUnknown(TodoId)(input).pipe(
    Effect.mapError((cause) => validationError('Todo id must be a UUID.', cause)),
  );

export const decodeCreateTodoInput = (input: unknown) =>
  Schema.decodeUnknown(CreateTodoInput)(input).pipe(
    Effect.mapError((cause) => validationError('Invalid create todo body.', cause)),
  );

export const decodeUpdateTodoInput = (input: unknown) =>
  Schema.decodeUnknown(UpdateTodoInput)(input).pipe(
    Effect.mapError((cause) => validationError('Invalid update todo body.', cause)),
    Effect.flatMap((todo) => {
      const hasUpdate = todo.title !== undefined || todo.description !== undefined || todo.completed !== undefined;
      return hasUpdate
        ? Effect.succeed(todo)
        : Effect.fail(new ValidationError({ message: 'Update body must include at least one todo field.' }));
    }),
  );
