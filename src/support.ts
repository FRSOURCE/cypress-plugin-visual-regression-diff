import { FILE_SUFFIX, LINK_PREFIX, OVERLAY_CLASS, TASK } from "./constants";

function generateOverlayTemplate(
  title: string,
  imgNewBase64: string,
  imgOldBase64: string,
  imgDiffBase64: string
) {
  return `<div class="${OVERLAY_CLASS} runner" style="position:fixed;z-index:10;top:0;bottom:0;left:0;right:0">
  <header style="position:static">
  <nav style="display:flex;width:100%;align-items:center;justify-content:space-between;padding:10px 15px;">
    <h2>${title} - screenshot diff</h2>
    <form>
      <button type="submit"><i class="fa fa-check"></i> Update screenshot</button>
      <button type="button" data-type="close"><i class="fa fa-times"></i> Close</button>
    <form>
  </nav>
  </header>
  <div style="margin:15px;display:flex;justify-content:space-evenly;align-items: flex-end">
    <div
      style="position:relative;background:#fff;border:solid 15px #fff"
      onmouseover="this.querySelector('div').style.opacity=0,this.querySelector('img').style.opacity=1"
      onmouseleave="this.querySelector('div').style.opacity=1,this.querySelector('img').style.opacity=0"
    >
      <h3>New screenshot:</h3>
      <img style="width:100%;opacity:0" src="data:image/png;base64,${imgNewBase64}" />
      <div style="position:absolute;top:0;left:0;background:#fff">
        <h3>Old screenshot (hover over to see the new one):</h3>
        <img style="width:100%" src="data:image/png;base64,${imgOldBase64}" />
      </div>
    </div>
    <div style="background:#fff;border:solid 15px #fff">
      <h3>Diff between new and old screenshot</h3>
      <img style="width:100%" src="data:image/png;base64,${imgDiffBase64}" />
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
        atob(e.currentTarget.getAttribute("href").substring(LINK_PREFIX.length))
      );

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
            ).then((imgDiff) => [imgNew, imgOld, imgDiff])
          )
        )
        .then(([imgNewBase64, imgOldBase64, imgDiffBase64]) => {
          if (!top) return false;

          Cypress.$(
            generateOverlayTemplate(
              title,
              imgNewBase64,
              imgOldBase64,
              imgDiffBase64
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

            // needed to run a task outside of the test processing flow
            (cy as unknown as { queue: { run: () => void } }).queue.run();
          });
        });

      return false;
    }
  );
});
