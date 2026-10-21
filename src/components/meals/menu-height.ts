// Keep day changes from shrinking the open modal; reflow freely at a new width.
export function preserveMealHeight(viewport: HTMLElement, content: HTMLElement) {
  let width = 0;
  let height = 0;

  function update() {
    const bounds = content.getBoundingClientRect();
    if (bounds.width === 0) return;
    if (bounds.width !== width) {
      width = bounds.width;
      height = 0;
    }
    height = Math.max(height, Math.ceil(bounds.height));
    viewport.style.minHeight = `${height}px`;
  }

  const observer = new ResizeObserver(update);
  observer.observe(content);
  update();
  return () => {
    observer.disconnect();
    viewport.style.removeProperty("min-height");
  };
}
