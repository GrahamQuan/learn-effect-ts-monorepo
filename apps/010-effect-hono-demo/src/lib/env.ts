import { config } from 'dotenv'; // if we use node
import { expand } from 'dotenv-expand'; // if we use node

import { ZodError, z } from 'zod';

expand(config());

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  CACHE_URL: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

try {
  EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof ZodError) {
    let message = 'Missing required values in .env:\n';
    error.issues.forEach((issue) => {
      message = `${String(issue.path[0])}: ${issue.message}\n`;
    });
    const e = new Error(message);
    e.stack = '';
    throw e;
  } else {
    console.error(error);
  }
}

export type ENV = z.infer<typeof EnvSchema>;
const env = EnvSchema.parse(process.env);

export { env };
