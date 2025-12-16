// Configuración de URLs - Detectar automáticamente el host
const HOST = window.location.hostname || 'localhost';
const AUTH_URL = `http://${HOST}:3000`;
const ORDER_URL = `http://${HOST}:3001`;

// Estado de la aplicación
let authToken = localStorage.getItem('authToken') || '';
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Verificar autenticación
function checkAuth() {
  if (authToken && currentUser) {
    showApp();
    loadOrders();
  } else {
    showAuth();
  }
}

// Mostrar sección de autenticación
function showAuth() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('appSection').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';
  showLogin();
}

// Mostrar aplicación principal
function showApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('appSection').style.display = 'block';
  document.getElementById('userInfo').style.display = 'flex';
  if (currentUser) {
    document.getElementById('userEmail').textContent = currentUser.email || 'Usuario';
  }
}

// Tabs de autenticación
function showLogin() {
  document.getElementById('loginForm').classList.add('active');
  document.getElementById('registerForm').classList.remove('active');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event?.target?.classList.add('active');
}

function showRegister() {
  document.getElementById('registerForm').classList.add('active');
  document.getElementById('loginForm').classList.remove('active');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event?.target?.classList.add('active');
}

// Manejar login
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    showLoading('Iniciando sesión...');
    
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      authToken = data.token;
      currentUser = { email, ...data.user };
      
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      showSuccess('¡Inicio de sesión exitoso!');
      showApp();
      loadOrders();
    } else {
      showError(data.message || 'Error al iniciar sesión');
    }
  } catch (error) {
    console.error('Error en login:', error);
    showError('No se pudo conectar con el servidor. Verifica que el servicio esté corriendo.');
  }
}

// Manejar registro
async function handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    showLoading('Registrando usuario...');
    
    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
      showLogin();
      // Llenar el formulario de login con el email registrado
      document.getElementById('loginEmail').value = email;
    } else {
      showError(data.message || 'Error al registrar usuario');
    }
  } catch (error) {
    console.error('Error en registro:', error);
    showError('No se pudo conectar con el servidor. Verifica que el servicio esté corriendo.');
  }
}

// Cerrar sesión
function logout() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  showAuth();
  showInfo('Sesión cerrada correctamente');
}

// Manejar creación de pedido
async function handleCreateOrder(event) {
  event.preventDefault();

  const product = document.getElementById('orderProduct').value;
  const quantity = parseInt(document.getElementById('orderQuantity').value);
  const price = parseFloat(document.getElementById('orderPrice').value);

  if (!authToken) {
    showError('Debes iniciar sesión para crear un pedido');
    return;
  }

  try {
    showLoading('Creando pedido...');

    const response = await fetch(`${ORDER_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        product,
        quantity,
        price,
        total: quantity * price
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('¡Pedido creado exitosamente!');
      // Limpiar formulario
      document.getElementById('orderProduct').value = '';
      document.getElementById('orderQuantity').value = '1';
      document.getElementById('orderPrice').value = '';
      // Recargar lista de pedidos
      loadOrders();
    } else {
      showError(data.message || 'Error al crear el pedido');
    }
  } catch (error) {
    console.error('Error al crear pedido:', error);
    showError('No se pudo conectar con el servidor de pedidos. Verifica que el servicio esté corriendo.');
  }
}

// Cargar lista de pedidos
async function loadOrders() {
  const ordersList = document.getElementById('ordersList');
  
  if (!authToken) {
    ordersList.innerHTML = '<p class="empty-state">Debes iniciar sesión para ver tus pedidos</p>';
    return;
  }

  try {
    ordersList.innerHTML = '<p class="loading">Cargando pedidos...</p>';

    const response = await fetch(`${ORDER_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const orders = await response.json();
      displayOrders(Array.isArray(orders) ? orders : []);
    } else if (response.status === 404) {
      // Endpoint no existe todavía, mostrar mensaje
      ordersList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <p>No hay pedidos aún. ¡Crea tu primer pedido!</p>
          <p style="font-size: 0.9rem; margin-top: 10px; color: var(--text-light);">
            Nota: El endpoint GET /orders aún no está implementado en el backend.
          </p>
        </div>
      `;
    } else {
      throw new Error('Error al cargar pedidos');
    }
  } catch (error) {
    console.error('Error al cargar pedidos:', error);
    ordersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>No se pudieron cargar los pedidos.</p>
        <p style="font-size: 0.9rem; margin-top: 10px; color: var(--text-light);">
          El endpoint GET /orders puede no estar implementado aún.
        </p>
      </div>
    `;
  }
}

// Mostrar pedidos en la lista
function displayOrders(orders) {
  const ordersList = document.getElementById('ordersList');

  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>No hay pedidos aún. ¡Crea tu primer pedido!</p>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = orders.map(order => `
    <div class="order-item">
      <div class="order-header">
        <span class="order-id">Pedido #${order.id || order._id || 'N/A'}</span>
        <span class="order-date">${formatDate(order.createdAt || order.date || new Date())}</span>
      </div>
      <div class="order-details">
        <div class="order-detail">
          <span class="order-detail-label">Producto</span>
          <span class="order-detail-value">${order.product || 'N/A'}</span>
        </div>
        <div class="order-detail">
          <span class="order-detail-label">Cantidad</span>
          <span class="order-detail-value">${order.quantity || 0}</span>
        </div>
        <div class="order-detail">
          <span class="order-detail-label">Precio Unitario</span>
          <span class="order-detail-value">$${formatPrice(order.price || 0)}</span>
        </div>
        <div class="order-detail">
          <span class="order-detail-label">Total</span>
          <span class="order-detail-value">$${formatPrice(order.total || order.price * order.quantity || 0)}</span>
        </div>
      </div>
      ${order.status ? `<div style="margin-top: 15px;"><span class="order-status status-${order.status}">${order.status}</span></div>` : ''}
    </div>
  `).join('');
}

// Utilidades
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatPrice(price) {
  return parseFloat(price).toFixed(2);
}

// Mensajes de estado
function showMessage(message, type = 'info') {
  const messageEl = document.getElementById('statusMessage');
  messageEl.textContent = message;
  messageEl.className = `status-message show ${type}`;
  
  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 4000);
}

function showSuccess(message) {
  showMessage(message, 'success');
}

function showError(message) {
  showMessage(message, 'error');
}

function showInfo(message) {
  showMessage(message, 'info');
}

function showLoading(message) {
  showMessage(message, 'info');
}

