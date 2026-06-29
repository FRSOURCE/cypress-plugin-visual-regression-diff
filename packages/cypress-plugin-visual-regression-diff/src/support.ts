import * as Base64 from '@frsource/base64';
import './commands';
import { FAB_CLASS, FAB_BADGE_CLASS, LINK_PREFIX, OVERLAY_CLASS, TASK } from './constants';
import type { PendingDiffRecord } from './types';

const CAROUSEL_CLASS = 'cp-visual-regression-diff-carousel';
const INFO_MODAL_CLASS = 'cp-visual-regression-diff-info-modal';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 72 72"><circle cx="35.5" cy="36.5" r="27.5" fill="#4A4A4D" stroke="#FFF"/><g fill="#FFF" transform="matrix(.075 0 0 .075 16 17)"><circle cx="259.8" cy="259.9" r="80"/><path d="M511.7 237.7C450.2 163.4 357 92 259.8 92 162.5 91.9 69.4 163.4 8 237.7A34.8 34.8 0 0 0 8 282a520.8 520.8 0 0 0 91 86.2c109 79.3 212.4 79.5 321.6 0a520.8 520.8 0 0 0 91-86.2 34.8 34.8 0 0 0 0-44.3zM259.8 148a112.1 112.1 0 0 1 0 224 112.1 112.1 0 0 1 0-224z"/></g></svg>`;

const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

/* c8 ignore start */
function queueClear() {
  (cy as unknown as { queue: { reset: () => void } }).queue.reset?.();
  (cy as unknown as { queue: { clear: () => void } }).queue.clear();
  (cy as unknown as { state: (k: string, value: unknown) => void }).state(
    'index',
    0,
  );
}

function queueRun() {
  // needed to run a task outside of the test processing flow
  (cy as unknown as { queue: { run: () => void } }).queue.run();
}
/* c8 ignore stop */

export const generateOverlayTemplate = ({
  title,
  imgNewBase64,
  imgOldBase64,
  imgDiffBase64,
  wasImageNotUpdatedYet,
  error,
}: {
  title: string;
  imgNewBase64: string;
  imgOldBase64: string;
  imgDiffBase64: string;
  wasImageNotUpdatedYet: boolean;
  error: boolean;
}) => `<div class="${OVERLAY_CLASS} runner" style="position:fixed;z-index:10;top:0;bottom:0;left:0;right:0;display:flex;flex-flow:column">
  <header style="position:static">
  <nav style="display:flex;width:100%;align-items:center;justify-content:space-between;padding:10px 15px;">
    <h2>${title} - screenshot diff</h2>
    <form style="display:flex;align-items:center;gap:5px;text-align:right">
      ${
        wasImageNotUpdatedYet
          ? `<button type="submit"><i class="fa fa-check"></i> Update screenshot</button>`
          : error
            ? 'Image was already updated, rerun test to see new comparison'
            : ''
      }
      <button type="button" data-type="close"><i class="fa fa-times"></i> Close</button>
    <form>
  </nav>
  </header>
  <div style="padding:15px;overflow:auto">
    <div style="display:flex;justify-content:space-evenly;align-items:flex-start;gap:15px">
      <div
        style="position:relative;background:#fff;border:solid 15px #fff"
        onmouseover="this.querySelector('div').style.opacity=0,this.querySelector('img').style.opacity=1"
        onmouseleave="this.querySelector('div').style.opacity=1,this.querySelector('img').style.opacity=0"
      >
        <h3>New screenshot (hover mouse away too see the old one):</h3>
        <img style="min-width:300px;width:100%;opacity:0" src="data:image/png;base64,${imgNewBase64}" />
        <div style="position:absolute;top:0;left:0;background:#fff">
          <h3>Old screenshot (hover over to see the new one):</h3>
          <img style="min-width:300px;width:100%" src="data:image/png;base64,${imgOldBase64}" />
        </div>
      </div>
      <div style="background:#fff;border:solid 15px #fff">
        <h3>Diff between new and old screenshot</h3>
        <img style="min-width:300px;width:100%" src="data:image/png;base64,${imgDiffBase64}" />
      </div>
    </div>
  </div>
</div>`;

