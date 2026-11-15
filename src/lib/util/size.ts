export type Size = { width: number; height: number };

/** `content` scaled to fit inside `viewport` with its aspect ratio kept, like `object-fit: contain`. */
export function fitInto(viewport: Size, content: Size): Size {
  const scale =
    viewport.width && viewport.height && content.width && content.height
      ? Math.min(viewport.width / content.width, viewport.height / content.height)
      : 1;
  return { width: content.width * scale, height: content.height * scale };
}
