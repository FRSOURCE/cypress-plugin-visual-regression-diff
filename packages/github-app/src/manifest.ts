import {
  mergeManifests as mergeStandardManifests,
  type Manifest,
  type ManifestSource as StandardManifestSource,
  type MergeOptions,
  type MergedEntry as StandardMergedEntry,
  type MergedRun as StandardMergedRun,
} from '@frsource/visual-regression-manifest';

// The manifest format, its validation, the merge and the selection logic live
// in the standard package; this module only binds them to where the app finds
// its manifests (a file inside a workflow artifact).
export {
  entryKey,
  keyHash,
  ManifestParseError,
  needsHuman,
  parseManifest,
  parseManifestJson,
  platformLabel,
  selectEntries,
  type EntrySelection,
  type MergeOptions,
} from '@frsource/visual-regression-manifest';

export type ManifestSource = StandardManifestSource & {
  artifactId: number;
  artifactName: string;
  /** Path of the manifest inside the artifact zip. */
  zipPath: string;
  manifest: Manifest;
};

export type MergedEntry = StandardMergedEntry<ManifestSource>;
export type MergedRun = StandardMergedRun<ManifestSource>;

/** How a manifest is named in warnings and errors: `<artifact name>:<path in the zip>`. */
export const sourceLabel = (
  source: Pick<ManifestSource, 'artifactName' | 'zipPath'>,
) => `${source.artifactName}:${source.zipPath}`;

/**
 * `mergeManifests` from the standard package, with every source labelled by
 * its artifact and zip path so warnings say where a manifest came from.
 */
export const mergeManifests = (
  sources: ManifestSource[],
  opts: MergeOptions = {},
): MergedRun =>
  mergeStandardManifests(
    sources.map((source) => ({
      ...source,
      label: source.label ?? sourceLabel(source),
    })),
    opts,
  );
