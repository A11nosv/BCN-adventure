import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonIcon, IonButton, IonCard, IonCardContent, IonProgressBar, IonBadge, IonList, IonItem, IonLabel, IonModal, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, walkOutline, locationOutline, play, bulbOutline, checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline, locate, navigate, chevronDownOutline, chevronUpOutline, playOutline, expandOutline, contractOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

interface Stop {
  id: string;
  title: string;
  hints: string[];
  description: string;
  coords: [number, number];
  info: string;
  theatricalInfo: string;
  imageUrl: string;
}

interface MapDetails {
  title: string;
  duration: string;
  distance: string;
  description: string;
  center: [number, number];
  zoom: number;
  stops: Stop[];
}

@Component({
  selector: 'app-map-details',
  templateUrl: './map-details.page.html',
  styleUrls: ['./map-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonCard,
    IonCardContent,
    IonProgressBar,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonModal,
    IonFab,
    IonFabButton
  ]
})
export class MapDetailsPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  
  themeId: string | null = null;
  mapId: string | null = null;
  details: MapDetails | null = null;
  
  // Game State
  isGameActive = false;
  showDiscoveryModal = false;
  showResolvedList = false;
  isMapExpanded = false;
  currentStopIndex = 0;
  displayStopIndex = 0;
  isViewingHistory = false;
  currentHintIndex = 0;
  resolvedStops: boolean[] = [];
  score = 0;
  maxScorePerStop = 100;
  
  private map!: L.Map;
  private markers: L.Marker[] = [];
  private userMarker: L.Marker | null = null;
  private userCoords: [number, number] | null = null;
  private watchId: string | null = null;

  private routeData: Record<string, MapDetails> = {
    'bakeno': {
      title: 'Bakeno (S. VI - II a.C.)',
      duration: '2h 30min',
      distance: '5.2 km',
      description: 'Viaja a la Barcelona de los íberos. En este recorrido descubrirás los dos núcleos de la antigua Barkeno: el asentamiento sagrado del Monte Taber y el gran centro comercial y de vigilancia en la montaña de Montjuïc. Siente el viento entre las chozas de barro y piedra mientras exploras los vestigios de los antiguos layetanos.',
      center: [41.3750, 2.1700],
      zoom: 14,
      stops: [
        {
          id: 'taber-summit',
          title: 'La Cima del Monte Taber',
          hints: [
            'Busca el punto más alto donde los dioses vigilan el mar.',
            'Cerca de donde cuatro columnas romanas aún se yerguen orgullosas.',
            'Encuentra una placa en el suelo del carrer del Paradís que marca los 16,9 metros sobre el nivel del mar.'
          ],
          description: 'Aquí, en el punto más alto, los layetanos establecieron su mirada sobre el llano.',
          coords: [41.3835, 2.1772],
          info: 'El Monte Taber era el núcleo del asentamiento. Aunque hoy vemos restos romanos, bajo ellos yacen los cimientos de la Barkeno íbera.',
          imageUrl: 'assets/images/bakeno/taber.jpg',
          theatricalInfo: "¡Alto, viajero! Pisáis suelo sagrado. Aquí, donde el Monte Taber besa las nubes, mis antepasados alzaron sus hogares de piedra. Desde esta cima, el humo de nuestros hogares sube directo a los dioses, mientras nuestros ojos vigilan la espuma del mar. ¡Ved cómo el sol ilumina el llano que nos da la vida!"
        },
        {
          id: 'just-pastor',
          title: 'El Taller de Cerámica',
          hints: [
            'Baja hacia la plaza donde los santos mártires tienen su basílica.',
            'Un lugar donde el agua y el barro daban forma a la vida cotidiana.',
            'Plaza de Sant Just, donde las excavaciones revelaron silos de grano e industria íbera.'
          ],
          description: 'Los artesanos íberos trabajaban aquí la arcilla de la tierra.',
          coords: [41.3828, 2.1779],
          info: 'En el subsuelo de la Basílica de los Santos Mártires Justo y Pastor se han hallado los restos más significativos de la industria alfarera de Barkeno.',
          imageUrl: 'assets/images/bakeno/ceramica.jpg',
          theatricalInfo: "¿Oís el crepitar del fuego? Mis manos están manchadas con la sangre de la tierra: el barro rojo. Aquí moldeamos las vasijas que guardarán el vino y el aceite para el invierno. El torno no deja de girar, y el horno devora leña para que nuestra gente nunca carezca de sustento."
        },
        {
          id: 'placa-nova',
          title: 'La Puerta del Llano',
          hints: [
            'Ve hacia la gran catedral, pero quédate donde las torres vigilan la entrada.',
            'Donde hoy ves letras gigantes que deletrean el nombre de la colonia romana.',
            'Plaza Nova, el límite donde el monte se encuentra con el antiguo llano.'
          ],
          description: 'Aquí terminaba la protección del monte y comenzaban los campos de cultivo.',
          coords: [41.3845, 2.1754],
          info: 'Aunque las torres actuales son romanas, este paso natural ya era utilizado por los íberos para acceder a la zona agrícola del llano de Barcelona.',
          imageUrl: 'assets/images/bakeno/puerta.jpg',
          theatricalInfo: "Mirad hacia el valle. Por este paso cruzan los carros cargados con el trigo de las llanuras. Es la frontera entre la seguridad de nuestras murallas y la inmensidad de los campos. Aquí intercambiamos pieles por sal, y noticias por promesas de lluvia."
        },
        {
          id: 'montjuic-silos',
          title: 'Los Silos del Morrot',
          hints: [
            'Desplázate hacia la montaña que mira al puerto, donde se guardaba el tesoro dorado de la tierra.',
            'En la ladera que hoy domina el Morrot, se excavaron más de 80 pozos de almacenaje.',
            'Busca la vertiente este de Montjuïc, donde los íberos comerciaban con los griegos.'
          ],
          description: 'El gran almacén de Barkeno. Aquí se guardaba el excedente de grano para exportar por todo el Mediterráneo.',
          coords: [41.3650, 2.1650],
          info: 'Los silos de Montjuïc demuestran que Barkeno no era solo un poblado, sino un potente centro comercial conectado con las rutas del Mediterráneo.',
          imageUrl: 'assets/images/bakeno/silos.jpg',
          theatricalInfo: "¡Mirad estas profundidades! Son las entrañas de la montaña, donde guardamos el sol convertido en grano. Los grandes barcos de tierras lejanas, tripulados por hombres de lenguas extrañas, vienen buscando este tesoro. ¡Nadie en el Mediterráneo tiene un grano tan rubio como el de los campos de Barkeno!"
        },
        {
          id: 'montjuic-poblado',
          title: 'El Poblado de la Cumbre',
          hints: [
            'Sube hasta lo más alto de la montaña del rayo.',
            'Bajo los muros del actual castillo, duermen los restos del poblado que controlaba la costa.',
            'Encuentra el emplazamiento del antiguo poblado íbero junto al foso del Castillo de Montjuïc.'
          ],
          description: 'Desde esta posición privilegiada, los layetanos controlaban el acceso por mar y la desembocadura del Llobregat.',
          coords: [41.3630, 2.1660],
          info: 'Este poblado en la cima era el punto estratégico de vigilancia más importante de la zona antes de la fundación de la ciudad romana.',
          imageUrl: 'assets/images/bakeno/castillo.jpg',
          theatricalInfo: "Desde este nido de águilas, nada escapa a nuestra vista. Ni el bajel extranjero que asoma por el horizonte, ni el guerrero que cruza el gran río Llobregat. Somos los guardianes de la costa, los señores del rayo de Montjuïc. Mientras nosotros vigilemos, Barkeno dormirá tranquila."
        }
      ]
    }
  };

  constructor() {
    addIcons({ timeOutline, walkOutline, locationOutline, play, bulbOutline, checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline, locate, navigate, chevronDownOutline, chevronUpOutline, playOutline, expandOutline, contractOutline });
  }

  ngOnInit() {
    this.themeId = this.route.snapshot.paramMap.get('themeId');
    this.mapId = this.route.snapshot.paramMap.get('mapId');
    
    if (this.mapId && this.routeData[this.mapId]) {
      this.details = this.routeData[this.mapId];
      this.resolvedStops = new Array(this.details.stops.length).fill(false);
    }
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
      this.details.stops.forEach((stop, index) => {
        if (this.resolvedStops[index]) {
          const marker = L.marker(stop.coords)
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
    this.isGameActive = true;
    this.currentStopIndex = 0;
    this.currentHintIndex = 0;
    this.score = 0;
    if (!this.watchId) {
      this.startTracking();
    }
  }

  useHint() {
    if (this.currentHintIndex < 2) {
      this.currentHintIndex++;
    }
  }

  private async startTracking() {
    const hasPermission = await Geolocation.requestPermissions();
    if (hasPermission.location !== 'granted') return;

    this.watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 10000
    }, (position) => {
      if (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.updateUserMarker(lat, lng);
        this.checkProximity(lat, lng);
      }
    });
  }

  private updateUserMarker(lat: number, lng: number) {
    this.userCoords = [lat, lng];
    if (!this.map) return;

    if (!this.userMarker) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div class="pulse-container"><div class="pulse-dot"></div><div class="pulse-ring"></div></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
    } else {
      this.userMarker.setLatLng([lat, lng]);
    }
  }

  centerOnUser() {
    if (!this.map) return;

    const points: L.LatLng[] = [];
    
    // Añadir ubicación del usuario
    if (this.userCoords) {
      points.push(L.latLng(this.userCoords[0], this.userCoords[1]));
    }

    // Añadir todas las paradas ya descubiertas
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

  private checkProximity(lat: number, lng: number) {
    if (!this.isGameActive || !this.details) return;
    const target = this.details.stops[this.currentStopIndex];
    const distance = this.calculateDistance(lat, lng, target.coords[0], target.coords[1]);
    if (distance < 0.03) {
      this.resolveCurrentStop();
    }
  }

  private resolveCurrentStop() {
    if (this.resolvedStops[this.currentStopIndex]) return;
    this.resolvedStops[this.currentStopIndex] = true;
    const stopScore = this.maxScorePerStop - (this.currentHintIndex * 35);
    this.score += stopScore;
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
    this.showDiscoveryModal = false;
    if (!this.isViewingHistory) {
      if (this.currentStopIndex < (this.details?.stops.length || 0) - 1) {
        this.currentStopIndex++;
        this.currentHintIndex = 0;
      } else {
        this.finishRoute();
      }
    }
  }

  private finishRoute() {
    this.isGameActive = false;
    this.stopTracking();
    alert(`¡Felicidades! Has completado la ruta de Bakeno.\nTu puntuación final es: ${this.score}`);
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
}
