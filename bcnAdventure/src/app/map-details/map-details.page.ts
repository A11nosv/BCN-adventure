import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonIcon, IonButton, IonCard, IonCardContent, IonProgressBar, IonBadge, IonList, IonItem, IonLabel, IonModal, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, walkOutline, locationOutline, play, bulbOutline, checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline, locate, navigate, chevronDownOutline, chevronUpOutline, playOutline, expandOutline, contractOutline, cashOutline, time } from 'ionicons/icons';
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
  museumInfo?: {
    prices: string;
    note: string;
  };
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
      description: 'Descubre los orígenes layetanos de Barcelona entre el Monte Taber y Montjuïc.',
      center: [41.3750, 2.1700],
      zoom: 14,
      stops: [
        {
          id: 'taber-summit',
          title: 'La Cima del Monte Taber',
          hints: ['Lleva tu ofrenda a la morada de los dioses layetanos, el lugar donde el humo de nuestros hogares toca el cielo.', 'Busca la cima de la colina donde los sacerdotes vigilan la salida del sol sobre el mar.', 'Sube hasta el Carrer del Paradís y busca la placa que marca los 16,9 metros de altitud.'],
          description: 'Núcleo sagrado layetano.',
          coords: [41.3835, 2.1772],
          info: 'Bajo el foro romano yacen los cimientos de la Barkeno íbera.',
          imageUrl: 'assets/images/bakeno/taber.jpg',
          theatricalInfo: "¡Alto, viajero! Pisáis suelo sagrado. Aquí nuestros antepasados alzaron sus hogares de piedra para estar cerca de los dioses."
        },
        {
          id: 'just-pastor',
          title: 'El Taller de Cerámica',
          hints: ['¿Dónde se moldea el barro de la tierra para guardar nuestro vino y nuestro aceite?', 'Baja hacia el lugar donde los artesanos cuecen sus vasijas cerca de la fuente de agua dulce.', 'Dirígete a la Plaza de Sant Just, donde las excavaciones revelaron los antiguos silos alfareros.'],
          description: 'Artesanía íbera.',
          coords: [41.3828, 2.1779],
          info: 'Restos de industria alfarera hallados bajo la basílica de Sant Just.',
          imageUrl: 'assets/images/bakeno/ceramica.jpg',
          theatricalInfo: "¿Oís el crepitar del fuego? Moldeamos las vasijas que guardarán nuestra riqueza."
        },
        {
          id: 'placa-nova',
          title: 'La Puerta del Llano',
          hints: ['Cruza el paso donde terminan las cabañas y comienzan los campos de trigo de la llanura.', 'Busca la frontera natural donde los pastores traen sus rebaños antes de entrar al recinto sagrado.', 'Ve a la Plaza Nova, allí donde las torres romanas se alzaron siglos después sobre nuestro camino.'],
          description: 'Acceso a los campos.',
          coords: [41.3845, 2.1754],
          info: 'Paso natural utilizado desde época íbera.',
          imageUrl: 'assets/images/bakeno/puerta.jpg',
          theatricalInfo: "Mirad hacia el valle. Por aquí cruzan los carros con el trigo de las llanuras."
        },
        {
          id: 'montjuic-silos',
          title: 'Los Silos del Morrot',
          hints: ['Ve al gran almacén del sol, el lugar donde guardamos el tesoro que vendemos a los barcos extranjeros.', 'Busca la ladera que domina el puerto natural, excavada con decenas de pozos circulares.', 'Encuentra la zona del Morrot en la ladera este de la montaña de Montjuïc.'],
          description: 'El gran almacén.',
          coords: [41.3650, 2.1650],
          info: 'Centro comercial conectado con las rutas del Mediterráneo.',
          imageUrl: 'assets/images/bakeno/silos.jpg',
          theatricalInfo: "¡Entrañas de la montaña! Guardamos el sol convertido en grano para los barcos lejanos."
        },
        {
          id: 'montjuic-poblado',
          title: 'El Poblado de la Cumbre',
          hints: ['¿Quién vigila los rayos que caen sobre la montaña y los barcos que asoman por el horizonte?', 'Sube al puesto de guardia más alto, el nido que domina la desembocadura del gran río.', 'Alcanza la cima de Montjuïc, junto a los muros del actual Castillo.'],
          description: 'Punto estratégico.',
          coords: [41.3630, 2.1660],
          info: 'Punto de vigilancia más importante antes de la fundación de la ciudad romana.',
          imageUrl: 'assets/images/bakeno/castillo.jpg',
          theatricalInfo: "Desde este nido de águilas, nada escapa a nuestra vista. Somos los guardianes de Barkeno."
        }
      ]
    },
    'via-augusta': {
      title: 'Vía Augusta: El Camino a Roma (S. I a.C. - II d.C.)',
      duration: '2h 15min',
      distance: '4.8 km',
      description: 'Recorre la calzada más importante del Imperio en Hispania. Desde los miliarios que marcaban la distancia a la Ciudad Eterna hasta el eje principal que cruzaba Barcino.',
      center: [41.4000, 2.1800],
      zoom: 14,
      stops: [
        {
          id: 'miliario',
          title: "El Miliario: La Distancia a Roma",
          hints: [
            "Busca la piedra sagrada que marca tu distancia a la Ciudad Eterna, allí donde los viajeros cuentan sus pasos antes de la última jornada.",
            "Encuentra la columna de piedra que indica mil pasos romanos desde la última posta en el camino del norte.",
            "Dirígete a la zona de la Sagrera, donde se hallaron los miliarios que guiaban a las legiones hacia Barcino."
          ],
          description: "Marcador de distancia romano.",
          coords: [41.4225, 2.1915],
          info: "Los miliarios eran columnas de piedra de unos 2 metros que se colocaban cada milla romana (1.481 metros) para indicar la distancia.",
          imageUrl: "assets/images/via-augusta/miliario.jpg",
          theatricalInfo: "¡Fatigado viajero! Mira este bloque de piedra. Rezuma el polvo de mil caminos. Aquí dice que Roma está lejos, pero Barcino ya asoma en el horizonte. ¿Sientes el orgullo de pisar la calzada que une el mundo?"
        },
        {
          id: 'villas',
          title: "El Llano de las Villas",
          hints: [
            "Camina por el llano fértil donde las villas producen el vino que viaja por todo el imperio en ánforas de barro.",
            "Atraviesa los campos que suministran el grano a la colonia antes de llegar a la seguridad de sus murallas.",
            "Ve hacia la zona del Clot, siguiendo el trazado recto del antiguo camino romano hacia el centro."
          ],
          description: "Zona agrícola de la colonia.",
          coords: [41.4080, 2.1880],
          info: "Alrededor de la Vía Augusta se situaban numerosas villas romanas dedicadas a la producción de vino y aceite.",
          imageUrl: "assets/images/via-augusta/villas.jpg",
          theatricalInfo: "Huele el mosto fermentando. A ambos lados del camino, los esclavos trabajan las vides de los nobles patricios. Esta tierra es generosa; el vino de Barcino se beberá en las mesas de la mismísima Roma."
        },
        {
          id: 'portal-angel',
          title: "Portal de Roma",
          hints: [
            "Llegas ante el paso que guarda el camino del norte. ¿Por qué lugar entrarás al llano de la ciudad amurallada si vienes de las Galias?",
            "Busca el punto donde la gran vía se estrecha para enfilar la puerta principal de la muralla.",
            "Ve a la zona del Portal de l'Àngel, la entrada histórica construida sobre el trazado de la Vía Augusta."
          ],
          description: "Entrada a la llanura urbana.",
          coords: [41.3855, 2.1745],
          info: "El trazado de la Vía Augusta coincide en gran medida con el actual Portal de l'Àngel antes de entrar en la ciudad amurallada.",
          imageUrl: "assets/images/via-augusta/portal.jpg",
          theatricalInfo: "¡Deteneos! Ajustad vuestras túnicas. Ante vosotros se abre el llano que conduce a la ciudad. Por aquí pasan embajadores, soldados y mercaderes. Es el umbral de la civilización tras el largo viaje."
        },
        {
          id: 'decumanus',
          title: "El Decumanus Maximus",
          hints: [
            "Cruza el eje del mundo de la colonia, la columna vertebral donde el sol sigue tus pasos de este a oeste.",
            "Camina por la calle principal que une la puerta de tierra con la puerta del mar.",
            "Recorre el Carrer del Bisbe, el tramo de la Vía Augusta que atraviesa el corazón del Barrio Gótico."
          ],
          description: "La calle principal de Barcino.",
          coords: [41.3830, 2.1765],
          info: "El Decumanus Maximus era la calle principal que cruzaba la ciudad de este a oeste, formando parte de la Vía Augusta.",
          imageUrl: "assets/images/via-augusta/decumanus.jpg",
          theatricalInfo: "Estás en el corazón de Barcino. Bajo estas piedras, la Vía Augusta se vuelve majestuosa. Mira a tu alrededor: el Foro está cerca y el poder de Roma se siente en cada sillar."
        },
        {
          id: 'exit-tarraco',
          title: "Hacia la Capital: Vía a Tarraco",
          hints: [
            "Tu viaje sigue hacia la gran capital de la provincia. Sal por el portal del oeste para encontrarte con el camino a Tarraco.",
            "Busca la salida donde los mercaderes vocean sus productos junto al mercado antes de abandonar los muros.",
            "Dirígete al Carrer de la Boqueria, la histórica vía de salida hacia el sur del Imperio."
          ],
          description: "Salida sur de la ciudad.",
          coords: [41.3815, 2.1725],
          info: "Desde esta puerta, la Vía Augusta continuaba su largo recorrido hacia Tarraco (Tarragona) y finalmente hasta Gades (Cádiz).",
          imageUrl: "assets/images/via-augusta/salida.jpg",
          theatricalInfo: "El camino no termina, solo cambia de paisaje. Sales de Barcino dejando atrás sus muros, pero la Vía Augusta te llevará seguro hasta Tarraco. ¡Que los dioses guíen tus pasos en la calzada eterna!"
        }
      ]
    },
    'barcino': {
      title: 'Barcino: El Camino de Roma',
      duration: '2h 30min',
      distance: '4.2 km',
      description: 'Entra en la colonia Julia Augusta Faventia Paterna Barcino como un ciudadano romano.',
      center: [41.3840, 2.1750],
      zoom: 16,
      stops: [
        {
          id: 'maritima',
          title: "Puerta del Mar y Termas Portuarias",
          hints: ['Acabas de desembarcar de un gran birreme cargado de ánforas. ¿Dónde irías a lavarte el salitre antes de entrar en la colonia?', 'Busca la entrada sur, el lugar donde las mercancías del imperio entran a través de torres defensivas.', 'Ve al Carrer de Regomir, donde los restos del Pati Llimona guardan la puerta marítima.'],
          description: "La gran entrada comercial.",
          coords: [41.3815, 2.1795],
          info: "La Puerta de Mar era la más transitada de la colonia.",
          imageUrl: "assets/images/barcino/puerta_mar.jpg",
          theatricalInfo: "¡Salve! Acabáis de desembarcar en la perla del Mediterráneo. Lavad vuestras deudas y el salitre en nuestras termas antes de subir al Foro."
        },
        {
          id: 'necropolis',
          title: "Cementerio Romano (Vía Sepulcral)",
          hints: ['Los ciudadanos de Barcino descansan fuera de los muros. Ve a presentar tus respetos a los antepasados para que te den su bendición.', 'Busca el lugar donde las estelas de piedra se alinean junto al camino de salida hacia el norte.', 'Dirígete a la Plaza de la Vila de Madrid, cerca de la calle Canuda.'],
          description: "Descanso de los ciudadanos.",
          coords: [41.3848, 2.1725],
          info: "Necrópolis de los siglos II y III situada junto a una vía de salida de la ciudad.",
          imageUrl: "assets/images/barcino/necropolis.jpg",
          theatricalInfo: "Caminad con respeto. Aquí descansan nuestros padres, fuera de la muralla pero bajo el sol de Roma."
        },
        {
          id: 'acueducto',
          title: "El Acueducto (Plaza de los Arcos)",
          hints: ['Sigue el rastro de la serpiente de piedra que trae el agua pura desde los montes lejanos.', 'Busca los arcos gigantes que alimentan nuestras fuentes y termas extramuros.', 'Encuentra la Plaza de los Arcos, frente a la fachada de la actual Catedral.'],
          description: "Ingeniería hidráulica.",
          coords: [41.3848, 2.1758],
          info: "Recreación de un tramo de acueducto que traía agua desde Collserola.",
          imageUrl: "assets/images/barcino/aqueducte.jpg",
          theatricalInfo: "¡Ved el ingenio de nuestros ingenieros! El agua pura viaja por el aire sobre estos arcos."
        },
        {
          id: 'puerta-nova',
          title: "Puerta Romana (Plaza Nova)",
          hints: ['Entra triunfante por la puerta principal de la colonia, custodiada por los centuriones que vigilan el llano.', 'Busca las dos grandes torres cilíndricas que vigilan el camino hacia los campos agrícolas.', 'Ve a la Plaza Nova, donde las letras gigantes de BARCINO te darán la bienvenida.'],
          description: "La gran muralla.",
          coords: [41.3845, 2.1754],
          info: "Puerta praetoria de la ciudad, protegida por torres cilíndricas.",
          imageUrl: "assets/images/barcino/muralla.jpg",
          theatricalInfo: "¡Deteneos ante estas torres! Son el cinturón de piedra de Barcino."
        },
        {
          id: 'domus-honorat',
          title: "Domus de Sant Honorat",
          hints: ['Un rico patricio te invita a su mansión para admirar sus nuevos mosaicos y fuentes privadas lejos del ruido callejero.', 'Busca la residencia más lujosa situada justo detrás del centro de mando de la colonia.', 'Encuentra el Carrer de Sant Honorat, junto al Palau de la Generalitat.'],
          description: "Vivienda patricia.",
          coords: [41.3828, 2.1765],
          info: "Restos de una gran casa patricia con impresionantes mosaicos.",
          imageUrl: "assets/images/barcino/domus.jpg",
          theatricalInfo: "Bienvenidos a mi domus. Pasad al peristilo y dejad que el frescor de la fuente os alivie."
        },
        {
          id: 'foro',
          title: "El Foro (Plaça Sant Jaume)",
          hints: ['Es hora de votar en la Curia y escuchar los pleitos en la Basílica. ¡Al centro de la ciudad donde late la vida pública!', 'Ve al cruce del Cardo y el Decumanus, donde el mercado y la política se mezclan bajo las arcadas.', 'Dirígete a la Plaza Sant Jaume, el corazón administrativo de Barcelona.'],
          description: "Corazón de la colonia.",
          coords: [41.3828, 2.1770],
          info: "Centro administrativo y comercial de Barcino.",
          imageUrl: "assets/images/barcino/foro.jpg",
          theatricalInfo: "¡Escuchad el bullicio! Aquí late la vida de Roma en Hispania."
        },
        {
          id: 'taberna',
          title: "Taberna de Barcino: El Sabor de Roma",
          hints: ['¿Tienes sed tras tanto caminar? Busca el mulsum más dulce y el garum más sabroso para reponer fuerzas.', 'Busca el local abierto a la calle donde los soldados romanos brindan por la salud del César.', 'Ve al carrer de la Llibreteria, a pocos pasos de la plaza del gobierno.'],
          description: "Vida social y gastronomía.",
          coords: [41.3832, 2.1775],
          info: "Las tabernas servían comida rápida y vino.",
          imageUrl: "assets/images/barcino/taberna.jpg",
          theatricalInfo: "¡Pasad, pasad! No todo es política. Mi vino mulsum os devolverá las fuerzas."
        },
        {
          id: 'templo',
          title: "Templo de Augusto",
          hints: ['Ves a adorar al Divino Augusto, el primer emperador, en el santuario más sagrado de toda la colonia.', 'Busca las cuatro columnas que tocan el cielo en el punto más elevado de la colina sagrada.', 'Entra en el Carrer del Paradís número 10.'],
          description: "Culto imperial.",
          coords: [41.3835, 2.1772],
          info: "Templo dedicado al culto de Augusto en la cima del Mons Taber.",
          imageUrl: "assets/images/barcino/temple.jpg",
          theatricalInfo: "Estamos ante la gloria de Roma. Estas columnas tocan el cielo."
        },
        {
          id: 'muhba',
          title: "MUHBA: El Subsuelo de Barcino",
          hints: ['La ciudad real ha quedado sepultada bajo tus pies. Busca el portal para descender a las calles originales de piedra.', 'Ve a la antigua zona de palacios reales donde hoy puedes bajar al nivel del siglo I.', 'Termina tu viaje en la Plaza del Rei, en la entrada del Museo de Historia de Barcelona.'],
          description: "Viaje al pasado.",
          coords: [41.3840, 2.1775],
          info: "Museo que permite caminar por las calles originales de Barcino.",
          imageUrl: "assets/images/barcino/muhba.jpg",
          theatricalInfo: "Vuestro viaje termina bajando al pasado. ¡Descended a las tinieblas de la historia!",
          museumInfo: {
            prices: "Entrada General: 7,00 € | Reducida: 5,00 €",
            note: "Gratis: Domingos a partir de las 15:00h y primer domingo de mes."
          }
        }
      ]
    }
  };

  constructor() {
    addIcons({ timeOutline, walkOutline, locationOutline, play, bulbOutline, checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline, locate, navigate, chevronDownOutline, chevronUpOutline, playOutline, expandOutline, contractOutline, cashOutline, time });
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
}
