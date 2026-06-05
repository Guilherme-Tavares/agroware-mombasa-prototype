// Rótulos pt-BR para enums de domínio, compartilhados entre listas e detalhes.

export const DIVISION_TYPE_LABEL: Record<string, string> = {
  pasto: 'Pastagem',
  reserva: 'Reserva',
  curral: 'Curral',
  manga: 'Manga',
  instalacao: 'Instalação',
}

export const HERD_PURPOSE_LABEL: Record<string, string> = {
  recria: 'Recria',
  engorda: 'Engorda',
  misto: 'Misto',
}

export const SEASON_TYPE_LABEL: Record<string, string> = {
  aguas: 'Águas',
  seca: 'Seca',
  transicao: 'Transição',
}

export const TROUGH_MATERIAL_LABEL: Record<string, string> = {
  madeira: 'Madeira',
  concreto: 'Concreto',
  plastico: 'Plástico',
  metal: 'Metal',
}

export const MEDICATION_TYPE_LABEL: Record<string, string> = {
  antibiotico: 'Antibiótico',
  antiparasitario: 'Antiparasitário',
  vitamina: 'Vitamina',
  vacina: 'Vacina',
  outro: 'Outro',
}

export const FEED_TYPE_LABEL: Record<string, string> = {
  racao: 'Ração',
  sal_mineral: 'Sal mineral',
  silagem: 'Silagem',
  farelo: 'Farelo',
  suplemento: 'Suplemento',
  outro: 'Outro',
}

export const EXPENSE_GROUP_LABEL: Record<string, string> = {
  insumo_alimenticio: 'Insumo alimentício',
  insumo_sanitario: 'Insumo sanitário',
  infraestrutura: 'Infraestrutura',
  servico: 'Serviço',
  outro: 'Outro',
}

export const SANITARY_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  executado: 'Executado',
  cancelado: 'Cancelado',
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}
