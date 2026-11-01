import { SeccionTerminos } from 'src/app/core/services/terminos.service';

// =========================
// 📄 TEXTO BASE DE LOS TÉRMINOS (VERSIÓN 1.0)
// =========================
// Rige mientras el admin no publique una versión con secciones propias, y es
// el punto de partida del editor del panel admin.
// Formato del contenido: párrafos separados por una línea en blanco,
// ítems de lista con "- " al inicio y **texto** para negritas.

export const TERMINOS_BASE_INTRODUCCION =
  "Bienvenido a **Code-Trekking**, una aplicación móvil orientada a apoyar la planificación, organización y realización de actividades de trekking y senderismo. Al crear una cuenta, acceder o utilizar la aplicación, declaras haber leído y comprendido los presentes Términos y Condiciones y aceptas sujetarte a ellos y a la legislación vigente aplicable en Chile.";

export const TERMINOS_BASE_SECCIONES: SeccionTerminos[] = [
  {
    numero: "00",
    titulo: "Aviso legal y alcance",
    contenido: "Estos Términos y Condiciones establecen las reglas de utilización de Code-Trekking, así como los derechos, responsabilidades y limitaciones asociados al uso de sus funcionalidades.\n\nCode-Trekking constituye una herramienta tecnológica de apoyo para actividades de trekking y senderismo. La aplicación no reemplaza a organismos públicos, servicios de emergencia, profesionales especializados, guías certificados ni sistemas oficiales de información meteorológica, territorial o de seguridad.\n\nLa utilización de la aplicación es voluntaria y cada usuario mantiene la responsabilidad sobre sus decisiones, preparación, equipamiento y comportamiento durante las actividades realizadas."
  },
  {
    numero: "01",
    titulo: "Uso responsable de la aplicación",
    contenido: "Code-Trekking permite acceder a funcionalidades relacionadas con mapas, rutas, seguimiento GPS, eventos, información meteorológica, comunicación entre usuarios y herramientas de seguridad.\n\nEl usuario se compromete a utilizar la plataforma de manera responsable, lícita y respetuosa.\n\n- Utilizar información verdadera al crear y mantener su cuenta.\n- No crear cuentas falsas ni suplantar la identidad de otras personas.\n- No utilizar la plataforma para actividades ilícitas.\n- No publicar contenido que amenace, acose o perjudique a otros usuarios.\n- No utilizar la aplicación para distribuir malware, realizar fraude o intentar vulnerar sus sistemas.\n- No manipular deliberadamente información de rutas, eventos o ubicaciones con intención de causar perjuicio.\n- Respetar las normas de acceso, conservación y protección de los espacios naturales."
  },
  {
    numero: "02",
    titulo: "Alcance geográfico y disponibilidad de eventos",
    contenido: "En su versión inicial, **Code-Trekking** estará orientada a la creación, organización y participación en actividades de trekking y senderismo dentro de la **Región Metropolitana de Santiago, Chile**.\n\nDebido al alcance y etapa de desarrollo actual de la aplicación, la disponibilidad de eventos, rutas, información geográfica y determinadas funcionalidades podrá estar limitada inicialmente a dicha región.\n\nCode-Trekking podrá ampliar progresivamente su cobertura hacia **otras regiones de Chile**, incorporando nuevas rutas, eventos, localidades y funcionalidades de acuerdo con la evolución y futuras versiones de la plataforma.\n\n- La disponibilidad de eventos dependerá de la cobertura geográfica habilitada por la plataforma.\n- La incorporación de nuevas regiones podrá realizarse de manera progresiva según criterios técnicos, operativos y de desarrollo.\n- La ampliación de cobertura no garantiza una fecha determinada para la disponibilidad de eventos en otras regiones.\n- La cobertura geográfica de la aplicación podrá modificarse, ampliarse o restringirse en futuras versiones.\n- La información relacionada con rutas, eventos y ubicaciones dependerá de los datos disponibles en la plataforma y de los servicios cartográficos y geográficos utilizados."
  },
  {
    numero: "03",
    titulo: "Registro, cuenta y autenticación",
    contenido: "Para utilizar determinadas funcionalidades de Code-Trekking, el usuario deberá crear una cuenta proporcionando información necesaria para su identificación y autenticación.\n\n- El usuario debe proporcionar información correcta y actualizada.\n- Cada usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.\n- El usuario deberá informar oportunamente cualquier acceso no autorizado que detecte.\n- No está permitido compartir deliberadamente las credenciales de acceso con terceros.\n- Code-Trekking podrá aplicar medidas de seguridad ante actividades sospechosas o intentos de acceso no autorizado."
  },
  {
    numero: "04",
    titulo: "Protección de datos personales y privacidad",
    contenido: "Code-Trekking podrá tratar determinados datos necesarios para proporcionar sus funcionalidades, administrar las cuentas de usuario y mejorar la seguridad de la plataforma.\n\nEntre la información que puede ser tratada se encuentra:\n\n- **Nombre de usuario:** utilizado para identificar al usuario dentro de la plataforma.\n- **Correo electrónico:** utilizado para autenticación, recuperación de cuenta y comunicaciones relacionadas con el servicio.\n- **Foto de perfil:** utilizada para personalizar la cuenta del usuario.\n- **Estado de ánimo:** información opcional que el usuario puede decidir compartir.\n- **Contactos de emergencia:** utilizados exclusivamente para funcionalidades relacionadas con seguridad y asistencia.\n- **Información de ubicación:** utilizada para mapas, tracking, rutas y funcionalidades de emergencia cuando el usuario las active.\n\nEl tratamiento de datos personales deberá realizarse conforme a la legislación chilena aplicable, incluyendo la Ley N.º 19.628 sobre protección de la vida privada y las modificaciones y obligaciones que resulten aplicables conforme a la Ley N.º 21.719 sobre protección y tratamiento de datos personales.\n\nCode-Trekking procurará aplicar medidas técnicas y organizativas razonables para proteger la información frente a accesos, modificaciones, pérdidas o divulgaciones no autorizadas.\n\nLos datos personales no serán comercializados deliberadamente como producto independiente. Cualquier comunicación o tratamiento de información deberá realizarse de acuerdo con la finalidad correspondiente y la normativa aplicable."
  },
  {
    numero: "05",
    titulo: "Ubicación, GPS y seguimiento de rutas",
    contenido: "Code-Trekking puede utilizar los servicios de ubicación del dispositivo para proporcionar funcionalidades de navegación, seguimiento y seguridad.\n\n- **Mapa:** permite visualizar la posición aproximada o actual del usuario.\n- **Tracking:** permite registrar el recorrido realizado durante una actividad.\n- **Rutas:** permite visualizar y planificar recorridos.\n- **Clima:** permite obtener información meteorológica asociada a una ubicación.\n- **SOS:** permite compartir información de ubicación con los contactos de emergencia configurados por el usuario.\n\nCuando el seguimiento GPS se encuentre activo, la aplicación puede continuar recopilando información de ubicación en segundo plano, dependiendo de los permisos concedidos por el usuario y de las características del dispositivo.\n\nEl usuario podrá detener el seguimiento cuando lo estime conveniente, salvo las limitaciones propias del sistema operativo, permisos, conectividad o funcionamiento del dispositivo."
  },
  {
    numero: "06",
    titulo: "Función SOS y situaciones de emergencia",
    contenido: "La función SOS constituye una herramienta tecnológica de apoyo destinada a facilitar el envío de información de ubicación a contactos de emergencia previamente configurados.\n\nEl usuario reconoce expresamente que Code-Trekking no constituye un servicio oficial de emergencia y que el funcionamiento del sistema puede verse afectado por factores externos.\n\n- Falta o pérdida de cobertura móvil.\n- Ausencia de conexión a Internet.\n- Batería insuficiente o agotada.\n- Fallas del dispositivo.\n- Errores de posicionamiento GPS.\n- Condiciones meteorológicas o geográficas que afecten la señal.\n- Interrupciones o fallas de servicios externos utilizados por la aplicación.\n\nAnte una emergencia real, el usuario deberá utilizar también los canales oficiales de emergencia disponibles en Chile."
  },
  {
    numero: "07",
    titulo: "Rutas, mapas y seguridad en terreno",
    contenido: "Las rutas, mapas, instrucciones de navegación, elevaciones, condiciones meteorológicas y demás información presentada por Code-Trekking tienen carácter referencial.\n\nEl usuario reconoce que las condiciones reales de un sendero pueden cambiar debido a factores naturales, climáticos, geográficos o humanos.\n\n- Deslizamientos de tierra.\n- Caídas de árboles o rocas.\n- Inundaciones o crecidas de cursos de agua.\n- Incendios forestales.\n- Cambios meteorológicos repentinos.\n- Cierres temporales de senderos.\n- Restricciones de acceso a áreas naturales.\n- Errores o desactualización de información cartográfica.\n\nAntes de iniciar una actividad, el usuario deberá evaluar las condiciones reales del lugar, revisar las restricciones existentes, considerar su experiencia y contar con equipamiento adecuado."
  },
  {
    numero: "08",
    titulo: "Eventos, publicaciones y comunidad",
    contenido: "Code-Trekking permite que los usuarios creen, consulten o participen en actividades y eventos relacionados con trekking y senderismo.\n\nEl usuario que cree un evento será responsable de la información que publique y deberá evitar entregar información falsa o potencialmente peligrosa.\n\n- No publicar información deliberadamente falsa.\n- No organizar actividades con fines ilícitos.\n- No acosar, amenazar ni discriminar a otros usuarios.\n- No publicar datos personales de terceros sin autorización.\n- No utilizar la plataforma para actividades comerciales no autorizadas.\n- Respetar las decisiones y límites establecidos por cada usuario."
  },
  {
    numero: "09",
    titulo: "Convivencia, inclusión y no discriminación",
    contenido: "Code-Trekking busca promover una comunidad abierta y respetuosa para personas interesadas en actividades al aire libre.\n\nNo se permitirá utilizar la plataforma para realizar conductas de acoso, amenazas, hostigamiento o discriminación arbitraria.\n\nEstas disposiciones se establecen considerando, entre otras normas, los principios establecidos en la Ley N.º 20.609, que establece medidas contra la discriminación arbitraria.\n\n- Respeto entre los participantes.\n- Igualdad de trato.\n- Prohibición de amenazas y hostigamiento.\n- Respeto por la diversidad de los usuarios.\n- Uso responsable de los espacios de comunicación."
  },
  {
    numero: "10",
    titulo: "Seguridad informática",
    contenido: "El usuario no podrá realizar acciones destinadas a comprometer la seguridad, disponibilidad, confidencialidad o integridad de Code-Trekking o de los servicios tecnológicos utilizados por la aplicación.\n\n- Intentar acceder a cuentas de otros usuarios.\n- Intentar acceder a sistemas sin autorización.\n- Interceptar información de otros usuarios.\n- Alterar o destruir información almacenada.\n- Introducir código malicioso.\n- Realizar ataques destinados a interrumpir el servicio.\n- Utilizar herramientas destinadas a vulnerar las medidas de seguridad.\n\nEstas conductas podrán constituir infracciones o delitos de acuerdo con la legislación chilena, incluyendo las disposiciones de la Ley N.º 21.459 sobre delitos informáticos."
  },
  {
    numero: "11",
    titulo: "Factor político y administrativo",
    contenido: "Code-Trekking reconoce que las actividades de trekking pueden desarrollarse en espacios sujetos a regulaciones, restricciones de acceso, políticas públicas, medidas de conservación y disposiciones emitidas por autoridades nacionales, regionales o locales.\n\nLas condiciones de acceso a parques, reservas, senderos y otros espacios naturales pueden modificarse por decisiones de las autoridades competentes, especialmente frente a emergencias, incendios forestales, riesgos naturales, conservación ambiental o protección de visitantes.\n\nLa información mostrada por la aplicación no reemplaza las instrucciones oficiales emitidas por las autoridades."
  },
  {
    numero: "12",
    titulo: "Factor económico",
    contenido: "Code-Trekking está orientado a facilitar el acceso a información y herramientas digitales relacionadas con actividades de trekking.\n\nLos costos asociados a transporte, alimentación, alojamiento, equipamiento, entradas, permisos, servicios turísticos o cualquier otro gasto derivado de una actividad son responsabilidad del usuario, salvo que expresamente se indique lo contrario.\n\nLa aplicación no garantiza precios, disponibilidad comercial ni condiciones económicas de terceros que puedan ser mencionados dentro de la plataforma.\n\nCuando corresponda, cualquier servicio pagado deberá informar previamente sus condiciones, precio y características de acuerdo con la normativa aplicable."
  },
  {
    numero: "13",
    titulo: "Factor social",
    contenido: "Code-Trekking busca facilitar la participación responsable en actividades de trekking y fortalecer la interacción entre personas con intereses relacionados con la naturaleza y las actividades al aire libre.\n\nLa plataforma promueve una convivencia basada en el respeto, inclusión, colaboración y responsabilidad individual.\n\nLa participación en eventos con otras personas implica reconocer que cada participante posee distintos niveles de experiencia, condición física, conocimientos y preparación.\n\nNingún usuario deberá presionar, obligar o incentivar a otra persona a realizar actividades que considere inseguras o que excedan sus capacidades."
  },
  {
    numero: "14",
    titulo: "Factor tecnológico",
    contenido: "Code-Trekking depende de tecnologías propias y de servicios externos para proporcionar determinadas funcionalidades.\n\nEntre estos servicios pueden encontrarse sistemas de mapas, geolocalización, información meteorológica, autenticación, almacenamiento y servicios de infraestructura en la nube.\n\nEl usuario comprende que ninguna plataforma tecnológica puede garantizar disponibilidad permanente o ausencia absoluta de errores, interrupciones o vulnerabilidades.\n\nLa aplicación podrá requerir actualizaciones para corregir vulnerabilidades, mejorar funcionalidades o adaptarse a cambios tecnológicos y normativos."
  },
  {
    numero: "15",
    titulo: "Factor ambiental y protección de la naturaleza",
    contenido: "Code-Trekking promueve el desarrollo responsable de actividades al aire libre y el respeto por los ecosistemas naturales.\n\nLos usuarios deberán respetar las normas ambientales y restricciones establecidas en cada territorio.\n\n- No arrojar residuos en senderos o espacios naturales.\n- No dañar flora, fauna ni elementos naturales.\n- Respetar senderos y zonas delimitadas.\n- No encender fuego en lugares donde esté prohibido.\n- Respetar cierres y restricciones de áreas protegidas.\n- Reducir el impacto ambiental de las actividades realizadas.\n\nEstas disposiciones consideran los principios de protección, preservación de la naturaleza y conservación del patrimonio ambiental establecidos en la Ley N.º 19.300 sobre Bases Generales del Medio Ambiente y demás normativa ambiental aplicable."
  },
  {
    numero: "16",
    titulo: "Marco legal aplicable",
    contenido: "El funcionamiento y utilización de Code-Trekking se desarrollará respetando la legislación chilena que resulte aplicable según la naturaleza de cada funcionalidad.\n\nEntre las normas que pueden resultar relevantes se encuentran, sin limitarse exclusivamente a ellas:\n\n- **Ley N.º 19.628:** protección de la vida privada y tratamiento de datos personales, mientras resulte aplicable.\n- **Ley N.º 21.719:** protección y tratamiento de datos personales y creación de la Agencia de Protección de Datos Personales, considerando su entrada en vigencia y disposiciones transitorias.\n- **Ley N.º 21.459:** normas sobre delitos informáticos y protección de sistemas y datos informáticos.\n- **Ley N.º 20.609:** medidas contra la discriminación arbitraria.\n- **Ley N.º 19.496:** protección de los derechos de los consumidores cuando resulten aplicables relaciones de consumo.\n- **Ley N.º 20.423:** disposiciones relacionadas con el desarrollo del turismo, calidad y seguridad de determinados servicios turísticos.\n- **Ley N.º 19.300:** Bases Generales del Medio Ambiente.\n\nLa enumeración anterior tiene carácter informativo y no constituye una descripción exhaustiva de toda la normativa que pudiera resultar aplicable a una determinada actividad, territorio o situación."
  },
  {
    numero: "17",
    titulo: "Servicios y plataformas de terceros",
    contenido: "Algunas funcionalidades de Code-Trekking pueden depender de servicios tecnológicos proporcionados por terceros.\n\nEstos servicios pueden incluir mapas, rutas, información meteorológica, almacenamiento, autenticación, infraestructura tecnológica u otros servicios necesarios para el funcionamiento de la aplicación.\n\nLa disponibilidad, precisión o continuidad de dichos servicios puede depender de sus respectivos proveedores y condiciones de uso.\n\nCode-Trekking no garantiza la disponibilidad permanente de servicios externos que se encuentren fuera de su control directo."
  },
  {
    numero: "18",
    titulo: "Propiedad intelectual y contenido",
    contenido: "La estructura, diseño, código, elementos gráficos, identidad visual y demás componentes propios de Code-Trekking se encuentran protegidos por la normativa aplicable en materia de propiedad intelectual.\n\nEl usuario conserva los derechos que legalmente le correspondan sobre el contenido que genere, publique o incorpore en la plataforma, sin perjuicio de las autorizaciones necesarias para permitir el funcionamiento del servicio.\n\nEl usuario no deberá publicar material de terceros sobre el cual no posea autorización o derechos suficientes."
  },
  {
    numero: "19",
    titulo: "Contenido prohibido",
    contenido: "Está prohibida la publicación o utilización de Code-Trekking para distribuir contenido que:\n\n- Incite a cometer actos ilícitos.\n- Contenga amenazas o acoso.\n- Promueva discriminación arbitraria.\n- Busque engañar o defraudar a otros usuarios.\n- Contenga malware o código malicioso.\n- Exponga información personal de terceros sin autorización.\n- Ponga deliberadamente en riesgo la seguridad de otras personas.\n\nEl contenido que infrinja estas condiciones podrá ser eliminado y, cuando corresponda, la cuenta asociada podrá ser restringida o suspendida."
  },
  {
    numero: "20",
    titulo: "Responsabilidad del usuario y limitaciones del servicio",
    contenido: "El usuario reconoce que las actividades de trekking y senderismo presentan riesgos naturales y humanos que no pueden ser eliminados completamente mediante una aplicación tecnológica.\n\nCode-Trekking proporciona herramientas de apoyo, pero no puede garantizar que una ruta sea segura, transitable, accesible o adecuada para las condiciones particulares de cada usuario.\n\nLa utilización de la aplicación no elimina la obligación del usuario de evaluar los riesgos existentes y adoptar las medidas de seguridad correspondientes.\n\nLas limitaciones anteriores se entienden sin perjuicio de los derechos que correspondan al usuario conforme a la legislación vigente y de aquellas responsabilidades que legalmente no puedan ser excluidas o limitadas."
  },
  {
    numero: "21",
    titulo: "Eliminación de cuenta",
    contenido: "El usuario podrá solicitar la eliminación de su cuenta mediante las funcionalidades disponibles en la aplicación.\n\nLa eliminación podrá implicar la pérdida de acceso a determinadas funcionalidades, eventos, configuraciones o información asociada a la cuenta.\n\nLa eliminación de información estará sujeta a las obligaciones legales de conservación que puedan resultar aplicables.\n\nCuando corresponda, determinados registros podrán mantenerse durante el período exigido por la legislación aplicable o por razones legítimas de seguridad y cumplimiento normativo."
  },
  {
    numero: "22",
    titulo: "Modificaciones de los términos",
    contenido: "Code-Trekking podrá actualizar estos Términos y Condiciones para reflejar modificaciones en sus funcionalidades, servicios, tecnologías utilizadas o normativa aplicable.\n\nCuando una modificación sea relevante, se procurará informar al usuario mediante los mecanismos disponibles dentro de la aplicación.\n\nLa fecha de actualización será indicada en la parte superior de este documento."
  },
  {
    numero: "23",
    titulo: "Legislación y jurisdicción",
    contenido: "Estos Términos y Condiciones se interpretarán de acuerdo con la legislación vigente de la República de Chile, sin perjuicio de los derechos irrenunciables que correspondan a los usuarios conforme a la normativa aplicable.\n\nCualquier controversia relacionada con el uso de la aplicación deberá ser tratada conforme a los mecanismos y procedimientos establecidos por la legislación chilena vigente."
  },
  {
    numero: "24",
    titulo: "Aceptación de los términos",
    contenido: "Al seleccionar la opción **“Acepto los términos y condiciones”**, el usuario declara que ha tenido acceso al presente documento, que ha podido revisarlo y que acepta sus condiciones.\n\nSi el usuario no está de acuerdo con estos términos, deberá abstenerse de utilizar las funcionalidades que requieran su aceptación.\n\nLa aceptación de estos términos no implica renuncia a derechos que la legislación chilena reconozca como irrenunciables."
  },
  {
    numero: "PESTAL",
    titulo: "Compromiso integral de Code-Trekking",
    contenido: "El funcionamiento de Code-Trekking considera factores políticos, económicos, sociales, tecnológicos, ambientales y legales que pueden afectar el uso de la plataforma y las actividades de trekking.\n\n- **Político:** respeto de disposiciones y restricciones establecidas por autoridades competentes.\n- **Económico:** transparencia respecto de costos externos y responsabilidad económica del usuario.\n- **Social:** inclusión, respeto, convivencia y prevención de conductas discriminatorias.\n- **Tecnológico:** seguridad informática, disponibilidad y protección de la información.\n- **Ambiental:** protección de ecosistemas, biodiversidad y espacios naturales.\n- **Legal:** cumplimiento de la legislación chilena aplicable a la plataforma y sus actividades."
  },
  {
    numero: "",
    titulo: "Información importante",
    contenido: "Este documento ha sido elaborado como parte de las condiciones de uso de Code-Trekking y considera aspectos tecnológicos, operativos, ambientales, sociales y legales relevantes para el proyecto.\n\nLa inclusión de referencias normativas tiene carácter informativo y no constituye asesoría jurídica. Ante situaciones que requieran interpretación legal específica, deberá consultarse a un profesional del área jurídica."
  },
];
