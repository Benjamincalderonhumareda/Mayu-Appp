// ============================================================================
// CONFIGURACIÓN DE LA API (Render + Neon)
// La base de datos es la ÚNICA fuente de verdad: la app solo la refleja.
// ============================================================================
const API_URL = "https://prueba-de-ti-2.onrender.com";
const INTERVALO_MS = 10000; // refresca cada 10 segundos
const MAX_HISTORIAL_POR_PUENTE = 15;

// Datos que NO vienen del sensor (km, imagen, altura por defecto), por puente.
// Un puente solo aparece en la app si tiene lecturas en la base de datos.
const METAS_INICIALES = {
  carapongo:  { km: "KM 14.8 C.C.", alturaMetros: 18.50, imagen: "./img/puente-carapongo.png" },
  huachipa:   { km: "KM 9.2 C.C.",  alturaMetros: 16.00, imagen: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=600&q=80" },
  losangeles: { km: "KM 18.1 C.C.", alturaMetros: 15.50, imagen: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80" }
};
const META_POR_DEFECTO = { km: "KM Registrado", alturaMetros: 15.00, imagen: "./img/puente-carapongo.png" };

// Estado global de la app
let listaPuentes = [];
let desplegadosMap = {}; // Guarda qué tarjetas están abiertas
let filtroActual = "todos";
let sincronizando = false;   // evita peticiones encimadas (Render puede tardar al despertar)
let primeraCargaOk = false;

document.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("mayu_puentes_data"); // caché antigua con datos simulados

  mostrarMensajeContenedor("Conectando con el servidor…");

  // Escuchar envío del formulario manual
  document.getElementById("form-nuevo-puente").addEventListener("submit", agregarRegistroManual);

  // Conectar con la API y refrescar periódicamente
  actualizarDesdeAPI();
  setInterval(actualizarDesdeAPI, INTERVALO_MS);
});

function mostrarMensajeContenedor(texto) {
  document.getElementById("puentes-container").innerHTML =
    `<p class="text-center text-gray-500 text-xs py-8">${texto}</p>`;
}

// ============================================================================
// INTEGRACIÓN CON LA API
// ============================================================================

