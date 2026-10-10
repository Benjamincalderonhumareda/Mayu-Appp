function renderUsuario() {
  const cuenta = obtenerCuentaActiva();
  const auth = document.getElementById("user-auth");
  const contenido = document.getElementById("user-profile-content");

  if (!cuenta) {
    perfilUsuario = null;
    contenido.hidden = true;
    document.getElementById("user-summary").hidden = true;
    renderFormularioCuenta(auth);
    return;
  }

  perfilUsuario = {
    nombre: cuenta.nombre,
    correo: cuenta.correo,
    municipalidadId: cuenta.municipalidadId || "chaclacayo"
  };
  auth.innerHTML = "";
  contenido.hidden = false;
  document.getElementById("user-summary").hidden = false;

  document.getElementById("user-name").textContent = perfilUsuario.nombre;

  const municipioGuardado = localStorage.getItem(STORAGE_KEYS.municipality)
    || perfilUsuario.municipalidadId;
  const municipalidad = MUNICIPALIDADES.find(item => item.id === municipioGuardado)
    || MUNICIPALIDADES[0];
  document.getElementById("municipality-name").textContent = municipalidad.nombre;
  document.getElementById("municipality-phone").textContent = municipalidad.telefonoVisible;
  document.getElementById("municipality-source").href = municipalidad.fuente;
  document.getElementById("emergency-call").href = `tel:${municipalidad.telefono}`;

  const municipalityOptions = document.getElementById("municipality-options");
  municipalityOptions.innerHTML = `
    <details class="municipality-picker">
      <summary class="municipality-option selected"><span>${escapar(municipalidad.nombre)}</span>
        <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
      </summary>
      <div class="municipality-choices">${MUNICIPALIDADES.filter(item => item.id !== municipalidad.id).map(item => `
        <label class="municipality-option">
          <input type="radio" name="municipality" value="${item.id}">
          <span>${escapar(item.nombre)}</span>
          <span class="material-symbols-outlined" aria-hidden="true">radio_button_unchecked</span>
        </label>
      `).join("")}</div>
    </details>`;

  municipalityOptions.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.municipality, input.value);
      const cuentas = leerJSON(USER_STORAGE_KEYS.accounts, []);
      const index = cuentas.findIndex(item => item.correo === perfilUsuario.correo);
      if (index >= 0) {
        cuentas[index].municipalidadId = input.value;
        guardar(USER_STORAGE_KEYS.accounts, cuentas);
      }
      renderUsuario();
    });
  });

  const elegidos = listaPuentes.filter(p => asignados.includes(p.id));
  document.getElementById("assigned-count").textContent = `${elegidos.length} seleccionado${elegidos.length === 1 ? "" : "s"}`;
  const etiquetaSeguimiento = p => {
    const clase = estadoClase(actual(p).estado);
    return clase === "open" ? "EN VIVO · ÓPTIMO" : clase === "warning" ? "EN VIVO · ALERTA" : "EN VIVO · CERRADO";
  };
  document.getElementById("assigned-bridges").innerHTML = elegidos.map(p => `<label class="assigned-row selected ${estadoClase(actual(p).estado)}">
    <span class="assigned-name"><b>${escapar(p.nombre)}</b><small>${etiquetaSeguimiento(p)}</small></span>
    <span class="material-symbols-outlined assigned-indicator" aria-hidden="true">task_alt</span>
    <input type="checkbox" checked onchange="toggleAsignado('${escapar(p.id)}',this.checked,this)" aria-label="Dejar de seguir ${escapar(p.nombre)}">
    </label>`).join("") + listaPuentes.filter(p => !asignados.includes(p.id)).map(p => `<label class="assigned-row unselected">
    <span class="assigned-name"><b>${escapar(p.nombre)}</b><small>${escapar(estadoLabel(actual(p).estado))}</small></span>
    <span class="material-symbols-outlined assigned-indicator" aria-hidden="true">radio_button_unchecked</span>
    <input type="checkbox" onchange="toggleAsignado('${escapar(p.id)}',this.checked,this)" aria-label="Seguir ${escapar(p.nombre)}">
    </label>`).join("");
}

function toggleAsignado(id, checked, checkbox) {
  asignados = checked ? [...new Set([...asignados, id])] : asignados.filter(x => x !== id);
  guardar(STORAGE_KEYS.assigned, asignados);

  const fila = checkbox?.closest(".assigned-row");
  const puente = listaPuentes.find(item => item.id === id);
  if (fila && puente) {
    const estado = actual(puente).estado;
    fila.classList.toggle("selected", checked);
    fila.classList.toggle("unselected", !checked);
    fila.classList.remove("open", "warning", "closed");
    if (checked) fila.classList.add(estadoClase(estado));

    fila.querySelector(".assigned-indicator").textContent = checked ? "task_alt" : "radio_button_unchecked";

    const detalle = fila.querySelector(".assigned-name small");
    detalle.textContent = checked
      ? (estadoClase(estado) === "open" ? "EN VIVO · ÓPTIMO" : estadoClase(estado) === "warning" ? "EN VIVO · ALERTA" : "EN VIVO · CERRADO")
      : estadoLabel(estado);
    fila.querySelector("input").setAttribute("aria-label", `${checked ? "Dejar de seguir" : "Seguir"} ${puente.nombre}`);
  }

  const total = asignados.length;
  document.getElementById("assigned-count").textContent = `${total} seleccionado${total === 1 ? "" : "s"}`;
}
