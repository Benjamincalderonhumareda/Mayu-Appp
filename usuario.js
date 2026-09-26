// Usuario: perfil, preferencias y puentes asignados.
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
