import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonSelect, IonSelectOption, IonItemDivider } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { moonOutline, notificationsOutline, languageOutline, colorPaletteOutline, informationCircleOutline, textOutline, reorderThreeOutline, refreshOutline } from 'ionicons/icons';
import { SettingsService, AppSettings } from '../services/settings.service';
import { Capacitor } from '@capacitor/core';

import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonSelect, IonSelectOption, IonItemDivider]
})
export class SettingsPage {
  private settingsService = inject(SettingsService);
  settings: AppSettings;

  constructor() {
    addIcons({ moonOutline, notificationsOutline, languageOutline, colorPaletteOutline, informationCircleOutline, textOutline, reorderThreeOutline, refreshOutline });
    this.settings = this.settingsService.currentSettings;
    
    // Suscribirse a cambios para mantener la UI sincronizada si se resetea
    this.settingsService.settings$.subscribe(s => this.settings = s);
  }

  async updateSetting(key: keyof AppSettings, value: any) {
    const platform = Capacitor.getPlatform();

    // Solicitar permisos si se activan funcionalidades que los requieren
    if (value === true) {
      if (key === 'proximityNotifications') {
        if (platform !== 'web') {
          await LocalNotifications.requestPermissions();
        } else if ('Notification' in window) {
          await Notification.requestPermission();
        }
      } else if (key === 'showDistance') {
        if (platform !== 'web') {
          await Geolocation.requestPermissions();
        }
      }
    }
    
    this.settingsService.updateSettings({ [key]: value });
  }

  restoreDefaults() {
    localStorage.removeItem('bcn_adventure_settings');
    window.location.reload();
  }
}
