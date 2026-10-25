import { api } from '@/lib/api';
import type { AppSettings, AppSettingsUpdate } from '@/types';

/** The current player's settings (created with defaults on first read). */
export function getSettings(): Promise<AppSettings> {
  return api<AppSettings>('/me/settings');
}

export function updateSettings(patch: AppSettingsUpdate): Promise<AppSettings> {
  return api<AppSettings>('/me/settings', { body: patch });
}
