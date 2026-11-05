import type { Viewer } from "cesium";

export function subscribeVectorPopupUpdates(viewer: Viewer, update: () => boolean, mobileMode: boolean): () => void {
  if (!mobileMode) {
    update();
    const removeSelection = viewer.selectedEntityChanged.addEventListener(update);
    const removeTick = viewer.clock.onTick.addEventListener(update);
    return () => { removeTick(); removeSelection(); };
  }

  let activeListeners: (() => void)[] = [];
  function clearActive() {
    activeListeners.forEach(remove => remove());
    activeListeners = [];
  }
  function refresh() {
    if (!update()) clearActive();
  }
  function select() {
    clearActive();
    const entity = viewer.selectedEntity;
    if (!update() || !entity) return;
    activeListeners = [
      entity.definitionChanged.addEventListener(refresh),
      viewer.camera.changed.addEventListener(refresh),
      viewer.camera.moveEnd.addEventListener(refresh),
    ];
  }
  const removeSelection = viewer.selectedEntityChanged.addEventListener(select);
  select();
  return () => { clearActive(); removeSelection(); };
}
