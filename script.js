// ══════════════════════════════
//   VITOP STORE — script.js
//   Conectado a Google Sheets
// ══════════════════════════════
 
const WA_NUMBER = "51961836500";
 
const SHEET_URL = "https://corsproxy.io/?" + encodeURIComponent(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTs97ABaxAcqTiWE-FimeAb96n9asWvXlo9H-QvUKXNtvq-I-H9JoqMZ3RHXAfokC09JaykIUXvGvoT/pub?gid=1777311677&single=true&output=csv"
);
 
const EMOJI_CAT = {
  "Zapatilla Hombre":    "👟",
  "Zapatilla Mujer":     "👠",
  "ZAPATO BOTIN HOMBRE": "🥾",
  "Polo Hombre":         "👕",
  "Polo Mujer":          "👚",
  "Medias":              "🧦",
  "UNISEX":              "👟",
};
 
function emoji(cat) {
  return EMOJI_CAT[cat] || "🛍️";
}
 
function limpiarNombre(nombre) {
  return nombre
    .replace(/^SKU:\s*[\w-]+\s*/i, "")
    .replace(/^\d{6}\s*[-–]\s*[\w]+\s*/i, "")
    .replace(/^\d{6}\s*[-–]\s*/i, "")
    .replace(/^[\d\s\-–]+/, "")
    .trim();
}
 
function mensajeWA(nombre, precio, tallas) {
  return encodeURIComponent(
    `Hola Vitop Store! 🛍️\nQuiero pedir:\n*${nombre}*\n💰 Precio: S/ ${precio}\n📐 Tallas: ${tallas}\n¿Hay stock?`
  );
}
 
function convertirDriveURL(url) {
  if (!url) return "";
  const m1 = url.match(/id=([\w-]+)/);
  if (m1) return `https://drive.google.com/thumbnail?id=${m1[1]}&sz=w800`;
  const m2 = url.match(/\/d\/([\w-]+)\//);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w800`;
  return url;
}
 
// ── Parsear CSV ──────────────────────────────────────────
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
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").replace(/"/g, "").trim();
    });
    return obj;
  }).filter(p => p.Handle && p.Nombre);
}
 
// ── MAIN ─────────────────────────────────────────────────
fetch(SHEET_URL)
  .then(res => res.text())
  .then(csv => {
    const productos = parsearCSV(csv);
    iniciarApp(productos);
  })
  .catch(err => {
    console.error("Error cargando Sheets, usando JSON local:", err);
    fetch("productos_vitop.json")
      .then(r => r.json())
      .then(data => {
        const convertidos = data.map(p => ({
          Handle:    p.handle,
          Nombre:    p.nombre,
          Categoria: p.categoria,
          Precio:    p.precio,
          Coste:     p.coste,
          Tallas:    (p.tallas || []).join(", "),
          Stock:     p.stock_total,
          Imagen1:   "",
          Imagen2:   "",
          Imagen3:   "",
          Imagen4:   "",
        }));
        iniciarApp(convertidos);
      });
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
 
  // Filtros dinámicos
  const cats = [...new Set(productos.map(p => p.Categoria))].filter(Boolean).sort();
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className   = "filtro-btn";
    btn.dataset.cat = cat;
    btn.textContent = `${emoji(cat)} ${cat}`;
    filtrosDiv.appendChild(btn);
  });
 
  filtrosDiv.addEventListener("click", e => {
    if (!e.target.classList.contains("filtro-btn")) return;
    document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
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
 
  function renderizar() {
    let lista = productos;
 
    if (categoriaActiva !== "todos") {
      lista = lista.filter(p => p.Categoria === categoriaActiva);
    }
    if (textoBusqueda) {
      lista = lista.filter(p =>
        p.Nombre.toLowerCase().includes(textoBusqueda) ||
        (p.Categoria || "").toLowerCase().includes(textoBusqueda)
      );
    }
    if (soloConStock) {
      lista = lista.filter(p => parseInt(p.Stock) > 0);
    }
 
    contador.textContent = `${lista.length} producto${lista.length !== 1 ? "s" : ""} encontrado${lista.length !== 1 ? "s" : ""}`;
 
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
    const descuento   = parseInt(p.Descuento) || 0;
    const precioFinal = descuento > 0 ? Math.round(precio * (1 - descuento/100) * 10) / 10 : precio;
    const stock       = parseInt(p.Stock) || 0;
    const tallas      = p.Tallas || "";
    const hayStock    = stock > 0;
    const em          = emoji(p.Categoria);
 
    // Imagen principal: usa Imagen1 primero, luego Imagen como fallback
    const imgRaw  = p["Imagen1"] || p["Imagen"] || "";
    const imgUrl  = convertirDriveURL(imgRaw);
 
    const imgHTML = imgUrl
      ? `<img src="${imgUrl}" alt="${nombre}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : "";
    const emojiHTML = `<div style="font-size:5rem;display:${imgUrl ? "none" : "flex"};align-items:center;justify-content:center;height:100%;width:100%">${em}</div>`;
 
    const badge = !hayStock
      ? `<span class="badge badge-agotado">Agotado</span>`
      : stock <= 2
        ? `<span class="badge badge-stock">⚡ Últimas</span>`
        : `<span class="badge badge-stock">✓ Stock</span>`;
 
    const stockLabel = !hayStock
      ? `<span class="stock-out">Sin stock</span>`
      : stock <= 2
        ? `<span class="stock-low">⚡ Solo ${stock} disponible${stock > 1 ? "s" : ""}</span>`
        : `<span class="stock-ok">✓ ${stock} en stock</span>`;
 
    const tallasHTML = tallas.split(",").map(t =>
      `<span class="talla-chip">${t.trim()}</span>`
    ).join("");
 
    // Botón WhatsApp rápido (sin abrir detalle)
    const btnWA = hayStock
      ? `<a href="https://wa.me/${WA_NUMBER}?text=${mensajeWA(nombre, precio, tallas)}"
            target="_blank" class="btn-whatsapp" onclick="event.stopPropagation()">💬 Pedir</a>`
      : `<span class="btn-whatsapp agotado">😔 Agotado</span>`;
 
    // La tarjeta completa lleva a la página de detalle
    return `
      <div class="producto" onclick="window.location.href='producto.html?h=${encodeURIComponent(p.Handle)}'" style="cursor:pointer">
        <div class="producto-img" style="position:relative;">
          ${badge}
          ${imgHTML}
          ${emojiHTML}
        </div>
        <div class="producto-body">
          <div class="producto-cat">${p.Categoria}</div>
          <div class="producto-nombre">${nombre}</div>
          <div class="producto-tallas">${tallasHTML}</div>
          <div class="producto-stock">${stockLabel}</div>
          <div class="producto-footer">
${descuento > 0
              ? `<div class="producto-precio">
                  <span class="precio-oferta">S/ ${precioFinal}</span>
                  <span class="precio-original">S/ ${precio}</span>
                  <span class="badge-descuento">-${descuento}%</span>
                 </div>`
              : `<div class="producto-precio">S/ ${precio} <small>/ und</small></div>`
            }
            ${btnWA}
          </div>
        </div>
      </div>`;
  }
 
  renderizar();
}