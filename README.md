# Agroware Mombasa — Protótipo PWA

Protótipo navegável de alta fidelidade do **Agroware Mombasa**, sistema de gestão pecuária focado em recria e engorda de bovinos machos em regime semi-intensivo. Construído em React + TypeScript, opera offline-first.

> **Status:** Steps (Fases) 0–9 concluídos. O protótipo cobre os 74 requisitos funcionais (RF01–RF74) e as 32 entidades do modelo de dados: cadastros, operações com lógica de negócio, camada de consulta (edição + remoção reversível), financeiro, notificações persistidas, suíte de relatórios com export CSV e a fase de polimento (dashboard reconectado, estados vazio/erro, scaffold de i18n, PWA instalável). `npm run build` e o lint passam sem erros.

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack técnico](#stack-técnico)
- [Como rodar](#como-rodar)
- [Atalhos](#atalhos)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Dataset mock](#dataset-mock)
- [Telas implementadas](#telas-implementadas)
- [Decisões técnicas](#decisões-técnicas)
- [PWA — ícones e Lighthouse](#pwa--ícones-e-lighthouse)
- [Acessibilidade](#acessibilidade)
- [Estados de UI](#estados-de-ui-vazio--erro--carregamento)
- [Responsividade](#responsividade)
- [Gaps conhecidos](#gaps-conhecidos)

---

## Visão geral

O Agroware Mombasa é um PWA mobile-first que substitui controles manuais por uma solução integrada para o produtor rural de médio porte. O protótipo opera completamente offline, sem backend ou API externa, persistindo dados no `localStorage` via middleware `persist` do Zustand.

| # | Tela | Rota | Status |
|---|---|---|---|
| 1 | Login / Onboarding | `/login` | ✅ |
| 2 | Dashboard | `/` | ✅ |
| 3 | Mapa Interativo + painel lateral | `/map` | ✅ |
| 4 | Demarcação de propriedade | `/demarcation` | ✅ |
| 5 | Cadastro de bovino | `/bovines/new` · `/bovines/:id/edit` | ✅ |
| 6 | Cadastro de divisão | `/divisions/new` | ✅ |
| 7 | Cadastro de rebanho | `/herds/new` | ✅ |
| 8 | Operação de lotação | `/operations/allocation` | ✅ |
| 9 | Detalhe de cocho (Sistema HP) | `/feed-troughs/:id` | ✅ |

> A tabela acima são as 9 telas de alta fidelidade do protótipo original (Steps 1–4). As fases 5–9 expandiram o app para a suíte completa do escopo: cadastros de todas as entidades, operações com lógica de negócio (pesagem, aplicação sanitária, abastecimento, transferência, vínculos, vendas), camada de consulta (lista + detalhe + edição + remoção reversível) e históricos, financeiro, notificações persistidas e 7 relatórios com export CSV — todas registradas em `src/routes.tsx`.

---

## Stack técnico

| Camada | Tecnologia |
|---|---|
| Build | Vite 8 |
| Framework | React 19 |
| Linguagem | TypeScript 6 (`erasableSyntaxOnly`, `verbatimModuleSyntax`) |
| Roteamento | React Router 7 |
| Estilo | Tailwind CSS 3 |
| Estado global | Zustand 5 (middleware `persist`) |
| Animações | Framer Motion 12 |
| Ícones | Lucide React |
| Gráficos | Recharts 3 |
| Datas | date-fns 4 (locale pt-BR) |
| PWA | vite-plugin-pwa 1 (Workbox 7) |
| i18n | scaffold próprio (`src/i18n`, sem dependência) |
| Fontes | @fontsource/roboto, @fontsource/roboto-mono |
| Persistência | localStorage (chaves `agroware:farm`, `agroware:auth`, `agroware:ui`) |

---

## Como rodar

**Pré-requisitos:** Node.js 20+, npm 10+.

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Build de produção (roda tsc + vite build)
npm run build

# Preview do build de produção
npm run preview

# Lint
npm run lint
```

---

## Atalhos

| Tecla | Ação |
|---|---|
| `Shift + Ctrl + R` | Reseta todos os dados para o mock da Fazenda São José (em qualquer página, fora de campos de texto) |
| `Esc` | Fecha modal/bottom-sheet aberto |

Para reset programático no console do navegador:

```js
import('@/data/seed').then(m => m.resetToMock())
```

---

## Estrutura do projeto

```
src/
├── assets/
│   ├── illustrations/
│   │   └── PastoralScene.tsx       # Ilustração da tela de Login
│   └── logo/
│       └── AgrowareLogo.tsx        # Logo SVG (mark + wordmark)
├── components/
│   ├── ErrorBoundary.tsx           # Captura erros globais com fallback + reset de dados
│   ├── ui/                         # Primitivos: Button, Input, Select, Textarea, Card,
│   │                               #   Badge, Modal, BottomSheet, Toast, Skeleton, EmptyState
│   ├── layout/                     # AppShell, Header, Sidebar, MobileBottomNav, AnimatedOutlet
│   ├── domain/                     # CattleIcon, FeedTroughMarker, HPBar...
│   └── map/
│       ├── StylizedFarmMap.tsx     # SVG inline com 6 camadas + pan/zoom
│       ├── MapControls.tsx         # ZoomControls, LayerTogglePanel, MapStyleToggle
│       └── DetailPanel.tsx         # Painel: DivisionDetail, HerdDetail, TroughDetail
├── data/
│   ├── mockFarm.ts                 # Dataset Fazenda São José
│   └── seed.ts                     # seedIfEmpty() + resetToMock()
├── hooks/
│   ├── useResponsive.ts            # isMobile / isTablet / isDesktop
│   ├── useMapPanZoom.ts            # Pan/zoom via Pointer Events + wheel não-passivo
│   ├── useDevShortcuts.ts          # Atalhos globais (Shift+Ctrl+R)
│   └── useToast.ts
├── pages/
│   ├── Login/                      # Layout dividido, modos email/offline
│   ├── Dashboard/                  # KPIs animados, mapa preview, alertas, gráfico GMD
│   ├── Map/                        # Mapa interativo + painel lateral / bottom sheet
│   ├── Demarcation/                # Desenho SVG: pins, marching ants, Shoelace, modal
│   ├── BovineRegister/             # Form: foto, validação inline, edit mode
│   ├── DivisionRegister/           # Form: área, tipo, forrageira condicional
│   ├── HerdRegister/               # Form: finalidade, data, observações
│   ├── HerdAllocation/             # Drag-and-drop, modal UA/ha, flash de confirmação
│   └── FeedTroughDetail/           # Sistema HP: barra animada, evolução, refill modal
├── store/
│   ├── useFarmStore.ts             # Propriedade, divisões, rebanhos, bovinos, cochos
│   ├── useAuthStore.ts             # Sessão local
│   └── useUIStore.ts               # Toasts, sidebar, camadas do mapa
├── i18n/
│   ├── pt-BR.ts                    # Dicionário de strings de UI (namespaces: common, dashboard, nav)
│   └── index.ts                    # Helper t() com interpolação + re-export de utils/labels
├── styles/
│   └── globals.css                 # Tailwind directives + tipografia/sombras semânticas
├── types/
│   └── domain.ts                   # Interfaces de domínio (string literal unions, sem enum)
├── utils/
│   ├── geometry.ts                 # shoelaceArea, polygonPerimeter, distance, centroid
│   ├── gmd.ts                      # Ganho Médio Diário
│   ├── stocking-rate.ts            # Taxa de lotação (UA/ha)
│   ├── hp-system.ts                # Sistema HP de cochos
│   ├── format.ts                   # Formatadores pt-BR (datas, pesos, áreas)
│   └── storage.ts                  # Wrapper tipado de localStorage
├── routes.tsx                      # createBrowserRouter com todas as rotas
├── App.tsx                         # ErrorBoundary + RouterProvider + ToastContainer
└── main.tsx                        # seedIfEmpty() antes do mount
```

---

## Dataset mock

Todos os dados ficam em `src/data/mockFarm.ts` e são carregados automaticamente no primeiro acesso.

**Fazenda São José** — Ji-Paraná, RO, 125,5 ha

| Entidade | Quantidade |
|---|---|
| Divisões (piquetes) | 5 (27,5 ha totais) |
| Rebanhos | 3 |
| Bovinos | 85 (Lote A: 25, Lote B: 40, Lote C: 20) |
| Cochos | 4 |
| Temporadas | 3 |

**Alertas pré-configurados:**
- Cocho C-03 crítico: 30 kg / 250 kg (12%, ~6 dias restantes)
- Cocho C-02 atenção: 90 kg / 200 kg (45%)
- Lote B com pesagem atrasada (último registro em 28/03/2026)

**Rebanhos e GMDs:**

| Lote | Finalidade | Divisão | Cabeças | Peso médio | GMD |
|---|---|---|---|---|---|
| Lote A | Recria | Piquete 1 | 25 | 285 kg | 0,738 kg/dia |
| Lote B | Engorda | Piquete 3 | 40 | 420 kg | 0,917 kg/dia |
| Lote C | Recria | Piquete 4 | 20 | 260 kg | 0,780 kg/dia |

---

## Telas implementadas

**Login** — layout dividido com ilustração; modos email/offline; animação de entrada por step.

**Dashboard** — KPIs animados (count-up via `requestAnimationFrame`), mapa preview com hover, alertas de cocho/pesagem, gráfico GMD por temporada (Recharts).

**Mapa Interativo** — SVG inline `viewBox 1000×700` com 6 camadas toggleáveis (divisões, cochos, rebanhos, ar/água, rótulos, trilhas). Pan/zoom unificado mouse+touch via Pointer Events. Painel lateral no desktop, BottomSheet no mobile.

**Demarcação** — cliques sequenciais sobre o SVG; pins numerados com animação pop; linhas tracejadas com efeito marching ants; cálculo de área via Shoelace; modal de confirmação com perímetro e vértices.

**Detalhe de Cocho (Sistema HP)** — barra HP animada com `useMotionValue`+`animate()`, pulso em estado crítico, gráfico de evolução (sawtooth) por Recharts, modal de abastecimento com preview e seleção de ração.

**Cadastros (Bovino, Divisão, Rebanho)** — template visual compartilhado; validação inline por campo (`touched` + `submitAttempted`); banner de erros animado; submit por Enter (formulário nativo); toast de sucesso + `navigate(-1)`.

**Lotação** — drag-and-drop com `dragSnapToOrigin`; hit-test via `getBoundingClientRect()`; drop-zone com highlight; modal com cálculo de UA/ha resultante e aviso de superlotação; flash verde de confirmação.

---

## Decisões técnicas

**Mapa SVG estilizado, não Google Maps.**
O protótipo exige funcionamento offline-first. Integrar Google Maps criaria dependência de rede, custo de API e contradiz a premissa central do produto. O mapa é um SVG inline com polígonos clicáveis representando as divisões da propriedade no viewBox 1000×700.

**Pan/zoom via Pointer Events + wheel não-passivo.**
Um único hook `useMapPanZoom` unifica mouse e touch (incluindo pinch). O listener de `wheel` é registrado via `useEffect` com `{ passive: false }` — necessário para chamar `preventDefault()` e impedir o scroll da página durante o zoom no mapa.

**Drag-and-drop sem biblioteca.**
A tela de lotação usa apenas Framer Motion `drag` + hit testing manual com `getBoundingClientRect()`. Para 5 divisões, isto é mais leve que adicionar `react-dnd`. `dragSnapToOrigin` simplifica o ciclo: o card sempre volta ao lugar, a atualização visual vem do re-render do store.

**Zustand com `persist` nas três stores.**
Redux foi descartado pela verbosidade desnecessária no escopo de um protótipo. O middleware `persist` do Zustand persiste automaticamente no `localStorage` com rehydratação síncrona, permitindo que `seed.ts` verifique o estado antes da primeira renderização sem race conditions.

**Sem biblioteca de componentes (MUI, Chakra, Ant Design).**
Todos os primitivos são construídos do zero sobre Tailwind. Isso garante controle visual total sobre a identidade da marca e evita overrides de estilos de terceiros.

**85 bovinos gerados via factory function.**
Os bovinos do dataset mock são criados programaticamente em `mockFarm.ts` com variações determinísticas de peso (sem `Math.random()`), garantindo que o localStorage seja sempre populado com os mesmos valores.

**React Router v7 em modo biblioteca.**
Usado como biblioteca standalone (sem o framework adapter do Vite), mantendo a mesma API `createBrowserRouter` + `RouterProvider` familiar do v6 data router.

**TypeScript 6 com `erasableSyntaxOnly`.**
A configuração proíbe `enum` e `namespace`. Todos os tipos de domínio usam string literal unions (`'recria' | 'engorda'`) e interfaces, compatíveis com a restrição.

**Cadastros como `<form>` nativos.**
Formulários reais (não apenas `<div>` com handlers) habilitam submit por Enter, semântica para leitores de tela e validação HTML quando relevante. `Button` foi configurado com `type="button"` por padrão para que o Cancel não submeta acidentalmente.

**ErrorBoundary com auto-recuperação.**
Captura erros não tratados, exibe a mensagem e oferece dois fallbacks: recarregar a página ou resetar o `localStorage` e voltar para `/`. Evita que um único erro torne o app inutilizável.

---

## PWA — ícones e Lighthouse

O `vite-plugin-pwa` está configurado com manifest (`lang: pt-BR`), `registerType: 'autoUpdate'` e Workbox. O service worker (`sw.js` + `workbox-*.js`) e o `manifest.webmanifest` são gerados no build.

**Ícone — SVG escalável shippado (instalável em navegadores modernos):**

```
public/icons/
├── icon.svg                ← ícone referenciado no manifest (purpose any + maskable)
├── source.svg              ← fonte de referência
└── README.md               ← instruções de geração de PNGs
```

O manifest referencia `icon.svg` com `sizes: "any"` e `type: "image/svg+xml"`, o que basta para instalação em Chrome/Edge/Firefox atuais. PNGs raster `pwa-192x192.png` / `pwa-512x512.png` continuam **recomendados como melhoria** para máxima compatibilidade (home-screen do iOS e Android legado, que preferem PNG). Veja `public/icons/README.md` para opções de geração (pwa-asset-generator, ImageMagick) — não há rasterizador no projeto, então a geração é um passo manual.

**Verificar Lighthouse PWA score:**

```bash
npm run build
npm run preview
# Abra http://localhost:4173 no Chrome → DevTools → Lighthouse → PWA
```

Targets esperados:
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- PWA: instalável (manifest + SW + ícone SVG já presentes; PNGs raster melhoram a nota em alguns ambientes)

---

## Acessibilidade

- `:focus-visible` global com outline verde 2px no `globals.css`
- `aria-label` em todos os botões-ícone (menu, fechar, voltar, notificações, etc.)
- `aria-modal`, `aria-labelledby` no Modal; fecha com `Esc`; trava scroll do body
- `role="alert"` no ErrorBoundary
- `aria-hidden` em ícones decorativos
- Labels associadas por `htmlFor`/`id` em Inputs e Selects
- Touch targets ≥ 44×44px (MobileBottomNav usa `min-h-[56px]`)
- Contraste de texto AA: primary `#2E7D32` sobre branco passa WCAG AA para body text
- `lang="pt-BR"` no `<html>` e no manifest

---

## Estados de UI (vazio / erro / carregamento)

- **Vazio:** componente `ui/EmptyState` usado nas ~45 telas de lista, detalhe e histórico; os 7 relatórios tratam tabela vazia inline e desabilitam o export quando não há linhas.
- **Erro:** `ErrorBoundary` global na raiz (`App.tsx`) com fallback acessível (`role="alert"`), recarregar ou resetar dados.
- **Carregamento:** o estado vive 100% em stores Zustand com `persist` (rehidratação **síncrona** a partir do `localStorage`) e o dataset é semeado antes do mount — não há fetch assíncrono, então spinners de carregamento são majoritariamente desnecessários. O primitivo `ui/Skeleton` existe para quando dados remotos entrarem no escopo.

---

## Responsividade

Breakpoints Tailwind padrão: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.

| Breakpoint alvo | Comportamento |
|---|---|
| **375px** (mobile) | Sidebar oculta atrás de menu hambúrguer · MobileBottomNav · Mapa em altura `calc(100svh-230px)` · Painel de detalhe vira BottomSheet · Cadastros em coluna única |
| **768px** (tablet) | Mesma estrutura mobile, mais espaço lateral · Grids passam para 2 colunas em cadastros |
| **1024px** (desktop) | Sidebar fixa expande · MobileBottomNav some · Painel lateral do mapa aparece · Lotação ganha layout side-by-side |
| **1440px** (wide) | Lotação ganha 3ª coluna de divisões · Dashboard com KPIs em linha |

---

## Gaps conhecidos

Itens que poderiam evoluir além do escopo atual:

**Para gerar antes de deploy/demo**
- PNGs raster `pwa-192x192.png` / `pwa-512x512.png` para iOS/Android legado (o ícone SVG já torna a PWA instalável nos navegadores atuais — ver `public/icons/README.md`)
- Screenshots reais para incluir num doc de apresentação

**Para validar manualmente**
- Lighthouse audit completo (Performance/A11y/BP/PWA) — depende de browser
- Teste cross-browser (Safari iOS principalmente) — pinch zoom, viewport `100svh`
- Teste de instalação PWA no Chrome Android e Edge Desktop

**Evoluções razoáveis**
- Validação de formulário com `zod` em vez de função `validate` manual
- Substituir factory `makeBovines` por seed determinístico com `seedrandom` para gerar variações de raça/idade
- `pwa-asset-generator` como devDependency + script `npm run icons` para regenerar PNGs a partir do SVG
- Storybook ou rota `/dev/components` mais completa (já existe esqueleto em `pages/DevComponents`)
- Testes: nenhum até o momento. Vitest + React Testing Library seria o caminho natural
- **i18n:** há um scaffold sem dependências em `src/i18n/` (dicionário `pt-BR.ts` + helper `t()` com interpolação `{param}`, mais re-export dos rótulos de enums em `utils/labels.ts`). A migração das strings é **incremental** — o Dashboard já consome `t()`; as demais telas ainda têm texto pt-BR inline. Trocar por `react-intl`/`i18next` só se a internacionalização (outro idioma) entrar no escopo.

**Decisões deliberadas a revisitar**
- `localStorage` como única persistência: para um produtor sem internet boa, ótimo; para multi-device, vai precisar de sync (Supabase / Firestore / CouchDB)
- Polígonos de divisão são fixos no mock — a UI atual não permite desenhar/editar polígonos por divisão (só o contorno da fazenda em `/demarcation`)
- O dataset não cobre eventos longitudinais (pesagens repetidas no tempo). O GMD é calculado a partir de `SeasonPassage` mas o input é uma única média
