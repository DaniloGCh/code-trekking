import { SeccionTerminos } from 'src/app/core/services/terminos.service';

// =========================
// 🧩 FORMATO DEL TEXTO DE LOS TÉRMINOS
// =========================
// Convierte el texto de cada sección en bloques que la plantilla pinta sin
// innerHTML (no hay riesgo de inyectar HTML):
// - Párrafos separados por una línea en blanco.
// - Líneas que empiezan con "- " forman una lista.
// - **texto** se muestra en negrita.

export interface ParteTexto {
  texto: string;
  negrita: boolean;
}

export interface BloqueTexto {
  tipo: 'parrafo' | 'lista';
  /** Partes del párrafo (tipo 'parrafo'). */
  partes?: ParteTexto[];
  /** Ítems de la lista (tipo 'lista'). */
  items?: ParteTexto[][];
}

export interface SeccionRender {
  numero: string;
  titulo: string;
  bloques: BloqueTexto[];
}

const PREFIJO_LISTA = /^[-•]\s+/;

export function parsearNegritas(texto: string): ParteTexto[] {
  return texto
    .split('**')
    .map((parte, i) => ({ texto: parte, negrita: i % 2 === 1 }))
    .filter(parte => parte.texto.length > 0);
}

export function parsearBloques(contenido: string | null | undefined): BloqueTexto[] {
  const bloques: BloqueTexto[] = [];
  const parrafos = (contenido ?? '').replace(/\r\n/g, '\n').split(/\n\s*\n/);

  for (const parrafo of parrafos) {
    const lineas = parrafo.split('\n').map(l => l.trim()).filter(Boolean);

    let textoParrafo: string[] = [];
    let items: ParteTexto[][] = [];

    const cerrarParrafo = () => {
      if (textoParrafo.length) {
        bloques.push({ tipo: 'parrafo', partes: parsearNegritas(textoParrafo.join(' ')) });
        textoParrafo = [];
      }
    };

    const cerrarLista = () => {
      if (items.length) {
        bloques.push({ tipo: 'lista', items });
        items = [];
      }
    };

    for (const linea of lineas) {
      if (PREFIJO_LISTA.test(linea)) {
        cerrarParrafo();
        items.push(parsearNegritas(linea.replace(PREFIJO_LISTA, '')));
      } else {
        cerrarLista();
        textoParrafo.push(linea);
      }
    }

    cerrarParrafo();
    cerrarLista();
  }

  return bloques;
}

export function prepararSecciones(secciones: SeccionTerminos[]): SeccionRender[] {
  return secciones.map(seccion => ({
    numero: seccion.numero,
    titulo: seccion.titulo,
    bloques: parsearBloques(seccion.contenido)
  }));
}
