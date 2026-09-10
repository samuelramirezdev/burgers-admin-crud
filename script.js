/* =========================================================
   BURGERS & CO. — PANEL DE ADMINISTRACIÓN (Lógica CRUD)
   1. Persistencia con localStorage
   2. Render de tabla + métricas
   3. Crear / Editar / Eliminar producto
   4. Búsqueda en tiempo real
   ========================================================= */

const STORAGE_KEY = "burgersco_menu";

/* ---------------------------------------------------------
   1. PERSISTENCIA (localStorage)
   --------------------------------------------------------- */

// Datos de ejemplo con los que arranca el panel la primera vez
// (solo se usan si todavía no hay nada guardado en localStorage).
const SEED_PRODUCTS = [
  { id: "p1", name: "Classic Cheese", category: "Hamburguesas", price: 18000, stock: 24 },
  { id: "p2", name: "Bacon Smash", category: "Hamburguesas", price: 22000, stock: 15 },
  { id: "p3", name: "BBQ Crispy Chicken", category: "Hamburguesas", price: 19500, stock: 18 },
  { id: "p4", name: "Papas Cheddar & Bacon", category: "Acompañamientos", price: 12000, stock: 30 },
  { id: "p5", name: "Aros de Cebolla", category: "Acompañamientos", price: 11000, stock: 20 },
  { id: "p6", name: "Gaseosa 400ml", category: "Bebidas", price: 5000, stock: 40 },
];

// Lee el menú guardado en localStorage; si no existe, lo crea con SEED_PRODUCTS
function loadProducts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveProducts(SEED_PRODUCTS);
    return [...SEED_PRODUCTS];
  }
  try {
    return JSON.parse(raw);
  } catch {
    // Si el dato guardado está corrupto, se reinicia con los datos de ejemplo
    saveProducts(SEED_PRODUCTS);
    return [...SEED_PRODUCTS];
  }
}

// Guarda el arreglo completo de productos en localStorage
function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// Estado en memoria: el arreglo de objetos que representa el menú
let products = loadProducts();

// Guarda si el formulario está en modo edición (null = modo "agregar")
let editingId = null;

/* ---------------------------------------------------------
   Referencias al DOM
   --------------------------------------------------------- */
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const nameInput = document.getElementById("productName");
const categoryInput = document.getElementById("productCategory");
const priceInput = document.getElementById("productPrice");
const stockInput = document.getElementById("productStock");

const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const tableBody = document.getElementById("productTableBody");
const tableEmpty = document.getElementById("tableEmpty");
const searchInput = document.getElementById("searchInput");

const metricTotalProducts = document.getElementById("metricTotalProducts");
const metricInventoryValue = document.getElementById("metricInventoryValue");
const metricTotalStock = document.getElementById("metricTotalStock");

function formatCOP(value) {
  return "$" + Number(value).toLocaleString("es-CO");
}

/* ---------------------------------------------------------
   2. RENDER: TABLA Y MÉTRICAS
   --------------------------------------------------------- */

// Dibuja la tabla de productos, aplicando el filtro de búsqueda si existe
function renderTable(filterText = "") {
  const term = filterText.trim().toLowerCase();

  const visibleProducts = products.filter((p) =>
    p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
  );

  tableEmpty.hidden = visibleProducts.length > 0;

  tableBody.innerHTML = visibleProducts
    .map((p) => {
      const lowStock = p.stock <= 5; // umbral simple para resaltar stock bajo
      return `
        <tr>
          <td class="product-name-cell">${p.name}</td>
          <td><span class="category-pill" data-cat="${p.category}">${p.category}</span></td>
          <td>${formatCOP(p.price)}</td>
          <td><span class="stock-value ${lowStock ? "is-low" : ""}">${p.stock}</span></td>
          <td>
            <div class="row-actions">
              <button class="action-btn edit" data-action="edit" data-id="${p.id}">Editar</button>
              <button class="action-btn delete" data-action="delete" data-id="${p.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Recalcula y muestra el panel de métricas a partir del arreglo completo
function renderMetrics() {
  const totalProducts = products.length;
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  metricTotalProducts.textContent = totalProducts;
  metricInventoryValue.textContent = formatCOP(inventoryValue);
  metricTotalStock.textContent = totalStock;
}

// Vuelve a dibujar todo (tabla + métricas), respetando el texto de búsqueda actual
function refreshUI() {
  renderTable(searchInput.value);
  renderMetrics();
}

/* ---------------------------------------------------------
   3. CREAR / EDITAR / ELIMINAR
   --------------------------------------------------------- */

// Genera un id simple y único para un producto nuevo
function generateId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Cambia el formulario a modo "agregar" (estado por defecto)
function resetForm() {
  editingId = null;
  productForm.reset();
  productIdInput.value = "";
  formTitle.textContent = "Agregar producto";
  submitBtn.textContent = "Agregar producto";
  cancelEditBtn.hidden = true;
}

// Carga los datos de un producto existente en el formulario para editarlo
function loadProductIntoForm(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  editingId = id;
  productIdInput.value = product.id;
  nameInput.value = product.name;
  categoryInput.value = product.category;
  priceInput.value = product.price;
  stockInput.value = product.stock;

  formTitle.textContent = "Editar producto";
  submitBtn.textContent = "Guardar cambios";
  cancelEditBtn.hidden = false;

  nameInput.focus();
}

// Elimina un producto del arreglo (con confirmación) y actualiza todo
function deleteProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const confirmed = confirm(`¿Eliminar "${product.name}" del menú?`);
  if (!confirmed) return;

  products = products.filter((p) => p.id !== id);
  saveProducts(products);

  // Si se elimina el producto que se estaba editando, se vuelve al modo "agregar"
  if (editingId === id) resetForm();

  refreshUI();
}

// Envío del formulario: crea un producto nuevo o actualiza uno existente
productForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const productData = {
    name: nameInput.value.trim(),
    category: categoryInput.value,
    price: Number(priceInput.value),
    stock: Number(stockInput.value),
  };

  if (!productData.name || productData.price < 0 || productData.stock < 0) return;

  if (editingId) {
    // Modo edición: reemplaza el producto existente manteniendo su id
    products = products.map((p) =>
      p.id === editingId ? { id: editingId, ...productData } : p
    );
  } else {
    // Modo creación: agrega un producto nuevo con id generado
    products.push({ id: generateId(), ...productData });
  }

  saveProducts(products);
  resetForm();
  refreshUI();
});

cancelEditBtn.addEventListener("click", resetForm);

// Delegación de eventos: un solo listener para todos los botones Editar/Eliminar
// de la tabla, sin importar cuántas veces se vuelva a dibujar.
tableBody.addEventListener("click", (event) => {
  const btn = event.target.closest(".action-btn");
  if (!btn) return;

  const { action, id } = btn.dataset;
  if (action === "edit") loadProductIntoForm(id);
  if (action === "delete") deleteProduct(id);
});

/* ---------------------------------------------------------
   4. BÚSQUEDA EN TIEMPO REAL
   --------------------------------------------------------- */
searchInput.addEventListener("input", () => {
  renderTable(searchInput.value);
});

/* ---------------------------------------------------------
   INICIALIZACIÓN
   --------------------------------------------------------- */
refreshUI();