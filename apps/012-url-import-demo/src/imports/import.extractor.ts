import { Context, Effect, Layer } from 'effect';

import { ExtractError } from '@/imports/import.errors';

export interface ExtractedArticle {
  readonly title: string;
  readonly text: string;
}

export interface ArticleExtractor {
  readonly extract: (html: string, url: string) => Effect.Effect<ExtractedArticle, ExtractError>;
}

export const ArticleExtractor = Context.GenericTag<ArticleExtractor>('012-url-import-demo/imports/ArticleExtractor');

const firstMatch = (html: string, pattern: RegExp) => pattern.exec(html)?.[1]?.trim();

const decodeBasicEntities = (input: string) =>
  input
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

const stripHtml = (html: string) =>
  decodeBasicEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

export const ArticleExtractorLive = Layer.succeed(ArticleExtractor, {
  extract: (html, url) =>
    Effect.gen(function* () {
      const title = decodeBasicEntities(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? url);
      const text = stripHtml(html);

      if (text.length < 20) {
        return yield* Effect.fail(new ExtractError({ url, cause: 'Extracted text was too short.' }));
      }

      return {
        title,
        text,
      };
    }),
});
