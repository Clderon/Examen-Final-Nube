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
    showTab('dashboard');
    loadStats();
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
      showTab('dashboard');
      loadStats();
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
        description: document.getElementById('orderDescription').value || ''
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('¡Pedido creado exitosamente!');
      // Limpiar formulario
      document.getElementById('orderProduct').value = '';
      document.getElementById('orderDescription').value = '';
      document.getElementById('orderQuantity').value = '1';
      document.getElementById('orderPrice').value = '';
      // Recargar datos
      loadStats();
      if (document.getElementById('ordersTab').classList.contains('active')) {
        loadOrders();
      }
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
      ${order.status ? `<div style="margin-top: 15px;"><span class="order-status status-${order.status}">${translateStatus(order.status)}</span></div>` : ''}
      <div class="order-actions">
        <button onclick="viewOrderDetails(${order.id})" class="btn btn-secondary btn-sm">Ver Detalles</button>
        ${order.status === 'pending' ? `
          <button onclick="updateOrderStatus(${order.id}, 'processing')" class="btn btn-warning btn-sm">En Proceso</button>
          <button onclick="deleteOrder(${order.id})" class="btn btn-danger btn-sm">Eliminar</button>
        ` : ''}
        ${order.status === 'processing' ? `
          <button onclick="updateOrderStatus(${order.id}, 'completed')" class="btn btn-success btn-sm">Completar</button>
        ` : ''}
      </div>
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

// Navegación entre tabs
function showTab(tabName) {
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.nav-tab').forEach((btn, index) => {
    btn.classList.remove('active');
    // Activar el botón correspondiente al tab
    const tabNames = ['dashboard', 'orders', 'profile'];
    if (tabNames[index] === tabName) {
      btn.classList.add('active');
    }
  });

  // Mostrar tab seleccionado
  document.getElementById(`${tabName}Tab`).classList.add('active');

  // Cargar datos según el tab
  if (tabName === 'dashboard') {
    loadStats();
  } else if (tabName === 'orders') {
    loadOrders();
  } else if (tabName === 'profile') {
    loadProfile();
  }
}

// Cargar estadísticas
async function loadStats() {
  const statsContainer = document.getElementById('statsContainer');
  
  if (!authToken) return;

  try {
    statsContainer.innerHTML = '<p class="loading">Cargando estadísticas...</p>';

    const response = await fetch(`${ORDER_URL}/orders/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const stats = await response.json();
      displayStats(stats);
    } else {
      throw new Error('Error al cargar estadísticas');
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    statsContainer.innerHTML = '<p class="empty-state">No se pudieron cargar las estadísticas</p>';
  }
}

// Mostrar estadísticas
function displayStats(stats) {
  const statsContainer = document.getElementById('statsContainer');
  
  statsContainer.innerHTML = `
    <div class="stat-card">
      <h3>Total de Pedidos</h3>
      <div class="stat-value">${stats.total || 0}</div>
      <div class="stat-label">Pedidos en total</div>
    </div>
    <div class="stat-card success">
      <h3>Completados</h3>
      <div class="stat-value">${stats.byStatus?.completed || 0}</div>
      <div class="stat-label">Pedidos completados</div>
    </div>
    <div class="stat-card warning">
      <h3>Pendientes</h3>
      <div class="stat-value">${stats.byStatus?.pending || 0}</div>
      <div class="stat-label">Pedidos pendientes</div>
    </div>
    <div class="stat-card">
      <h3>Valor Total</h3>
      <div class="stat-value">$${parseFloat(stats.totalValue || 0).toFixed(2)}</div>
      <div class="stat-label">Valor de todos los pedidos</div>
    </div>
  `;
}

// Ver detalles de un pedido
async function viewOrderDetails(orderId) {
  try {
    const response = await fetch(`${ORDER_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const order = await response.json();
      showOrderModal(order);
    } else {
      showError('No se pudo cargar el pedido');
    }
  } catch (error) {
    console.error('Error al cargar detalles:', error);
    showError('Error al cargar los detalles del pedido');
  }
}

// Mostrar modal con detalles del pedido
function showOrderModal(order) {
  const modal = document.getElementById('orderModal');
  const modalBody = document.getElementById('orderModalBody');
  
  modalBody.innerHTML = `
    <div class="profile-info">
      <div class="profile-field">
        <div class="profile-field-label">ID del Pedido</div>
        <div class="profile-field-value">#${order.id}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Producto</div>
        <div class="profile-field-value">${order.product}</div>
      </div>
      ${order.description ? `
      <div class="profile-field">
        <div class="profile-field-label">Descripción</div>
        <div class="profile-field-value">${order.description}</div>
      </div>
      ` : ''}
      <div class="profile-field">
        <div class="profile-field-label">Cantidad</div>
        <div class="profile-field-value">${order.quantity}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Precio Unitario</div>
        <div class="profile-field-value">$${formatPrice(order.price)}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Total</div>
        <div class="profile-field-value">$${formatPrice(order.total)}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Estado</div>
        <div class="profile-field-value">
          <span class="order-status status-${order.status}">${translateStatus(order.status)}</span>
        </div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Fecha de Creación</div>
        <div class="profile-field-value">${formatDate(order.createdAt)}</div>
      </div>
      ${order.updatedAt ? `
      <div class="profile-field">
        <div class="profile-field-label">Última Actualización</div>
        <div class="profile-field-value">${formatDate(order.updatedAt)}</div>
      </div>
      ` : ''}
    </div>
  `;
  
  modal.classList.add('show');
}

// Cerrar modal
function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('show');
}

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
  const modal = document.getElementById('orderModal');
  if (event.target == modal) {
    closeOrderModal();
  }
}

