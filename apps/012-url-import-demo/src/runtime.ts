import { Layer, ManagedRuntime } from 'effect';

import { AppConfigLive } from '@/config';
import { ImportLayer } from '@/imports/import.runtime';

export const AppLayer = ImportLayer.pipe(Layer.provide(AppConfigLive));

export const AppRuntime = ManagedRuntime.make(AppLayer);
