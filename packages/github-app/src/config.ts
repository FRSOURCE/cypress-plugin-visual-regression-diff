import { MANIFEST_FILE_GLOB } from '@frsource/visual-regression-manifest';
import { z } from 'zod';

/** Name of the per-repository config file, read from `.github/` on the default branch. */
export const CONFIG_FILE = 'visual-regression.yml';

export const configSchema = z.strictObject({
  /** Artifact-name globs (picomatch) to look for manifests in. */
  artifacts: z.array(z.string().min(1)).min(1).default(['**']),
  /**
   * Glob (picomatch) matched against file paths inside the artifact zip. The
   * default finds every file named by the manifest standard
   * (`visual-regression-manifest[.<label>].json`), which is what
   * `@frsource/cypress-plugin-visual-regression-diff` 4.3+ writes.
   */
  manifestGlob: z.string().min(1).default(MANIFEST_FILE_GLOB),
  /**
   * Directory of the Cypress project inside the repository, for manifests that
   * do not carry `ci.workspace` (monorepos). Empty string = repository root.
   */
  projectRoot: z.string().default(''),
  /** Slash command name, used as `/<commentCommand> [names…]`. */
  commentCommand: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/i)
    .default('approve-visuals'),
  /** How many failed screenshots get their own check run with an "Approve" button; `0` disables them. */
  perImageChecks: z.number().int().min(0).max(50).default(10),
  /** `false` turns the report text-only (no screenshots are served from this server). */
  images: z.boolean().default(true),
  /** Lifetime of image links; the server caps it with `IMAGE_URL_TTL_HOURS`. */
  imageTtlDays: z.number().min(0).default(14),
  /** Number of failed entries rendered with thumbnails before the rest is collapsed. */
  maxCommentEntries: z.number().int().min(0).default(20),
  checkName: z.string().min(1).max(200).default('Visual regression'),
  /** Placeholders: `{count}`, `{names}`, `{user}`, `{run}`. */
  commitMessage: z
    .string()
    .min(1)
    .default('test: approve visual baselines ({count} images)'),
});

export type Config = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: Config = configSchema.parse({});

export type ConfigResult = { config: Config; error?: string };

/** Validates a raw config object; invalid input yields the defaults plus a human-readable error. */
export const parseConfig = (raw: unknown): ConfigResult => {
  const result = configSchema.safeParse(raw ?? {});
  if (result.success) return { config: result.data };
  const error = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  return { config: DEFAULT_CONFIG, error };
};

type ConfigReader = {
  config<T>(fileName: string, defaultConfig?: T): Promise<T | null>;
};

/** Reads `.github/visual-regression.yml` through Probot (repo, then the org's `.github` repo). */
export const loadConfig = async (
  context: ConfigReader,
): Promise<ConfigResult> => {
  const raw = await context.config<Record<string, unknown>>(CONFIG_FILE);
  return parseConfig(raw);
};

/** Allowed values for the `{names}` placeholder and friends. */
export const renderTemplate = (
  template: string,
  vars: Record<string, string | number>,
) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
