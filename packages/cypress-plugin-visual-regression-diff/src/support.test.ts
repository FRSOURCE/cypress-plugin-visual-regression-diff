import { it, expect, describe, vi } from 'vitest';
import { setGracefulCleanup } from 'tmp-promise';
import '@mocks/cypress.mock';
import { generateOverlayTemplate } from './support';

setGracefulCleanup();

vi.mock('./commands.ts', () => ({}));

describe('generateOverlayTemplate', () => {
  it('generates proper template', () => {
    expect(
      generateOverlayTemplate({
        title: 'some title',
        imgNewBase64: 'img-new-base64',
        imgOldBase64: 'img-old-base64',
        imgDiffBase64: 'img-diff-base64',
        wasImageNotUpdatedYet: true,
        error: true,
      }),
    ).toMatchSnapshot();

    expect(
      generateOverlayTemplate({
        title: 'some title',
        imgNewBase64: 'img-new-base64',
        imgOldBase64: 'img-old-base64',
        imgDiffBase64: 'img-diff-base64',
        wasImageNotUpdatedYet: false,
        error: true,
      }),
    ).toMatchSnapshot();

    expect(
      generateOverlayTemplate({
        title: 'some title',
        imgNewBase64: 'img-new-base64',
        imgOldBase64: 'img-old-base64',
        imgDiffBase64: 'img-diff-base64',
        wasImageNotUpdatedYet: false,
        error: false,
      }),
    ).toMatchSnapshot();
  });
});
