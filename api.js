const API_URL = "https://prueba-de-ti-2.onrender.com";

async function obtenerPuentesAPI({ puentesIniciales, puentesConfigurados, listaPuentes, imagenesPuentes }) {
  const [actualResult, historialResult] = await Promise.allSettled([
    fetch(`${API_URL}/alertas`, { cache: "no-store", headers: { Accept: "application/json" } }),
    fetch(`${API_URL}/alertas/historial`, { cache: "no-store", headers: { Accept: "application/json" } })
  ]);
  if (actualResult.status === "rejected") throw actualResult.reason;
  if (!actualResult.value.ok) throw new Error(`GET /alertas: HTTP ${actualResult.value.status}`);

  const lecturasActuales = await actualResult.value.json();
  if (!Array.isArray(lecturasActuales)) throw new Error("GET /alertas no devolvió una lista");

  let transiciones = [];
  if (historialResult.status === "fulfilled" && historialResult.value.ok) {
    const payload = await historialResult.value.json();
    transiciones = Array.isArray(payload) ? payload : payload.historial || payload.data || [];
    if (!Array.isArray(transiciones)) transiciones = [];
  } else {
    console.warn("No se pudo cargar el historial de estados; se mostrarán las lecturas actuales.");
  }

  const historialPorPuente = new Map();
  transiciones.forEach(evento => {
    const clave = normalizarNombrePuente(evento.nombre_puente);
    if (!clave) return;
    if (!historialPorPuente.has(clave)) historialPorPuente.set(clave, []);
    historialPorPuente.get(clave).push(convertirTransicionAPI(evento));
  });

  return lecturasActuales.flatMap(lectura => {
    const nombre = String(lectura.nombre_puente || "").trim();
    const clave = normalizarNombrePuente(nombre);
    if (!nombre || !clave) return [];

    const base = puentesIniciales.find(p => normalizarNombrePuente(p.nombre) === clave)
      || puentesConfigurados.find(p => normalizarNombrePuente(p.nombre) === clave)
      || listaPuentes.find(p => normalizarNombrePuente(p.nombre) === clave)
      || {};
    const puente = {
      id: base.id || clave,
      nombre: base.nombre || nombre,
      km: base.km || "",
      coordenadas: base.coordenadas || { lat: null, lon: null },
      alturaMetros: base.alturaMetros || null,
      imagen: base.imagen || imagenesPuentes[base.id || clave] || "",
      mapaUrl: base.mapaUrl || "",
      historial: []
    };

    const alturaPuente = numeroAPI(lectura.altura_puente ?? lectura.altura_del_puente);
    if (Number.isFinite(alturaPuente) && alturaPuente > 0) puente.alturaMetros = alturaPuente;
    puente.lecturaActual = convertirLecturaAPI(lectura);
    puente.historial = (historialPorPuente.get(clave) || [])
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return [puente];
  });
}

function normalizarNombrePuente(nombre) {
  return String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]/g, "");
}

function numeroAPI(valor) {
  if (valor === null || valor === undefined || valor === "") return NaN;
  return Number(String(valor).replace(",", "."));
}

function convertirLecturaAPI(registro) {
  const nivelMetros = numeroAPI(registro.altura_agua ?? registro.nivel_caudal ?? registro.caudal_historico);
  const estadoApi = String(registro.estado_puente || "normal").toLocaleLowerCase("es");
  const estado = estadoApi.includes("cerr") || estadoApi.includes("critic")
    ? "Cerrado"
    : estadoApi.includes("alert") || estadoApi.includes("precauc")
      ? "Alerta"
      : "Abierto";
  const fecha = registro.fecha || registro.fecha_registro || registro.created_at || registro.timestamp || new Date().toISOString();
  return { fecha: String(fecha).replace("T", " ").slice(0, 19), estado, nivelCaudalCm: Number.isFinite(nivelMetros) ? nivelMetros * 100 : null };
}

function convertirTransicionAPI(evento) {
  const datos = evento.datos_nuevos || {};
  const nivelMetros = numeroAPI(datos.altura_agua ?? datos.nivel_caudal ?? datos.caudal_historico);
  const fecha = evento.fecha_cambio || evento.fecha || "";
  return {
    fecha: String(fecha).replace("T", " ").slice(0, 19),
    estado: evento.estado_nuevo || evento.estado_anterior || "Sin datos",
    estadoAnterior: evento.estado_anterior || "",
    estadoNuevo: evento.estado_nuevo || "",
    nivelCaudalCm: Number.isFinite(nivelMetros) ? nivelMetros * 100 : null
  };
}
