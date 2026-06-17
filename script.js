// ══════════════════════════════
//   VITOP STORE — script.js
//   Estilo Adidas — hover image, tallas en hover
// ══════════════════════════════

const WA_NUMBER = "51961836500";

const SHEET_ID = "1rgFNqcARXpxsRBqWMOjBizt2E52mQDPM5YMCBVAwWPs";
const SHEET_URL = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&sheet=CATALOGO";

const EMOJI_CAT = {
  "Zapatilla Hombre":    "👟",
  "Zapatilla Mujer":     "👠",
  "ZAPATO BOTIN HOMBRE": "🥾",
  "Polo Hombre":         "👕",
  "Polo Mujer":          "👚",
  "Medias":              "🧦",
  "UNISEX":              "👟",
};

function emoji(cat) { return EMOJI_CAT[cat] || "🛍️"; }

function limpiarNombre(nombre) {
  return nombre
    .replace(/^SKU:\s*/i, "")                        // quita "SKU: " al inicio
    .replace(/^[\w-]*\d{4,}[\w-]*\s*[-–]?\s*/i, "") // quita códigos tipo If9395, JS4402, FQ8146-104
    .replace(/^\d{6}\s*[-–]\s*[\w]+\s*/i, "")        // quita 397646-06
    .replace(/^\d{6}\s*[-–]\s*/i, "")                // quita 397646 -
    .replace(/^[\d\s\-–]+/, "")                       // quita números sueltos
    .trim();
}

function mensajeWA(nombre, precio, tallas) {
  return encodeURIComponent(
    "Hola Vitop Store! 🛍️\nQuiero pedir:\n*" + nombre + "*\n💰 Precio: S/ " + precio + "\n📐 Tallas: " + tallas + "\n¿Hay stock?"
  );
}

