import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonIcon, IonButton, IonButtons, IonMenuButton, IonProgressBar, IonBadge, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  library, business, book, fastFood, skull, videocam, map,
  settingsOutline, restaurant, trophyOutline, starOutline, personCircleOutline
} from 'ionicons/icons';
import { DataService } from '../services/data.service';
import { UserProgressService } from '../services/user-progress.service';

interface ThemeDisplay {
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
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon,
    IonButton, IonButtons, RouterModule, IonMenuButton,
    IonProgressBar, IonBadge, IonLabel
  ],
})
export class HomePage implements OnInit {
  private router = inject(Router);
  private dataService = inject(DataService);
  public userProgressService = inject(UserProgressService);

  themes: ThemeDisplay[] = [];

  constructor() {
    addIcons({
      library, business, book, 'fast-food': fastFood, skull,
      videocam, map, settingsOutline, restaurant, trophyOutline,
      starOutline, personCircleOutline
    });
  }

  ngOnInit() {
    this.dataService.getThemes().subscribe(themesData => {
      this.themes = Object.keys(themesData).map(key => ({
        id: key,
        title: themesData[key].title,
        subtitle: themesData[key].subtitle,
        icon: themesData[key].icon,
        color: themesData[key].color
      }));
    });
  }

  selectTheme(theme: ThemeDisplay) {
    this.router.navigate(['/map-selection', theme.id]);
  }
}
