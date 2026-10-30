const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.join(__dirname, "..");

function load(file, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, file), "utf8").replaceAll("import.meta.env.DEV", "false");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith(".css")) return {};
    if (!name.startsWith(".")) return require(name);
    const relative = path.join(path.dirname(file), name);
    const target = [relative + ".ts", relative + ".tsx"].find(candidate => fs.existsSync(path.join(root, candidate)));
    assert.ok(target, "Module exists: " + name);
    return load(target, mocks);
  } });
  return exports;
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return React.isValidElement(node) ? [node, ...elements(node.props.children)] : [];
}

const { juremaProject: project, orthoBounds } = load("src/projects/jurema.ts");
const campaigns = project.layers.filter(layer => layer.temporalCampaign);
assert.equal(campaigns.map(layer => layer.id).join(","), "ortho2022,ortho2024,ortho2024PostFire,ortho2025,orto");
assert.equal(campaigns.filter(layer => layer.defaultVisible).map(layer => layer.id).join(","), "orto");
assert.equal(project.layers.filter(layer => layer.defaultVisible).map(layer => layer.id).join(","), "basemap,orto,estudo-cafe,peri");
const directories = ["2022", "2024", "2024_pos_fogo", "2025", "orto2"];
campaigns.forEach((layer, index) => {
  assert.equal(layer.source.format, "tms");
  assert.equal(layer.source.url, `https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev/${directories[index]}/{z}/{x}/{reverseY}.png`);
  assert.equal(layer.source.minimumLevel, 12);
  assert.equal(layer.source.maximumLevel, 21);
  assert.equal(layer.source.tileWidth, 256);
  assert.equal(layer.source.tileHeight, 256);
  assert.equal(JSON.stringify(layer.source.bounds), JSON.stringify(orthoBounds));
  assert.equal(layer.exclusiveGroup, "temporal-orthomosaics");
  assert.ok(project.layers.indexOf(layer) < project.layers.findIndex(item => item.id === "mdt"));
});

// Exercise the actual App visibility callback, using a small hook harness.
// Cesium is never constructed; any accidental camera call fails the check.
const states = [];
let cursor = 0;
function slot(initial) {
  const index = cursor++;
  if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
  return index;
}
const hookReact = { ...React,
  useState(initial) {
    const index = slot(initial);
    return [states[index], update => { states[index] = typeof update === "function" ? update(states[index]) : update; }];
  },
  useRef(initial) { return states[slot(() => ({ current: initial }))]; },
  useMemo(factory) { cursor++; return factory(); },
  useId: () => "temporal-test",
};
const { TemporalSelector } = load("src/components/TemporalSelector.tsx", { react: hookReact });
const { PeriodBadge } = load("src/components/PeriodBadge.tsx");
const Panel = () => null;
const empty = () => null;
const opacities = { mdt: 37, ndvi: 62, orto: 80 };
const viewer = { camera: new Proxy({}, { get() { throw Error("Campaign selection must not access the camera"); } }) };
const { App } = load("src/App.tsx", {
  react: hookReact, "./projects": { projects: [project] },
  "./components/LayerPanel": { LayerPanel: Panel },
  "./components/TemporalSelector": { TemporalSelector }, "./components/PeriodBadge": { PeriodBadge },
  ...Object.fromEntries(["Legend", "NavigationControls", "MeasurementToolbar", "VectorPopup"].map(name => ["./components/" + name, { [name]: empty }])),
  "./hooks/useCesiumViewer": { useCesiumViewer: () => ({ containerRef: {}, viewer, error: null }) },
  "./hooks/useProjectLayers": { useProjectLayers: () => ({ statuses: {}, rasterOpacities: opacities, setRasterOpacity() { throw Error("Opacity must be preserved"); } }) },
});
function tree() {
  cursor = 0;
  return elements(App());
}
function panel() { return tree().find(element => element.type === Panel).props; }
// The timeline is rendered by App over the map, with the same visibility state and onToggle.
function selector() {
  const props = tree().find(element => element.type === TemporalSelector).props;
  cursor = 1000;
  return TemporalSelector(props);
}
function markerFor(campaign) {
  return elements(selector()).find(element => element.type === "button" && element.props.className === "temporal-marker"
    && element.props["aria-label"].startsWith(campaign.temporalCampaign.comparisonLabel));
}
const pressedMarkers = () => elements(selector()).filter(element => element.props?.className === "temporal-marker" && element.props["aria-pressed"]).length;
panel().onToggle("mdt");
panel().onToggle("ndvi");
panel().onToggle("curvas_10m");
const preserved = [...panel().visible].filter(id => !campaigns.some(layer => layer.id === id)).sort().join(",");
for (const campaign of [...campaigns, ...campaigns].reverse()) {
  markerFor(campaign).props.onClick();
  const props = panel();
  assert.equal(campaigns.filter(layer => props.visible.has(layer.id)).map(layer => layer.id).join(","), campaign.id);
  assert.equal([...props.visible].filter(id => !campaigns.some(layer => layer.id === id)).sort().join(","), preserved);
  assert.equal(props.rasterOpacities, opacities);
  assert.equal(pressedMarkers(), 1);
  // React supplies the handler from the latest render after visibility changes.
  markerFor(campaign).props.onClick();
  assert.ok(panel().visible.has(campaign.id));
}
panel().onToggle("ortho2024PostFire"); // Manual activation uses the same exclusivity.
assert.equal(campaigns.filter(layer => panel().visible.has(layer.id)).map(layer => layer.id).join(","), "ortho2024PostFire");
panel().onToggle("ortho2024PostFire");
assert.equal(campaigns.filter(layer => panel().visible.has(layer.id)).length, 0);
assert.equal(pressedMarkers(), 0);
const badge = () => renderToStaticMarkup(React.createElement(PeriodBadge, tree().find(element => element.type === PeriodBadge).props));
assert.match(badge(), /Nenhum ortomosaico ativo/);
panel().onToggle("orto");
assert.match(badge(), /2026/); assert.match(badge(), /Atual/);
const timeline = renderToStaticMarkup(selector());
assert.match(timeline, /Evolução da paisagem/);
assert.match(timeline, /Pós-fogo/);
assert.match(timeline, /Incêndio registrado entre as campanhas de 2024/);
const { LayerPanel } = load("src/components/LayerPanel.tsx");
const markup = renderToStaticMarkup(React.createElement(LayerPanel, panel()));
assert.match(markup, /Ortomosaico/);
assert.match(markup, />2026</);
console.log("Evolução Temporal: fontes, estado inicial, régua sobre o mapa, selo de período, exclusividade, seleção repetida, sincronização manual e preservação de camadas/opacidades OK.");
