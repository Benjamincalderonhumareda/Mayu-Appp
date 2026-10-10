// Cliente Web Push. La clave pública se solicita a Mayu API; la clave privada
// VAPID permanece exclusivamente en el servidor.
const PUSH_API_URL = `${API_URL}/notificaciones`;
const PUSH_KEY_URL = `${PUSH_API_URL}/clave-publica`;
let pushRegistration = null;
let pushSyncInFlight = Promise.resolve();

function inicializarNotificacionesPush() {
  const control = document.getElementById("pref-alerts");
  control.checked = localStorage.getItem(STORAGE_KEYS.alerts) === "true";
  control.addEventListener("change", async () => {
    control.disabled = true;
    try {
      if (control.checked) await activarNotificacionesPush();
      else await desactivarNotificacionesPush();
      localStorage.setItem(STORAGE_KEYS.alerts, String(control.checked));
    } catch (error) {
      control.checked = !control.checked;
      mostrarEstadoPush(error.message || "No se pudo actualizar la suscripción.");
    } finally {
      control.disabled = false;
    }
  });

  if (control.checked) {
    comprobarEstadoPush().catch(error => mostrarEstadoPush(error.message));
  } else {
    mostrarEstadoPush("Activa el control para recibir avisos de los puentes que sigues.");
  }
}

function mostrarEstadoPush(mensaje) {
  const estado = document.getElementById("push-status");
  if (estado) estado.textContent = mensaje;
}

function validarSoportePush() {
  if (!window.isSecureContext) throw new Error("Las notificaciones requieren HTTPS.");
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Este navegador no admite notificaciones push.");
  }
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches && !navigator.standalone) {
    throw new Error("En iPhone, instala MayuAlert en la pantalla de inicio y ábrela desde su icono.");
  }
}

async function obtenerClavePublicaPush() {
  const respuesta = await fetch(PUSH_KEY_URL, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!respuesta.ok) throw new Error(`Mayu API aún no ofrece la clave pública push (HTTP ${respuesta.status}).`);
  const datos = await respuesta.json();
  const clave = datos.publicKey || datos.vapidPublicKey || datos.clave_publica;
  if (!clave) throw new Error("Mayu API no devolvió una clave pública VAPID válida.");
  return clave;
}

function decodificarClavePush(valor) {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binario, caracter => caracter.charCodeAt(0));
}

async function obtenerSuscripcionPush() {
  pushRegistration = pushRegistration || await navigator.serviceWorker.ready;
  return pushRegistration.pushManager.getSubscription();
}

async function activarNotificacionesPush() {
  validarSoportePush();
  if (Notification.permission === "denied") throw new Error("El permiso está bloqueado. Cámbialo en los ajustes del navegador.");
  mostrarEstadoPush("Solicitando permiso de notificaciones…");
  const permiso = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No se concedió permiso para mostrar notificaciones.");

  pushRegistration = await navigator.serviceWorker.ready;
  let suscripcion = await pushRegistration.pushManager.getSubscription();
  if (!suscripcion) {
    mostrarEstadoPush("Creando suscripción segura…");
    const clave = await obtenerClavePublicaPush();
    suscripcion = await pushRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodificarClavePush(clave)
    });
  }
  await guardarSuscripcionPush(suscripcion);
  mostrarEstadoPush("Notificaciones activas para los puentes seleccionados.");
}

async function guardarSuscripcionPush(suscripcion) {
  const respuesta = await fetch(`${PUSH_API_URL}/suscripciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ subscription: suscripcion.toJSON(), enabled: true, bridges: asignados })
  });
  if (!respuesta.ok) throw new Error(`No se pudo guardar la suscripción en Mayu API (HTTP ${respuesta.status}).`);
}

async function desactivarNotificacionesPush() {
  const suscripcion = await obtenerSuscripcionPush();
  if (!suscripcion) {
    mostrarEstadoPush("Notificaciones desactivadas.");
    return;
  }
  const respuesta = await fetch(`${PUSH_API_URL}/suscripciones`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ endpoint: suscripcion.endpoint })
  });
  if (!respuesta.ok) throw new Error(`Mayu API no confirmó la baja (HTTP ${respuesta.status}); se conserva la suscripción local.`);
  await suscripcion.unsubscribe();
  mostrarEstadoPush("Notificaciones desactivadas.");
}

async function comprobarEstadoPush() {
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    mostrarEstadoPush("Este navegador no admite notificaciones push.");
    return;
  }
  if (Notification.permission === "denied") {
    mostrarEstadoPush("Permiso bloqueado en los ajustes del navegador.");
    return;
  }
  const suscripcion = await obtenerSuscripcionPush();
  mostrarEstadoPush(suscripcion ? "Notificaciones activas en este dispositivo." : "Activa el control para configurar las notificaciones.");
}

function sincronizarPuentesPush() {
  if (localStorage.getItem(STORAGE_KEYS.alerts) !== "true") return;
  pushSyncInFlight = pushSyncInFlight.then(async () => {
    const suscripcion = await obtenerSuscripcionPush();
    if (suscripcion) await guardarSuscripcionPush(suscripcion);
  }).catch(error => mostrarEstadoPush(error.message || "No se pudieron sincronizar los puentes seleccionados."));
}

async function abrirPuenteDesdeNotificacion(id) {
  if (!id) return;
  const puente = listaPuentes.find(item => item.id === id);
  if (puente) abrirDetalle(puente.id);
  else window.location.href = `./?puente=${encodeURIComponent(id)}`;
}
