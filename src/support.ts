import "./commands";
import { FILE_SUFFIX, LINK_PREFIX, OVERLAY_CLASS, TASK } from "./constants";

function queueClear() {
  (cy as unknown as { queue: { clear: () => void } }).queue.clear();
  (cy as unknown as { state: (k: string, value: unknown) => void }).state(
    "index",
    0
  );
}

function queueRun() {
  // needed to run a task outside of the test processing flow
  (cy as unknown as { queue: { run: () => void } }).queue.run();
}

function generateOverlayTemplate(
  title: string,
  imgNewBase64: string,
  imgOldBase64: string,
  imgDiffBase64: string,
  wasImageNotUpdatedYet: boolean
) {
  return `<div class="${OVERLAY_CLASS} runner" style="position:fixed;z-index:10;top:0;bottom:0;left:0;right:0;display:flex;flex-flow:column">
  <header style="position:static">
  <nav style="display:flex;width:100%;align-items:center;justify-content:space-between;padding:10px 15px;">
    <h2>${title} - screenshot diff</h2>
    <form>
      ${
        wasImageNotUpdatedYet
          ? `<button type="submit"><i class="fa fa-check"></i> Update screenshot</button>`
          : "Image was already updated, rerun test to see new comparison"
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
}

function cachedReadFile(
  imageCache: Record<string, string>,
  path: string,
  encoding: Cypress.Encodings
): Cypress.Chainable<string> {
  if (imageCache[path])
    return Cypress.Promise.resolve(
      imageCache[path]
    ) as unknown as Cypress.Chainable<string>;

  return cy
    .readFile(path, encoding, { log: false })
    .then((file) => (imageCache[path] = file));
}

before(() => {
  if (!top) return null;
  Cypress.$(`.${OVERLAY_CLASS}`, top.document.body).remove();
});

after(() => {
  const imageCache: Record<string, string> = {};

  if (!top) return null;

  Cypress.$(top.document.body).on(
    "click",
    `a[href^="${LINK_PREFIX}"]`,
    function (e) {
      e.preventDefault();
      if (!top) return false;

      const { title, imgPath } = JSON.parse(
        decodeURIComponent(escape(atob(e.currentTarget.getAttribute("href").substring(LINK_PREFIX.length))))
      );
      queueClear();

      cachedReadFile(imageCache, imgPath, "base64")
        .then((imgNew) =>
          cachedReadFile(
            imageCache,
            imgPath.replace(FILE_SUFFIX.actual, ""),
            "base64"
          ).then((imgOld) =>
            cachedReadFile(
              imageCache,
              imgPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
              "base64"
            ).then((imgDiff) =>
              cy
                .task(TASK.doesFileExist, { path: imgPath }, { log: false })
                .then(
                  (wasImageNotUpdatedYet) =>
                    [
                      imgNew,
                      imgOld,
                      imgDiff,
                      wasImageNotUpdatedYet as boolean,
                    ] as const
                )
            )
          )
        )
        .then(
          ([
            imgNewBase64,
            imgOldBase64,
            imgDiffBase64,
            wasImageNotUpdatedYet,
          ]) => {
            if (!top) return false;
            queueClear();

            Cypress.$(
              generateOverlayTemplate(
                title,
                imgNewBase64,
                imgOldBase64,
                imgDiffBase64,
                wasImageNotUpdatedYet
              )
            ).appendTo(top.document.body);

            const wrapper = Cypress.$(`.${OVERLAY_CLASS}`, top.document.body);
            wrapper.on("click", 'button[data-type="close"]', function () {
              wrapper.remove();
            });

            wrapper.on("submit", "form", function (e) {
              e.preventDefault();

              cy.task(TASK.approveImage, { img: imgPath }).then(() =>
                wrapper.remove()
              );

              queueRun();
            });
          }
        );

      queueRun();

      return false;
    }
  );
});
