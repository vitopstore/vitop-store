// ══════════════════════════════
//   VITOP STORE — script.js
//   Estilo Adidas — hover image, tallas en hover
// ══════════════════════════════

const WA_NUMBER    = "51961836500";  // Asesor Victor
const WA_STEFANY   = "51932611086";  // Asesor Stefany

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
  let n = String(nombre || "").trim();

  n = n.replace(/^SKU:\s*/i, "");                          // quita "SKU: " al inicio

  // Quita cualquier cantidad de códigos/SKU al inicio (uno o varios, separados
  // por espacios o guiones). Un "código" = trae al menos un dígito mezclado
  // con letras/guiones, ej: If9395, JS4402, FQ8146-104, 010405, 397646-06.
  let prev;
  do {
    prev = n;
    n = n.replace(/^[A-Za-z]{0,4}\d{3,}[A-Za-z0-9-]*[\s\-–]+/, "");
  } while (n !== prev && n.length > 0);

  n = n.replace(/^[\d\s\-–]+/, "");                         // números sueltos restantes
  n = n.trim();

  // Title Case profesional, conservando siglas/números (SL 2, 13, XL, etc.)
  n = n
    .split(" ")
    .map(w => {
      if (!w) return w;
      if (/^[A-Z0-9]+$/.test(w) && w.length <= 4) return w;   // sigla/número: deja igual (SL, XL, 13)
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");

  return n;
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
    contenedor.innerHTML = lista.map((p, i) => tarjeta(p, i)).join("");
  }

  function tarjeta(p, idx) {
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

    // Tallas — rango completo real según marca/género (estilo Nike.com):
    // disponibles en negro/seleccionable, sin stock en gris/opaco
    const tallasReales = tallas.split(",").map(t => t.trim()).filter(Boolean);
    const tallasHTML = generarGrillaTallas(p.Nombre, p.Categoria, tallasReales, {
      tagName: "span",
      claseBase: "talla-chip",
    });

    // Tallas hover — solo en tarjetas 2+; la primera muestra solo imagen
    const tallasHoverHTML = idx === 0 ? '' :
      '<div class="tallas-hover">' + tallasHTML +
        '<a href="guia-tallas.html" class="guia-link" onclick="event.stopPropagation()" target="_blank">Guía de tallas</a>' +
      '</div>';

    const btnWA = hayStock
      ? '<div class="btn-asesores">' +
          '<a href="https://wa.me/' + WA_STEFANY + '?text=' + mensajeWA(nombre, precio, tallas) + '" target="_blank" class="btn-asesor" onclick="event.stopPropagation()" title="Asesora Stefany">💬 Stefany</a>' +
          '<a href="https://wa.me/' + WA_NUMBER + '?text=' + mensajeWA(nombre, precio, tallas) + '" target="_blank" class="btn-asesor" onclick="event.stopPropagation()" title="Asesor Victor">💬 Victor</a>' +
        '</div>'
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
        tallasHoverHTML +
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

  // ── Generar PDF del catálogo ──────────────────────────────────────────────
  const btnPDF = document.getElementById("btnDescargarPDF");
  if (btnPDF) {
    btnPDF.addEventListener("click", () => generarCatalogoPDF(productos));
  }
}
// ══════════════════════════════════════════════════════
//   GENERAR CATÁLOGO PDF
//   Usa print CSS para generar un PDF limpio y ordenado
// ══════════════════════════════════════════════════════
function generarCatalogoPDF(productos) {
  const btn = document.getElementById("btnDescargarPDF");
  if (btn) { btn.textContent = "⏳ Generando..."; btn.disabled = true; }

  const anio = new Date().getFullYear();
  const productosConStock = productos.filter(p => parseInt(p.Stock) > 0);

  // Agrupar por categoría
  const grupos = {};
  productosConStock.forEach(p => {
    const cat = p.Categoria || "Otros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });

  // Categorías ordenadas
  const catOrden = Object.keys(grupos).sort();

  // Generar filas de productos para el PDF
  function rowsHTML(lista) {
    return lista.map(p => {
      const nombre = limpiarNombre(p.Nombre);
      const precio = parseFloat(p.Precio) || 0;
      const descuento = parseFloat((p.Descuento || "").toString().trim()) || 0;
      const precioFinal = descuento > 0 ? (Math.round(precio * (1 - descuento / 100) * 100) / 100) : precio;
      const stock = parseInt(p.Stock) || 0;
      const tallas = (p.Tallas || "").split(",").map(t => t.trim()).filter(Boolean).join(" · ");
      const precioStr = descuento > 0
        ? `<span style="font-weight:700">S/ ${precioFinal.toFixed(2)}</span> <span style="text-decoration:line-through;color:#999;font-size:0.75rem">S/ ${precio.toFixed(2)}</span> <span style="color:#c0392b;font-size:0.7rem;font-weight:700">-${descuento}%</span>`
        : `<span style="font-weight:700">S/ ${precio.toFixed(2)}</span>`;
      const stockBadge = stock <= 2
        ? `<span style="color:#d97706;font-weight:600">⚡ ${stock} disp.</span>`
        : `<span style="color:#16a34a;font-weight:600">✓ ${stock}</span>`;
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:0.82rem">${nombre}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:0.78rem;color:#555">${tallas || "—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:0.82rem;white-space:nowrap">${precioStr}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:0.78rem;text-align:center">${stockBadge}</td>
      </tr>`;
    }).join("");
  }

  const seccionesHTML = catOrden.map(cat => `
    <div class="pdf-seccion">
      <h3 class="pdf-cat-titulo">${cat}</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#0c0c0c;color:#b8973a">
            <th style="padding:8px 10px;text-align:left;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase">Producto</th>
            <th style="padding:8px 10px;text-align:left;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase">Tallas disponibles</th>
            <th style="padding:8px 10px;text-align:left;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase">Precio</th>
            <th style="padding:8px 10px;text-align:center;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase">Stock</th>
          </tr>
        </thead>
        <tbody>${rowsHTML(grupos[cat])}</tbody>
      </table>
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Catálogo VITOP ${anio}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;600&family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Montserrat',sans-serif; font-weight:300; color:#0c0c0c; background:#fff; padding:0; }
    .pdf-header { background:#0c0c0c; color:#fff; padding:32px 40px; display:flex; align-items:center; justify-content:space-between; }
    .pdf-logo { font-family:'Cormorant Garamond',serif; font-size:2.2rem; font-weight:600; letter-spacing:6px; }
    .pdf-logo span { color:#b8973a; }
    .pdf-header-info { text-align:right; }
    .pdf-header-info h2 { font-size:0.75rem; letter-spacing:2px; text-transform:uppercase; color:#b8973a; margin-bottom:4px; }
    .pdf-header-info p { font-size:0.7rem; color:#666; }
    .pdf-contacto { background:#f8f6f1; padding:14px 40px; display:flex; gap:2rem; align-items:center; border-bottom:2px solid #b8973a; }
    .pdf-contacto span { font-size:0.72rem; font-weight:500; }
    .pdf-contacto strong { color:#b8973a; }
    .pdf-body { padding:24px 40px; }
    .pdf-resumen { font-size:0.78rem; color:#555; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #eee; }
    .pdf-seccion { margin-bottom:28px; page-break-inside:avoid; }
    .pdf-cat-titulo { font-family:'Cormorant Garamond',serif; font-size:1.2rem; font-weight:600; letter-spacing:2px; text-transform:uppercase; padding:10px 0 8px; border-bottom:2px solid #0c0c0c; margin-bottom:0; color:#0c0c0c; }
    table { font-family:'Montserrat',sans-serif; }
    tbody tr:nth-child(even) td { background:#fafaf8; }
    tbody tr:hover td { background:#f0ede4; }
    .pdf-footer { background:#0c0c0c; color:#555; padding:16px 40px; font-size:0.68rem; letter-spacing:1px; text-align:center; margin-top:20px; }
    @media print {
      .pdf-header { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      thead tr { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .pdf-contacto { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .pdf-footer { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-logo">VITOP<span>.</span></div>
    <div class="pdf-header-info">
      <h2>Catálogo de Productos</h2>
      <p>${anio} · Productos 100% Originales · Perú</p>
    </div>
  </div>
  <div class="pdf-contacto">
    <span>📞 Asesora <strong>Stefany</strong>: +51 932 611 086</span>
    <span>📞 Asesor <strong>Victor</strong>: +51 961 836 500</span>
    <span>🛍️ vitopstore.github.io/vitop-store</span>
  </div>
  <div class="pdf-body">
    <p class="pdf-resumen">${productosConStock.length} productos disponibles en ${catOrden.length} categorías · Generado el ${new Date().toLocaleDateString('es-PE', {day:'2-digit',month:'long',year:'numeric'})}</p>
    ${seccionesHTML}
  </div>
  <div class="pdf-footer">© ${anio} VITOP STORE · Hecho con ❤️ en Perú · Precios en Soles (S/) · Sujetos a disponibilidad</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Por favor permite las ventanas emergentes para generar el PDF.");
    if (btn) { btn.textContent = "📄 Catálogo PDF"; btn.disabled = false; }
    return;
  }
  win.document.write(html);
  win.document.close();

  if (btn) {
    setTimeout(() => { btn.textContent = "📄 Catálogo PDF"; btn.disabled = false; }, 2000);
  }
}
