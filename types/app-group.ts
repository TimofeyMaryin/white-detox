export interface AppGroup {
  id: string;
  name: string;
  apps: string[]; // App identifiers or tokens
  createdAt: Date;
  updatedAt: Date;
}

export interface AppInfo {
  identifier: string;
  name: string;
  icon?: string;
}

