import { it, expect, describe, beforeEach } from 'vitest';
import {
  generateScreenshotPath,
  resetScreenshotNameCache,
  wasScreenshotUsed,
} from './screenshotPath.utils';

const shot = (
  title: string,
  { retry = 0, testId = 'r1' }: { retry?: number; testId?: string } = {},
) =>
  generateScreenshotPath({
    titleFromOptions: title,
    imagesPath: 'images',
    specPath: 'some/spec.ts',
    currentRetryNumber: retry,
    testId,
  }).replace(/^.*\/images\//, '');

beforeEach(resetScreenshotNameCache);

describe('generateScreenshotPath', () => {
  it('numbers repeated screenshots of the same title', () => {
    expect([shot('a'), shot('a'), shot('b')]).toEqual([
      'a_#0.actual.png',
      'a_#1.actual.png',
      'b_#0.actual.png',
    ]);
  });

  it('keeps numbering across tests that share a title', () => {
    shot('a', { testId: 'r1' });
    expect(shot('a', { testId: 'r2' })).toBe('a_#1.actual.png');
  });

  it('reuses the names of the failed attempt on retry', () => {
    shot('a');
    shot('a');
    expect(shot('a', { retry: 1 })).toBe('a_#0.actual.png');
    expect(shot('a', { retry: 1 })).toBe('a_#1.actual.png');
    expect(shot('a', { retry: 2 })).toBe('a_#0.actual.png');
  });

  it('restores every title the failed attempt used, not only the last one', () => {
    shot('a');
    shot('b');
    shot('b');
    expect(shot('a', { retry: 1 })).toBe('a_#0.actual.png');
    expect(shot('b', { retry: 1 })).toBe('b_#0.actual.png');
    expect(shot('b', { retry: 1 })).toBe('b_#1.actual.png');
  });

  it('does not rewind counters that belong to earlier tests', () => {
    shot('a', { testId: 'r1' });
    shot('a', { testId: 'r2' });
    expect(shot('a', { testId: 'r2', retry: 1 })).toBe('a_#1.actual.png');
    expect(wasScreenshotUsed('images/a_#0.png')).toBe(true);
  });

  it('starts a fresh attempt for the next test after a retried one', () => {
    shot('a', { testId: 'r1' });
    shot('a', { testId: 'r1', retry: 1 });
    // the next test is at retry 0 again and must not touch r1's counters
    expect(shot('a', { testId: 'r2' })).toBe('a_#1.actual.png');
    expect(shot('a', { testId: 'r2', retry: 1 })).toBe('a_#1.actual.png');
  });

  it('forgets screenshots of the failed attempt for cleanup purposes', () => {
    shot('a');
    shot('a');
    expect(wasScreenshotUsed('images/a_#1.png')).toBe(true);
    shot('a', { retry: 1 });
    expect(wasScreenshotUsed('images/a_#0.actual.png')).toBe(true);
    expect(wasScreenshotUsed('images/a_#1.png')).toBe(false);
  });
});

describe('resetScreenshotNameCache', () => {
  it('starts numbering from scratch', () => {
    shot('a');
    resetScreenshotNameCache();
    expect(shot('a', { retry: 1 })).toBe('a_#0.actual.png');
    expect(wasScreenshotUsed('images/a_#0.png')).toBe(true);
    expect(wasScreenshotUsed('images/nope_#0.png')).toBe(false);
  });
});
