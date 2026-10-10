// Datos base de puentes; sus lecturas se actualizan desde Mayu API cuando está disponible.
// imagen: pega aquí la ruta de la foto/cámara de cada puente.
// mapaUrl: pega aquí el enlace manual a Google Maps (o al mapa que uses).
// Coordenadas tomadas de los enlaces de Google Maps compartidos para cada puente.

const puentesIniciales = [
  { id: "carapongo",
    nombre: "Puente Carapongo",
    km: "14.8",
    coordenadas: { lat: -12.006677541154438,
    lon: -76.86724132554801 },
    alturaMetros: 18.5,
    imagen: "./Img/puente carapongo.png",
    mapaUrl: "https://www.google.com/maps?q=-12.006677541154438,-76.86724132554801",
    mapaEmbedUrl: "https://www.google.com/maps?q=-12.006677541154438,-76.86724132554801&output=embed",
    historial: [
    { fecha: "2026-09-09 15:30:00", estado: "Abierto", nivelCaudalCm: 143 },
    { fecha: "2026-09-09 13:10:00", estado: "Abierto", nivelCaudalCm: 139 },
    { fecha: "2026-09-09 10:00:00", estado: "Abierto", nivelCaudalCm: 121 }
  ] },
  { id: "losangeles",
    nombre: "Puente Los Ángeles",
    km: "18.1",
    coordenadas: { lat: -12.013213147310912,
    lon: -76.89223339596234 },
    alturaMetros: 15.5,
    imagen: "./Img/Puente Los Angeles.png",
    mapaUrl: "https://www.google.com/maps?q=-12.013213147310912,-76.89223339596234",
    mapaEmbedUrl: "https://www.google.com/maps?q=-12.013213147310912,-76.89223339596234&output=embed",
    historial: [
    { fecha: "2026-09-09 15:25:00", estado: "Alerta", nivelCaudalCm: 1054 },
    { fecha: "2026-09-09 12:00:00", estado: "Abierto", nivelCaudalCm: 920 }
  ] },
  { id: "chaclacayo",
    nombre: "Puente Chaclacayo",
    km: "24.2",
    coordenadas: { lat: -11.968437599999998, lon: -76.7459362 },
    alturaMetros: 15,
    imagen: "./Img/Puente Chaclacayo.png",
    mapaUrl: "https://www.google.com/maps?q=-11.968437599999998,-76.7459362",
    mapaEmbedUrl: "https://www.google.com/maps?q=-11.968437599999998,-76.7459362&output=embed",
    historial: [
    { fecha: "2026-09-09 18:30:00", estado: "Cerrado", nivelCaudalCm: 1498 },
    { fecha: "2026-09-09 17:15:00", estado: "Alerta", nivelCaudalCm: 1453 },
    { fecha: "2026-09-09 14:00:00", estado: "Abierto", nivelCaudalCm: 1210 },
    { fecha: "2026-09-09 08:30:00", estado: "Abierto", nivelCaudalCm: 1085 }
  ] }
];
const STORAGE_KEYS = {
  bridges: "mayu_puentes_data_v2",
  assigned: "mayu_puentes_asignados_v2",
  alerts: "mayu_pref_alertas",
  municipality: "mayu_municipality"
};
const API_URL = "https://prueba-de-ti-2.onrender.com";
const MUNICIPALIDADES = [
  {
    id: "lurigancho-chosica",
    nombre: "Municipalidad de Lurigancho-Chosica",
    telefono: "017017788",
    telefonoVisible: "(01) 701-7788",
    fuente: "https://www.gob.pe/munilurigancho"
  },
  {
    id: "chaclacayo",
    nombre: "Municipalidad de Chaclacayo",
    telefono: "013582415",
    telefonoVisible: "(01) 358-2415",
    fuente: "https://www.gob.pe/institucion/munichaclacayo/contacto-y-numeros-de-emergencias"
  },
  {
    id: "ate",
    nombre: "Municipalidad de Ate",
    telefono: "014177575",
    telefonoVisible: "(01) 417-7575",
    fuente: "https://www.gob.pe/muniate"
  },
  {
    id: "el-agustino",
    nombre: "Municipalidad de El Agustino",
    telefono: "013851438",
    telefonoVisible: "(01) 385-1438",
    fuente: "https://mdea.gob.pe/beta/defensa-civil/"
  }
];
let perfilUsuario = null;
let listaPuentes = [];
let puentesConfigurados = [];
let filtroWidget = "Todos";
let filtroMapa = "Todos";
let consultaWidget = "";
let consultaMapa = "";
let asignados = [];
let ubicacionUsuario = null;

