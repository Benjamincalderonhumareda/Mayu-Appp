// Mapa: filtros, búsqueda y tarjetas de ubicación.
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
