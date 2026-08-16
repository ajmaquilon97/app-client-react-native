/**
 * Saneadores de entrada de texto.
 *
 * Todos funcionan por **lista blanca** —declaran qué se conserva, no qué se
 * quita— y es deliberado. Filtrar emojis por lista negra es una carrera
 * perdida: cada versión de Unicode añade rangos, y además hay que cubrir las
 * secuencias ZWJ, los modificadores de tono de piel, los keycaps y las banderas
 * (pares de indicadores regionales). Diciendo qué se admite, todo eso queda
 * fuera sin enumerarlo.
 *
 * El otro motivo es el motor. `\p{Extended_Pictographic}` obliga a confiar en
 * el soporte de property escapes de Hermes, que no es el V8 con el que corren
 * los tests: un fallo así no aparecería hasta estar en el dispositivo. Estos
 * rangos se comportan igual en ambos.
 *
 * Sanean en silencio, sin mensaje de error: el carácter simplemente no llega a
 * aparecer. Avisar de algo que el usuario ya ve que no se escribió sobra.
 */

const NO_DIGITOS = /[^0-9]/g;

/**
 * Cédula o RUC: solo dígitos. De paso se lleva letras, espacios, signos y
 * emojis. El `keyboardType="number-pad"` del campo es únicamente una
 * sugerencia al teclado — no impide pegar texto ni escribir con un teclado
 * físico, así que el saneo tiene que estar aquí igualmente.
 */
export function soloDigitos(texto: string): string {
  return texto.replace(NO_DIGITOS, '');
}

// Letras latinas acentuadas por rangos (À-Ö, Ø-ö, ø-ÿ) para dejar fuera × y ÷,
// que caen justo en medio del bloque. Se admite la puntuación que aparece en
// razones sociales reales: "Comercial Pérez & Hijos S.A.", "O'Connor",
// "Martínez-Lara".
const NO_NOMBRE = /[^A-Za-zÀ-ÖØ-öø-ÿ .,&'-]/g;

/** Nombre o razón social: sin números y sin emojis. */
export function soloNombre(texto: string): string {
  return texto.replace(NO_NOMBRE, '');
}

const NO_CORREO = /[^A-Za-z0-9@._+-]/g;

/**
 * Correo: el juego de caracteres de una dirección de uso real. No valida la
 * forma (eso es cosa de quien la envíe), solo impide meter lo que ninguna
 * dirección puede llevar, emojis incluidos.
 */
export function soloCorreo(texto: string): string {
  return texto.replace(NO_CORREO, '');
}
