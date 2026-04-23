import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonModal, IonList, IonItem, IonLabel, IonBadge, IonFab, IonFabButton,
  IonProgressBar, IonFooter, IonTextarea, IonSpinner, IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline, walkOutline, locationOutline, play, bulbOutline,
  checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline,
  locate, navigate, chevronDownOutline, chevronUpOutline, playOutline,
  expandOutline, contractOutline, cashOutline, time, navigateOutline,
  chatbubbleEllipsesOutline, sendOutline, personOutline, starOutline,
  alertCircleOutline, downloadOutline, cloudDownloadOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { SettingsService } from '../services/settings.service';
import { DataService, MapDetails } from '../services/data.service';
import { GeminiService } from '../services/gemini.service';
import { UserProgressService } from '../services/user-progress.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-map-details',
  templateUrl: './map-details.page.html',
  styleUrls: ['./map-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonModal, IonList, IonItem, IonLabel,
    IonBadge, IonFab, IonFabButton, IonProgressBar, IonFooter,
    IonTextarea, IonSpinner, IonChip
  ]
})
export class MapDetailsPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private geminiService = inject(GeminiService);
  public userProgressService = inject(UserProgressService);
  public settingsService = inject(SettingsService);
  private httpClient = inject(HttpClient);
  
  themeId: string | null = null;
  mapId: string | null = null;
  details: MapDetails | null = null;
  
  // Estado del juego
  isGameActive = false;
  currentStopIndex = 0;
  currentHintIndex = 0;
  score = 0;
  resolvedStops: boolean[] = [];
  maxScorePerStop = 100;
  
  // Chat con Gemini
  showChatModal = false;
  chatMessages: ChatMessage[] = [];
  userQuestion = '';
  isAssistantLoading = false;

  // Mapa
  private map!: L.Map;
  private markers: L.Marker[] = [];
  private userMarker: L.Marker | null = null;
  private watchId: string | null = null;
  userCoords: [number, number] | null = null;
  distanceToNextStop: string = '---';
  isMapExpanded = false;
  private notifiedDistances: Set<number> = new Set();
  
  // Modales y UI
  showDiscoveryModal = false;
  displayStopIndex = 0;
  isViewingHistory = false;
  showResolvedList = false;

  // Quiz
  showQuizModal = false;
  selectedQuizOption: number | null = null;
  quizResult: 'correct' | 'wrong' | null = null;
  
  // Routing
  private routePolyline: L.Polyline | null = null;
  private targetMarker: L.Marker | null = null;
  isRoutingActive = false;
  routingDirections: string[] = [];
  showRoutingPanel = false;
  private isLocationRevealed = false;

  // Offline
  isDownloading = false;
  isDownloaded = false;
  downloadProgress = 0;
  
  constructor() {
    addIcons({
      timeOutline, walkOutline, locationOutline, play, bulbOutline,
      checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline,
      locate, navigate, chevronDownOutline, chevronUpOutline, playOutline,
      expandOutline, contractOutline, cashOutline, time, navigateOutline,
      chatbubbleEllipsesOutline, sendOutline, personOutline, starOutline,
      alertCircleOutline, downloadOutline, cloudDownloadOutline, checkmarkCircleOutline
    });
  }

  ngOnInit() {
    this.themeId = this.route.snapshot.paramMap.get('themeId');
    this.mapId = this.route.snapshot.paramMap.get('mapId');
    
    if (this.mapId) {
      this.isDownloaded = localStorage.getItem(`downloaded_${this.mapId}`) === 'true';
    }

    if (this.themeId && this.mapId) {
      this.dataService.getRouteDetails(this.themeId, this.mapId).subscribe(details => {
        if (details) {
          this.details = details;
          this.resolvedStops = new Array(this.details.stops.length).fill(false);
          
          // Mensaje de bienvenida del guía
          this.chatMessages.push({
            role: 'assistant',
            text: `¡Hola! Soy tu guía para la ruta "${this.details.title}". ¿En qué puedo ayudarte hoy?`,
            timestamp: new Date()
          });
        }
      });
    }
  }

  async downloadForOffline() {
    if (!this.details || !this.mapId) return;

    this.isDownloading = true;
    this.downloadProgress = 0;

    const assetsToDownload = [
      `assets/data/${this.themeId}.json`,
      `assets/data/themes.json`,
      ...this.details.stops.map(s => s.imageUrl)
    ];

    let downloadedCount = 0;
    const totalAssets = assetsToDownload.length;

    try {
      for (const assetUrl of assetsToDownload) {
        await fetch(assetUrl).catch(err => console.warn(`Error pre-caching ${assetUrl}`, err));
        downloadedCount++;
        this.downloadProgress = downloadedCount / totalAssets;
      }

      // Pre-cache some map tiles
      const center = this.details.center;
      const zooms = [this.details.zoom, this.details.zoom + 1];
      for (const z of zooms) {
        const x = Math.floor((center[1] + 180) / 360 * Math.pow(2, z));
        const y = Math.floor((1 - Math.log(Math.tan(center[0] * Math.PI / 180) + 1 / Math.cos(center[0] * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const tileUrl = `https://a.tile.openstreetmap.org/${z}/${x + dx}/${y + dy}.png`;
            await fetch(tileUrl).catch(() => {});
          }
        }
      }

      this.isDownloaded = true;
      localStorage.setItem(`downloaded_${this.mapId}`, 'true');
    } catch (error) {
      console.error('Error during offline download:', error);
    } finally {
      this.isDownloading = false;
    }
  }

  useHint() {
    if (this.currentHintIndex < 2) {
      const stop = this.details?.stops[this.currentStopIndex];
      if ((stop as any).quiz && this.currentHintIndex === 0) {
        this.showQuizModal = true;
      } else {
        this.currentHintIndex++;
      }
    }
  }

  async answerQuiz() {
    if (this.selectedQuizOption === null || !this.details) return;

    const stop = this.details.stops[this.currentStopIndex] as any;
    if (this.selectedQuizOption === stop.quiz.correctOptionIndex) {
      this.quizResult = 'correct';
      await this.userProgressService.addXP(100);
      setTimeout(() => {
        this.currentHintIndex++;
        this.closeQuiz();
      }, 1500);
    } else {
      this.quizResult = 'wrong';
      setTimeout(() => {
        this.quizResult = null;
        this.selectedQuizOption = null;
      }, 1500);
    }
  }

  closeQuiz() {
    this.showQuizModal = false;
    this.selectedQuizOption = null;
    this.quizResult = null;
  }

  async askGemini() {
    if (!this.userQuestion.trim() || this.isAssistantLoading || !this.details) return;

    const question = this.userQuestion;
    this.chatMessages.push({
      role: 'user',
      text: question,
      timestamp: new Date()
    });
    this.userQuestion = '';
    this.isAssistantLoading = true;

    const context = {
      title: this.details.title,
      description: this.details.description
    };

    const answer = await this.geminiService.getHistoricalResponse(question, context);
    
    this.chatMessages.push({
      role: 'assistant',
      text: answer,
      timestamp: new Date()
    });
    this.isAssistantLoading = false;
  }

  openChat() {
    this.showChatModal = true;
  }

  ionViewDidEnter() {
    this.initMap();
  }

  private initMap() {
    if (this.details) {
      this.map = L.map('map', {
        center: this.details.center,
        zoom: this.details.zoom,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      this.updateMarkers();
      this.startTracking();
    }
  }

  private updateMarkers() {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    if (this.details) {
      const resolvedIcon = L.divIcon({
        className: 'resolved-stop-marker',
        html: `
          <svg width="24" height="34" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.25C12.1005 20.25 9.75 17.8995 9.75 15C9.75 12.1005 12.1005 9.75 15 9.75C17.8995 9.75 20.25 12.1005 20.25 15C20.25 17.8995 17.8995 20.25 15 20.25Z" fill="#2ECC71"/>
          </svg>
        `,
        iconSize: [24, 34],
        iconAnchor: [12, 34],
        popupAnchor: [0, -30]
      });

      this.details.stops.forEach((stop, index) => {
        if (this.resolvedStops[index]) {
          const marker = L.marker(stop.coords, { icon: resolvedIcon })
            .addTo(this.map)
            .bindPopup(`<b>${stop.title}</b><br>${stop.info}`);
          this.markers.push(marker);
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    this.stopTracking();
  }

  async startAdventure() {
    const platform = Capacitor.getPlatform();

    if (platform !== 'web') {
      const geoStatus = await Geolocation.requestPermissions();
      if (geoStatus.location !== 'granted') {
        alert('Se requiere el permiso de ubicación para jugar a BCN Adventure.');
        return;
      }
    }

    if (this.settingsService.currentSettings.proximityNotifications) {
      if (platform !== 'web') {
        const notifyStatus = await LocalNotifications.requestPermissions();
        if (notifyStatus.display !== 'granted') {
          console.warn('El usuario no ha concedido permisos de notificación.');
        }
      } else if ('Notification' in window) {
        await Notification.requestPermission();
      }
    }

    this.isGameActive = true;
    this.currentStopIndex = 0;
    this.currentHintIndex = 0;
    this.score = 0;
    if (!this.watchId) {
      this.startTracking();
    }
  }

  private async startTracking() {
    const platform = Capacitor.getPlatform();
    
    if (platform !== 'web') {
      const hasPermission = await Geolocation.requestPermissions();
      if (hasPermission.location !== 'granted') return;
    }

    this.watchId = (await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 10000
    }, (position) => {
      if (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.updateUserMarker(lat, lng);
        this.checkProximity(lat, lng);
      }
    })).toString();
  }

  private updateUserMarker(lat: number, lng: number) {
    this.userCoords = [lat, lng];
    if (!this.map) return;

    if (!this.userMarker) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="blue-dot-container">
            <div class="blue-dot-pulse"></div>
            <div class="blue-dot"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      this.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(this.map);
    } else {
      this.userMarker.setLatLng([lat, lng]);
    }
  }

  centerOnUser() {
    if (!this.map) return;

    const points: L.LatLng[] = [];
    if (this.userCoords) {
      points.push(L.latLng(this.userCoords[0], this.userCoords[1]));
    }

    if (this.details) {
      this.details.stops.forEach((stop, index) => {
        if (this.resolvedStops[index]) {
          points.push(L.latLng(stop.coords[0], stop.coords[1]));
        }
      });
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else if (points.length === 1) {
      this.map.setView(points[0], 16);
    }
  }

  toggleMapExpansion() {
    this.isMapExpanded = !this.isMapExpanded;
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        if (this.isMapExpanded) {
          this.centerOnUser();
        }
      }
    }, 300);
  }

  private stopTracking() {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }

  private async checkProximity(lat: number, lng: number) {
    if (!this.isGameActive || !this.details) return;
    const target = this.details.stops[this.currentStopIndex];
    const distanceInKm = this.calculateDistance(lat, lng, target.coords[0], target.coords[1]);
    const distanceInM = distanceInKm * 1000;

    if (distanceInM >= 1000) {
      this.distanceToNextStop = `${distanceInKm.toFixed(2)} km`;
    } else {
      this.distanceToNextStop = `${Math.round(distanceInM)} m`;
    }

    if (this.settingsService.currentSettings.proximityNotifications) {
      const thresholds = [200, 100, 50, 25];
      for (const threshold of thresholds) {
        if (distanceInM <= threshold && !this.notifiedDistances.has(threshold)) {
          this.notifiedDistances.add(threshold);
          await LocalNotifications.schedule({
            notifications: [
              {
                title: '¡Te estás acercando!',
                body: `Estás a menos de ${threshold} metros de tu destino: ${target.title}`,
                id: threshold + (this.currentStopIndex * 1000),
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'beep.wav'
              }
            ]
          });
        }
      }
    }

    if (distanceInKm < 0.03) {
      this.resolveCurrentStop();
    }
  }

  private resolveCurrentStop() {
    if (this.resolvedStops[this.currentStopIndex]) return;
    this.resolvedStops[this.currentStopIndex] = true;
    
    const stopScore = this.isLocationRevealed ? 0 : (this.maxScorePerStop - (this.currentHintIndex * 35));
    this.score += stopScore;
    
    this.isLocationRevealed = false;
    this.notifiedDistances.clear();
    this.updateMarkers();
    
    this.displayStopIndex = this.currentStopIndex;
    this.isViewingHistory = false;
    this.showDiscoveryModal = true;
  }

  openStopHistory(index: number) {
    this.displayStopIndex = index;
    this.isViewingHistory = true;
    this.showDiscoveryModal = true;
  }

  toggleResolvedList() {
    this.showResolvedList = !this.showResolvedList;
  }

  get resolvedStopsCount(): number {
    return this.resolvedStops.filter(s => s).length;
  }

  closeDiscovery() {
    if (!this.showDiscoveryModal) return;
    this.showDiscoveryModal = false;
    
    if (!this.isViewingHistory) {
      if (this.currentStopIndex < (this.details?.stops.length || 0) - 1) {
        this.currentStopIndex++;
        this.currentHintIndex = 0;
      } else {
        this.finishRoute();
      }
    }
    this.isViewingHistory = false;
  }

  private finishRoute() {
    this.isGameActive = false;
    this.stopTracking();
    alert(`¡Felicidades! Has completado la ruta de ${this.details?.title}.\nTu puntuación final es: ${this.score}`);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  simulateArrival() {
    this.resolveCurrentStop();
  }

  showLocation() {
    if (!this.details) return;

    const target = this.details.stops[this.currentStopIndex];
    this.isLocationRevealed = true;
    this.isMapExpanded = true;

    setTimeout(() => {
      this.map.invalidateSize();
      this.map.setView(target.coords, 18);
      
      if (this.targetMarker) this.map.removeLayer(this.targetMarker);
      if (this.routePolyline) this.map.removeLayer(this.routePolyline);

      const redDropSvg = `
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.25C12.1005 20.25 9.75 17.8995 9.75 15C9.75 12.1005 12.1005 9.75 15 9.75C17.8995 9.75 20.25 12.1005 20.25 15C20.25 17.8995 17.8995 20.25 15 20.25Z" fill="#EA4335"/>
        </svg>
      `;

      const targetIcon = L.divIcon({
        className: 'custom-target-marker',
        html: redDropSvg,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
      });

      this.targetMarker = L.marker(target.coords, { icon: targetIcon }).addTo(this.map)
        .bindPopup(`<b>Destino: ${target.title}</b>`).openPopup();
    }, 100);
  }

  cancelRouting() {
    this.isRoutingActive = false;
    this.showRoutingPanel = false;
    if (this.routePolyline) this.map.removeLayer(this.routePolyline);
    if (this.targetMarker) this.map.removeLayer(this.targetMarker);
  }
}