// "Puente Los Ángeles" -> "losangeles" | "Puente Carapongo" -> "carapongo"
function idDesdeNombre(nombre) {
  return nombre
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase()
    .replace(/^puente\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

// Convierte lo que llegue (ESP32, Neon o curl) a los 3 estados que entiende la app.
// Si no reconoce el texto, muestra "Precaución" (más seguro que decir "Abierto").
function normalizarEstado(texto = "") {
  const t = String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("cerrad") || t.includes("peligro") || t.includes("critic")) return "Cerrado";
  if (t.includes("abiert") || t.includes("normal") || t.includes("seguro")) return "Abierto";
  return "Precaución";
}

// Devuelve "YYYY-MM-DD HH:mm:ss" en hora de Lima.
// Si el servidor manda la fecha sin zona horaria, se asume UTC (lo normal en Render/Neon).
function formatearFecha(valor) {
  if (!valor) return "—";
  let iso = String(valor);
  if (/^\d{4}-\d{2}-\d{2} \d/.test(iso)) iso = iso.replace(" ", "T");
  iso = iso.replace(/(\.\d{3})\d+/, "$1"); // recorta microsegundos
  const tieneZona = /(Z|GMT|UTC|[+-]\d{2}:?\d{2})$/.test(iso);
  const fecha = new Date(tieneZona ? iso : iso + "Z");
  if (isNaN(fecha)) return String(valor);
  return fecha.toLocaleString("sv-SE", { timeZone: "America/Lima" });
}

// Trae el historial de Neon y RECONSTRUYE la lista de puentes desde cero.
// Si algo se borra en la base de datos, desaparece de la app en el siguiente refresco.
async function sincronizarConAPI() {
  const res = await fetch(`${API_URL}/alertas/historial?limit=200`);
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  const lecturas = await res.json(); // vienen de la más nueva a la más antigua

  const grupos = {};
  lecturas.forEach(l => {
    const nombre = l.nombre_puente || "Puente Carapongo";
    const id = idDesdeNombre(nombre);
    if (!grupos[id]) grupos[id] = { nombre, historial: [], altura: null };
    // Si la lectura trae la altura del puente (columna opcional), se usa la más reciente
    if (grupos[id].altura === null && l.altura_puente_m) grupos[id].altura = Number(l.altura_puente_m);
    grupos[id].historial.push({
      fecha: formatearFecha(l.fecha_registro),
      estado: normalizarEstado(l.estado_puente),
      nivelCaudalCm: Number(l.nivel_caudal)
    });
  });

  const metaLocal = cargarMeta();
  const nuevaLista = Object.entries(grupos).map(([id, g]) => {
    const meta = { ...META_POR_DEFECTO, ...(METAS_INICIALES[id] || {}), ...(metaLocal[id] || {}) };
    return {
      id,
      nombre: g.nombre,
      km: meta.km,
      alturaMetros: g.altura ?? meta.alturaMetros,
      imagen: meta.imagen,
      historial: g.historial.slice(0, MAX_HISTORIAL_POR_PUENTE)
    };
  });
  nuevaLista.sort((a, b) => a.nombre.localeCompare(b.nombre));

  listaPuentes = nuevaLista; // reemplazo total: la app queda igual que Neon
  guardarEnLocalStorage();
}

async function actualizarDesdeAPI() {
  if (sincronizando) return;
  sincronizando = true;
  try {
    await sincronizarConAPI();
    primeraCargaOk = true;
    mostrarConexion(true);
    renderizarTodosLosPuentes();
  } catch (err) {
    console.error("No se pudo conectar con la API:", err);
    mostrarConexion(false);
    // Si nunca se logró conectar, avisar; si ya había datos, se dejan los últimos conocidos
    if (!primeraCargaOk) mostrarMensajeContenedor("No se pudo conectar con el servidor. Reintentando…");
  } finally {
    sincronizando = false;
  }
}

function mostrarConexion(ok) {
  const el = document.getElementById("estado-conexion");
  if (!el) return;
  if (ok) {
    el.textContent = "🟢 En línea · " + new Date().toLocaleTimeString("es-PE");
    el.className = "text-[10px] text-emerald-400 mt-0.5";
  } else {
    el.textContent = "🔴 Sin conexión con el servidor (reintentando…)";
    el.className = "text-[10px] text-red-400 mt-0.5";
  }
}

// ============================================================================
// DATOS LOCALES: solo lo que la base de datos no guarda (km, imagen, altura)
// ============================================================================
function cargarMeta() {
  try {
    return JSON.parse(localStorage.getItem("mayu_meta") || "{}");
  } catch {
    return {};
  }
}

function guardarEnLocalStorage() {
  const meta = {};
  listaPuentes.forEach(p => {
    meta[p.id] = { km: p.km, alturaMetros: p.alturaMetros, imagen: p.imagen };
  });
  localStorage.setItem("mayu_meta", JSON.stringify(meta));
}

// ============================================================================
// RENDER
// ============================================================================

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

  if (listaPuentes.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 text-xs py-8">No hay puentes registrados todavía en la base de datos.</p>`;
    return;
  }

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

// ============================================================================
// REGISTRO MANUAL → ahora se guarda en Neon a través de la API
// ============================================================================
async function agregarRegistroManual(e) {
  e.preventDefault();

  const nombre = document.getElementById("input-nombre").value.trim();
  const nivelCm = parseFloat(document.getElementById("input-caudal").value);
  const alturaM = parseFloat(document.getElementById("input-altura").value);
  const estado = document.getElementById("select-estado").value;
  const imagen = document.getElementById("input-imagen").value || "./img/puente-carapongo.png";

  const boton = e.submitter;
  if (boton) { boton.disabled = true; boton.textContent = "Guardando..."; }

  try {
    const res = await fetch(`${API_URL}/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_puente: nombre,
        nivel_caudal: nivelCm,   // en centímetros
        estado_puente: estado
      })
    });
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

    // Traer lo último desde Neon y luego aplicar los datos que solo viven en la app
    await sincronizarConAPI();
    const puente = listaPuentes.find(p => p.id === idDesdeNombre(nombre));
    if (puente) {
      puente.alturaMetros = alturaM;
      puente.imagen = imagen;
      guardarEnLocalStorage();
    }

    cerrarModal();
    renderizarTodosLosPuentes();
    document.getElementById("form-nuevo-puente").reset();
  } catch (err) {
    console.error(err);
    alert("No se pudo guardar en el servidor. Si hace rato no lo usas, Render puede estar despertando: espera unos segundos y vuelve a intentar.");
  } finally {
    if (boton) { boton.disabled = false; boton.textContent = "Guardar Registro"; }
  }
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
