// @vitest-environment jsdom
import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { createImageUrlSafe, revokeImageUrl } from "../src/lib/util/image.ts";

const createObjectURL = URL.createObjectURL;
const revokeObjectURL = URL.revokeObjectURL;

afterEach(() => {
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

const fakeObjectUrls = () => {
  const create = vi.fn(() => "blob:test");
  const revoke = vi.fn();
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
  return { create, revoke };
};

test("a raster image gets a blob: URL, which revokeImageUrl releases", async () => {
  const { create, revoke } = fakeObjectUrls();

  const url = await createImageUrlSafe(new Blob(["x"], { type: "image/png" }));
  revokeImageUrl(url);

  assert.equal(url, "blob:test");
  assert.equal(create.mock.calls.length, 1);
  assert.deepEqual(revoke.mock.calls, [["blob:test"]]);
});

test("an SVG gets a data: URL, so its scripts cannot run in the page's origin", async () => {
  const { create, revoke } = fakeObjectUrls();

  const url = await createImageUrlSafe(new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" }));
  revokeImageUrl(url);

  assert.match(url ?? "", /^data:image\/svg\+xml;base64,/);
  assert.equal(create.mock.calls.length, 0);
  assert.equal(revoke.mock.calls.length, 0);
});

test("no image gives no URL", async () => {
  assert.equal(await createImageUrlSafe(null), null);
});
