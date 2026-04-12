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
        { id: 'guerra-civil', title: 'Guerra Civil (1936 - 1939)', description: 'Refugios antiaéreos y bombardeos', icon: 'flag' }
      ]
    },
    'arquitectura': {
      title: 'Arquitectura y Gaudí',
      color: '#2980b9',
      maps: [
        { id: 'iglesias-conventos', title: 'Iglesias y Conventos (S. XII - XIV)', description: 'Joyas del románico y gótico catalán', icon: 'business' },
        { id: 'quadrat-or', title: 'El Quadrat d\'Or (1870 - 1900)', description: 'El corazón del Eixample modernista', icon: 'business' },
        { id: 'sagrada-familia', title: 'Sagrada Família (1882 - hoy)', description: 'El templo expiatorio en construcción', icon: 'business' },
        { id: 'park-guell', title: 'Park Güell (1900 - 1914)', description: 'Naturaleza y arquitectura', icon: 'business' },
        { id: 'sant-pau', title: 'Hospital de Sant Pau (1902 - 1930)', description: 'La ciudad jardín de Domènech i Montaner', icon: 'business' },
        { id: 'casa-batllo', title: 'Casa Batlló (1904 - 1906)', description: 'La fachada marítima de Gaudí', icon: 'business' },
        { id: 'racionalismo', title: 'Racionalismo BCN (1929 - 1936)', description: 'La vanguardia del grupo GATCPAC', icon: 'business' }
      ]
    },
    'novelas': {
      title: 'Rutas Literarias',
      color: '#d35400',
      maps: [
        { id: 'catedral-mar', title: 'La Catedral del Mar (S. XIV)', description: 'La construcción de Santa María del Mar', icon: 'book' },
        { id: 'don-quijote', title: 'Don Quijote en BCN (1615)', description: 'El caballero de la triste figura en la playa', icon: 'book' },
        { id: 'homenaje-cat', title: 'Homenaje a Cataluña (1936 - 1937)', description: 'La crónica periodística de George Orwell', icon: 'book' },
        { id: 'joan-marse-cai', title: 'Si te dicen que caí (1940 - 1950)', description: 'La dura postguerra de Joan Marsé', icon: 'book' },
        { id: 'nada', title: 'Nada (1940 - 1945)', description: 'La soledad urbana de Carmen Laforet', icon: 'book' },
        { id: 'joan-marse-teresa', title: 'Últimas tardes con Teresa (1956)', description: 'Amor y clases sociales en el Guinardó', icon: 'book' },
        { id: 'sombra-viento', title: 'La Sombra del Viento (1945 - 1966)', description: 'El Cementerio de los Libros Olvidados', icon: 'book' }
      ]
    },
    'gastronomia': {
      title: 'Mercados y Tapas',
      color: '#c0392b',
      maps: [
        { id: 'boqueria', title: 'Mercat de la Boqueria', description: 'Explosión de sabores', icon: 'restaurant' },
        { id: 'sant-antoni', title: 'Mercat de Sant Antoni', description: 'Tradición y modernidad', icon: 'restaurant' },
        { id: 'born-tapas', title: 'El Born: Tapas y Vinos', description: 'Ruta gastronómica chic', icon: 'restaurant' },
        { id: 'gotic-tabernas', title: 'Gòtic: Tabernas Históricas', description: 'Sabores del pasado', icon: 'restaurant' },
        { id: 'gracia-cocina', title: 'Gràcia: Cocina Creativa', description: 'Barrio bohemio y gourmet', icon: 'restaurant' }
      ]
    },
    'misterios': {
      title: 'Leyendas Urbanas',
      color: '#2c3e50',
      maps: [
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
