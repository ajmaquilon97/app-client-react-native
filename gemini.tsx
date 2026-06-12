import { useMemo, useState } from 'react';
// Datos quemados
// Datos de los espacios recreativos con atributos ampliados para la nueva ventana de detalles
const ESPACIOS_DATA = [
  {
    id: 1,
    nombre: "Complejo Deportivo El Campín",
    categoria: "canchas",
    subcategoria: "Fútbol Sintética",
    ubicación: "Norte de la Ciudad",
    precio: 25,
    unidad: "hora",
    rating: 4.8,
    reviews: 124,
    distancia: 1.2,
    disponibleHoy: true,
    imagen: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80",
    descripcion: "Espectacular cancha de fútbol 7 con césped sintético de última generación, iluminación LED profesional de alta potencia, camerinos equipados y parqueadero privado vigilado las 24 horas. Ideal para torneos corporativos o partidos amistosos.",
    servicios: ["Iluminación profesional", "Parqueadero privado", "Duchas de agua caliente", "Cafetería y bebidas"],
    anfitrion: {
      nombre: "Carlos Mendoza",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      registro: "Miembro desde 2021",
      verificado: true
    },
    normas: ["Prohibido calzado de pupos de metal", "No se permiten mascotas en la cancha", "Llegar 15 minutos antes de la reserva"],
    comentarios: [
      { usuario: "Andrés G.", rating: 5, fecha: "Hace 2 días", texto: "La cancha está en excelente estado. La iluminación LED de noche es perfecta." },
      { usuario: "Sofía M.", rating: 4, fecha: "Hace 1 semana", texto: "Muy buena atención, las duchas limpias. Volveré el próximo fin de semana." }
    ]
  },
  {
    id: 2,
    nombre: "Club Tenis Grand Slam",
    categoria: "canchas",
    subcategoria: "Tenis de Arcilla",
    ubicación: "Vía Samborondón",
    precio: 35,
    unidad: "hora",
    rating: 4.9,
    reviews: 86,
    distancia: 4.5,
    disponibleHoy: false,
    imagen: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80",
    descripcion: "Canchas de polvo de ladrillo oficiales con drenaje rápido y excelente mantenimiento diario. Alquiler de raquetas de nivel profesional y pelotas presurizadas disponible en recepción. Servicio de sparring e instrucción premium bajo pedido previo.",
    servicios: ["Entrenador certificado", "Iluminación LED", "Lockers seguros", "Tienda de accesorios"],
    anfitrion: {
      nombre: "Mariela Silva",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      registro: "Miembro desde 2022",
      verificado: true
    },
    normas: ["Uso obligatorio de calzado para tenis", "No arrojar basura en la arcilla", "Cancelaciones con 24h de anticipación"],
    comentarios: [
      { usuario: "Roberto L.", rating: 5, fecha: "Hace 3 días", texto: "La mejor arcilla del sector. El personal de mantenimiento hace un trabajo asombroso." }
    ]
  },
  {
    id: 3,
    nombre: "Piscina Temperada Oasis",
    categoria: "piscinas",
    subcategoria: "Familiar y Climatizada",
    ubicación: "Urdesa Central",
    precio: 45,
    unidad: "bloque (4 hrs)",
    rating: 4.7,
    reviews: 98,
    distancia: 0.8,
    disponibleHoy: true,
    imagen: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80",
    descripcion: "Piscina recreativa con temperatura regulada constantemente a 28°C, perfecta para natación libre, terapia física o eventos familiares privados de tamaño moderado. Cuenta con un área de barbacoa completamente equipada para su uso libre.",
    servicios: ["Área de parrilla", "Salvavidas de turno", "Sillas Reclinables", "WIFI de alta velocidad"],
    anfitrion: {
      nombre: "Jorge Villacís",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      registro: "Miembro desde 2020",
      verificado: true
    },
    normas: ["Uso obligatorio de gorro de baño", "No ingresar envases de vidrio al área húmeda", "Máximo 15 personas"],
    comentarios: [
      { usuario: "Daniela K.", rating: 5, fecha: "Hace 5 días", texto: "Un lugar muy acogedor para ir con niños. La barbacoa tiene de todo." },
      { usuario: "Carlos T.", rating: 4, fecha: "Hace 2 semanas", texto: "Temperatura ideal y muy privado. El agua estaba cristalina." }
    ]
  },
  {
    id: 4,
    nombre: "La Laguna Club & Pool",
    categoria: "piscinas",
    subcategoria: "Recreativa con Tobogán",
    ubicación: "Vía a la Costa",
    precio: 60,
    unidad: "día entero",
    rating: 4.9,
    reviews: 142,
    distancia: 8.3,
    disponibleHoy: true,
    imagen: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80",
    descripcion: "Paraje tropical privado con piscina sin fin, cascada artificial de roca y un divertido tobogán para los más pequeños. Espacio ideal para pasar un día entero de sol inigualable con amigos, rodeado de vegetación natural y tranquilidad.",
    servicios: ["Bar Húmedo equipado", "Cabañas de descanso", "Música Ambiente", "Parque Infantil de madera"],
    anfitrion: {
      nombre: "Alejandra Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
      registro: "Miembro desde 2019",
      verificado: true
    },
    normas: ["Prohibido el ingreso de bebidas alcohólicas externas", "Música a volumen moderado", "No correr cerca de los bordes"],
    comentarios: [
      { usuario: "Gabriela F.", rating: 5, fecha: "Hace 1 día", texto: "Las cabañas son preciosas y la vista de la piscina infinita es espectacular." }
    ]
  },
  {
    id: 5,
    nombre: "Salón de Eventos Royal Palace",
    categoria: "salones",
    subcategoria: "Matrimonios y Corporativos",
    ubicación: "Centro Financiero",
    precio: 120,
    unidad: "evento",
    rating: 4.9,
    reviews: 210,
    distancia: 2.1,
    disponibleHoy: false,
    imagen: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80",
    descripcion: "Elegante salón cerrado con acústica de primera calidad y diseño contemporáneo. Capacidad adaptativa para hasta 150 invitados sentados. Incluye sistema de aire acondicionado central automatizado, cocina industrial para catering y suite de preparación privada para los organizadores.",
    servicios: ["Servicio de catering opcional", "Sonido e iluminación profesional", "Seguridad Privada", "Climatización automatizada"],
    anfitrion: {
      nombre: "Fernando Rivas",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
      registro: "Miembro desde 2018",
      verificado: true
    },
    normas: ["Respetar el aforo máximo de 150 personas", "Entrega del salón limpio al finalizar", "Depósito de garantía reembolsable requerido"],
    comentarios: [
      { usuario: "Lorena V.", rating: 5, fecha: "Hace 1 mes", texto: "Celebramos nuestra boda aquí y todo fue impecable. La acústica es excelente." }
    ]
  },
  {
    id: 6,
    nombre: "Salón Jardín Las Orquídeas",
    categoria: "salones",
    subcategoria: "Cumpleaños y Baby Showers",
    ubicación: "La Aurora",
    precio: 80,
    unidad: "hora",
    rating: 4.6,
    reviews: 74,
    distancia: 5.2,
    disponibleHoy: true,
    imagen: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80",
    descripcion: "Salón semiabierto de arquitectura rústica rodeado de hermosos jardines florales y árboles frutales. Perfecto para reuniones íntimas de día, aniversarios o eventos infantiles al aire libre. Área techada amplia y cocina integrada para el uso del banquetero.",
    servicios: ["Jardín exterior amplio", "Cocina semi-equipada", "Mobiliario rústico básico", "Estacionamiento privado"],
    anfitrion: {
      nombre: "Clara Espinoza",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
      registro: "Miembro desde 2022",
      verificado: false
    },
    normas: ["Prohibido dañar o arrancar las flores", "Horario límite de música hasta las 20:00", "Recogida de residuos obligatoria"],
    comentarios: [
      { usuario: "Mateo S.", rating: 5, fecha: "Hace 4 días", texto: "Un jardín hermoso, perfecto para el cumpleaños de mi hija de un año." }
    ]
  }
];

