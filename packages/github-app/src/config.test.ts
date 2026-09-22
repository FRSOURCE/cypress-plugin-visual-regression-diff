import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  loadConfig,
  parseConfig,
  renderTemplate,
} from './config.js';

describe('parseConfig', () => {
  it('fills in defaults', () => {
    expect(parseConfig(undefined)).toEqual({ config: DEFAULT_CONFIG });
    expect(DEFAULT_CONFIG).toMatchObject({
      artifacts: ['**'],
      commentCommand: 'approve-visuals',
      perImageChecks: 10,
      images: true,
      checkName: 'Visual regression',
    });
  });

  it('accepts overrides', () => {
    expect(
      parseConfig({ artifacts: ['visual-*'], images: false, perImageChecks: 0 })
        .config,
    ).toMatchObject({
      artifacts: ['visual-*'],
      images: false,
      perImageChecks: 0,
    });
  });

  it('falls back to defaults with a readable error on invalid input', () => {
    const { config, error } = parseConfig({
      perImageChecks: -1,
      unknownKey: true,
    });
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(error).toContain('perImageChecks');
    expect(error).toContain('unknownKey');
  });
});

describe('loadConfig', () => {
  it('reads the file through the Probot context', async () => {
    const context = {
      config: async <T>(file: string) => {
        expect(file).toBe('visual-regression.yml');
        return { commentCommand: 'approve-shots' } as unknown as T;
      },
    };
    expect((await loadConfig(context)).config.commentCommand).toBe(
      'approve-shots',
    );
  });

  it('uses defaults when there is no file', async () => {
    const context = { config: async <T>() => null as T | null };
    expect(await loadConfig(context)).toEqual({ config: DEFAULT_CONFIG });
  });
});

describe('renderTemplate', () => {
  it('replaces known placeholders only', () => {
    expect(
      renderTemplate('{count} by {user} {unknown}', { count: 2, user: 'a' }),
    ).toBe('2 by a {unknown}');
  });
});
