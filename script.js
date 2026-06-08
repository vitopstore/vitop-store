// ══════════════════════════════
// VITOP STORE — script.js
// Conectado a Google Sheets
// ══════════════════════════════

const WA_NUMBER = "51961836500";

const SHEET_URL = "https://corsproxy.io/?" + encodeURIComponent(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTs97ABaxAcqTiWE-FimeAb96n9asWvXlo9H-QvUKXNtvq-I-H9JoqMZ3RHXAfokC09JaykIUXvGvoT/pub?gid=1777311677&single=true&output=csv"
);
function convertirDriveURL(url) {
  if (!url) return "";
  const match = url.match(/id=([\w-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600-h600-c`;
  }
  const match2 = url.match(/\/d\/([\w-]+)\//);
  if (match2) {
    return `https://drive.google.com/thumbnail?id=${match2[1]}&sz=w600-h600-c`;
  }
  return url;
}

// ── EMOJIS POR CATEGORÍA ────────────────────────────────
const EMOJI_CAT = {
  "Zapatilla Hombre": "👟",
  "Zapatilla Mujer": "👠",
  "ZAPATO BOTIN HOMBRE": "🥾",
  "Polo Hombre": "👕",
  "Polo Mujer": "👚",
  "Medias": "🧦",
  "UNISEX": "👟",
};

function emoji(cat) {
  return EMOJI_CAT[cat] || "🛍️";
}

// ── LIMPIAR NOMBRE ───────────────────────────────────────
function limpiarNombre(nombre) {
  return nombre
    .replace(/^SKU:\s*[\w-]+\s*/i, "")
    .replace(/^\d{6}\s*[-–]\s*[\w]+\s*/i, "")
    .replace(/^\d{6}\s*[-–]\s*/i, "")
    .trim();
}

// ── MENSAJE WHATSAPP ─────────────────────────────────────
function mensajeWA(nombre, precio, tallas) {
  return encodeURIComponent(
    `Hola Vitop Store! 🛍️
Quiero pedir:
*${nombre}*
💰 Precio: S/ ${precio}
📐 Tallas: ${tallas}
¿Hay stock?`
  );
}

// ── PARSEAR CSV ──────────────────────────────────────────
function parsearCSV(texto) {
  const lineas = texto.trim().split("\n");
  const headers = lineas[0]
    .split(",")
    .map((h) => h.trim().replace(/"/g, ""));

  return lineas
    .slice(1)
    .map((linea) => {
      const cols =
        linea.match(/(".*?"|[^",\n]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];

      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] || "").replace(/"/g, "").trim();
      });

      return obj;
    })
    .filter((p) => p.Handle && p.Nombre);
}

// ── CARGA PRINCIPAL ──────────────────────────────────────
fetch(SHEET_URL)
  .then((res) => res.text())
  .then((csv) => {
    const productos = parsearCSV(csv);
    iniciarApp(productos);
  })
  .catch((err) => {
    console.error("Error Sheets:", err);

    // fallback JSON
    fetch("productos_vitop.json")
      .then((r) => r.json())
      .then((data) => {
        const convertidos = data.map((p) => ({
          Handle: p.handle,
          Nombre: p.nombre,
          Categoria: p.categoria,
          Precio: p.precio,
          Coste: p.coste,
          Tallas: p.tallas.join(", "),
          Stock: p.stock_total,
          Imagen: "",
        }));

        iniciarApp(convertidos);
      });
  });

// ── INICIAR APP ──────────────────────────────────────────
function iniciarApp(productos) {
  const contenedor = document.getElementById("productos");
  const buscador = document.getElementById("buscador");
  const filtrosDiv = document.getElementById("filtros");
  const soloStockCk = document.getElementById("soloStock");
  const contador = document.getElementById("contadorResultados");
  const sinResultados = document.getElementById("sinResultados");

  let categoriaActiva = "todos";
  let textoBusqueda = "";
  let soloConStock = true;

  // ── FILTROS DINÁMICOS ────────────────────────────────
  const cats = [...new Set(productos.map((p) => p.Categoria))]
    .filter(Boolean)
    .sort();

  cats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filtro-btn";
    btn.dataset.cat = cat;
    btn.textContent = `${emoji(cat)} ${cat}`;
    filtrosDiv.appendChild(btn);
  });

  filtrosDiv.addEventListener("click", (e) => {
    if (!e.target.classList.contains("filtro-btn")) return;

    document
      .querySelectorAll(".filtro-btn")
      .forEach((b) => b.classList.remove("active"));

    e.target.classList.add("active");
    categoriaActiva = e.target.dataset.cat || "todos";
    renderizar();
  });

  buscador.addEventListener("input", () => {
    textoBusqueda = buscador.value.toLowerCase().trim();
    renderizar();
  });

  soloStockCk.addEventListener("change", () => {
    soloConStock = soloStockCk.checked;
    renderizar();
  });

  // ── RENDER ────────────────────────────────────────────
  function renderizar() {
    let lista = productos;

    if (categoriaActiva !== "todos") {
      lista = lista.filter((p) => p.Categoria === categoriaActiva);
    }

    if (textoBusqueda) {
      lista = lista.filter(
        (p) =>
          p.Nombre.toLowerCase().includes(textoBusqueda) ||
          (p.Categoria || "").toLowerCase().includes(textoBusqueda)
      );
    }

    if (soloConStock) {
      lista = lista.filter((p) => parseInt(p.Stock) > 0);
    }

    contador.textContent = `${lista.length} producto${
      lista.length !== 1 ? "s" : ""
    } encontrado${lista.length !== 1 ? "s" : ""}`;

    if (lista.length === 0) {
      contenedor.innerHTML = "";
      sinResultados.style.display = "block";
      return;
    }

    sinResultados.style.display = "none";
    contenedor.innerHTML = lista.map(tarjeta).join("");
  }

  // ── TARJETA PRODUCTO ─────────────────────────────────
  function tarjeta(p) {
    const nombre = limpiarNombre(p.Nombre);
    const precio = parseFloat(p.Precio) || 0;
    const stock = parseInt(p.Stock) || 0;
    const tallas = p.Tallas || "";
    const hayStock = stock > 0;
    const em = emoji(p.Categoria);

    const imagen = p.Imagen1 || p.Imagen || "";

const img = imagen
  ? `<img src="${convertirDriveURL(imagen)}" style="width:100%;height:200px;object-fit:cover;">`
  : `<div style="font-size:5rem;display:flex;align-items:center;justify-content:center;height:200px;background:#f5f5f5">${em}</div>`;
    const badge = !hayStock
      ? `<span class="badge badge-agotado">Agotado</span>`
      : stock <= 2
      ? `<span class="badge badge-stock">⚡ Últimas</span>`
      : `<span class="badge badge-stock">✓ Stock</span>`;

    const stockLabel = !hayStock
      ? `<span class="stock-out">Sin stock</span>`
      : stock <= 2
      ? `<span class="stock-low">⚡ Solo ${stock} disponible(s)</span>`
      : `<span class="stock-ok">✓ ${stock} en stock</span>`;

    const tallasHTML = tallas
      .split(",")
      .map((t) => `<span class="talla-chip">${t.trim()}</span>`)
      .join("");

    const btnWA = hayStock
      ? `<a href="https://wa.me/${WA_NUMBER}?text=${mensajeWA(
          nombre,
          precio,
          tallas
        )}" target="_blank" class="btn-whatsapp">💬 Pedir</a>`
      : `<span class="btn-whatsapp agotado">😔 Agotado</span>`;

    return `
      <div class="producto">
        <div class="producto-img">${badge}${img}</div>
        <div class="producto-body">
          <div class="producto-cat">${p.Categoria}</div>
          <div class="producto-nombre">${nombre}</div>
          <div class="producto-tallas">${tallasHTML}</div>
          <div class="producto-stock">${stockLabel}</div>
          <div class="producto-footer">
            <div class="producto-precio">S/ ${precio} <small>/ und</small></div>
            ${btnWA}
          </div>
        </div>
      </div>
    `;
  }

  renderizar();
}