document.addEventListener("DOMContentLoaded", () => {
  puentesConfigurados = leerJSON(STORAGE_KEYS.bridges, puentesIniciales);
  if (!puentesConfigurados.length) puentesConfigurados = puentesIniciales;
  // Mostrar puentes configurados mientras se conecta la API.
  listaPuentes = [...puentesConfigurados];
  const imagenesPuentes = {
    carapongo: "./Img/puente carapongo.png",
    losangeles: "./Img/Puente Los Angeles.png",
    chaclacayo: "./Img/Puente Chaclacayo.png"
  };
  puentesConfigurados.forEach(p => { if (imagenesPuentes[p.id]) p.imagen = imagenesPuentes[p.id]; });
  const puentePrincipal = puentesConfigurados.find(p => p.id === "chaclacayo") || puentesConfigurados[0];
  asignados = leerJSON(STORAGE_KEYS.assigned, puentePrincipal ? [puentePrincipal.id] : []);
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => cambiarPagina(btn.dataset.page)));
  document.getElementById("profile-shortcut").addEventListener("click", () => cambiarPagina("usuario"));
  const botonUbicacion = document.getElementById("location-button");
  if (botonUbicacion) botonUbicacion.addEventListener("click", solicitarUbicacion);
  document.getElementById("search-widgets").addEventListener("input", e => { consultaWidget = e.target.value.trim().toLocaleLowerCase("es"); renderWidgets(); });
  const mapSearchInput = document.getElementById("search-maps");
  const clearMapSearch = document.getElementById("clear-map-search");
  mapSearchInput.addEventListener("input", e => {
    consultaMapa = e.target.value.trim().toLocaleLowerCase("es");
    clearMapSearch.classList.toggle("visible", Boolean(e.target.value));
    renderMapa();
  });
  clearMapSearch.addEventListener("click", () => {
    mapSearchInput.value = "";
    consultaMapa = "";
    clearMapSearch.classList.remove("visible");
    renderMapa();
    mapSearchInput.focus();
  });
  inicializarNotificacionesPush();
  inicializarCuentaUsuario();
  renderUsuario();
  renderizar();
  sincronizarAlertas();
  window.setInterval(sincronizarAlertas, 15000);
});

