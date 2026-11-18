// @vitest-environment jsdom
import { afterEach, test } from "vitest";
import assert from "node:assert/strict";
import { createApp, createSSRApp, effectScope, h, nextTick, shallowRef, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { GlideCanvas, Renderer, useGlide, type Glide, type GlideOptions } from "../src/lib/index.ts";

// jsdom has no layout, no ResizeObserver, no pointer capture, no element scrollTo, no 2D context and no createImageBitmap.
const resizeCallbacks = new Set<() => void>();
globalThis.ResizeObserver = class {
  constructor(private callback: () => void) {}
  observe() {
    resizeCallbacks.add(this.callback);
  }
  unobserve() {}
  disconnect() {
    resizeCallbacks.delete(this.callback);
  }
} as unknown as typeof ResizeObserver;
let layout = { width: 1000, height: 700 };
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => layout.width });
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => layout.height });
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollTo ??= () => {};
globalThis.createImageBitmap = (async () => ({ width: 300, height: 300, close() {} })) as unknown as typeof createImageBitmap;

type FakeContext = { calls: string[] };
const contexts = new WeakMap<HTMLCanvasElement, FakeContext>();
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  if (!contexts.has(this)) {
    const calls: string[] = [];
    contexts.set(this, {
      calls,
      resetTransform: () => calls.push("reset"),
      clearRect: () => calls.push("clear"),
      setTransform: () => calls.push("transform"),
      drawImage: () => calls.push("draw"),
    } as FakeContext);
  }
  return contexts.get(this);
} as unknown as HTMLCanvasElement["getContext"];

const setDevicePixelRatio = (value: number) =>
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value });

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  setDevicePixelRatio(1);
  layout = { width: 1000, height: 700 };
});

/** useGlide on an element with a stubbed client rectangle, inside its own effect scope. */
function glideOn(options: GlideOptions = {}) {
  const rect = { x: 0, y: 0, width: 800, height: 600 };
  const node = document.body.appendChild(document.createElement("div"));
  node.getBoundingClientRect = () => ({ ...rect }) as DOMRect;
  const scope = effectScope();
  const glide = scope.run(() => useGlide(node, { getCanvasRect: () => ({ x: 0, y: 0, width: 400, height: 300 }), ...options }))!;
  cleanups.push(() => {
    scope.stop();
    node.remove();
  });
  return { glide, node, rect };
}

function mount(component: Component) {
  const target = document.body.appendChild(document.createElement("div"));
  const app = createApp(component);
  app.mount(target);
  cleanups.push(() => {
    app.unmount();
    target.remove();
  });
  return target;
}

/** Lets pending promises (image decoding), one animation frame and Vue's post-flush effects run. */
async function settle() {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await nextTick();
  }
}

test("a scale range in constraints keeps the default origin limit", () => {
  const { glide } = glideOn({ constraints: { scale: { constraints: [1, 4] } } });

  glide.zoomTo(10);
  glide.panTo({ x: 5000, y: 5000 });

  assert.equal(glide.engine.getScale(), 4);
  assert.deepEqual(glide.engine.getOrigin(), { x: 400, y: 300 });
});

test("constraints.origin replaces the default origin limit", () => {
  const { glide } = glideOn({ constraints: { origin: { constraints: { x: [0, 10], y: [0, 10] } } } });

  glide.panTo({ x: 5000, y: 5000 });

  assert.deepEqual(glide.engine.getOrigin(), { x: 10, y: 10 });
});

test("a wheel zoom anchors at the cursor after the viewport moved", () => {
  const { glide, node, rect } = glideOn();
  glide.center();
  rect.x = 150;

  const before = glide.engine.getTransform();
  node.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, clientX: 150 + 400, clientY: 300, cancelable: true }));
  const after = glide.engine.getTransform();

  assert.ok(after.scale > before.scale);
  assert.ok(Math.abs(after.origin.x + 400 / after.scale - (before.origin.x + 400 / before.scale)) < 1e-9);
});

test("transform updates once per animation frame, moving follows a drag", async () => {
  const { glide, node } = glideOn();

  glide.zoomIn();
  glide.zoomIn();
  assert.equal(glide.transform.value.scale, 1);
  await settle();
  assert.deepEqual(glide.transform.value, glide.engine.getTransform());

  node.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, button: 0, clientX: 10, clientY: 10 }));
  assert.equal(glide.moving.value, true);
  node.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, button: 0, clientX: 10, clientY: 10 }));
  assert.equal(glide.moving.value, false);
});

