// Datos de muestra con la estructura que ya usa la app: puente + historial.
// Sustituye esta lista por la respuesta de tu API cuando conectes el endpoint.
// imagen: pega aquí la ruta de la foto/cámara de cada puente.
// mapaUrl: pega aquí el enlace manual a Google Maps (o al mapa que uses).
// Coordenadas tomadas de los enlaces de Google Maps compartidos para cada puente.
const puentesIniciales = [
  { id: "carapongo", nombre: "Puente Carapongo", km: "14.8", coordenadas: { lat: -12.006677541154438, lon: -76.86724132554801 }, alturaMetros: 18.5, imagen: "./Img/puente carapongo.png", mapaUrl: "https://www.google.com/maps?q=-12.006677541154438,-76.86724132554801", mapaEmbedUrl: "https://www.google.com/maps?q=-12.006677541154438,-76.86724132554801&output=embed", historial: [
    { fecha: "2026-09-09 15:30:00", estado: "Abierto", nivelCaudalCm: 143 },
    { fecha: "2026-09-09 13:10:00", estado: "Abierto", nivelCaudalCm: 139 },
    { fecha: "2026-09-09 10:00:00", estado: "Abierto", nivelCaudalCm: 121 }
  ] },
  { id: "losangeles", nombre: "Puente Los Ángeles", km: "18.1", coordenadas: { lat: -12.013213147310912, lon: -76.89223339596234 }, alturaMetros: 15.5, imagen: "./Img/Puente Los Angeles.png", mapaUrl: "https://www.google.com/maps?q=-12.013213147310912,-76.89223339596234", mapaEmbedUrl: "https://www.google.com/maps?q=-12.013213147310912,-76.89223339596234&output=embed", historial: [
    { fecha: "2026-09-09 15:25:00", estado: "Alerta", nivelCaudalCm: 1054 },
    { fecha: "2026-09-09 12:00:00", estado: "Abierto", nivelCaudalCm: 920 }
  ] },
  { id: "chaclacayo", nombre: "Puente Chaclacayo", km: "24.2", coordenadas: { lat: -11.968437599999998, lon: -76.7459362 }, alturaMetros: 15, imagen: "./Img/Puente Chaclacayo.png", mapaUrl: "https://www.google.com/maps?q=-11.968437599999998,-76.7459362", mapaEmbedUrl: "https://www.google.com/maps?q=-11.968437599999998,-76.7459362&output=embed", historial: [
    { fecha: "2026-09-09 18:30:00", estado: "Cerrado", nivelCaudalCm: 1498 },
    { fecha: "2026-09-09 17:15:00", estado: "Alerta", nivelCaudalCm: 1453 },
    { fecha: "2026-09-09 14:00:00", estado: "Abierto", nivelCaudalCm: 1210 },
    { fecha: "2026-09-09 08:30:00", estado: "Abierto", nivelCaudalCm: 1085 }
  ] }
];

const STORAGE_KEYS = { bridges: "mayu_puentes_data_v2", assigned: "mayu_puentes_asignados_v2", alerts: "mayu_pref_alertas" };
// Perfil de muestra basado en la maqueta. Reemplazar con la sesión/API al integrarla.
const perfilUsuario = {
  nombre: "Ing. Benjamín Calderón",
  correo: "b.calderon@indeci-mayu.gob.pe",
  emergencia: "+51 984 210 493",
  municipalidad: "Municipalidad de Chaclacayo",
  telefonoMunicipal: "(01) 358-2235",
  whatsappMunicipal: "+51 984 210 493"
};
let listaPuentes = [];
let filtroWidget = "Todos";
let filtroMapa = "Todos";
let consultaWidget = "";
let consultaMapa = "";
let asignados = [];
let ubicacionUsuario = null;

document.addEventListener("DOMContentLoaded", () => {
  listaPuentes = leerJSON(STORAGE_KEYS.bridges, puentesIniciales);
  const imagenesPuentes = {
    carapongo: "./Img/puente carapongo.png",
    losangeles: "./Img/Puente Los Angeles.png",
    chaclacayo: "./Img/Puente Chaclacayo.png"
  };
  listaPuentes.forEach(p => { if (imagenesPuentes[p.id]) p.imagen = imagenesPuentes[p.id]; });
  const puentePrincipal = listaPuentes.find(p => p.id === "chaclacayo") || listaPuentes[0];
  asignados = leerJSON(STORAGE_KEYS.assigned, puentePrincipal ? [puentePrincipal.id] : []);
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => cambiarPagina(btn.dataset.page)));
  document.getElementById("profile-shortcut").addEventListener("click", () => cambiarPagina("usuario"));
  document.getElementById("new-bridge-button").addEventListener("click", abrirNuevoPuente);
  document.getElementById("close-new-bridge").addEventListener("click", cerrarNuevoPuente);
  document.getElementById("cancel-new-bridge").addEventListener("click", cerrarNuevoPuente);
  document.getElementById("new-bridge-dialog").addEventListener("click", e => { if (e.target.id === "new-bridge-dialog") cerrarNuevoPuente(); });
  document.getElementById("new-bridge-form").addEventListener("submit", guardarNuevoPuente);
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
  const pref = document.getElementById("pref-alerts");
  pref.checked = localStorage.getItem(STORAGE_KEYS.alerts) !== "false";
  pref.addEventListener("change", () => localStorage.setItem(STORAGE_KEYS.alerts, pref.checked));
  renderizar();
});

