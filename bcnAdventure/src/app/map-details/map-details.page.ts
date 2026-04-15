import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonIcon, IonButton, IonCard, IonCardContent, IonProgressBar, IonBadge, IonList, IonItem, IonLabel, IonModal, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, walkOutline, locationOutline, play, bulbOutline, checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline, locate, navigate, chevronDownOutline, chevronUpOutline, playOutline, expandOutline, contractOutline, cashOutline, time, navigateOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SettingsService } from '../services/settings.service';
import { Capacitor } from '@capacitor/core';

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
  distanceToNextStop = '';
  
  private map!: L.Map;
  private markers: L.Marker[] = [];
  private userMarker: L.Marker | null = null;
  private userCoords: [number, number] | null = null;
  private watchId: string | null = null;
  private routePolyline: L.Polyline | null = null;
  private targetMarker: L.Marker | null = null;
  
  isRoutingActive = false;
  routingDirections: string[] = [];
  showRoutingPanel = false;
  private isLocationRevealed = false;
  public settingsService = inject(SettingsService);
  
  // Seguimiento de notificaciones enviadas por parada
  private notifiedDistances: Set<number> = new Set();

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
    'segadors': {
      title: 'Guerra dels Segadors: ¡Visca la Terra! (1640 - 1652)',
      duration: '2h 00min',
      distance: '3.8 km',
      description: 'Vive la revuelta del Corpus de Sang y la lucha por las libertades catalanas en el siglo XVII. Desde la entrada de los campesinos hasta la victoria en la montaña de Montjuïc.',
      center: [41.3750, 2.1750],
      zoom: 15,
      stops: [
        {
          id: 'portal-madrona',
          title: "Portal de Santa Madrona: La Entrada",
          hints: [
            "Únete a los miles de segadores que bajan de las montañas. ¿Por qué puerta entrarás a la ciudad amurallada para reclamar justicia frente a los abusos de los soldados del Rey?",
            "Busca la única puerta medieval que aún conserva sus torres gemelas y mira directamente hacia las huertas del sur.",
            "Dirígete al Portal de Santa Madrona, la entrada histórica junto a las actuales Drassanes Reials."
          ],
          description: "Entrada de los segadores.",
          coords: [41.3755, 2.1735],
          info: "En mayo de 1640, grupos de segadores entraron en Barcelona para protestar por el alojamiento forzoso de las tropas reales, desencadenando la revuelta.",
          imageUrl: "assets/images/segadors/portal.jpg",
          theatricalInfo: "¡Afilad vuestras hoces! Por este portal entramos a la ciudad. No venimos a segar trigo, sino a segar la injusticia de quienes nos roban el pan y la dignidad. ¡Que tiemblen los tiranos!"
        },
        {
          id: 'palau-virrei',
          title: "Palacio del Virrey: El Corpus de Sang",
          hints: [
            "¡Fuego y furia! La revuelta ha estallado en este día sagrado. Busca la residencia del hombre que representa la voluntad del monarca Austría y que ahora huye por su vida.",
            "Busca el solar cerca del puerto donde los nobles tienen sus palacios, allí donde la multitud busca al Conde de Santa Coloma.",
            "Ve a la Plaça del Duc de Medinaceli, donde antaño se alzaba el Palacio del Virrey Dalmau de Queralt."
          ],
          description: "Escenario de la revuelta.",
          coords: [41.3785, 2.1785],
          info: "El 7 de junio de 1640, durante el Corpus de Sang, el Virrey fue perseguido por la multitud y asesinado cuando intentaba huir por las rocas de la costa.",
          imageUrl: "assets/images/segadors/palau.jpg",
          theatricalInfo: "¿Oís los gritos? ¡Abajo el mal gobierno! El Virrey se esconde como una rata tras sus muros de seda. No hay barco en el puerto que pueda salvarle de la ira de un pueblo que ya no tiene miedo."
        },
        {
          id: 'carrer-ample',
          title: "Carrer Ample: El Temblor de la Nobleza",
          hints: [
            "Camina por la calle más ancha y rica de la ciudad, donde los carruajes de los linajes más antiguos ahora cierran sus portones ante el grito de '¡Visca la terra!'",
            "Atraviesa la vía de las grandes mansiones nobiliarias que corre paralela al mar, el eje del poder aristocrático del 1600.",
            "Recorre el Carrer Ample, el centro del lujo de la Barcelona del siglo XVII."
          ],
          description: "Eje de la aristocracia.",
          coords: [41.3805, 2.1800],
          info: "Durante la guerra, el Carrer Ample fue testigo de la tensión entre la alta nobleza, a menudo fiel a la corona, y las clases populares revolucionarias.",
          imageUrl: "assets/images/segadors/ample.jpg",
          theatricalInfo: "Mirad estos palacios de piedra. Sus dueños nos miran tras las cortinas, rezando a santos que ya no les oyen. Hoy, la calle más ancha de Barcelona pertenece a las hoces y no a los escudos de armas."
        },
        {
          id: 'generalitat-segadors',
          title: "Palau de la Generalitat: La Proclama",
          hints: [
            "Acude a la casa de los Diputados del General. Allí donde los representantes del pueblo deciden romper sus cadenas y buscar nuevas alianzas bajo la flor de lis.",
            "Ve al lugar donde Pau Claris proclama que Barcelona ya no debe obediencia a Madrid sino a su propia libertad.",
            "Plaça Sant Jaume, frente a la fachada renacentista del Palau de la Generalitat."
          ],
          description: "Centro político de la guerra.",
          coords: [41.3828, 2.1770],
          info: "Pau Claris lideró la resistencia política y proclamó la República Catalana en 1641, buscando la protección del Rey de Francia para resistir el asedio castellano.",
          imageUrl: "assets/images/segadors/generalitat.jpg",
          theatricalInfo: "¡Silencio! Pau Claris habla desde el balcón. Hoy nace una nueva era. Ya no somos vasallos, somos libres. Bajo estas bóvedas se guarda el honor de nuestras Constituciones."
        },
        {
          id: 'castell-segadors',
          title: "Montjuïc: La Batalla Victoriosa",
          hints: [
            "Sube a la montaña del rayo para la defensa final. Las tropas del Marqués de los Vélez se acercan por el llano y solo desde lo alto podremos rechazarlos.",
            "Busca el baluarte que corona la colina, allí donde la bandera de Santa Eulàlia guiará nuestra victoria contra los Tercios.",
            "Cima de Montjuïc, en el recinto del Castillo donde tuvo lugar la gran victoria de 1641."
          ],
          description: "Victoria defensiva.",
          coords: [41.3635, 2.1665],
          info: "El 26 de enero de 1641, un ejército de segadores y ciudadanos, apoyados por tropas francesas, derrotó al ejército castellano en las faldas de Montjuïc.",
          imageUrl: "assets/images/segadors/montjuic.jpg",
          theatricalInfo: "¡Fuego! Que los cañones retumben hasta el último rincón de la llanura. Desde esta cima hemos demostrado al mundo que no hay ejército capaz de doblegar a un pueblo que lucha por su tierra. ¡La montaña es nuestra!"
        }
      ]
    },
    '1714': {
      title: '1714: El Sitio - ¡Vivir Libres o Morir! (1713 - 1714)',
      duration: '3h 00min',
      distance: '4.5 km',
      description: 'Sumérgete en el episodio más dramático de Barcelona. Defiende las murallas contra el ejército borbónico, vive el asalto del 11 de septiembre y descubre las cicatrices que el asedio dejó en la ciudad para siempre.',
      center: [41.3860, 2.1820],
      zoom: 15,
      stops: [
        {
          id: 'fossar',
          title: "Fossar de les Moreres",
          hints: [
            "Honra a los valientes que no se rinden ni bajo la tierra roja. Allí donde no se entierra a ningún traidor.",
            "Busca el pebetero donde la llama eterna recuerda a los defensores de las libertades catalanas.",
            "Dirígete a la Plaza del Fossar de les Moreres, junto a la basílica del barrio de la Ribera."
          ],
          description: "Memorial de los defensores.",
          coords: [41.3838, 2.1825],
          info: "Antiguo cementerio de la parroquia de Santa Maria del Mar donde fueron enterrados muchos de los defensores durante el asedio.",
          imageUrl: "assets/images/1714/fossar.jpg",
          theatricalInfo: "¡Pisa con cuidado, ciudadano! Bajo este suelo late el corazón de Barcelona. Aquí descansan los que prefirieron la muerte a la servidumbre. ¡Que el fuego de este pebetero ilumine nuestra voluntad de hierro!"
        },
        {
          id: 'santamaria',
          title: "Santa Maria del Mar: Fe bajo el Fuego",
          hints: [
            "Entra al templo de los trabajadores, cuyas bóvedas de piedra resisten el impacto de los morteros enemigos.",
            "Busca la basílica gótica que los bastaixos alzaron con su propio sudor y que hoy sirve de hospital para los heridos de la Coronela.",
            "Entra en la Plaza de Santa Maria, frente a la fachada principal de la 'Catedral del Mar'."
          ],
          description: "Refugio y hospital.",
          coords: [41.3838, 2.1815],
          info: "Durante el sitio, la basílica sufrió graves daños por los bombardeos, pero se convirtió en un símbolo de la resistencia del pueblo llano.",
          imageUrl: "assets/images/1714/santamaria.jpg",
          theatricalInfo: "¡Mirad hacia arriba! Las piedras lloran por el humo de las bombas, pero no se quiebran. Aquí rezamos por los que están en la muralla, mientras los cirujanos hacen lo que pueden con los que bajan de los baluartes."
        },
        {
          id: 'born-ciutat',
          title: "El Born: La Ciudad Perdida",
          hints: [
            "Camina sobre las cenizas de las casas sacrificadas por el Rey vencedor para construir su nido de cañones.",
            "Busca el gran mercado de hierro que hoy protege las calles muertas y los muros rotos de la Barcelona de 1714.",
            "Entra en el Centro de Cultura y Memoria de El Born, el yacimiento arqueológico bajo la estructura del antiguo mercado."
          ],
          description: "La ciudad arrasada.",
          coords: [41.3855, 2.1845],
          info: "Tras la derrota, Felipe V ordenó derribar parte del barrio de la Ribera para construir la Ciudadela, dejando estas calles enterradas durante siglos.",
          imageUrl: "assets/images/1714/born.jpg",
          theatricalInfo: "¿Reconocéis estas tabernas? ¿Estos pozos? Aquí vivían vuestros abuelos antes de que el martillo de los Borbones borrara sus hogares. Es el testimonio mudo de una ciudad que fue sacrificada."
        },
        {
          id: 'baluard-clara',
          title: "Baluard de Santa Clara: La Brecha",
          hints: [
            "Acude a la brecha, allí donde los muros caen y la sangre se mezcla con el polvo en el día del asalto final.",
            "Encuentra el punto más atacado del sector este, donde las tropas del Duque de Berwick concentraron todo su fuego.",
            "Busca los restos del Baluarte de Santa Clara en el extremo norte del actual yacimiento del Born."
          ],
          description: "Punto crítico del asalto.",
          coords: [41.3860, 2.1865],
          info: "Este baluarte fue el escenario de los combates más encarnizados de agosto y septiembre de 1714, cambiando de manos varias veces.",
          imageUrl: "assets/images/1714/clara.jpg",
          theatricalInfo: "¡A las armas! ¡Por la brecha entran los granaderos enemigos! No retrocedáis ni un paso. Si Santa Clara cae, Barcelona cae con ella. ¡Por vuestras familias, resistid!"
        },
        {
          id: 'carrer-montcada',
          title: "Palau Dalmases: La Resistencia Noble",
          hints: [
            "Entre palacios de piedra, conspira por la libertad de las Constituciones junto a los señores que financian la defensa.",
            "Camina por la calle de los grandes linajes que resisten el hambre del asedio sin perder su dignidad.",
            "Ve al Carrer de Montcada y busca el patio barroco del Palau Dalmases."
          ],
          description: "Logística y nobleza.",
          coords: [41.3845, 2.1810],
          info: "La calle Montcada era el centro de la aristocracia barcelonesa que apoyaba la causa del Archiduque Carlos y mantenía la administración de la ciudad.",
          imageUrl: "assets/images/1714/dalmases.jpg",
          theatricalInfo: "Tras estos portones se planean las salidas nocturnas para buscar víveres. No solo el pueblo sufre; la seda de los nobles también está rasgada por la metralla. ¡Unidos en la desgracia, unidos en la lucha!"
        },
        {
          id: 'baluard-pere',
          title: "Baluard de Sant Pere",
          hints: [
            "Defiende el último tramo de la muralla norte, el bastión donde el honor pesa más que la vida bajo el sol de septiembre.",
            "Busca el extremo de la defensa donde la última bandera blanca nunca se izó por voluntad de los ciudadanos.",
            "Dirígete a la actual Plaza de Sant Pere, donde antaño se alzaba el imponente baluarte defensivo."
          ],
          description: "Resistencia final.",
          coords: [41.3895, 2.1795],
          info: "Junto con el de Santa Clara, fue uno de los puntos donde la resistencia se prolongó hasta el último momento el 11 de septiembre.",
          imageUrl: "assets/images/1714/baluard_pere.jpg",
          theatricalInfo: "El aire es irrespirable por la pólvora. Mirad hacia la muralla vecina... ya ondea el estandarte enemigo. Pero aquí, en Sant Pere, todavía somos dueños de nuestro destino. ¡Cargad los fusiles por última vez!"
        },
        {
          id: 'monument-casanova',
          title: "La Caída de Casanova",
          hints: [
            "Busca al hombre que cayó herido sosteniendo la bandera de Santa Eulàlia para animar a las tropas en el momento más oscuro.",
            "Ve al lugar donde la resistencia final se quebró tras horas de lucha calle por calle.",
            "Encuentra el monumento en la esquina de la Ronda de Sant Pere con la calle Ali Bei."
          ],
          description: "El fin del gobierno.",
          coords: [41.3905, 2.1775],
          info: "Rafael Casanova, Conseller en Cap, fue herido aquí mientras encabezaba un contraataque desesperado con la bandera de la ciudad.",
          imageUrl: "assets/images/1714/casanova.jpg",
          theatricalInfo: "¡Mirad al Conseller! Sostiene la bandera roja con mano firme incluso mientras cae. Su sangre tiñe las piedras que juró defender. Si él cae, Barcelona se queda sin guía. ¡Salvad la bandera!"
        },
        {
          id: 'ciutadella-fin',
          title: "La Ciutadella: El Fin de las Libertades",
          hints: [
            "Contempla la fortaleza del opresor, alzada no para defendernos, sino para vigilar a una ciudad derrotada.",
            "Busca el lugar donde el barrio de la Ribera fue borrado del mapa para construir un nido de cañones apuntando al corazón de los barceloneses.",
            "Termina tu ruta en el centro del Parque de la Ciutadella, frente al edificio del antiguo arsenal (hoy Parlament)."
          ],
          description: "La represión borbónica.",
          coords: [41.3880, 2.1850],
          info: "La Ciudadela fue la fortaleza militar más grande de Europa en su momento, símbolo de la pérdida de los fueros y la autonomía de Cataluña.",
          imageUrl: "assets/images/1714/ciutadella.jpg",
          theatricalInfo: "Se hizo el silencio. Las campanas ya no doblan. Desde esta fortaleza nos vigilan día y noche. Han derribado nuestras casas, han quemado nuestras leyes... pero no han podido enterrar nuestra memoria. Algún día, estas murallas también caerán."
        }
      ]
    },
    'independencia': {
      title: 'Guerra de la Independencia: La BCN Ocupada (1808 - 1814)',
      duration: '2h 15min',
      distance: '3.5 km',
      description: 'Barcelona bajo el águila napoleónica. Vive la tensión de una ciudad ocupada por las tropas de Napoleón, descubre las conspiraciones fallidas y la lucha de los ciudadanos por recuperar su libertad.',
      center: [41.3830, 2.1750],
      zoom: 15,
      stops: [
        {
          id: 'generalitat-francesa',
          title: "Palau de la Generalitat: La Traición",
          hints: [
            "Llegan como aliados pero se quedan como amos. ¿Dónde se acuartelaron los generales de Napoleón tras tomar los centros de poder por la fuerza?",
            "Busca el palacio renacentista donde la bandera tricolor francesa ondeó por primera vez sustituyendo a la nuestra.",
            "Plaça Sant Jaume, frente a la fachada del Palau de la Generalitat."
          ],
          description: "Centro del mando francés.",
          coords: [41.3828, 2.1770],
          info: "En febrero de 1808, las tropas francesas del general Duhesme entraron en Barcelona y ocuparon los puntos estratégicos, incluyendo la Generalitat.",
          imageUrl: "assets/images/independencia/generalitat.jpg",
          theatricalInfo: "¡Mirad sus uniformes relucientes! Dicen que vienen a protegernos, pero sus bayonetas apuntan a nuestro pecho. Han entrado en nuestra casa más sagrada y se sirven nuestro vino como si fuera suyo. ¡Esto no es una alianza, es un robo!"
        },
        {
          id: 'felip-neri-resistencia',
          title: "Plaça de Sant Felip Neri: Los Mártires",
          hints: [
            "Busca el rincón silencioso donde los conspiradores del 'Complot de la Ascensión' se reunieron por última vez antes de ser entregados.",
            "Encuentra la plaza donde el tiempo parece haberse detenido, cerca de la catedral, donde se honra la memoria de los ocho ejecutados por los franceses.",
            "Dirígete a la Plaza de Sant Felip Neri, en el corazón del Barrio Gótico."
          ],
          description: "Homenaje a la resistencia.",
          coords: [41.3830, 2.1755],
          info: "En 1809 se descubrió una gran conspiración para liberar la ciudad. Los líderes fueron ejecutados en la Ciudadela, convirtiéndose en mártires de la libertad.",
          imageUrl: "assets/images/independencia/felip_neri.jpg",
          theatricalInfo: "Aquí, entre estas sombras, juramos liberar Barcelona. Éramos pocos, pero valientes. Alguien nos traicionó por unas monedas de oro... ahora nuestras almas vigilan esta plaza mientras esperamos que los franceses se marchen para siempre."
        },
        {
          id: 'revolta-pi',
          title: "Carrer del Pi: La Furia Popular",
          hints: [
            "Escucha el eco de las piedras volando contra la caballería francesa. ¿En qué estrecha calle se levantaron los vecinos armados solo con palos y odio?",
            "Busca la vía que lleva a la iglesia del pino, donde las barricadas de muebles intentaron frenar el paso de los dragones napoleónicos.",
            "Ve al Carrer del Pi, que conecta la calle de la Portaferrissa con la Plaza del Pi."
          ],
          description: "Lucha callejera.",
          coords: [41.3835, 2.1740],
          info: "Barcelona vivió constantes revueltas populares y motines espontáneos contra los soldados franceses debido a los abusos y el hambre.",
          imageUrl: "assets/images/independencia/calle_pi.jpg",
          theatricalInfo: "¡Aceite hirviendo desde los balcones! ¡Piedras desde los tejados! Si no tenemos fusiles, usaremos nuestras manos. Por cada soldado francés que cae en estas callejuelas, Barcelona respira un poco más aliviada."
        },
        {
          id: 'palau-moja-mando',
          title: "Palau Moja: El Lujo del Ocupante",
          hints: [
            "¿Dónde celebran sus bailes y banquetes las autoridades francesas mientras el pueblo muere de hambre fuera de sus salones?",
            "Busca el palacio neoclásico en la gran avenida de la ciudad, donde el General Duhesme dictaba sus sentencias de muerte.",
            "Encuentra el Palau Moja en la esquina de la Rambla con la calle de la Portaferrissa."
          ],
          description: "Cuartel general francés.",
          coords: [41.3832, 2.1715],
          info: "Este palacio fue confiscado por los franceses para servir de residencia a sus altos mandos, convirtiéndose en el símbolo visual de la ocupación en la Rambla.",
          imageUrl: "assets/images/independencia/palau_moja.jpg",
          theatricalInfo: "Brindan con nuestro champán mientras en las murallas se fusila a nuestros hermanos. Tras esas ventanas doradas se esconden los que creen que Barcelona es una provincia más de su emperador. ¡Algún día esos salones arderán con nuestra alegría!"
        },
        {
          id: 'preso-rei',
          title: "Plaça del Rei: La Sombra de la Inquisición",
          hints: [
            "Busca el portal donde el sol nunca entra, el lugar de encierro de los 'patriotas' capturados por la policía del ocupante.",
            "Encuentra la plaza real donde los antiguos palacios servían de mazmorras para los que se negaban a jurar fidelidad a José I.",
            "Dirígete a la Plaza del Rei y busca el edificio que hoy es el Museo Frederic Marès."
          ],
          description: "Prisión de prisioneros políticos.",
          coords: [41.3840, 2.1770],
          info: "Los franceses utilizaron antiguos edificios oficiales y religiosos como prisiones improvisadas para gestionar el gran volumen de detenidos de la resistencia.",
          imageUrl: "assets/images/independencia/plaza_rey.jpg",
          theatricalInfo: "El frío de estas piedras es el mismo que el de la tumba. Estamos aquí encerrados por amar nuestra tierra más que a la vida. Pero escuchad bien: aunque nos encadenen, nuestro pensamiento vuela libre sobre las murallas."
        },
        {
          id: 'montjuic-independencia',
          title: "Montjuïc: El Dominio de Napoleón",
          hints: [
            "Sube a la cima para ver quién tiene la llave de la ciudad. El punto desde el cual los cañones franceses nos recuerdan quién manda realmente.",
            "Busca la fortaleza que domina el mar y la tierra, donde la guarnición francesa resistió hasta el último día de la guerra.",
            "Termina tu ruta en el foso del Castillo de Montjuïc, lugar de vigilancia del ejército ocupante."
          ],
          description: "Control militar total.",
          coords: [41.3630, 2.1660],
          info: "El Castillo de Montjuïc fue vital para los franceses; desde allí podían bombardear la ciudad si se producía una insurrección generalizada.",
          imageUrl: "assets/images/independencia/montjuic.jpg",
          theatricalInfo: "Desde aquí arriba, Barcelona parece de juguete. Pero es una fiera dormida. Los franceses nos miran desde sus baluartes con miedo, sabiendo que cada día que pasa es un día menos de su imperio. ¡Pronto volveremos a ser dueños de nuestra montaña!"
        }
      ]
    },
    'rosa-foc': {
      title: 'La Rosa de Fuego: La Ciudad de las Bombas (1890 - 1923)',
      duration: '4h 00min',
      distance: '7.5 km',
      description: 'Barcelona, la Rosa de Fuego: vive el auge del idealismo anarquista, la era de los atentados con bomba Orsini y la sangrienta época del pistolerismo en las calles.',
      center: [41.3800, 2.1750],
      zoom: 15,
      stops: [
        {
          id: 'placa-reial-bomba',
          title: "Plaça Reial: El Primer Estallido",
          hints: [
            "Busca la gran plaza porticada cerca de las Ramblas donde un descuido con una maleta en 1893 reveló al mundo el poder de la 'Idea'.",
            "Encuentra el lugar donde el anarquista Paulino Pallás preparaba sus artefactos antes de pasar a la acción.",
            "Dirígete a la Plaza Reial, cerca de la fuente de las Tres Gracias."
          ],
          description: "El inicio del terrorismo anarquista.",
          coords: [41.3800, 2.1750],
          info: "En 1893, una explosión accidental en una habitación de la Plaza Real puso en alerta a la policía sobre la fabricación de bombas Orsini en el corazón de la ciudad.",
          imageUrl: "assets/images/rosa-foc/placa_reial.jpg",
          theatricalInfo: "¡Cuidado con esa maleta! El metal pesa, pero el ideal pesa más. Un solo estallido en este salón de la burguesía hará que el mundo entero escuche el hambre de los barrios obreros."
        },
        {
          id: 'liceu-atemptat',
          title: "Gran Teatre del Liceu: Santiago Salvador",
          hints: [
            "Entra en el templo de la música donde el terciopelo rojo se tiñó de sangre cuando dos artefactos cayeron desde el gallinero sobre la alta sociedad.",
            "Busca el edificio en la Rambla que representa el lujo de la clase que los anarquistas juraron destruir en 1893.",
            "Ve al Gran Teatre del Liceu, frente a la parada de metro."
          ],
          description: "El atentado de las bombas Orsini.",
          coords: [41.3800, 2.1735],
          info: "Santiago Salvador lanzó dos bombas Orsini al patio de butacas durante la ópera Guillermo Tell. Solo una explotó, matando a 20 personas y provocando un estado de sitio en la ciudad.",
          imageUrl: "assets/images/rosa-foc/liceu.jpg",
          theatricalInfo: "¡Vengaremos a Pallás! Mientras ellos rían entre diamantes, nosotros morimos en las fábricas. Que el trueno de la Orsini les recuerde que su tiempo se acaba."
        },
        {
          id: 'cambis-nous-bomba',
          title: "Carrer de los Cambios Nuevos: El Corpus",
          hints: [
            "Busca la calle estrecha cerca de la basílica del mar donde una bomba lanzada contra una procesión cambió el destino de cientos de obreros en 1896.",
            "Encuentra el lugar del atentado que desató la gran represión de los Procesos de Montjuïc.",
            "Dirígete al Carrer dels Canvis Nous, conectando con Santa Maria del Mar."
          ],
          description: "El atentado contra la procesión del Corpus.",
          coords: [41.3835, 2.1820],
          info: "Una bomba lanzada contra la procesión del Corpus Christi mató a 12 personas. La represión posterior llevó al encarcelamiento y tortura de cientos de anarquistas en el Castillo de Montjuïc.",
          imageUrl: "assets/images/rosa-foc/corpus.jpg",
          theatricalInfo: "¿Oís los cánticos y el incienso? Nadie esperaba que el aire se llenara de metralla. Un acto terrible que dio la excusa perfecta al Estado para llenar de sangre los calabozos de la montaña."
        },
        {
          id: 'gran-via-pallas',
          title: "Gran Via / Casanova: Martínez Campos",
          hints: [
            "Ve al cruce de la gran avenida donde un joven anarquista intentó derribar al Capitán General durante un desfile militar.",
            "Busca el lugar donde los caballos del ejército relincharon de terror ante el primer gran atentado político en la vía pública.",
            "Cruce de Gran Via de les Corts Catalanes con Carrer de Casanova."
          ],
          description: "Atentado contra el poder militar.",
          coords: [41.3830, 2.1600],
          info: "En 1893, Paulino Pallás lanzó dos bombas contra el General Martínez Campos. El general sobrevivió, pero Pallás fue ejecutado, convirtiéndose en el primer mártir de la nueva ola anarquista.",
          imageUrl: "assets/images/rosa-foc/pallas.jpg",
          theatricalInfo: "¡Por los oprimidos! No apunto al hombre, apunto al uniforme que nos aplasta. Mi vida no importa si mi muerte despierta a un solo hermano de su letargo."
        },
        {
          id: 'balmes-layret',
          title: "Carrer de Balmes: El Asesinato de Layret",
          hints: [
            "Busca la calle que sube desde el centro hacia el Eixample, donde los sicarios de la patronal esperaron al abogado de los trabajadores en 1920.",
            "Encuentra el portal donde fue abatido el hombre que defendía con la ley lo que los obreros pedían con huelgas.",
            "Carrer de Balmes, cerca de la Gran Via."
          ],
          description: "Pistolerismo: La muerte del abogado obrero.",
          coords: [41.3875, 2.1655],
          info: "Francesc Layret, abogado laboralista y diputado, fue asesinado por pistoleros del Sindicato Libre (vinculado a la patronal) para evitar que defendiera a los líderes sindicales presos.",
          imageUrl: "assets/images/rosa-foc/layret.jpg",
          theatricalInfo: "Llevaba la justicia en su maletín y la voz de los sin voz en su garganta. No pudieron ganarle en los tribunales, así que enviaron a los asesinos a esperarle en la sombra de su propia calle."
        },
        {
          id: 'noi-del-sucre',
          title: "Carrer de Sant Rafael: El Noi del Sucre",
          hints: [
            "Adéntrate en el Raval hasta la calle donde el líder más querido de la CNT fue emboscado por el plomo de los traidores.",
            "Busca el lugar donde cayó 'El Noi del Sucre', silenciando la voz del sindicalismo más brillante de su tiempo en 1923.",
            "Dirígete al Carrer de Sant Rafael, en el corazón del Raval."
          ],
          description: "El fin de una era: El asesinato de Salvador Seguí.",
          coords: [41.3795, 2.1685],
          info: "Salvador Seguí, figura clave del anarcosindicalismo y artífice de la huelga de la Canadiense, fue asesinado por pistoleros de la patronal en este rincón del Raval.",
          imageUrl: "assets/images/rosa-foc/segui.jpg",
          theatricalInfo: "¡Han matado al Salvador! Pero su idea ya no necesita un líder. En cada taller, en cada puerto, en cada imprenta, el eco de su palabra será más fuerte que el disparo que le ha quitado la vida."
        },
        {
          id: 'montjuic-represio',
          title: "Castell de Montjuïc: El Foso del Dolor",
          hints: [
            "Termina tu ruta en el lugar donde el eco de las bombas Orsini se convirtió en el silencio de las ejecuciones.",
            "Busca los muros que guardan la memoria de los procesos que horrorizaron a Europa por el uso de la tortura contra el ideal obrero.",
            "Alcanza los fosos del Castillo de Montjuïc."
          ],
          description: "Los Procesos de Montjuïc.",
          coords: [41.3635, 2.1665],
          info: "El Castillo fue la prisión y lugar de ejecución de los anarquistas tras los atentados. Los juicios militares y las denuncias de tortura internacionalizaron la causa de la Rosa de Fuego.",
          imageUrl: "assets/images/rosa-foc/montjuic_preso.jpg",
          theatricalInfo: "Desde aquí arriba, Barcelona parece arder bajo las luces. Pero aquí abajo, en la piedra fría, solo queda el orgullo del que no se doblega. La Rosa de Fuego no muere, solo espera su próximo florecer."
        }
      ]
    },
    'setmana-tragica': {
      title: 'Setmana Tràgica: La Ciudad en Llamas (1909)',
      duration: '2h 15min',
      distance: '3.8 km',
      description: 'Revive los sucesos de julio de 1909. La protesta contra la guerra de Marruecos que derivó en una revuelta social sin precedentes, barricadas y el incendio de edificios religiosos.',
      center: [41.3800, 2.1700],
      zoom: 15,
      stops: [
        {
          id: 'portal-pau',
          title: "Portal de la Pau: El Detonante",
          hints: [
            "Acude al puerto donde los reservistas se despiden de sus familias. ¿En qué lugar las madres y esposas intentaron impedir que sus hombres fueran embarcados hacia la guerra de África?",
            "Busca la base del monumento a Colón, allí donde los pañuelos blancos se mezclaron con los gritos de protesta contra el embarque de tropas.",
            "Ve al Portal de la Pau, frente al puerto de Barcelona."
          ],
          description: "Protesta contra el embarque de tropas.",
          coords: [41.3758, 2.1778],
          info: "El 18 de julio de 1909, el embarque de tropas hacia la Guerra de Melilla desencadenó las primeras protestas que pronto se convertirían en huelga general.",
          imageUrl: "assets/images/setmana-tragica/portal_pau.jpg",
          theatricalInfo: "¡No irán! ¡Nuestros hijos no morirán por las minas de unos pocos! Ved cómo las mujeres se agarran a los fusiles de los soldados. El puerto ya no es un lugar de despedidas, es el comienzo de nuestra rebelión."
        },
        {
          id: 'sant-agusti',
          title: "Plaça de Sant Agustí: La Huelga Estalla",
          hints: [
            "Busca la plaza del Raval donde los obreros se concentraron para declarar la huelga general y se enfrentaron por primera vez a las cargas de la caballería.",
            "Encuentra la iglesia que vio los primeros choques violentos del lunes 26 de julio, el día que la ciudad se detuvo.",
            "Dirígete a la Plaza de Sant Agustí, cerca del mercado de la Boqueria."
          ],
          description: "Inicio de la huelga general.",
          coords: [41.3805, 2.1705],
          info: "En esta plaza se produjeron los primeros enfrentamientos serios entre obreros y fuerzas de seguridad, marcando el paso de una huelga política a una revuelta social.",
          imageUrl: "assets/images/setmana-tragica/sant_agusti.jpg",
          theatricalInfo: "¡Barcelona se detiene! Ya no hay fábricas abiertas, ni tranvías circulando. En esta plaza hemos dicho 'basta'. ¿Oís los cascos de los caballos? Que vengan, las piedras de estas calles son nuestros únicos proyectiles."
        },
        {
          id: 'sant-pau-camp',
          title: "Sant Pau del Camp: Columnas de Humo",
          hints: [
            "Acude al monasterio románico más antiguo de la ciudad, que vio cómo las llamas consumían los edificios religiosos colindantes durante la 'noche de los incendios'.",
            "Busca el oasis de piedra del Raval donde la furia anticlerical se manifestó con más fuerza contra los símbolos del poder eclesiástico.",
            "Ve al Monasterio de Sant Pau del Camp en el Carrer de Sant Pau."
          ],
          description: "La quema de conventos.",
          coords: [41.3750, 2.1695],
          info: "Durante la Semana Trágica, más de 80 edificios religiosos fueron incendiados. El odio acumulado contra la Iglesia, vista como aliada de la burguesía, estalló en estas calles.",
          imageUrl: "assets/images/setmana-tragica/sant_pau.jpg",
          theatricalInfo: "Mirad el cielo: está negro como nuestra suerte. Han quemado los conventos porque dicen que allí se guarda la riqueza que nos falta. Las campanas ya no llaman a misa, solo suenan a rebato en una ciudad que arde."
        },
        {
          id: 'virreina-gracia',
          title: "Plaça de la Virreina: Gràcia Resiste",
          hints: [
            "Sube al barrio obrero donde las barricadas se levantaron con más altura. ¿En qué plaza se organizó la defensa popular contra la entrada de las tropas del ejército?",
            "Busca el corazón de Gràcia donde el sonido de los fusiles no cesó hasta el último día de la revuelta.",
            "Dirígete a la Plaza de la Virreina en el barrio de Gràcia."
          ],
          description: "Resistencia en los barrios.",
          coords: [41.4035, 2.1575],
          info: "Gràcia fue uno de los últimos reductos de la revuelta. Sus calles estrechas facilitaron la construcción de barricadas y la resistencia contra el ejército.",
          imageUrl: "assets/images/setmana-tragica/virreina.jpg",
          theatricalInfo: "¡Apretad las filas! Aquí en Gràcia no pasarán. Hemos levantado barricadas con los adoquines de nuestras propias calles. Cada balcón es un puesto de guardia. Si Barcelona cae, Gràcia será la última en rendirse."
        },
        {
          id: 'montjuic-represion',
          title: "Castell de Montjuïc: El Fin del Sueño",
          hints: [
            "Termina tu ruta en el lugar de la justicia militar. Allí donde los consejos de guerra sentenciaron a muerte a los que lideraron la revuelta desde la sombra o las barricadas.",
            "Busca el foso de la fortaleza que domina la ciudad, testigo del final de la Semana Trágica y el inicio de una represión implacable.",
            "Alcanza el foso de Santa Elena en el Castillo de Montjuïc."
          ],
          description: "Represión y consejos de guerra.",
          coords: [41.3635, 2.1665],
          info: "Tras la revuelta, cientos de personas fueron juzgadas en Montjuïc. Hubo miles de detenidos y cinco ejecuciones, entre ellas la de Ferrer i Guàrdia.",
          imageUrl: "assets/images/setmana-tragica/montjuic.jpg",
          theatricalInfo: "Se ha hecho el silencio. La ciudad ya no arde, pero el aire huele a pólvora de fusilamiento. Aquí, bajo estos muros, han intentado enterrar nuestra voz con balas. Pero la semilla de julio ya ha germinado bajo las cenizas."
        }
      ]
    },
    'guerra-civil': {
      title: 'Guerra Civil: La BCN bajo el fuego (1936 - 1939)',
      duration: '3h 00min',
      distance: '5.2 km',
      description: 'Barcelona, capital de la República y primera ciudad víctima de bombardeos sistemáticos contra la población civil. Vive la revolución, el terror de las sirenas y la resistencia en los refugios.',
      center: [41.3850, 2.1700],
      zoom: 15,
      stops: [
        {
          id: 'plaça-catalunya-19j',
          title: "Plaça Catalunya: El 19 de Julio",
          hints: [
            "Ve al centro neurálgico donde el golpe militar fue frenado en las calles. ¿En qué hotel se atrincheraron los oficiales rebeldes antes de ser derrotados por la Guardia de Asalto y los obreros armados?",
            "Busca el lugar donde las barricadas de sacos terreros cortaron el paso a los cañones que bajaban del Eixample.",
            "Encuentra el solar del antiguo Hotel Colón en la Plaza de Catalunya."
          ],
          description: "Derrota del golpe militar en Barcelona.",
          coords: [41.3870, 2.1700],
          info: "El 19 de julio de 1936, Barcelona vivió intensos combates. La victoria de las fuerzas leales y las milicias obreras convirtió a la ciudad en el epicentro de la revolución social.",
          imageUrl: "assets/images/guerra-civil/catalunya.jpg",
          theatricalInfo: "¡Victoria! El ejército se ha rendido en el Hotel Colón. Barcelona es dueña de su destino. Mirad las banderas rojas y negras; hoy ha muerto el viejo mundo y uno nuevo late en nuestros corazones."
        },
        {
          id: 'felip-neri-bombardei',
          title: "Plaça de Sant Felip Neri: La Herida Abierta",
          hints: [
            "Busca la pequeña plaza donde las paredes todavía gritan por el impacto de la aviación italiana. ¿Dónde cayeron las bombas que acabaron con la vida de decenas de niños refugiados?",
            "Encuentra el rincón del Barrio Gótico donde la piedra muestra las cicatrices de la metralla de enero de 1938.",
            "Dirígete a la Plaza de Sant Felip Neri, frente a la fachada de la iglesia."
          ],
          description: "Víctimas civiles de los bombardeos.",
          coords: [41.3830, 2.1755],
          info: "El 30 de enero de 1938, la aviación legionaria italiana bombardeó la plaza, matando a 42 personas, la mayoría niños que se refugiaban en el sótano de la iglesia.",
          imageUrl: "assets/images/guerra-civil/felip_neri.jpg",
          theatricalInfo: "Silencio... ¿oís el eco de las sirenas? Estas piedras no mienten. Aquí el terror llovió del cielo sin previo aviso. Es la marca de la infamia que Barcelona nunca borrará de su piel."
        },
        {
          id: 'via-laietana-represio',
          title: "Via Laietana: La Sombra de la Represión",
          hints: [
            "Busca el edificio de la gran avenida que fue testigo tanto de la euforia revolucionaria como del terror de los interrogatorios.",
            "Encuentra la sede de la Jefatura Superior de Policía, un lugar donde los sótanos guardan secretos oscuros de la contienda.",
            "Dirígete a la Via Laietana, frente al edificio de la Jefatura Superior de Policía."
          ],
          description: "Control policial y represión.",
          coords: [41.3855, 2.1755],
          info: "Durante la guerra, este edificio fue un centro neurálgico de control y, en ocasiones, de represión política por parte de diferentes facciones según el momento del conflicto.",
          imageUrl: "assets/images/guerra-civil/laietana.jpg",
          theatricalInfo: "Tras estas ventanas, el poder vigila. En los días de la revolución, los comités mandaban aquí; después, el orden volvió con mano de hierro. El miedo tiene muchas caras, y todas han pasado por este portal."
        },
        {
          id: 'orwell-ramblas',
          title: "Las Ramblas: Homenaje a Cataluña",
          hints: [
            "Busca el lugar desde donde un escritor inglés vigilaba las barricadas durante los Hechos de Mayo de 1937.",
            "Encuentra el edificio frente al Teatre Poliorama donde George Orwell pasó noches sin dormir defendiendo su ideal.",
            "Ve al tramo superior de las Ramblas, cerca del actual Hotel Continental."
          ],
          description: "Testimonio internacional de la guerra.",
          coords: [41.3850, 2.1705],
          info: "El escritor George Orwell combatió con el POUM y documentó su experiencia en 'Homenaje a Cataluña', capturando la esencia de la Barcelona revolucionaria.",
          imageUrl: "assets/images/guerra-civil/orwell.jpg",
          theatricalInfo: "¡Mirad al Poliorama! Desde allí arriba, Orwell vigilaba con su fusil. Barcelona era una fiesta de igualdad, pero las sombras de la sospecha empezaron a devorarlo todo. Un hombre libre solo puede escribir lo que ve."
        },
        {
          id: 'generalitat-companys',
          title: "Plaça Sant Jaume: El Grito del Presidente",
          hints: [
            "Acude al lugar donde Lluís Companys proclamó la República y desde donde dirigió el gobierno de Cataluña durante los años de fuego.",
            "Busca la sede del gobierno catalán que se convirtió en el faro de la resistencia institucional contra el fascismo.",
            "Plaça Sant Jaume, frente al Palau de la Generalitat."
          ],
          description: "Centro político de la Cataluña en guerra.",
          coords: [41.3828, 2.1770],
          info: "Lluís Companys presidió la Generalitat durante toda la contienda, intentando mantener el orden y la legalidad en medio del caos revolucionario y el asedio militar.",
          imageUrl: "assets/images/guerra-civil/generalitat.jpg",
          theatricalInfo: "¡Catalanes! El presidente habla desde el balcón. Su voz es cansada pero firme. Sabe que el destino de un pueblo se decide en estos salones. No es solo un cargo, es el símbolo de nuestra supervivencia."
        },
        {
          id: 'montjuic-companys',
          title: "Foso de Santa Eulàlia: El Sacrificio",
          hints: [
            "Termina tu ruta en el lugar más sombrío de la montaña, donde la historia terminó para el presidente que no quiso que le vendaran los ojos.",
            "Busca el foso del castillo que sirvió de paredón para el hombre que gritó '¡Per Catalunya!' antes de caer.",
            "Alcanza el foso de Santa Eulàlia en el Castillo de Montjuïc."
          ],
          description: "Ejecución de Lluís Companys.",
          coords: [41.3635, 2.1665],
          info: "Lluís Companys fue fusilado aquí el 15 de octubre de 1940 tras ser entregado por la Gestapo, convirtiéndose en el único presidente democrático ejecutado en Europa.",
          imageUrl: "assets/images/guerra-civil/montjuic_companys.jpg",
          theatricalInfo: "Descalzo, para pisar por última vez la tierra que amaba. Aquí el silencio pesa como el plomo. Han matado al hombre, pero no han podido matar la dignidad de un pueblo que todavía hoy le llora."
        },
        {
          id: 'refugi-307',
          title: "Refugio 307: La Vida bajo Tierra",
          hints: [
            "Baja a las entrañas de la montaña donde los vecinos excavaron kilómetros de túneles con sus propias manos para protegerse de las bombas.",
            "Busca la entrada al Poble-sec donde el sonido del pico y la pala fue la única defensa contra el miedo a morir bajo los escombros.",
            "Visita el Refugi 307 en la calle Nou de la Rambla."
          ],
          description: "Defensa pasiva de la población.",
          coords: [41.3735, 2.1685],
          info: "Barcelona construyó más de 1.300 refugios antiaéreos. El 307 es uno de los mejor conservados, con túneles, enfermería y cocina.",
          imageUrl: "assets/images/guerra-civil/refugi.jpg",
          theatricalInfo: "Entrad rápido, la sirena ya ha dejado de sonar. Aquí abajo, el tiempo se detiene mientras el mundo de arriba se desmorona. Somos hormigas defendiendo nuestra vida en la oscuridad."
        },
        {
          id: 'telefónica-maig',
          title: "Edificio Telefónica: Los Hechos de Mayo",
          hints: [
            "Busca el rascacielos de la plaza central que fue el centro de la 'guerra civil dentro de la guerra civil'. ¿Por qué control de este edificio se enfrentaron anarquistas y comunistas?",
            "Encuentra the edificio que domina la esquina de Portal de l'Àngel, sede de las comunicaciones en 1937.",
            "Edificio de Telefónica en la Plaça de Catalunya."
          ],
          description: "Conflicto interno republicano.",
          coords: [41.3865, 2.1710],
          info: "En mayo de 1937, el intento del gobierno de controlar la central telefónica (en manos de la CNT) desencadenó enfrentamientos armados entre facciones republicanas.",
          imageUrl: "assets/images/guerra-civil/telefonica.jpg",
          theatricalInfo: "¡Tragedia! Disparamos contra nuestros propios hermanos mientras el enemigo ríe en el frente. Estas paredes han visto la esperanza de la revolución romperse en mil pedazos por la discordia."
        },
        {
          id: 'bunkers-carmel',
          title: "Batería del Carmel: Defensa del Cielo",
          hints: [
            "Sube a la colina donde los cañones antiaéreos intentaron alcanzar a los aviones que venían del mar cargados de muerte.",
            "Busca el mirador más alto donde los soldados vigilaban el horizonte esperando el destello de los motores enemigos.",
            "Alcanza las baterías antiaéreas del Turó de la Rovira (Bunkers del Carmel)."
          ],
          description: "Defensa activa antiaérea.",
          coords: [41.4190, 2.1620],
          info: "Instalada en 1937, esta batería defendía Barcelona de los ataques de la aviación fascista, ofreciendo una vista estratégica de toda la llanura de la ciudad.",
          imageUrl: "assets/images/guerra-civil/bunkers.jpg",
          theatricalInfo: "¡Fuego al cielo! Desde esta atalaya somos los guardianes de una ciudad que se niega a morir. Mirad las luces apagadas abajo... Barcelona espera en silencio a que pase la tormenta de acero."
        }
      ]
    },
    'parques-jardines': {
      title: 'Parques y Jardines: Oasis de Barcelona',
      duration: '3h 00min',
      distance: '8.5 km',
      description: 'Descubre el pulmón verde de Barcelona a través de sus jardines históricos, laberintos neoclásicos y oasis de biodiversidad en plena ciudad.',
      center: [41.3880, 2.1850],
      zoom: 13,
      stops: [
        {
          id: 'ciutadella-parc',
          title: "Parc de la Ciutadella: El Primer Oasis",
          hints: [
            "Busca el lugar donde una fortaleza del terror se convirtió en el primer gran parque público de la ciudad.",
            "Encuentra la gran cascada monumental donde un joven Gaudí dejó sus primeras huellas.",
            "Dirígete al Parque de la Ciutadella, frente al edificio del Parlament."
          ],
          description: "Jardín histórico y monumental.",
          coords: [41.3885, 2.1865],
          info: "Primer parque diseñado específicamente como tal en Barcelona, construido sobre los terrenos de la antigua Ciudadela militar tras la Exposición Universal de 1888.",
          imageUrl: "assets/images/parques/ciutadella.jpg",
          theatricalInfo: "¡Mirad estas aguas! Donde antes hubo muros de opresión, ahora hay fuentes que bailan. Barcelona por fin respira tras siglos de asfixia militar."
        },
        {
          id: 'laberint-horta',
          title: "Laberint d'Horta: El Juego Neoclásico",
          hints: [
            "¿Te atreves a perderte en los muros de cipreses del jardín más antiguo que se conserva en la ciudad?",
            "Busca el rincón romántico donde los nobles jugaban al escondite entre estatuas de dioses griegos.",
            "Ve al Parque del Laberinto de Horta, en el distrito de Horta-Guinardó."
          ],
          description: "Jardín neoclásico y romántico.",
          coords: [41.4395, 2.1465],
          info: "Iniciado en 1792, es una joya del paisajismo que combina un laberinto neoclásico con un jardín romántico lleno de templos y grutas.",
          imageUrl: "assets/images/parques/laberinto.jpg",
          theatricalInfo: "El amor es un laberinto, viajero. No busques la salida con prisa; disfruta de las sombras de los cipreses y deja que el eco de las fuentes te susurre secretos de otros siglos."
        },
        {
          id: 'pedralbes-jardins',
          title: "Jardins de Pedralbes: El Lujo Real",
          hints: [
            "Busca los senderos de gravilla fina donde la realeza paseaba bajo la sombra de cedros centenarios.",
            "Encuentra la fuente de Hércules, una obra oculta de Gaudí redescubierta hace pocos años.",
            "Dirígete a los Jardines del Palacio de Pedralbes, en la Avenida Diagonal."
          ],
          description: "Jardín de palacio señorial.",
          coords: [41.3875, 2.1185],
          info: "Antigua finca de la familia Güell cedida a la corona, destaca por su elegancia afrancesada y su colección de árboles exóticos.",
          imageUrl: "assets/images/parques/pedralbes.jpg",
          theatricalInfo: "¡Bienvenidos a la corte! Aquí el aire es más fresco y los problemas del mundo parecen quedar fuera de estas verjas de hierro forjado."
        },
        {
          id: 'cervantes-roserar',
          title: "Parc de Cervantes: El Perfume de la Rosa",
          hints: [
            "Busca el lugar donde miles de rosas compiten cada año por ser la más bella de Barcelona.",
            "Encuentra la atalaya verde al final de la Diagonal donde el perfume se siente incluso antes de entrar.",
            "Visita la Rosaleda del Parque de Cervantes."
          ],
          description: "Colección botánica de rosas.",
          coords: [41.3840, 2.1070],
          info: "Especializado en rosales, alberga más de 10.000 ejemplares de unas 2.000 especies diferentes, ofreciendo un espectáculo visual y olfativo único.",
          imageUrl: "assets/images/parques/cervantes.jpg",
          theatricalInfo: "Inclinad la nariz y cerrad los ojos. Cada pétalo cuenta una historia de paciencia y cuidado. Es el triunfo de la belleza delicada sobre el cemento de la gran ciudad."
        },
        {
          id: 'joan-brossa-jardins',
          title: "Jardins de Joan Brossa: El Eco de la Risa",
          hints: [
            "Busca el lugar en la montaña donde antes volaban las vagonetas de una montaña rusa y ahora domina el silencio de los pinos.",
            "Encuentra el mirador que rinde homenaje a un poeta visual entre las ruinas de un antiguo parque de atracciones.",
            "Sube a los Jardines de Joan Brossa en Montjuïc."
          ],
          description: "Parque paisajista recuperado.",
          coords: [41.3685, 2.1625],
          info: "Ubicados en el solar del antiguo Parque de Atracciones de Montjuïc, estos jardines combinan vegetación mediterránea con elementos lúdicos y poesía visual.",
          imageUrl: "assets/images/parques/brossa.jpg",
          theatricalInfo: "Si escucháis con atención, todavía se oyen los gritos de alegría de los niños de antaño. El tiempo lo devora todo, pero la naturaleza siempre reclama su lugar con una sonrisa verde."
        },
        {
          id: 'palauet-albeniz',
          title: "Palauet Albéniz (Palacio Real de Montjuïc)",
          hints: [
            "Busca la residencia oficial de la Familia Real en Barcelona, escondida entre los jardines de la montaña.",
            "Encuentra un palacete rodeado de fuentes y estatuas que se construyó para la Exposición de 1929.",
            "Dirígete a los Jardines de Joan Maragall, situados entre el Estadio Olímpico y el Museo Nacional (MNAC)."
          ],
          description: "Residencia real y jardines de gala.",
          coords: [41.3665, 2.1530],
          info: "El Palauet Albéniz es la residencia oficial de la Familia Real Española en sus estancias en Barcelona. Está rodeado por los Jardines de Joan Maragall, unos de los más elegantes y clásicos de la ciudad, con fuentes, esculturas de mármol y amplias avenidas de césped.",
          imageUrl: "assets/images/parques/albeniz.jpg",
          theatricalInfo: "¡Bienvenidos a la corte de Montjuïc! Aquí el aire huele a distinción y las fuentes cantan para los reyes. Un lugar donde la naturaleza se ordena con la elegancia de un baile de palacio."
        }
      ]
    },
    'catedral-mar': {
      title: 'La Catedral del Mar (S. XIV)',
      duration: '2h 30min',
      distance: '3.8 km',
      description: 'Sigue los pasos de Arnau Estanyol en la Barcelona medieval. Desde su llegada como un niño huido hasta la construcción de la basílica que los bastaixos alzaron con su propio esfuerzo.',
      center: [41.3835, 2.1815],
      zoom: 16,
      stops: [
        {
          id: 'santa-maria-mar-novela',
          title: "Basílica de Santa Maria del Mar",
          hints: [
            "Busca el templo que los habitantes de la Ribera construyeron para ellos mismos, sin ayuda de reyes ni obispos.",
            "Encuentra la iglesia gótica que es el corazón de la novela de Ildefonso Falcones.",
            "Dirígete a la Plaza de Santa Maria, en el barrio del Born."
          ],
          description: "El símbolo del esfuerzo del pueblo.",
          coords: [41.3835, 2.1815],
          info: "Eje central de la novela. Fue construida en solo 54 años (1329-1383) gracias al trabajo de los estibadores del puerto (bastaixos) y las donaciones de los mercaderes.",
          imageUrl: "assets/images/novelas/catedral_mar.jpg",
          theatricalInfo: "¡Mirad estas piedras! Cada una fue traída desde Montjuïc en las espaldas de hombres libres. Esta no es la catedral de los ricos, es la nuestra, la de los hombres del mar."
        },
        {
          id: 'fossar-moreres-novela',
          title: "Fossar de les Moreres",
          hints: [
            "Busca el lugar junto a la basílica donde Arnau trabajó como bastaix, cargando las pesadas piedras destinadas al templo.",
            "Encuentra la plaza que antaño fue el cementerio de la parroquia y hoy es un memorial.",
            "Ve al lado este de la Basílica de Santa Maria del Mar."
          ],
          description: "El lugar de trabajo de los bastaixos.",
          coords: [41.3838, 2.1825],
          info: "En la época de la novela, esta zona era un hervidero de actividad donde los bastaixos descargaban las piedras que llegaban por mar para la construcción de la iglesia.",
          imageUrl: "assets/images/novelas/fossar.jpg",
          theatricalInfo: "Aquí el sudor se mezcla con la sal. No hay descanso para un bastaix mientras falte una piedra por colocar. ¡Ánimo, hermanos, que la Virgen nos mira!"
        },
        {
          id: 'carrer-montcada-novela',
          title: "Carrer de Montcada",
          hints: [
            "Camina por la calle de los palacios donde Arnau vivió sus días de mayor gloria y riqueza como cambista.",
            "Busca la vía medieval más prestigiosa de Barcelona, llena de patios góticos y escudos de armas.",
            "Carrer de Montcada, sede actual del Museo Picasso."
          ],
          description: "La calle de la nobleza y el éxito.",
          coords: [41.3845, 2.1810],
          info: "Arnau Estanyol pasó de ser un bastaix a ser un hombre rico con un palacio en esta calle, el eje señorial de la Barcelona del siglo XIV.",
          imageUrl: "assets/images/novelas/montcada.jpg",
          theatricalInfo: "¿Recordáis cuando no tenía nada? Ahora los nobles me saludan, pero bajo mi túnica de seda sigo sintiendo el peso de las piedras de la Virgen."
        },
        {
          id: 'el-call-novela',
          title: "El Call (Barrio Judío)",
          hints: [
            "Busca el laberinto de calles donde Arnau encontró la protección y la sabiduría de Hasdai.",
            "Encuentra el barrio que sufrió los terribles ataques de 1391, un momento clave en el destino de los personajes.",
            "Dirígete al cruce de las calles Sant Domènec del Call y Marlet."
          ],
          description: "Refugio y conflicto.",
          coords: [41.3825, 2.1755],
          info: "La relación de Arnau con la comunidad judía es fundamental en la trama, especialmente su amistad con Hasdai y cómo esto influye en su juicio ante la Inquisición.",
          imageUrl: "assets/images/novelas/call.jpg",
          theatricalInfo: "En estas calles estrechas vive un pueblo sabio y perseguido. Aquí aprendí que la fe tiene muchas caras, pero el dolor y la amistad son iguales para todos."
        },
        {
          id: 'placa-del-rei-novela',
          title: "Plaça del Rei",
          hints: [
            "Acude a la plaza donde el Rey Pedro el Ceremonioso dictaba justicia y donde Arnau tuvo que enfrentarse a sus acusadores.",
            "Busca el recinto palaciego que representa el poder absoluto de la Corona de Aragón en la Edad Media.",
            "Plaza del Rey, junto al Salón del Tinell."
          ],
          description: "El escenario del poder real.",
          coords: [41.3842, 2.1775],
          info: "Lugar de juicios y recepciones reales. En la novela, representa el poder institucional frente al que Arnau debe defender su honor y su vida.",
          imageUrl: "assets/images/novelas/placa_rei.jpg",
          theatricalInfo: "Bajo estos muros fríos, la palabra del Rey es ley. He subido estas gradas con el corazón encogido, sabiendo que aquí la justicia a veces olvida al hombre sencillo."
        },
        {
          id: 'casa-verdugo-novela',
          title: "La Casa del Verdugo",
          hints: [
            "Busca el rincón más sombrío junto a la muralla, donde vivía aquel a quien nadie quería saludar.",
            "Encuentra la pequeña casa adosada a la torre romana, hogar del ejecutor de las sentencias del Rey.",
            "Dirígete a la Plaza del Rey y mira hacia el rincón que conecta con la Catedral."
          ],
          description: "El hogar del ejecutor de Barcelona.",
          coords: [41.3841, 2.1768],
          info: "Históricamente, el verdugo de la ciudad vivía en esta pequeña vivienda apartada, ya que su oficio era considerado impuro. En la novela, representa el destino final de muchos de los que caían en desgracia.",
          imageUrl: "assets/images/novelas/verdugo.jpg",
          theatricalInfo: "No me miréis a los ojos... nadie lo hace. Vivo entre los muros y la muerte, cumpliendo la ley que otros dictan desde sus tronos de seda. Mi casa es pequeña, pero mi sombra es larga."
        },
        {
          id: 'llotja-mar-novela',
          title: "Llotja de Mar",
          hints: [
            "Busca el lugar donde los mercaderes de Barcelona dominaban el comercio del Mediterráneo.",
            "Encuentra el edificio gótico donde se regulaban los fletes y seguros marítimos que hicieron rica a la ciudad.",
            "Paseo de Isabel II, frente al puerto."
          ],
          description: "El motor económico de Barcelona.",
          coords: [41.3825, 2.1835],
          info: "Sede del Consolat de Mar. En la novela, refleja el auge comercial de Barcelona y el sistema financiero en el que Arnau prospera.",
          imageUrl: "assets/images/novelas/llotja.jpg",
          theatricalInfo: "Barcelona mira al mar y el mar le devuelve oro. En este salón se decide el destino de las naves que van a Oriente. Es el pulso de una ciudad que no tiene límites."
        }
      ]
    },
    'quijote': {
      title: 'Don Quijote en Barcelona (1615)',
      duration: '2h 00min',
      distance: '4.2 km',
      description: 'Acompaña al ingenioso hidalgo en su única visita al mar. Descubre la Barcelona que Cervantes elogió como "archivo de la cortesía" y el escenario donde el Quijote colgó sus armas para siempre.',
      center: [41.3800, 2.1800],
      zoom: 15,
      stops: [
        {
          id: 'playa-barceloneta-quijote',
          title: "Playa de la Barceloneta (El Primer Mar)",
          hints: [
            "Busca el lugar donde el caballero de la triste figura vio por primera vez el horizonte infinito del mar Mediterráneo.",
            "Encuentra la arena que fue testigo de la llegada de Don Quijote y Sancho en la víspera de San Juan.",
            "Dirígete al tramo de playa frente al actual barrio de la Barceloneta."
          ],
          description: "Donde el Quijote descubrió el mar.",
          coords: [41.3785, 2.1925],
          info: "En el capítulo LXI de la segunda parte, Don Quijote llega a la playa de Barcelona un amanecer de San Juan, quedando maravillado por la inmensidad del mar y las galeras reales.",
          imageUrl: "assets/images/novelas/quijote_playa.jpg",
          theatricalInfo: "¡Mirad, Sancho, amigo! El azul no tiene fin. Aquí el mundo es más ancho y el aire huele a sal y libertad. ¿Oís el saludo de las galeras?"
        },
        {
          id: 'casa-cervantes',
          title: "Casa de Cervantes",
          hints: [
            "Busca el edificio frente al puerto donde la tradición dice que Miguel de Cervantes se alojó durante su estancia en la ciudad.",
            "Encuentra la casa señorial del Paseo de Colón que guarda la memoria del autor del Quijote.",
            "Paseo de Colón, número 2."
          ],
          description: "La morada del autor.",
          coords: [41.3812, 2.1815],
          info: "Aunque no hay pruebas documentales definitivas, la tradición barcelonesa sitúa la residencia de Cervantes en este edificio renacentista durante su visita en 1610.",
          imageUrl: "assets/images/novelas/casa_cervantes.jpg",
          theatricalInfo: "Bajo este techo descansó la pluma que me dio la vida. Cervantes miró este mismo puerto mientras soñaba mis nuevas desventuras."
        },
        {
          id: 'fuente-santa-anna-quijote',
          title: "Fuente de Santa Anna (El primer trago)",
          hints: [
            "Busca la fuente más antigua de Barcelona, donde los viajeros calmaban su sed al entrar en la ciudad vieja.",
            "Encuentra el abrevadero de piedra del siglo XIV decorado con escudos, hoy rodeado de tiendas modernas.",
            "Dirígete al cruce de la Avenida Portal de l'Àngel con la calle de Santa Anna."
          ],
          description: "La fuente donde bebió el hidalgo.",
          coords: [41.3855, 2.1720],
          info: "Construida en 1356, es la fuente más antigua de la ciudad. La tradición literaria cuenta que Don Quijote y Sancho se detuvieron aquí para refrescarse tras su largo viaje desde las áridas tierras de Castilla.",
          imageUrl: "assets/images/novelas/santa_anna.jpg",
          theatricalInfo: "¡Bebed, Sancho! Esta agua sabe a gloria tras tanto polvo y sol. Barcelona nos recibe con su cristal más puro antes de mostrarnos sus maravillas."
        },
        {
          id: 'imprenta-quijote',
          title: "La Imprenta de Sebastián de Cormellas",
          hints: [
            "Busca el lugar donde Don Quijote visitó una imprenta y se sorprendió al ver cómo se corregían los pliegos de su propia historia.",
            "Encuentra la calle de los libreros y mercaderes en el corazón del Barrio Gótico.",
            "Dirígete al Carrer del Call, muy cerca de la Plaza Sant Jaume."
          ],
          description: "Donde los libros cobran vida.",
          coords: [41.3822, 2.1762],
          info: "En el capítulo LXII, Don Quijote visita una imprenta real en Barcelona. Históricamente, la imprenta de Cormellas en el Carrer del Call era la más importante de la época.",
          imageUrl: "assets/images/novelas/imprenta.jpg",
          theatricalInfo: "¡Asombraos, Sancho! Aquí los pensamientos se graban en plomo y el papel vuela cargado de verdades... y de algunas mentiras que dicen ser mi vida."
        },
        {
          id: 'drassanes-quijote',
          title: "Drassanes Reials (Las Galeras)",
          hints: [
            "Visita las atarazanas donde se construían los grandes barcos del Rey que Don Quijote tanto admiró en el puerto.",
            "Busca el recinto gótico que guardaba las galeras listas para surcar el Mediterráneo.",
            "Entra en el actual Museo Marítimo de Barcelona."
          ],
          description: "El poder naval de la época.",
          coords: [41.3755, 2.1745],
          info: "Don Quijote y Sancho visitaron las galeras del puerto, maravillados por la organización y la fuerza de los remeros. Las Drassanes eran el centro neurálgico de esta actividad.",
          imageUrl: "assets/images/novelas/drassanes.jpg",
          theatricalInfo: "¡Ved qué orden! ¡Qué grandeza! Estos barcos son los castillos del mar, y sus remos son las alas que llevan la gloria de España hasta el fin del mundo."
        },
        {
          id: 'duelo-final-quijote',
          title: "El Duelo con el Caballero de la Blanca Luna",
          hints: [
            "Busca el escenario de la derrota final, donde Don Quijote fue vencido y obligado a abandonar la caballería andante.",
            "Encuentra el tramo de arena donde el bachiller Sansón Carrasco, disfrazado de caballero, puso fin a las aventuras del hidalgo.",
            "Playa de la Barceloneta, cerca del actual Somorrostro."
          ],
          description: "El fin de la aventura.",
          coords: [41.3825, 2.1950],
          info: "En las playas de Barcelona, el Caballero de la Blanca Luna derrota a Don Quijote y le impone la condición de regresar a su aldea y no tomar las armas durante un año.",
          imageUrl: "assets/images/novelas/duelo.jpg",
          theatricalInfo: "Aquí cayeron mis armas, pero no mi honor. Dulcinea es la más hermosa y yo el más desdichado caballero, pero la verdad de mi amor no necesita de mi espada para ser eterna."
        }
      ]
    },
    'hemingway': {
      title: 'Ernest Hemingway: Crónica de Guerra',
      duration: '2h 15min',
      distance: '4.5 km',
      description: 'Revive la Barcelona de la Guerra Civil a través de los ojos del premio Nobel. Descubre los lugares donde Hemingway escribió sus crónicas, bebió su legendaria absenta y fue testigo del drama de una ciudad bajo el fuego.',
      center: [41.3850, 2.1750],
      zoom: 15,
      stops: [
        {
          id: 'hotel-majestic-hemingway',
          title: "Hotel Majestic",
          hints: [
            "Busca el lujoso hotel del Passeig de Gràcia que fue el hogar de los corresponsales extranjeros durante la guerra.",
            "Encuentra el balcón desde el cual Hemingway observaba la vida de una ciudad que se negaba a rendirse.",
            "Passeig de Gràcia, número 68."
          ],
          description: "La base de los corresponsales.",
          coords: [41.3928, 2.1645],
          info: "Durante su estancia como corresponsal de la North American Newspaper Alliance (NANA), Hemingway se alojó en este hotel, convirtiéndose en un centro de reunión para intelectuales y periodistas internacionales.",
          imageUrl: "assets/images/novelas/majestic.jpg",
          theatricalInfo: "¡Camarero, otro whisky! Desde este balcón la guerra parece una película de sombras, pero el ruido de los motores en el cielo nos recuerda que la muerte no descansa. Escribir aquí es como disparar palabras contra el olvido."
        },
        {
          id: 'placa-catalunya-hemingway',
          title: "Antiguo Hotel Colón (Plaça Catalunya)",
          hints: [
            "Ve al lugar donde se alzaba el hotel que Hemingway describió como el epicentro de los primeros combates de 1936.",
            "Busca el solar que hoy ocupa un gran centro comercial, frente al corazón de la plaza.",
            "Plaça de Catalunya, lado montaña."
          ],
          description: "Escenario de la revolución.",
          coords: [41.3875, 2.1705],
          info: "Hemingway documentó la importancia estratégica del Hotel Colón, tomado por las milicias al inicio de la guerra. Sus crónicas capturaron la euforia revolucionaria de los primeros días.",
          imageUrl: "assets/images/novelas/colon.jpg",
          theatricalInfo: "Mirad esa plaza. Aquí el mundo cambió en una mañana. Los fusiles sustituyeron a los bastones y el pueblo se hizo dueño de sus calles. Barcelona olía a pólvora y a esperanza, un aroma que nunca olvidaré."
        },
        {
          id: 'bar-marsella-hemingway',
          title: "Bar Marsella",
          hints: [
            "Busca la taberna más antigua del Raval, donde el tiempo parece haberse congelado en el siglo XIX.",
            "Encuentra el rincón donde Hemingway buscaba refugio en el fondo de un vaso de absenta entre crónica y crónica.",
            "Carrer de Sant Ramon, número 1."
          ],
          description: "Refugio de absenta y bohemia.",
          coords: [41.3785, 2.1715],
          info: "Frecuentado por artistas y escritores, el Bar Marsella es una parada obligatoria en la ruta de Hemingway. Se dice que el autor disfrutaba de la atmósfera decadente y del ritual de la absenta en este local.",
          imageUrl: "assets/images/novelas/marsella.jpg",
          theatricalInfo: "Un terrón de azúcar, un poco de agua fría... y el hada verde empieza a bailar. Aquí el ruido de las bombas no llega. En el Marsella, la guerra es solo una historia que alguien cuenta en la barra de al lado."
        },
        {
          id: 'liceu-hemingway',
          title: "Gran Teatre del Liceu",
          hints: [
            "Busca el templo de la ópera que Hemingway mencionó en sus despachos de guerra, destacando que incluso en el asedio, la cultura no moría.",
            "Encuentra el edificio de las Ramblas que simbolizaba la resistencia moral de la ciudad.",
            "La Rambla, número 51."
          ],
          description: "Cultura bajo el asedio.",
          coords: [41.3800, 2.1735],
          info: "Hemingway se maravilló de que los teatros y la ópera siguieran funcionando durante los bombardeos, viendo en ello un signo de la indomable voluntad barcelonesa.",
          imageUrl: "assets/images/novelas/liceu_h.jpg",
          theatricalInfo: "Las luces se apagan, pero la música empieza. Fuera caen trozos de acero, pero dentro, Wagner nos hace sentir eternos. Barcelona es una ciudad que prefiere morir cantando que vivir en silencio."
        },
        {
          id: 'port-bcn-hemingway',
          title: "Puerto de Barcelona",
          hints: [
            "Dirígete al lugar por donde Hemingway llegó y partió de la ciudad, viendo los barcos que traían ayuda y llevaban esperanza.",
            "Busca el muelle donde las grúas y los mástiles se recortan contra el cielo mediterráneo.",
            "Moll de la Fusta, frente a la estatua de Colón."
          ],
          description: "La puerta al mundo.",
          coords: [41.3765, 2.1785],
          info: "El puerto fue una zona crítica durante la guerra y el punto de entrada para los voluntarios de las Brigadas Internacionales que Hemingway tanto admiraba.",
          imageUrl: "assets/images/novelas/puerto_h.jpg",
          theatricalInfo: "Adiós, Barcelona. Tus muelles se quedan atrás, pero tu valor viaja conmigo en mi maleta. He visto a hombres de todo el mundo venir a morir aquí por una idea. El mar guarda vuestros secretos, yo guardaré vuestra historia."
        }
      ]
    },
    'joan-marse': {
      title: 'Joan Marsé: La BCN de Pijoaparte',
      duration: '2h 30min',
      distance: '5.2 km',
      description: 'Recorre la geografía sentimental de Juan Marsé. Desde las barracas del Carmel hasta los chalets del Guinardó, descubre los escenarios donde el Pijoaparte soñó con conquistar a Teresa y a una Barcelona que le cerraba las puertas.',
      center: [41.4150, 2.1650],
      zoom: 14,
      stops: [
        {
          id: 'bunkers-marse',
          title: "Bunkers del Carmel (Las Barracas)",
          hints: [
            "Busca la cima desde donde se domina toda Barcelona, donde antaño crecía un barrio de barracas y sueños rotos.",
            "Encuentra el balcón de la ciudad donde el Pijoaparte miraba las luces del centro imaginando su ascenso social.",
            "Sube hasta las antiguas baterías antiaéreas del Turó de la Rovira."
          ],
          description: "Escenario de la supervivencia.",
          coords: [41.4192, 2.1618],
          info: "El barrio del Carmel y sus barracas son el epicentro del universo de Marsé. Aquí vivía Manolo 'el Pijoaparte', el carismático charnego que personifica la lucha de clases en la Barcelona de posguerra.",
          imageUrl: "assets/images/novelas/carmel_marse.jpg",
          theatricalInfo: "Mirad abajo... ¿veis esas luces? Allí está la Barcelona de verdad, la que sale en los periódicos. Nosotros solo somos la sombra que proyecta la montaña. Pero algún día, esa ciudad será mía, aunque solo sea por una tarde."
        },
        {
          id: 'carrer-segle-xx',
          title: "Carrer del Segle XX (Guinardó)",
          hints: [
            "Busca la calle que representa el límite entre los barrios humildes y la zona de los chalets de la burguesía.",
            "Encuentra la vía donde el Pijoaparte robaba motos para impresionar a las chicas del centro.",
            "Dirígete al Carrer del Segle XX, en el barrio del Guinardó."
          ],
          description: "Frontera de clases sociales.",
          coords: [41.4165, 2.1725],
          info: "Esta calle es emblemática en 'Últimas tardes con Teresa'. Representa la frontera física y social que el protagonista intenta cruzar constantemente.",
          imageUrl: "assets/images/novelas/segle_xx.jpg",
          theatricalInfo: "Un pie aquí y otro allá. En esta calle se sabe quién es quién por el ruido de los motores. Si robas una Sanglas, eres un rey por un momento; si vuelves a pie, vuelves a ser nadie."
        },
        {
          id: 'parc-guinardo-marse',
          title: "Parc del Guinardó (Plaza Sanllehy)",
          hints: [
            "Busca el rincón del parque donde se celebraban los bailes populares bajo la mirada de los pinos.",
            "Encuentra el escenario de los encuentros furtivos y las verbenas que Marsé describió con tanta nostalgia.",
            "Ve a la entrada del Parque del Guinardó por la Plaza Sanllehy."
          ],
          description: "Escenario de verbenas y amores.",
          coords: [41.4135, 2.1610],
          info: "El Parque del Guinardó es el escenario de momentos clave en las novelas de Marsé, un lugar de ocio para las clases populares donde la música y el baile servían para olvidar la dureza del día a día.",
          imageUrl: "assets/images/novelas/parc_guinardo.jpg",
          theatricalInfo: "¿Oís la orquesta? El pasodoble lo tapa todo. Bajo estos árboles las mentiras suenan a verdad si las dices al oído. Es el refugio de los que no tienen salón donde bailar."
        },
        {
          id: 'biblioteca-marse',
          title: "Biblioteca Juan Marsé",
          hints: [
            "Busca el templo de la memoria dedicado al autor, con vistas a los tejados del Carmel que él tanto amó.",
            "Encuentra el centro cultural que guarda el legado literario del cronista de la Barcelona de los barrios.",
            "Carrer de Murtra, número 135."
          ],
          description: "El legado del cronista.",
          coords: [41.4215, 2.1585],
          info: "Inaugurada en honor al escritor, esta biblioteca es un punto de referencia cultural en el barrio del Carmel y ofrece una de las mejores panorámicas de la geografía literaria de Marsé.",
          imageUrl: "assets/images/novelas/biblioteca_marse.jpg",
          theatricalInfo: "Aquí las palabras han encontrado casa. Mis personajes ya no corren por las calles, descansan en los estantes. Si queréis conocerme de verdad, leed lo que escribí sobre el polvo y la gloria de estas colinas."
        },
        {
          id: 'cinema-delicias',
          title: "Antiguo Cinema Delicias",
          hints: [
            "Busca el solar donde se alzaba el cine de barrio que fue el refugio de los aventis y las historias soñadas por los niños de posguerra.",
            "Encuentra el rincón del Guinardó donde la magia de la pantalla hacía olvidar el hambre y el frío.",
            "Carrer de la Mare de Déu de Montserrat, cerca de la calle Periodistes."
          ],
          description: "La fábrica de sueños: Las Aventis.",
          coords: [41.4155, 2.1705],
          info: "El Cinema Delicias es una referencia constante en la obra de Marsé, especialmente en 'Si te dicen que caí', como el lugar donde nacían las 'aventis' (historias inventadas por los niños).",
          imageUrl: "assets/images/novelas/cine_delicias.jpg",
          theatricalInfo: "¡Silencio, que empieza la película! En la oscuridad del Delicias todos éramos iguales. Inventábamos vidas mejores porque la nuestra nos quedaba pequeña. ¿Queréis que os cuente una aventi?"
        }
      ]
    },
    'rodoreda': {
      title: 'Mercè Rodoreda: El universo de Colometa',
      duration: '2h 30min',
      distance: '4.2 km',
      description: 'Recorre los escenarios de "La plaça del Diamant" y la vida de la escritora catalana más universal. Un viaje por la Gràcia de posguerra y el imaginario floral de Rodoreda.',
      center: [41.4030, 2.1550],
      zoom: 15,
      stops: [
        {
          id: 'placa-diamant',
          title: "Plaça del Diamant: El Baile",
          hints: [
            "Busca la plaza que da nombre a la novela más famosa de la literatura catalana.",
            "Encuentra la escultura de 'La Colometa', la protagonista que aquí conoció a Quimet durante un baile de fiesta mayor.",
            "Dirígete a la Plaza del Diamant, en el barrio de Gràcia."
          ],
          description: "Escenario principal de la novela.",
          coords: [41.4042, 2.1565],
          info: "En esta plaza comienza la historia de Natalia (Colometa). La escultura de Xavier Medina-Campeny rinde homenaje al personaje y a la obra de Rodoreda.",
          imageUrl: "assets/images/novelas/placa_diamant.jpg",
          theatricalInfo: "¡Colometa! ¿Quieres bailar? El aire olía a albahaca y la música lo llenaba todo. No sabía que en esta plaza mi vida iba a cambiar para siempre, como una paloma que echa a volar y ya no sabe volver al nido."
        },
        {
          id: 'mercat-llibertat',
          title: "Mercat de la Llibertat: La Vida Diaria",
          hints: [
            "Busca el mercado modernista donde Natalia compraba el bacalao y los garbanzos para Quimet.",
            "Encuentra la joya de hierro y ladrillo diseñada por Pasqual Vila i Esterrich en 1888.",
            "Ve al Mercat de la Llibertat, cerca de la parada de Gràcia."
          ],
          description: "Escenario de la vida cotidiana.",
          coords: [41.3995, 2.1545],
          info: "Los mercados de Gràcia son fundamentales en la obra de Rodoreda, reflejando el pulso de la vida trabajadora y las penurias de la posguerra.",
          imageUrl: "assets/images/novelas/mercat_llibertat.jpg",
          theatricalInfo: "El ruido de los carritos, el olor a pescado fresco... Aquí venía a buscar el sustento mientras el mundo se desmoronaba fuera. Entre estas paradas, los problemas parecían más pequeños si el bacalao era tierno."
        },
        {
          id: 'casa-rodoreda',
          title: "Carrer de Bertran: El Origen",
          hints: [
            "Busca la casa donde nació la escritora en 1908, en un barrio de torres y jardines.",
            "Encuentra el lugar donde la pequeña Mercè descubrió su amor por las flores y la lengua catalana en el jardín de su abuelo.",
            "Dirígete al Carrer de Bertran, número 5, en el barrio de Sant Gervasi."
          ],
          description: "Lugar de nacimiento de la autora.",
          coords: [41.4085, 2.1435],
          info: "Mercè Rodoreda nació y creció en esta casa, rodeada de un jardín que inspiraría la constante presencia de flores y naturaleza en toda su obra literaria.",
          imageUrl: "assets/images/novelas/casa_rodoreda.jpg",
          theatricalInfo: "Aquí, entre los jazmines y los rosales de mi abuelo, nacieron mis primeras historias. El jardín era mi mundo entero, un paraíso de colores que luego la guerra y el exilio me arrebataron."
        },
        {
          id: 'virreina-rodoreda',
          title: "Plaça de la Virreina: La Soledad",
          hints: [
            "Busca la plaza dominada por una iglesia parroquial donde Natalia buscaba refugio y silencio.",
            "Encuentra el lugar donde el tiempo parece detenerse bajo los árboles, cerca de donde la protagonista vivió sus años más duros.",
            "Ve a la Plaza de la Virreina, frente a la Iglesia de Sant Joan de Gràcia."
          ],
          description: "Escenario de introspección.",
          coords: [41.4035, 2.1575],
          info: "Esta plaza representa la Gràcia más íntima y espiritual, escenario de muchos de los paseos solitarios de los personajes de Rodoreda.",
          imageUrl: "assets/images/novelas/virreina.jpg",
          theatricalInfo: "A veces, el silencio es lo único que nos queda. Venía aquí a mirar las palomas y a pensar en los que ya no estaban. En esta plaza aprendí que Barcelona es una ciudad de heridas que nunca terminan de cerrar."
        },
        {
          id: 'iec-rodoreda',
          title: "Jardí Mercè Rodoreda (IEC)",
          hints: [
            "Termina tu ruta en un jardín secreto dedicado a la memoria de la autora, lleno de las flores que ella tanto amaba.",
            "Busca el patio del Institut d'Estudis Catalans donde las camelias y las mimosas rinden homenaje a sus palabras.",
            "Entra en el Carrer del Carme y busca el jardín del antiguo Hospital de la Santa Creu."
          ],
          description: "Memorial floral y literario.",
          coords: [41.3815, 2.1700],
          info: "Este jardín suspendido alberga las plantas y flores mencionadas en la obra de Rodoreda, manteniendo vivo su legado literario y botánico.",
          imageUrl: "assets/images/novelas/jardi_rodoreda.jpg",
          theatricalInfo: "He vuelto a mi jardín. A través de mis palabras, las flores nunca mueren. Si me buscáis, me encontraréis aquí, entre el aroma de las glicinas y el susurro de las hojas que cuentan mi historia."
        }
      ]
    },
    'sombra-viento': {
      title: 'La Sombra del Viento',
      duration: '3h 00min',
      distance: '6.5 km',
      description: 'Adéntrate en la Barcelona gótica y misteriosa de Carlos Ruiz Zafón. Sigue a Daniel Sempere desde el Cementerio de los Libros Olvidados hasta los secretos que esconden las mansiones del Tibidabo.',
      center: [41.3850, 2.1750],
      zoom: 14,
      stops: [
        {
          id: 'libreria-sempere',
          title: "Carrer de Santa Anna (Librería Sempere e Hijos)",
          hints: [
            "Busca la calle donde Daniel Sempere vivía y trabajaba en la librería de viejo de su padre.",
            "Encuentra la vía que une el bullicio de Portal de l'Àngel con la tranquilidad de la iglesia románica de Santa Anna.",
            "Dirígete al Carrer de Santa Anna, cerca de la Plaza de Catalunya."
          ],
          description: "El hogar de los Sempere.",
          coords: [41.3858, 2.1718],
          info: "Aunque la librería es ficticia, Zafón sitúa el hogar y el negocio familiar en esta calle, capturando la atmósfera de las librerías de viejo de la Barcelona de posguerra.",
          imageUrl: "assets/images/novelas/sempere.jpg",
          theatricalInfo: "Entrad en el aroma del papel viejo y el polvo de los siglos. Mi padre dice que los libros tienen alma, el alma de quien los escribió y de quienes los leyeron y soñaron con ellos."
        },
        {
          id: 'cementerio-libros',
          title: "Carrer de l'Arc del Teatre (El Cementerio de los Libros Olvidados)",
          hints: [
            "Busca el callejón oscuro donde un portal discreto esconde el mayor tesoro literario de Barcelona.",
            "Encuentra la entrada al lugar donde los libros que nadie recuerda esperan a ser adoptados.",
            "Ve al Carrer de l'Arc del Teatre, cerca de las Ramblas y el Raval."
          ],
          description: "Donde el misterio comienza.",
          coords: [41.3782, 2.1745],
          info: "Escenario icónico de la novela. Es aquí donde Daniel es conducido por su padre para elegir el libro que cambiará su vida para siempre: 'La Sombra del Viento' de Julián Carax.",
          imageUrl: "assets/images/novelas/arc_del_teatre.jpg",
          theatricalInfo: "Este es un lugar sagrado, Daniel. Cada libro que ves aquí fue el mejor amigo de alguien. Aquí se guardan los sueños olvidados para que el tiempo no los borre del todo."
        },
        {
          id: 'plaza-reial-fermin',
          title: "Plaça Reial (Encuentro con Fermín)",
          hints: [
            "Busca la plaza porticada donde Daniel encuentra a Fermín Romero de Torres viviendo entre los cartones de las fuentes.",
            "Encuentra el rincón donde la sabiduría de la calle y la lealtad incondicional se cruzaron en el camino de los Sempere.",
            "Dirígete a la Plaza Real, bajo los soportales cerca de la fuente."
          ],
          description: "Lealtad y sabiduría de calle.",
          coords: [41.3800, 2.1750],
          info: "La Plaza Real es el escenario donde aparece Fermín, personaje vital que aporta humor y profundidad a la búsqueda de la verdad sobre Julián Carax.",
          imageUrl: "assets/images/novelas/reial_zafon.jpg",
          theatricalInfo: "¡A sus pies, caballero! El mundo es un pañuelo y Barcelona el bolsillo donde nos encontramos todos. Fermín Romero de Torres, a su entera disposición para desentrañar misterios o vaciar botellas."
        },
        {
          id: '4-gats-zafon',
          title: "Els 4 Gats (Confidencias)",
          hints: [
            "Busca la taberna donde Daniel y Gustavo Barceló compartían secretos literarios rodeados de la sombra de los grandes artistas.",
            "Encuentra el edificio modernista de la calle Montsió que es el refugio de los bibliófilos de la novela.",
            "Carrer de Montsió, número 3."
          ],
          description: "Cónclave de bibliófilos.",
          coords: [41.3858, 2.1738],
          info: "Els 4 Gats es un punto de encuentro frecuente en la obra, representando la conexión de los personajes con la tradición cultural y artística de la ciudad.",
          imageUrl: "assets/images/novelas/4gats_zafon.jpg",
          theatricalInfo: "Hablemos bajo, Daniel. En Barcelona las paredes oyen y los libros a veces gritan. Aquí, entre el humo del café, la verdad sobre Carax empieza a asomar sus garras."
        },
        {
          id: 'felip-neri-zafon',
          title: "Plaça de Sant Felip Neri (Tragedia y Silencio)",
          hints: [
            "Busca la plaza que Daniel describe como una herida en el corazón del Barrio Gótico, marcada por el silencio y el recuerdo.",
            "Encuentra el lugar donde el destino de los personajes se cruza con las cicatrices de la guerra en la piedra.",
            "Dirígete a la Plaza de Sant Felip Neri."
          ],
          description: "El alma melancólica de BCN.",
          coords: [41.3830, 2.1755],
          info: "Zafón utiliza la carga emocional y trágica de esta plaza para reflejar los momentos más íntimos y dolorosos de la trama, vinculando el pasado de la ciudad con el de sus personajes.",
          imageUrl: "assets/images/novelas/felip_neri_zafon.jpg",
          theatricalInfo: "Barcelona es una ciudad de espejos y sombras. En esta plaza el tiempo se queda atrapado en los agujeros de la metralla. Es el lugar donde los secretos vienen a morir... o a renacer."
        },
        {
          id: 'mansio-aldaya',
          title: "Avenida del Tibidabo (Palacete de los Aldaya)",
          hints: [
            "Sube a la zona alta para encontrar la mansión maldita que guarda las respuestas finales al enigma de Julián Carax.",
            "Encuentra la avenida de los palacetes señoriales, donde los jardines esconden fantasmas del pasado burgués.",
            "Dirígete a la zona alta de la Avenida del Tibidabo."
          ],
          description: "El fin del laberinto.",
          coords: [41.4125, 2.1350],
          info: "La mansión de los Aldaya es el escenario del clímax de la novela. Representa la decadencia de una clase social y el refugio final de los secretos más oscuros de la historia.",
          imageUrl: "assets/images/novelas/aldaya.jpg",
          theatricalInfo: "¡Deteneos ante este portón! Aquí la piedra guarda el eco de un amor prohibido y una venganza que ha esperado décadas. Bienvenidos al corazón de la Sombra del Viento."
        }
      ]
    },
    'inquisicion': {
      title: 'La Inquisición: La Sombra del Santo Oficio',
      duration: '2h 00min',
      distance: '3.5 km',
      description: 'Descubre los rincones más oscuros de la Barcelona inquisitorial. Desde el Palacio del Lloctinent hasta las plazas de los Autos de Fe, recorre la historia de la censura y el miedo en la ciudad.',
      center: [41.3840, 2.1770],
      zoom: 16,
      stops: [
        {
          id: 'palau-lloctinent',
          title: "Palau del Lloctinent: Sede del Santo Oficio",
          hints: [
            "Busca el edificio renacentista junto a la catedral que fue la sede principal del Tribunal de la Inquisición en Barcelona.",
            "Encuentra el patio con artesonado de madera donde los inquisidores dictaban sus decretos.",
            "Dirígete al Palau del Lloctinent en la Plaça del Rei."
          ],
          description: "Centro de mando inquisitorial.",
          coords: [41.3840, 2.1770],
          info: "A partir del siglo XVI, este edificio albergó el Tribunal del Santo Oficio, convirtiéndose en el símbolo del control religioso y social.",
          imageUrl: "assets/images/historia/lloctinent.jpg",
          theatricalInfo: "Bajo este techo de madera noble se decide el destino de las almas. El silencio de estos muros guarda los secretos de miles de delaciones. Que tu fe sea firme, pues aquí los ojos del Santo Oficio nunca descansan."
        },
        {
          id: 'placa-del-rei-auto',
          title: "Plaça del Rei: El Escenario del Juicio",
          hints: [
            "Ve a la gran plaza real donde se celebraban las ceremonias públicas de condena, conocidas como Autos de Fe.",
            "Busca el lugar donde los 'reconciliados' vestían el sambenito antes de conocer su castigo frente a la nobleza.",
            "Dirígete al centro de la Plaça del Rei."
          ],
          description: "Lugar de los Autos de Fe.",
          coords: [41.3842, 2.1775],
          info: "La Plaza del Rey era el escenario perfecto para los Autos de Fe públicos, diseñados para impresionar a la población y mostrar el poder del tribunal.",
          imageUrl: "assets/images/historia/placa_rei.jpg",
          theatricalInfo: "¡Mirad el tablado! Hoy el sol no brilla para todos. Entre cánticos y fuego, se lee la sentencia de los que osaron dudar. Es un teatro de penitencia donde el miedo es el principal protagonista."
        },
        {
          id: 'el-call-inquisicio',
          title: "Carrer de Marlet: El Destino de los Conversos",
          hints: [
            "Adéntrate en el antiguo barrio judío, allí donde la sospecha sobre los falsos conversos era más intensa.",
            "Busca la calle donde las piedras hebreas son testigos de la persecución de aquellos que practicaban su fe en la sombra.",
            "Encuentra la lápida medieval en el Carrer de Marlet."
          ],
          description: "Persecución de los conversos.",
          coords: [41.3825, 2.1755],
          info: "La Inquisición centró gran parte de sus esfuerzos iniciales en vigilar a los judíos conversos para asegurar que no regresaran a sus antiguas prácticas.",
          imageUrl: "assets/images/historia/call.jpg",
          theatricalInfo: "Huele a miedo en estas calles estrechas. Un candil encendido el viernes, un plato de carne evitado... cualquier gesto es una prueba. En el Call, hasta las sombras parecen delatarte."
        },
        {
          id: 'carceres-secretes',
          title: "Cárceles de la Inquisición",
          hints: [
            "Busca el lugar cerca de la puerta de San Ivo donde los prisioneros esperaban su juicio en celdas aisladas del mundo exterior.",
            "Encuentra el rincón sombrío junto a los muros de la catedral donde el tiempo se detenía para los acusados.",
            "Ve a la Plaça de Sant Iu, junto a la entrada del Museo Marès."
          ],
          description: "Lugar de detención y tortura.",
          coords: [41.3838, 2.1765],
          info: "Las cárceles secretas eran famosas por su dureza. A diferencia de las cárceles civiles, aquí los presos estaban incomunicados hasta su juicio final.",
          imageUrl: "assets/images/historia/carceles.jpg",
          theatricalInfo: "El frío de estas celdas entra en los huesos. Aquí no hay abogados, solo tu conciencia y el inquisidor que espera tu confesión. El silencio es tan denso que puedes oír el latido de tu propio arrepentimiento."
        },
        {
          id: 'escudo-inquisicion',
          title: "El Escudo del Santo Oficio: Espada y Olivo",
          hints: [
            "Busca el emblema de piedra que vigilaba la entrada a los calabozos, donde los símbolos de la justicia y la misericordia se retuercen bajo una cruz.",
            "Encuentra la fachada junto al patio del museo de las esculturas, donde una espada y una rama de olivo flanquean el escudo de la inquisición.",
            "Dirígete a la Plaza de Sant Iu, frente a la pared exterior del Museo Frederic Marès."
          ],
          description: "Simbología del control religioso.",
          coords: [41.3839, 2.1763],
          info: "Este escudo representa la ideología de la Inquisición: la espada para los pecadores impenitentes y la rama de olivo para los que se reconcilian. Es uno de los pocos emblemas que se conservan 'in situ' en la ciudad.",
          imageUrl: "assets/images/historia/escudo.jpg",
          theatricalInfo: "¡Bajad la mirada! Este escudo no es un adorno, es una advertencia. La espada corta la carne del herético mientras el olivo ofrece una paz que a menudo llega demasiado tarde. El Santo Oficio no olvida, y su marca en la piedra es eterna."
        },
        {
          id: 'placa-sant-jaume-conflicte',
          title: "Plaça de Sant Jaume: El Conflicto de Poderes",
          hints: [
            "Acude al centro del poder civil donde los inquisidores a menudo chocaban con las instituciones catalanas.",
            "Busca el lugar donde la Inquisición intentó imponer su autoridad incluso sobre los diputados de la Generalitat.",
            "Plaça Sant Jaume, entre el Ayuntamiento y el Palau de la Generalitat."
          ],
          description: "Lucha entre poder eclesiástico y civil.",
          coords: [41.3828, 2.1770],
          info: "La Inquisición no siempre fue bien recibida por las autoridades locales, provocando constantes conflictos jurisdiccionales durante los siglos XVI y XVII.",
          imageUrl: "assets/images/historia/sant_jaume.jpg",
          theatricalInfo: "Dos palacios, dos poderes... y una cruz verde que lo vigila todo. Incluso los más poderosos tiemblan cuando el Santo Oficio llama a su puerta. En esta plaza, la fe y la ley libran su batalla más sorda."
        }
      ]
    },
    'insolita-secreta': {
      title: 'Barcelona Insólita y Secreta',
      duration: '2h 00min',
      distance: '3.2 km',
      description: 'Un recorrido por los detalles más curiosos, leyendas urbanas y rincones olvidados del Barrio Gótico y la Ribera. Mira donde nadie mira y descubre la otra Barcelona.',
      center: [41.3830, 2.1760],
      zoom: 16,
      stops: [
        {
          id: 'calavera-bisbe',
          title: "La Calavera del Carrer del Bisbe",
          hints: [
            "Busca el puente más fotografiado de la ciudad, pero no mires su arquitectura, mira bajo su arco.",
            "Encuentra la calavera atravesada por una daga. Dicen que si alguien la retira, la ciudad se hundirá.",
            "Dirígete al Puente del Obispo (Carrer del Bisbe)."
          ],
          description: "Misterio del puente neogótico.",
          coords: [41.3833, 2.1764],
          info: "Aunque el puente parece medieval, fue construido in 1928. El arquitecto Joan Rubió escondió una calavera auténtica con una daga, cuya leyenda dice que Barcelona caerá si alguien la extrae.",
          imageUrl: "assets/images/insolita/calavera.jpg",
          theatricalInfo: "¡No la toques! La daga guarda el equilibrio de nuestras murallas. Dicen que el arquitecto la puso allí como una maldición silenciosa contra los que criticaron su obra."
        },
        {
          id: 'buzon-tortugas',
          title: "El Buzón de las Tortugas",
          hints: [
            "Busca la casa de un alto cargo eclesiástico que tiene una ventana al mundo de la justicia.",
            "Encuentra el buzón modernista donde las tortugas y las golondrinas libran una batalla simbólica.",
            "Ve a la Casa de l'Ardiaca, frente a la Catedral."
          ],
          description: "Simbología de Lluís Domènech i Montaner.",
          coords: [41.3838, 2.1758],
          info: "Diseñado por Domènech i Montaner, el buzón muestra tres golondrinas (la justicia debería ser rápida) y una tortuga (la realidad burocrática es lenta).",
          imageUrl: "assets/images/insolita/buzon.jpg",
          theatricalInfo: "La justicia vuela en mis sueños, pero camina con caparazón en los papeles. Este buzón es la queja silenciosa de un artista contra la lentitud de los hombres."
        },
        {
          id: 'cana-barcelona',
          title: "La Cana: La Medida de la Ciudad",
          hints: [
            "Busca una marca en la piedra de la catedral que servía para evitar engaños en el mercado medieval.",
            "Encuentra la ranura de 1,55 metros que era la ley para todos los mercaderes de telas.",
            "Dirígete a la pared exterior de la Catedral, cerca de la Pia Almoina."
          ],
          description: "Estándar de medida medieval.",
          coords: [41.3842, 2.1762],
          info: "La 'Cana de Barcelona' era la unidad de medida oficial. Los mercaderes debían comprobar sus varas de medir contra esta marca grabada en la piedra del templo.",
          imageUrl: "assets/images/insolita/cana.jpg",
          theatricalInfo: "¡Ni un dedo más, ni un dedo menos! Aquí se mide la verdad del comercio. Si tu tela no encaja en esta hendidura, mejor que recojas tus bártulos antes de que llegue el alguacil."
        },
        {
          id: 'columnas-ocultas',
          title: "El Templo dentro de un Piso",
          hints: [
            "Busca un portal normal en una calle estrecha donde los gigantes de Roma siguen en pie.",
            "Encuentra las cuatro columnas de 9 metros de altura que han sobrevivido 2.000 años dentro de una comunidad de vecinos.",
            "Entra en el Carrer del Paradís número 10."
          ],
          description: "Columnas del Templo de Augusto.",
          coords: [41.3835, 2.1772],
          info: "Estas columnas del siglo I a.C. permanecieron ocultas durante siglos integradas en edificios de viviendas, hasta que fueron redescubiertas y restauradas.",
          imageUrl: "assets/images/insolita/columnas.jpg",
          theatricalInfo: "Entrad en silencio... Pisáis el patio de unos vecinos, pero también el santuario de un Emperador. Roma nunca se fue, solo se escondió tras los tendederos y las cocinas."
        },
        {
          id: 'calle-moscas',
          title: "Carrer de les Mosques: El Estrecho",
          hints: [
            "Busca la calle más estrecha de Barcelona, tan pequeña que casi podrías tocar ambas paredes con los brazos abiertos.",
            "Su nombre recuerda a los insectos que acudían atraídos por los antiguos puestos de salazón.",
            "Busca esta callejuela en el barrio del Born, cerca de Santa Maria del Mar."
          ],
          description: "La calle más estrecha.",
          coords: [41.3838, 2.1828],
          info: "Con apenas poco más de un metro de ancho, era una vía de servicio para el mercado donde se acumulaban desperdicios, de ahí su nombre 'Calle de las Moscas'.",
          imageUrl: "assets/images/insolita/moscas.jpg",
          theatricalInfo: "¡Encoged la barriga! En esta calle el aire se detiene y los secretos se susurran de pared a pared sin esfuerzo. Es el hilo que une las casas de la Ribera."
        },
        {
          id: 'fuente-caras',
          title: "Las Caras de la Fuente de las Tres Gracias",
          hints: [
            "Observa de cerca a las damas que bailan en la fuente de la gran plaza real.",
            "Busca el detalle que las diferencia: una de ellas tiene una mirada que no es como las demás.",
            "Examina la fuente central de la Plaza Reial."
          ],
          description: "Curiosidad escultórica.",
          coords: [41.3800, 2.1750],
          info: "Cuenta la leyenda que una de las Tres Gracias tiene el rostro de la hija del escultor, que murió joven, dándole una expresión más melancólica y realista.",
          imageUrl: "assets/images/insolita/gracias.jpg",
          theatricalInfo: "¿La ves? Entre el bronce y el agua, hay una tristeza que no pertenece a los dioses. Es el amor de un padre convertido en metal para que su hija nunca deje de bailar en Barcelona."
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
          info: "Conjunto funerario conocido como la Vía Sepulcral Romana, situado fuera de las murallas de la ciudad. Se extendía a lo largo de una de las vías de salida y contenía monumentos como aras, estelas y cupas para los ciudadanos enterrados allí.",
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
    },
    'iglesias-conventos': {
      title: 'Iglesias y Conventos (S. XII - XIV)',
      duration: '3h 30min',
      distance: '5.8 km',
      description: 'Un viaje espiritual por el tiempo. Descubre desde los monasterios románicos escondidos en el Raval hasta las majestuosas basílicas del gótico catalán.',
      center: [41.3830, 2.1750],
      zoom: 15,
      stops: [
        {
          id: 'sant-pau-camp-iglesia',
          title: "Sant Pau del Camp",
          hints: [
            "Busca el monasterio románico más antiguo de la ciudad, un oasis de paz entre los muros del Raval.",
            "Encuentra el claustro con arcos lobulados que parece un trozo de campo en medio de la ciudad vieja.",
            "Dirígete al Carrer de Sant Pau, cerca de la Avenida Paral·lel."
          ],
          description: "Joyas del románico barcelonés.",
          coords: [41.3750, 2.1695],
          info: "Este antiguo monasterio benedictino es el ejemplo mejor conservado del románico en Barcelona, con un claustro único en Europa por sus arcos de influencia mudéjar.",
          imageUrl: "assets/images/arquitectura/sant_pau_camp.jpg",
          theatricalInfo: "Entrad en el silencio. Estos muros de piedra tosca han visto pasar siglos de oración mientras la ciudad crecía fuera de sus huertos. Es el latido más antiguo de Barcelona."
        },
        {
          id: 'santa-maria-pi',
          title: "Basílica de Santa Maria del Pi",
          hints: [
            "Busca el rosetón más grande de Barcelona, que domina una plaza donde antaño crecía un pino solitario.",
            "Encuentra la iglesia de una sola nave inmensa, joya del gótico catalán más puro y austero.",
            "Ve a la Plaza del Pi, en el corazón del barrio gótico."
          ],
          description: "Gótico catalán puro.",
          coords: [41.3835, 2.1738],
          info: "Construida en el siglo XIV, destaca por su imponente rosetón (reconstruido tras la guerra) y su gran nave única de 16,5 metros de ancho.",
          imageUrl: "assets/images/arquitectura/santa_maria_pi.jpg",
          theatricalInfo: "¡Mirad hacia arriba! No hay columnas que estorben la vista. Es la elegancia de la piedra que se eleva buscando la luz a través de su gran ojo de cristal."
        },
        {
          id: 'catedral-bcn',
          title: "Catedral de la Santa Creu i Santa Eulàlia",
          hints: [
            "Busca el corazón de la diócesis, donde trece ocas blancas custodian el claustro en memoria de una joven mártir.",
            "Encuentra la fachada neogótica que corona la colina sagrada de la ciudad amurallada.",
            "Dirígete al Pla de la Seu, frente a la gran escalinata de la Catedral."
          ],
          description: "Sede episcopal de Barcelona.",
          coords: [41.3840, 2.1762],
          info: "Aunque la fachada es del siglo XIX, el grueso del edificio es gótico (siglos XIII-XV). En su cripta descansa Santa Eulalia, la patrona histórica de la ciudad.",
          imageUrl: "assets/images/arquitectura/catedral.jpg",
          theatricalInfo: "Bajo estas bóvedas late la fe de los siglos. Escuchad el graznido de las ocas; ellas son las guardianas del honor de nuestra pequeña mártir Eulàlia."
        },
        {
          id: 'justo-pastor',
          title: "Basílica de los Santos Mártires Justo y Pastor",
          hints: [
            "Busca una de las iglesias con más historia cristiana de la ciudad, donde dos niños mártires guardan la entrada al Barrio Gótico.",
            "Encuentra la plaza con la fuente más antigua de Barcelona, justo frente a una basílica gótica de torre única.",
            "Dirígete a la Plaza de Sant Just, muy cerca de la Plaza Sant Jaume."
          ],
          description: "Una de las parroquias más antiguas.",
          coords: [41.3828, 2.1778],
          info: "Fundada en el siglo IV, es uno de los lugares de culto cristiano más antiguos de Barcelona. El edificio actual es gótico del siglo XIV y destaca por su austeridad y su impresionante retablo de la Pasión.",
          imageUrl: "assets/images/arquitectura/justo_pastor.jpg",
          theatricalInfo: "Entrad en el corazón del tiempo. Aquí los siglos se amontonan uno sobre otro, desde los primeros cristianos hasta hoy. Es el rincón más humilde y a la vez más sagrado de nuestra ciudad."
        },
        {
          id: 'basilica-merce',
          title: "Basílica de Nuestra Señora de la Merced",
          hints: [
            "Busca el templo de la co-patrona de Barcelona, cuya cúpula está coronada por una estatua de bronce que mira al mar.",
            "Encuentra la iglesia barroca construida sobre un antiguo convento medieval de la orden de los mercedarios.",
            "Dirígete a la Plaza de la Mercè, en el extremo sur del Barrio Gótico."
          ],
          description: "Santuario de la patrona de la ciudad.",
          coords: [41.3790, 2.1795],
          info: "Construida en el siglo XVIII sobre una iglesia gótica anterior, es el principal exponente del barroco en Barcelona. Alberga la imagen de la Virgen de la Merced, patrona de la diócesis y co-patrona de la ciudad.",
          imageUrl: "assets/images/arquitectura/merce.jpg",
          theatricalInfo: "¡Madre de los cautivos! Bajo esta cúpula de oro y esperanza, Barcelona reza a su protectora. Sentid el aroma a incienso y mar; aquí la fe se viste de gala para celebrar la libertad."
        },
        {
          id: 'santa-anna',
          title: "Monasterio de Santa Anna",
          hints: [
            "Busca un claustro secreto a pocos pasos del bullicio de Plaza Cataluña, donde el tiempo parece haberse detenido en el siglo XII.",
            "Encuentra la iglesia que combina el románico tardío con el gótico inicial en un rincón escondido cerca del centro.",
            "Entra por el Carrer de Santa Anna y busca el pasaje que conduce al monasterio."
          ],
          description: "Transición románico-gótica.",
          coords: [41.3860, 2.1715],
          info: "Antigua sede de la Orden del Santo Sepulcro en Barcelona, conserva un claustro de gran belleza y una tranquilidad inaudita en pleno centro comercial.",
          imageUrl: "assets/images/arquitectura/santa_anna.jpg",
          theatricalInfo: "Cruza el umbral y deja que el ruido de la ciudad se apague. Aquí, la piedra respira una paz que solo los antiguos caballeros del Sepulcro sabían guardar."
        },
        {
          id: 'santa-maria-mar-iglesia',
          title: "Basílica de Santa Maria del Mar",
          hints: [
            "Busca la 'Catedral del Mar', alzada con el sudor de los cargadores del puerto que trajeron las piedras desde Montjuïc.",
            "Encuentra la iglesia más equilibrada y bella del gótico catalán, símbolo del orgullo del barrio de la Ribera.",
            "Ve a la Plaza de Santa Maria, junto al Fossar de les Moreres."
          ],
          description: "La joya del gótico catalán.",
          coords: [41.3835, 2.1815],
          info: "Construida en tiempo récord (54 años) en el siglo XIV, es el mejor ejemplo de gótico catalán por su simetría y la esbeltez de sus columnas.",
          imageUrl: "assets/images/arquitectura/santa_maria_mar.jpg",
          theatricalInfo: "Sentid el peso de la piedra... y la ligereza del alma. Esta iglesia no la hicieron los reyes, la hicimos nosotros, los hombres del mar, con nuestras propias manos."
        },
        {
          id: 'capella-marcus',
          title: "Capilla de Marcús",
          hints: [
            "Busca una de las capillas más pequeñas y antiguas de la ciudad, que servía de parada a los correos que salían de Barcelona.",
            "Encuentra el pequeño edificio románico en la encrucijada de los antiguos caminos que iban hacia Francia.",
            "Dirígete al Carrer de Carders, en su unión con el Carrer de Montcada."
          ],
          description: "Hospitalidad medieval.",
          coords: [41.3855, 2.1818],
          info: "Fundada en el siglo XII por el burgués Bernat Marcús, formaba parte de un hospital y una posta de correos a caballo, de las primeras de Europa.",
          imageUrl: "assets/images/arquitectura/marcus.jpg",
          theatricalInfo: "Aquí se encomendaban los viajeros antes de cruzar las murallas. Pequeña, humilde y eterna, esta capilla ha visto partir a miles hacia caminos inciertos."
        },
        {
          id: 'sant-andreu-palomar',
          title: "Parroquia de Sant Andreu de Palomar",
          hints: [
            "Busca la gran cúpula que domina el antiguo pueblo que se unió a Barcelona, famosa por su altura y sus reconstrucciones.",
            "Encuentra el templo neoclásico donde se firmó el documento de los Segadores en el siglo XVII.",
            "Dirígete a la Plaza de Orfila, en el corazón del barrio de Sant Andreu."
          ],
          description: "Símbolo de la identidad de Sant Andreu.",
          coords: [41.4355, 2.1910],
          info: "Situada en el antiguo municipio de Sant Andreu de Palomar, esta iglesia destaca por su imponente cúpula, una de las más grandes de la ciudad. El edificio actual combina elementos neoclásicos y detalles modernistas en su fachada e interior.",
          imageUrl: "assets/images/arquitectura/sant_andreu.jpg",
          theatricalInfo: "Bajo esta cúpula late el orgullo de un pueblo que nunca olvidó sus raíces. Mirad hacia arriba: es el cielo de Sant Andreu capturado en piedra y luz para gloria de sus vecinos."
        },
        {
          id: 'pedralbes-monasterio',
          title: "Real Monasterio de Santa María de Pedralbes",
          hints: [
            "Busca el monasterio real fundado por la reina Elisenda, un tesoro del gótico catalán alejado del ruido del centro.",
            "Encuentra el claustro gótico de tres pisos más grande y bello del mundo, donde las clarisas han vivido durante siglos.",
            "Sube hasta el barrio de Pedralbes, al final de la Avenida que lleva su nombre."
          ],
          description: "Joya del gótico catalán.",
          coords: [41.3955, 2.1125],
          info: "Fundado en 1327 por la reina Elisenda de Montcada, es uno de los mejores ejemplos del gótico catalán. Su claustro de tres plantas es uno de los más amplios y armoniosos del mundo, y el monasterio conserva tesoros artísticos y la tumba de su fundadora.",
          imageUrl: "assets/images/arquitectura/pedralbes.jpg",
          theatricalInfo: "La reina Elisenda quiso que este fuera su refugio y su descanso eterno. Caminad por estas galerías y sentiréis la paz de un tiempo en el que la piedra hablaba de eternidad y belleza absoluta."
        }
      ]
    },
    'gaudi': {
      title: 'Antoni Gaudí: El Genio (1883 - 1926)',
      duration: '4h 00min',
      distance: '8.2 km',
      description: 'Recorre las obras maestras del arquitecto que transformó Barcelona. Desde sus primeros encargos hasta su obra póstuma, descubre el simbolismo y la naturaleza en la arquitectura de Gaudí.',
      center: [41.3950, 2.1650],
      zoom: 13,
      stops: [
        {
          id: 'casa-vicens',
          title: "Casa Vicens",
          hints: [
            "Busca el primer gran encargo de Gaudí, una explosión de azulejos verdes y blancos con influencias orientales.",
            "Encuentra la casa que parece un oasis mudéjar en el corazón del barrio de Gràcia.",
            "Dirígete al Carrer de les Carolines, en el barrio de Gràcia."
          ],
          description: "La primera obra maestra.",
          coords: [41.4035, 2.1505],
          info: "Construida entre 1883 y 1885 como casa de veraneo, es la obra que marca el inicio del estilo único de Gaudí, combinando elementos hispano-árabes con el naciente modernismo.",
          imageUrl: "assets/images/arquitectura/vicens.jpg",
          theatricalInfo: "¡Bienvenidos a mi primer sueño de azulejo! Aquí las flores de caléndula no se marchitan nunca porque las he atrapado en el barro cocido."
        },
        {
          id: 'palau-guell',
          title: "Palau Güell",
          hints: [
            "Busca el palacio urbano que Gaudí construyó para su gran mecenas, con chimeneas mágicas que parecen árboles de colores.",
            "Encuentra la fachada austera que esconde un interior lleno de lujo y techos que imitan el cielo estrellado.",
            "Baja por las Ramblas y gira por el Carrer Nou de la Rambla."
          ],
          description: "La residencia del mecenas.",
          coords: [41.3788, 2.1742],
          info: "Eusebi Güell encargó este palacio para ampliar su casa de las Ramblas. Destaca su cúpula central parabólica y la innovadora ventilación del sótano para las caballerizas.",
          imageUrl: "assets/images/arquitectura/palau_guell.jpg",
          theatricalInfo: "Entrad en la mansión de mi amigo Eusebi. Aquí el hierro se retuerce como ramas y las chimeneas bailan sobre el tejado para que los vecinos miren al cielo."
        },
        {
          id: 'casa-batllo-gaudi',
          title: "Casa Batlló",
          hints: [
            "Busca la casa de los huesos, con una fachada que brilla como las escamas de un pez bajo el sol.",
            "Encuentra el edificio donde el tejado es el lomo de un dragón vencido por la espada de San Jorge.",
            "Passeig de Gràcia, en plena Manzana de la Discordia."
          ],
          description: "La leyenda de Sant Jordi en piedra.",
          coords: [41.3915, 2.1648],
          info: "Gaudí transformó un edificio convencional en esta obra de arte orgánica, donde cada detalle evoca el mundo marino y la leyenda de Sant Jordi.",
          imageUrl: "assets/images/arquitectura/batllo.jpg",
          theatricalInfo: "¿Oís el rugido? El dragón descansa sobre el tejado. He convertido la piedra en esqueleto y el cristal en mar para que Barcelona nunca olvide sus leyendas."
        },
        {
          id: 'la-pedrera-gaudi',
          title: "Casa Milà (La Pedrera)",
          hints: [
            "Busca la montaña de piedra ondulada que no tiene ni una sola línea recta en su fachada.",
            "Encuentra el edificio cuya azotea está habitada por gigantes de piedra que guardan las chimeneas.",
            "Cruce de Passeig de Gràcia con la calle Provença."
          ],
          description: "La cantera de piedra de Gaudí.",
          coords: [41.3953, 2.1619],
          info: "Representa la etapa de plenitud naturalista de Gaudí. Es famosa por sus patios interiores de luz y su innovadora estructura de columnas sin muros de carga.",
          imageUrl: "assets/images/arquitectura/pedrera.jpg",
          theatricalInfo: "He traído la montaña de Montserrat al centro de la ciudad. Dicen que es una cantera... ¡y lo es! Una cantera de sueños donde la piedra fluye como el agua."
        },
        {
          id: 'park-guell-gaudi',
          title: "Park Güell",
          hints: [
            "Busca la salamandra de mosaico de colores que guarda la escalera de una ciudad jardín fallida.",
            "Encuentra el bosque de columnas dóricas que sostienen una gran plaza con vistas a toda Barcelona.",
            "Sube hasta el Carrer d'Olot, en la ladera del Monte Carmelo."
          ],
          description: "La naturaleza hecha arquitectura.",
          coords: [41.4145, 2.1528],
          info: "Concebido como una urbanización de lujo integrada en la naturaleza, terminó siendo un parque público lleno de formas orgánicas y simbolismo masónico y religioso.",
          imageUrl: "assets/images/arquitectura/park_guell.jpg",
          theatricalInfo: "Aquí el cemento imita los nidos de los pájaros y el banco se retuerce como una serpiente de colores. Es mi regalo a la ciudad: un bosque de piedra donde la imaginación no tiene límites."
        },
        {
          id: 'sagrada-familia-gaudi',
          title: "Sagrada Família",
          hints: [
            "Busca la Biblia de piedra cuyas torres buscan el cielo como los dedos de un gigante.",
            "Encuentra el templo donde las columnas parecen árboles y la luz del sol pinta el interior con los colores del arcoíris.",
            "Dirígete al Carrer de Mallorca, entre las calles Marina y Sardenya."
          ],
          description: "El templo expiatorio eterno.",
          coords: [41.4035, 2.1745],
          info: "La obra a la que Gaudí dedicó los últimos 40 años de su vida. Es una síntesis de todo su conocimiento arquitectónico y una expresión máxima de su fe religiosa.",
          imageUrl: "assets/images/arquitectura/sagrada_familia.jpg",
          theatricalInfo: "Mi cliente no tiene prisa. Las piedras subirán poco a poco hasta tocar las nubes. He puesto en este templo todo lo que sé de la vida, de la fe y de esta tierra catalana."
        }
      ]
    },
    'gaudi-desconocido': {
      title: 'Gaudí Desconocido',
      duration: '3h 30min',
      distance: '9.5 km',
      description: 'Descubre los tesoros menos conocidos de Antoni Gaudí. Desde sus primeros trabajos municipales hasta edificios residenciales y religiosos que a menudo pasan desapercibidos.',
      center: [41.3900, 2.1500],
      zoom: 13,
      stops: [
        {
          id: 'farolas-reial',
          title: "Farolas de la Plaza Real",
          hints: [
            "Busca el primer encargo oficial del Ayuntamiento a un joven Gaudí recién graduado.",
            "Encuentra las farolas de seis brazos coronadas por el casco de Mercurio y dos serpientes enroscadas.",
            "Dirígete al centro de la Plaza Real, cerca de las Ramblas."
          ],
          description: "Su primer trabajo público.",
          coords: [41.3800, 2.1752],
          info: "Diseñadas en 1878, estas farolas muestran ya la atención al detalle y el uso del simbolismo (Mercurio como dios del comercio) que caracterizarían su obra futura.",
          imageUrl: "assets/images/arquitectura/farolas.jpg",
          theatricalInfo: "Aquí empezó todo. Con estas luces quise iluminar el camino de una Barcelona que despertaba al progreso. Hierro y mito fundidos en el corazón de la plaza."
        },
        {
          id: 'cascada-ciutadella',
          title: "Cascada Monumental de la Ciutadella",
          hints: [
            "Busca la gran fuente del parque donde un estudiante llamado Antoni ayudó a diseñar la gruta y los detalles hidráulicos.",
            "Encuentra el conjunto escultórico con carros de caballos dorados y una gran concha de piedra.",
            "Dentro del Parque de la Ciutadella."
          ],
          description: "La huella del joven estudiante.",
          coords: [41.3892, 2.1895],
          info: "Gaudí colaboró como ayudante de Josep Fontserè en 1875. Se le atribuyen el diseño de la gruta bajo la cascada y algunos detalles de forja y jardinería.",
          imageUrl: "assets/images/arquitectura/cascada.jpg",
          theatricalInfo: "Aprendí del agua y de la fuerza de la piedra antes de volar solo. En esta fuente dejé mis primeros susurros de naturaleza."
        },
        {
          id: 'colegio-teresiana',
          title: "Colegio de las Teresianas",
          hints: [
            "Busca un edificio de ladrillo de una austeridad sorprendente, coronado por pináculos que terminan en cruces de cuatro brazos.",
            "Encuentra el colegio religioso donde Gaudí tuvo que trabajar con un presupuesto muy ajustado, demostrando su genio con materiales humildes.",
            "Dirígete al Carrer de Ganduxer, en la zona alta de la ciudad."
          ],
          description: "Gaudismo austero y espiritual.",
          coords: [41.3995, 2.1345],
          info: "Construido entre 1888 y 1889, destaca por el uso extensivo del ladrillo y el arco parabólico, logrando una gran expresividad con materiales muy económicos.",
          imageUrl: "assets/images/arquitectura/teresinas.jpg",
          theatricalInfo: "La pobreza no está reñida con la belleza. Con ladrillo y fe, levanté un castillo para el espíritu donde la luz entra de forma humilde pero eterna."
        },
        {
          id: 'torre-bellesguard',
          title: "Torre Bellesguard (Casa Figueras)",
          hints: [
            "Busca el castillo neogótico construido sobre las ruinas del palacio del último rey de la dinastía catalana.",
            "Encuentra la casa que parece una fortaleza medieval con una torre esbelta coronada por la bandera catalana.",
            "Sube a los pies de Collserola, en el Carrer de Bellesguard."
          ],
          description: "Homenaje a la historia de Cataluña.",
          coords: [41.4095, 2.1265],
          info: "Construida entre 1900 y 1909 sobre el antiguo palacio del rey Martí l'Humà. Gaudí diseñó una obra que fusiona el gótico con el modernismo, llena de referencias patrióticas.",
          imageUrl: "assets/images/arquitectura/bellesguard.jpg",
          theatricalInfo: "Aquí el pasado respira a través de la piedra. He devuelto la corona a este monte con un castillo que guarda la memoria de nuestros reyes bajo el cielo de Barcelona."
        },
        {
          id: 'puerta-miralles',
          title: "Puerta de la Finca Miralles",
          hints: [
            "Busca un muro ondulado que parece una ola de piedra, con una puerta de hierro que recuerda a la piel de un reptil.",
            "Encuentra el resto de una finca desaparecida, donde hoy una estatua de Gaudí te da la bienvenida.",
            "Passeig de Manuel Girona, en el barrio de Sarrià."
          ],
          description: "La ondulación perfecta.",
          coords: [41.3905, 2.1225],
          info: "Es el único resto de la cerca de la finca Miralles (1901). Presenta un diseño orgánico único con una marquesina de fibrocemento y un muro lobulado de piedra caliza.",
          imageUrl: "assets/images/arquitectura/miralles.jpg",
          theatricalInfo: "La línea recta pertenece a los hombres, la curva a Dios. Ved cómo la pared se mueve como si estuviera viva, invitándoos a pasar a un mundo que ya no existe."
        },
        {
          id: 'pabellones-guell',
          title: "Pabellones Güell",
          hints: [
            "Busca la puerta de hierro más espectacular de Barcelona: un dragón articulado que guarda la entrada a una antigua finca real.",
            "Encuentra el complejo con cúpulas de escamas y una torre con forma de linterna oriental.",
            "Avenida de Pedralbes, cerca de la Ciudad Universitaria."
          ],
          description: "El guardián de hierro.",
          coords: [41.3885, 2.1195],
          info: "Primer encargo importante para Eusebi Güell (1884). El dragón de la puerta representa al guardián del Jardín de las Hespérides de la mitología clásica.",
          imageUrl: "assets/images/arquitectura/pavellons.jpg",
          theatricalInfo: "¡Cuidado con Ladón! El dragón de hierro vigila la entrada a mi paraíso particular. El ladrillo y la fantasía se unen aquí para servir a mi gran mecenas."
        },
        {
          id: 'fuente-hercules',
          title: "Fuente de Hércules",
          hints: [
            "Busca una obra de Gaudí que estuvo 'perdida' y olvidada durante más de 60 años en un jardín real.",
            "Encuentra la fuente de piedra con una cabeza de dragón de hierro que escupe agua sobre un busto del héroe griego.",
            "Entra en los Jardines del Palacio Real de Pedralbes y busca entre la vegetación cerca del palacio."
          ],
          description: "La obra olvidada de Gaudí.",
          coords: [41.3878, 2.1175],
          info: "Construida en 1884, esta fuente permaneció oculta por la maleza y olvidada hasta que fue redescubierta en 1984 durante unos trabajos de restauración de los jardines. Presenta un busto de Hércules sobre un pedestal con el escudo de Cataluña y un caño con forma de dragón chino.",
          imageUrl: "assets/images/arquitectura/fuente_hercules.jpg",
          theatricalInfo: "El tiempo y la hiedra intentaron devorar mi obra, pero el agua nunca dejó de correr. Aquí Hércules descansa bajo la mirada del dragón, en un rincón donde el silencio es el mejor guardián de la belleza."
        }
      ]
    },
    'modernismo-desconocido': {
      title: 'Modernismo Desconocido',
      duration: '3h 00min',
      distance: '7.2 km',
      description: 'Barcelona esconde joyas modernistas que escapan a las rutas habituales. Fachadas de colores vibrantes, edificios con dos caras y el modernismo más tardío te esperan en este recorrido por los tesoros ocultos de la ciudad.',
      center: [41.4000, 2.1550],
      zoom: 14,
      stops: [
        {
          id: '4-gats',
          title: "Els 4 Gats (Casa Martí)",
          hints: [
            "Busca la taberna donde los genios del modernismo se reunían para arreglar el mundo entre sombras y chimeneas.",
            "Encuentra el edificio de estilo gótico nórdico diseñado por Puig i Cadafalch que fue el epicentro de la bohemia barcelonesa.",
            "Dirígete al Carrer de Montsió, muy cerca de la Avenida del Portal de l'Àngel."
          ],
          description: "Cuna de la bohemia modernista.",
          coords: [41.3858, 2.1738],
          info: "Inaugurada en 1897 en los bajos de la Casa Martí, esta taberna fue el punto de encuentro de artistas como Picasso, Casas y Rusiñol. Su arquitectura mezcla el gótico catalán con influencias del norte de Europa.",
          imageUrl: "assets/images/arquitectura/4gats.jpg",
          theatricalInfo: "¡Pasad y pedid una copa! Aquí Picasso dibujó sus primeros menús y la 'Idea' se mezclaba con el humo del tabaco. Es el rincón donde el arte aprendió a ser libre y rebelde."
        },
        {
          id: 'hotel-espana',
          title: "Hotel España (Fonda España)",
          hints: [
            "Busca el comedor más bello de Barcelona, donde las sirenas de piedra y los esgrafiados marinos te transportan al fondo del mar.",
            "Encuentra la obra maestra interior de Domènech i Montaner escondida en una fonda del siglo XIX cerca del Liceu.",
            "Dirígete al Carrer de Sant Pau, a pocos metros de las Ramblas."
          ],
          description: "El Modernismo bajo techo.",
          coords: [41.3803, 2.1730],
          info: "Reformado por Lluís Domènech i Montaner en 1903, su comedor 'Sirenas' es una joya de la decoración modernista con mosaicos, esgrafiados y una chimenea de alabastro de Eusebi Arnau.",
          imageUrl: "assets/images/arquitectura/hotelespana.jpg",
          theatricalInfo: "Entrad en este palacio de la gastronomía. Las sirenas os vigilan desde las paredes y el tiempo se detiene entre cristales y maderas nobles. Es el lujo que la burguesía guardaba para sus mejores banquetes."
        },
        {
          id: 'casa-padua',
          title: "Casa Pàdua",
          hints: [
            "Busca una de las fachadas más coloridas de Barcelona, con esgrafiados rojos y verdes que parecen sacados de un cuento.",
            "Encuentra el edificio que destaca por sus tribunas de hierro y sus motivos florales en una calle estrecha de Sant Gervasi.",
            "Dirígete al Carrer de Pàdua, número 75."
          ],
          description: "La explosión del color.",
          coords: [41.4045, 2.1455],
          info: "Diseñada por Jeroni Granell i Manresa en 1903, es famosa por su vibrante policromía y sus esgrafiados florales, siendo uno de los ejemplos más singulares del modernismo residencial.",
          imageUrl: "assets/images/arquitectura/padua.jpg",
          theatricalInfo: "¡Mirad este rojo! He querido que la primavera viva siempre en estas paredes. En una ciudad de piedra gris, mi casa es un ramo de flores que nunca se marchita."
        },
        {
          id: 'casa-sayrach',
          title: "Casa Sayrach",
          hints: [
            "Busca el último gran edificio del modernismo barcelonés, con una fachada de líneas curvas que anuncian el final de una era.",
            "Encuentra el portal cuyo vestíbulo blanco y orgánico parece el interior de una ballena o una cueva de hielo.",
            "Cruce de la Avenida Diagonal con la calle Enric Granados."
          ],
          description: "El canto del cisne del modernismo.",
          coords: [41.3945, 2.1545],
          info: "Construida en 1918 por Manuel Sayrach, esta obra muestra una clara influencia gaudiniana en sus formas orgánicas y es considerada una de las últimas manifestaciones del movimiento en la ciudad.",
          imageUrl: "assets/images/arquitectura/sayrach.jpg",
          theatricalInfo: "Entrad en mi cueva de luz blanca. Las curvas no terminan, se deslizan como el agua. Es mi adiós a un estilo que nos hizo soñar con formas imposibles."
        },
        {
          id: 'casa-ramos',
          title: "Casa Ramos",
          hints: [
            "Busca el edificio de esgrafiados amarillos que domina una de las plazas más animadas de Gràcia.",
            "Encuentra la casa señorial que Almodóvar eligió para rodar algunas escenas de 'Todo sobre mi madre'.",
            "Dirígete a la Plaza de Lesseps."
          ],
          description: "El modernismo de plaza.",
          coords: [41.4075, 2.1505],
          info: "Obra de Jaume Torres i Grau (1906), destaca por su fachada tripartita y la riqueza de sus esgrafiados amarillentos, así como por sus impresionantes interiores que conservan todo el mobiliario original.",
          imageUrl: "assets/images/arquitectura/ramos.jpg",
          theatricalInfo: "Soy el guardián de la plaza. Mis tres cuerpos miran al sol de la mañana mientras los vecinos pasan bajo mis balcones de hierro forjado. Soy la elegancia que Gràcia merece."
        },
        {
          id: 'el-pinar',
          title: "El Pinar (Casa Arnús)",
          hints: [
            "Busca el castillo de cuento de hadas que vigila la ciudad desde las faldas del Tibidabo, rodeado de un bosque de pinos.",
            "Encuentra la mansión de piedra con torres afiladas que parece transportada desde las leyendas centroeuropeas hasta Barcelona.",
            "Sube por la Avenida del Tibidabo y busca el inicio de la calle Manuel Arnús."
          ],
          description: "El castillo modernista de la zona alta.",
          coords: [41.4158, 2.1328],
          info: "Obra de Enric Sagnier (1903), este palacete destaca por su silueta fortificada y su integración en el entorno natural. Sus tejados de pizarra y su torre del homenaje le dan un aire romántico y legendario.",
          imageUrl: "assets/images/arquitectura/pinar.jpg",
          theatricalInfo: "Soy el guardián de la montaña. Desde mis torres de piedra, veo cómo Barcelona crece y cambia mientras yo permanezco inmutable entre los pinos. Soy el sueño de un castillo hecho realidad bajo el sol mediterráneo."
        },
        {
          id: 'casa-planells',
          title: "Casa Planells",
          hints: [
            "Busca el edificio construido en un solar tan pequeño y estrecho que parece imposible que alguien pueda vivir dentro.",
            "Encuentra la obra maestra de Jujol, el colaborador de Gaudí, que destaca por sus curvas aerodinámicas en un chaflán imposible.",
            "Cruce de la Avenida Diagonal con la calle Sicilia."
          ],
          description: "El ingenio de Jujol.",
          coords: [41.4005, 2.1765],
          info: "Josep Maria Jujol logró en 1924 aprovechar un solar minúsculo para crear una obra de gran ligereza visual y soluciones espaciales ingeniosas, marcando la transición hacia el racionalismo.",
          imageUrl: "assets/images/arquitectura/planells.jpg",
          theatricalInfo: "¿Poca anchura? ¡Ningún problema para la imaginación! He doblado la esquina como si fuera papel para que el aire y la luz inunden cada rincón de este triángulo de piedra."
        },
        {
          id: 'casa-altures',
          title: "Casa de les Altures",
          hints: [
            "Busca un palacete de estilo neomudéjar que parece transportado desde Granada hasta las faldas de los bunkers del Guinardó.",
            "Encuentra el edificio que fue la sede de la compañía de aguas, decorado con ladrillo visto y arcos de herradura.",
            "Parque de las Aguas, en el distrito de Horta-Guinardó."
          ],
          description: "Exotismo en el Guinardó.",
          coords: [41.4125, 2.1655],
          info: "Construida en 1890 por Enric Figueres para el director de la Sociedad General de Aguas de Barcelona, es un ejemplo único de modernismo de inspiración árabe (neomudéjar).",
          imageUrl: "assets/images/arquitectura/altures.jpg",
          theatricalInfo: "Buscad la sombra de mis arcos. He traído el aroma de la Alhambra a estas colinas para que el agua de Barcelona se sienta como en un palacio de sultanes."
        },
        {
          id: 'casa-tosquella',
          title: "Casa Tosquella",
          hints: [
            "Busca una villa de veraneo con un estilo ecléctico que mezcla el modernismo con toques arabescos y una torre singular.",
            "Encuentra la casa que destaca por su jardín y sus decoraciones cerámicas en un rincón tranquilo de Sant Gervasi.",
            "Cruce de la calle Ballester con la Ronda del General Mitre."
          ],
          description: "Eclecticismo modernista.",
          coords: [41.4065, 2.1435],
          info: "Juan Rubio i Bellver reformó esta casa en 1906, convirtiéndola en una joya modernista con una rica decoración de forja, vidrieras y mosaicos que ha sobrevivido milagrosamente a la presión urbanística.",
          imageUrl: "assets/images/arquitectura/tosquella.jpg",
          theatricalInfo: "Soy una superviviente. Los coches pasan veloces por la Ronda, pero yo sigo aquí, guardando el silencio de mis vidrieras y el recuerdo de los veranos de principios de siglo."
        }
      ]
    },
    'racionalismo': {
      title: 'Racionalismo BCN (1929 - 1936)',
      duration: '3h 00min',
      distance: '10.5 km',
      description: 'Descubre la arquitectura del grupo GATCPAC. Una revolución de líneas puras, luz y funcionalidad que buscaba mejorar la vida de los ciudadanos a través del diseño moderno.',
      center: [41.4000, 2.1600],
      zoom: 13,
      stops: [
        {
          id: 'dispensari-antituberculos',
          title: "Dispensari Antituberculós",
          hints: [
            "Busca un edificio que parece una máquina de curar, con grandes ventanales para que entre el sol y el aire puro en el Raval.",
            "Encuentra la obra maestra de Sert y Torres Clavé que rompió con la ornamentación para centrarse en la higiene.",
            "Passatge de Sant Bernat, en el corazón del Raval."
          ],
          description: "Arquitectura al servicio de la salud.",
          coords: [41.3845, 2.1665],
          info: "Construido entre 1934 y 1938, es uno de los edificios más importantes del racionalismo europeo. Su diseño permitía la máxima ventilación y asoleo para combatir la tuberculosis.",
          imageUrl: "assets/images/arquitectura/dispensari.jpg",
          theatricalInfo: "¡Fuera el polvo y las sombras! Aquí la arquitectura es medicina. Líneas blancas, acero y cristal para que la luz del Mediterráneo cure los pulmones de la ciudad."
        },
        {
          id: 'casa-sert-muntaner',
          title: "Edifici de Viviendas Carrer Muntaner",
          hints: [
            "Busca un edificio de viviendas donde la fachada se retira para crear balcones profundos que parecen cajas de luz.",
            "Encuentra la residencia que Josep Lluís Sert diseñó para demostrar que la elegancia está en la proporción y no en el adorno.",
            "Carrer de Muntaner, número 342."
          ],
          description: "El lujo de la razón.",
          coords: [41.3985, 2.1465],
          info: "Construido in 1931, Sert aplicó aquí las teorías de Le Corbusier, creando viviendas funcionales con dúplex y una innovadora estructura metálica vista.",
          imageUrl: "assets/images/arquitectura/casa_sert.jpg",
          theatricalInfo: "Vivir bien es vivir con orden. He quitado las molduras para que podáis ver la belleza de la estructura. Menos es más cuando el espacio fluye libremente."
        },
        {
          id: 'casa-rodriguez-arias',
          title: "Casa Rodríguez Arias",
          hints: [
            "Busca un edificio en una gran avenida que destaca por su simetría perfecta y sus ventanas horizontales corridas.",
            "Encuentra una de las primeras obras del GATCPAC que trajo la estética naval a la arquitectura urbana.",
            "Via Augusta, número 61."
          ],
          description: "La estética de la máquina.",
          coords: [41.4005, 2.1515],
          info: "Obra de Germán Rodríguez Arias (1931), es un ejemplo canónico de racionalismo, con una fachada plana, ausencia total de decoración y un uso audaz de las ventanas en banda.",
          imageUrl: "assets/images/arquitectura/arias.jpg",
          theatricalInfo: "¿Un barco en la ciudad? Mirad mis ventanas horizontales; parece que estemos navegando hacia el futuro. La razón es nuestro timón."
        },
        {
          id: 'edifici-astoria',
          title: "Edifici Astòria",
          hints: [
            "Busca un edificio que albergaba un cine y cuya fachada curva parece la proa de un transatlántico moderno.",
            "Encuentra la obra de Germán Rodríguez Arias que combinó ocio y vivienda bajo las premisas de la vanguardia.",
            "Carrer de París, número 193."
          ],
          description: "Ocio y modernidad.",
          coords: [41.3935, 2.1535],
          info: "Construido en 1934, destaca por su gran marquesina y la integración de un cine en la planta baja, siendo un icono de la vida cosmopolita de la Barcelona de los años 30.",
          imageUrl: "assets/images/arquitectura/astoria.jpg",
          theatricalInfo: "¡Bienvenidos al espectáculo de la modernidad! Bajo este techo, el cine y la vida se unen. Líneas curvas para una ciudad que ya no quiere mirar atrás."
        },
        {
          id: 'casa-bloc-racionalisme',
          title: "Casa Bloc",
          hints: [
            "Busca el gran edificio en forma de 'S' diseñado para que todos los obreros tuvieran luz, aire y un jardín común.",
            "Encuentra el experimento de vivienda social más ambicioso de la República, un bloque que quería dignificar la vida del trabajador.",
            "Passeig de Torras i Bages, en el barrio de Sant Andreu."
          ],
          description: "Vivienda social revolucionaria.",
          coords: [41.4395, 2.1915],
          info: "Obra de Sert, Torres Clavé y Subirana (1932-1936). Rompió con el modelo de manzana cerrada del Eixample para crear un espacio abierto y saludable para las clases trabajadoras.",
          imageUrl: "assets/images/arquitectura/casa_bloc.jpg",
          theatricalInfo: "Esta no es una casa, es un derecho. Aquí no hay patios oscuros ni habitaciones sin aire. Hemos construido un monumento a la dignidad del obrero bajo el sol de Barcelona."
        },
        {
          id: 'pavello-republica',
          title: "Pavelló de la República",
          hints: [
            "Busca la reconstrucción del edificio que representó a España en la Exposición de París de 1937, donde se expuso el Guernica por primera vez.",
            "Encuentra el pabellón de cristal y acero que hoy guarda el Archivo Histórico de la ciudad en un entorno universitario.",
            "Avenida del Cardenal Vidal i Barraquer, en el Valle de Hebrón."
          ],
          description: "Símbolo de la libertad.",
          coords: [41.4285, 2.1485],
          info: "Aunque es una reconstrucción de 1992, respeta fielmente el diseño original de Sert y Lacasa. Fue el grito de libertad de una República que defendía la cultura frente a las bombas.",
          imageUrl: "assets/images/arquitectura/pavello.jpg",
          theatricalInfo: "Aquí la arquitectura es un manifiesto. Cristal para la transparencia, acero para la fuerza. Es el último refugio de un sueño que se negaba a morir."
        }
      ]
    },
    'mercados-historicos': {
      title: 'Catedrales del Pueblo: Mercados Históricos',
      duration: '2h 45min',
      distance: '5.5 km',
      description: 'Barcelona se explica a través de sus mercados. Descubre la arquitectura del hierro y la vida palpitante en estos templos del comercio popular que definen el carácter de cada barrio.',
      center: [41.3850, 2.1750],
      zoom: 14,
      stops: [
        {
          id: 'mercat-boqueria-arq',
          title: "Mercat de Sant Josep (La Boqueria)",
          hints: [
            "Busca el mercado más famoso del mundo, nacido donde antaño se alzaba un convento quemado.",
            "Encuentra el gran arco de entrada modernista de hierro y vidrios de colores que da la bienvenida desde las Ramblas.",
            "La Rambla, número 91."
          ],
          description: "El icono mundial de Barcelona.",
          coords: [41.3817, 2.1715],
          info: "Inaugurado en 1840 sobre el antiguo convento de San José. Su cubierta de hierro actual data de 1914 y es el corazón gastronómico de la ciudad.",
          imageUrl: "assets/images/arquitectura/boqueria.jpg",
          theatricalInfo: "¡Pasad, pasad! Aquí el hambre no existe. Bajo este techo de hierro, la tierra y el mar se dan la mano cada mañana. Es el teatro de la vida en su estado más puro."
        },
        {
          id: 'mercat-sant-antoni-arq',
          title: "Mercat de Sant Antoni",
          hints: [
            "Busca el mercado con planta en forma de cruz griega que ocupa una manzana entera del Eixample.",
            "Encuentra la joya del hierro diseñada por Antoni Rovira i Trias que esconde un baluarte de la antigua muralla en su subsuelo.",
            "Carrer del Comte d'Urgell, número 1."
          ],
          description: "Arquitectura del hierro en estado puro.",
          coords: [41.3785, 2.1625],
          info: "Construido en 1882, fue el primer mercado fuera de las murallas. Su estructura de hierro es de las más impresionantes de Europa por su geometría y dimensiones.",
          imageUrl: "assets/images/arquitectura/sant_antoni.jpg",
          theatricalInfo: "Mirad la simetría... el orden de la razón aplicado al mercado. Aquí el hierro se vuelve ligero para dejar que el barrio respire entre hortalizas y libros viejos."
        },
        {
          id: 'mercat-concepcio-arq',
          title: "Mercat de la Concepció",
          hints: [
            "Busca el mercado de las flores, un edificio elegante de ladrillo y hierro en el corazón del Eixample 'derecho'.",
            "Encuentra el templo del comercio que destaca por sus grandes ventanales y su aire señorial.",
            "Carrer d'Aragó, número 311."
          ],
          description: "Elegancia en el Eixample.",
          coords: [41.3945, 2.1685],
          info: "Inaugurado en 1888, destaca por su gran nave central y el uso decorativo del ladrillo visto, integrándose perfectamente en la trama urbana de Cerdà.",
          imageUrl: "assets/images/arquitectura/concepcio.jpg",
          theatricalInfo: "Huele a flores frescas... Este mercado es el jardín del Eixample. Un lugar donde la burguesía y el pueblo se encuentran bajo el cristal para celebrar la abundancia de la ciudad."
        },
        {
          id: 'mercat-lleytad-arq',
          title: "Mercat de la Llibertat",
          hints: [
            "Busca un mercado modernista en una pequeña plaza de Gràcia, decorado con escudos y motivos vegetales de hierro.",
            "Encuentra la obra de Miquel Pasqual i Tintorer que es el alma del antiguo pueblo de Gràcia.",
            "Plaça de la Llibertat, en Gràcia."
          ],
          description: "Modernismo de barrio.",
          coords: [41.3995, 2.1545],
          info: "Construido en 1888 y reformado en estilo modernista en 1893. Destaca por su rica ornamentación de forja y su escala humana, muy ligada a la vida del barrio.",
          imageUrl: "assets/images/arquitectura/llibertat.jpg",
          theatricalInfo: "¡Gràcia es libre y su mercado también! Pequeño pero orgulloso, como nuestro pueblo. Aquí los detalles de hierro cuentan historias de libertad y trabajo."
        },
        {
          id: 'mercat-galvany-arq',
          title: "Mercat de Galvany",
          hints: [
            "Busca el mercado que parece una catedral de ladrillo, con vidrieras artísticas que iluminan el comercio de lujo.",
            "Encuentra el edificio monumental en la zona alta que destaca por su torre del reloj y su elegancia clásica.",
            "Carrer de Santaló, número 65."
          ],
          description: "La catedral del comercio.",
          coords: [41.3965, 2.1445],
          info: "Inaugurado in 1927, es uno de los mercados más bellos estéticamente. Su interior diáfano y sus grandes vidrieras lo convierten en un espacio casi sagrado dedicado al producto de calidad.",
          imageUrl: "assets/images/arquitectura/galvany.jpg",
          theatricalInfo: "La luz entra aquí como en un templo. No venimos solo a comprar, venimos a admirar la obra bien hecha. Es el triunfo de la forma sobre la función, la catedral de los sabores."
        },
        {
          id: 'mercat-santa-caterina-arq',
          title: "Mercat de Santa Caterina",
          hints: [
            "Busca el tejado ondulado de colores que parece un mar de cerámica flotando sobre el barrio de la Ribera.",
            "Encuentra el mercado que renació con una arquitectura rompedora sobre los restos de un antiguo monasterio.",
            "Avinguda de Francesc Cambó, número 16."
          ],
          description: "Tradición y vanguardia.",
          coords: [41.3862, 2.1785],
          info: "Originalmente de 1848, fue remodelado en 2005 por Enric Miralles y Benedetta Tagliabue. Su cubierta de mosaico hexagonal es un homenaje a la paleta de colores de las frutas y verduras.",
          imageUrl: "assets/images/arquitectura/caterina.jpg",
          theatricalInfo: "¡Mirad qué olas! El color fluye sobre nosotros como si la huerta hubiera inundado el tejado. Aquí el pasado de las piedras del convento baila con el futuro de la arquitectura más libre."
        }
      ]
    },
    'bcn-92': {
      title: 'Barcelona \'92 (1992)',
      duration: '2h 30min',
      distance: '6.5 km',
      description: 'Revive el espíritu olímpico de 1992 y descubre cómo los juegos transformaron para siempre la cara de Barcelona, abriéndola al mar y modernizando sus infraestructuras.',
      center: [41.3650, 2.1550],
      zoom: 14,
      stops: [
        {
          id: 'estadi-olimpic',
          title: "Estadi Olímpic Lluís Companys",
          hints: [
            "Busca el lugar donde la llama olímpica iluminó el cielo tras el vuelo de una flecha.",
            "Encuentra el estadio que fue el corazón de los juegos, reconstruido sobre un recinto de 1929.",
            "Dirígete a la Anella Olímpica de Montjuïc, frente a la fachada principal del estadio."
          ],
          description: "Corazón de los Juegos Olímpicos.",
          coords: [41.3615, 2.1555],
          info: "Originalmente construido para la Exposición de 1929, fue remodelado íntegramente para ser la sede de las ceremonias de apertura y clausura de 1992.",
          imageUrl: "assets/images/historia/estadi_olimpic.jpg",
          theatricalInfo: "¡Bienvenidos al templo del esfuerzo! Aquí, bajo este sol, el mundo entero miró a Barcelona. ¿Oís todavía el eco del 'Amics per sempre'?"
        },
        {
          id: 'palau-sant-jordi',
          title: "Palau Sant Jordi",
          hints: [
            "Busca el caparazón plateado que parece una tortuga futurista descansando en la montaña.",
            "Encuentra la joya arquitectónica diseñada por Arata Isozaki para la gimnasia y el baloncesto.",
            "Ve a la explanada de la Anella Olímpica, junto al gran pabellón cubierto."
          ],
          description: "Vanguardia arquitectónica olímpica.",
          coords: [41.3635, 2.1525],
          info: "Considerado una obra maestra de la arquitectura moderna, su cúpula se construyó en el suelo y se elevó mediante gatos hidráulicos.",
          imageUrl: "assets/images/historia/sant_jordi.jpg",
          theatricalInfo: "Mirad este techo... parece que flote. Es el símbolo de una Barcelona que quiso ser la más moderna del Mediterráneo."
        },
        {
          id: 'torre-calatrava',
          title: "Torre de Comunicaciones de Montjuïc",
          hints: [
            "Busca la silueta de un atleta sosteniendo la llama olímpica, fabricada en acero blanco.",
            "Encuentra el gran reloj de sol diseñado por Santiago Calatrava que domina el perfil de la montaña.",
            "Dirígete a la plaza junto al Palau Sant Jordi, donde se alza la esbelta torre blanca."
          ],
          description: "Icono visual de los juegos.",
          coords: [41.3640, 2.1505],
          info: "Con 136 metros de altura, su forma inclinada representa a un deportista portando la antorcha olímpica.",
          imageUrl: "assets/images/historia/torre_calatrava.jpg",
          theatricalInfo: "Esbelta y orgullosa, esta torre envió las imágenes de nuestra gloria a todos los rincones del planeta. Es nuestro faro de modernidad."
          },
          {
          id: 'piscina-montjuic',
          title: "Piscina Municipal de Montjuïc",
          hints: [
            "Busca el trampolín con las vistas más espectaculares de la ciudad, donde los saltadores parecían volar sobre la Sagrada Familia.",
            "Encuentra la piscina exterior de Montjuïc que se hizo famosa mundialmente por sus panorámicas durante los juegos.",
            "Dirígete a la Avenida Miramar, cerca del funicular, para encontrar este balcón al agua."
          ],
          description: "Escenario de los saltos de trampolín.",
          coords: [41.3685, 2.1645],
          info: "Famosa por sus impresionantes vistas panorámicas de Barcelona, fue la sede de las competiciones de saltos y waterpolo en 1992. La imagen de los saltadores con la ciudad de fondo es uno de los iconos de los Juegos.",
          imageUrl: "assets/images/historia/piscina_montjuic.jpg",
          theatricalInfo: "¡Mirad esa caída! Los saltadores no solo competían contra la gravedad, sino que lo hacían con toda Barcelona a sus pies. Es, sin duda, la imagen más bella que los Juegos regalaron al mundo."
          },
          {
          id: 'vila-olimpica',
          title: "La Vila Olímpica del Poblenou",
          hints: [
            "Ve al barrio que nació donde antes solo había humo de fábricas y vías de tren muertas.",
            "Busca el lugar donde descansaron los atletas y que devolvió a los barceloneses el acceso directo a sus playas.",
            "Dirígete a la Plaza de los Voluntarios Olímpicos, en el barrio de la Vila Olímpica."
          ],
          description: "Transformación urbana radical.",
          coords: [41.3895, 2.1955],
          info: "La construcción de la Vila Olímpica permitió recuperar el frente marítimo de la ciudad, eliminando las barreras industriales que la separaban del mar.",
          imageUrl: "assets/images/historia/vila_olimpica.jpg",
          theatricalInfo: "Donde antes había muros y óxido, ahora hay vida y brisa marina. Barcelona por fin rompió sus cadenas para abrazar el mar."
        },
        {
          id: 'port-olimpic',
          title: "Port Olímpic",
          hints: [
            "Finaliza tu ruta en el puerto que se llenó de velas blancas bajo la mirada de dos grandes torres gemelas.",
            "Busca el recinto náutico creado para las competiciones de vela que hoy es un centro de ocio.",
            "Alcanza el centro del Puerto Olímpico, frente a la escultura del Pez de Frank Gehry."
          ],
          description: "La nueva fachada marítima.",
          coords: [41.3860, 2.1970],
          info: "Diseñado por los arquitectos Oriol Bohigas, Josep Martorell, David Mackay y Albert Puigdomènech, es el emblema del éxito de la transformación olímpica.",
          imageUrl: "assets/images/historia/port_olimpic.jpg",
          theatricalInfo: "Sentid el salitre. Este puerto es el regalo que los Juegos nos dejaron. Una ventana abierta al mundo desde las playas de nuestra ciudad."
        }
      ]
    },
    'born-tapas': {
      title: 'El Born: Tapas y Vinos',
      duration: '2h 30min',
      distance: '2.5 km',
      description: 'Disfruta de la mejor gastronomía en el barrio más chic de Barcelona. Un recorrido por bodegas históricas y locales vanguardistas en el laberinto medieval del Born.',
      center: [41.3840, 2.1820],
      zoom: 16,
      stops: [
        {
          id: 'santa-maria-mar-tapas',
          title: "Plaça de Santa Maria (Aperitivo)",
          hints: [
            "Comienza tu ruta frente a la basílica más bella del gótico catalán, donde las terrazas invitan al primer brindis.",
            "Busca la plaza donde los cargadores de mar descansaban y hoy los locales disfrutan del vermut.",
            "Dirígete a la fachada principal de Santa Maria del Mar."
          ],
          description: "El inicio gastronómico.",
          coords: [41.3835, 2.1815],
          info: "La plaza de Santa Maria es el corazón del Born y un lugar ideal para empezar una ruta de tapas rodeado de historia y arquitectura.",
          imageUrl: "assets/images/gastronomia/born_vermut.jpg",
          theatricalInfo: "¡Salud! Bajo la mirada de la Virgen, empezamos nuestro viaje de sabores. Que el vermut abra el apetito y la brisa del Born nos guíe."
        },
        {
          id: 'carrer-montcada-vinos',
          title: "Bodegas del Carrer de Montcada",
          hints: [
            "Busca la calle de los palacios donde el vino se sirve en copas de cristal entre muros de piedra del siglo XIV.",
            "Encuentra los rincones donde el arte del Museo Picasso se mezcla con el aroma de las mejores barricas.",
            "Camina por el Carrer de Montcada."
          ],
          description: "Vinos entre palacios.",
          coords: [41.3845, 2.1810],
          info: "Esta calle alberga algunas de las tabernas y vinotecas más exclusivas, situadas en los bajos de antiguos palacios medievales.",
          imageUrl: "assets/images/gastronomia/montcada_vino.jpg",
          theatricalInfo: "Sentid el peso de la historia en cada trago. Aquí el vino sabe a tiempo y a nobleza. Un brindis por los que alzaron estos muros."
        },
        {
          id: 'mercat-santa-caterina-tapas',
          title: "Mercat de Santa Caterina (Tapas de Mercado)",
          hints: [
            "Busca el mercado del tejado de colores donde el producto fresco se convierte en miniatura culinaria.",
            "Encuentra las barras de cocina donde los chefs del barrio compran y cocinan en el mismo lugar.",
            "Avinguda de Francesc Cambó, frente al mercado."
          ],
          description: "Del mercado al plato.",
          coords: [41.3862, 2.1785],
          info: "Famoso por su arquitectura vanguardista, el mercado de Santa Caterina ofrece una oferta gastronómica de primer nivel con productos de proximidad.",
          imageUrl: "assets/images/gastronomia/caterina_tapas.jpg",
          theatricalInfo: "¡Mirad qué colores! La huerta de Barcelona está aquí mismo. Probad una tapa de temporada y entenderéis por qué nuestra cocina es única en el mundo."
        },
        {
          id: 'passeig-born-copas',
          title: "Passeig del Born (El epicentro nocturno)",
          hints: [
            "Finaliza tu ruta en la antigua zona de justas medievales, hoy llena de bares de diseño y coctelerías chic.",
            "Busca el paseo que une el antiguo mercado con la iglesia, donde la noche siempre es joven.",
            "Passeig del Born."
          ],
          description: "Copas y diseño.",
          coords: [41.3845, 2.1835],
          info: "El Paseo del Born es el lugar por excelencia para terminar la jornada con una buena copa en un ambiente cosmopolita y vibrante.",
          imageUrl: "assets/images/gastronomia/passeig_born.jpg",
          theatricalInfo: "La noche cae sobre el Born y las luces se encienden. Aquí la historia sale de fiesta. Un último brindis por Barcelona y sus secretos mejor guardados."
        }
      ]
    },
    'gotic-tabernas': {
      title: 'Gòtic: Tabernas Históricas',
      duration: '2h 15min',
      distance: '3.2 km',
      description: 'Viaja al pasado a través de los locales con más solera de Barcelona. Desde la taberna más antigua fundada en el siglo XVIII hasta los rincones favoritos de artistas y bohemios.',
      center: [41.3820, 2.1750],
      zoom: 16,
      stops: [
        {
          id: 'can-culleretes',
          title: "Can Culleretes (1786)",
          hints: [
            "Busca el restaurante más antiguo de Barcelona y el segundo de España, escondido en una calle estrecha cerca de las Ramblas.",
            "Encuentra el lugar donde las 'culleretes' (cucharitas) dieron nombre a un templo de la cocina tradicional catalana.",
            "Dirígete al Carrer d'en Quintana, número 5."
          ],
          description: "La decana de Barcelona.",
          coords: [41.3815, 2.1745],
          info: "Fundada en 1786, es famosa por sus platos de caza, canelones y postres de crema. Sus paredes están llenas de fotos de personajes ilustres que han pasado por sus mesas.",
          imageUrl: "assets/images/gastronomia/culleretes.jpg",
          theatricalInfo: "¡Bienvenidos a la historia viva! Aquí el aroma a guiso no ha cambiado en dos siglos. Tomad asiento donde se sentaron reyes y poetas para celebrar que Barcelona sabe cocinar como nadie."
        },
        {
          id: 'bar-la-plata',
          title: "Bar La Plata (1945)",
          hints: [
            "Busca el bar de esquina que solo sirve cuatro tapas desde hace décadas y siempre está lleno de gente sonriente.",
            "Encuentra el rincón favorito de Bono de U2 donde los boquerones fritos son la ley.",
            "Dirígete al cruce de las calles de la Mercè y de la Plata."
          ],
          description: "La perfección de la sencillez.",
          coords: [41.3810, 2.1795],
          info: "Inaugurado en 1945, este bar es un icono del Barrio Gótico. Su menú se reduce a cuatro opciones (pescaíto, ensalada de tomate, butifarra y boquerones), pero su calidad es legendaria.",
          imageUrl: "assets/images/gastronomia/laplata.jpg",
          theatricalInfo: "¡Una de boquerones! Aquí no necesitamos cartas largas. La Plata es el sabor de la Barcelona auténtica, la que se encuentra en una servilleta de papel y un vaso de vino del Priorat."
        },
        {
          id: 'los-caracoles',
          title: "Restaurante Los Caracoles (1835)",
          hints: [
            "Busca el restaurante con los pollos asándose al fuego en la misma calle y una chimenea que nunca se apaga.",
            "Encuentra el local con entrada por la cocina donde el mármol y la madera cuentan historias de siglos.",
            "Carrer dels Escudellers, número 14."
          ],
          description: "Fuego y tradición.",
          coords: [41.3795, 2.1765],
          info: "Originalmente una taberna de vinos, se hizo mundialmente famoso por sus caracoles y su pollo asado. Ha mantenido su decoración original y su ambiente bohemio desde el siglo XIX.",
          imageUrl: "assets/images/gastronomia/caracoles.jpg",
          theatricalInfo: "Entrad por la cocina, no tengáis miedo. Sentid el calor de las brasas que llevan encendidas desde tiempos de vuestros bisabuelos. Aquí Barcelona se come a fuego lento."
        },
        {
          id: 'bar-del-pi',
          title: "Bar del Pi",
          hints: [
            "Busca la taberna frente a la iglesia del pino, refugio de estudiantes, artistas y políticos durante la transición.",
            "Encuentra la terraza con mejores vistas a la fachada gótica donde el tiempo parece detenerse.",
            "Plaça de Sant Josep Oriol, junto a la Plaza del Pi."
          ],
          description: "Epicentro de la cultura popular.",
          coords: [41.3835, 2.1735],
          info: "Punto de encuentro vital en la vida social del Gótico. Ha sido testigo de tertulias políticas, encuentros artísticos y es un lugar privilegiado para observar el pulso del barrio.",
          imageUrl: "assets/images/gastronomia/bardelpi.jpg",
          theatricalInfo: "Sentaos bajo los árboles. En esta plaza se ha arreglado el mundo mil veces. Pedid una caña y dejad que las campanas de Santa Maria del Pi os cuenten los secretos de la ciudad vieja."
        },
        {
          id: 'cafe-opera',
          title: "Café de l'Òpera (1929)",
          hints: [
            "Finaliza tu ruta en el café modernista frente al Liceu, donde los espejos guardan los reflejos de todas las óperas representadas.",
            "Encuentra el rincón elegante de las Ramblas que conserva su decoración original de principios del siglo XX.",
            "La Rambla, número 74."
          ],
          description: "Elegancia modernista en las Ramblas.",
          coords: [41.3812, 2.1735],
          info: "Situado en un edificio del siglo XVIII, se convirtió en café modernista en 1929. Es el último café histórico de las Ramblas, manteniendo su atmósfera de tertulia y distinción.",
          imageUrl: "assets/images/gastronomia/cafeopera.jpg",
          theatricalInfo: "Mirad estos espejos... han visto pasar a Caruso y a Dalí. Aquí las Ramblas se vuelven silenciosas y elegantes. Un chocolate con churros para terminar nuestro viaje por la memoria de Barcelona."
        }
      ]
    },
    'gracia-cocina': {
      title: 'Gràcia: Cocina Creativa',
      duration: '2h 15min',
      distance: '2.8 km',
      description: 'Explora el barrio más bohemio a través de sus sabores más innovadores. Un recorrido por la cocina de autor, la fusión internacional y los dulces artesanales que hacen de Gràcia el paraíso de los foodies.',
      center: [41.4030, 2.1550],
      zoom: 16,
      stops: [
        {
          id: 'virreina-creative',
          title: "Plaça de la Virreina (Aperitivo Bohemio)",
          hints: [
            "Busca la plaza presidida por una iglesia donde las terrazas ofrecen platillos que mezclan la tradición con toques de autor.",
            "Encuentra el rincón donde la vida de barrio se encuentra con la creatividad culinaria a la sombra de los árboles.",
            "Dirígete a la Plaza de la Virreina, en el corazón de Gràcia."
          ],
          description: "Tradición renovada.",
          coords: [41.4035, 2.1575],
          info: "Gràcia es famosa por sus plazas, y la de la Virreina es un punto clave donde pequeños locales experimentan con tapas creativas y productos de proximidad.",
          imageUrl: "assets/images/gastronomia/virreina_tapas.jpg",
          theatricalInfo: "Sentaos y dejad que la calma os inspire. Aquí, una simple aceituna se convierte en arte si se acompaña de una buena idea y un sol de tarde."
        },
        {
          id: 'llibertat-creative',
          title: "Mercat de la Llibertat (Gourmet de Barrio)",
          hints: [
            "Busca el mercado modernista donde los chefs no solo compran, sino que reinventan el concepto de 'puesto de mercado'.",
            "Encuentra las barras donde se sirven ostras, platillos de mar y creaciones de temporada en un ambiente de hierro y cristal.",
            "Ve al Mercat de la Llibertat, cerca de Via Augusta."
          ],
          description: "Alta cocina en el mercado.",
          coords: [41.3995, 2.1545],
          info: "Muchos de los puestos de este histórico mercado han evolucionado para ofrecer degustaciones gourmet de alta calidad, fusionando la frescura del producto con técnicas modernas.",
          imageUrl: "assets/images/gastronomia/llibertat_gourmet.jpg",
          theatricalInfo: "¡Mirad qué brillo! El pescado de la mañana se viste de gala en estas barras. En Gràcia, el mercado es el lienzo y el producto es la pintura."
        },
        {
          id: 'torrijos-fusion',
          title: "Carrer de Torrijos (El Eje Gastronómico)",
          hints: [
            "Camina por la calle de los cines y las librerías donde el aroma de Japón, México y el Mediterráneo se funden en cada portal.",
            "Busca la vía donde los restaurantes de fusión internacional compiten por ofrecer el bocado más sorprendente de la ciudad.",
            "Recorre el Carrer de Torrijos."
          ],
          description: "Viaje de sabores sin salir del barrio.",
          coords: [41.4045, 2.1585],
          info: "Esta calle es el epicentro de la nueva restauración en Gràcia, albergando desde locales de ramen de autor hasta tabernas de tapas progresivas.",
          imageUrl: "assets/images/gastronomia/torrijos_fusion.jpg",
          theatricalInfo: "Un paso por aquí es un viaje por el mundo. Cerramos los ojos y estamos en Kioto, los abrimos y seguimos en el corazón de Barcelona. ¡Qué maravilla es la mezcla!"
        },
        {
          id: 'revolucio-dulce',
          title: "Plaça de la Revolució (El Toque Final)",
          hints: [
            "Termina tu ruta en la plaza dedicada a la libertad, donde los helados artesanales y los postres de diseño son los protagonistas.",
            "Busca el lugar donde la ciencia del frío y la pastelería creativa te ofrecen un final dulce e inolvidable.",
            "Dirígete a la Plaza de la Revolució de Septiembre de 1868."
          ],
          description: "Vanguardia dulce.",
          coords: [41.4025, 2.1565],
          info: "Famosa por sus heladerías de autor y cafeterías de especialidad, esta plaza ofrece el cierre perfecto para una ruta gastronómica moderna.",
          imageUrl: "assets/images/gastronomia/revolucio_dulce.jpg",
          theatricalInfo: "Un último bocado para recordar que la vida en Barcelona es dulce. La creatividad no tiene límites, ni siquiera cuando se trata de un simple helado. ¡A vuestra salud!"
        }
      ]
    },
    'crimenes-raval': {
      title: 'Crímenes del Raval',
      duration: '1h 45min',
      distance: '3.2 km',
      description: 'Sumérgete en la cara más oscura de Barcelona. Un recorrido por los callejones del Raval tras las huellas de asesinos, leyendas negras y misterios sin resolver.',
      center: [41.3800, 2.1700],
      zoom: 15,
      stops: [
        {
          id: 'vampira-raval',
          title: "La Casa de Enriqueta Martí",
          hints: [
            "Busca el número 29 de la calle que antes se llamaba Poniente, donde la leyenda de la secuestradora más famosa cobró vida.",
            "Encuentra el portal donde los niños desaparecían para alimentar el mito de la Vampira.",
            "Dirígete al Carrer de Joaquín Costa, número 29."
          ],
          description: "El hogar del horror.",
          coords: [41.3831, 2.1648],
          info: "Enriqueta Martí, conocida como la Vampira del Raval, fue detenida aquí en 1912. Se decía que fabricaba ungüentos mágicos con restos humanos, aunque la realidad histórica es un reflejo de la miseria y la injusticia social de la época.",
          imageUrl: "assets/images/misterios/vampira_casa.jpg",
          theatricalInfo: "¡Shhh! No levantéis la voz... En este portal, la sombra de Enriqueta aún parece acechar. ¿Fue una asesina o una víctima del miedo de una ciudad entera? La verdad se esconde tras esas ventanas viejas."
        },
        {
          id: 'asesinato-segui',
          title: "El Crimen de la Cadena",
          hints: [
            "Busca la esquina donde el plomo de los pistoleros de la patronal segó la vida del 'Noi del Sucre'.",
            "Encuentra el lugar donde la lucha obrera se tiñó de sangre en una emboscada traicionera.",
            "Cruce de Carrer de la Cadena con Sant Rafael."
          ],
          description: "Pistolerismo y traición.",
          coords: [41.3789, 2.1691],
          info: "Salvador Seguí, líder anarcosindicalista, fue asesinado en esta esquina en 1923 por pistoleros del Sindicato Libre. Un crimen político que marcó el fin de una era de esperanza para el movimiento obrero.",
          imageUrl: "assets/images/misterios/asesinato_segui.jpg",
          theatricalInfo: "¡Pum! Dos disparos y el mundo cambió. Aquí cayó el gigante, el hombre que soñó con ocho horas de sol y justicia. Los ecos de las balas aún resuenan en estos callejones estrechos."
        },
        {
          id: 'crimen-calle-cera',
          title: "Misterio en la Calle de la Cera",
          hints: [
            "Busca la calle cuna de la rumba catalana, donde un crimen pasional sacudió a la comunidad gitana en el siglo XIX.",
            "Encuentra el rincón donde el honor y la navaja se encontraron bajo la luz de la luna.",
            "Carrer de la Cera."
          ],
          description: "Honor y rumba.",
          coords: [41.3782, 2.1655],
          info: "La calle de la Cera ha sido escenario de múltiples leyendas urbanas y crímenes de barrio que, con el tiempo, se han fundido con la rica historia de la rumba catalana y la vida vecinal del Raval.",
          imageUrl: "assets/images/misterios/calle_cera.jpg",
          theatricalInfo: "Aquí las guitarras lloran y las navajas brillan. En el Raval, la pasión siempre ha sido un arma de doble filo. ¿Oís ese ritmo? Es el latido de un barrio que nunca olvida a sus muertos."
        },
        {
          id: 'monasterio-leyendas',
          title: "Sant Pau del Camp (Final del Misterio)",
          hints: [
            "Termina tu ruta en el monasterio románico más antiguo, donde los monjes guardan secretos de siglos de oscuridad.",
            "Busca el lugar donde las sombras de los antiguos cementerios parecen cobrar vida entre los arcos de piedra.",
            "Carrer de Sant Pau, 101."
          ],
          description: "Paz y sombras.",
          coords: [41.3755, 2.1695],
          info: "Este monasterio del siglo IX es un oasis de paz que ha sobrevivido a incendios, revueltas y crímenes. Su claustro es uno de los lugares más enigmáticos y bellos de toda Barcelona.",
          imageUrl: "assets/images/misterios/sant_pau_camp.jpg",
          theatricalInfo: "El final del camino. Aquí la piedra calla lo que los hombres gritan. El Raval es un laberinto de crímenes y santos, y en este monasterio, todos encuentran su descanso eterno... o casi todos."
        }
      ]
    },
    'fantasmas-gotic': {
      title: 'Fantasmas del Gòtic',
      duration: '1h 30min',
      distance: '2.5 km',
      description: 'Descubre las almas en pena que vagan por el laberinto de piedra del Barrio Gótico. Historias de fantasmas, exorcismos y apariciones que desafían la razón.',
      center: [41.3835, 2.1765],
      zoom: 16,
      stops: [
        {
          id: 'campanero-catedral',
          title: "El Fantasma del Campanero",
          hints: [
            "Busca la gran catedral gótica, donde se dice que un antiguo campanero aún hace sonar las campanas en las noches de tormenta.",
            "Encuentra las gárgolas que vigilan el templo desde las alturas.",
            "Pla de la Seu, frente a la Catedral."
          ],
          description: "Vigilante eterno.",
          coords: [41.3839, 2.1762],
          info: "Cuenta la leyenda que un campanero que amaba su oficio más que a su vida sigue subiendo a la torre de la Catedral para avisar de los peligros que acechan a la ciudad.",
          imageUrl: "assets/images/misterios/catedral_fantasmas.jpg",
          theatricalInfo: "¿Oís eso? No es el viento... es el repique fantasma. Dicen que si miras hacia la torre de San Ivo a medianoche, verás una luz tenue subiendo las escaleras de caracol."
        },
        {
          id: 'voces-ninos-neri',
          title: "Las Voces de San Felipe Neri",
          hints: [
            "Busca la plaza más silenciosa del Gótico, donde las paredes aún conservan las cicatrices de una tragedia aérea.",
            "Encuentra la fuente central donde, según dicen, se escuchan risas de niños que ya no están.",
            "Plaza de San Felipe Neri."
          ],
          description: "Eco de la tragedia.",
          coords: [41.3831, 2.1751],
          info: "En 1938, un bombardeo durante la Guerra Civil acabó con la vida de 42 personas, la mayoría niños que se refugiaban en la iglesia. Las marcas en la fachada son un recordatorio mudo del horror.",
          imageUrl: "assets/images/misterios/ninos_neri.jpg",
          theatricalInfo: "Aquí el silencio pesa. Las piedras hablan de aquel día en que el cielo se desplomó. Muchos juran que, al caer la tarde, se oyen juegos de niños en los rincones de la plaza..."
        },
        {
          id: 'hechiceros-estruc',
          title: "Carrer d'Estruc: Calle de Brujos",
          hints: [
            "Busca una calle pequeña cerca de la Plaza Cataluña que antaño fue el centro de la alquimia y la astrología.",
            "Encuentra la placa que recuerda al famoso astrólogo Estruc.",
            "Carrer d'Estruc."
          ],
          description: "Magia y sombras.",
          coords: [41.3862, 2.1725],
          info: "Esta calle era conocida en la Edad Media por albergar a brujos y alquimistas. El nombre proviene de Astruc Sacanera, un influyente judío experto en artes ocultas.",
          imageUrl: "assets/images/misterios/calle_estruc.jpg",
          theatricalInfo: "¡Cuidado donde pisáis! En esta calle, las sombras tienen memoria. Aquí se fabricaban filtros de amor y venenos de olvido. El aire aún huele a azufre y pergamino viejo."
        },
        {
          id: 'sombras-palau-reial',
          title: "Sombras en la Plaça del Rei",
          hints: [
            "Termina tu ruta en la plaza que fue sede de la Inquisición, donde las sombras de los juzgados aún parecen suplicar clemencia.",
            "Busca el lugar donde el Gran Salón del Tinell guarda secretos de reyes y verdugos.",
            "Plaça del Rei."
          ],
          description: "Justicia y olvido.",
          coords: [41.3842, 2.1774],
          info: "Esta plaza es el corazón medieval de Barcelona. Aquí se encontraba el Tribunal de la Inquisición, y muchos de los condenados pasaron sus últimas horas bajo estos arcos góticos.",
          imageUrl: "assets/images/misterios/plaza_rey_sombras.jpg",
          theatricalInfo: "El corazón de piedra de la ciudad. Aquí la justicia era implacable. ¿Sentís ese frío repentino? Es el aliento de los que pasaron por aquí hacia el cadalso. Bienvenidos al final de la ruta espectral."
        }
      ]
    },
    'masoneria': {
      title: 'Masonería en BCN',
      duration: '2h 15min',
      distance: '4.5 km',
      description: 'Descifra los símbolos ocultos a plena vista en las fachadas y monumentos de Barcelona. Un viaje por la historia de los masones, sus ritos y su influencia en la ciudad.',
      center: [41.3885, 2.1725],
      zoom: 15,
      stops: [
        {
          id: 'biblioteca-aruss',
          title: "Biblioteca Arús: El Templo del Saber",
          hints: [
            "Busca una biblioteca pública cerca del Arco de Triunfo, donde una réplica de la Estatua de la Libertad sostiene la antorcha del conocimiento.",
            "Encuentra el portal custodiado por el busto de su fundador, un eminente masón.",
            "Passeig de Sant Joan, 26."
          ],
          description: "La joya masónica.",
          coords: [41.3918, 2.1785],
          info: "Fundada por Rossend Arús, la biblioteca es un centro de referencia sobre la masonería y el libre pensamiento. Su escalera principal y su sala de lectura están repletas de simbología masónica.",
          imageUrl: "assets/images/misterios/biblioteca_arus.jpg",
          theatricalInfo: "Entrad con respeto... Aquí el silencio es el guardián de la luz. Mirad bien a esa libertad: no es la de Nueva York, es la de la razón que ilumina al mundo. Los masones sabían que el saber es la única cadena que nos hace libres."
        },
        {
          id: 'parque-ciutadella-simbolos',
          title: "El Gran Arquitecto en la Ciutadella",
          hints: [
            "Busca en la Gran Cascada del parque, donde los elementos de la naturaleza se rinden ante el orden y la geometría.",
            "Encuentra las escuadras y compases tallados en la piedra, casi invisibles para el profano.",
            "Parc de la Ciutadella, Cascada Monumental."
          ],
          description: "Naturaleza y Geometría.",
          coords: [41.3894, 2.1894],
          info: "Muchos de los arquitectos y escultores que trabajaron en el parque eran masones. La cascada es una alegoría del triunfo de la luz sobre las tinieblas, con múltiples referencias a los elementos naturales.",
          imageUrl: "assets/images/misterios/ciutadella_masones.jpg",
          theatricalInfo: "¡Ved la cascada! No es solo agua y piedra... es una oda al Gran Arquitecto del Universo. Todo aquí tiene una medida, un ángulo perfecto. Los hermanos de la escuadra dejaron su firma en cada sillar."
        },
        {
          id: 'casa-xifre-logia',
          title: "Los Porxos d'en Xifré",
          hints: [
            "Busca un edificio con soportales cerca del puerto, decorado con medallones de grandes navegantes y símbolos de la prosperidad.",
            "Encuentra las columnas que recuerdan a las de un antiguo templo.",
            "Passeig d'Isabel II, Porxos d'en Xifré."
          ],
          description: "Prosperidad y Logia.",
          coords: [41.3820, 2.1830],
          info: "Josep Xifré, un indiano inmensamente rico y masón, mandó construir este edificio. Se dice que en sus sótanos se celebraban reuniones de logia, lejos de las miradas de la Inquisición.",
          imageUrl: "assets/images/misterios/porxos_xifre.jpg",
          theatricalInfo: "Aquí el comercio y el misterio se daban la mano. Xifré trajo oro de América y luz de las logias. Bajo estos arcos, los hermanos planeaban una Barcelona moderna, científica y libre."
        },
        {
          id: 'pla-palau-masoneria',
          title: "La Fuente del Genio Catalán",
          hints: [
            "Busca una fuente monumental rodeada de palmeras en Pla de Palau, dedicada al progreso y la ingeniería.",
            "Encuentra la figura alada que sostiene una estrella, símbolo de la luz de la razón guiando el camino.",
            "Pla de Palau."
          ],
          description: "El triunfo del progreso.",
          coords: [41.3828, 2.1837],
          info: "Esta fuente de 1851 es una oda al progreso técnico y científico. Su iconografía, con alegorías a la navegación, el comercio y la industria, refleja los valores de la burguesía ilustrada de la época, muy vinculada a las logias masónicas que impulsaron la modernización de Barcelona.",
          imageUrl: "assets/images/misterios/font_geni_catala.jpg",
          theatricalInfo: "¡Mirad esa figura alada! Representa al Genio de Barcelona, portando la llama del conocimiento. No es casualidad que esté aquí, frente a la antigua aduana: es un faro de razón para los que llegaban a una ciudad que soñaba con el futuro y el orden universal."
        },
        {
          id: 'santa-maria-masoneria',
          title: "Símbolos en Santa Maria del Mar",
          hints: [
            "Busca en el suelo de la basílica, cerca de las tumbas de los antiguos gremios de constructores.",
            "Encuentra las marcas de cantero que parecen simples firmas, pero esconden geometría sagrada.",
            "Plaça de Santa Maria, 1."
          ],
          description: "La marca de los constructores.",
          coords: [41.3835, 2.1820],
          info: "La basílica fue construida por el gremio de los 'bastaixos' y maestros de obra que utilizaban geometría sagrada. En sus piedras aún se pueden ver marcas de cantero que los masones operativos usaban como firma y símbolo de grado.",
          imageUrl: "assets/images/misterios/santa_maria_mar_simbolos.jpg",
          theatricalInfo: "Mirad al suelo, no solo al cielo. Cada piedra de esta catedral del pueblo fue puesta por manos que conocían el secreto del ángulo y la plomada. Estas marcas no son solo nombres, son el lenguaje olvidado de los constructores de catedrales."
        },
        {
          id: 'catedral-masoneria',
          title: "La Catedral: El Secreto de los Maestros",
          hints: [
            "Busca en el claustro de la Catedral, donde los símbolos de los antiguos gremios se mezclan con los relieves religiosos.",
            "Encuentra la representación del Gran Arquitecto en las claves de bóveda más antiguas.",
            "Pla de la Seu."
          ],
          description: "Geometría sagrada y gremios.",
          coords: [41.3839, 2.1762],
          info: "La Catedral de Barcelona es un libro de piedra. En su claustro y fachadas, los maestros de obra dejaron mensajes en clave: desde herramientas de construcción que hoy son símbolos masónicos hasta proporciones áureas que buscaban reflejar la armonía del universo.",
          imageUrl: "assets/images/misterios/catedral_masoneria.jpg",
          theatricalInfo: "¿Veis esas herramientas talladas en la piedra? Escuadras, niveles, plomadas... No son solo adornos. Son las herramientas con las que los hombres libres construyeron el mundo, piedra a piedra, bajo la mirada del Gran Arquitecto."
        },
        {
          id: 'canonges-masoneria',
          title: "Casa dels Canonges y el Pont del Bisbe",
          hints: [
            "Busca el puente neo-gótico que une la Casa dels Canonges con el Palau de la Generalitat.",
            "Encuentra la calavera atravesada por una daga en la parte inferior del puente, un potente símbolo de 'memento mori'.",
            "Carrer del Bisbe."
          ],
          description: "La advertencia del arquitecto.",
          coords: [41.3831, 2.1765],
          info: "Aunque el puente es de 1928, su arquitecto, Joan Rubió i Bellver, incluyó una calavera con una daga, un símbolo que muchos asocian con ritos de iniciación masónica y la advertencia de la brevedad de la vida y el peso de la responsabilidad.",
          imageUrl: "assets/images/misterios/pont_bisbe_calavera.jpg",
          theatricalInfo: "¡Alto ahí! Mirad bajo el puente... Una calavera y una daga. ¿Un castigo? ¿Una advertencia? Los masones sabían que para renacer a la luz, primero hay que morir a lo profano. Ese cráneo nos recuerda que todos somos iguales ante el final del camino."
        },
        {
          id: 'ajuntament-masoner',
          title: "Símbolos en la Plaça Sant Jaume",
          hints: [
            "Termina tu ruta frente al Ayuntamiento, donde la fachada esconde discretos recordatorios del ideal de igualdad.",
            "Busca los bajorrelieves que exaltan las artes y las ciencias.",
            "Plaça de Sant Jaume, fachada del Ajuntament."
          ],
          description: "El Ideal en la Piedra.",
          coords: [41.3825, 2.1772],
          info: "A pesar de la persecución durante siglos, el ideal masónico de 'Libertad, Igualdad, Fraternidad' influyó en muchos políticos barceloneses que dejaron su impronta en los edificios institucionales.",
          imageUrl: "assets/images/misterios/ajuntament_simbolos.jpg",
          theatricalInfo: "El final de vuestra iniciación. Los masones no buscaban el poder, sino la luz. Y aunque sus templos fueran secretos, sus sueños de libertad quedaron grabados para siempre en la piel de esta ciudad. ¡Pasad y ved!"
        }
      ]
    },
    'vampira-raval': {
      title: 'La Vampira del Raval',
      duration: '1h 30min',
      distance: '2.8 km',
      description: 'Sigue la huella real de Enriqueta Martí, la mujer que aterrorizó a la Barcelona de 1912. Un recorrido entre la crónica negra, la miseria de la época y el mito de la Vampira.',
      center: [41.3810, 2.1680],
      zoom: 16,
      stops: [
        {
          id: 'vampira-casa-joaquin',
          title: "Carrer de Joaquín Costa, 29",
          hints: [
            "Busca el portal donde la policía descubrió a dos niños desaparecidos en 1912, desencadenando el mayor escándalo de la época.",
            "Encuentra la casa de Enriqueta Martí, donde se dice que fabricaba sus macabros ungüentos.",
            "Carrer de Joaquín Costa, número 29 (antes calle Poniente)."
          ],
          description: "El escenario del crimen.",
          coords: [41.3831, 2.1648],
          info: "Aquí fue detenida Enriqueta Martí tras la denuncia de una vecina que vio a una niña asomada a la ventana con la cabeza rapada. En el registro se hallaron restos humanos y extrañas pócimas.",
          imageUrl: "assets/images/misterios/vampira_casa_detalles.jpg",
          theatricalInfo: "¡Shhh! Mirad esas ventanas. Hace un siglo, el barrio entero gritaba ante este portal. ¿Era Enriqueta un monstruo o solo una mujer enloquecida por la miseria? La prensa de la época ya había dictado sentencia antes del juicio."
        },
        {
          id: 'vampira-el-pardo',
          title: "Carrer de les Minetes (El Pardo)",
          hints: [
            "Busca un callejón hoy desaparecido cerca de la calle de la Cera, donde Enriqueta frecuentaba los bajos fondos.",
            "Encuentra el lugar donde la 'Vampira' buscaba a sus víctimas entre los más desfavorecidos.",
            "Zona cercana al Carrer de la Cera y Carrer de la Riereta."
          ],
          description: "Los bajos fondos del Raval.",
          coords: [41.3785, 2.1660],
          info: "Enriqueta Martí se movía por las zonas más pobres del Raval, utilizando el engaño y la necesidad de las familias para llevarse a los niños. El barrio era un laberinto de miseria donde desaparecer era fácil.",
          imageUrl: "assets/images/misterios/raval_miseria.jpg",
          theatricalInfo: "Aquí el hambre tiene cara de niño. Enriqueta lo sabía bien. Les prometía comida, un techo... y ellos la seguían sin saber que entraban en una pesadilla de la que no despertarían."
        },
        {
          id: 'vampira-preso-vella',
          title: "Antigua Cárcel de Mujeres",
          hints: [
            "Busca el lugar donde Enriqueta Martí pasó sus últimos días antes de morir en extrañas circunstancias.",
            "Encuentra el sitio donde la justicia intentó encerrar al mito, pero solo encontró la muerte de la mujer.",
            "Carrer de la Reina Amàlia, donde estuvo la Prisión de Reina Amàlia."
          ],
          description: "El final de Enriqueta.",
          coords: [41.3765, 2.1675],
          info: "Enriqueta Martí murió en la prisión de Reina Amàlia en 1913, oficialmente de cáncer, aunque el rumor popular decía que sus propias compañeras de celda la habían linchado por sus crímenes contra niños.",
          imageUrl: "assets/images/misterios/prision_amalia.jpg",
          theatricalInfo: "Entre estos muros se apagó su voz. Nunca llegó a ser juzgada. Barcelona quería sangre y la obtuvo en una celda fría. El mito de la Vampira nació el día en que Enriqueta dejó de respirar."
        },
        {
          id: 'vampira-hospital-creu',
          title: "Antiguo Hospital de la Santa Creu",
          hints: [
            "Termina tu ruta en el hospital donde se realizaban las autopsias de la época y donde el misterio médico se mezcló con la leyenda.",
            "Busca el patio gótico donde los médicos forenses analizaron los restos hallados en la casa de la Vampira.",
            "Carrer del Hospital, número 56."
          ],
          description: "La ciencia frente al mito.",
          coords: [41.3810, 2.1705],
          info: "En este histórico hospital se llevaron a cabo los análisis de los huesos y restos encontrados en los registros. La ciencia intentó determinar si los ungüentos de Enriqueta tenían realmente origen humano.",
          imageUrl: "assets/images/misterios/hospital_autopsias.jpg",
          theatricalInfo: "Aquí la luz de la razón intentó iluminar la oscuridad de la leyenda. Médicos y jueces examinaron cada resto bajo estos arcos. Pero para el pueblo, la verdad ya no importaba: la Vampira ya era eterna."
        }
      ]
    },
    'montjuic': {
      title: 'Cementerio de Montjuïc',
      duration: '2h 30min',
      distance: '5.0 km',
      description: 'Un museo al aire libre frente al mar. Recorre los panteones modernistas, descubre la historia de los personajes ilustres de Barcelona y rinde homenaje en el Fossar de la Pedrera.',
      center: [41.3530, 2.1520],
      zoom: 15,
      stops: [
        {
          id: 'mausoleo-macia',
          title: "Mausoleo de Francesc Macià",
          hints: [
            "Busca la tumba del 'Avi', el primer presidente de la Generalitat restaurada, en un monumento de líneas sobrias y potentes.",
            "Encuentra el lugar donde el corazón de un presidente late simbólicamente por su tierra.",
            "Sector de San Jaime, cerca de la entrada principal."
          ],
          description: "La memoria de un pueblo.",
          coords: [41.3556, 2.1554],
          info: "Francesc Macià, el 'Avi', descansa en este mausoleo diseñado por Manuel Brullet. Es un lugar de peregrinación política y sentimental cada 25 de diciembre, aniversario de su muerte.",
          imageUrl: "assets/images/misterios/mausoleo_macia.jpg",
          theatricalInfo: "Aquí reposa el hombre que soñó una nación. Las piedras son frías, pero el recuerdo es cálido. Mirad el horizonte: desde aquí, el Avi sigue vigilando la ciudad que tanto amó."
        },
        {
          id: 'panteon-batllo',
          title: "Panteón de la Familia Batlló",
          hints: [
            "Busca una obra maestra del modernismo funerario, con formas orgánicas y detalles en hierro forjado que parecen cobrar vida.",
            "Encuentra el panteón diseñado por Josep Vilaseca, el arquitecto del Arco de Triunfo.",
            "Sector de San José."
          ],
          description: "Elegancia en el adiós.",
          coords: [41.3528, 2.1532],
          info: "La familia Batlló, grandes industriales textiles, encargó este panteón que destaca por su riqueza ornamental y su integración con el paisaje de la montaña de Montjuïc.",
          imageUrl: "assets/images/misterios/panteon_batllo.jpg",
          theatricalInfo: "¿No es fascinante? Hasta en la muerte, la burguesía barcelonesa buscaba la belleza. Estas curvas, estas flores de piedra... es el Modernismo desafiando al paso del tiempo."
        },
        {
          id: 'fossar-pedrera',
          title: "Fossar de la Pedrera",
          hints: [
            "Busca una antigua cantera convertida en un espacio de memoria para las víctimas de la represión y la Guerra Civil.",
            "Encuentra la tumba de Lluís Companys, rodeada de cipreses y silencio.",
            "Extremo sur del cementerio."
          ],
          description: "Dignidad y silencio.",
          coords: [41.3512, 2.1485],
          info: "Este espacio alberga los restos de miles de personas ejecutadas durante la posguerra. En 1985 fue transformado en un memorial que incluye la tumba del presidente Lluís Companys.",
          imageUrl: "assets/images/misterios/fossar_pedrera.jpg",
          theatricalInfo: "Bajad la voz... el silencio aquí es sagrado. En esta cantera, la historia escribió sus páginas más tristes. Pero hoy, entre estos muros, la memoria florece con dignidad."
        },
        {
          id: 'tumba-durruti',
          title: "La Tumba de Durruti",
          hints: [
            "Busca una tumba sencilla pero siempre llena de flores frescas y pañuelos rojos y negros.",
            "Encuentra el lugar donde descansa el líder anarquista junto a sus compañeros Ascaso y Ferrer i Guàrdia.",
            "Vía de San Carlos."
          ],
          description: "El gigante del anarquismo.",
          coords: [41.3545, 2.1542],
          info: "Buenaventura Durruti, carismático líder de la CNT y la FAI, descansa aquí. Su entierro en noviembre de 1936 fue la mayor manifestación popular vista en Barcelona, con medio millón de personas despidiendo al 'héroe del pueblo'.",
          imageUrl: "assets/images/misterios/tumba_durruti.jpg",
          theatricalInfo: "¡Salud, compañeros! Aquí no hay mármoles caros ni ángeles llorones. Solo piedra y el recuerdo de un hombre que dijo que llevamos un mundo nuevo en nuestros corazones. Las flores que veis nunca faltan... el pueblo no olvida a los suyos."
        },
        {
          id: 'joan-miro',
          title: "La Tumba de Joan Miró",
          hints: [
            "Busca una tumba humilde, en un nicho sencillo, que esconde la grandeza de uno de los pintores más universales de Barcelona.",
            "Encuentra el lugar donde el azul, el amarillo y el rojo de sus sueños se funden con el silencio eterno.",
            "Sector de San Carlos."
          ],
          description: "El color del silencio.",
          coords: [41.3540, 2.1535],
          info: "A pesar de su fama mundial, Joan Miró eligió un entierro sencillo en un nicho familiar. Su legado artístico sigue vivo en la Fundación Miró y en las calles de la ciudad, desde el mosaico de La Rambla hasta el aeropuerto.",
          imageUrl: "assets/images/misterios/tumba_miro.jpg",
          theatricalInfo: "Aquí descansa el hombre que pintó estrellas y pájaros. No busquéis grandes estatuas; el alma de Miró está en los colores que dejó por todo el mundo. Un rincón humilde para un genio gigante."
        },
        {
          id: 'isaac-albeniz',
          title: "Isaac Albéniz: Notas del Adiós",
          hints: [
            "Busca el panteón de uno de los compositores que mejor supo captar el alma de España en el piano.",
            "Encuentra el lugar donde la música parece flotar entre los cipreses, recordando las notas de la suite 'Iberia'.",
            "Sector de San José."
          ],
          description: "Música eterna.",
          coords: [41.3532, 2.1528],
          info: "El gran compositor Isaac Albéniz descansa en este panteón. Sus obras, especialmente la suite 'Iberia', elevaron el piano español a la categoría de obra maestra universal.",
          imageUrl: "assets/images/misterios/tumba_albeniz.jpg",
          theatricalInfo: "¡Shhh! Si escucháis con atención, quizá oigáis una sonata lejana. Albéniz no murió, solo se mudó a un lugar donde todas las teclas son de marfil y el mar siempre está en calma."
        },
        {
          id: 'mirador-mediterrani',
          title: "El Mirador del Mediterrani",
          hints: [
            "Termina tu ruta en el punto más alto del cementerio, donde los panteones parecen asomarse al azul infinito del mar.",
            "Busca el lugar donde la paz de los muertos se funde con la inmensidad del puerto de Barcelona.",
            "Sector alto, cerca del camino de circunvalación."
          ],
          description: "Paz frente al mar.",
          coords: [41.3505, 2.1515],
          info: "Desde las zonas altas del cementerio de Montjuïc se obtienen unas vistas inigualables del puerto comercial y el mar Mediterráneo, ofreciendo un contraste único entre la quietud del camposanto y la actividad de la ciudad.",
          imageUrl: "assets/images/misterios/mirador_cementerio.jpg",
          theatricalInfo: "El final del viaje. Mirad el mar... es el mismo que vieron los romanos, los íberos y los que hoy descansan aquí. En Montjuïc, la muerte no es el final, es solo un cambio de paisaje."
        }
      ]
    },
  };

  constructor() {
    addIcons({ timeOutline, walkOutline, locationOutline, play, bulbOutline, checkmarkCircle, trophyOutline, mapOutline, listOutline, closeOutline, locate, navigate, chevronDownOutline, chevronUpOutline, playOutline, expandOutline, contractOutline, cashOutline, time, navigateOutline });
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
      // Icono personalizado para paradas descubiertas (Estilo Google Maps pero en verde)
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

    // Solicitar permisos de Ubicación
    if (platform !== 'web') {
      const geoStatus = await Geolocation.requestPermissions();
      if (geoStatus.location !== 'granted') {
        alert('Se requiere el permiso de ubicación para jugar a BCN Adventure.');
        return;
      }
    }

    // Solicitar permisos de Notificaciones (si están activas en ajustes)
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

  useHint() {
    if (this.currentHintIndex < 2) {
      this.currentHintIndex++;
    }
  }

  private async startTracking() {
    const platform = Capacitor.getPlatform();
    
    if (platform !== 'web') {
      const hasPermission = await Geolocation.requestPermissions();
      if (hasPermission.location !== 'granted') return;
    }

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

    // Actualizar distancia para la UI
    if (distanceInM >= 1000) {
      this.distanceToNextStop = `${distanceInKm.toFixed(2)} km`;
    } else {
      this.distanceToNextStop = `${Math.round(distanceInM)} m`;
    }

    // Lógica de notificaciones de proximidad
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
    
    // Si la ubicación fue revelada, la puntuación es 0. De lo contrario, cálculo normal.
    const stopScore = this.isLocationRevealed ? 0 : (this.maxScorePerStop - (this.currentHintIndex * 35));
    this.score += stopScore;
    
    // Reset para la siguiente parada
    this.isLocationRevealed = false;
    this.notifiedDistances.clear(); // Limpiar notificaciones para la nueva parada
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

    // Center map on target immediately and expand to full view
    setTimeout(() => {
      this.map.invalidateSize();
      this.map.setView(target.coords, 18);
      
      // Clear previous markers/routing if any
      if (this.targetMarker) this.map.removeLayer(this.targetMarker);
      if (this.routePolyline) this.map.removeLayer(this.routePolyline);

      // Show target marker (Google Maps style red drop)
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
