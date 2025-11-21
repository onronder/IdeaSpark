export type UUID = string;

export type Timestamp = Date | string;

export type Email = string;

export type URL = string;

export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: Timestamp | null;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: UUID | null;
  updatedBy: UUID | null;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PhoneNumber {
  countryCode: string;
  number: string;
  type: 'mobile' | 'home' | 'work';
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}

export interface AppConfig {
  environment: Environment;
  version: string;
  features: FeatureFlags;
  maintenance: MaintenanceConfig;
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export interface FeatureFlags {
  enableSignup: boolean;
  enablePayments: boolean;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  enableExport: boolean;
  enableTeamFeatures: boolean;
  enableApiAccess: boolean;
}

export interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedEndTime?: Date;
  allowedIPs?: string[];
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    openai: ServiceHealth;
    stripe: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
}

export type SortOrder = 'asc' | 'desc';

export type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between';

export interface Filter {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

export interface Sort {
  field: string;
  order: SortOrder;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface NumberRange {
  min: number;
  max: number;
}

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T> = Promise<T>;

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};