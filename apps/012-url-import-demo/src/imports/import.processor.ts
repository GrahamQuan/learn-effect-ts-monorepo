import { Context, Effect, Layer } from 'effect';

import { ProcessingError } from '@/imports/import.errors';

export interface TextChunk {
  readonly index: number;
  readonly text: string;
}

export interface ProcessedChunk {
  readonly index: number;
  readonly summary: string;
  readonly wordCount: number;
}

export interface TextProcessor {
  readonly processChunk: (chunk: TextChunk) => Effect.Effect<ProcessedChunk, ProcessingError>;
}

export const TextProcessor = Context.GenericTag<TextProcessor>('012-url-import-demo/imports/TextProcessor');

const words = (text: string) => text.split(/\s+/).filter(Boolean);

const firstWords = (text: string, count: number) => words(text).slice(0, count).join(' ');

export const TextProcessorLive = Layer.succeed(TextProcessor, {
  processChunk: (chunk) =>
    Effect.gen(function* () {
      const wordCount = words(chunk.text).length;

      if (wordCount === 0) {
        return yield* Effect.fail(new ProcessingError({ chunkIndex: chunk.index, cause: 'Chunk was empty.' }));
      }

      return {
        index: chunk.index,
        summary: firstWords(chunk.text, 32),
        wordCount,
      };
    }),
});
