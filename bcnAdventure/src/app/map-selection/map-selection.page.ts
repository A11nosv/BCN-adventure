import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButtons, IonBackButton, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { map, flag, time, book, restaurant, skull, videocam, business } from 'ionicons/icons';

interface MapOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface ThemeInfo {
  title: string;
  color: string;
  maps: MapOption[];
}

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
  
  themeId: string | null = null;
  themeInfo: ThemeInfo | null = null;

  private themeData: Record<string, ThemeInfo> = {
    'historia': {
      title: 'Caminos de Historia',
      color: '#8e44ad',
      maps: [
        { id: 'bakeno', title: 'Bakeno (S. VI - II a.C.)', description: 'Los orígenes íberos de la ciudad', icon: 'time' },
        { id: 'barcino', title: 'Barcino (S. I a.C. - V d.C.)', description: 'La colonia romana y sus murallas', icon: 'flag' },
        { id: 'via-augusta', title: 'Vía Augusta (S. I a.C. - II d.C.)', description: 'El gran camino romano hacia Roma', icon: 'time' },
        { id: 'segadors', title: 'Guerra dels Segadors (1640 - 1652)', description: 'El conflicto del Corpus de Sangre', icon: 'flag' },
        { id: '1714', title: '1714: El Sitio (1713 - 1714)', description: 'La caída de Barcelona y el fin del asedio', icon: 'flag' },
        { id: 'independencia', title: 'Guerra de la Independencia (1808 - 1814)', description: 'La ocupación napoleónica', icon: 'flag' },
        { id: 'rosa-foc', title: 'La Rosa de Fuego (1890 - 1909)', description: 'El auge del anarquismo barcelonés', icon: 'flag' },
        { id: 'setmana-tragica', title: 'Setmana Tràgica (1909)', description: 'Las revueltas populares de julio', icon: 'time' },
        { id: 'guerra-civil', title: 'Guerra Civil (1936 - 1939)', description: 'Refugios antiaéreos y bombardeos', icon: 'flag' },
        { id: 'bcn-92', title: 'Barcelona \'92 (1992)', description: 'El gran cambio de la ciudad olímpica', icon: 'flag' }
      ]
    },
    'arquitectura': {
      title: 'Barcelona Monumental',
      color: '#2980b9',
      maps: [
        { id: 'iglesias-conventos', title: 'Iglesias y Conventos (S. XII - XIV)', description: 'Joyas del románico y gótico catalán', icon: 'business' },
        { id: 'parques-jardines', title: 'Parques y Jardines', description: 'Oasis urbanos y paisajismo histórico', icon: 'business' },
        { id: 'quadrat-or', title: 'El Quadrat d\'Or (1870 - 1900)', description: 'El corazón del Eixample modernista', icon: 'business' },
        { id: 'modernismo', title: 'Modernismo: Más allá de Gaudí', description: 'Palacios y hospitales de la burguesía', icon: 'business' },
        { id: 'modernismo-desconocido', title: 'Modernismo Desconocido', description: 'Tesoros ocultos y fachadas sorprendentes', icon: 'business' },
        { id: 'gaudi', title: 'Antoni Gaudí: El Genio (1883 - 1926)', description: 'Las obras maestras del arquitecto de Dios', icon: 'business' },
        { id: 'gaudi-desconocido', title: 'Gaudí Desconocido', description: 'Obras tempranas y tesoros ocultos del genio', icon: 'business' },
        { id: 'racionalismo', title: 'Racionalismo BCN (1929 - 1936)', description: 'La vanguardia del grupo GATCPAC', icon: 'business' },
        { id: 'mercados-historicos', title: 'Catedrales del Pueblo: Mercados Históricos', description: 'Joyas del hierro y la vida cotidiana', icon: 'business' }
      ]
    },
    'novelas': {
      title: 'BCN de Novela',
      color: '#8e44ad',
      maps: [
        { id: 'catedral-mar', title: 'La Catedral del Mar (S. XIV)', description: 'La Barcelona medieval de Arnau Estanyol', icon: 'book' },
        { id: 'quijote', title: 'Don Quijote en Barcelona (1615)', description: 'El caballero de la triste figura frente al mar', icon: 'book' },
        { id: 'hemingway', title: 'Ernest Hemingway: Crónica de Guerra', description: 'Tras los pasos del corresponsal en la BCN civil', icon: 'book' },
        { id: 'joan-marse', title: 'Joan Marsé: La BCN de Pijoaparte', description: 'Amor y clases sociales entre el Carmel y el Guinardó', icon: 'book' },
        { id: 'rodoreda', title: 'Mercè Rodoreda: El universo de Colometa', description: 'Escenarios de "La plaça del Diamant"', icon: 'book' },
        { id: 'sombra-viento', title: 'La Sombra del Viento', description: 'El Cementerio de los Libros Olvidados', icon: 'book' }
      ]
    },
    'gastronomia': {
      title: 'Mercados y Tapas',
      color: '#c0392b',
      maps: [
        { id: 'born-tapas', title: 'El Born: Tapas y Vinos', description: 'Ruta gastronómica chic', icon: 'restaurant' },
        { id: 'gotic-tabernas', title: 'Gòtic: Tabernas Históricas', description: 'Sabores del pasado', icon: 'restaurant' },
        { id: 'gracia-cocina', title: 'Gràcia: Cocina Creativa', description: 'Barrio bohemio y gourmet', icon: 'restaurant' }
      ]
    },
    'misterios': {
      title: 'Leyendas Urbanas',
      color: '#2c3e50',
      maps: [
        { id: 'inquisicion', title: 'La Inquisición (1487 - 1820)', description: 'La sombra del Santo Oficio en Barcelona', icon: 'skull' },
        { id: 'crimenes-raval', title: 'Crímenes del Raval', description: 'Historias oscuras', icon: 'skull' },
        { id: 'fantasmas-gotic', title: 'Fantasmas del Gòtic', description: 'Presencias espectrales', icon: 'skull' },
        { id: 'masoneria', title: 'Masonería en BCN', description: 'Símbolos ocultos', icon: 'skull' },
        { id: 'montjuic', title: 'Cementerio de Montjuïc', description: 'Arte y silencio', icon: 'skull' },
        { id: 'vampira-raval', title: 'Vampira del Raval', description: 'El mito de Enriqueta Martí', icon: 'skull' }
      ]
    },
    'cine': {
      title: 'BCN de Película',
      color: '#27ae60',
      maps: [
        { id: 'almodovar', title: 'Todo sobre mi madre', description: 'Escenarios de Almodóvar', icon: 'videocam' },
        { id: 'vicky-cristina', title: 'Vicky Cristina Barcelona', description: 'La visión de Woody Allen', icon: 'videocam' },
        { id: 'el-perfume', title: 'El Perfume', description: 'Rodaje en el Laberint d\'Horta', icon: 'videocam' },
        { id: 'casa-papel', title: 'La Casa de Papel', description: 'Localizaciones emblemáticas', icon: 'videocam' },
        { id: 'bcn-set', title: 'BCN Film Set', description: 'Grandes producciones', icon: 'videocam' }
      ]
    }
  };

  private router = inject(Router);

  constructor() {
    addIcons({ map, flag, time, book, restaurant, skull, videocam, business });
  }

  ngOnInit() {
    this.themeId = this.route.snapshot.paramMap.get('themeId');
    if (this.themeId && this.themeData[this.themeId]) {
      this.themeInfo = this.themeData[this.themeId];
    }
  }

  startAdventure(mapId: string) {
    this.router.navigate(['/map-details', this.themeId, mapId]);
  }
}
