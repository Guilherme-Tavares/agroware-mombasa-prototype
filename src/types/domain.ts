export interface Point {
  x: number
  y: number
}

export interface Producer {
  id: string
  name: string
  email?: string
}

export interface Farm {
  id: string
  producerId: string
  name: string
  city: string
  state: string
  totalArea: number
  perimeter?: number
  polygon: Point[]
}

export interface Forage {
  id: string
  name: string
  scientificName: string
}

export interface Division {
  id: string
  farmId: string
  name: string
  area: number
  type: 'pasture' | 'reserve' | 'corral' | 'paddock'
  status: 'active' | 'inactive'
  forageId?: string
  forageStartDate?: string
  polygon: Point[]
}

export interface Herd {
  id: string
  farmId: string
  name: string
  purpose: 'recria' | 'engorda'
  formedAt: string
  notes?: string
}

export interface Bovine {
  id: string
  herdId?: string
  name: string
  earTag?: string
  sex: 'M' | 'F'
  breed: string
  birthDate: string
  currentWeight: number
  lastWeighDate: string
  origin: 'purchased' | 'born' | 'transferred'
  photoBase64?: string
}

export interface Allocation {
  id: string
  herdId: string
  divisionId: string
  startDate: string
  endDate?: string
  active: boolean
}

export interface Refill {
  date: string
  amount: number
  feedId: string
}

export interface FeedTrough {
  id: string
  divisionId: string
  identifier: string
  capacity: number
  material: 'concrete' | 'wood' | 'plastic' | 'metal'
  position: Point
  currentAmount: number
  currentFeedId?: string
  consumptionRate: number
  lastRefillDate: string
  refillHistory: Refill[]
}

export interface Feed {
  id: string
  name: string
  proteinPercentage?: number
}

export interface Season {
  id: string
  name: string
  type: 'aguas' | 'seca' | 'transicao'
  startDate: string
  endDate: string
}

export interface SeasonPassage {
  id: string
  herdId: string
  seasonId: string
  initialWeight: number
  finalWeight: number
  days: number
  gmd: number
}
