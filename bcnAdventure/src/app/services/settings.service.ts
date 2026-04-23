import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export interface AppSettings {
  darkMode: boolean;
  proximityNotifications: boolean;
  showDistance: boolean;
  language: string;
  colorTheme: string;
  offlineMode: boolean;
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
  private http = inject(HttpClient);
  
  private defaultSettings: AppSettings = {
    darkMode: false,
    proximityNotifications: true,
    showDistance: true,
    language: 'es',
    colorTheme: 'system',
    offlineMode: false,
    fontSizeMultiplier: 1,
    fontFamily: 'system',
    lineHeight: 1.5,
    textAlign: 'left'
  };

  private settingsSubject = new BehaviorSubject<AppSettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();

  constructor() {}

  async preloadAllData() {
    const themes = ['historia', 'arquitectura', 'gastronomia', 'misterios', 'cine'];
    try {
      await firstValueFrom(this.http.get('assets/data/themes.json'));
      for (const theme of themes) {
        await firstValueFrom(this.http.get(`assets/data/${theme}.json`));
      }
      console.log('Todas las rutas han sido precargadas para modo offline.');
    } catch (error) {
      console.error('Error precargando datos offline:', error);
    }
  }

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
