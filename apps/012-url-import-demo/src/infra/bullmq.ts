import type { JobsOptions } from 'bullmq';

export const IMPORT_JOB_NAME = 'import-url';

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1_000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
} satisfies JobsOptions;

export const connectionFromRedisUrl = (redisUrl: string) => {
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  };
};