const generateDiffPanelHTML = ({
  imgNewBase64,
  imgOldBase64,
  imgDiffBase64,
}: Pick<PendingDiffRecord, 'imgNewBase64' | 'imgOldBase64' | 'imgDiffBase64'>) =>
  `<div style="display:flex;justify-content:space-evenly;align-items:flex-start;gap:15px;flex-wrap:wrap">
    <div
      style="position:relative;background:#fff;border:solid 15px #fff"
      onmouseover="this.querySelector('div').style.opacity=0,this.querySelector('img').style.opacity=1"
      onmouseleave="this.querySelector('div').style.opacity=1,this.querySelector('img').style.opacity=0"
    >
      <h3 style="margin:0 0 8px">New screenshot (hover to compare):</h3>
      <img style="min-width:200px;max-width:100%;opacity:0" src="data:image/png;base64,${imgNewBase64}" />
      <div style="position:absolute;top:0;left:0;background:#fff">
        <h3 style="margin:0 0 8px">Old screenshot:</h3>
        <img style="min-width:200px;max-width:100%" src="data:image/png;base64,${imgOldBase64}" />
      </div>
    </div>
    <div style="background:#fff;border:solid 15px #fff">
      <h3 style="margin:0 0 8px">Diff:</h3>
      <img style="min-width:200px;max-width:100%" src="data:image/png;base64,${imgDiffBase64}" />
    </div>
  </div>`;

const generateFABTemplate = () =>
  `<button class="${FAB_CLASS}" title="Cypress Plugin Visual Regression Diff" style="position:fixed;bottom:20px;right:20px;z-index:99999;width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:#4A4A4D;cursor:pointer;padding:0;box-shadow:0 2px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;overflow:visible;transition:transform .15s">
    <span class="${FAB_BADGE_CLASS}" hidden style="position:absolute;top:-6px;right:-6px;background:#e53e3e;color:#fff;font-size:11px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 1px 3px rgba(0,0,0,.4);pointer-events:none"></span>
    <span class="${FAB_CLASS}-logo" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px">${LOGO_SVG}</span>
    <span class="${FAB_CLASS}-check" style="display:none;align-items:center;justify-content:center;width:36px;height:36px">${CHECK_SVG}</span>
  </button>
  <style>
    @keyframes ${FAB_BADGE_CLASS}-pulse {
      0%,100%{transform:scale(1)}
      50%{transform:scale(1.35)}
    }
    .${FAB_BADGE_CLASS}--pulse { animation: ${FAB_BADGE_CLASS}-pulse .5s ease; }
    @keyframes ${FAB_CLASS}-success {
      0%{opacity:0;transform:scale(.5)}
      40%{opacity:1;transform:scale(1.1)}
      100%{opacity:1;transform:scale(1)}
    }
    .${FAB_CLASS}[data-success] .${FAB_CLASS}-logo { display:none!important; }
    .${FAB_CLASS}[data-success] .${FAB_CLASS}-check { display:flex!important; animation:${FAB_CLASS}-success .3s ease forwards; }
    .${FAB_CLASS}:hover { transform:scale(1.08); }
  </style>`;

