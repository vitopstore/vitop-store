// ══════════════════════════════
//   VITOP STORE — script.js
// ══════════════════════════════

const WA_STEFANY = "51932611086";  // Asesora Stefany
const WA_VICTOR  = "51961836500";  // Asesor Victor

const SHEET_ID  = "1rgFNqcARXpxsRBqWMOjBizt2E52mQDPM5YMCBVAwWPs";
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
  n = n.replace(/^SKU:\s*/i, "");
  let prev;
  do {
    prev = n;
    n = n.replace(/^[A-Za-z]{0,4}\d{3,}[A-Za-z0-9-]*[\s\-–]+/, "");
  } while (n !== prev && n.length > 0);
  n = n.replace(/^[\d\s\-–]+/, "");
  n = n.trim();
  n = n.split(" ").map(w => {
    if (!w) return w;
    if (/^[A-Z0-9]+$/.test(w) && w.length <= 4) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
  return n;
}

function mensajeWA(nombre, precio, tallas) {
  const tallasLimpias = String(tallas || "")
    .split(",")
    .map(t => t.split(":")[0].trim())
    .filter(Boolean)
    .join(", ");
  return encodeURIComponent(
    "Hola Vitop Store! 🛍️\nQuiero pedir:\n*" + nombre + "*\n💰 Precio: S/ " + precio + "\n📐 Tallas: " + tallasLimpias + "\n¿Hay stock?"
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
        Imagen1: p.imagen1 || "", Imagen2: p.imagen2 || "",
        Imagen3: p.imagen3 || "", Imagen4: p.imagen4 || "",
      }))));
  });

// ── Navegar al producto (llamado desde onclick del div) ──
function irAProducto(handle) {
  window.location.href = 'producto.html?h=' + encodeURIComponent(handle);
}

// ── Zoom de imagen en el catálogo (lightbox) ──
function abrirZoomCat(btn) {
  const cont = btn.closest(".producto-img");
  const img = cont ? cont.querySelector(".img-principal") : null;
  if (!img || !img.src) return;
  const modal = document.getElementById("modalZoomCat");
  const zoomImg = document.getElementById("zoom-img-cat");
  zoomImg.src = img.src;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}
