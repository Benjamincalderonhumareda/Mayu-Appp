// Registro, inicio de sesión y persistencia de cuentas locales.
const USER_STORAGE_KEYS = {
  accounts: "mayu_demo_accounts_v1",
  session: "mayu_demo_session_v1"
};
let modoCuenta = "login";

function inicializarCuentaUsuario() {
  document.getElementById("signout-button").addEventListener("click", () => {
    localStorage.removeItem(USER_STORAGE_KEYS.session);
    perfilUsuario = null;
    modoCuenta = "login";
    renderUsuario();
  });
}

function obtenerCuentaActiva() {
  const correo = localStorage.getItem(USER_STORAGE_KEYS.session);
  return leerJSON(USER_STORAGE_KEYS.accounts, []).find(cuenta => cuenta.correo === correo) || null;
}

function renderFormularioCuenta(auth, mensaje = "") {
  const registrando = modoCuenta === "registro ";
  auth.innerHTML = `
    <section class="account-card">
      <h2>${registrando ? "Crear cuenta" : "Iniciar sesión"}</h2>
      <form id="account-form" class="account-form">
        ${registrando ? `
          <label>Nombre completo<input name="nombre" autocomplete="name" required maxlength="80"></label>
          <label>Correo electrónico<input name="correo" type="email" autocomplete="email" required maxlength="120"></label>
          <label>Teléfono de contacto<input name="telefono" type="tel" autocomplete="tel" required maxlength="24"></label>
          <label>Municipalidad cercana<select name="municipalidad" required>
            ${MUNICIPALIDADES.map(item => `<option value="${item.id}">${escapar(item.nombre)}</option>`).join("")}
          </select></label>
          <label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="6" required></label>
        ` : `
          <label>Correo electrónico<input name="correo" type="email" autocomplete="email" required></label>
          <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
        `}
        <p class="account-message" role="status">${escapar(mensaje)}</p>
        <button class="account-submit" type="submit">${registrando ? "Crear cuenta" : "Ingresar"}</button>
      </form>
      <button class="account-switch" id="account-switch" type="button">
        ${registrando ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Crear una"}
      </button>
    </section>`;

  auth.querySelector("#account-switch").addEventListener("click", () => {
    modoCuenta = registrando ? "login" : "registro";
    renderFormularioCuenta(auth);
  });
  auth.querySelector("#account-form").addEventListener("submit", procesarFormularioCuenta);
}

async function procesarFormularioCuenta(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("[type='submit']");
  const mensaje = form.querySelector(".account-message");
  const datos = new FormData(form);
  const correo = String(datos.get("correo") || "").trim().toLocaleLowerCase("es");
  const password = String(datos.get("password") || "");
  const modoEnvio = modoCuenta;
  const cuentas = leerJSON(USER_STORAGE_KEYS.accounts, []);
  submit.disabled = true;
  mensaje.textContent = modoEnvio === "registro" ? "Creando cuenta…" : "Verificando datos…";

  try {
    if (modoEnvio === "registro") {
      if (cuentas.some(cuenta => cuenta.correo === correo)) {
        mensaje.textContent = "Ese correo ya tiene una cuenta. Inicia sesión.";
        return;
      }
      const cuentaNueva = {
        nombre: String(datos.get("nombre")).trim(),
        correo,
        telefono: String(datos.get("telefono")).trim(),
        municipalidadId: String(datos.get("municipalidad")),
        ...await crearCredencial(password)
      };
      cuentas.push(cuentaNueva);
      guardar(USER_STORAGE_KEYS.accounts, cuentas);
    } else {
      const cuenta = cuentas.find(item => item.correo === correo);
      if (!cuenta) {
        mensaje.textContent = "No encontré una cuenta con ese correo.";
        return;
      }
      const coincide = cuenta.passwordHash
        ? bytesHex(await calcularHash(password, hexBytes(cuenta.salt))) === cuenta.passwordHash
        : password === cuenta.password;
      if (!coincide) {
        mensaje.textContent = "La contraseña no coincide.";
        return;
      }
    }

    localStorage.setItem(USER_STORAGE_KEYS.session, correo);
    const cuentaActiva = cuentas.find(item => item.correo === correo);
    if (cuentaActiva?.municipalidadId) localStorage.setItem(STORAGE_KEYS.municipality, cuentaActiva.municipalidadId);
    renderUsuario();
  } catch (error) {
    mensaje.textContent = error.message || "No se pudo guardar la cuenta en este navegador.";
  } finally {
    if (form.isConnected) submit.disabled = false;
  }
}

async function crearCredencial(password) {
  if (globalThis.crypto?.subtle) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await calcularHash(password, salt);
    return { salt: bytesHex(salt), passwordHash: bytesHex(hash) };
  }
  return { password };
}

async function calcularHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

function bytesHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function hexBytes(hex) {
  return new Uint8Array((hex.match(/.{2}/g) || []).map(byte => parseInt(byte, 16)));
}
