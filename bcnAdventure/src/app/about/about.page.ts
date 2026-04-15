import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonIcon, IonButton, Platform, IonMenuButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { informationCircleOutline, phonePortraitOutline, desktopOutline, refreshOutline, hardwareChipOutline } from 'ionicons/icons';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonIcon, IonButton, IonMenuButton]
})
export class AboutPage implements OnInit {
  private platform = inject(Platform);
  isMobile = false;

  constructor() {
    addIcons({ informationCircleOutline, phonePortraitOutline, desktopOutline, refreshOutline, hardwareChipOutline });
  }

  ngOnInit() {
    this.isMobile = this.platform.is('mobile') || this.platform.is('capacitor');
  }

  async checkForUpdates() {
    // Simulación de comprobación de actualizaciones
    alert('Comprobando actualizaciones... Tu aplicación está al día (Versión 1.0.0).');
  }
}
