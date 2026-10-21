# Repository Guidelines

This is the independent Jurema WebGIS for Baependi/MG: React, TypeScript, Vite and CesiumJS. Preserve the inherited cardeal-map-template core and treat the original template, Andrelandia and Fazenda Mel projects as read-only references. Property configuration lives in src/projects/jurema.ts; src/projects/template.ts contains inactive examples only.

## Jurema phase 1

Do not create production builds, Git repositories, commits, pushes or remote repositories in this phase. Do not create or modify .env.local: the user configures credentials. Preserve package-lock.json and the resolved Cesium 1.146.0 version. MDT/MDS PNGs are imagery only. Keep the 3D asset raw until clipping and vertical adjustments are explicitly validated. Do not add territorial diagnostic content or placeholder layers. Use npm run typecheck and npm run check for local verification; the inherited template-only checks are not the Jurema integration suite.

## Structure

- src/projects/: property-specific configuration, source URLs, bounds, zoom levels, labels, legends and opening/Home camera. template.ts is the editable entry point.
- src/cesium/: reusable viewer, camera, loaders and measurement utilities.
- src/hooks/: viewer, layer and measurement lifecycle.
- src/components/: reusable Portuguese UI and responsive CSS.
- public/legends/: image legend assets; example.png is illustrative.
- scripts/: local generic regression checks.
- agent/skills/, .agents/skills/, .claude/skills/: existing Cesium contributor guides; preserve reference files and junctions.

## Validation

Use npm.cmd on PowerShell if npm.ps1 is blocked. Run npm ci, npm run typecheck, npm run check and npm run build. Verify affected interactions in desktop/mobile browser and preview. Tests use synthetic data; validate remote URLs/CORS with the final project configuration.

Use two-space indentation, double-quoted imports, semicolons, PascalCase components, camelCase functions and use-prefixed hooks. Keep generic components independent of layer IDs/themes. Legends require PNG plus config only. Preserve the approved desktop layout and mobile drawer/backdrop/sticky header, compact cards/controls, tap-expand legends and native Cesium attribution.

Do not place real property-specific defaults in the template. Configure exampleLayers before adding entries to the active layers list: invisible rasters/vectors are still loaded. Keep credentials out of commits; VITE_* values are browser visible. Never copy .env.local. Do not commit node_modules, dist, caches or verification artifacts. Do not initialize Git, push or rewrite history unless requested; if this template already has Git, review the diff before committing.

## Cesium vector scalability and territorial accuracy

- Before using experimental Cesium APIs, read docs/CESIUM_VECTOR_TILES_2026.md, the official documentation and the API/source for the exact installed version. Check package.json, package-lock.json and node_modules; the bundled skills use a 1.144 baseline and are not proof of runtime support. Never invent methods/options or treat a roadmap as shipped functionality.
- Evaluate GeoJSON, MVT and vector 3D Tiles when measured dataset size, loading time or memory establishes a real scalability need. Record the tradeoff, preview status, hosting/tiling cost and fallback. Prefer the simplest format that meets the measured requirements.
- Preserve stable source feature IDs, attribute names/types/units, Strahler order, provenance and technical metadata. Validate missing/null values and tile-boundary representations; visual filtering is not a database query or a guarantee of fewer downloads.
- Budget startup, streaming, CPU/GPU memory and frame time on desktop/mobile. For MVT, explicitly bound extent and zoom range: the current provider builds its full tile hierarchy up front. Use public lifecycle APIs and release resources/listeners; respect requestRenderMode.
- Verify horizontal CRS, coordinate order, units, vertical datum/geoid, acquisition date and spatial/altimetric consistency. Distinguish elevation data, terrain surface, photogrammetric mesh and design geometry. Visual clamping and model offsets do not establish survey accuracy or replace datum transformations.
- Keep thematic choices and source settings in src/projects/, with reusable loaders/hooks/components. Preserve current camera/Home, measurements, legends, Portuguese UI, responsive layout, attribution, navigation, tests and security. Do not introduce Leaflet or another mapping platform. Any architectural change requires a documented need and compatibility assessment; never recreate existing components.
- Vector Tiles support in Cesium does not mean integration exists in this template. Consult docs/POC_DRENAGEM_VECTOR_TILES.md before a future drainage experiment. Documentation/planning requests do not authorize production code, CSS, dependencies, property configuration or deployment changes.

