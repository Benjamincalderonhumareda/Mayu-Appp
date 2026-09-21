// Arreglo de puentes iniciales (Datos simulados cargados dinámicamente)
const puentesIniciales = [
  {
    id: "carapongo",
    nombre: "Puente Carapongo",
    km: "KM 14.8 C.C.",
    alturaMetros: 18.50,
    imagen: "./img/puente-carapongo.png",
    historial: [
      { fecha: "2026-09-09 15:30:00", estado: "Abierto", nivelCaudalCm: 750 },
      { fecha: "2026-09-09 13:10:00", estado: "Abierto", nivelCaudalCm: 720 },
      { fecha: "2026-09-09 10:00:00", estado: "Abierto", nivelCaudalCm: 690 }
    ]
  },
  {
    id: "huachipa",
    nombre: "Puente Huachipa",
    km: "KM 9.2 C.C.",
    alturaMetros: 16.00,
    imagen: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=600&q=80",
    historial: [
      { fecha: "2026-09-09 15:25:00", estado: "Precaución", nivelCaudalCm: 1250 },
      { fecha: "2026-09-09 12:00:00", estado: "Abierto", nivelCaudalCm: 1100 }
    ]
  },
  {
    id: "losangeles",
    nombre: "Puente Los Ángeles",
    km: "KM 18.1 C.C.",
    alturaMetros: 15.50,
    imagen: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    historial: [
      { fecha: "2026-09-09 15:00:00", estado: "Cerrado", nivelCaudalCm: 1550 },
      { fecha: "2026-09-09 14:00:00", estado: "Precaución", nivelCaudalCm: 1400 }
    ]
  }
];

// Estado global de la app
let listaPuentes = [];
let desplegadosMap = {}; // Guarda qué tarjetas están abiertas
let filtroActual = "todos";

document.addEventListener("DOMContentLoaded", () => {
  cargarPuentesGuardados();
  renderizarTodosLosPuentes();

  // Escuchar envío del formulario manual
  document.getElementById("form-nuevo-puente").addEventListener("submit", agregarRegistroManual);
});

