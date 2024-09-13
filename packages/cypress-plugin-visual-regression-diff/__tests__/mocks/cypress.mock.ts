import { vi } from 'vitest';
import { promises as fs } from 'fs';

export const Cypress = {
  Promise,
};
vi.stubGlobal('Cypress', Cypress);

export const cy = {
  readFile: vi.fn(fs.readFile),
};
vi.stubGlobal('cy', cy);

export const before = vi.fn();
vi.stubGlobal('before', before);

export const after = vi.fn();
vi.stubGlobal('after', after);
