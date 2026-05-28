import { Espacio } from '@/types';

export const ESPACIOS_DATA: Espacio[] = [
  {
    id: 1,
    nombre: 'Complejo Deportivo El Campín',
    categoria: 'canchas',
    subcategoria: 'Fútbol Sintética',
    ubicacion: 'Norte de la Ciudad',
    precio: 25,
    unidad: 'hora',
    rating: 4.8,
    reviews: 124,
    distancia: 1.2,
    disponibleHoy: true,
    imagen:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Espectacular cancha de fútbol 7 con césped sintético de última generación, iluminación LED profesional de alta potencia, camerinos equipados y parqueadero privado vigilado las 24 horas. Ideal para torneos corporativos o partidos amistosos.',
    servicios: ['Iluminación profesional', 'Parqueadero privado', 'Duchas de agua caliente', 'Cafetería y bebidas'],
    anfitrion: {
      nombre: 'Carlos Mendoza',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      registro: 'Miembro desde 2021',
      verificado: true,
    },
    normas: [
      'Prohibido calzado de pupos de metal',
      'No se permiten mascotas en la cancha',
      'Llegar 15 minutos antes de la reserva',
    ],
    comentarios: [
      { usuario: 'Andrés G.', rating: 5, fecha: 'Hace 2 días', texto: 'La cancha está en excelente estado. La iluminación LED de noche es perfecta.' },
      { usuario: 'Sofía M.', rating: 4, fecha: 'Hace 1 semana', texto: 'Muy buena atención, las duchas limpias. Volveré el próximo fin de semana.' },
    ],
  },
  {
    id: 2,
    nombre: 'Club Tenis Grand Slam',
    categoria: 'canchas',
    subcategoria: 'Tenis de Arcilla',
    ubicacion: 'Vía Samborondón',
    precio: 35,
    unidad: 'hora',
    rating: 4.9,
    reviews: 86,
    distancia: 4.5,
    disponibleHoy: false,
    imagen:
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Canchas de polvo de ladrillo oficiales con drenaje rápido y excelente mantenimiento diario. Alquiler de raquetas de nivel profesional y pelotas presurizadas disponible en recepción. Servicio de sparring e instrucción premium bajo pedido previo.',
    servicios: ['Entrenador certificado', 'Iluminación LED', 'Lockers seguros', 'Tienda de accesorios'],
    anfitrion: {
      nombre: 'Mariela Silva',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      registro: 'Miembro desde 2022',
      verificado: true,
    },
    normas: [
      'Uso obligatorio de calzado para tenis',
      'No arrojar basura en la arcilla',
      'Cancelaciones con 24h de anticipación',
    ],
    comentarios: [
      { usuario: 'Roberto L.', rating: 5, fecha: 'Hace 3 días', texto: 'La mejor arcilla del sector. El personal de mantenimiento hace un trabajo asombroso.' },
    ],
  },
  {
    id: 3,
    nombre: 'Piscina Temperada Oasis',
    categoria: 'piscinas',
    subcategoria: 'Familiar y Climatizada',
    ubicacion: 'Urdesa Central',
    precio: 45,
    unidad: 'bloque (4 hrs)',
    rating: 4.7,
    reviews: 98,
    distancia: 0.8,
    disponibleHoy: true,
    imagen:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Piscina recreativa con temperatura regulada constantemente a 28°C, perfecta para natación libre, terapia física o eventos familiares privados de tamaño moderado. Cuenta con un área de barbacoa completamente equipada para su uso libre.',
    servicios: ['Área de parrilla', 'Salvavidas de turno', 'Sillas Reclinables', 'WIFI de alta velocidad'],
    anfitrion: {
      nombre: 'Jorge Villacís',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      registro: 'Miembro desde 2020',
      verificado: true,
    },
    normas: [
      'Uso obligatorio de gorro de baño',
      'No ingresar envases de vidrio al área húmeda',
      'Máximo 15 personas',
    ],
    comentarios: [
      { usuario: 'Daniela K.', rating: 5, fecha: 'Hace 5 días', texto: 'Un lugar muy acogedor para ir con niños. La barbacoa tiene de todo.' },
      { usuario: 'Carlos T.', rating: 4, fecha: 'Hace 2 semanas', texto: 'Temperatura ideal y muy privado. El agua estaba cristalina.' },
    ],
  },
  {
    id: 4,
    nombre: 'La Laguna Club & Pool',
    categoria: 'piscinas',
    subcategoria: 'Recreativa con Tobogán',
    ubicacion: 'Vía a la Costa',
    precio: 60,
    unidad: 'día entero',
    rating: 4.9,
    reviews: 142,
    distancia: 8.3,
    disponibleHoy: true,
    imagen:
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Paraje tropical privado con piscina sin fin, cascada artificial de roca y un divertido tobogán para los más pequeños. Espacio ideal para pasar un día entero de sol inigualable con amigos, rodeado de vegetación natural y tranquilidad.',
    servicios: ['Bar Húmedo equipado', 'Cabañas de descanso', 'Música Ambiente', 'Parque Infantil de madera'],
    anfitrion: {
      nombre: 'Alejandra Torres',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
      registro: 'Miembro desde 2019',
      verificado: true,
    },
    normas: [
      'Prohibido el ingreso de bebidas alcohólicas externas',
      'Música a volumen moderado',
      'No correr cerca de los bordes',
    ],
    comentarios: [
      { usuario: 'Gabriela F.', rating: 5, fecha: 'Hace 1 día', texto: 'Las cabañas son preciosas y la vista de la piscina infinita es espectacular.' },
    ],
  },
  {
    id: 5,
    nombre: 'Salón de Eventos Royal Palace',
    categoria: 'salones',
    subcategoria: 'Matrimonios y Corporativos',
    ubicacion: 'Centro Financiero',
    precio: 120,
    unidad: 'evento',
    rating: 4.9,
    reviews: 210,
    distancia: 2.1,
    disponibleHoy: false,
    imagen:
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Elegante salón cerrado con acústica de primera calidad y diseño contemporáneo. Capacidad adaptativa para hasta 150 invitados sentados. Incluye sistema de aire acondicionado central automatizado, cocina industrial para catering y suite de preparación privada para los organizadores.',
    servicios: ['Servicio de catering opcional', 'Sonido e iluminación profesional', 'Seguridad Privada', 'Climatización automatizada'],
    anfitrion: {
      nombre: 'Fernando Rivas',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      registro: 'Miembro desde 2018',
      verificado: true,
    },
    normas: [
      'Respetar el aforo máximo de 150 personas',
      'Entrega del salón limpio al finalizar',
      'Depósito de garantía reembolsable requerido',
    ],
    comentarios: [
      { usuario: 'Lorena V.', rating: 5, fecha: 'Hace 1 mes', texto: 'Celebramos nuestra boda aquí y todo fue impecable. La acústica es excelente.' },
    ],
  },
  {
    id: 6,
    nombre: 'Salón Jardín Las Orquídeas',
    categoria: 'salones',
    subcategoria: 'Cumpleaños y Baby Showers',
    ubicacion: 'La Aurora',
    precio: 80,
    unidad: 'hora',
    rating: 4.6,
    reviews: 74,
    distancia: 5.2,
    disponibleHoy: true,
    imagen:
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Salón semiabierto de arquitectura rústica rodeado de hermosos jardines florales y árboles frutales. Perfecto para reuniones íntimas de día, aniversarios o eventos infantiles al aire libre. Área techada amplia y cocina integrada para el uso del banquetero.',
    servicios: ['Jardín exterior amplio', 'Cocina semi-equipada', 'Mobiliario rústico básico', 'Estacionamiento privado'],
    anfitrion: {
      nombre: 'Clara Espinoza',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      registro: 'Miembro desde 2022',
      verificado: false,
    },
    normas: [
      'Prohibido dañar o arrancar las flores',
      'Horario límite de música hasta las 20:00',
      'Recogida de residuos obligatoria',
    ],
    comentarios: [
      { usuario: 'Mateo S.', rating: 5, fecha: 'Hace 4 días', texto: 'Un jardín hermoso, perfecto para el cumpleaños de mi hija de un año.' },
    ],
  },
];