## CESIUMJS — COMPATIBILIDADE E USO DE APIs OFICIAIS

Este protocolo é obrigatório antes de implementar, alterar, refatorar ou substituir qualquer funcionalidade relacionada ao CesiumJS e constitui orientação permanente para todos os futuros projetos derivados deste template.

1. Consultar primeiro as skills oficiais relevantes disponíveis no ambiente e, quando necessário, a documentação oficial do Cesium correspondente ao recurso utilizado.

2. Confrontar qualquer exemplo encontrado com a versão REAL do Cesium instalada neste projeto:
   - verificar `package.json`;
   - verificar `package-lock.json` ou lockfile equivalente;
   - verificar exports e tipos TypeScript efetivamente disponíveis;
   - não assumir compatibilidade apenas porque um exemplo aparece em documentação ou material oficial.

3. Não assumir que exemplos de outras versões do Cesium continuam válidos.

4. Priorizar sempre:
   - APIs públicas;
   - APIs documentadas;
   - APIs não depreciadas;
   - recursos compatíveis com a versão instalada no projeto.

5. Evitar dependências de:
   - propriedades privadas;
   - propriedades ou métodos iniciados por `_` quando representarem internals;
   - estruturas internas do engine;
   - métodos não documentados;
   - APIs deprecated;
   - monkey patches;
   - hacks dependentes da implementação interna do Cesium.

6. Não utilizar uma propriedade privada apenas porque ela resolve rapidamente um problema se existir uma alternativa pública suportada.

7. Se uma implementação existente no template já estiver validada e funcionando:
   - preservá-la por padrão;
   - adaptar ao redor dela quando possível;
   - não substituí-la apenas por existir uma abordagem diferente em documentação ou exemplo recente.

8. Antes de substituir uma implementação Cesium existente, confirmar:
   - que a nova API existe na versão instalada;
   - que não está deprecated;
   - que atende ao mesmo comportamento;
   - que não causa regressão em desktop, mobile, câmera, layers, interação ou performance.

9. Se a documentação, skill ou exemplo oficial entrar em conflito com a versão instalada:
   - NÃO forçar a implementação;
   - NÃO alterar silenciosamente dependências;
   - NÃO quebrar o comportamento existente;
   - preservar a implementação funcional;
   - explicar a incompatibilidade;
   - apresentar uma proposta compatível antes de modificar o código.

10. Não fazer upgrade ou downgrade do CesiumJS para resolver uma funcionalidade sem autorização explícita.

11. Não alterar dependências Cesium relacionadas apenas para seguir um exemplo mais recente sem primeiro informar o motivo e o impacto.

12. Quando houver mais de uma solução possível, preferir nesta ordem:
    a. API pública já utilizada e validada no template;
    b. API pública oficial compatível com a versão instalada;
    c. adaptação arquitetural sem uso de internals;
    d. somente após discussão explícita, qualquer solução excepcional.

13. Para recursos como:
    - `Cesium3DTileset`;
    - `IonResource`;
    - imagery providers;
    - terrain;
    - `ClippingPolygon` / clipping;
    - `GeoJsonDataSource`;
    - `Entity`;
    - `Primitive`;
    - `ScreenSpaceEventHandler`;
    - câmera;
    - geolocation;
    - lifecycle de `Viewer`;
    conferir a API efetivamente disponível antes de implementar alterações estruturais.

14. TypeScript deve ser usado também como fonte de verdade de compatibilidade: se um método, propriedade, overload ou opção não existir nos tipos da versão instalada, não contornar imediatamente com `any` ou cast apenas para fazer o exemplo compilar.

15. Não usar `as any`, `@ts-ignore` ou `@ts-expect-error` para esconder incompatibilidade com Cesium sem necessidade técnica claramente justificada.

16. Em caso de dúvida sobre uma API Cesium: parar antes da alteração destrutiva, preservar o comportamento existente e relatar a dúvida/proposta.

**PRINCÍPIO CENTRAL:**

> Documentação e exemplos orientam a implementação, mas a versão instalada e as APIs públicas efetivamente disponíveis no projeto determinam o que pode ser usado.
