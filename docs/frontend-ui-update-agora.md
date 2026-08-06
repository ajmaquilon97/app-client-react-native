# Unificación de Identidad Visual y Paleta de Colores — Portal Web (Next.js)

> **De:** Equipo Técnico / Backend
> **Para:** Equipo Frontend Web (Ángel y equipo)
> **Fecha:** 2026-08-06
> **Contexto:** Actualmente, existe una desincronización en la identidad visual entre las plataformas de Agora. La app móvil (cliente) ya utiliza la nueva paleta de colores corporativa y el logotipo actualizado, mientras que el portal web de administración (anfitriones) sigue utilizando la versión antigua (colores `#487AD0` y `#8F0E55`). Este documento formaliza la solicitud para unificar el diseño del portal web con la línea gráfica definitiva de la marca.

---

## 1. Actualización de Paleta de Colores (Theme)

Se requiere actualizar las variables de color globales (ya sea en CSS variables, Tailwind config o el Theme Provider utilizado en Next.js) para reemplazar los colores antiguos por los nuevos.

| Elemento | Color Anterior (A reemplazar) | Nuevo Color (Aplicar) | Aplicación UI |
|---|---|---|---|
| **Primario** | Azul claro (`#487AD0`) | **Azul oscuro (`#1E3A5F`)** | Sidebar, botones principales primarios, headers, panel izquierdo del Login. |
| **Secundario** | Fucsia/Vino (`#8F0E55`) | **Verde/Teal (`#14B8A6`)** | Badges de notificación (ej. el contador en el menú), acentos e íconos de estado. |

> **Nota de Accesibilidad:** Por favor, hacer una revisión rápida del contraste de los textos sobre el nuevo color primario (`#1E3A5F`). Al ser un azul mucho más profundo, los textos que actualmente son blancos seguirán viéndose perfectos, pero se debe revisar que no existan textos oscuros sobre fondos primarios.

---

## 2. Actualización de Logotipo

El logotipo actual del portal web (ícono circular con puntos periféricos) se encuentra obsoleto.

**Acciones requeridas:**
1. Reemplazar el logo antiguo por el **nuevo isotipo de Agora** (el diseño con forma de "A" tipo casa/espacio con un punto central, visible actualmente en el *splash screen* de la app móvil).
2. Actualizar el logo en la pantalla de **Login** (esquina superior derecha).
3. Actualizar el logo en la **Barra Lateral (Sidebar)** del dashboard (esquina superior izquierda).
4. Asegurar que los nuevos assets reemplacen a los antiguos en la carpeta `public/` para evitar acumulación de archivos huérfanos.

---

## 3. Pantallas Críticas a Revisar

Aunque el cambio de variables globales debería aplicar el rediseño en cascada, por favor confirmar visualmente que no haya colores "quemados" (hardcodeados) en los siguientes componentes:

*   **Pantalla de Login:** El gradiente o color sólido del panel izquierdo y el color de fondo del botón "Iniciar sesión".
*   **Dashboard / Menú:** El fondo del menú de navegación lateral y el color de resaltado del ítem activo (ej. "Dashboard" o "Reservas").
*   **Indicadores Numéricos:** El globo numérico de notificaciones (ej. el número "8" en la captura actual) debe adoptar el nuevo verde secundario (`#14B8A6`).

---

## 4. Checklist de Confirmación

- [ ] Variables de color actualizadas en el archivo de configuración global.
- [ ] Nuevo logotipo de Agora renderizado correctamente en el Login.
- [ ] Nuevo logotipo renderizado correctamente en el Sidebar del Dashboard.
- [ ] Revisión de contraste de texto sobre el nuevo azul primario completada.
- [ ] Búsqueda y eliminación de clases o estilos que mantuvieran los colores `#487AD0` y `#8F0E55` hardcodeados en los componentes.