const generateInfoModalTemplate = () =>
  `<div class="${INFO_MODAL_CLASS}" style="position:fixed;z-index:100000;top:0;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:8px;padding:32px;max-width:480px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.3);font-family:sans-serif">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="width:40px;height:40px;flex-shrink:0">${LOGO_SVG}</div>
        <h2 style="margin:0;font-size:18px;color:#1a202c">Cypress Plugin Visual Regression Diff</h2>
      </div>
      <p style="color:#4a5568;line-height:1.6;margin:0 0 12px">
        This button gives you a quick way to review visual regression changes directly in the Cypress runner.
      </p>
      <p style="color:#4a5568;line-height:1.6;margin:0 0 20px">
        When any <code style="background:#edf2f7;padding:2px 5px;border-radius:3px;font-size:.9em">cy.matchImage()</code> call detects a screenshot that exceeds the diff threshold, a badge will appear here with the count of changed images. Click to open a review carousel where you can <strong>replace</strong> baselines or <strong>skip</strong> changes.
      </p>
      <p style="color:#718096;font-size:.875em;margin:0 0 20px">
        Enable deferred failures via <code style="background:#edf2f7;padding:2px 5px;border-radius:3px">pluginVisualRegressionDeferFailures: true</code> in your Cypress env config to let all tests run before failing.
      </p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <a href="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff" target="_blank" style="color:#4299e1;font-size:.875em">View on GitHub ↗</a>
        <button data-type="close" style="background:#4A4A4D;color:#fff;border:none;padding:8px 18px;border-radius:5px;cursor:pointer;font-size:.9em">Close</button>
      </div>
    </div>
  </div>`;

const generateCarouselTemplate = () =>
  `<div class="${CAROUSEL_CLASS}" style="position:fixed;z-index:100000;top:0;bottom:0;left:0;right:0;display:flex;flex-flow:column;background:#1a202c;font-family:sans-serif">
    <header style="background:#2d3748;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:28px;height:28px;flex-shrink:0">${LOGO_SVG}</div>
        <div>
          <span data-carousel-counter style="font-size:.8em;color:#a0aec0;display:block"></span>
          <span data-carousel-title style="font-weight:600;color:#fff;font-size:.95em"></span>
        </div>
      </div>
      <button data-type="close" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:.85em">✕ Close</button>
    </header>
    <div data-carousel-content style="flex:1;overflow:auto;padding:20px;color:#fff"></div>
    <footer style="background:#2d3748;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0;flex-wrap:wrap">
      <button data-type="prev" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:8px 14px;border-radius:4px;cursor:pointer">← Prev</button>
      <div style="display:flex;gap:8px">
        <button data-type="skip" style="background:#4a5568;border:none;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer">Skip this change →</button>
        <button data-type="replace" style="background:#38a169;border:none;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600">✓ Replace image</button>
      </div>
      <button data-type="next" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:8px 14px;border-radius:4px;cursor:pointer">Next →</button>
    </footer>
  </div>`;

/* c8 ignore start */
function showFABSuccess() {
  if (!top) return;
  const fab = top.document.querySelector(`.${FAB_CLASS}`);
  if (!fab) return;
  const badge = fab.querySelector(`.${FAB_BADGE_CLASS}`);
  if (badge) badge.setAttribute('hidden', '');
  fab.setAttribute('data-success', 'true');
  setTimeout(() => fab.removeAttribute('data-success'), 1800);
}

