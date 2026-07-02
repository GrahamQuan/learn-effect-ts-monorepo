import { Layer } from 'effect';

import { ArticleExtractorLive } from '@/imports/import.extractor';
import { UrlFetcherLive } from '@/imports/import.fetcher';
import { TextProcessorLive } from '@/imports/import.processor';
import { ImportQueueLive } from '@/imports/import.queue';
import { ImportRepositoryFileLive } from '@/imports/import.repository';
import { ImportServiceLive } from '@/imports/import.service';

export const ImportLayer = ImportServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(ImportRepositoryFileLive, ImportQueueLive, UrlFetcherLive, ArticleExtractorLive, TextProcessorLive),
  ),
);
