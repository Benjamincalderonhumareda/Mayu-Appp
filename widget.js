// Widgets: resumen, búsqueda y tarjetas de puentes.
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
