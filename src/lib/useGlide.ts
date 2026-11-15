import { readonly, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { createEngine, type CanvasEngine, type CanvasEngineOptions, type Point, type Rect, type Transform } from 'canvas-glide';
import { createConstrainer } from './util/constraint.js';
import type { Size } from './util/size.js';

export type GlideOptions = Omit<CanvasEngineOptions, 'getViewportRect' | 'getCanvasRect'> & {
  /** Unscaled content size; defaults to `contentSize`. */
  getCanvasRect?: () => Rect | null;
};

export type Glide = ReturnType<typeof useGlide>;

/**
 * Pan and zoom for the `target` element. Pointer and wheel input start when the target is mounted; the options are read
 * once. `transform`, `moving` and `viewportSize` are read-only refs, `contentSize` is writable.
 */
export function useGlide(target: MaybeRefOrGetter<HTMLElement | null | undefined>, options: GlideOptions = {}) {
  const transform = shallowRef<Transform>({ origin: { x: 0, y: 0 }, scale: 1 });
  const moving = shallowRef(false);
  const viewportSize = shallowRef<Size>({ width: 0, height: 0 });
  const contentSize = shallowRef<Size | null>(null);

  let element: HTMLElement | null = null;
  let frame = 0;

  const getViewportRect = () => element?.getBoundingClientRect() ?? null;
  const getCanvasRect =
    options.getCanvasRect ?? (() => contentSize.value && { x: 0, y: 0, ...contentSize.value });

  const engine: CanvasEngine = createEngine({
    ...options,
    getViewportRect,
    getCanvasRect,
    constraints: {
      ...options.constraints,
      origin: options.constraints?.origin ?? {
        enabled: true,
        constrain: createConstrainer({ getViewportRect, getCanvasRect, getScale: () => engine.getScale() }),
      },
    },
    state: {
      ...options.state,
      onTransformChange: (next) => {
        if (!frame && typeof requestAnimationFrame !== 'undefined') {
          frame = requestAnimationFrame(() => {
            frame = 0;
            transform.value = engine.getTransform();
          });
        }
        options.state?.onTransformChange?.(next);
      },
    },
    move: {
      ...options.move,
      onIsMovingChange: (next) => {
        moving.value = next;
        options.move?.onIsMovingChange?.(next);
      },
    },
  });
  transform.value = engine.getTransform();

  watch(
    () => toValue(target),
    (node, _previous, onCleanup) => {
      if (!node) return;
      element = node;
      node.style.touchAction = 'none';
      node.style.userSelect = 'none';

      const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onWheel } = engine.event;
      const listeners: [string, EventListener, AddEventListenerOptions?][] = [
        ['pointerdown', onPointerDown as EventListener],
        ['pointermove', onPointerMove as EventListener],
        ['pointerup', onPointerUp as EventListener],
        ['pointercancel', onPointerCancel as EventListener],
        ['wheel', onWheel as EventListener, { passive: false }],
      ];
      listeners.forEach(([type, listener, listenerOptions]) => node.addEventListener(type, listener, listenerOptions));

      const measure = () => (viewportSize.value = { width: node.clientWidth, height: node.clientHeight });
      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(node);
      measure();

      onCleanup(() => {
        listeners.forEach(([type, listener]) => node.removeEventListener(type, listener));
        resizeObserver.disconnect();
        cancelAnimationFrame(frame);
        frame = 0;
        if (element === node) element = null;
      });
    },
    { immediate: true, flush: 'post' },
  );

  return {
    /** The current transform, updated at most once per animation frame. */
    transform: readonly(transform),
    /** Whether a pointer drag is in progress. */
    moving: readonly(moving),
    /** The target's size in CSS pixels. */
    viewportSize: readonly(viewportSize),
    /** The content's size at scale 1, used by fit, center and the default pan limit. */
    contentSize,
    engine,
    // A method handler such as `@click="zoomIn"` passes the event; only a number is a step.
    zoomIn: (step?: number) => engine.zoomIn(typeof step === 'number' ? step : undefined),
    zoomOut: (step?: number) => engine.zoomOut(typeof step === 'number' ? step : undefined),
    zoomTo: (scale: number, pivot?: Point) => engine.zoomTo(scale, pivot),
    panTo: (origin: Point) => engine.panTo(origin),
    setTransform: (next: Transform) => engine.setTransform(next),
    fit: () => engine.fit(),
    center: () => engine.center(),
    reset: () => engine.reset(),
  };
}