async function sincronizarAlertas() {
  const estadoApi = document.getElementById("api-status");
  try {
    const [actualResult, historialResult] = await Promise.allSettled([
      fetch(`${API_URL}/alertas`, { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(`${API_URL}/alertas/historial`, { cache: "no-store", headers: { Accept: "application/json" } })
    ]);
    if (actualResult.status === "rejected") throw actualResult.reason;
    if (!actualResult.value.ok) throw new Error(`GET /alertas: HTTP ${actualResult.value.status}`);

    const lecturasActuales = await actualResult.value.json();
    if (!Array.isArray(lecturasActuales)) throw new Error("GET /alertas no devolvió una lista");

    let transiciones = [];
    if (historialResult.status === "fulfilled" && historialResult.value.ok) {
      const payload = await historialResult.value.json();
      transiciones = Array.isArray(payload) ? payload : payload.historial || payload.data || [];
      if (!Array.isArray(transiciones)) transiciones = [];
    } else {
      console.warn("No se pudo cargar el historial de estados; se mostrarán las lecturas actuales.");
    }

    const historialPorPuente = new Map();
    transiciones.forEach(evento => {
      const clave = normalizarNombrePuente(evento.nombre_puente);
      if (!clave) return;
      if (!historialPorPuente.has(clave)) historialPorPuente.set(clave, []);
      const item = convertirTransicionAPI(evento);
      if (item) historialPorPuente.get(clave).push(item);
    });

    const puentesRecibidos = [];
    for (const lectura of lecturasActuales) {
      const nombre = String(lectura.nombre_puente || "").trim();
      const clave = normalizarNombrePuente(nombre);
      if (!nombre || !clave) continue;
      let puente = listaPuentes.find(p => normalizarNombrePuente(p.nombre) === clave)
        || puentesConfigurados.find(p => normalizarNombrePuente(p.nombre) === clave)
        || puentesIniciales.find(p => normalizarNombrePuente(p.nombre) === clave);
      if (!puente) {
        puente = {
          id: clave,
          nombre,
          km: "",
          coordenadas: { lat: null, lon: null },
          alturaMetros: null,
          imagen: "",
          mapaUrl: "",
          historial: []
        };
      }

      const alturaPuente = numeroAPI(lectura.altura_puente ?? lectura.altura_del_puente);
      if (Number.isFinite(alturaPuente) && alturaPuente > 0) puente.alturaMetros = alturaPuente;
      puente.lecturaActual = convertirLecturaAPI(lectura);
      puente.historial = (historialPorPuente.get(clave) || [])
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      puentesRecibidos.push(puente);
    }

    // Neon es la fuente de verdad de qué puentes aparecen en la app.
    const puentesCombinados = new Map(puentesConfigurados.map(puente => [puente.id, puente]));
    puentesRecibidos.forEach(puente => puentesCombinados.set(puente.id, puente));
    listaPuentes = [...puentesCombinados.values()];

    if (estadoApi) {
      estadoApi.textContent = "API conectada";
      estadoApi.parentElement.classList.add("online");
      estadoApi.parentElement.classList.remove("offline");
    }
    renderUsuario(true);
    renderizar();
    const paginaDetalle = document.getElementById("page-detalle");
    if (paginaDetalle.classList.contains("active") && paginaDetalle.dataset.bridgeId) {
      abrirDetalle(paginaDetalle.dataset.bridgeId, false);
    }
    const puenteNotificado = new URLSearchParams(window.location.search).get("puente");
    if (puenteNotificado) {
      abrirDetalle(puenteNotificado);
      history.replaceState(null, "", window.location.pathname);
    }
  } catch (error) {
    if (estadoApi) {
      estadoApi.textContent = "API desconectada";
      estadoApi.parentElement.classList.add("offline");
      estadoApi.parentElement.classList.remove("online");
    }
    console.warn("No se pudieron cargar las alertas de Mayu API:", error.message);
  }
}
function normalizarNombrePuente(nombre) {
  return String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]/g, "");
}

function numeroAPI(valor) {
  if (valor === null || valor === undefined || valor === "") return NaN;
  return Number(String(valor).replace(",", "."));
}

function convertirLecturaAPI(registro) {
  const nivelMetros = numeroAPI(registro.altura_agua ?? registro.nivel_caudal ?? registro.caudal_historico);
  const estadoApi = String(registro.estado_puente || "normal").toLocaleLowerCase("es");
  const estado = estadoApi.includes("cerr") || estadoApi.includes("critic")
    ? "Cerrado"
    : estadoApi.includes("alert") || estadoApi.includes("precauc")
      ? "Alerta"
      : "Abierto";
  const fecha = registro.fecha || registro.fecha_registro || registro.created_at || registro.timestamp || new Date().toISOString();
  return { fecha: String(fecha).replace("T", " ").slice(0, 19), estado, nivelCaudalCm: Number.isFinite(nivelMetros) ? nivelMetros * 100 : null };
}

