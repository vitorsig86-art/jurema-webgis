# Cardeal Map — Jurema — Baependi/MG

Projeto independente baseado no núcleo do cardeal-map-template. Cesium 1.146.0 preservado no lockfile, sem novas dependências.

## Execução local

Execute npm ci. O usuário deve criar .env.local com os nomes vazios de .env.example. Execute npm run dev.

VITE_CESIUM_ION_TOKEN atende World Terrain e Bing Aerial. VITE_CESIUM_3D_TOKEN atende o asset 5184061. Variáveis Vite são visíveis ao navegador; nunca versionar credenciais.

## Fase 1

Configuração em src/projects/jurema.ts. TMS Web Mercator com {reverseY}; limites e zoom conferidos nos cinco XMLs originais. MDT/MDS são exclusivamente imagens. Nenhuma legenda externa, classe ou unidade inventada. Modelo com clipping permanente do perímetro aprovado de 10 vértices, mantendo o interior (inverse: true). Somente o tileset do asset 5184061 é recortado; World Terrain e imagens permanecem inteiros. Sem deslocamento vertical. A ferramenta temporária de desenho foi removida.

Abertura e Home compartilham initialCamera em src/projects/jurema.ts, com os valores capturados e aprovados. A ferramenta temporária e seu listener foram removidos. Alinhamento e autoria de clipping permanecem preservados e desativados.

Núcleo do template preservado, inclusive guards de compatibilidade de rasters/clipping que usam internals do Cesium 1.146; revisar antes de upgrades. Painel e GPS adaptados seletivamente de Andrelândia sem configurações territoriais. Identificação da superfície da medição de cota reaproveitada via APIs públicas, preservando o cálculo do template.

Validação: npm run typecheck. Scripts herdados exclusivos do template não comprovam a configuração de Jurema. Nenhum production build nesta fase.