test("zoomIn used as a method handler ignores the event argument", () => {
  const { glide } = glideOn();

  glide.zoomIn(new MouseEvent("click") as unknown as number);

  assert.ok(Math.abs(glide.engine.getScale() - 1.1) < 1e-9);
});

test("the canvas renderer clears the canvas when the image is removed", async () => {
  const image = shallowRef<Blob | null>(new Blob(["x"], { type: "image/png" }));
  const target = mount({ render: () => h(GlideCanvas, { image: image.value }) });
  await settle();
  const calls = contexts.get(target.querySelector("canvas")!)!.calls;
  assert.ok(calls.includes("draw"));

  calls.length = 0;
  image.value = null;
  await settle();

  assert.ok(calls.includes("clear"));
  assert.ok(!calls.includes("draw"));
});

test("the canvas renderer resizes its backing store when devicePixelRatio changes", async () => {
  const viewer = shallowRef<{ zoomIn: () => void }>();
  const target = mount({ render: () => h(GlideCanvas, { ref: viewer, image: new Blob(["x"], { type: "image/png" }) }) });
  await settle();
  const canvas = target.querySelector("canvas")!;
  assert.equal(canvas.width, 1000);

  setDevicePixelRatio(2);
  viewer.value!.zoomIn();
  await settle();

  assert.equal(canvas.width, 2000);
  assert.equal(canvas.height, 1400);
});

test("the image renderer shows an SVG through a data: URL", async () => {
  const svg = new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" });
  const target = mount({ render: () => h(GlideCanvas, { renderer: Renderer.Image, image: svg }) });
  await settle();

  assert.match(target.querySelector("img")!.getAttribute("src") ?? "", /^data:image\/svg\+xml;base64,/);
});

test("the default slot renders an overlay sized to the content and moved with the transform", async () => {
  const viewer = shallowRef<{ zoomTo: (scale: number, pivot: { x: number; y: number }) => void }>();
  const image = new Blob(["x"], { type: "image/png" });
  const target = mount({ render: () => h(GlideCanvas, { ref: viewer, image }, () => h("span", "marker")) });
  await settle();

  const overlay = target.querySelector("span")!.parentElement!;
  assert.equal(overlay.style.width, "700px");
  assert.equal(overlay.style.height, "700px");

  viewer.value!.zoomTo(2, { x: 0, y: 0 });
  await settle();
  assert.match(overlay.style.transform, /^scale\(2\)/);
});

for (const renderer of [Renderer.Canvas, Renderer.Image, Renderer.Html]) {
  test(`the ${renderer} renderer fits an image that loaded before the viewport had a size once it has one`, async () => {
    layout = { width: 0, height: 0 };
    const viewer = shallowRef<Glide>();
    const target = mount({ render: () => h(GlideCanvas, { ref: viewer, renderer, image: new Blob(["x"], { type: "image/png" }) }) });
    (target.firstElementChild as HTMLElement).getBoundingClientRect = () => ({ x: 0, y: 0, ...layout }) as DOMRect;
    await settle();
    const img = target.querySelector("img");
    if (img) {
      Object.defineProperties(img, { naturalWidth: { value: 300 }, naturalHeight: { value: 300 } });
      img.dispatchEvent(new Event("load"));
    }
    await settle();

    layout = { width: 1000, height: 700 };
    resizeCallbacks.forEach((callback) => callback());
    await settle();

    const glide = viewer.value!;
    const loaded = glide.engine.getTransform();
    glide.fit();
    assert.deepEqual(loaded, glide.engine.getTransform());
    assert.notDeepEqual(loaded, { origin: { x: 0, y: 0 }, scale: 1 });

    glide.zoomTo(2);
    layout = { width: 800, height: 600 };
    resizeCallbacks.forEach((callback) => callback());
    await settle();
    assert.equal(glide.engine.getScale(), 2);
  });
}

test("GlideCanvas renders on the server", async () => {
  const html = await renderToString(createSSRApp({ render: () => h(GlideCanvas, { renderer: Renderer.Image }) }));

  assert.match(html, /overscroll-behavior:contain/);
});