function convertirTransicionAPI(evento) {
  const datos = evento.datos_anteriores || {};
  const nivelMetros = numeroAPI(datos.altura_agua ?? datos.nivel_caudal ?? datos.caudal_historico);
  const fecha = evento.fecha_cambio || evento.fecha || "";
  return {
    fecha: String(fecha).replace("T", " ").slice(0, 19),
    estado: evento.estado_nuevo || evento.estado_anterior || "Sin datos",
    estadoAnterior: evento.estado_anterior || "",
    estadoNuevo: evento.estado_nuevo || "",
    nivelCaudalCm: Number.isFinite(nivelMetros) ? nivelMetros * 100 : null
  };
}
function leerJSON(clave, fallback) {
  try { const valor = localStorage.getItem(clave); return valor ? JSON.parse(valor) : fallback; }
  catch { return fallback; }
}
function guardar(clave, valor) { localStorage.setItem(clave, JSON.stringify(valor)); }
function actual(p) { return p.lecturaActual || (p.historial || [])[0] || { estado: "Sin datos", nivelCaudalCm: 0, fecha: "" }; }
function estadoClase(estado) {
  const s = (estado || "").toLocaleLowerCase("es");
  if (s.includes("cerr")) return "closed";
  if (s.includes("alert") || s.includes("precau")) return "warning";
  return "open";
}
function estadoLabel(estado) { const c = estadoClase(estado); return c === "closed" ? "Cerrado" : c === "warning" ? "Alerta" : estado === "Sin datos" ? estado : "Abierto"; }
function porcentaje(p) { return Number(p.alturaMetros) > 0 ? Math.min(Math.round(actual(p).nivelCaudalCm / (p.alturaMetros * 100) * 100), 100) : null; }
function escapar(valor) { return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function renderizar() { renderWidgets(); renderMapa(); }
function vacio(mensaje) { return `<div class="empty-state"><span>⌕</span><p>${mensaje}</p></div>`; }
function cambiarPagina(id) {
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === `page-${id}`));
  const navPage = id === "detalle" ? "widgets" : id;
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === navPage));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function conteosEstado() {
  return listaPuentes.reduce((acc, p) => { acc[estadoClase(actual(p).estado)]++; return acc; }, { open: 0, warning: 0, closed: 0 });
}
function construirFiltros(targetId, selected, handler) {
  const counts = conteosEstado();
  const opciones = [["Todos", listaPuentes.length], ["Cerrado", counts.closed], ["Alerta", counts.warning], ["Abierto", counts.open]];
  document.getElementById(targetId).innerHTML = opciones.map(([label, count]) => `<button class="filter-chip ${selected === label ? "selected" : ""}" data-filter="${label}">
    <span class="dot ${label === "Todos" ? "all" : estadoClase(label)}">
    </span>${label}<b>${count}</b>
    </button>`).join("");
  document.getElementById(targetId).querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => handler(btn.dataset.filter)));
}
function solicitarUbicacion() {
  const boton = document.getElementById("location-button");
  if (!navigator.geolocation) { mostrarEstadoUbicacion("Este navegador no permite acceder a la ubicación"); return; }
  boton.disabled = true;
  mostrarEstadoUbicacion("Buscando tu ubicación…");
  navigator.geolocation.getCurrentPosition(pos => {
    ubicacionUsuario = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    boton.disabled = false;
    const faltanCoordenadas = listaPuentes.some(p => distanciaPuenteKm(p) === null);
    mostrarEstadoUbicacion(faltanCoordenadas ? "Ubicación activa · faltan coordenadas de algunos puentes" : "Ubicación activa · distancias calculadas desde ti");
    renderWidgets();
  }, error => {
    boton.disabled = false;
    mostrarEstadoUbicacion(error.code === 1 ? "Permiso denegado · permite ubicación en el navegador" : "No se pudo obtener la ubicación · intenta de nuevo");
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}
function mostrarEstadoUbicacion(mensaje) {
  const label = document.getElementById("location-label");
  label.textContent = mensaje;
  label.classList.add("visible");
}
function distanciaPuenteKm(p) {
  const lat = Number(p.coordenadas?.lat), lon = Number(p.coordenadas?.lon);
  if (!ubicacionUsuario || !Number.isFinite(lat) || !Number.isFinite(lon) || p.coordenadas?.lat == null || p.coordenadas?.lon == null) return null;
  const rad = n => n * Math.PI / 180;
  const dLat = rad(lat - ubicacionUsuario.lat), dLon = rad(lon - ubicacionUsuario.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(ubicacionUsuario.lat)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function contenidoDetalle(p) {
  const history = (p.historial || []).slice(0, 8), max = Math.max(Number(p.alturaMetros) * 100, ...history.map(x => Number(x.nivelCaudalCm) || 0), 1);
  const points = history.slice().reverse().map((x, i, arr) => `${arr.length < 2 ? 8 : 8 + i * (84 / (arr.length - 1))},${44 - (Number(x.nivelCaudalCm) || 0) / max * 35}`).join(" ");
  return `<div class="chart-card">
    <div class="detail-heading">
    <span class="chart-icon">⌁</span>
    <div>
    <b>Evolución del nivel</b>
    <small>Registros disponibles</small>
    </div>
    </div>
    <svg class="history-chart" viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="Gráfico de nivel de agua">
    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    <circle cx="${points.split(" ").at(-1)?.split(",")[0] || 8}" cy="${points.split(" ").at(-1)?.split(",")[1] || 40}" r="1.8" fill="currentColor"/>
    </svg>
    <div class="chart-labels">
    <span>${history.length ? escapar(history.at(-1).fecha?.slice(11,16) || "") : ""}</span>
    <b>${actual(p).nivelCaudalCm != null ? `${(Number(actual(p).nivelCaudalCm) / 100).toFixed(2)} m actuales` : "Sin lectura actual"}</b>
    <span>${history.length ? escapar(actual(p).fecha?.slice(11,16) || "") : ""}</span>
    </div>
    </div>
    <div class="history-card">
      <div class="detail-heading">
      <span class="history-icon">◷</span>
      <div>
      <b>Historial de estados</b>
      <small>${history.length} cambios de estado</small>
      </div>
      </div>${history.length ? `<div class="history-list">${history.map(x => `<div class="history-item ${estadoClase(x.estado)}">
      <i>
      </i>
      <div>
      <div class="history-line">
      <b>${escapar(x.fecha || "")}</b>
      <span class="status-tag">
      <i>
      </i>${x.estadoAnterior && x.estadoNuevo ? `${escapar(estadoLabel(x.estadoAnterior))} → ${escapar(estadoLabel(x.estadoNuevo))}` : escapar(estadoLabel(x.estado))}</span>
      <strong>${Number.isFinite(Number(x.nivelCaudalCm)) ? `${(Number(x.nivelCaudalCm) / 100).toFixed(2)} m` : "—"}</strong>
      </div>
      </div>
      </div>`).join("")}</div>` : `<p class="muted">Aún no hay historial.</p>`}</div>`;
}
function abrirDetalle(id, navegar = true) {
  const puente = listaPuentes.find(p => p.id === id);
  if (!puente) return;
  const r = actual(puente), c = estadoClase(r.estado), nivelM = (Number(r.nivelCaudalCm) / 100).toFixed(2);
  const paginaDetalle = document.getElementById("page-detalle");
  paginaDetalle.dataset.bridgeId = id;
  paginaDetalle.classList.remove("open", "warning", "closed");
  paginaDetalle.classList.add("detail-view", c);
  document.getElementById("detalle-puente").innerHTML = `<button class="back-button" onclick="volverAWidgets()"><span>←</span> Volver a Widgets</button>
    <div class="detail-titlebar"><h1 id="detail-title">Detalles del Puente</h1><span class="status-tag ${c}"><i></i>${escapar(estadoLabel(r.estado))}</span></div>
    <div class="detail-hero ${puente.imagen ? "with-image" : ""}" ${puente.imagen ? `style="--bridge-image:url('${escapar(puente.imagen)}')"` : ""}>
      <div class="detail-hero-shade">
      </div>
      <div>
      <span class="distance">KM ${escapar(puente.km)}</span>
      <h2>${escapar(puente.nombre)}</h2>
      </div>
      </div>
    <div class="detail-current">
      <div>
      <span>ALTURA DE AGUA</span>
      <b>${nivelM}<small> m</small>
      </b>
      </div>
      <div>
      <span>ALTURA DEL PUENTE</span>
      <b>${Number(puente.alturaMetros) > 0 ? Number(puente.alturaMetros).toFixed(2) : "Pendiente"}${Number(puente.alturaMetros) > 0 ? "<small> m</small>" : ""}</b>
      </div>
      <div>
      <span>CAPACIDAD ACTUAL</span>
      <b>${porcentaje(puente) ?? "S/D"}${porcentaje(puente) === null ? "" : "<small>%</small>"}</b>
      </div>
      </div>
    ${contenidoDetalle(puente)}`;
  if (navegar) cambiarPagina("detalle");
}
function volverAWidgets() { cambiarPagina("widgets"); }
