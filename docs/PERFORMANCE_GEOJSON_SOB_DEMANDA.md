# Jurema: GeoJSON sob demanda — etapas 0 e 1

Intervenção local de 12/11/2026. Sem commit, push ou deploy. Cesium 1.146.0 e lockfile preservados. O build local foi autorizado expressamente nesta intervenção; não representa publicação.

## A. Diagnóstico operacional

O `useProjectLayers` tinha dois caminhos: no desktop, o laço inicial aguardava `loadLayer` para toda camada não 3D, incluindo os GeoJSON ocultos; no mobile, os vetores usavam uma fila serial por visibilidade. Três vetores tinham `defaultVisible: true`: estudo de café, estudo de oliveiras e perímetro. Os demais 17 vetores eram carregados antecipadamente apenas no desktop.

Fluxo existente preservado: `loadLayer` busca o JSON, `prepareGeoJson` aplica as opções de preparação já configuradas, `GeoJsonDataSource.load` cria entidades e o loader aplica estilos, classificação, paleta, zIndex, atributos e contornos auxiliares. O registro de popup usa referências das entidades em WeakMap; o picking trabalha nas entidades da cena. Ações dos estudos ficam disponíveis depois da ativação da respectiva camada. Não foi encontrada funcionalidade que precise desses vetores ocultos na abertura. Não há exceções de carregamento antecipado.

A busca do painel filtra nomes de camadas, sem consulta espacial. Comparação temporal usa imagery/split; medições e GPS têm entidades próprias, independentes dos GeoJSON. O modelo usa primitives e seu carregamento sob demanda separado. Câmera/Home não dependem dos vetores. Todos os GeoJSON da Jurema já têm `autoZoom: false`.

## B. Alterações e contrato de carregamento

- `src/projects/juremaDrone.ts`: os três vetores inicialmente ligados passam a `defaultVisible: false`. Os 20 GeoJSON ficam explicitamente desligados. Restam somente `basemap` e `orto` ligados na abertura.
- `src/hooks/useProjectLayers.ts`: a fila serial existente passa a atender todos os dispositivos; o laço de imagery ignora sempre GeoJSON. Vetores não solicitados ficam `idle`, sem fetch, preparação ou entidades. Rasters e modelos mantêm seus caminhos anteriores.
- `src/App.tsx`: remove o argumento de perfil do hook de camadas, pois sua política passa a ser compartilhada. A detecção mobile permanece para a interface e o comportamento existente do popup.
- `scripts/check-jurema.cjs`, `scripts/check-temporal.cjs`, `scripts/check-mobile.cjs`: regressões de estado inicial, concorrência, retenção, ordem e descarte.

`visibleRef` guarda a intenção mais recente. `queuedVectors` impede requisições duplicadas enquanto um item aguarda ou está carregando. Antes de iniciar um item, a fila verifica novamente a visibilidade e pula os desativados. Uma requisição em andamento pode terminar: o resultado é retido, mas sua visibilidade é conferida tanto antes quanto depois da anexação assíncrona. OFF/ON durante uma requisição compartilha o mesmo trabalho. OFF/ON depois do sucesso reutiliza a mesma fonte, sem download adicional.

Falhas ficam em `error` sem repetição automática. Desligar e ligar permite nova tentativa. A fila continua para outras camadas. Não há cancelamento complexo nem descarte automático por tempo/memória. O cleanup do hook remove listeners, camadas retidas e resultados tardios quando ainda há Viewer válido.

Após anexar um vetor, as fontes já carregadas são ordenadas conforme `project.layers`, usando `DataSourceCollection.raiseToTop`, API pública conferida no código e tipos instalados do Cesium 1.146.0. Os zIndex originais permanecem intactos. Assim, ativar vetores fora de ordem não altera a ordem configurada entre fontes. Nenhuma alteração em `loadLayer`, `prepareGeoJson`, popup, medição, CSS, URL ou dado fonte foi necessária.

Uma expectativa antiga de teste esperava `flyTo: "home"` para café, mas a configuração anterior à intervenção já usava `false`. Corrigiu-se somente o teste; o comportamento de navegação da ação permanece igual.

## C. Medição antes/depois

Amostras atuais, uma por perfil, Vite de desenvolvimento, Chromium headless com SwiftShader, sem limitação artificial de CPU/rede, cache HTTP desligado. Desktop 1440 × 900/DPR 1; mobile 390 × 844/DPR 3 e touch. A detecção mobile foi exercitada pelo navegador. Não representam celular físico, GPU real, produção ou comparação estatística. Uma tentativa inicial não completada foi descartada; os números abaixo vêm da execução completa com acesso às fontes externas.

| Indicador na abertura | Desktop antes | Desktop depois | Mobile antes | Mobile depois |
| --- | ---: | ---: | ---: | ---: |
| Requisições GeoJSON | 20 | 0 | 3 | 0 |
| Bytes GeoJSON registrados por CDP | 49.911.792 | 0 | 7.775 | 0 |
| Fontes GeoJSON anexadas | 20 | 0 | 3 | 0 |
| Entidades GeoJSON anexadas | 7.892 | 0 | 6 | 0 |
| Fontes GeoJSON visíveis | 3 | 0 | 3 | 0 |
| Interface: proxy DOM pronto (ms) | 3.205,7 | 3.117,0 | 1.488,5 | 1.323,5 |
| Mapa estabilizado segundo o critério abaixo (ms) | 71.974,4 | 30.159,1 | 17.701,5 | 12.646,5 |
| Heap JS instantâneo (bytes) | 863.002.361 | 46.985.975 | 53.292.006 | 52.694.540 |

