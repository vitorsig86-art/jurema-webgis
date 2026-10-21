# Jurema — Fase 1

Projeto criado em C:/Users/Usuario/Desktop/jurema-webgis. Nome: Cardeal Map. Subtítulo: Jurema — Baependi/MG.

## Independência e preservação

Originais: C:/Users/Usuario/Desktop/cardeal-map-template e C:/Users/Usuario/Desktop/andrelandia-webgis. Nenhuma escrita foi dirigida a esses projetos. A cópia excluiu .git, .env.local, node_modules, dist, caches e artefatos temporários. Dependências foram instaladas posteriormente por npm ci; a execução Vite criou seu cache local.

package-lock.json permanece byte a byte idêntico ao template, comprovado por SHA-256. Nenhuma dependência foi adicionada ou atualizada. Cesium instalado: 1.146.0. Nenhum production build, repositório remoto, commit ou push.

## Arquivos criados e adaptados

Novos: src/projects/jurema.ts, src/hooks/useGeolocation.ts, scripts/check-jurema.cjs, scripts/check-geolocation.cjs e este relatório.

Adaptados: AGENTS.md, README.md, .env.example, index.html, package.json; src/App.tsx, src/styles.css, src/projects/index.ts, src/projects/types.ts; src/components/LayerPanel.tsx e .css, NavigationControls.tsx e .css, MeasurementToolbar.tsx; src/hooks/useMeasurements.ts; src/cesium/measurementUtils.ts; scripts/check-measurements.cjs.

Os demais arquivos copiados são a base do template. src/projects/template.ts permanece apenas como exemplo inativo.

## Núcleo e componentes

Comparação por SHA-256 confirmou identidade com o template em createViewer, useCesiumViewer, loadLayer, useProjectLayers, modelClipping, modelHeight, modelTerrainCutout, projectCamera e measurementGraphics.

Preservados World Terrain com fallback elipsoidal, Bing com fallback OpenStreetMap, loaders TMS/GeoJSON/3D Tiles, lifecycle, ordenação, opacidade, legendas, câmera e proteções de compatibilidade. Os acessos internos preexistentes em loadLayer/modelClipping continuam preservados e exigem revisão antes de mudança de versão.

De Andrelândia foram adaptados somente painel, estilos de painel/navegação e GPS. Da medição foi extraída a identificação da superfície por APIs públicas; os cálculos do template foram preservados. Nenhuma URL territorial, asset, câmera, clipping, token ou conteúdo de diagnóstico de Andrelândia foi utilizado.

Cinco grupos: Mapa base, Modelo 3D, Rasters, Vetores e Análise Macro. Os dois últimos não possuem camadas. Busca sem acentos, colapso, contadores, mensagens por camada, sliders, navegação e layout mobile estão incorporados. Nenhum Homem Mapa, diagnóstico, backend ou nova dependência.

## Fontes e cobertura

Base pública: https://pub-17e2ce7d5c144788a0b734186a1a0360.r2.dev

Todos os rasters: /<pasta>/{z}/{x}/{reverseY}.png, TMS global-mercator EPSG:900913/3857, PNG 256×256.

- orto: zoom 12–21; bounds [W,S,E,N] = [-44.82421875, -22.10599880, -44.73632812, -22.02454560].
- mdt: zoom 11–20; bounds [-44.82421875, -22.10599880, -44.64843750, -21.94304553].
- mds: zoom 11–20; mesmos bounds temáticos.
- decli: zoom 11–20; mesmos bounds temáticos.
- aspect: zoom 11–20; mesmos bounds temáticos.

Os XMLs em Desktop/JUREMA 2026/webgis/<pasta>/<pasta>.xml foram lidos antes da implementação. Seus limites Mercator foram convertidos e conferidos com os limites fornecidos. A pequena diferença final decorre de arredondamento decimal.

Tiles reais verificados: orto/12/1538/1790.png; mdt/11/769/895.png; mds/11/769/895.png; decli/11/769/895.png; aspect/11/769/895.png. Todos responderam HTTP 200, image/png, 256×256 e Access-Control-Allow-Origin: *. SHA-256 idêntico ao respectivo tile local. A linha TMS 1790 corresponde a XYZ 2305 no z12; 895 corresponde a XYZ 1152 no z11. Mantido reverseY.

Sem legendas externas ou escalas inventadas. Qualquer conteúdo incorporado aos PNGs permanece sem alteração. MDT/MDS não fornecem elevação.

## Modelo, credenciais, câmera e clipping

Modelo: asset ion 5184061 via IonResource.fromAssetId + Cesium3DTileset.fromUrl, preservando o loader do template. Token próprio VITE_CESIUM_3D_TOKEN; token principal separado em VITE_CESIUM_ION_TOKEN.

.env.example contém apenas nomes e valores vazios. .env.local não foi criado ou modificado pelo agente. Esse arquivo surgiu externamente durante a validação; seu conteúdo não foi exibido.

O modelo permanece bruto, sem clipping, recorte de terreno ou deslocamento vertical. Suporte a clipping permanente e ferramentas locais de autoria permanecem preservados e desativados. Captura de câmera disponível em desenvolvimento.

Abertura/Home enquadram a extensão real do ortomosaico pelo caminho de Rectangle já existente no template. initialCamera é opcional, para permitir futura câmera capturada. Nenhuma altitude medida ou orientação definitiva foi inventada.

Estado inicial: Bing e ortomosaico ativos, modelo e quatro rasters temáticos desativados. Visibilidade do modelo ativada apenas durante teste e restaurada ao final.

## Verificações realizadas

- npm ci: concluído; sem mudança do lockfile.
- npm run typecheck: aprovado.
- npm run check: aprovado, incluindo configuração Jurema/painel/câmera, 4 ciclos ON/OFF de dois rasters com 682 casos de borda por ativação, opacidade independente, lifecycle e cleanup, medições e GPS sintético.
- O fixture herdado de medições foi atualizado com drillPick e terrainProvider para comportar a identificação de superfície; a regressão voltou a passar.
- Chrome desktop: aplicação e ortomosaico renderizados; busca sem acentos, colapso, contador e slider exercitados.
- Chrome mobile 390×844: screenshot inspecionado; drawer abre e fecha e mantém controles/cabeçalho adequados. Viewport restaurado ao final.
- Bing e modelo fotogramétrico foram vistos após disponibilização externa da configuração local. Modelo carregou sem mensagem de indisponibilidade.
- Diferença de cota executada sobre o modelo: ambos os pontos foram identificados como Modelo 3D Tiles · profundidade. Valores são amostras da cena, não validação altimétrica.
- Console consultado ao final do carregamento do modelo: nenhum aviso/erro registrado naquele momento.
- Home acionado e estado inicial restaurado.
- GPS testado com dados sintéticos: fix, precisão, recentralização, stop, permissão negada, retry e cleanup. Não foi solicitada localização real do dispositivo.

## Próxima fase

Capturar câmera ideal; validar georreferenciamento/datum vertical e alinhamento visual do modelo; fornecer polígono de clipping, se desejado; fornecer legendas e metadados definitivos; testar GPS real em campo e dispositivos físicos. World Terrain permanece no caminho original; não foi realizado ensaio altimétrico independente de seu serviço. Conteúdo vetorial, macro e diagnóstico continua fora desta fase.

Servidor de desenvolvimento: http://127.0.0.1:5175/.