const SUGERENCIAS_BASE = ["Fútbol", "Tenis", "Piscina", "Salón", "Urdesa", "Cumpleaños", "Norte", "Costa", "Bodas", "Arcilla", "Familiar"];

const calcularCoincidenciasFuzzy = (query, categoriaSeleccionada) => {
  if (!query) return { exactas: [], aproximadas: [], esFuzzyMode: false, tokens: [] };

  const queryLimpia = query.toLowerCase().trim();
  const palabrasBusqueda = queryLimpia.split(/\s+/).filter(w => w.length > 1);

  const exactas = ESPACIOS_DATA.filter(espacio => {
    const coincideCategoria = categoriaSeleccionada ? espacio.categoria === categoriaSeleccionada : true;
    const campoDeBusqueda = `${espacio.nombre} ${espacio.subcategoria} ${espacio.ubicación} ${espacio.descripcion}`.toLowerCase();
    return coincideCategoria && campoDeBusqueda.includes(queryLimpia);
  });

  const puntuadas = ESPACIOS_DATA.map(espacio => {
    const coincideCategoria = categoriaSeleccionada ? espacio.categoria === categoriaSeleccionada : true;
    if (!coincideCategoria) return { espacio, score: 0 };

    let score = 0;
    const campoDeBusqueda = `${espacio.nombre} ${espacio.categoria} ${espacio.subcategoria} ${espacio.ubicación} ${espacio.descripcion}`.toLowerCase();

    palabrasBusqueda.forEach(palabra => {
      if (campoDeBusqueda.includes(palabra)) {
        score += 10;
        if (espacio.nombre.toLowerCase().includes(palabra)) score += 10;
        if (espacio.categoria.toLowerCase().includes(palabra)) score += 8;
        if (espacio.subcategoria.toLowerCase().includes(palabra)) score += 8;
      }
    });

    const maxPosibleScore = palabrasBusqueda.length * 20;
    const coincidenciaPorcentaje = maxPosibleScore > 0 ? Math.min(100, Math.round((score / maxPosibleScore) * 100)) : 0;

    return { 
      espacio: { ...espacio, coincidenciaPorcentaje }, 
      score 
    };
  });

  const aproximadas = puntuadas
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.espacio);

  return { exactas, aproximadas, esFuzzyMode: exactas.length === 0, tokens: palabrasBusqueda };
};

