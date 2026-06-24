// ══════════════════════════════════════════════════════
//   VITOP STORE — tallas-data.js
//   Tabla maestra de tallas por MARCA + GÉNERO/CATEGORÍA,
//   basada en guia-tallas.html. Se usa tanto en las tarjetas
//   del catálogo (script.js) como en la página de producto
//   (producto.html) para que ambas muestren siempre el
//   rango real, con las tallas disponibles resaltadas.
// ══════════════════════════════════════════════════════

function generarRango(min, max, step) {
  step = step || 0.5;
  const out = [];
  for (let v = min; v <= max + 0.001; v += step) {
    out.push(Math.round(v * 10) / 10);
  }
  return out.map(n => (n % 1 === 0 ? String(n) : String(n)));
}

// Rangos de calzado EU por marca y género (redondeados a medias tallas,
// tomando como referencia guia-tallas.html)
const TALLAS_CALZADO = {
  nike: {
    hombre: generarRango(37, 47.5),
    mujer:  generarRango(35, 40),
    unisex: generarRango(32, 38.5),   // niños/juvenil
  },
  adidas: {
    hombre: generarRango(37.5, 48),
    mujer:  generarRango(36, 44),
    unisex: generarRango(35.5, 40.5), // niños/juvenil
  },
  puma: {
    hombre: generarRango(36, 46),
    mujer:  generarRango(36, 40),
    unisex: generarRango(35.5, 44),   // juvenil / unisex
  },
  cat: {
    hombre: generarRango(40, 45),
    mujer:  generarRango(36, 40),
    unisex: generarRango(36, 45),
  },
  // Marca no identificada: rango genérico amplio
  generico: {
    hombre: generarRango(38, 45),
    mujer:  generarRango(35, 40),
    unisex: generarRango(35, 44),
  },
};

// Tallas de prenda (polos, etc.)
const TALLAS_PRENDA = ["XS", "S", "M", "L", "XL", "XXL"];

// Tallas de medias
const TALLAS_MEDIAS = ["S", "M", "L"];

// ── Detectar marca a partir del nombre del producto ──
function detectarMarca(nombre) {
  const n = String(nombre || "").toLowerCase();
  if (/\bnike\b/.test(n)) return "nike";
  if (/\badidas\b/.test(n)) return "adidas";
  if (/\bpuma\b/.test(n)) return "puma";
  if (/\bcat\b|\bcaterpillar\b/.test(n)) return "cat";
  if (/\bjordan\b/.test(n)) return "nike"; // Jordan usa horma Nike
  return "generico";
}

// ── Detectar género/tipo a partir de la categoría ──
function detectarGenero(categoria) {
  const c = String(categoria || "").toLowerCase();
  if (c.includes("unisex")) return "unisex";
  if (c.includes("mujer")) return "mujer";
  if (c.includes("hombre") || c.includes("botin")) return "hombre";
  return "hombre"; // por defecto
}

// ── Detectar tipo de producto (calzado / prenda / medias) ──
function detectarTipoProducto(categoria) {
  const c = String(categoria || "").toLowerCase();
  if (c.includes("media")) return "medias";
  if (c.includes("polo")) return "prenda";
  return "calzado";
}

/**
 * Devuelve el rango MAESTRO de tallas que corresponde a un producto,
 * según su marca (detectada del nombre) y su categoría.
 * @param {string} nombre   - nombre del producto (para detectar marca)
 * @param {string} categoria - categoría del producto (Zapatilla Hombre, etc.)
 * @returns {string[]} lista de tallas en orden, ej: ["40","40.5","41",...]
 */
function obtenerTallasMaestras(nombre, categoria) {
  const tipo = detectarTipoProducto(categoria);
  if (tipo === "medias") return TALLAS_MEDIAS;
  if (tipo === "prenda") return TALLAS_PRENDA;

  const marca  = detectarMarca(nombre);
  const genero = detectarGenero(categoria);
  const tabla  = TALLAS_CALZADO[marca] || TALLAS_CALZADO.generico;
  return tabla[genero] || tabla.hombre;
}

/**
 * Genera el HTML de la grilla de tallas (chips/botones) marcando
 * cuáles están disponibles (con stock real) y cuáles no.
 * @param {string} nombre
 * @param {string} categoria
 * @param {string[]} tallasDisponibles - tallas reales con stock (ya parseadas)
 * @param {object} opts - { tagName, claseBase, claseDisponible, claseNoDisponible, onClickFn }
 */
function generarGrillaTallas(nombre, categoria, tallasDisponibles, opts) {
  opts = opts || {};
  const tagName            = opts.tagName || "span";
  const claseBase          = opts.claseBase || "talla-chip";
  const claseDisponible    = opts.claseDisponible || "disponible";
  const claseNoDisponible  = opts.claseNoDisponible || "no-disponible";
  const onClickFn          = opts.onClickFn || null;

  const disponiblesSet = new Set();
  const cantidadPorTalla = {};
  (tallasDisponibles || []).forEach(entry => {
    const partes = String(entry).trim().split(":");
    const talla = partes[0].trim();
    if (!talla) return;
    disponiblesSet.add(talla);
    if (partes[1] !== undefined) cantidadPorTalla[talla] = parseInt(partes[1]) || 0;
  });

  const maestras = obtenerTallasMaestras(nombre, categoria);

  return maestras.map(t => {
    const hayStock = disponiblesSet.has(t);
    const cantidad = cantidadPorTalla[t];
    const clases = [claseBase, hayStock ? claseDisponible : claseNoDisponible].filter(Boolean).join(" ");

    if (!hayStock) {
      return `<${tagName} class="${clases}" disabled title="Talla no disponible">${t}</${tagName}>`;
    }

    const tooltip = cantidad ? `${cantidad} disponible${cantidad === 1 ? "" : "s"}` : "Disponible";
    const onclickAttr = onClickFn ? ` onclick="${onClickFn.replace("TALLA", t)}"` : "";
    const badge = cantidad && cantidad > 1
      ? `<sup style="font-size:0.6em;margin-left:1px">×${cantidad}</sup>`
      : "";

    return `<${tagName} class="${clases}" title="${tooltip}"${onclickAttr}>${t}${badge}</${tagName}>`;
  }).join("");
}