function convertirDriveURL(url) {
  if (!url) return "";
  const m1 = url.match(/id=([\w-]+)/);
  if (m1) return "https://drive.google.com/thumbnail?id=" + m1[1] + "&sz=w800";
  const m2 = url.match(/\/d\/([\w-]+)\//);
  if (m2) return "https://drive.google.com/thumbnail?id=" + m2[1] + "&sz=w800";
  return url;
}

function parsearCSV(texto) {
  const lineas = texto.trim().split("\n");
  const headers = lineas[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lineas.slice(1).map(linea => {
    const cols = [];
    let dentroComillas = false;
    let actual = "";
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') { dentroComillas = !dentroComillas; }
      else if (c === ',' && !dentroComillas) { cols.push(actual.trim()); actual = ""; }
      else { actual += c; }
    }
    cols.push(actual.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/"/g, "").trim(); });
    return obj;
  }).filter(p => p.Handle && p.Nombre);
}

fetch(SHEET_URL)
  .then(res => res.text())
  .then(csv => iniciarApp(parsearCSV(csv)))
  .catch(err => {
    console.error("Error cargando Sheets:", err);
    fetch("productos_vitop.json")
      .then(r => r.json())
      .then(data => iniciarApp(data.map(p => ({
        Handle: p.handle, Nombre: p.nombre, Categoria: p.categoria,
        Precio: p.precio, Coste: p.coste,
        Tallas: (p.tallas || []).join(", "), Stock: p.stock_total,
        Imagen1: "", Imagen2: "", Imagen3: "", Imagen4: "",
      }))));
  });

function iniciarApp(productos) {
  const contenedor    = document.getElementById("productos");
  const buscador      = document.getElementById("buscador");
  const filtrosDiv    = document.getElementById("filtros");
  const soloStockCk   = document.getElementById("soloStock");
  const contador      = document.getElementById("contadorResultados");
  const sinResultados = document.getElementById("sinResultados");

  let categoriaActiva = "todos";
  let textoBusqueda   = "";
  let soloConStock    = true;

  const cats = [...new Set(productos.map(p => p.Categoria))].filter(Boolean).sort();
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "filtro-btn";
    btn.dataset.cat = cat;
    btn.textContent = emoji(cat) + " " + cat;
    filtrosDiv.appendChild(btn);
  });

  filtrosDiv.addEventListener("click", e => {
    if (!e.target.classList.contains("filtro-btn")) return;
    document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    categoriaActiva = e.target.dataset.cat || "todos";
    renderizar();
  });

  buscador.addEventListener("input", () => { textoBusqueda = buscador.value.toLowerCase().trim(); renderizar(); });
  soloStockCk.addEventListener("change", () => { soloConStock = soloStockCk.checked; renderizar(); });

  function renderizar() {
    let lista = productos;
    if (categoriaActiva !== "todos") lista = lista.filter(p => p.Categoria === categoriaActiva);
    if (textoBusqueda) lista = lista.filter(p =>
      p.Nombre.toLowerCase().includes(textoBusqueda) || (p.Categoria || "").toLowerCase().includes(textoBusqueda)
    );
    if (soloConStock) lista = lista.filter(p => parseInt(p.Stock) > 0);

    contador.textContent = lista.length + " producto" + (lista.length !== 1 ? "s" : "") + " encontrado" + (lista.length !== 1 ? "s" : "");

    if (lista.length === 0) {
      contenedor.innerHTML = "";
      sinResultados.style.display = "block";
      return;
    }
    sinResultados.style.display = "none";
    contenedor.innerHTML = lista.map(tarjeta).join("");
  }

  function tarjeta(p) {
    const nombre      = limpiarNombre(p.Nombre);
    const precio      = parseFloat(p.Precio) || 0;
    const descuento   = parseFloat((p.Descuento || "").toString().trim()) || 0;
    const precioFinal = descuento > 0 ? (Math.round(precio * (1 - descuento / 100) * 100) / 100) : precio;
    const stock       = parseInt(p.Stock) || 0;
    const tallas      = p.Tallas || "";
    const hayStock    = stock > 0;
    const em          = emoji(p.Categoria);

    const img1 = convertirDriveURL(p["Imagen1"] || "");
    const img2 = convertirDriveURL(p["Imagen2"] || "");

    // Imagen con hover a img2 si existe
    const imgHTML = img1
      ? '<img class="img-principal" src="' + img1 + '" alt="' + nombre + '"' +
        (img2 ? ' data-img2="' + img2 + '"' : '') +
        ' onerror="this.style.display=\'none\'">'
      : '';
    const emojiHTML = '<div class="emoji-placeholder" style="display:' + (img1 ? 'none' : 'flex') + '">' + em + '</div>';

    const badge = !hayStock
      ? '<span class="badge badge-agotado">Agotado</span>'
      : stock <= 2
        ? '<span class="badge badge-stock">⚡ Últimas</span>'
        : '<span class="badge badge-stock">✓ Stock</span>';

    const stockLabel = !hayStock
      ? '<span class="stock-out">Sin stock</span>'
      : stock <= 2
        ? '<span class="stock-low">⚡ Solo ' + stock + ' disponible' + (stock > 1 ? 's' : '') + '</span>'
        : '<span class="stock-ok">✓ ' + stock + ' en stock</span>';

    // Tallas — ocultas, aparecen en hover (estilo Adidas)
    const tallasHTML = tallas.split(",").map(t => '<span class="talla-chip">' + t.trim() + '</span>').join("");

    const btnWA = hayStock
      ? '<a href="https://wa.me/' + WA_NUMBER + '?text=' + mensajeWA(nombre, precio, tallas) + '" target="_blank" class="btn-whatsapp" onclick="event.stopPropagation()">💬 Pedir</a>'
      : '<span class="btn-whatsapp agotado">😔 Agotado</span>';

    const precioHTML = descuento > 0
      ? '<div class="precio-wrap">' +
          '<span class="precio-nuevo">S/ ' + precioFinal.toFixed(2) + '</span>' +
          '<span class="precio-tachado">S/ ' + precio.toFixed(2) + '</span>' +
          '<span class="precio-badge">-' + descuento + '%</span>' +
        '</div>'
      : '<div class="precio-wrap"><span class="precio-normal">S/ ' + precio.toFixed(2) + ' <small>/ und</small></span></div>';

    return '<div class="producto" onclick="window.location.href=\'producto.html?h=' + encodeURIComponent(p.Handle) + '\'" style="cursor:pointer">' +
      '<div class="producto-img">' +
        badge + imgHTML + emojiHTML +
        '<div class="tallas-hover">' + tallasHTML +
          '<a href="guia-tallas/guia-tallas.html" class="guia-link" onclick="event.stopPropagation()" target="_blank">Guía de tallas</a>' +
        '</div>' +
      '</div>' +
      '<div class="producto-body">' +
        '<div class="producto-cat">' + p.Categoria + '</div>' +
        '<div class="producto-nombre">' + nombre + '</div>' +
        '<div class="producto-stock">' + stockLabel + '</div>' +
        '<div class="producto-footer">' + precioHTML + btnWA + '</div>' +
      '</div>' +
    '</div>';
  }

  // Hover: cambiar imagen a img2 al entrar en la tarjeta, restaurar al salir
  document.addEventListener("mouseover", e => {
    const prod = e.target.closest(".producto");
    if (!prod) return;
    const img = prod.querySelector(".img-principal");
    if (img && img.dataset.img2 && img.src !== img.dataset.img2) {
      if (!img.dataset.original) img.dataset.original = img.src;
      img.src = img.dataset.img2;
    }
  });
  document.addEventListener("mouseout", e => {
    const prod = e.target.closest(".producto");
    if (!prod || prod.contains(e.relatedTarget)) return;
    const img = prod.querySelector(".img-principal");
    if (img && img.dataset.original) {
      img.src = img.dataset.original;
      delete img.dataset.original;
    }
  });

  renderizar();
}