export default function App() {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [espacioDetalle, setEspacioDetalle] = useState(null);
  const [favoritos, setFavoritos] = useState([1, 4]);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [fechaReserva, setFechaReserva] = useState("");
  const [verMisReservas, setVerMisReservas] = useState(false);
  const [pantallaBusqueda, setPantallaBusqueda] = useState(false);
  const [pantallaSugeridos, setPantallaSugeridos] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState(null);
  
  const [cantidadUnidades, setCantidadUnidades] = useState(1);

  // Estados de Pasarela de Pagos
  const [pantallaPagos, setPantallaPagos] = useState(false);
  const [metodoPago, setMetodoPago] = useState('tarjeta'); // 'tarjeta' | 'wallet'
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [pagoCompletado, setPagoCompletado] = useState(false);

  // Estados de tarjetas agregadas
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState([
    {
      id: 1,
      numero: "4556 7812 3490 5214",
      nombre: "MARIANA DE LOS ANGELES",
      fecha: "12/29",
      cvv: "421",
      tipo: "visa",
      color: "from-slate-800 to-slate-950"
    },
    {
      id: 2,
      numero: "5412 7590 1283 4967",
      nombre: "MARIANA D. ANGELES",
      fecha: "08/28",
      cvv: "115",
      tipo: "mastercard",
      color: "from-cyan-900 to-emerald-950"
    }
  ]);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(1);

  // Estados del Carrusel de Agregar Tarjeta
  const [pantallaAgregarTarjeta, setPantallaAgregarTarjeta] = useState(false);
  const [pasoCarousel, setPasoCarousel] = useState(1); // 1: numero, 2: fecha, 3: cvv, 4: nombre
  const [nuevoNum, setNuevoNum] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoCvv, setNuevoCvv] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");

  // Formulario de Facturación
  const [facturaNombre, setFacturaNombre] = useState('');
  const [facturaId, setFacturaId] = useState('');
  const [facturaEmail, setFacturaEmail] = useState('');
  const [facturaDireccion, setFacturaDireccion] = useState('');

  // Lista de reservas activas
  const [reservasRealizadas, setReservasRealizadas] = useState([
    {
      id: 101,
      espacio: ESPACIOS_DATA[2], 
      fecha: "2026-06-12",
      codigo: "RES-834910",
      estado: "Confirmada",
      unidades: 1,
      total: 49.50
    }
  ]);

  const resultadoBusqueda = useMemo(() => {
    const { exactas, aproximadas, esFuzzyMode, tokens } = calcularCoincidenciasFuzzy(busqueda, categoriaSeleccionada);
    let listaOriginal = esFuzzyMode ? aproximadas : (busqueda ? exactas : ESPACIOS_DATA.filter(e => !categoriaSeleccionada || e.categoria === categoriaSeleccionada));

    if (filtroRapido === 'cercanos') {
      listaOriginal = [...listaOriginal].sort((a, b) => a.distancia - b.distancia);
    } else if (filtroRapido === 'puntuacion') {
      listaOriginal = [...listaOriginal].sort((a, b) => b.rating - a.rating);
    } else if (filtroRapido === 'inmediato') {
      listaOriginal = listaOriginal.filter(e => e.disponibleHoy);
    }

    let sugeridosOriginal = [...aproximadas];
    if (filtroRapido === 'cercanos') {
      sugeridosOriginal = [...sugeridosOriginal].sort((a, b) => a.distancia - b.distancia);
    } else if (filtroRapido === 'puntuacion') {
      sugeridosOriginal = [...sugeridosOriginal].sort((a, b) => b.rating - a.rating);
    } else if (filtroRapido === 'inmediato') {
      sugeridosOriginal = sugeridosOriginal.filter(e => e.disponibleHoy);
    }

    return { lista: listaOriginal, sugeridos: sugeridosOriginal, esFuzzyMode, tokens };
  }, [categoriaSeleccionada, busqueda, filtroRapido]);

  const espaciosFiltrados = resultadoBusqueda.lista;
  const espaciosSugeridos = resultadoBusqueda.sugeridos;

  const toggleFavorito = (id, e) => {
    if (e) e.stopPropagation();
    if (favoritos.includes(id)) {
      setFavoritos(favoritos.filter(favId => favId !== id));
    } else {
      setFavoritos([...favoritos, id]);
    }
  };

  const irAPasarelaDePagos = (e) => {
    e.preventDefault();
    if (!fechaReserva) return;
    
    setFacturaNombre("Mariana de los Ángeles");
    setFacturaId("0987654321001");
    setFacturaEmail("mariana.angeles@mail.com");
    setFacturaDireccion("Av. Samborondón Km 2.5");
    
    setPantallaPagos(true);
  };

  const ejecutarPagoFinal = (e) => {
    e.preventDefault();
    setProcesandoPago(true);

    setTimeout(() => {
      setProcesandoPago(false);
      setPagoCompletado(true);

      const subtotal = espacioDetalle.precio * cantidadUnidades;
      const tarifaPlataforma = subtotal * 0.10;
      const totalCalculado = subtotal + tarifaPlataforma;

      const nuevaReserva = {
        id: Date.now(),
        espacio: espacioDetalle,
        fecha: fechaReserva,
        codigo: `RES-${Math.floor(100000 + Math.random() * 900000)}`,
        estado: "Confirmada",
        unidades: cantidadUnidades,
        total: totalCalculado
      };

      setTimeout(() => {
        setReservasRealizadas([nuevaReserva, ...reservasRealizadas]);
        setPagoCompletado(false);
        setPantallaPagos(false);
        setEspacioDetalle(null);
        setFechaReserva("");
        setCantidadUnidades(1);
        setVerMisReservas(true); 
      }, 1500);

    }, 2200);
  };

  const cancelarReserva = (id) => {
    setReservasRealizadas(reservasRealizadas.filter(res => res.id !== id));
  };

  const handleToggleFiltroRapido = (filtro) => {
    setFiltroRapido(filtroRapido === filtro ? null : filtro);
  };

  // Funciones formateadoras del carrusel de tarjeta
  const formatNumTarjeta = (val) => {
    const raw = val.replace(/\D/g, "");
    const match = raw.match(/.{1,4}/g);
    return match ? match.slice(0, 4).join(" ") : raw;
  };

  const formatFechaTarjeta = (val) => {
    const raw = val.replace(/\D/g, "");
    if (raw.length >= 3) {
      return `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    return raw;
  };

  const handleGuardarTarjeta = (e) => {
    e.preventDefault();
    const detectTipo = nuevoNum.startsWith("5") ? "mastercard" : "visa";
    const colors = [
      "from-indigo-900 to-slate-900",
      "from-purple-900 to-rose-950",
      "from-teal-800 to-blue-950",
      "from-amber-800 to-stone-900"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const nuevaTarjeta = {
      id: Date.now(),
      numero: nuevoNum || "4000 1234 5678 9010",
      nombre: (nuevoNombre || "TITULAR TARJETA").toUpperCase(),
      fecha: nuevaFecha || "12/30",
      cvv: nuevoCvv || "999",
      tipo: detectTipo,
      color: randomColor
    };

    setTarjetasGuardadas([...tarjetasGuardadas, nuevaTarjeta]);
    setTarjetaSeleccionada(nuevaTarjeta.id);
    
    // Limpieza de estados
    setNuevoNum("");
    setNuevaFecha("");
    setNuevoCvv("");
    setNuevoNombre("");
    setPasoCarousel(1);
    setPantallaAgregarTarjeta(false);
  };

  const totalCalculado = espacioDetalle 
    ? (espacioDetalle.precio * cantidadUnidades * 1.10).toFixed(2) 
    : "0.00";

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-4 flex justify-center items-center font-sans antialiased text-[#1F2937]">
      {/* FRAME SIMULADOR MÓVIL */}
      <div className="w-full max-w-md bg-[#F5F7FA] rounded-[40px] shadow-2xl overflow-hidden border-8 border-slate-800 flex flex-col relative aspect-[9/19] max-h-[880px]">
        
        {/* Status bar ficticia */}
        <div className="bg-[#1E3A5F] text-white px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold z-10 shrink-0">
          <span>10:41 AM</span>
          <div className="w-24 h-4 bg-black rounded-full absolute left-1/2 transform -translate-x-1/2 top-2"></div>
          <div className="flex items-center space-x-2">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2 11.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
            </svg>
            <span className="text-[10px] bg-emerald-500 text-white px-1 rounded">5G</span>
            <div className="w-5 h-2.5 border border-white rounded-sm p-0.5 flex items-center">
              <div className="h-full w-4 bg-white rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* CONTENIDO DESLIZABLE PRINCIPAL */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          
          {/* Header con Buscador interactivo */}
          <div className="bg-[#1E3A5F] text-white rounded-b-[2.5rem] px-5 pt-6 pb-8 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-teal-200 text-xs tracking-wider uppercase font-semibold">Hola de nuevo 👋</p>
                <h1 className="text-2xl font-bold tracking-tight">Busca tu Espacio</h1>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                  alt="Perfil de Usuario" 
                  className="w-10 h-10 rounded-full border-2 border-[#14B8A6] object-cover shadow"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1E3A5F] rounded-full"></span>
              </div>
            </div>

            {/* Pulsador de barra de búsqueda */}
            <div 
              onClick={() => setPantallaBusqueda(true)}
              className="relative bg-white/10 backdrop-blur-md rounded-2xl flex items-center px-4 py-3 shadow-inner focus-within:ring-2 focus-within:ring-[#14B8A6] transition duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5 text-teal-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar canchas, piscinas o salones..." 
                value={busqueda}
                readOnly
                className="bg-transparent text-white placeholder-slate-300 text-sm focus:outline-none w-full font-medium cursor-pointer"
              />
            </div>
          </div>

          {/* SECCIÓN DE CATEGORÍAS */}
          <div className="px-5 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#1E3A5F]">Categorías de Espacio</h2>
              {categoriaSeleccionada && (
                <button 
                  onClick={() => setCategoriaSeleccionada(null)}
                  className="text-xs font-semibold text-[#14B8A6] hover:underline"
                >
                  Ver todo
                </button>
              )}
            </div>

            {/* GRID DE CARDS DE CATEGORÍAS */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              
              <button 
                onClick={() => setCategoriaSeleccionada(categoriaSeleccionada === 'canchas' ? null : 'canchas')}
                className={`p-4 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden ${
                  categoriaSeleccionada === 'canchas' 
                    ? 'bg-[#1E3A5F] text-white scale-[1.03] ring-2 ring-[#14B8A6]' 
                    : 'bg-[#FFFFFF] hover:bg-slate-50 text-[#1F2937]'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                  categoriaSeleccionada === 'canchas' ? 'bg-[#14B8A6]/20 text-[#14B8A6]' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold block tracking-tight">Canchas</span>
                <span className={`text-[10px] mt-0.5 ${categoriaSeleccionada === 'canchas' ? 'text-teal-200' : 'text-slate-400'}`}>
                  Deportivas
                </span>
              </button>

              <button 
                onClick={() => setCategoriaSeleccionada(categoriaSeleccionada === 'piscinas' ? null : 'piscinas')}
                className={`p-4 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden ${
                  categoriaSeleccionada === 'piscinas' 
                    ? 'bg-[#1E3A5F] text-white scale-[1.03] ring-2 ring-[#14B8A6]' 
                    : 'bg-[#FFFFFF] hover:bg-slate-50 text-[#1F2937]'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                  categoriaSeleccionada === 'piscinas' ? 'bg-[#14B8A6]/20 text-[#14B8A6]' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold block tracking-tight">Piscinas</span>
                <span className={`text-[10px] mt-0.5 ${categoriaSeleccionada === 'piscinas' ? 'text-teal-200' : 'text-slate-400'}`}>
                  Recreativas
                </span>
              </button>

              <button 
                onClick={() => setCategoriaSeleccionada(categoriaSeleccionada === 'salones' ? null : 'salones')}
                className={`p-4 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden ${
                  categoriaSeleccionada === 'salones' 
                    ? 'bg-[#1E3A5F] text-white scale-[1.03] ring-2 ring-[#14B8A6]' 
                    : 'bg-[#FFFFFF] hover:bg-slate-50 text-[#1F2937]'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                  categoriaSeleccionada === 'salones' ? 'bg-[#14B8A6]/20 text-[#14B8A6]' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <span className="text-xs font-bold block tracking-tight">Salones</span>
                <span className={`text-[10px] mt-0.5 ${categoriaSeleccionada === 'salones' ? 'text-teal-200' : 'text-slate-400'}`}>
                  De Eventos
                </span>
              </button>

            </div>

            {/* CHIPS DE FILTRO RÁPIDO */}
            <div className="flex overflow-x-auto space-x-2 pb-3 mb-2 no-scrollbar">
              <button
                onClick={() => handleToggleFiltroRapido('cercanos')}
                className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center space-x-1.5 shrink-0 transition-all duration-200 ${
                  filtroRapido === 'cercanos'
                    ? 'bg-[#14B8A6] text-white border-[#14B8A6] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📍</span>
                <span>Más cercanos</span>
              </button>

              <button
                onClick={() => handleToggleFiltroRapido('puntuacion')}
                className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center space-x-1.5 shrink-0 transition-all duration-200 ${
                  filtroRapido === 'puntuacion'
                    ? 'bg-[#14B8A6] text-white border-[#14B8A6] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⭐</span>
                <span>Mejor puntuados</span>
              </button>

              <button
                onClick={() => handleToggleFiltroRapido('inmediato')}
                className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center space-x-1.5 shrink-0 transition-all duration-200 ${
                  filtroRapido === 'inmediato'
                    ? 'bg-[#14B8A6] text-white border-[#14B8A6] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⚡</span>
                <span>Disponibilidad inmediata</span>
              </button>
            </div>

            {/* BANNER DE BÚSQUEDA SIEMPRE DISPONIBLE */}
            {busqueda && (
              <div 
                onClick={() => setPantallaSugeridos(true)}
                className="bg-gradient-to-r from-[#1E3A5F]/5 to-[#1E3A5F]/10 border-l-4 border-[#14B8A6] rounded-r-2xl px-4 py-3 mb-5 shadow-sm cursor-pointer hover:from-[#1E3A5F]/10 hover:to-[#1E3A5F]/15 transition-all active:scale-[0.98] group flex justify-between items-center"
              >
                <div className="text-sm font-bold text-[#1E3A5F] group-hover:text-[#14B8A6] transition-colors">
                  Buscar: "{busqueda}"
                </div>
                <div className="text-[#14B8A6] font-bold text-lg group-hover:translate-x-1 transition-transform">
                  ➔
                </div>
              </div>
            )}

            {/* SECCIÓN DINÁMICA DE RECOMENDADOS */}
            <div className="flex justify-between items-baseline mb-4 mt-2">
              <h3 className="text-lg font-bold text-[#1E3A5F]">
                {categoriaSeleccionada 
                  ? `Mostrando ${categoriaSeleccionada.charAt(0).toUpperCase() + categoriaSeleccionada.slice(1)}` 
                  : "Espacios Recomendados"}
              </h3>
              <span className="text-xs text-slate-500 font-medium">{espaciosFiltrados.length} encontrados</span>
            </div>

            {/* LISTADO DE TARJETAS DE ESPACIOS */}
            {espaciosFiltrados.length > 0 ? (
              <div className="space-y-4">
                {espaciosFiltrados.map((espacio) => (
                  <div 
                    key={espacio.id}
                    onClick={() => setEspacioDetalle(espacio)}
                    className="bg-[#FFFFFF] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 flex flex-col cursor-pointer active:scale-[0.99]"
                  >
                    <div className="relative h-44 w-full bg-slate-200 overflow-hidden">
                      <img 
                        src={espacio.imagen} 
                        alt={espacio.nombre} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                      <span className="absolute top-3 left-3 bg-[#1E3A5F]/90 backdrop-blur-md text-[#14B8A6] text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                        {espacio.categoria}
                      </span>

                      {espacio.disponibleHoy && (
                        <span className="absolute bottom-3 left-3 bg-[#14B8A6]/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center space-x-1">
                          <span>⚡</span>
                          <span>Disponible Hoy</span>
                        </span>
                      )}

                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorito(espacio.id); }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-md shadow-sm text-slate-700 hover:text-red-500 hover:bg-white transition-all"
                      >
                        <svg 
                          className={`w-4 h-4 transition-colors ${favoritos.includes(espacio.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} 
                          fill={favoritos.includes(espacio.id) ? "currentColor" : "none"} 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold text-[#14B8A6]">{espacio.subcategoria}</span>
                        <div className="flex items-center space-x-1">
                          <svg className="w-3.5 h-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          <span className="text-xs font-bold text-[#1F2937]">{espacio.rating}</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[#1E3A5F] text-base leading-tight mb-2 line-clamp-1">{espacio.nombre}</h4>
                      
                      <div className="flex justify-between items-center text-slate-500 mb-3 text-xs">
                        <div className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          <span>{espacio.ubicación}</span>
                        </div>
                        <span className="text-[#1E3A5F] font-semibold bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                          📍 a {espacio.distancia} km
                        </span>
                      </div>

                      <div className="border-t border-slate-100 my-2 pt-2.5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Precio estimado</p>
                          <p className="text-sm font-bold text-[#1F2937]">
                            ${espacio.precio} <span className="text-xs font-normal text-slate-500">/ {espacio.unidad}</span>
                          </p>
                        </div>
                        <span className="bg-[#14B8A6]/10 text-[#14B8A6] font-bold text-xs py-1.5 px-3.5 rounded-xl transition duration-200">
                          Reservar
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h4 className="font-bold text-[#1E3A5F]">Sin resultados</h4>
                <p className="text-xs text-slate-500 mt-1">No encontramos alternativas para tu búsqueda.</p>
                <button 
                  onClick={() => { setBusqueda(""); setCategoriaSeleccionada(null); setFiltroRapido(null); }}
                  className="mt-4 px-4 py-2 bg-[#1E3A5F] text-white text-xs font-bold rounded-lg"
                >
                  Restablecer
                </button>
              </div>
            )}
          </div>

        </div>

        {/* TAB BAR INFERIOR DE DISEÑO UNIFORME */}
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 py-3.5 px-2 grid grid-cols-5 gap-1 justify-items-center shadow-lg z-20 rounded-b-[32px]">
          <button 
            onClick={() => { setVerMisReservas(false); setCategoriaSeleccionada(null); setBusqueda(""); setFiltroRapido(null); }} 
            className={`flex flex-col items-center space-y-1 transition-colors ${!verMisReservas && !categoriaSeleccionada && !busqueda ? 'text-[#1E3A5F]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span className="text-[10px] font-semibold">Inicio</span>
          </button>

          <button 
            onClick={() => { setVerMisReservas(false); setCategoriaSeleccionada("canchas"); }}
            className={`flex flex-col items-center space-y-1 transition-colors ${categoriaSeleccionada === 'canchas' && !verMisReservas ? 'text-[#1E3A5F]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span className="text-[10px] font-semibold">Calendario</span>
          </button>

          <button 
            onClick={() => setVerMisReservas(true)}
            className={`flex flex-col items-center space-y-1 relative transition-colors ${verMisReservas ? 'text-[#1E3A5F]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="relative">
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {reservasRealizadas.length > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#14B8A6] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {reservasRealizadas.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Reservas</span>
          </button>

          <button className="flex flex-col items-center space-y-1 text-slate-400 hover:text-slate-600 transition-colors">
            <div className="relative">
              <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              {favoritos.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {favoritos.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Favoritos</span>
          </button>

          <button className="flex flex-col items-center space-y-1 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="text-[10px] font-semibold">Ajustes</span>
          </button>
        </div>

        {/* VENTANA DE BÚSQUEDA A PANTALLA COMPLETA */}
        {pantallaBusqueda && (
          <div className="absolute inset-0 bg-[#F5F7FA] z-20 flex flex-col pb-24 animate-fade-in">
            <div className="bg-[#1E3A5F] text-white p-5 pt-8 flex items-center space-x-3 shadow-md shrink-0">
              <button 
                onClick={() => setPantallaBusqueda(false)} 
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              
              <div className="flex-1 relative bg-white/10 rounded-xl flex items-center px-3 py-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Escribe para buscar..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="bg-transparent text-white placeholder-slate-300 text-sm focus:outline-none w-full font-medium"
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")} className="text-slate-300 hover:text-white">
                    <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
              {!busqueda ? (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1E3A5F]/60 mb-3">Sugerencias populares</h4>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {SUGERENCIAS_BASE.map((tag) => (
                      <button 
                        key={tag}
                        onClick={() => setBusqueda(tag)}
                        className="bg-white hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs"
                      >
                        🏷️ {tag}
                      </button>
                    ))}
                  </div>
                  
                  <div className="bg-[#1E3A5F]/5 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-[#1E3A5F] font-bold mb-1">📍 Búsqueda inteligente</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Escribe palabras clave o descripciones generales (ej: "Urdesa", "Matrimonios", "Cancha arcilla") y nuestro algoritmo encontrará los espacios más compatibles.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {busqueda && (
                    <div 
                      onClick={() => { setPantallaBusqueda(false); setPantallaSugeridos(true); }}
                      className="bg-gradient-to-r from-[#1E3A5F]/5 to-[#1E3A5F]/10 border-l-4 border-[#14B8A6] rounded-r-2xl px-4 py-3 shadow-sm mb-4 cursor-pointer hover:from-[#1E3A5F]/10 hover:to-[#1E3A5F]/15 transition-all group flex justify-between items-center"
                    >
                      <div className="text-sm font-bold text-[#1E3A5F] group-hover:text-[#14B8A6] transition-colors">
                        Buscar: "{busqueda}"
                      </div>
                      <span className="text-[#14B8A6] font-bold text-base group-hover:translate-x-1 transition-transform">➔</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-1">
                    <span>Resultados para "{busqueda}"</span>
                    <span>{espaciosFiltrados.length} encontrados</span>
                  </div>

                  {espaciosFiltrados.length > 0 ? (
                    espaciosFiltrados.map((espacio) => (
                      <div 
                        key={espacio.id}
                        onClick={() => { setEspacioDetalle(espacio); setPantallaBusqueda(false); }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex space-x-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                      >
                        <img 
                          src={espacio.imagen} 
                          alt={espacio.nombre} 
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-extrabold text-[#14B8A6] uppercase tracking-wider">
                                {espacio.subcategoria}
                              </span>
                              <div className="flex items-center space-x-0.5">
                                <span className="text-[10px]">⭐</span>
                                <span className="text-[10px] font-bold text-slate-700">{espacio.rating}</span>
                              </div>
                            </div>
                            <h4 className="font-bold text-[#1E3A5F] text-xs truncate mt-0.5">
                              {espacio.nombre}
                            </h4>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-slate-500">📍 a {espacio.distancia} km</span>
                            <span className="text-xs font-bold text-[#1F2937]">${espacio.precio} <span className="text-[9px] font-normal text-slate-400">/{espacio.unidad}</span></span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-[#FFFFFF] rounded-2xl p-6 shadow-sm border border-slate-100">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <h4 className="font-bold text-[#1E3A5F] text-sm">Cero resultados</h4>
                      <p className="text-[11px] text-slate-400 mt-1 mb-4">No encontramos alternativas para tu búsqueda exacta.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VENTANA DE LUGARES COINCIDENTES (FUZZY MATCH DETAILS) */}
        {pantallaSugeridos && (
          <div className="absolute inset-0 bg-[#F5F7FA] z-25 flex flex-col pb-24 animate-fade-in">
            <div className="bg-[#1E3A5F] text-white p-5 pt-8 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setPantallaSugeridos(false)} 
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div>
                  <h2 className="text-base font-black">Lugares Sugeridos</h2>
                  <p className="text-[10px] text-teal-200 tracking-wide">Búsqueda: "{busqueda}"</p>
                </div>
              </div>
              <span className="bg-[#14B8A6] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                Fuzzy Match
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-2">
                <div className="text-xs font-bold text-[#1E3A5F] mb-1">🔍 Algoritmo de Coincidencias</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Mostrando todos los lugares que comparten palabras o categorías con tu búsqueda: <span className="font-semibold text-[#1E3A5F]">"{busqueda}"</span> ordenados por relevancia:
                </p>
              </div>

              {espaciosSugeridos.length > 0 ? (
                espaciosSugeridos.map((espacio) => (
                  <div 
                    key={espacio.id}
                    onClick={() => { setEspacioDetalle(espacio); }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-[0.99] animate-fade-in"
                  >
                    <div className="relative h-32 w-full bg-slate-200">
                      <img 
                        src={espacio.imagen} 
                        alt={espacio.nombre} 
                        className="w-full h-full object-cover"
                      />
                      
                      <span className="absolute top-3 left-3 bg-[#14B8A6] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1">
                        <span>🎯</span>
                        <span>{espacio.coincidenciaPorcentaje || 50}% de coincidencia</span>
                      </span>

                      <span className="absolute bottom-3 right-3 bg-[#1E3A5F]/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        📍 a {espacio.distancia} km de ti
                      </span>
                    </div>

                    <div className="p-4">
                      <span className="text-[10px] font-extrabold text-[#14B8A6] uppercase tracking-wider block">
                        {espacio.subcategoria}
                      </span>
                      <h4 className="font-extrabold text-[#1E3A5F] text-sm leading-snug mt-0.5 mb-2 line-clamp-1">
                        {espacio.nombre}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {espacio.descripcion}
                      </p>

                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                        <div className="flex items-center space-x-1">
                          <span className="text-amber-500">⭐</span>
                          <span className="text-xs font-bold text-slate-700">{espacio.rating}</span>
                          <span className="text-[10px] text-slate-400">({espacio.reviews})</span>
                        </div>
                        <span className="text-xs font-black text-[#1E3A5F] bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 px-3 py-1.5 rounded-lg transition-all">
                          Ver Detalles ➔
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl p-6">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  <h4 className="font-bold text-[#1E3A5F]">Sin coincidencias</h4>
                  <p className="text-xs text-slate-500 mt-1">No logramos enlazar de ninguna forma tu búsqueda con los espacios del catálogo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN DE HISTORIAL DE RESERVAS ACTIVAS */}
        {verMisReservas && (
          <div className="absolute inset-0 bg-[#F5F7FA] z-25 flex flex-col pb-24">
            
            <div className="bg-[#1E3A5F] text-white p-5 pt-8 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setVerMisReservas(false)} 
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <h2 className="text-xl font-bold">Mis Reservas</h2>
              </div>
              <span className="bg-[#14B8A6] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                {reservasRealizadas.length} Activas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {reservasRealizadas.length > 0 ? (
                reservasRealizadas.map((res) => (
                  <div key={res.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex space-x-4 animate-fade-in">
                    
                    <img 
                      src={res.espacio.imagen} 
                      alt={res.espacio.nombre} 
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold text-[#14B8A6] uppercase tracking-wider block">
                          {res.espacio.subcategoria}
                        </span>
                        <h4 className="font-bold text-[#1E3A5F] text-sm truncate leading-tight mt-0.5">
                          {res.espacio.nombre}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                          <span className="font-semibold text-slate-700">{res.fecha}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          Cantidad: <span className="font-bold">{res.unidades || 1}</span> | Total: <span className="font-bold text-[#1E3A5F]">${(res.total || res.espacio.precio).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                        <span className="text-[10px] font-mono text-slate-400">{res.codigo}</span>
                        
                        <button 
                          onClick={() => cancelarReserva(res.id)}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest active:scale-95 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-16 h-16 bg-[#14B8A6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 00.1946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 01-3.138 3.138z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-[#1E3A5F]">Sin reservas</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">No tienes ninguna reserva agendada en este momento.</p>
                  <button 
                    onClick={() => setVerMisReservas(false)}
                    className="mt-6 px-5 py-2.5 bg-[#1E3A5F] text-white text-xs font-bold rounded-xl"
                  >
                    Explorar Espacios
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VENTANA DE DETALLES PREMIUM (NUEVA VENTANA A PANTALLA COMPLETA) */}
        {espacioDetalle && !pantallaPagos && (
          <div className="absolute inset-0 bg-[#F5F7FA] z-30 flex flex-col pb-6 animate-fade-in overflow-hidden">
            
            <div className="bg-[#1E3A5F] text-white px-5 pt-8 pb-4 flex items-center justify-between shadow-md shrink-0 z-10">
              <button 
                onClick={() => { setEspacioDetalle(null); setCantidadUnidades(1); }} 
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                title="Volver"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <h2 className="text-sm font-bold tracking-tight truncate max-w-[200px]">Detalle del Espacio</h2>
              
              <button 
                onClick={() => toggleFavorito(espacioDetalle.id)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg 
                  className={`w-5 h-5 transition-colors ${favoritos.includes(espacioDetalle.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} 
                  fill={favoritos.includes(espacioDetalle.id) ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
              
              <div className="relative h-60 w-full bg-slate-200">
                <img 
                  src={espacioDetalle.imagen} 
                  alt={espacioDetalle.nombre} 
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-4 left-4 bg-[#1E3A5F]/90 backdrop-blur-md text-[#14B8A6] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  {espacioDetalle.subcategoria}
                </span>
                {espacioDetalle.disponibleHoy && (
                  <span className="absolute bottom-4 right-4 bg-[#14B8A6] text-white text-xs font-black px-2.5 py-1 rounded-md shadow-md flex items-center space-x-1">
                    <span>⚡</span>
                    <span>Disponible Hoy</span>
                  </span>
                )}
              </div>

              <div className="p-5 space-y-6">
                
                <div>
                  <h3 className="text-xl font-black text-[#1E3A5F] leading-tight mb-2">
                    {espacioDetalle.nombre}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <div className="flex items-center text-amber-500">
                      <svg className="w-4 h-4 fill-current mr-0.5" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span className="font-black text-[#1F2937]">{espacioDetalle.rating}</span>
                    </div>
                    <span>•</span>
                    <span className="font-medium underline cursor-pointer">{espacioDetalle.reviews} reseñas verificadas</span>
                    <span>•</span>
                    <span className="font-semibold text-[#1E3A5F]">📍 a {espacioDetalle.distancia} km</span>
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={espacioDetalle.anfitrion?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
                      alt={espacioDetalle.anfitrion?.nombre}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#14B8A6]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anfitrión del espacio</h4>
                      <p className="text-sm font-black text-[#1E3A5F] flex items-center">
                        {espacioDetalle.anfitrion?.nombre || "Usuario Verificado"}
                        {espacioDetalle.anfitrion?.verificado && (
                          <span className="ml-1 text-teal-500 text-xs" title="Perfil Verificado">✔</span>
                        )}
                      </p>
                      <span className="text-[10px] text-slate-400">{espacioDetalle.anfitrion?.registro || "Miembro Activo"}</span>
                    </div>
                  </div>
                  <button className="bg-[#14B8A6]/10 text-[#14B8A6] font-bold text-xs py-1.5 px-3 rounded-lg hover:bg-[#14B8A6]/20 transition-all">
                    Contactar
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider">Sobre el Espacio</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100">
                    {espacioDetalle.descripcion}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider">Servicios Incluidos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {espacioDetalle.servicios.map((servicio, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-[#14B8A6] font-bold text-sm">✓</span>
                        <span className="text-xs font-semibold text-slate-700">{servicio}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider">Ubicación aproximada</h4>
                  <div className="relative h-36 bg-slate-200 rounded-2xl overflow-hidden border border-slate-100">
                    <svg className="w-full h-full bg-emerald-50" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0 20 L100 10 M0 50 L100 70 M30 0 L50 100 M70 0 L80 100" stroke="#CBD5E1" strokeWidth="2" fill="none" />
                      <rect x="15" y="15" width="20" height="20" fill="#E2E8F0" rx="3" />
                      <rect x="55" y="45" width="25" height="15" fill="#E2E8F0" rx="3" />
                      <circle cx="50" cy="50" r="10" fill="#14B8A6" fillOpacity="0.15" />
                      <circle cx="50" cy="50" r="4" fill="#14B8A6" className="animate-ping" />
                      <circle cx="50" cy="50" r="3" fill="#14B8A6" />
                    </svg>
                    <span className="absolute bottom-2.5 right-2.5 bg-[#1E3A5F] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                      📍 {espacioDetalle.ubicación}
                    </span>
                  </div>
                </div>

                {espacioDetalle.normas && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider">Normas del Lugar</h4>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                      {espacioDetalle.normas.map((norma, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-600 leading-snug">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{norma}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white p-4 rounded-2xl border-2 border-[#1E3A5F]/20 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Planifica tu reserva</h4>
                    <span className="text-xs font-bold text-[#1E3A5F]">
                      ${espacioDetalle.precio} <span className="text-[10px] font-normal text-slate-500">/{espacioDetalle.unidad}</span>
                    </span>
                  </div>

                  <form onSubmit={irAPasarelaDePagos} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Fecha del Evento</label>
                      <input 
                        type="date" 
                        required
                        value={fechaReserva}
                        onChange={(e) => setFechaReserva(e.target.value)}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Cantidad de {espacioDetalle.unidad}s</label>
                      <div className="flex items-center justify-between bg-[#F5F7FA] border border-slate-200 rounded-xl p-1">
                        <button 
                          type="button"
                          onClick={() => setCantidadUnidades(prev => Math.max(1, prev - 1))}
                          className="w-8 h-8 rounded-lg bg-white shadow-xs text-sm font-bold text-[#1E3A5F] flex items-center justify-center active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#1E3A5F]">{cantidadUnidades}</span>
                        <button 
                          type="button"
                          onClick={() => setCantidadUnidades(prev => prev + 1)}
                          className="w-8 h-8 rounded-lg bg-white shadow-xs text-sm font-bold text-[#1E3A5F] flex items-center justify-center active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#F5F7FA] rounded-xl p-3 space-y-1.5 text-xs text-slate-600 border border-slate-100">
                      <div className="flex justify-between">
                        <span>Costo por {cantidadUnidades} {espacioDetalle.unidad}s:</span>
                        <span className="font-semibold text-slate-700">${espacioDetalle.precio * cantidadUnidades}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Tarifa de servicio (10%):</span>
                        <span>${(espacioDetalle.precio * cantidadUnidades * 0.10).toFixed(2)}</span>
                      </div>
                      <hr className="border-slate-200 my-1" />
                      <div className="flex justify-between text-sm font-black text-[#1E3A5F]">
                        <span>Total estimado:</span>
                        <span>${totalCalculado}</span>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#1E3A5F] text-[#14B8A6] hover:bg-[#1E3A5F]/95 active:scale-[0.98] py-3 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-md flex items-center justify-center space-x-1"
                    >
                      <span>Continuar al Pago</span>
                      <span>➔</span>
                    </button>
                  </form>
                </div>

                {espacioDetalle.comentarios && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-extrabold text-[#1E3A5F] uppercase tracking-wider">Reseñas de Usuarios ({espacioDetalle.comentarios.length})</h4>
                    <div className="space-y-3">
                      {espacioDetalle.comentarios.map((com, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-[#1E3A5F]">{com.usuario}</span>
                            <span className="text-slate-400">{com.fecha}</span>
                          </div>
                          <div className="flex text-amber-400 text-xs">
                            {"★".repeat(com.rating)}{"☆".repeat(5 - com.rating)}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{com.texto}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* VENTANA DE PASARELA DE PAGOS (CHECKOUT SECURE SCREEN) */}
        {pantallaPagos && espacioDetalle && !pantallaAgregarTarjeta && (
          <div className="absolute inset-0 bg-[#F5F7FA] z-40 flex flex-col pb-6 animate-slide-up overflow-hidden">
            
            {/* Header de la Pasarela */}
            <div className="bg-[#1E3A5F] text-white px-5 pt-8 pb-4 flex items-center justify-between shadow-md shrink-0">
              <button 
                onClick={() => { setPantallaPagos(false); setPagoCompletado(false); }} 
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                disabled={procesandoPago}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <h2 className="text-sm font-bold tracking-tight">Completar Pago</h2>
              <div className="w-8"></div>
            </div>

            {/* Contenido de la Pasarela (Scrollable) */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
              
              {/* RESUMEN DE COMPRA COMPACTO */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider">Resumen de la reserva</h3>
                <div className="flex space-x-3">
                  <img 
                    src={espacioDetalle.imagen} 
                    alt={espacioDetalle.nombre} 
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <h4 className="font-bold text-sm text-[#1E3A5F] truncate">{espacioDetalle.nombre}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{espacioDetalle.subcategoria}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{fechaReserva}</span>
                      <span className="font-bold text-slate-600">{cantidadUnidades} {espacioDetalle.unidad}(s)</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-2 flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-500">Monto total a debitar:</span>
                  <span className="font-black text-[#1E3A5F] text-base">${totalCalculado}</span>
                </div>
              </div>

              {/* MÉTODOS DE PAGO */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Método de pago</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setMetodoPago('tarjeta')}
                    className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                      metodoPago === 'tarjeta'
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>💳</span>
                    <span>Tarjeta Física</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setMetodoPago('wallet')}
                    className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                      metodoPago === 'wallet'
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>📱</span>
                    <span>Digital Wallet</span>
                  </button>
                </div>

                {/* CONTENIDO DEL MÉTODO SELECCIONADO */}
                {metodoPago === 'tarjeta' ? (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Visualización del listado de tarjetas guardadas */}
                    <div className="flex overflow-x-auto space-x-4 pb-3 pt-1 no-scrollbar snap-x snap-mandatory">
                      {tarjetasGuardadas.map((card) => {
                        const isSelected = tarjetaSeleccionada === card.id;
                        return (
                          <div 
                            key={card.id}
                            onClick={() => setTarjetaSeleccionada(card.id)}
                            className={`snap-center shrink-0 w-64 h-36 bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white flex flex-col justify-between shadow-md relative cursor-pointer transform active:scale-98 transition-all border-2 ${
                              isSelected ? 'border-[#14B8A6] ring-2 ring-[#14B8A6]/30' : 'border-transparent'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase tracking-wider text-white/60">Tarjeta Guardada</p>
                                <p className="text-xs font-bold font-mono tracking-widest">{card.numero.replace(/\d{4} \d{4} \d{4}/, "•••• •••• ••••")}</p>
                              </div>
                              <span className="text-xs uppercase font-extrabold tracking-widest text-[#14B8A6]">
                                {card.tipo === "visa" ? "VISA" : "MC"}
                              </span>
                            </div>

                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[8px] uppercase text-white/50">Titular</p>
                                <p className="text-[10px] font-bold tracking-wide truncate max-w-[130px]">{card.nombre}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] uppercase text-white/50">Vence</p>
                                <p className="text-[10px] font-bold font-mono">{card.fecha}</p>
                              </div>
                            </div>

                            {/* Checkmark de Selección */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-[#14B8A6] text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón interactivo para añadir una nueva tarjeta */}
                    <button 
                      type="button"
                      onClick={() => {
                        setPasoCarousel(1);
                        setPantallaAgregarTarjeta(true);
                      }}
                      className="w-full py-3.5 border-2 border-dashed border-[#1E3A5F]/30 hover:border-[#14B8A6] rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold text-[#1E3A5F] active:scale-[0.98] transition-all bg-[#1E3A5F]/5"
                    >
                      <span>➕</span>
                      <span>Agregar nueva tarjeta bancaria</span>
                    </button>

                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4 animate-fade-in flex flex-col items-center justify-center py-8">
                    <p className="text-xs text-slate-500 text-center max-w-[240px] leading-relaxed mb-2">
                      Paga rápido de forma segura utilizando la billetera digital registrada en tu dispositivo móvil.
                    </p>
                    <button 
                      type="button"
                      className="w-full max-w-[260px] bg-black text-white hover:bg-slate-900 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95"
                    >
                      <span className="text-white"> Pay</span>
                      <span className="text-slate-400 text-xs">o</span>
                      <span className="text-white font-black">G Pay</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">Detección biométrica automatizada activa</span>
                  </div>
                )}
              </div>

              {/* DATOS DE FACTURACIÓN */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Datos para facturación</h3>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre Completo o Razón Social</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Mariana de los Ángeles"
                      value={facturaNombre}
                      onChange={(e) => setFacturaNombre(e.target.value)}
                      className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Identificación / RUC</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. 0987654321001"
                        value={facturaId}
                        onChange={(e) => setFacturaId(e.target.value)}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        required
                        placeholder="correo@ejemplo.com"
                        value={facturaEmail}
                        onChange={(e) => setFacturaEmail(e.target.value)}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección Legal</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Calle, Ciudad, Provincia"
                      value={facturaDireccion}
                      onChange={(e) => setFacturaDireccion(e.target.value)}
                      className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 justify-center py-2 text-slate-400 text-[10px]">
                <span>🔒</span>
                <span>Conexión encriptada SSL de 256 bits</span>
              </div>

            </div>

            {/* BOTÓN DE ACCIÓN FIJO EN LA BASE */}
            <div className="bg-white border-t border-slate-100 p-4 shrink-0">
              <form onSubmit={ejecutarPagoFinal}>
                <button 
                  type="submit"
                  disabled={procesandoPago || pagoCompletado}
                  className={`w-full py-4 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-md flex items-center justify-center space-x-2 ${
                    procesandoPago 
                      ? 'bg-slate-400 text-white cursor-not-allowed' 
                      : 'bg-[#1E3A5F] text-[#14B8A6] hover:bg-[#1E3A5F]/95 active:scale-[0.98]'
                  }`}
                >
                  {procesandoPago ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4 text-[#14B8A6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Procesando Pago Seguro...</span>
                    </div>
                  ) : pagoCompletado ? (
                    <span>¡Pago Exitoso!</span>
                  ) : (
                    <span>Pagar ${totalCalculado}</span>
                  )}
                </button>
              </form>
            </div>

            {/* PANTALLA DE COMPROBANTE/ÉXITO OVERLAY */}
            {pagoCompletado && (
              <div className="absolute inset-0 bg-[#1E3A5F] z-50 flex flex-col items-center justify-center p-6 text-white animate-fade-in text-center">
                <div className="w-24 h-24 bg-[#14B8A6]/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <svg className="w-16 h-16 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-2">¡Pago Autorizado!</h3>
                <p className="text-sm text-teal-200 mb-6 max-w-[260px] leading-relaxed">
                  Tu transacción ha sido procesada de manera segura. Hemos enviado el comprobante a tu email.
                </p>
                <div className="bg-white/10 p-4 rounded-2xl w-full max-w-[280px] space-y-1.5 text-xs text-left mb-6 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-teal-200">Código de Reserva:</span>
                    <span>RES-{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-200">Monto Debitado:</span>
                    <span className="text-[#14B8A6]">${totalCalculado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-200">Fecha del Evento:</span>
                    <span>{fechaReserva}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 animate-pulse">Redirigiendo a tus Reservas...</span>
              </div>
            )}

          </div>
        )}

        {}
        {pantallaAgregarTarjeta && (
          <div className="absolute inset-0 bg-[#F5F7FA] z-50 flex flex-col pb-6 animate-slide-up overflow-hidden">
            
            {/* Header Carrusel */}
            <div className="bg-[#1E3A5F] text-white px-5 pt-8 pb-4 flex items-center justify-between shadow-md shrink-0">
              <button 
                onClick={() => setPantallaAgregarTarjeta(false)} 
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <h2 className="text-sm font-bold tracking-tight">Agregar Tarjeta</h2>
              <div className="w-8"></div>
            </div>

            {/* Contenido Carrusel */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col justify-between">
              
              <div className="space-y-6">
                
                {/* Barra de Progreso Lineal */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Paso {pasoCarousel} de 4</span>
                    <span>{pasoCarousel * 25}% completado</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#14B8A6] transition-all duration-300"
                      style={{ width: `${pasoCarousel * 25}%` }}
                    />
                  </div>
                </div>

                {/* VISUALIZADOR DE TARJETA INTERACTIVA CON ROTACIÓN 3D */}
                <div className="w-full flex justify-center py-4 relative" style={{ perspective: '1000px' }}>
                  <div 
                    className="w-72 h-44 transition-transform duration-700 relative shadow-xl rounded-2xl"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: pasoCarousel === 3 ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    
                    {/* CARA FRONTAL DE LA TARJETA */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br ${
                        nuevoNum.startsWith("5") ? "from-cyan-900 to-emerald-950" : "from-slate-800 to-slate-950"
                      } rounded-2xl p-5 text-white flex flex-col justify-between`}
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        {/* Chip Inteligente */}
                        <div className="w-10 h-8 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md relative shadow-inner flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 opacity-20 border border-slate-900 grid grid-cols-3 gap-0.5 p-0.5">
                            <div className="border border-slate-900"></div><div className="border border-slate-900"></div><div className="border border-slate-900"></div>
                            <div className="border border-slate-900"></div><div className="border border-slate-900"></div><div className="border border-slate-900"></div>
                          </div>
                        </div>
                        {/* Logotipo de la Franquicia */}
                        <span className="text-xs uppercase font-extrabold tracking-widest text-[#14B8A6]">
                          {nuevoNum.startsWith("5") ? "Mastercard" : "Visa"}
                        </span>
                      </div>

                      {/* Número de Tarjeta */}
                      <p className="text-lg font-mono font-bold tracking-widest mt-2">
                        {nuevoNum || "•••• •••• •••• ••••"}
                      </p>

                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[7px] uppercase tracking-wider text-white/50">Titular de Tarjeta</p>
                          <p className="text-[11px] font-bold tracking-wide uppercase truncate max-w-[170px]">
                            {nuevoNombre || "TITULAR REQUERIDO"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] uppercase tracking-wider text-white/50">Vence</p>
                          <p className="text-[11px] font-bold font-mono">
                            {nuevaFecha || "MM/YY"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CARA TRASERA DE LA TARJETA (Se muestra en el paso CVV) */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br ${
                        nuevoNum.startsWith("5") ? "from-cyan-900 to-emerald-950" : "from-slate-800 to-slate-950"
                      } rounded-2xl text-white flex flex-col justify-between py-5`}
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      {/* Banda magnética */}
                      <div className="w-full h-9 bg-black/80"></div>

                      {/* Recuadro de Firma y CVV */}
                      <div className="px-5 space-y-2">
                        <div className="flex justify-between items-center bg-white/20 h-8 rounded-sm px-2 relative">
                          {/* Líneas de firma simuladas */}
                          <div className="w-1/2 h-2 border-b border-slate-300 opacity-30"></div>
                          <span className="text-xs font-bold font-mono text-black bg-white px-2 py-0.5 rounded-sm shadow-inner relative z-10">
                            {nuevoCvv || "CVV"}
                          </span>
                        </div>
                        <p className="text-[6px] text-white/40 text-right">No compartir con nadie esta información</p>
                      </div>

                      <div className="px-5 flex justify-between items-center text-[8px] text-white/40">
                        <span>SERVICIOS FINANCIEROS SECURE</span>
                        <span className="font-extrabold uppercase text-[#14B8A6]">
                          {nuevoNum.startsWith("5") ? "MC" : "VISA"}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* FORMULARIO DINÁMICO POR PASOS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  {pasoCarousel === 1 && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Número de la tarjeta</label>
                      <p className="text-[11px] text-slate-500">Registra los 16 dígitos de la parte frontal.</p>
                      <input 
                        type="text"
                        autoFocus
                        maxLength="19"
                        placeholder="4000 1234 5678 9010"
                        value={nuevoNum}
                        onChange={(e) => setNuevoNum(formatNumTarjeta(e.target.value))}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937]"
                      />
                    </div>
                  )}

                  {pasoCarousel === 2 && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de vencimiento</label>
                      <p className="text-[11px] text-slate-500">Introduce el mes y año (MM/YY).</p>
                      <input 
                        type="text"
                        autoFocus
                        maxLength="5"
                        placeholder="12/29"
                        value={nuevaFecha}
                        onChange={(e) => setNuevaFecha(formatFechaTarjeta(e.target.value))}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937] text-center"
                      />
                    </div>
                  )}

                  {pasoCarousel === 3 && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Código de seguridad (CVV)</label>
                      <p className="text-[11px] text-slate-500">Los 3 dígitos de la banda trasera.</p>
                      <input 
                        type="password"
                        autoFocus
                        maxLength="3"
                        placeholder="***"
                        value={nuevoCvv}
                        onChange={(e) => setNuevoCvv(e.target.value.replace(/\D/g, ""))}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937] text-center tracking-widest"
                      />
                    </div>
                  )}

                  {pasoCarousel === 4 && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del titular</label>
                      <p className="text-[11px] text-slate-500">Como aparece impreso en la tarjeta.</p>
                      <input 
                        type="text"
                        autoFocus
                        placeholder="MARIANA DE LOS ANGELES"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        className="w-full bg-[#F5F7FA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#14B8A6] focus:outline-none text-[#1F2937] uppercase"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* BOTONES DE NAVEGACIÓN DEL CARRUSEL */}
              <div className="flex space-x-3 pt-4">
                {pasoCarousel > 1 && (
                  <button 
                    type="button"
                    onClick={() => setPasoCarousel(pasoCarousel - 1)}
                    className="w-1/3 py-3.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Atrás
                  </button>
                )}

                {pasoCarousel < 4 ? (
                  <button 
                    type="button"
                    onClick={() => setPasoCarousel(pasoCarousel + 1)}
                    disabled={
                      (pasoCarousel === 1 && nuevoNum.length < 15) ||
                      (pasoCarousel === 2 && nuevaFecha.length < 5) ||
                      (pasoCarousel === 3 && nuevoCvv.length < 3)
                    }
                    className={`flex-1 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 ${
                      (pasoCarousel === 1 && nuevoNum.length < 15) ||
                      (pasoCarousel === 2 && nuevaFecha.length < 5) ||
                      (pasoCarousel === 3 && nuevoCvv.length < 3)
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-[#1E3A5F] text-[#14B8A6]'
                    }`}
                  >
                    Siguiente
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleGuardarTarjeta}
                    disabled={!nuevoNombre.trim()}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 ${
                      !nuevoNombre.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-[#14B8A6] text-white hover:bg-[#14B8A6]/90'
                    }`}
                  >
                    Guardar Tarjeta
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}