// Cargar desde localStorage o inicializar por defecto
function cargarPuentesGuardados() {
  const localData = localStorage.getItem("mayu_puentes_data");
  if (localData) {
    listaPuentes = JSON.parse(localData);
  } else {
    listaPuentes = puentesIniciales;
    guardarEnLocalStorage();
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem("mayu_puentes_data", JSON.stringify(listaPuentes));
}

// Renderiza todas las tarjetas según el filtro seleccionado
function renderizarTodosLosPuentes() {
  const container = document.getElementById("puentes-container");
  container.innerHTML = "";

  const filtrados = listaPuentes.filter(p => {
    if (filtroActual === "todos") return true;
    const ultimoEstado = p.historial[0].estado.toLowerCase();
    if (filtroActual === "abierto") return ultimoEstado.includes("abiert");
    if (filtroActual === "cerrado") return ultimoEstado.includes("cerrad") || ultimoEstado.includes("precau");
    return true;
  });

  if (filtrados.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 text-xs py-8">No se encontraron puentes en esta categoría.</p>`;
    return;
  }

  filtrados.forEach(puente => {
    const cardHTML = crearTarjetaPuenteHTML(puente);
    container.innerHTML += cardHTML;
  });
}

// Genera la tarjeta HTML para un puente específico
function crearTarjetaPuenteHTML(puente) {
  const actual = puente.historial[0];
  const nivelMetros = (actual.nivelCaudalCm / 100).toFixed(2);
  const estaCerrado = actual.estado.toLowerCase().includes("cerrad");
  const estaPrecaucion = actual.estado.toLowerCase().includes("precau");

  // Porcentaje del cauce
  const porcentaje = Math.min(Math.round((nivelMetros / puente.alturaMetros) * 100), 100);

  // Estilos según el nivel de riesgo
  let claseCard = "card-abierto";
  let badgeText = "● ALERTA MÍNIMA";
  let badgeColor = "bg-emerald-950/80 text-emerald-400 border-emerald-800";
  let bgTag = "bg-emerald-600 text-white";
  let barColor = "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]";

  if (estaCerrado) {
    claseCard = "card-cerrado";
    badgeText = "● ALERTA MÁXIMA";
    badgeColor = "bg-red-950/80 text-red-400 border-red-800";
    bgTag = "bg-red-600 text-white";
    barColor = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (estaPrecaucion) {
    claseCard = "border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-[#0f1926]";
    badgeText = "● ALERTA RIESGO";
    badgeColor = "bg-amber-950/80 text-amber-400 border-amber-800";
    bgTag = "bg-amber-600 text-white";
    barColor = "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]";
  }

  const estaAbiertoCard = desplegadosMap[puente.id] || false;
  const claseDesplegable = estaAbiertoCard ? "detalle-desplegable abierto" : "detalle-desplegable";
  const claseFlecha = estaAbiertoCard ? "rotate-180" : "";

  return `
    <div class="${claseCard} rounded-2xl p-4 transition-all duration-300">
      
      <!-- Cabecera -->
      <div class="flex justify-between items-start mb-2">
        <div>
          <div class="flex items-center space-x-1.5 mb-1">
            <span class="inline-block px-2 py-0.5 rounded border text-[9px] font-bold ${badgeColor}">
              ${badgeText}
            </span>
            <span class="bg-[#14202e] text-gray-400 px-2 py-0.5 rounded border border-gray-800 text-[9px] font-bold">
              ${puente.km}
            </span>
          </div>
          <h2 class="text-lg font-black text-white tracking-wide">${puente.nombre}</h2>
          <p class="text-[11px] text-gray-400">Monitoreo continuo • Cuenca Rímac</p>
        </div>
        
        <button onclick="togglePuente('${puente.id}')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold ${bgTag} flex items-center space-x-1.5 shadow-lg active:scale-95 transition-transform">
          <span>🚩 ${actual.estado.toUpperCase()}</span>
          <span id="flecha-${puente.id}" class="text-[10px] transition-transform duration-300 ${claseFlecha}">▼</span>
        </button>
      </div>

      <!-- Métricas Cortas -->
      <div class="grid grid-cols-2 gap-2 my-3">
        <div class="bg-[#14202e] p-2.5 rounded-xl border border-gray-800/80">
          <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">ALTURA DE AGUA</span>
          <span class="text-base font-black text-white block mt-0.5">${nivelMetros} <span class="text-xs font-normal text-gray-400">m</span></span>
          <span class="text-[9px] ${estaCerrado ? 'text-red-400' : 'text-emerald-400'} font-semibold mt-0.5 block">
            ${estaCerrado ? '⚠️ Peligro' : '✓ Normal'}
          </span>
        </div>

        <div class="bg-[#14202e] p-2.5 rounded-xl border border-gray-800/80">
          <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">ALTURA DEL PUENTE</span>
          <span class="text-base font-black text-white block mt-0.5">${puente.alturaMetros.toFixed(2)} <span class="text-xs font-normal text-gray-400">m</span></span>
          <span class="text-[9px] text-gray-400 font-semibold mt-0.5 block">Estructura Fija</span>
        </div>
      </div>

      <!-- Barra de Capacidad -->
      <div class="space-y-1">
        <div class="flex justify-between text-[10px] font-bold">
          <span class="text-gray-400">Capacidad cauce (Límite ${puente.alturaMetros.toFixed(2)}m)</span>
          <span class="${estaCerrado ? 'text-red-400' : 'text-emerald-400'}">${porcentaje}%</span>
        </div>
        <div class="w-full bg-gray-900 h-2 rounded-full overflow-hidden p-0.5 border border-gray-800">
          <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
        </div>
      </div>

      <!-- SECCIÓN DESPLEGABLE -->
      <div id="detalle-${puente.id}" class="${claseDesplegable} border-t border-gray-800/80 pt-3 mt-3 space-y-4">
        
        <!-- Cámara / Imagen del Puente -->
        <div class="relative rounded-2xl overflow-hidden border border-gray-700/60 shadow-xl">
          <img src="${puente.imagen}" alt="Vista ${puente.nombre}" class="w-full h-36 object-cover">
          <div class="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CAM EN VIVO</span>
          </div>
        </div>

        <!-- Historial de Estados Recientes -->
        <div class="space-y-2">
          <h4 class="text-[11px] font-black text-gray-200 uppercase tracking-wider">Historial de Registros</h4>
          <div class="space-y-2 border-l-2 border-gray-800 ml-1.5 pl-3">
            ${puente.historial.map(item => {
              const itemM = (item.nivelCaudalCm / 100).toFixed(2);
              const isC = item.estado.toLowerCase().includes("cerrad");
              return `
                <div class="flex justify-between items-center bg-[#111a26] p-2 rounded-xl border border-gray-800/60 text-xs">
                  <div>
                    <span class="text-gray-200 font-bold block">${item.estado}</span>
                    <span class="text-[10px] text-gray-500 font-mono">${item.fecha}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded border font-mono font-bold ${isC ? 'bg-red-950 text-red-400 border-red-800' : 'bg-emerald-950 text-emerald-400 border-emerald-800'}">
                    ${itemM} m
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>

    </div>
  `;
}

// Abrir / Cerrar tarjetas individualmente
function togglePuente(id) {
  desplegadosMap[id] = !desplegadosMap[id];
  renderizarTodosLosPuentes();
}

// Modal control
function abrirModal() {
  document.getElementById("modal-agregar").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("modal-agregar").classList.add("hidden");
}

// Agregar o actualizar un puente con nuevo registro manual
function agregarRegistroManual(e) {
  e.preventDefault();

  const nombre = document.getElementById("input-nombre").value.trim();
  const nivelCm = parseFloat(document.getElementById("input-caudal").value);
  const alturaM = parseFloat(document.getElementById("input-altura").value);
  const estado = document.getElementById("select-estado").value;
  const imagen = document.getElementById("input-imagen").value || "./img/puente-carapongo.png";

  const idGenerado = nombre.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const nuevoRegistro = { fecha: ahora, estado: estado, nivelCaudalCm: nivelCm };

  // Buscar si ya existe el puente
  const index = listaPuentes.findIndex(p => p.id === idGenerado);

  if (index !== -1) {
    // Si el puente existe, agregamos la lectura al inicio de su historial
    listaPuentes[index].historial.unshift(nuevoRegistro);
    listaPuentes[index].alturaMetros = alturaM;
  } else {
    // Si no existe, lo creamos nuevo
    listaPuentes.unshift({
      id: idGenerado,
      nombre: nombre,
      km: "KM Registrado",
      alturaMetros: alturaM,
      imagen: imagen,
      historial: [nuevoRegistro]
    });
  }

  guardarEnLocalStorage();
  cerrarModal();
  renderizarTodosLosPuentes();
  document.getElementById("form-nuevo-puente").reset();
}

// Filtros superiores
function filtrarPuentes(tipo) {
  filtroActual = tipo;
  
  // Cambiar estilos de los botones
  document.querySelectorAll("[id^='btn-filtro-']").forEach(btn => {
    btn.className = "px-3 py-1 bg-[#172436] text-gray-400 rounded-lg font-semibold";
  });
  
  const btnActivo = document.getElementById(`btn-filtro-${tipo}`);
  if (btnActivo) {
    btnActivo.className = "px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded-lg font-bold";
  }

  renderizarTodosLosPuentes();
}