import path from 'path';
import fs from 'fs';
import { SystemConfig } from '../models/config.model';

const DEFAULT_CONFIG_PATH = path.join(__dirname, '../data/default-config.json');
const RUNTIME_CONFIG_PATH = path.join(__dirname, '../data/config.runtime.json');

let cachedConfig: SystemConfig | null = null;

export function getConfig(): SystemConfig {
  if (cachedConfig) return cachedConfig;
  // Prefer runtime config (user-edited) over defaults
  if (fs.existsSync(RUNTIME_CONFIG_PATH)) {
    try {
      cachedConfig = JSON.parse(fs.readFileSync(RUNTIME_CONFIG_PATH, 'utf-8')) as SystemConfig;
      return cachedConfig;
    } catch {
      // Fall back to default if runtime config is corrupt
    }
  }
  cachedConfig = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf-8')) as SystemConfig;
  return cachedConfig;
}

export function saveConfig(config: SystemConfig): void {
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(RUNTIME_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  cachedConfig = config;
}

export function resetToDefault(): SystemConfig {
  if (fs.existsSync(RUNTIME_CONFIG_PATH)) {
    fs.unlinkSync(RUNTIME_CONFIG_PATH);
  }
  cachedConfig = null;
  return getConfig();
}