function leerJSON(clave, fallback) {
  try { const valor = localStorage.getItem(clave); return valor ? JSON.parse(valor) : fallback; }
  catch { return fallback; }
}
function guardar(clave, valor) { localStorage.setItem(clave, JSON.stringify(valor)); }
function actual(p) { return (p.historial || [])[0] || { estado: "Sin datos", nivelCaudalCm: 0, fecha: "" }; }
function estadoClase(estado) {
  const s = (estado || "").toLocaleLowerCase("es");
  if (s.includes("cerr")) return "closed";
  if (s.includes("alert") || s.includes("precau")) return "warning";
  return "open";
}
function estadoLabel(estado) { const c = estadoClase(estado); return c === "closed" ? "Cerrado" : c === "warning" ? "Alerta" : estado === "Sin datos" ? estado : "Abierto"; }
function porcentaje(p) { return p.alturaMetros > 0 ? Math.min(Math.round(actual(p).nivelCaudalCm / (p.alturaMetros * 100) * 100), 100) : 0; }
function escapar(valor) { return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function renderizar() { renderWidgets(); renderMapa(); renderUsuario(); }
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
  document.getElementById(targetId).innerHTML = opciones.map(([label, count]) => `<button class="filter-chip ${selected === label ? "selected" : ""}" data-filter="${label}"><span class="dot ${label === "Todos" ? "all" : estadoClase(label)}"></span>${label}<b>${count}</b></button>`).join("");
  document.getElementById(targetId).querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => handler(btn.dataset.filter)));
}
function renderWidgets() {
  const counts = conteosEstado();
  const estados = [
    { filtro: "Abierto", clase: "open", label: "Abierto", total: counts.open },
    { filtro: "Alerta", clase: "warning", label: "Alerta", total: counts.warning },
    { filtro: "Cerrado", clase: "closed", label: "Crítico", total: counts.closed }
  ];
  const resumen = document.getElementById("status-summary");
  resumen.innerHTML = estados.map(item => `<button class="summary-chip ${item.clase} ${filtroWidget === item.filtro ? "selected" : ""}" type="button" data-filter="${item.filtro}" aria-pressed="${filtroWidget === item.filtro}"><i></i><b>${item.total}</b><span>${item.label}</span></button>`).join("");
  resumen.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { filtroWidget = filtroWidget === btn.dataset.filter ? "Todos" : btn.dataset.filter; renderWidgets(); }));
  const items = listaPuentes.filter(p => coincide(p, consultaWidget) && coincideFiltro(p, filtroWidget));
  document.getElementById("puentes-container").innerHTML = items.length ? items.map(tarjetaWidget).join("") : vacio("No hay puentes que coincidan con la búsqueda.");
}
function coincide(p, q) { return !q || `${p.nombre} ${p.km}`.toLocaleLowerCase("es").includes(q); }
function coincideFiltro(p, filtro) { return filtro === "Todos" || estadoLabel(actual(p).estado) === filtro; }
function vacio(mensaje) { return `<div class="empty-state"><span>⌕</span><p>${mensaje}</p></div>`; }
function tarjetaWidget(p) {
  const r = actual(p), c = estadoClase(r.estado), pct = porcentaje(p);
  const agua = (r.nivelCaudalCm / 100).toFixed(2);
  const distancia = distanciaPuenteKm(p);
  const etiquetaDistancia = distancia === null
    ? `${ubicacionUsuario ? "FALTA COORD. · " : ""}KM ${escapar(p.km)} DEL RÍO`
    : `DISTANCIA: ${distancia.toFixed(1)} KM`;
  return `<article class="bridge-card ${c}" role="button" tabindex="0" aria-label="Ver detalles de ${escapar(p.nombre)}" onclick="abrirDetalle('${escapar(p.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirDetalle('${escapar(p.id)}')}">
    <div class="bridge-status-head"><span class="bridge-location">△ ${escapar(p.nombre).toLocaleUpperCase("es")} · ${etiquetaDistancia}</span><span class="status-tag"><i></i>${escapar(estadoLabel(r.estado))}</span></div>
    <div class="bridge-body">
    <div class="bridge-title-row"><h2>${escapar(p.nombre)}</h2><span class="bridge-id">${escapar(p.id.toUpperCase())}</span></div>
    <div class="metrics"><div class="metric"><span>ALTURA AGUA</span><b>${agua}<small> m</small></b></div><div class="metric"><span>ALTURA PUENTE</span><b>${Number(p.alturaMetros).toFixed(2)}<small> m</small></b></div></div>
    <div class="capacity"><div class="capacity-label"><span>Capacidad</span><b>${pct}%</b></div><div class="capacity-track"><i style="width:${pct}%"></i></div></div>
    <div class="details-prompt"><span>⌁ &nbsp;Ver detalles</span><span>→</span></div>
    </div>
  </article>`;
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
function abrirNuevoPuente() {
  const dialogo = document.getElementById("new-bridge-dialog");
  dialogo.classList.add("open");
  dialogo.setAttribute("aria-hidden", "false");
  dialogo.querySelector("input[name='nombre']").focus();
}
function cerrarNuevoPuente() {
  const dialogo = document.getElementById("new-bridge-dialog");
  dialogo.classList.remove("open");
  dialogo.setAttribute("aria-hidden", "true");
}
function guardarNuevoPuente(event) {
  event.preventDefault();
  const datos = new FormData(event.currentTarget);
  const nombre = String(datos.get("nombre") || "").trim();
  const idBase = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = listaPuentes.some(p => p.id === idBase) ? `${idBase}-${Date.now().toString(36)}` : idBase;
  const ahora = new Date().toISOString().replace("T", " ").slice(0, 19);
  listaPuentes.unshift({
    id, nombre, km: String(datos.get("km") || "—").trim(), coordenadas: { lat: null, lon: null },
    alturaMetros: Number(datos.get("altura")), imagen: "", mapaUrl: "", historial: [
      { fecha: ahora, estado: String(datos.get("estado")), nivelCaudalCm: Number(datos.get("nivel")) }
    ]
  });
  guardar(STORAGE_KEYS.bridges, listaPuentes);
  filtroWidget = "Todos";
  event.currentTarget.reset();
  cerrarNuevoPuente();
  renderizar();
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
  return `<div class="chart-card"><div class="detail-heading"><span class="chart-icon">⌁</span><div><b>Evolución del nivel</b><small>Registros disponibles</small></div></div><svg class="history-chart" viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="Gráfico de nivel de agua"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/><circle cx="${points.split(" ").at(-1)?.split(",")[0] || 8}" cy="${points.split(" ").at(-1)?.split(",")[1] || 40}" r="1.8" fill="currentColor"/></svg><div class="chart-labels"><span>${history.length ? escapar(history.at(-1).fecha?.slice(11,16) || "") : ""}</span><b>${history.length ? `${(Number(actual(p).nivelCaudalCm) / 100).toFixed(2)} m actuales` : "Sin lecturas"}</b><span>${history.length ? escapar(actual(p).fecha?.slice(11,16) || "") : ""}</span></div></div>
    <div class="history-card"><div class="detail-heading"><span class="history-icon">◷</span><div><b>Historial de estados</b><small>${history.length} registros</small></div></div>${history.length ? `<div class="history-list">${history.map(x => `<div class="history-item ${estadoClase(x.estado)}"><i></i><div><div class="history-line"><b>${escapar(x.fecha || "")}</b><span class="status-tag"><i></i>${escapar(estadoLabel(x.estado))}</span><strong>${(Number(x.nivelCaudalCm) / 100).toFixed(2)} m</strong></div></div></div>`).join("")}</div>` : `<p class="muted">Aún no hay historial.</p>`}</div>`;
}
function abrirDetalle(id) {
  const puente = listaPuentes.find(p => p.id === id);
  if (!puente) return;
  const r = actual(puente), c = estadoClase(r.estado), nivelM = (Number(r.nivelCaudalCm) / 100).toFixed(2);
  document.getElementById("detalle-puente").innerHTML = `<button class="back-button" onclick="volverAWidgets()"><span>←</span> Volver a Widgets</button>
    <div class="detail-titlebar"><h1 id="detail-title">Detalles del Puente</h1><span class="status-tag ${c}"><i></i>${escapar(estadoLabel(r.estado))}</span></div>
    <div class="detail-hero ${puente.imagen ? "with-image" : ""}" ${puente.imagen ? `style="--bridge-image:url('${escapar(puente.imagen)}')"` : ""}><div class="detail-hero-shade"></div><div><span class="distance">KM ${escapar(puente.km)}</span><h2>${escapar(puente.nombre)}</h2></div></div>
    <div class="detail-current"><div><span>ALTURA DE AGUA</span><b>${nivelM}<small> m</small></b></div><div><span>ALTURA DEL PUENTE</span><b>${Number(puente.alturaMetros).toFixed(2)}<small> m</small></b></div><div><span>CAPACIDAD ACTUAL</span><b>${porcentaje(puente)}<small>%</small></b></div></div>
    ${contenidoDetalle(puente)}`;
  cambiarPagina("detalle");
}
function volverAWidgets() { cambiarPagina("widgets"); }
function renderMapa() {
  construirFiltros("map-filters", filtroMapa, v => { filtroMapa = v; renderMapa(); });
  const items = listaPuentes.filter(p => coincide(p, consultaMapa) && coincideFiltro(p, filtroMapa));
  document.getElementById("map-container").innerHTML = items.length ? items.map(tarjetaMapa).join("") : vacio("No hay puentes que coincidan con la búsqueda.");
  document.getElementById("map-count").textContent = `${items.length} ${items.length === 1 ? "estación" : "estaciones"}`;
}
function tarjetaMapa(p) {
  const r = actual(p), c = estadoClase(r.estado), image = p.imagen ? `style="--bridge-image:url('${escapar(p.imagen)}')"` : "";
  const url = p.mapaUrl || "";
  const mapa = p.imagen ? "" : `<span class="map-pin">⌖</span>`;
  return `<article class="map-card ${c}"><div class="map-preview ${p.imagen ? "has-image" : ""}" ${image}>${mapa}<span class="status-tag"><i></i>${escapar(estadoLabel(r.estado))}</span>${url ? `<a class="map-open" href="${escapar(url)}" target="_blank" rel="noopener">⌖ Ver en mapa</a>` : `<span class="map-open disabled">Ruta pendiente</span>`}</div><div class="map-card-body"><div class="bridge-title-row"><h2>${escapar(p.nombre)}</h2><span class="distance">KM ${escapar(p.km)}</span></div><p class="map-status ${c}">${c === "open" ? "✓ Tránsito vehicular normal" : c === "warning" ? "! Caudal en alerta" : "⚠ Nivel crítico de caudal"}</p></div></article>`;
}
function renderUsuario() {
  document.getElementById("user-name").textContent = perfilUsuario.nombre;
  document.getElementById("user-email").textContent = perfilUsuario.correo;
  const emergency = document.getElementById("user-emergency"); emergency.textContent = perfilUsuario.emergencia; emergency.href = `tel:${perfilUsuario.emergencia.replace(/[^+\d]/g, "")}`;
  document.getElementById("municipality-name").textContent = perfilUsuario.municipalidad;
  document.getElementById("municipality-phone").textContent = perfilUsuario.telefonoMunicipal;
  const whatsapp = document.getElementById("municipality-whatsapp"); whatsapp.textContent = perfilUsuario.whatsappMunicipal; whatsapp.href = `https://wa.me/${perfilUsuario.whatsappMunicipal.replace(/\D/g, "")}`;
  document.getElementById("emergency-call").href = `tel:${perfilUsuario.telefonoMunicipal.replace(/[^+\d]/g, "")}`;
  const elegidos = listaPuentes.filter(p => asignados.includes(p.id));
  document.getElementById("assigned-count").textContent = `${elegidos.length} seleccionado${elegidos.length === 1 ? "" : "s"}`;
  const etiquetaSeguimiento = p => {
    const clase = estadoClase(actual(p).estado);
    return clase === "open" ? "EN VIVO · ÓPTIMO" : clase === "warning" ? "EN VIVO · ALERTA" : "EN VIVO · CERRADO";
  };
  document.getElementById("assigned-bridges").innerHTML = elegidos.map(p => `<label class="assigned-row selected ${estadoClase(actual(p).estado)}"><span class="assigned-name"><b>${escapar(p.nombre)}</b><small>${etiquetaSeguimiento(p)}</small></span><input type="checkbox" checked onchange="toggleAsignado('${escapar(p.id)}',this.checked)" aria-label="Dejar de seguir ${escapar(p.nombre)}"><span class="selected-check"><span class="material-symbols-outlined">check_circle</span></span></label>`).join("") + listaPuentes.filter(p => !asignados.includes(p.id)).map(p => `<label class="assigned-row unselected"><span class="assigned-name"><b>${escapar(p.nombre)}</b><small>${escapar(estadoLabel(actual(p).estado))}</small></span><input type="checkbox" onchange="toggleAsignado('${escapar(p.id)}',this.checked)" aria-label="Seguir ${escapar(p.nombre)}"><span class="unselected-check material-symbols-outlined">radio_button_unchecked</span></label>`).join("");
}
function toggleAsignado(id, checked) { asignados = checked ? [...new Set([...asignados, id])] : asignados.filter(x => x !== id); guardar(STORAGE_KEYS.assigned, asignados); renderizar(); }
