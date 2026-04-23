import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle, MenuController, IonButtons, IonButton, Platform, ToastController } from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { SettingsService } from './services/settings.service';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, settingsOutline, informationCircleOutline, closeOutline, wifiOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle, RouterModule, IonButtons, IonButton],
})
export class AppComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private platform = inject(Platform);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ homeOutline, settingsOutline, informationCircleOutline, closeOutline, wifiOutline, alertCircleOutline });
  }

  ngOnInit() {
    // Escuchar el botón de atrás del sistema (gesto de retroceso en TalkBack/VoiceOver)
    this.platform.backButton.subscribeWithPriority(10, async () => {
      if (await this.menuCtrl.isOpen()) {
        this.menuCtrl.close();
      }
    });

    // Estado de red
    window.addEventListener('offline', () => this.showNetworkStatus(false));
    window.addEventListener('online', () => this.showNetworkStatus(true));

    // Aplicar ajustes iniciales y suscribirse a cambios
    this.settingsService.settings$.subscribe(settings => {
      this.applySettings(settings);
    });

    // Atajos de teclado
    window.addEventListener('keydown', (event) => {
      // Ctrl + Shift + 1 -> Home
      // Ctrl + Shift + 2 -> Settings
      if (event.ctrlKey && event.shiftKey) {
        if (event.key === '1') {
          this.router.navigate(['/home']);
        } else if (event.key === '2') {
          this.router.navigate(['/settings']);
        }
      }
      
      // Shift + O -> Toggle Menu
      if (event.shiftKey && event.key.toUpperCase() === 'O') {
        this.menuCtrl.toggle();
      }
    });

    // Añadimos un pequeño retardo para asegurar que el motor del navegador y 
    // los plugins estén listos antes de lanzar diálogos de permisos.
    setTimeout(() => {
      this.requestInitialPermissions();
    }, 1000);
  }

  private applySettings(settings: any) {
    const root = document.documentElement;
    
    // Aplicar Tema de Color
    document.body.classList.remove('theme-blue', 'theme-gold', 'theme-dark', 'theme-system');
    document.body.classList.add(`theme-${settings.colorTheme}`);

    // Accesibilidad
    const fontMap: Record<string, string> = {
      'system': 'var(--ion-default-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)',
      'sans-serif': 'sans-serif',
      'serif': 'serif',
      'monospace': 'monospace'
    };

    const selectedFont = fontMap[settings.fontFamily] || fontMap['system'];

    root.style.setProperty('--app-font-size-multiplier', settings.fontSizeMultiplier.toString());
    root.style.setProperty('--app-font-family', selectedFont);
    root.style.setProperty('--ion-font-family', selectedFont); 
    root.style.setProperty('--app-line-height', settings.lineHeight.toString());
    root.style.setProperty('--app-text-align', settings.textAlign);
    
    // Aplicar a nivel global de CSS
    document.body.style.fontFamily = selectedFont;
    document.body.style.textAlign = settings.textAlign;
  }

  async requestInitialPermissions() {
    const platform = Capacitor.getPlatform();

    try {
      // Permisos de GPS
      if (platform !== 'web') {
        await Geolocation.requestPermissions();
      }
      
      // Permisos de Notificaciones
      if (platform !== 'web') {
        await LocalNotifications.requestPermissions();
      } else if ('Notification' in window && Notification.permission === 'default') {
        // En web, solo pedimos si no ha sido denegado o aceptado antes
        await Notification.requestPermission();
      }
    } catch (error) {
      console.log('Permisos: Solicitud inicial omitida o manejada por el navegador.');
    }
  }

  private async showNetworkStatus(isOnline: boolean) {
    const toast = await this.toastCtrl.create({
      message: isOnline ? 'Conexión restablecida' : 'Sin conexión a internet. El modo offline está activo.',
      duration: 3000,
      position: 'bottom',
      color: isOnline ? 'success' : 'warning',
      buttons: [{ icon: isOnline ? 'wifi-outline' : 'alert-circle-outline', side: 'start' }]
    });
    await toast.present();
  }
}
