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
  const distancia = distanciaPuenteKm(p);
  const tieneCoordenadas = p.coordenadas?.lat != null && p.coordenadas?.lon != null;
  const ubicacion = distancia === null
    ? `Chosica · ${ubicacionUsuario || !tieneCoordenadas ? "Distancia desconocida" : "Activa tu ubicación"}`
    : `Chosica · A ${distancia.toFixed(1)} km de ti`;
  const mensajesEstado = {
    open: { texto: "Tránsito fluido y controlado", resumen: "Fluido", icono: "check" },
    warning: { texto: "Puente en estado preventivo", resumen: "Preventivo", icono: "warning" },
    closed: { texto: "Tránsito cerrado por emergencia", resumen: "Emergencia", icono: "block" }
  };
  const mapa = p.imagen ? "" : `<span class="map-pin">⌖</span>`;
  return `<article class="map-card ${c}">
    <div class="map-preview ${p.imagen ? "has-image" : ""}" ${image}>${mapa}<span class="status-tag">
    <i>
    </i>${escapar(estadoLabel(r.estado))}</span>${url ? `<a class="map-open" href="${escapar(url)}" target="_blank" rel="noopener">⌖ Ver en mapa</a>` : `<span class="map-open disabled">Ruta pendiente</span>`}</div>
    <div class="map-card-body">
    <div class="bridge-title-row">
    <h2>${escapar(p.nombre)}</h2>
    </div>
    <p class="map-location"><span class="material-symbols-outlined" aria-hidden="true">location_on</span>${escapar(ubicacion)}</p>
    <p class="map-status ${c}">
      <span class="map-status-icon material-symbols-outlined" aria-hidden="true">${mensajesEstado[c].icono}</span>
      <span class="map-status-text">${escapar(mensajesEstado[c].texto)}</span>
      <span class="map-status-note">${escapar(mensajesEstado[c].resumen)}</span>
    </p>
    </div>
    </article>`;
}
