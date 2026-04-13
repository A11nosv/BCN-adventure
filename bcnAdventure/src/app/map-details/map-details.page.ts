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