// Actualizar estado de pedido
async function updateOrderStatus(orderId, newStatus) {
  if (!confirm(`¿Estás seguro de cambiar el estado del pedido a "${translateStatus(newStatus)}"?`)) {
    return;
  }

  try {
    showLoading('Actualizando estado del pedido...');

    const response = await fetch(`${ORDER_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('Estado del pedido actualizado');
      loadOrders();
      loadStats();
    } else {
      showError(data.message || 'Error al actualizar el estado');
    }
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    showError('Error al actualizar el estado del pedido');
  }
}

// Eliminar pedido
async function deleteOrder(orderId) {
  if (!confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    showLoading('Eliminando pedido...');

    const response = await fetch(`${ORDER_URL}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('Pedido eliminado exitosamente');
      loadOrders();
      loadStats();
    } else {
      showError(data.message || 'Error al eliminar el pedido');
    }
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    showError('Error al eliminar el pedido');
  }
}

// Cargar perfil de usuario
async function loadProfile() {
  const profileContainer = document.getElementById('profileContainer');
  
  if (!authToken) {
    profileContainer.innerHTML = '<p class="empty-state">Debes iniciar sesión</p>';
    return;
  }

  try {
    profileContainer.innerHTML = '<p class="loading">Cargando perfil...</p>';

    const response = await fetch(`${AUTH_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const profile = await response.json();
      displayProfile(profile);
    } else {
      throw new Error('Error al cargar perfil');
    }
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    profileContainer.innerHTML = '<p class="empty-state">No se pudo cargar el perfil</p>';
  }
}

// Mostrar perfil
function displayProfile(profile) {
  const profileContainer = document.getElementById('profileContainer');
  
  profileContainer.innerHTML = `
    <div class="profile-info">
      <div class="profile-field">
        <div class="profile-field-label">ID</div>
        <div class="profile-field-value">${profile.id}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Nombre</div>
        <div class="profile-field-value">${profile.name || 'N/A'}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Email</div>
        <div class="profile-field-value">${profile.email}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Rol</div>
        <div class="profile-field-value">
          <span class="order-status ${profile.role === 'admin' ? 'status-completed' : 'status-pending'}">
            ${profile.role === 'admin' ? 'Administrador' : 'Usuario'}
          </span>
        </div>
      </div>
      ${profile.createdAt ? `
      <div class="profile-field">
        <div class="profile-field-label">Fecha de Registro</div>
        <div class="profile-field-value">${formatDate(profile.createdAt)}</div>
      </div>
      ` : ''}
    </div>
  `;
}

// Traducir estado
function translateStatus(status) {
  const translations = {
    'pending': 'Pendiente',
    'processing': 'En Proceso',
    'completed': 'Completado',
    'cancelled': 'Cancelado'
  };
  return translations[status] || status;
}

