import { z } from 'zod'

function normalizeUrl(url: string) {
  return url.replace(/\/$/, '')
}

const baseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.')
    .refine(
      (value) => normalizeUrl(value) === hostedSupabaseProjectUrl,
      'NEXT_PUBLIC_SUPABASE_URL must target the hosted Supabase project, not a local runtime.',
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required.'),
  NEXT_PUBLIC_APP_URL: z.string().trim().url('NEXT_PUBLIC_APP_URL must be a valid URL.'),
  SEED_SECRET: z.string().trim().min(1, 'SEED_SECRET is required.'),
  MOCKLY_API_URL: z.string().trim().url('MOCKLY_API_URL must be a valid URL.'),
  ANTHROPIC_API_KEY: z.string().trim().min(1, 'ANTHROPIC_API_KEY is required.'),
})

const publicEnvSchema = baseEnvSchema
  .pick({
    NEXT_PUBLIC_SUPABASE_URL: true,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
    NEXT_PUBLIC_APP_URL: true,
    MOCKLY_API_URL: true,
  })
  .transform((env) => ({
    ...env,
    NEXT_PUBLIC_SUPABASE_URL: normalizeUrl(env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_APP_URL: normalizeUrl(env.NEXT_PUBLIC_APP_URL),
    MOCKLY_API_URL: normalizeUrl(env.MOCKLY_API_URL),
  }))

const serverEnvInputSchema = baseEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_APP_URL: true,
  MOCKLY_API_URL: true,
  SUPABASE_SERVICE_ROLE_KEY: true,
  SEED_SECRET: true,
  ANTHROPIC_API_KEY: true,
})

const normalizedServerEnvSchema = serverEnvInputSchema.transform((env) => ({
  ...env,
  NEXT_PUBLIC_SUPABASE_URL: normalizeUrl(env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_APP_URL: normalizeUrl(env.NEXT_PUBLIC_APP_URL),
  MOCKLY_API_URL: normalizeUrl(env.MOCKLY_API_URL),
}))

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof normalizedServerEnvSchema>

function formatMissingEnvError(scope: 'public' | 'server', issues: z.ZodIssue[]) {
  const formattedIssues = issues
    .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n')

  return [
    `Invalid ${scope} environment configuration for Mockly.`,
    'Populate the required values in .env.local (local development) or your deployment environment before continuing.',
    formattedIssues,
  ].join('\n')
}

function readPublicEnvInput() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    MOCKLY_API_URL: process.env.MOCKLY_API_URL,
  }
}

function readServerEnvInput() {
  return {
    ...readPublicEnvInput(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SEED_SECRET: process.env.SEED_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  }
}

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(readPublicEnvInput())

  if (!result.success) {
    throw new Error(formatMissingEnvError('public', result.error.issues))
  }

  return result.data
}

export function getServerEnv(): ServerEnv {
  const result = normalizedServerEnvSchema.safeParse(readServerEnvInput())

  if (!result.success) {
    throw new Error(formatMissingEnvError('server', result.error.issues))
  }

  return result.data
}

export function isHostedSupabaseUrl(url: string) {
  return normalizeUrl(url) === hostedSupabaseProjectUrl
}

export const hostedSupabaseProjectId = 'kxwtpdnlbmsqbzpycgzx'
export const hostedSupabaseProjectUrl = `https://${hostedSupabaseProjectId}.supabase.co`