function openCarousel(diffs: PendingDiffRecord[]) {
  if (!top || !diffs.length) return;

  let currentIndex = 0;
  let replacedCount = 0;

  const carouselEl = Cypress.$(generateCarouselTemplate()).appendTo(
    top.document.body,
  );

  function renderDiff(index: number) {
    currentIndex = index;
    const diff = diffs[index];
    carouselEl
      .find('[data-carousel-content]')
      .html(generateDiffPanelHTML(diff));
    carouselEl
      .find('[data-carousel-counter]')
      .text(`Image ${index + 1} of ${diffs.length}`);
    carouselEl.find('[data-carousel-title]').text(`${diff.title} – screenshot diff`);
    (carouselEl.find('[data-type="prev"]')[0] as HTMLButtonElement).disabled =
      index === 0;
    (carouselEl.find('[data-type="next"]')[0] as HTMLButtonElement).disabled =
      index === diffs.length - 1;
  }

  function closeCarousel() {
    if (!top) return;
    top.document.removeEventListener('keydown', handleKey);
    carouselEl.remove();
    if (replacedCount > 0) showFABSuccess();
  }

  function advance() {
    if (currentIndex < diffs.length - 1) {
      renderDiff(currentIndex + 1);
    } else {
      closeCarousel();
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' && currentIndex > 0) renderDiff(currentIndex - 1);
    else if (e.key === 'ArrowRight' && currentIndex < diffs.length - 1)
      renderDiff(currentIndex + 1);
    else if (e.key === 'Escape') closeCarousel();
  }

  top.document.addEventListener('keydown', handleKey);

  renderDiff(0);

  carouselEl.on('click', '[data-type="close"]', closeCarousel);
  carouselEl.on('click', '[data-type="prev"]', () =>
    renderDiff(currentIndex - 1),
  );
  carouselEl.on('click', '[data-type="next"]', () =>
    renderDiff(currentIndex + 1),
  );
  carouselEl.on('click', '[data-type="skip"]', advance);

  carouselEl.on('click', '[data-type="replace"]', () => {
    queueClear();
    const diff = diffs[currentIndex];
    cy.task(TASK.approveImage, {
      img: diff.imgPath,
      imgOld: diff.imgOldPath,
    }).then(() => {
      replacedCount++;
      advance();
    });
    queueRun();
  });
}

function openInfoModal() {
  if (!top) return;
  const modal = Cypress.$(generateInfoModalTemplate()).appendTo(
    top.document.body,
  );
  modal.on('click', '[data-type="close"]', () => modal.remove());
}
/* c8 ignore stop */

/* c8 ignore start */
before(() => {
  if (!top) return null;
  Cypress.$(`.${OVERLAY_CLASS}`, top.document.body).remove();

  // Inject the persistent FAB if not already present
  if (!top.document.querySelector(`.${FAB_CLASS}`)) {
    Cypress.$(generateFABTemplate()).appendTo(top.document.body);
  }

  Cypress.$(top.document.body).on('click', `.${FAB_CLASS}`, () => {
    queueClear();
    cy.task<PendingDiffRecord[]>(TASK.getPendingDiffs, null, {
      log: false,
    }).then((diffs) => {
      if (diffs.length > 0) {
        openCarousel(diffs);
      } else {
        openInfoModal();
      }
    });
    queueRun();
  });

  cy.task(TASK.clearPendingDiffs, null, { log: false });
});

after(() => {
  if (!top) return null;

  cy.task(TASK.cleanupImages, { log: false });

  Cypress.$(top.document.body).on(
    'click',
    `a[href^="${LINK_PREFIX}"]`,
    function (e) {
      e.preventDefault();
      if (!top) return false;

      const {
        title,
        imgPath,
        imgOldPath,
        imgDiffBase64,
        imgNewBase64,
        imgOldBase64,
        error,
      } = JSON.parse(
        decodeURIComponent(
          Base64.decode(
            e.currentTarget.getAttribute('href').substring(LINK_PREFIX.length),
          ),
        ),
      );
      queueClear();

      cy.task<boolean>(
        TASK.doesFileExist,
        { path: imgPath },
        { log: false },
      ).then((wasImageNotUpdatedYet) => {
        if (!top) return false;

        Cypress.$(
          generateOverlayTemplate({
            title,
            imgNewBase64,
            imgOldBase64,
            imgDiffBase64,
            error,
            wasImageNotUpdatedYet,
          }),
        ).appendTo(top.document.body);

        const wrapper = Cypress.$(`.${OVERLAY_CLASS}`, top.document.body);
        wrapper.on('click', 'button[data-type="close"]', function () {
          wrapper.remove();
        });

        wrapper.on('submit', 'form', function (e) {
          queueClear();
          e.preventDefault();

          cy.task(TASK.approveImage, {
            img: imgPath,
            imgOld: imgOldPath,
          }).then(() => wrapper.remove());

          queueRun();
        });
      });

      queueRun();

      return false;
    },
  );

  cy.task<PendingDiffRecord[]>(TASK.getPendingDiffs, null, {
    log: false,
  }).then((diffs) => {
    if (!top || diffs.length === 0) return;
    openCarousel(diffs);
    throw new Error(
      `[cypress-plugin-visual-regression-diff] ${diffs.length} image snapshot(s) exceeded the diff threshold. Review the changes using the plugin UI (bottom-right button).`,
    );
  });
});
/* c8 ignore stop */
