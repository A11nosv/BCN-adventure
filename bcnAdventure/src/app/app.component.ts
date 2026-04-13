import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    // Añadimos un pequeño retardo para asegurar que el motor del navegador y 
    // los plugins estén listos antes de lanzar diálogos de permisos.
    setTimeout(() => {
      this.requestInitialPermissions();
    }, 1000);
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
}
