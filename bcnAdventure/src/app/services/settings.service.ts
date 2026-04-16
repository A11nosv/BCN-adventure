import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppSettings {
  darkMode: boolean;
  proximityNotifications: boolean;
  showDistance: boolean;
  language: string;
  colorTheme: string;
  // Accessibility
  fontSizeMultiplier: number;
  fontFamily: string;
  lineHeight: number;
  textAlign: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly SETTINGS_KEY = 'bcn_adventure_settings';
  
  private defaultSettings: AppSettings = {
    darkMode: false,
    proximityNotifications: true,
    showDistance: true,
    language: 'es',
    colorTheme: 'system',
    fontSizeMultiplier: 1,
    fontFamily: 'system',
    lineHeight: 1.5,
    textAlign: 'left'
  };

  private settingsSubject = new BehaviorSubject<AppSettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();

  constructor() {}

  private loadSettings(): AppSettings {
    const saved = localStorage.getItem(this.SETTINGS_KEY);
    return saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : this.defaultSettings;
  }

  updateSettings(newSettings: Partial<AppSettings>) {
    const current = this.settingsSubject.value;
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
    this.settingsSubject.next(updated);
  }

  get currentSettings(): AppSettings {
    return this.settingsSubject.value;
  }
}
