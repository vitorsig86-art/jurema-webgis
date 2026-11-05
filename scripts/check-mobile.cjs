// Synthetic lifecycle checks only: no browser, WebGL, network or measurements.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const C = require("cesium");
const root = path.join(__dirname, "..");

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8").replaceAll("import.meta.env", "({})"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, ...globals, console: { warn() {}, error() {} }, structuredClone, require: name => {
    if (name in dependencies) return dependencies[name];
    if (!name.startsWith(".")) return require(name);
    return load(path.join(path.dirname(file), name + ".ts"), dependencies, globals);
  } });
  return exports;
}

function checkProfile() {
  for (const coarse of [false, true]) for (const width of [390, 760, 761, 1440]) {
    const { isMobileClient, MOBILE_QUERY } = load("src/mobile.ts", {}, { window: { matchMedia(query) {
      assert.equal(query, "(pointer: coarse) and (max-width: 760px)");
      return { matches: coarse && width <= 760 };
    } } });
    assert.equal(MOBILE_QUERY, "(pointer: coarse) and (max-width: 760px)");
    assert.equal(isMobileClient(), coarse && width <= 760);
  }
  assert.equal(load("src/mobile.ts").isMobileClient(), false);
}

function checkPopup() {
  const { subscribeVectorPopupUpdates } = load("src/cesium/vectorPopupUpdates.ts");
  const collection = new C.EntityCollection();
  const entity = collection.add({ id: "selected", properties: { value: 1 } });
  const viewer = { selectedEntity: undefined, selectedEntityChanged: new C.Event(), clock: { onTick: new C.Event() }, camera: { changed: new C.Event(), moveEnd: new C.Event() } };
  let updates = 0;
  const update = () => { updates++; return !!viewer.selectedEntity?.isShowing; };
  const select = value => { viewer.selectedEntity = value; viewer.selectedEntityChanged.raiseEvent(value); };
  const stop = subscribeVectorPopupUpdates(viewer, update, true);
  assert.equal(viewer.clock.onTick.numberOfListeners, 0);
  const closedCount = updates;
  viewer.clock.onTick.raiseEvent(); viewer.camera.changed.raiseEvent();
  assert.equal(updates, closedCount, "Closed mobile popup does no periodic/camera work");
  select(entity);
  assert.equal(viewer.camera.changed.numberOfListeners, 1);
  let before = updates;
  entity.properties.value.setValue(2);
  assert.ok(updates > before, "Nested attribute changes update the popup");
  before = updates;
  viewer.camera.changed.raiseEvent(); viewer.camera.moveEnd.raiseEvent();
  assert.equal(updates, before + 2);
  collection.show = false;
  assert.equal(viewer.camera.changed.numberOfListeners, 0, "Hiding selection detaches camera listeners");
  assert.equal(viewer.camera.moveEnd.numberOfListeners, 0);
  assert.equal(entity.definitionChanged.numberOfListeners, 1, "Only EntityCollection's own listener remains");
  select(undefined);
  stop();
  assert.equal(viewer.selectedEntityChanged.numberOfListeners, 0);
  const stopDesktop = subscribeVectorPopupUpdates(viewer, update, false);
  assert.equal(viewer.clock.onTick.numberOfListeners, 1, "Desktop retains the existing clock subscription");
  before = updates; viewer.clock.onTick.raiseEvent();
  assert.equal(updates, before + 1);
  stopDesktop();
  assert.equal(viewer.clock.onTick.numberOfListeners, 0);
}

function fixture(mobileMode) {
  const { juremaProject } = load("src/projects/jurema.ts");
  const ids = ["basemap", "orto", "estudo-cafe", "estudo-oliveiras", "peri", "curvas_1m", "curvas_3m"];
  const project = { ...juremaProject, layers: juremaProject.layers.filter(l => ids.includes(l.id)).map(l => l.id === "curvas_1m" ? { ...l, source: { ...l.source, autoZoom: true } } : l) };
  const original = JSON.stringify(project);
  const initial = project.layers.filter(l => l.defaultVisible).map(l => l.id);
  let visible = new Set(initial);
  const slots = []; let cursor = 0; let effects = [];
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; const slot = slots[i] ??= { value }; return [slot.value, next => { slot.value = typeof next === "function" ? next(slot.value) : next; }]; },
    useEffect(effect, deps) { const i = cursor++; const slot = slots[i] ??= {}; if (!slot.deps || deps.some((v, n) => v !== slot.deps[n])) { effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); slot.deps = deps; } },
  };
  const loader = load("src/cesium/loadLayer.ts");
  const calls = []; const pending = new Map(); const created = new Map(); const zooms = [];
  const viewer = { isDestroyed: () => false, imageryLayers: new C.ImageryLayerCollection(), dataSources: new C.DataSourceCollection(), camera: { cancelFlight() {} }, scene: { primitives: new C.PrimitiveCollection(), requestRender() {} }, zoomTo: async layer => { zooms.push(layer); } };
  const { useProjectLayers } = load("src/hooks/useProjectLayers.ts", {
    react,
    "../cesium/projectCamera": { applyProjectCamera() {} },
    "../cesium/imageryTileErrors": { createImageryTileErrorHandler: () => Object.assign(() => {}, { dispose() {} }) },
    "../cesium/loadLayer": { ...loader, loadLayer: async definition => {
      calls.push(definition.id);
      if (definition.source.format !== "geojson") return new C.ImageryLayer(new C.UrlTemplateImageryProvider({ url: "https://example.invalid/{z}/{x}/{y}.png" }));
      const data = new C.GeoJsonDataSource(definition.id);
      data.entities.add({ id: definition.id, properties: { value: 1 } });
      created.set(definition.id, data);
      return new Promise((resolve, reject) => pending.set(definition.id, { resolve: () => resolve(data), reject }));
    } },
  });
  function render() { cursor = 0; const result = useProjectLayers(viewer, project, visible, null, mobileMode); const batch = effects; effects = []; batch.forEach(run => run()); return result; }
  const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
  return { project, initial, original, calls, pending, created, zooms, viewer, render, flush,
    toggle(id, on) { visible = new Set(visible); if (on) visible.add(id); else visible.delete(id); render(); },
    stop() { slots.forEach(s => s.cleanup?.()); },
  };
}

