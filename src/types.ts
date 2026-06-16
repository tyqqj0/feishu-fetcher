export interface AppConfig {
  name: string;
  appId: string;
  appSecret: string;
}

export interface ConfigFile {
  defaultApp?: string;
  apps: AppConfig[];
}

export interface FeishuUser {
  name: string;
  open_id: string;
  user_id: string;
  union_id: string;
}

export interface Department {
  department_id: string;
  name: string;
  open_department_id: string;
}

export interface DeptNode {
  id: string;
  name: string;
  children: DeptNode[];
}

export interface FetchOptions {
  app?: string;
  format: 'csv' | 'json';
  output?: string;
  department?: string;
}
