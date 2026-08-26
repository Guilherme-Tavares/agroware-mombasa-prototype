// Dicionário de strings de interface (pt-BR).
//
// Centraliza textos da UI fora dos componentes. O app é monolíngue (pt-BR),
// então não usamos biblioteca de i18n: basta este dicionário + o helper `t()`
// em `@/i18n`. A migração das telas é incremental — chaves novas entram aqui
// conforme as strings são extraídas dos componentes.
//
// Convenção de chaves: `namespace.subchave`, acessada por caminho com ponto
// via `t('common.loading')`. Interpolação com `{param}`: `t('x', { n: 3 })`.

export const ptBR = {
  common: {
    loading:    'Carregando…',
    saving:     'Salvando…',
    empty:      'Nada por aqui ainda',
    errorTitle: 'Algo deu errado',
    errorBody:  'Não foi possível carregar os dados. Tente novamente.',
    retry:      'Tentar novamente',
    save:       'Salvar',
    cancel:     'Cancelar',
    edit:       'Editar',
    remove:     'Remover',
    restore:    'Restaurar',
    confirm:    'Confirmar',
    back:       'Voltar',
    search:     'Buscar',
    add:        'Adicionar',
    export:     'Exportar CSV',
    noResults:  'Nenhum resultado encontrado',
    required:   'Campo obrigatório',
  },

  dashboard: {
    kpiBovines:   'Total de animais',
    kpiGmd:       'GMD médio',
    kpiAlerts:    'Alertas ativos',
    tabMap:       'Mapa',
    tabAlerts:    'Alertas',
    mapTitle:     'Mapa da Propriedade',
    mapFull:      'Ver completo',
    criticalTrough: 'Cocho crítico',
    alertsTitle:  'Alertas e Pendências',
    noAlertsTitle: 'Sem alertas',
    noAlertsBody: 'Todos os cochos e rebanhos estão em dia.',
    quickActions: 'Ações Rápidas',
    gmdTitle:     'Projeção de peso do lote',
  },

  nav: {
    dashboard:     'Painel',
    bovines:       'Bovinos',
    herds:         'Rebanhos',
    map:           'Mapa',
    operations:    'Operações',
    finance:       'Financeiro',
    reports:       'Relatórios',
    notifications: 'Notificações',
    settings:      'Configurações',
  },
} as const

export type Dictionary = typeof ptBR
