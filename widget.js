// Widgets: resumen, búsqueda y tarjetas de puentes.
function renderWidgets() {
  renderResumenEstados("status-summary", filtroWidget, v => { filtroWidget = v; renderWidgets(); });
  const items = listaPuentes.filter(p => coincide(p, consultaWidget) && coincideFiltro(p, filtroWidget));
  document.getElementById("puentes-container").innerHTML = items.length ? items.map(tarjetaWidget).join("") : vacio("No hay puentes que coincidan con la búsqueda.");
}
function coincide(p, q) { return !q || `${p.nombre} ${p.km}`.toLocaleLowerCase("es").includes(q); }
function coincideFiltro(p, filtro) { return filtro === "Todos" || estadoLabel(actual(p).estado) === filtro; }
function tarjetaWidget(p) {
  const r = actual(p), c = estadoClase(r.estado), pct = porcentaje(p);
  const agua = (Number(r.nivelCaudalCm) / 100).toFixed(2);
  const alturaPuente = Number(p.alturaMetros) > 0 ? `${Number(p.alturaMetros).toFixed(2)}<small> m</small>` : "Pendiente";
  const capacidad = pct === null ? "S/D" : `${pct}%`;
  const distancia = distanciaPuenteKm(p);
  const etiquetaDistancia = distancia === null
    ? `${ubicacionUsuario ? "FALTA UBICACIÓN GPS · " : ""}${p.km ? `🔺 ESTAS A UNA DISTANCIA DE: ${escapar(p.km)} KM ` : "UBICACIÓN NO REGISTRADA"}`
    : `🔺 ESTAS A UNA DISTANCIA DE: ${distancia.toFixed(1)} km`;
  return `<article class="bridge-card ${c}" role="button" tabindex="0" aria-label="Ver detalles de ${escapar(p.nombre)}" onclick="abrirDetalle('${escapar(p.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirDetalle('${escapar(p.id)}')}">
    <div class="bridge-status-head">
      <span class="bridge-location">${etiquetaDistancia}</span>
      <span class="status-tag">
      <i>
      </i>${escapar(estadoLabel(r.estado))}</span>
      </div>
    <div class="bridge-body">
    <div class="bridge-title-row"><h2>${escapar(p.nombre)}</h2></div>
    <div class="metrics">
      <div class="metric">
      <span>ALTURA AGUA</span>
      <b>${agua}<small> m</small>
      </b>
      </div>
      <div class="metric">
      <span>ALTURA PUENTE</span>
      <b>${alturaPuente}</b>
      </div>
      </div>
    <div class="capacity"><div class="capacity-label"><span>Capacidad</span><b>${capacidad}</b></div><div class="capacity-track"><i style="width:${pct ?? 0}%"></i></div></div>
    <div class="details-prompt"><span>⌁ &nbsp;Ver detalles</span><span>→</span></div>
    </div>
  </article>`;
}
