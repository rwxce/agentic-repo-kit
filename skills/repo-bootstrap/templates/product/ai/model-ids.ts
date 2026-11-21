/**
 * WHAT: The one place model ids are resolved (product-AI module). Each AI feature reads its model
 *   from its own env var, set per environment in the secrets store: no default in code, so a
 *   missing var fails loudly instead of silently using a model nobody chose. Only approved
 *   providers pass (the list mirrors the processors the legal module approved). The var is read at
 *   call time, never at module load, so importing this file without env is safe.
 * REPO SIGNAL: LLM calls in product features, through a router (OpenRouter, a gateway) or SDKs.
 * CONFIGURE: MODEL_ENV_VARS (one entry per feature), ALLOWED_PROVIDERS, REQUIRED_MODEL_KEYS (keys
 *   with a live caller). Document every var in the env registry. Erasable TypeScript only.
 */

export const MODEL_ENV_VARS = {
  summarize: 'AI_SUMMARIZE_MODEL',
  classify: 'AI_CLASSIFY_MODEL',
  draft: 'AI_DRAFT_MODEL',
} as const

export type ModelKey = keyof typeof MODEL_ENV_VARS

/** Provider prefixes of `<provider>/<model>` ids the compliance review approved. */
export const ALLOWED_PROVIDERS: readonly string[] = ['openai', 'anthropic', 'google']

/** Keys with a live caller: their vars must be set in every environment. */
export const REQUIRED_MODEL_KEYS: readonly ModelKey[] = ['summarize', 'classify']

export type ModelErrorCode = 'AI_MODEL_NOT_CONFIGURED' | 'AI_MODEL_PROVIDER_NOT_ALLOWED'

export class ModelConfigError extends Error {
  code: ModelErrorCode
  envVar: string
  constructor(code: ModelErrorCode, envVar: string) {
    super(`${code}: ${envVar}`)
    this.code = code
    this.envVar = envVar
  }
}

type Env = Record<string, string | undefined>

export function getModelId(key: ModelKey, env: Env = process.env): string {
  const envVar = MODEL_ENV_VARS[key]
  const value = env[envVar]?.trim()
  if (!value) throw new ModelConfigError('AI_MODEL_NOT_CONFIGURED', envVar)
  const [provider] = value.split('/')
  if (!value.includes('/') || !ALLOWED_PROVIDERS.includes(provider)) {
    throw new ModelConfigError('AI_MODEL_PROVIDER_NOT_ALLOWED', envVar)
  }
  return value
}

/** For a diagnostics endpoint or a deploy smoke check: required vars that are unset. */
export function missingModelEnvVars(env: Env = process.env): string[] {
  return REQUIRED_MODEL_KEYS.map((k) => MODEL_ENV_VARS[k]).filter((v) => !env[v]?.trim())
}
