export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum PositionDirectionEnum {
  LONG = 'long',
  SHORT = 'short',
}

export enum OrderTypeEnum {
  LIMIT = 'limit',
  TRIGGER_MARKET = 'triggerMarket',
  TRIGGER_LIMIT = 'triggerLimit',
  MARKET = 'market',
  ORACLE = 'oracle',
}

export enum BattleStatus {
  PENDING = 'PENDING',
  MATCHING = 'MATCHING',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum MetricType {
  PNL = 'PNL',
  VOLUME = 'VOLUME',
  ROI = 'ROI',
  WIN_RATE = 'WIN_RATE',
}
