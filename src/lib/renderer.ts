export type Renderer = (typeof Renderer)[keyof typeof Renderer];
export const Renderer = Object.freeze({
  Canvas: 'canvas',
  Image: 'image',
  /** Renders the image as a resized, scrolled `<img>`, not arbitrary HTML. */
  Html: 'html',
} as const);
