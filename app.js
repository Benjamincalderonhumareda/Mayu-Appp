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
    mapaUrl: "https://maps.app.goo.gl/SgbUPj8WyLoc5aTB7"
  },
  { id: "losangeles",
    nombre: "Puente Los Ángeles",
    km: "18.1",
    coordenadas: { lat: -12.013213147310912,
    lon: -76.89223339596234 },
    alturaMetros: 15.5,
    imagen: "./Img/Puente Los Angeles.png",
    mapaUrl: "https://maps.app.goo.gl/gkXXKvpX5VqrhT4RA"
  },
  { id: "ñaña",
    nombre: "Puente Ñaña",
    km: "24.2",
    coordenadas: { lat: -11.968437599999998, lon: -76.7459362 },
    alturaMetros: 15,
    imagen: "./Img/Puente Ñaña.png",
    mapaUrl: "https://maps.app.goo.gl/SbvdRWx8uRyhVJop9"
  }
];
const STORAGE_KEYS = {
  bridges: "mayu_puentes_data_v2",
  assigned: "mayu_puentes_asignados_v2",
  alerts: "mayu_pref_alertas",
  municipality: "mayu_municipality"
};
const MUNICIPALIDADES = [
  {
    id: "lurigancho-chosica",
    nombre: "Municipalidad de Lurigancho-Chosica",
    telefonoVisible: "(01) 701-7788",
    Whatsapp: "978991923"
  },
  {
    id: "ñaña",
    nombre: "Municipalidad de Ñaña",
    telefonoVisible: "(01) 358-2415",
    Whatsapp: "99895623"
  },
  {
    id: "ate",
    nombre: "Municipalidad de Ate",
    telefonoVisible: "(01) 417-7575",
    Whatsapp: "912347856"
  },
  {
    id: "el-agustino",
    nombre: "Municipalidad de El Agustino",
    telefonoVisible: "(01) 385-1438",
    Whatsapp: "984758361"
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

const IMAGENES_PUENTES = {
  carapongo: "./Img/puente carapongo.png",
  losangeles: "./Img/Puente Los Angeles.png",
  ñaña: "./Img/Puente Ñaña.png"
};

document.addEventListener("DOMContentLoaded", () => {
  puentesConfigurados = leerJSON(STORAGE_KEYS.bridges, puentesIniciales);
  if (!puentesConfigurados.length) puentesConfigurados = puentesIniciales;
  // Mostrar puentes configurados mientras se conecta la API.
  listaPuentes = [...puentesConfigurados];
  puentesConfigurados.forEach(p => { if (IMAGENES_PUENTES[p.id]) p.imagen = IMAGENES_PUENTES[p.id]; });
  const puentePrincipal = puentesConfigurados.find(p => p.id === "ñaña") || puentesConfigurados[0];
  asignados = leerJSON(STORAGE_KEYS.assigned, puentePrincipal ? [puentePrincipal.id] : []);
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => cambiarPagina(btn.dataset.page)));
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
    const puentesRecibidos = await obtenerPuentesAPI({
      puentesIniciales,
      puentesConfigurados,
      listaPuentes,
      imagenesPuentes: IMAGENES_PUENTES
    });

    // Neon es la única fuente de verdad: solo se muestran los puentes que existen en Neon.
    // Si un puente fue borrado en Neon, se elimina inmediatamente de la app.
    listaPuentes = puentesRecibidos;
    puentesConfigurados = puentesRecibidos;
    guardar(STORAGE_KEYS.bridges, puentesRecibidos);

    // Limpiar puentes seguidos que ya no existen en Neon
    const asignadosValidos = asignados.filter(id => listaPuentes.some(p => p.id === id));
    if (asignadosValidos.length !== asignados.length) {
      asignados = asignadosValidos;
      guardar(STORAGE_KEYS.assigned, asignados);
      if (typeof sincronizarPuentesPush === "function") {
        sincronizarPuentesPush();
      }
    }

    if (estadoApi) {
      estadoApi.textContent = "API conectada";
      estadoApi.parentElement.classList.add("online");
      estadoApi.parentElement.classList.remove("offline");
    }
    renderUsuario(true);
    renderizar();
    const paginaDetalle = document.getElementById("page-detalle");
    if (paginaDetalle && paginaDetalle.classList.contains("active") && paginaDetalle.dataset.bridgeId) {
      if (listaPuentes.some(p => p.id === paginaDetalle.dataset.bridgeId)) {
        abrirDetalle(paginaDetalle.dataset.bridgeId, false);
      } else {
        volverAWidgets();
      }
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
function renderResumenEstados(targetId, selected, handler) {
  const counts = conteosEstado();
  const estados = [
    { filtro: "Abierto", clase: "open", label: "Abierto", total: counts.open },
    { filtro: "Alerta", clase: "warning", label: "Alerta", total: counts.warning },
    { filtro: "Cerrado", clase: "closed", label: "Crítico", total: counts.closed }
  ];
  const resumen = document.getElementById(targetId);
  resumen.innerHTML = estados.map(item => `<button class="summary-chip ${item.clase} ${selected === item.filtro ? "selected" : ""}" type="button" data-filter="${item.filtro}" aria-pressed="${selected === item.filtro}">
    <i></i><b>${item.total}</b><span>${item.label}</span>
    </button>`).join("");
  resumen.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    handler(selected === btn.dataset.filter ? "Todos" : btn.dataset.filter);
  }));
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
    renderMapa();
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
      <b>Historial de Estados</b>
      </div>
      </div>${history.length ? `<div class="history-list">${history.map(x => {
        const estado = estadoLabel(x.estadoNuevo || x.estado);
        const descripcion = x.estadoAnterior && x.estadoNuevo
          ? `El estado cambió de ${estadoLabel(x.estadoAnterior)} a ${estado}.`
          : `El registro reporta el puente en estado ${estado.toLocaleLowerCase("es")}.`;
        const hora = (x.fecha || "").slice(11, 16) || x.fecha || "Hora no disponible";
        const nivel = x.nivelCaudalCm != null && Number.isFinite(Number(x.nivelCaudalCm))
          ? `${(Number(x.nivelCaudalCm) / 100).toFixed(2)} m`
          : "—";
        return `<div class="history-item ${estadoClase(estado)}">
          <i></i>
          <div>
            <div class="history-line">
              <b>${escapar(hora)} hrs</b>
              <span class="status-tag"><i></i>${escapar(estado)}</span>
              <strong>Nivel: ${nivel}</strong>
            </div>
            <p class="history-description">${escapar(descripcion)}</p>
          </div>
        </div>`;
      }).join("")}</div>` : `<p class="muted">Aún no hay historial.</p>`}</div>`;
}
function abrirDetalle(id, navegar = true) {
  const puente = listaPuentes.find(p => p.id === id);
  if (!puente) return;
  const r = actual(puente), c = estadoClase(r.estado), nivelM = (Number(r.nivelCaudalCm) / 100).toFixed(2);
  const paginaDetalle = document.getElementById("page-detalle");
  paginaDetalle.dataset.bridgeId = id;
  paginaDetalle.classList.remove("open", "warning", "closed");
  paginaDetalle.classList.add("detail-view", c);
  document.getElementById("detalle-puente").innerHTML = `<button class="back-button" onclick="volverAWidgets()"><span>←</span> Volver a Puentes</button>
    <div class="detail-titlebar"><h1 id="detail-title">Detalles del Puente</h1><span class="status-tag ${c}"><i></i>${escapar(estadoLabel(r.estado))}</span></div>
    <div class="detail-hero ${puente.imagen ? "with-image" : ""}" ${puente.imagen ? `style="--bridge-image:url('${escapar(puente.imagen)}')"` : ""}>
      <div class="detail-hero-shade">
      </div>
      <div>
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
