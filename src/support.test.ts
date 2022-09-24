import { it, expect, describe, vi } from "vitest";
import { setGracefulCleanup, withFile } from "tmp-promise";
import { promises as fs } from "fs";
import { cy } from "@mocks/cypress.mock";
import { cachedReadFile, generateOverlayTemplate } from "@/support";

setGracefulCleanup();

vi.mock("@/commands.ts", () => ({}));

const fileContent = "file content";

describe("generateOverlayTemplate", () => {
  it("generates proper template", () => {
    expect(
      generateOverlayTemplate({
        title: "some title",
        imgNewBase64: "img-new-base64",
        imgOldBase64: "img-old-base64",
        imgDiffBase64: "img-diff-base64",
        wasImageNotUpdatedYet: true,
      })
    ).toMatchSnapshot();

    expect(
      generateOverlayTemplate({
        title: "some title",
        imgNewBase64: "img-new-base64",
        imgOldBase64: "img-old-base64",
        imgDiffBase64: "img-diff-base64",
        wasImageNotUpdatedYet: false,
      })
    ).toMatchSnapshot();
  });
});

describe("cachedReadFile", () => {
  it("reads file and caches the response", async () => {
    const imageCache = {};
    await withFile(async ({ path }) => {
      await fs.writeFile(path, fileContent);

      expect(
        await (cachedReadFile(imageCache, path, "utf-8") as PromiseLike<string>)
      ).toBe(fileContent);
      expect(
        await (cachedReadFile(imageCache, path, "utf-8") as PromiseLike<string>)
      ).toBe(fileContent);

      expect(cy.readFile).toBeCalledTimes(1);
    });
  });
});