Bytes de rede usam `Network.loadingFinished.encodedDataLength`, podendo incluir overhead de protocolo; não são tamanho descomprimido nem medição de faturamento. As 20 requisições foram eliminadas do caminho inicial desktop e as três do mobile; passam a ocorrer apenas se solicitadas. O inventário histórico de 49,9 MB descomprimidos/943 mil vértices não foi usado como medida de transferência desta execução.

O proxy da interface é a presença do checkbox do painel, não TTI/INP nem conclusão de hidratação medida. Mapa estabilizado requer fontes iniciais esperadas anexadas, pelo menos duas imagery layers e `globe.tilesLoaded`. Os vetores visíveis mudam deliberadamente entre antes/depois. Rede, shaders e cache do servidor influenciam os tempos. Não se atribui toda a diferença de tempo à mudança e não se promete percentual de aceleração.

Heap foi lido sem forçar GC, depois da estabilização. O valor alto desktop anterior inclui pressão transitória de preparação; não prova vazamento nem corresponde a consumo de GPU ou memória retida estável.

Não há baseline comparável do tempo de primeira ativação de camada grande: antes ela era carregada automaticamente. O roteiro funcional mede requisições e conclusão da ativação, mas inclui atrasos de rede deliberados para exercitar concorrência; esses tempos não são apresentados como benchmark natural.

Evidências locais não versionáveis: `.verification/geojson-before.json`, `geojson-after.json`, `geojson-preview.json` e capturas de tela correspondentes. O roteiro `.verification/geojson-on-demand.cjs` usa o Playwright já existente, sem nova dependência.

## D. Validação

- TypeScript: aprovado.
- `npm.cmd run check`: aprovado, incluindo rasters (quatro ciclos ON/OFF e 682 casos de borda por ativação), câmera/Home, fontes, comparação temporal, medições, GPS e lifecycle de vetores.
- `npm.cmd run build`: aprovado; arquivos locais em `dist`, sem publicação.
- Abertura em navegador desktop/mobile: zero GeoJSON requisitado, anexado ou visível, zero entidades desses dados; controles vetoriais desligados. Capturas inspecionadas com mapa, ortomosaico, controles e atribuição preservados.
- Preview de produção desktop/mobile: zero requisições/fontes/entidades GeoJSON na abertura.
- Câmera antes/depois idêntica na captura dos seis valores (longitude, latitude, altura, heading, pitch e roll). `requestRenderMode` e `maximumRenderTimeChange` mantidos.
- Testes sintéticos: item desativado na fila não inicia; OFF/ON em andamento não duplica; OFF durante fetch e anexação não aparece ao concluir; erro não repete sozinho; OFF/ON permite retry; retenção reutiliza; ordem independe da ativação; cleanup remove fontes e resultado tardio.
- Fluxos reais em desktop e mobile: estudo de café com atributos/zIndex, picking da cena, popup e botão da simulação; curvas de 1 m e microbacias; várias ativações com a primeira requisição temporariamente retida pelo teste; OFF/ON/OFF durante download; navegação durante a espera; reativação sem nova requisição; HTTP 503 controlado para clima seguido de retry com HTTP 200; Home; comparação temporal/divisor; anexação do modelo ion e clipping habilitado/inverso. SSE observado no modelo permaneceu 16. Nenhum `pageerror` nesses fluxos concluídos.
- Evidência do fluxo desktop: perfil `desktop` de `.verification/geojson-flows.json`. Esse arquivo também registra uma tentativa mobile interrompida pelo teste de picking antes da estabilização. Evidência mobile concluída, sem erro de execução: `.verification/geojson-flows-mobile.json`.

Os primeiros roteiros de navegador precisaram de ajustes de teste: seletor exato para não confundir Microbacias com Microbacias simuladas; espera de estabilização/amostragem de picking no mobile; uso de gesto de navegação onde o botão de zoom é oculto por design; abertura/fechamento pelo botão fixo Camadas para não depender da rolagem do cabeçalho. Não houve mudança na aplicação para contornar essas diferenças do roteiro. As tentativas interrompidas não entram na tabela de desempenho.

As respostas 404 de tiles já apareciam no baseline: 70 mensagens no desktop e 46 no mobile, repetidas na amostra posterior. Não houve `pageerror` nas aberturas medidas. Não foram corrigidas fontes/cobertura de rasters, pois isso está fora do escopo. A falha HTTP 503 inserida pelo roteiro funcional é deliberada e deve ser distinguida dessas ocorrências pré-existentes.

Os ensaios WebGL emulados não certificam desempenho de GPU, precisão altimétrica ou todos os dispositivos físicos. Os dados, procedimentos de medição, datum e transformação existentes não foram alterados.

## E. Reutilização

A lógica compartilhada fica no hook genérico, sem IDs específicos da Jurema e sem alteração do template oficial. Pode ser incorporada futuramente a outros projetos: fila por visibilidade, deduplicação de pendências, rechecagem após anexação, retenção/retry e ordenação pública das fontes. A decisão de quais camadas abrem ligadas continua em `src/projects/`, via `defaultVisible`; nesta Jurema todos os GeoJSON são falsos. Não há regra global que silenciosamente sobrescreva configurações de outros projetos.

Não foram implementadas as demais fases da auditoria: nenhum worker, formato tiled novo, alteração de LOD/resolução/GPU/cache/CDN, mudança no carregamento do Cesium ou refatoração de popup/medição.
