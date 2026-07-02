import { Context, Effect, Layer } from 'effect';

import { AppConfig } from '@/config';
import { FetchError } from '@/imports/import.errors';

export interface UrlFetcher {
  readonly fetch: (url: string) => Effect.Effect<string, FetchError>;
}

export const UrlFetcher = Context.GenericTag<UrlFetcher>('012-url-import-demo/imports/UrlFetcher');

export const UrlFetcherLive = Layer.effect(
  UrlFetcher,
  Effect.gen(function* () {
    const config = yield* AppConfig;

    return {
      fetch: (url) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(url, {
              signal: AbortSignal.timeout(config.fetchTimeoutMs),
              headers: {
                'user-agent': '012-url-import-demo/0.0.0',
              },
            });

            if (!response.ok) {
              throw new Error(`Received HTTP ${response.status} ${response.statusText}`);
            }

            return response.text();
          },
          catch: (cause) => new FetchError({ url, cause }),
        }),
    };
  }),
);
