# Tema global

Todo lo visual de la app se controla desde [`index.ts`](./index.ts): plantilla de
colores, títulos y subtítulos, tamaños de letra, espaciados, radios y sombras.

React Native no usa CSS. `src/global.css` solo aplica a la build web (define las
familias tipográficas). El equivalente al "CSS global" es este archivo de tokens.

## Reglas

1. Nunca escribas un color hexadecimal ni un `fontSize` numérico en una pantalla
   o componente. Usa un token.
2. Los estilos se declaran con `makeStyles`, no con `StyleSheet.create`.
3. Los colores que van directos en el JSX (iconos, `tintColor`,
   `placeholderTextColor`) se leen con `useTheme()`.

## Uso

```tsx
import { makeStyles, useTheme } from '@/shared/theme';

export default function MiPantalla() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Título</Text>
      <Text style={styles.subtitulo}>Subtítulo</Text>
      <HeartIcon color={colors.favorite} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    ...t.shadows.md,
  },
  titulo: { ...t.typography.h2, color: t.colors.textPrimary },
  subtitulo: { ...t.typography.subtitle, color: t.colors.textSecondary },
}));
```

`makeStyles` calcula la hoja de estilos una sola vez por esquema de color y la
reutiliza en cada render, así que no cuesta más que un `StyleSheet.create`.

## Jerarquía tipográfica

Las variantes de `typography` no llevan color: el color se aplica aparte con un
token, para que el mismo estilo sirva sobre fondo claro y oscuro.

| Variante | Tamaño | Uso |
| --- | --- | --- |
| `jumbo` / `display` | 40 / 32 | Cifras destacadas, pantalla de bienvenida |
| `h1` / `h2` / `h3` | 28 / 24 / 20 | Título de pantalla, de sección, de tarjeta |
| `title` | 18 | Título de fila o modal |
| `subtitle` / `subtitleSm` | 16 / 14 | Subtítulo bajo un título |
| `body` / `bodyStrong` | 16 | Párrafo |
| `bodySm` / `bodySmStrong` | 14 | Párrafo en listas (el más frecuente) |
| `label` | 14 | Etiqueta de formulario |
| `caption` / `captionStrong` | 12 | Metadatos, chips |
| `overline` | 11 | Encabezado de grupo en mayúsculas |
| `tiny` | 10 | Contadores, etiquetas de tab bar |
| `button` / `buttonSm` | 16 / 14 | Texto de botón |
| `link` | 14 | Enlaces |
| `code` | 12 | Monoespaciado |

## Colores: relleno vs. texto

La distinción más importante de la paleta, y la que hay que respetar para que el
modo oscuro funcione:

- **`primary`** es el color de **relleno** de marca (fondo de cabeceras y botones
  primarios). Encima siempre va `onPrimary`. En tema oscuro se aclara solo lo
  justo para seguir siendo un fondo.
- **`primaryText`** es el color de marca para **texto e iconos** sobre un fondo
  normal (`background`, `surface`). En tema oscuro es un azul claro y legible.

Usar `primary` como color de texto deja texto azul oscuro sobre fondo oscuro.
Lo mismo aplica a `accent` / `onAccent`.

Los textos de la cabecera de marca (`headerText`, `headerTextMuted`,
`headerTextSubtle`) son claros en ambos temas, porque la cabecera se rellena con
`primary` y ese relleno es oscuro en los dos.

## Cambiar la plantilla

- **Colores**: edita `lightColors` y `darkColors`. Todo token definido en el tema
  claro es obligatorio en el oscuro (lo garantiza el tipo `ThemeColors`).
- **Tipografía**: edita `typography` (y `fontSize` si cambia la escala).
- **Espaciados y radios**: `spacing` y `radius`.

## Modo oscuro

Se sigue el esquema del sistema (`userInterfaceStyle: "automatic"` en `app.json`).
Para forzar la barra de estado correcta sobre `background` o `surface` usa
`statusBarStyle` del tema; sobre la cabecera de marca usa siempre
`"light-content"`.

No hay selector manual claro/oscuro. Para añadirlo, envuelve la app en un
provider que exponga el esquema elegido y sustituye `useAppColorScheme` por la
lectura de ese contexto: es el único punto que consultan `useTheme` y
`makeStyles`.
