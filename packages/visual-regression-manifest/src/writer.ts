import fs from 'fs';
import path from 'path';
import {
  ManifestBuilder,
  type ManifestApproveInput,
  type ManifestEntryInput,
  type ManifestHeaderInput,
} from './builder';
import type { Manifest, ManifestEntry } from './types';

/**
 * Writes a manifest atomically (to `<file>.tmp`, then rename), so a consumer
 * never reads a half-written file. Creates the directory when needed.
 */
export const writeManifestFile = (filePath: string, manifest: Manifest) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmpPath, filePath);
};

/**
 * A `ManifestBuilder` bound to a file: every change rewrites the file, so the
 * manifest on disk is complete even when the run gets killed halfway.
 */
export class ManifestWriter extends ManifestBuilder {
  constructor(
    readonly filePath: string,
    header: ManifestHeaderInput,
  ) {
    super(header);
  }

  override record(input: ManifestEntryInput): ManifestEntry {
    const entry = super.record(input);
    this.write();
    return entry;
  }

  override approve(input: ManifestApproveInput): ManifestEntry {
    const entry = super.approve(input);
    this.write();
    return entry;
  }

  override dropTestFile(file: string): boolean {
    const changed = super.dropTestFile(file);
    if (changed) this.write();
    return changed;
  }

  /** Rewrites the file from the current state. */
  write() {
    writeManifestFile(this.filePath, this.toJSON());
  }

  /** Forgets every entry and removes the file, e.g. at the start of a run. */
  reset() {
    this.clear();
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
  }
}
