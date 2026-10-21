const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cesium = require("cesium");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.join(__dirname, "..");
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name.endsWith(".css") ? {} : name.startsWith(".") ? load(path.join(path.dirname(file), name + ".ts")) : require(name) });
  return exports;
}
const { juremaProject: project, orthoBounds, thematicBounds } = load("src/projects/jurema.ts");
assert.deepEqual(Array.from(project.bounds), Array.from(orthoBounds));
assert.notDeepEqual(Array.from(orthoBounds), Array.from(thematicBounds));
assert.equal(project.layers.length, 14);
assert.equal(project.layers.filter(x => x.defaultVisible).map(x => x.id).join(","), "basemap,orto,peri");
const rasters = project.layers.filter(x => x.source.format === "tms");
assert.equal(rasters.length, 6);
for (const layer of rasters) {
  assert.equal(layer.source.minimumLevel, layer.id === "orto" ? 12 : 11);
  assert.equal(layer.source.maximumLevel, layer.id === "orto" ? 21 : 20);
  assert.equal(layer.source.url, "https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev/" + layer.id + "/{z}/{x}/{reverseY}.png");
  assert.equal(layer.source.tileWidth, 256); assert.equal(layer.source.tileHeight, 256);
  assert.equal(layer.legend, undefined);
}
const model = project.layers.find(x => x.source.format === "3d-tiles");
assert.equal(model.source.assetId, 5184061); assert.equal(model.source.tokenEnv, "VITE_CESIUM_3D_TOKEN");
assert.equal(model.source.clipping.enabled, true); assert.equal(model.source.clipping.inverse, true);
assert.equal(model.source.clipping.positions.length, 10);
assert.equal(model.source.terrainCutout, undefined); assert.equal(model.source.heightOffsetMeters, undefined);
const { applyProjectCamera } = load("src/cesium/projectCamera.ts");
let opening, home;
const viewer = { isDestroyed: () => false, camera: { setView: view => { opening = view; }, flyTo: view => { home = view; }, cancelFlight() {} }, scene: { requestRender() {} } };
applyProjectCamera(viewer, project); applyProjectCamera(viewer, project, 1.2);
assert.ok(cesium.Cartesian3.equals(opening.destination, cesium.Cartesian3.fromDegrees(project.initialCamera.longitude, project.initialCamera.latitude, project.initialCamera.height)));
assert.ok(cesium.Cartesian3.equals(opening.destination, home.destination));
for (const angle of ["heading", "pitch", "roll"]) {
  assert.equal(opening.orientation[angle], cesium.Math.toRadians(project.initialCamera[angle]));
  assert.equal(home.orientation[angle], opening.orientation[angle]);
}
const { LayerPanel } = load("src/components/LayerPanel.tsx");
const markup = renderToStaticMarkup(React.createElement(LayerPanel, { project, statuses: {}, visible: new Set(["basemap", "orto"]), rasterOpacities: {}, onOpacityChange() {}, onToggle() {}, onClose() {} }));
for (const id of ["basemap","model","raster","vector","macro"]) assert.ok(markup.includes("workspace-" + id));
assert.ok(markup.includes("Buscar camada")); assert.ok(markup.includes("Sem camadas nesta fase."));
const utils = load("src/cesium/measurementUtils.ts");
const point = cesium.Cartesian3.fromDegrees(0, 0, 500);
const excluded = new cesium.EntityCollection();
const fakeTileset = Object.create(cesium.Cesium3DTileset.prototype);
const scene = { drillPick: () => [{ primitive: fakeTileset }], pickPositionSupported: true, pickPosition: () => point, globe: { show: true, pick: () => { throw Error("Must not sample terrain below model"); } } };
const sampleViewer = { isDestroyed: () => false, scene, camera: { getPickRay: () => ({}) }, terrainProvider: new cesium.EllipsoidTerrainProvider() };
const sampled = utils.pickHeightPosition(sampleViewer, new cesium.Cartesian2(1,1), excluded);
assert.ok(sampled); assert.match(utils.measurementText("height", [sampled]), /Modelo 3D Tiles/);
scene.pickPosition = () => undefined;
assert.equal(utils.pickHeightPosition(sampleViewer, new cesium.Cartesian2(1,1), excluded), undefined);
scene.drillPick = () => []; scene.globe.pick = () => point;
const fallback = utils.pickHeightPosition(sampleViewer, new cesium.Cartesian2(1,1), excluded);
assert.ok(fallback); assert.match(utils.measurementText("height", [fallback]), /Globo elipsoidal/);
console.log("Jurema: fontes, cobertura, câmera/Home, painel e proveniência das cotas OK.");
