import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonButton, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { library, business, book, fastFood, skull, videocam, map, settingsOutline } from 'ionicons/icons';

interface Theme {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonButton, IonButtons, RouterModule],
  })
export class HomePage {
  private router = inject(Router);

  themes: Theme[] = [
    {
      id: 'historia',
      title: 'Historia',
      subtitle: 'Caminos de Historia',
      icon: 'library',
      color: '#8e44ad'
    },
    {
      id: 'arquitectura',
      title: 'Arquitectura',
      subtitle: 'Modernismo y Gaudí',
      icon: 'business',
      color: '#2980b9'
    },
    {
      id: 'novelas',
      title: 'Novelas',
      subtitle: 'Rutas Literarias',
      icon: 'book',
      color: '#d35400'
    },
    {
      id: 'gastronomia',
      title: 'Gastronomía',
      subtitle: 'Mercados y Tapas',
      icon: 'fast-food',
      color: '#c0392b'
    },
    {
      id: 'misterios',
      title: 'Misterios',
      subtitle: 'Leyendas Urbanas',
      icon: 'skull',
      color: '#2c3e50'
    },
    {
      id: 'cine',
      title: 'Cine y Series',
      subtitle: 'BCN de Película',
      icon: 'videocam',
      color: '#27ae60'
    }
  ];

  constructor() {
    addIcons({ library, business, book, 'fast-food': fastFood, skull, videocam, map, settingsOutline });
  }

  selectTheme(theme: Theme) {
    this.router.navigate(['/map-selection', theme.id]);
  }
}
