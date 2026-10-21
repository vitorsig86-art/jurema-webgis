
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cesium = require("cesium");
let state, effect, success, failure, watches = 0, cleared = 0, flights = 0;
const react = {
  useState: initial => { state = initial; return [state, value => { state = typeof value === "function" ? value(state) : value; }]; },
  useRef: current => ({ current }),
  useEffect: callback => { effect = callback; },
};
const geolocation = {
  watchPosition: (onSuccess, onError) => { success = onSuccess; failure = onError; return ++watches; },
  clearWatch: () => { cleared++; },
};
const exportsObject = {};
const source = fs.readFileSync(path.join(__dirname, "../src/hooks/useGeolocation.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(compiled, { exports: exportsObject, require: name => name === "react" ? react : cesium, navigator: { geolocation } });
const entities = new cesium.EntityCollection();
const viewer = { isDestroyed: () => false, entities, camera: { cancelFlight() {} }, scene: { requestRender() {} }, flyTo: () => { flights++; return Promise.resolve(); } };
const api = exportsObject.useGeolocation(viewer);
const dispose = effect();
api.locate(); assert.equal(state.status, "locating"); assert.equal(watches, 1);
success({ coords: { longitude: 0, latitude: 0, accuracy: 8 } });
assert.equal(state.status, "active"); assert.equal(state.accuracy, 8); assert.equal(entities.values.length, 2); assert.equal(flights, 1);
api.locate(); assert.equal(watches, 1); assert.equal(flights, 2);
api.stop(); assert.equal(state.status, "idle"); assert.equal(cleared, 1); assert.ok(entities.values.every(e => !e.show));
api.locate(); failure({ code: 1 }); assert.equal(state.status, "error"); assert.match(state.error, /negada/);
api.locate(); assert.equal(state.status, "locating"); assert.equal(watches, 3);
dispose(); assert.equal(entities.values.length, 0); assert.equal(cleared, 3);
console.log("GPS: posição sintética, precisão, recentralização, encerramento, recusa de permissão, nova tentativa e cleanup OK.");