function cerrarZoomCat(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains("zoom-close-btn")) return;
  document.getElementById("modalZoomCat").classList.remove("open");
  document.body.style.overflow = "";
}
document.addEventListener("keydown", e => {
  const modal = document.getElementById("modalZoomCat");
  if (modal && modal.classList.contains("open") && e.key === "Escape") cerrarZoomCat();
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

    const imgHTML = img1
      ? '<img class="img-principal" src="' + img1 + '" alt="' + nombre + '"' +
        (img2 ? ' data-img2="' + img2 + '"' : '') +
        ' onerror="this.style.display=\'none\'">'
      : '';
    const emojiHTML = '<div class="emoji-placeholder" style="display:' + (img1 ? 'none' : 'flex') + '">' + em + '</div>';

    const badge = !hayStock
      ? '<span class="badge badge-agotado">Agotado</span>'
      : '<span class="badge badge-stock">✓ Stock limitado</span>';

    const stockLabel = !hayStock
      ? '<span class="stock-out">Sin stock</span>'
      : '<span class="stock-ok">✓ Stock limitado</span>';

    const tallasReales = tallas.split(",").map(t => t.trim()).filter(Boolean);
    const tallasHTML = generarGrillaTallas(p.Nombre, p.Categoria, tallasReales, {
      tagName: "span",
      claseBase: "talla-chip",
    });

    // El panel de tallas en hover se quitó de TODAS las tarjetas del catálogo
    // porque tapaba la foto del producto. Las tallas reales se muestran
    // únicamente en la página de detalle del producto.
    const tallasHoverHTML = '';

    // FIX #4: Los botones WA usan onclick con stopPropagation; NO hay onclick en el div padre que interfiera
    // El div usa data-handle y el click se maneja por delegación abajo
    const btnWA = hayStock
      ? '<div class="btn-asesores" onclick="event.stopPropagation()">' +
          '<a href="https://wa.me/' + WA_STEFANY + '?text=' + mensajeWA(nombre, precio, tallas) + '" target="_blank" class="btn-asesor" onclick="event.stopPropagation()">💬 Asesor 1</a>' +
          '<a href="https://wa.me/' + WA_VICTOR + '?text=' + mensajeWA(nombre, precio, tallas) + '" target="_blank" class="btn-asesor" onclick="event.stopPropagation()">💬 Asesor 2</a>' +
        '</div>'
      : '<span class="btn-whatsapp agotado">😔 Agotado</span>';

    const precioHTML = descuento > 0
      ? '<div class="precio-wrap">' +
          '<span class="precio-nuevo">S/ ' + precioFinal.toFixed(2) + '</span>' +
          '<span class="precio-tachado">S/ ' + precio.toFixed(2) + '</span>' +
          '<span class="precio-badge">-' + descuento + '%</span>' +
        '</div>'
      : '<div class="precio-wrap"><span class="precio-normal">S/ ' + precio.toFixed(2) + ' <small>/ und</small></span></div>';

    // FIX #4: uso data-handle en lugar de onclick en el div para evitar que interfiera con links WA
    return '<div class="producto" data-handle="' + encodeURIComponent(p.Handle) + '" style="cursor:pointer">' +
      '<div class="producto-img">' +
        badge + imgHTML + emojiHTML +
        (img1 ? '<button type="button" class="zoom-hint-cat" title="Ampliar imagen" onclick="event.stopPropagation();abrirZoomCat(this)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.2" y2="16.2"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>' : '') +
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

  // FIX #4: delegación de click — solo navega si NO se hizo clic en un link/button
  contenedor.addEventListener("click", e => {
    // Si hicieron clic en un link o button interno, no navegar
    if (e.target.closest("a") || e.target.closest("button")) return;
    const card = e.target.closest(".producto");
    if (!card || !card.dataset.handle) return;
    window.location.href = 'producto.html?h=' + card.dataset.handle;
  });

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

  // PDF
  const btnPDF = document.getElementById("btnDescargarPDF");
  if (btnPDF) {
    btnPDF.addEventListener("click", () => generarCatalogoPDF(productos));
  }
}

// ══════════════════════════════════════════════════════════════════
//   CATÁLOGO PDF — Estilo tarjeta con imagen (inspirado Fritz)
//   2 productos por fila, imagen grande, tallas chips, precio
// ══════════════════════════════════════════════════════════════════
function generarCatalogoPDF(productos) {
  const btn = document.getElementById("btnDescargarPDF");
  if (btn) { btn.textContent = "⏳ Generando PDF..."; btn.disabled = true; }

  const anio = new Date().getFullYear();
  const productosConStock = productos.filter(p => parseInt(p.Stock) > 0);

  // Agrupar por categoría
  const grupos = {};
  productosConStock.forEach(p => {
    const cat = p.Categoria || "Otros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });
  const catOrden = Object.keys(grupos).sort();

  // Generar chip de talla (solo disponibles)
  function chipsDisponibles(p) {
    const tallas = (p.Tallas || "").split(",").map(t => t.trim()).filter(Boolean);
    if (!tallas.length) return '<span style="color:#999;font-size:0.7rem">Sin tallas registradas</span>';
    return tallas.map(t =>
      `<span style="display:inline-block;border:1.5px solid #0c0c0c;padding:2px 7px;font-size:0.65rem;font-weight:700;font-family:Montserrat,sans-serif;letter-spacing:0.5px;margin:2px;background:#fff">${t}</span>`
    ).join("");
  }

  // Generar tarjeta de producto para el PDF
  function cardPDF(p) {
    const nombre = limpiarNombre(p.Nombre);
    const precio = parseFloat(p.Precio) || 0;
    const descuento = parseFloat((p.Descuento || "").toString().trim()) || 0;
    const precioFinal = descuento > 0 ? (Math.round(precio * (1 - descuento / 100) * 100) / 100) : precio;
    const stock = parseInt(p.Stock) || 0;
    const img1 = convertirDriveURL(p["Imagen1"] || "");

    const imgTag = img1
      ? `<img src="${img1}" alt="${nombre}" style="width:100%;height:180px;object-fit:contain;object-position:center;background:#f8f6f1;padding:12px;display:block;" onerror="this.style.display='none'">`
      : `<div style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#f0ede4;font-size:3rem">${emoji(p.Categoria)}</div>`;

    const precioStr = descuento > 0
      ? `<span style="font-size:1rem;font-weight:700;color:#0c0c0c">S/ ${precioFinal.toFixed(2)}</span>
         <span style="font-size:0.72rem;text-decoration:line-through;color:#aaa;margin-left:5px">S/ ${precio.toFixed(2)}</span>
         <span style="font-size:0.65rem;font-weight:700;color:#fff;background:#c0392b;padding:2px 6px;margin-left:4px;border-radius:2px">-${descuento}%</span>`
      : `<span style="font-size:1rem;font-weight:700;color:#0c0c0c">S/ ${precio.toFixed(2)}</span>`;

    const stockColor = '#16a34a';
    const stockTxt   = `✓ Stock limitado`;

    return `
    <div style="border:1px solid #e0ddd6;background:#fff;break-inside:avoid;overflow:hidden">
      <div style="position:relative">
        ${imgTag}
        <span style="position:absolute;top:8px;right:8px;background:#0c0c0c;color:#b8973a;font-size:0.55rem;font-weight:700;letter-spacing:1.5px;padding:3px 8px;text-transform:uppercase">${p.Categoria}</span>
        ${descuento > 0 ? `<span style="position:absolute;top:8px;left:8px;background:#c0392b;color:#fff;font-size:0.65rem;font-weight:700;padding:3px 8px">-${descuento}%</span>` : ''}
      </div>
      <div style="padding:10px 12px 12px">
        <div style="font-size:0.8rem;font-weight:700;font-family:Montserrat,sans-serif;color:#0c0c0c;line-height:1.3;margin-bottom:6px;min-height:2.4em">${nombre}</div>
        <div style="margin-bottom:8px">${chipsDisponibles(p)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;border-top:1px solid #eee;padding-top:8px">
          <div>${precioStr}</div>
          <span style="font-size:0.65rem;font-weight:600;color:${stockColor}">${stockTxt}</span>
        </div>
      </div>
    </div>`;
  }

  // Construir secciones
  const seccionesHTML = catOrden.map(cat => {
    const items = grupos[cat];
    // Pares de tarjetas (2 por fila)
    const filas = [];
    for (let i = 0; i < items.length; i += 2) {
      const a = cardPDF(items[i]);
      const b = items[i+1] ? cardPDF(items[i+1]) : '<div></div>';
      filas.push(`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          ${a}${b}
        </div>`);
    }
    return `
      <div style="page-break-before:always;padding:28px 32px 0">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;border-bottom:3px solid #0c0c0c;padding-bottom:8px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:600;letter-spacing:3px;text-transform:uppercase">${cat}</div>
          <div style="font-size:0.7rem;color:#888;letter-spacing:1px">${items.length} producto${items.length!==1?'s':''}</div>
        </div>
        ${filas.join("")}
      </div>`;
  }).join("");

  const fechaStr = new Date().toLocaleDateString('es-PE', {day:'2-digit', month:'long', year:'numeric'});

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Catálogo VITOP ${anio}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Montserrat',sans-serif; color:#0c0c0c; background:#fff; }
    @page { size:A4; margin:0; }
    @media print {
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
      .pdf-portada { page-break-after:always; }
    }
  </style>
</head>
<body>

<!-- PORTADA -->
<div class="pdf-portada" style="height:100vh;background:#0c0c0c;display:flex;flex-direction:column;justify-content:space-between;padding:0">

  <!-- Header portada -->
  <div style="padding:48px 48px 0">
    <div style="font-family:'Cormorant Garamond',serif;font-size:4rem;font-weight:600;letter-spacing:10px;color:#fff;line-height:1">
      VITOP
    </div>
    <div style="font-size:0.65rem;letter-spacing:4px;color:#666;margin-top:6px;text-transform:uppercase">
      ACG PERU S.A.C. &nbsp;·&nbsp; RUC 20615469123
    </div>
  </div>

  <!-- Centro portada -->
  <div style="padding:0 48px;text-align:center">
    <div style="font-size:0.6rem;letter-spacing:4px;color:#b8973a;text-transform:uppercase;margin-bottom:12px">Catálogo de Productos</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:5rem;font-weight:300;color:#fff;line-height:1;letter-spacing:2px">
      Colección
    </div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:5rem;font-weight:600;color:#b8973a;line-height:1;letter-spacing:2px">
      ${anio}
    </div>
    <div style="width:60px;height:2px;background:#b8973a;margin:24px auto"></div>
    <div style="font-size:0.7rem;color:#555;letter-spacing:2px;text-transform:uppercase">
      ${productosConStock.length} productos disponibles &nbsp;·&nbsp; Productos 100% Originales
    </div>
  </div>

  <!-- Footer portada -->
  <div style="background:#111;padding:24px 48px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:0.6rem;color:#b8973a;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Asesores de Venta</div>
      <div style="font-size:0.78rem;color:#fff;font-weight:500">📱 Asesor 1 &nbsp;&nbsp; +51 932 611 086</div>
      <div style="font-size:0.78rem;color:#fff;font-weight:500;margin-top:2px">📱 Asesor 2 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; +51 961 836 500</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:0.6rem;color:#b8973a;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Contacto</div>
      <div style="font-size:0.72rem;color:#aaa">acgperusac@gmail.com</div>
      <div style="font-size:0.72rem;color:#aaa;margin-top:2px">Quillabamba, Cusco — Perú</div>
      <div style="font-size:0.65rem;color:#555;margin-top:8px">Generado el ${fechaStr}</div>
    </div>
  </div>
</div>

<!-- PRODUCTOS POR CATEGORÍA -->
${seccionesHTML}

<!-- PIE DE PÁGINA FINAL -->
<div style="background:#0c0c0c;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;margin-top:32px">
  <div style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:600;letter-spacing:5px;color:#fff">
    VITOP
  </div>
  <div style="font-size:0.65rem;color:#555;letter-spacing:1px;text-align:center">
    © ${anio} VITOP STORE · ACG PERU S.A.C. · RUC 20615469123<br>
    Precios en Soles (S/) · Sujetos a disponibilidad · Envíos a todo el Perú
  </div>
  <div style="font-size:0.65rem;color:#b8973a;text-align:right">
    +51 932 611 086<br>+51 961 836 500
  </div>
</div>

<script>
  // Esperar fuentes e imágenes antes de imprimir
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 1200);
  });
<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Por favor permite las ventanas emergentes para generar el PDF.\n\nVe a Configuración del navegador → Privacidad → Ventanas emergentes → Permitir para este sitio.");
    if (btn) { btn.textContent = "📄 Catálogo PDF"; btn.disabled = false; }
    return;
  }
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    if (btn) { btn.textContent = "📄 Catálogo PDF"; btn.disabled = false; }
  }, 3000);
}
