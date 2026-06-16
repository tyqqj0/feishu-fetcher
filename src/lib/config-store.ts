import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { AppConfig, ConfigFile } from '../types.js';

const CONFIG_DIR = join(homedir(), '.feishu-fetcher');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<ConfigFile> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { apps: [] };
  }
}

export async function saveConfig(config: ConfigFile): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function addApp(app: AppConfig): Promise<void> {
  const config = await loadConfig();
  if (config.apps.some(a => a.name === app.name)) {
    throw new Error(`App "${app.name}" already exists. Remove it first or use a different name.`);
  }
  config.apps.push(app);
  if (!config.defaultApp) {
    config.defaultApp = app.name;
  }
  await saveConfig(config);
}

export async function removeApp(name: string): Promise<void> {
  const config = await loadConfig();
  const idx = config.apps.findIndex(a => a.name === name);
  if (idx === -1) {
    throw new Error(`App "${name}" not found.`);
  }
  config.apps.splice(idx, 1);
  if (config.defaultApp === name) {
    config.defaultApp = config.apps[0]?.name;
  }
  await saveConfig(config);
}

export async function getApp(name?: string): Promise<AppConfig> {
  const config = await loadConfig();
  if (config.apps.length === 0) {
    throw new Error('No apps configured. Run "feishu-fetcher config add" first.');
  }
  const target = name || config.defaultApp || config.apps[0].name;
  const app = config.apps.find(a => a.name === target);
  if (!app) {
    throw new Error(`App "${target}" not found. Available: ${config.apps.map(a => a.name).join(', ')}`);
  }
  return app;
}
