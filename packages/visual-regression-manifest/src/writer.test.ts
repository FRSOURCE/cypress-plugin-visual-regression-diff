import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { tmpDir } from '../__tests__/helpers';
import { parseManifestJson } from './reader';
import { ManifestWriter, writeManifestFile } from './writer';

const runner = { name: 'test-runner' };

describe('writeManifestFile', () => {
  it('creates the directory and leaves no temporary file behind', async () => {
    const root = await tmpDir();
    const file = path.join(root, 'out', 'visual-regression-manifest.json');
    const writer = new ManifestWriter(file, {
      projectRoot: root,
      runner,
      ci: null,
    });
    writeManifestFile(file, writer.toJSON());
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    expect(parseManifestJson(fs.readFileSync(file, 'utf8')).entries).toEqual(
      [],
    );
  });
});

describe('ManifestWriter', () => {
  it('rewrites the file on every change', async () => {
    const root = await tmpDir();
    const file = path.join(root, 'visual-regression-manifest.e2e.json');
    const writer = new ManifestWriter(file, {
      projectRoot: root,
      runner,
      ci: null,
    });
    const read = () => parseManifestJson(fs.readFileSync(file, 'utf8'));

    expect(fs.existsSync(file)).toBe(false);
    writer.record({
      testFile: 'a.spec.ts',
      actualPath: 'a.actual.png',
      baselinePath: 'a.png',
      status: 'failed',
    });
    expect(read().entries.map((e) => e.status)).toEqual(['failed']);

    writer.approve({ actualPath: 'a.actual.png' });
    expect(read().entries.map((e) => e.status)).toEqual(['approved']);

    expect(writer.dropTestFile('other.spec.ts')).toBe(false);
    expect(writer.dropTestFile('a.spec.ts')).toBe(true);
    expect(read().entries).toEqual([]);

    writer.header.runner.browser = { name: 'chrome' };
    writer.write();
    expect(read().runner.browser).toEqual({ name: 'chrome' });

    writer.record({
      actualPath: 'b.png',
      baselinePath: 'b.png',
      status: 'passed',
    });
    writer.reset();
    expect(fs.existsSync(file)).toBe(false);
    expect(writer.size).toBe(0);
    expect(() => writer.reset()).not.toThrow();
  });
});
