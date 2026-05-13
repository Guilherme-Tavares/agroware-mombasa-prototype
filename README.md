# Agroware Mombasa — Protótipo PWA

Protótipo navegável de alta fidelidade do **Agroware Mombasa**, sistema de gestão pecuária focado em recria e engorda de bovinos machos em regime semi-intensivo. Construído em React + TypeScript.

> **Status:** Step 3 em andamento — Login, Dashboard, Mapa Interativo e Detalhe de Cocho (HP) concluídos.

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack técnico](#stack-técnico)
- [Como rodar](#como-rodar)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Dataset mock](#dataset-mock)
- [Status de implementação](#status-de-implementação)
- [Decisões técnicas](#decisões-técnicas)
- [Próximos passos](#próximos-passos)

---

## Visão geral

O Agroware Mombasa é um PWA mobile-first que substitui controles manuais por uma solução integrada para o produtor rural de médio porte. O protótipo opera completamente offline, sem backend ou API externa, persistindo dados no `localStorage`.

**Telas previstas:**

| # | Tela | Rota | Status |
|---|---|---|---|
| 1 | Login / Onboarding | `/login` | ✅ |
| 2 | Dashboard | `/` | ✅ |
| 3 | Mapa Interativo + painel lateral | `/map` | ✅ |
| 4 | Demarcação de propriedade | `/demarcation` | ⏳ |
| 5 | Cadastro de bovino | `/bovines/new` | ⏳ |
| 6 | Cadastro de divisão | `/divisions/new` | ⏳ |
| 7 | Cadastro de rebanho | `/herds/new` | ⏳ |
| 8 | Operação de lotação | `/operations/allocation` | ⏳ |
| 9 | Detalhe de cocho (Sistema HP) | `/feed-troughs/:id` | ✅ |

---

## Stack técnico

| Camada | Tecnologia |
|---|---|
| Build | Vite 8 |
| Framework | React 19 |
| Linguagem | TypeScript 6 |
| Roteamento | React Router 7 |
| Estilo | Tailwind CSS 3 |
| Estado global | Zustand 5 (persist middleware) |
| Animações | Framer Motion 12 |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Datas | date-fns 4 (locale pt-BR) |
| PWA | vite-plugin-pwa 1 (Workbox 7) |
| Fontes | @fontsource/roboto, @fontsource/roboto-mono |
| Persistência | localStorage (wrapper tipado próprio) |

---

## Como rodar

**Pré-requisitos:** Node.js 20+, npm 10+.

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

**Reset para dados mock:** com o servidor rodando, abra o console do navegador e execute:

```js
import('@/data/seed').then(m => m.resetToMock())
```

> Na Etapa 4 será adicionado o atalho de teclado `Shift+Ctrl+R` para o mesmo efeito.

---

## Estrutura do projeto

```
src/
├── assets/
│   └── illustrations/
│       └── PastoralScene.tsx   # Ilustração SVG da tela de Login
├── components/
│   ├── ui/                     # Primitivos: Button, Input, Card, Badge, Modal,
│   │                           #   BottomSheet, Toast, Skeleton, EmptyState
│   ├── layout/                 # AppShell, Header, Sidebar, MobileBottomNav,
│   │                           #   AnimatedOutlet (fade-slide entre rotas)
│   ├── domain/                 # CattleIcon, FeedTroughMarker, HPBar...
│   └── map/
│       ├── StylizedFarmMap.tsx # SVG inline com 6 camadas + pan/zoom
│       ├── MapControls.tsx     # ZoomControls, LayerTogglePanel, MapStyleToggle
│       └── DetailPanel.tsx     # Painel lateral: DivisionDetail, HerdDetail, TroughDetail
├── data/
│   ├── mockFarm.ts             # Dataset Fazenda São José completo
│   └── seed.ts                 # seedIfEmpty() + resetToMock()
├── hooks/
│   ├── useResponsive.ts        # isMobile / isTablet / isDesktop
│   ├── useMapPanZoom.ts        # Pan/zoom via Pointer Events + wheel não-passivo
│   └── useToast.ts
├── pages/
│   ├── Login/                  # Layout dividido, modos email/offline, animações
│   ├── Dashboard/              # KPIs animados, mapa preview, alertas, gráfico GMD
│   ├── Map/                    # Mapa interativo completo + controles flutuantes
│   ├── FeedTroughDetail/       # Sistema HP: barra animada, gráfico de evolução, modal de abastecimento
│   └── ...                     # Demais telas (placeholders)
├── store/
│   ├── useFarmStore.ts         # Propriedade, divisões, rebanhos, bovinos, cochos
│   ├── useAuthStore.ts         # Sessão local
│   └── useUIStore.ts           # Toasts, sidebar, camadas do mapa
├── styles/
│   └── globals.css             # Tailwind directives + @layer customizados
├── types/
│   └── domain.ts               # Interfaces de domínio
├── utils/
│   ├── geometry.ts             # polygonCentroid, polygonToPoints (Shoelace)
│   ├── gmd.ts                  # Ganho Médio Diário
│   ├── stocking-rate.ts        # Taxa de lotação (UA/ha)
│   ├── hp-system.ts            # Sistema HP de cochos
│   ├── format.ts               # Formatadores pt-BR
│   └── storage.ts              # Wrapper tipado de localStorage
├── routes.tsx                  # createBrowserRouter com todas as rotas
└── App.tsx                     # RouterProvider
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

**Alertas pré-configurados no mock:**
- Cocho C-03 em estado crítico: 30 kg / 250 kg (12%, ~6 dias restantes)
- Cocho C-02 em atenção: 90 kg / 200 kg (45%)
- Lote B com pesagem atrasada (último registro em 28/03/2026)

**Rebanhos e GMDs:**

| Lote | Finalidade | Divisão | Cabeças | Peso médio | GMD |
|---|---|---|---|---|---|
| Lote A | Recria | Piquete 1 | 25 | 285 kg | 0,738 kg/dia |
| Lote B | Engorda | Piquete 3 | 40 | 420 kg | 0,917 kg/dia |
| Lote C | Recria | Piquete 4 | 20 | 260 kg | 0,780 kg/dia |

---

## Status de implementação

| Step | Descrição | Status |
|---|---|---|
| **1. Fundações** | Configs, tipos, mock data, utils, stores, seed, rotas placeholder | ✅ Concluída |
| **2. Sistema de componentes** | Button, Input, Card, Badge, Modal, AppShell, Sidebar, Nav, AnimatedOutlet | ✅ Concluída |
| **3. Telas** | Login ✅ · Dashboard ✅ · Mapa ✅ · HP ✅ · Demarcação ⏳ · Cadastros ⏳ · Lotação ⏳ | 🔄 Em andamento |
| **4. Polimento** | Animações, responsividade, estados (loading/empty/error), PWA final | ⏳ Pendente |

---

## Decisões técnicas

**Mapa SVG estilizado, não Google Maps.**
O protótipo exige funcionamento offline-first. Integrar Google Maps criaria dependência de rede, custo de API e contradiz a premissa central do produto. O mapa é um SVG inline com polígonos clicáveis representando as divisões da propriedade no viewBox 1000×700.

**Pan/zoom via Pointer Events + wheel não-passivo.**
Um único hook `useMapPanZoom` unifica mouse e touch (incluindo pinch). O listener de `wheel` é registrado via `useEffect` com `{ passive: false }` — necessário para chamar `preventDefault()` e impedir o scroll da página durante o zoom no mapa.

**Zustand com `persist` nas três stores.**
Redux foi descartado pela verbosidade desnecessária no escopo de um protótipo. O middleware `persist` do Zustand persiste automaticamente no `localStorage` com rehydratação síncrona, permitindo que o `seed.ts` verifique o estado antes da primeira renderização sem race conditions.

**Sem biblioteca de componentes (MUI, Chakra, Ant Design).**
Todos os primitivos são construídos do zero sobre Tailwind. Isso garante controle visual total sobre a identidade da marca e evita overrides de estilos de terceiros.

**85 bovinos gerados via factory function.**
Os bovinos do dataset mock são criados programaticamente em `mockFarm.ts` com variações determinísticas de peso (sem `Math.random()`), garantindo que o localStorage seja sempre populado com os mesmos valores.

**React Router v7 em modo biblioteca.**
Usado como biblioteca standalone (sem o framework adapter do Vite), mantendo a mesma API `createBrowserRouter` + `RouterProvider` familiar do v6 data router.

**TypeScript 6 com `erasableSyntaxOnly`.**
A configuração proíbe `enum` e `namespace`. Todos os tipos de domínio usam string literal unions (`'recria' | 'engorda'`) e interfaces, compatíveis com a restrição.

---

## Próximos passos

**Step 3 — Telas restantes**
- Demarcação (`/demarcation`): ferramenta SVG de desenho de polígono com cálculo de área via Shoelace
- Cadastro de bovino (`/bovines/new`, `/bovines/:id/edit`): formulário com foto, raça, peso inicial
- Cadastros de divisão e rebanho (`/divisions/new`, `/herds/new`)
- Operação de lotação (`/operations/allocation`): arrastar rebanho para piquete com Framer Motion

**Step 4 — Polimento**
- Responsividade fina em 375px, 768px, 1024px e 1440px
- Estados loading/empty/error em todas as listas e formulários
- Atalho `Shift+Ctrl+R` para reset do mock
- Ícones PWA (192px e 512px) e verificação Lighthouse

---