async function checkLoading() {
  const f = fixture(true);
  f.render(); await f.flush();
  const geoCalls = () => f.calls.filter(id => !["basemap", "orto"].includes(id));
  assert.equal(geoCalls().join(","), "estudo-cafe");
  assert.equal(f.render().statuses.curvas_1m, "idle");
  f.toggle("curvas_1m", true); f.toggle("curvas_3m", true); f.toggle("curvas_3m", false);
  await f.flush();
  assert.equal(geoCalls().join(","), "estudo-cafe", "Only one vector may load at a time");
  for (const id of ["estudo-cafe", "estudo-oliveiras", "peri"]) { assert.ok(f.pending.has(id)); f.pending.get(id).resolve(); await f.flush(); }
  assert.equal(geoCalls().join(","), "estudo-cafe,estudo-oliveiras,peri,curvas_1m", "Study dependencies precede deferred layers");
  assert.equal(f.render().statuses.curvas_1m, "loading");
  f.pending.get("curvas_1m").resolve(); await f.flush();
  assert.equal(f.render().statuses.curvas_1m, "ready");
  assert.equal(f.zooms[0], f.created.get("curvas_1m"), "Configured autoZoom still receives the actual source");
  f.toggle("curvas_1m", false); f.toggle("curvas_1m", true); await f.flush();
  assert.equal(geoCalls().filter(id => id === "curvas_1m").length, 1, "OFF/ON reuses the loaded vector");
  assert.equal(f.viewer.dataSources.length, 4);
  assert.equal(f.calls.includes("curvas_3m"), false, "Deselected queued vector is skipped");
  f.toggle("curvas_3m", true); await f.flush();
  f.pending.get("curvas_3m").reject(new Error("Synthetic failure")); await f.flush();
  assert.equal(f.render().statuses.curvas_3m, "error");
  f.toggle("curvas_1m", false); await f.flush();
  assert.equal(f.calls.filter(id => id === "curvas_3m").length, 1, "Failure does not retry automatically");
  f.toggle("curvas_3m", false); f.toggle("curvas_3m", true); await f.flush();
  assert.equal(f.render().statuses.curvas_3m, "loading");
  assert.equal(f.calls.filter(id => id === "curvas_3m").length, 2);
  f.toggle("curvas_3m", false);
  f.pending.get("curvas_3m").resolve(); await f.flush();
  assert.equal(f.created.get("curvas_3m").show, false, "OFF while loading is respected at attachment");
  assert.equal(f.viewer.dataSources.length, 5, "Turning OFF retains the loaded source");
  assert.equal(JSON.stringify(f.project), f.original, "IDs, search names, zIndex and source settings remain intact");
  f.stop();
  assert.equal(f.viewer.dataSources.length, 0);

  const cancelled = fixture(true);
  cancelled.render(); await cancelled.flush(); cancelled.stop();
  cancelled.pending.get("estudo-cafe").resolve(); await cancelled.flush();
  assert.equal(cancelled.created.get("estudo-cafe").entities.values.length, 0, "Late vector is released after cleanup");
  assert.equal(cancelled.calls.includes("estudo-oliveiras"), false);

  const desktop = fixture(false);
  desktop.render(); await desktop.flush();
  for (const id of ["estudo-cafe", "estudo-oliveiras", "peri", "curvas_1m", "curvas_3m"]) {
    assert.ok(desktop.pending.has(id), `Desktop keeps eager loading: ${id}`);
    desktop.pending.get(id).resolve(); await desktop.flush();
  }
  assert.equal(desktop.viewer.dataSources.length, 5);
  assert.equal(desktop.created.get("curvas_1m").show, false);
  desktop.stop();
}

(async () => {
  checkProfile(); checkPopup(); await checkLoading();
  console.log("Mobile: perfil central, fila serial, cache, falha/nova tentativa, zoom, cleanup e popup por eventos OK; desktop preservado.");
})().catch(error => { console.error(error); process.exitCode = 1; });
