import { soloCorreo, soloDigitos, soloNombre } from '../texto';

/**
 * Saneadores de los campos de facturación. Lo que se verifica aquí es el
 * contrato de cada lista blanca, y sobre todo que los emojis no entren por
 * ninguno de los tres: son el caso que más formas tiene de colarse.
 */

// Un emoji simple, uno con modificador de tono de piel, una secuencia ZWJ
// (familia) y una bandera (par de indicadores regionales). Una lista negra de
// rangos deja pasar casi siempre alguno de estos.
const EMOJIS = ['😀', '👍🏽', '👨‍👩‍👧‍👦', '🇪🇨'];

// El keycap va aparte porque no es un carácter suelto: es el dígito "1" más un
// selector de variación y el combinador de keycap. Al quitar esos dos deja de
// ser emoji, pero el dígito sigue ahí — y donde los dígitos son legales
// (cédula, correo) se queda, que es lo correcto.
const KEYCAP = '1️⃣';

describe('soloDigitos', () => {
  it('conserva la cédula tal cual', () => {
    expect(soloDigitos('0102030405')).toBe('0102030405');
  });

  it('quita las letras', () => {
    expect(soloDigitos('01abc02030405')).toBe('0102030405');
  });

  it('quita espacios y signos de un valor pegado', () => {
    expect(soloDigitos(' 0102-0304.05 ')).toBe('0102030405');
  });

  it.each(EMOJIS)('quita el emoji %s', emoji => {
    expect(soloDigitos(`0102${emoji}030405`)).toBe('0102030405');
  });

  it('del keycap deja solo su dígito, ya sin nada de emoji', () => {
    expect(soloDigitos(`0102${KEYCAP}030405`)).toBe('01021030405');
  });

  it('devuelve vacío si no había ningún dígito', () => {
    expect(soloDigitos('cédula')).toBe('');
  });
});

describe('soloNombre', () => {
  it('quita los números', () => {
    expect(soloNombre('Juan 123 Pérez')).toBe('Juan  Pérez');
  });

  it('conserva las tildes y la eñe', () => {
    expect(soloNombre('Muñoz Ávila Íñigo')).toBe('Muñoz Ávila Íñigo');
  });

  // Razones sociales reales: si el saneo se las come, el campo es inservible
  // para facturar a una empresa.
  it.each([
    'Comercial Pérez & Hijos S.A.',
    "O'Connor",
    'Martínez-Lara',
    'Espacios Agora, Cía. Ltda.',
  ])('conserva la razón social %s', razonSocial => {
    expect(soloNombre(razonSocial)).toBe(razonSocial);
  });

  it.each([...EMOJIS, KEYCAP])('quita el emoji %s', emoji => {
    expect(soloNombre(`Juan${emoji} Pérez`)).toBe('Juan Pérez');
  });

  it('quita los símbolos que no aparecen en un nombre', () => {
    expect(soloNombre('Juan <script>Pérez')).toBe('Juan scriptPérez');
  });
});

describe('soloCorreo', () => {
  it('conserva una dirección normal', () => {
    expect(soloCorreo('cliente.uno+factura@ejemplo-mail.com')).toBe(
      'cliente.uno+factura@ejemplo-mail.com',
    );
  });

  it.each(EMOJIS)('quita el emoji %s', emoji => {
    expect(soloCorreo(`cliente${emoji}@ejemplo.com`)).toBe('cliente@ejemplo.com');
  });

  it('del keycap deja solo su dígito, que sí puede ir en un correo', () => {
    expect(soloCorreo(`cliente${KEYCAP}@ejemplo.com`)).toBe('cliente1@ejemplo.com');
  });

  it('quita los espacios que llegan al pegar', () => {
    expect(soloCorreo(' cliente@ejemplo.com ')).toBe('cliente@ejemplo.com');
  });
});
