import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButtons, IonBackButton, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { map, flag, time, book, restaurant, skull, videocam, business } from 'ionicons/icons';
import { DataService, Theme } from '../services/data.service';

@Component({
  selector: 'app-map-selection',
  templateUrl: './map-selection.page.html',
  styleUrls: ['./map-selection.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonButtons, 
    IonBackButton,
    IonIcon,
    IonBadge
  ]
})
export class MapSelectionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  
  themeId: string | null = null;
  themeInfo: Theme | null = null;

  constructor() {
    addIcons({ map, flag, time, book, restaurant, skull, videocam, business });
  }

  ngOnInit() {
    this.themeId = this.route.snapshot.paramMap.get('themeId');
    if (this.themeId) {
      this.dataService.getTheme(this.themeId).subscribe(theme => {
        if (theme) {
          this.themeInfo = theme;
        }
      });
    }
  }

  startAdventure(mapId: string) {
    this.router.navigate(['/map-details', this.themeId, mapId]);
  }
}
