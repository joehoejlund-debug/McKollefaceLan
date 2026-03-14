(function () {
  // State
  let currentUser = localStorage.getItem('mckollefacelan-user');
  const quantities = { toast: 0, cola: 0, fanta: 0 };
  const itemIcons = {
    toast: '\u{1F35E}',
    cola: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#d32f2f"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34" text-anchor="middle" font-size="9" font-weight="bold" font-family="Georgia,serif" fill="#d32f2f" font-style="italic">CC</text></svg>',
    fanta: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#f57c00"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial,sans-serif" fill="#f57c00">F</text></svg>'
  };

  // DOM elements
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginForm = document.getElementById('login-form');
  const nameInput = document.getElementById('name-input');
  const userNameDisplay = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const notification = document.getElementById('notification');

  // Initialize
  function init() {
    if (currentUser) {
      showApp();
    } else {
      showLogin();
    }
    setupEventListeners();
  }

  function setupEventListeners() {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      if (name) {
        currentUser = name;
        localStorage.setItem('mckollefacelan-user', name);
        showApp();
      }
    });

    logoutBtn.addEventListener('click', function () {
      currentUser = null;
      localStorage.removeItem('mckollefacelan-user');
      showLogin();
    });

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.tab);
      });
    });

    document.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.menu-card');
        var item = card.dataset.item;
        var action = btn.dataset.action;

        if (action === 'increase') {
          quantities[item]++;
        } else if (action === 'decrease' && quantities[item] > 0) {
          quantities[item]--;
        }

        updateQuantityDisplay(card, item);
        updateOrderButton();
      });
    });

    placeOrderBtn.addEventListener('click', placeOrder);
  }

  function showLogin() {
    loginScreen.hidden = false;
    appScreen.hidden = true;
    nameInput.value = '';
    nameInput.focus();
  }

  function showApp() {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    userNameDisplay.textContent = currentUser;
    // Only show "All Orders" tab for Kitchen user
    var allOrdersBtn = document.querySelector('.nav-btn[data-tab="all-orders"]');
    if (allOrdersBtn) {
      allOrdersBtn.style.display = (currentUser === 'Kitchen') ? '' : 'none';
    }
    resetQuantities();
    switchTab('shop');
  }

  function switchTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(function (el) {
      el.hidden = true;
    });
    document.getElementById('tab-' + tab).hidden = false;

    if (tab === 'my-orders') loadMyOrders();
    if (tab === 'all-orders') loadAllOrders();
  }

  function updateQuantityDisplay(card, item) {
    card.querySelector('.qty-value').textContent = quantities[item];
    card.classList.toggle('selected', quantities[item] > 0);
  }

  function updateOrderButton() {
    var total = Object.values(quantities).reduce(function (sum, q) { return sum + q; }, 0);
    placeOrderBtn.disabled = total === 0;
    if (total > 0) {
      placeOrderBtn.textContent = 'Place Order (' + total + ' item' + (total !== 1 ? 's' : '') + ')';
    } else {
      placeOrderBtn.textContent = 'Place Order';
    }
  }

  function resetQuantities() {
    Object.keys(quantities).forEach(function (key) { quantities[key] = 0; });
    document.querySelectorAll('.menu-card').forEach(function (card) {
      card.querySelector('.qty-value').textContent = '0';
      card.classList.remove('selected');
    });
    updateOrderButton();
  }

  async function placeOrder() {
    var items = Object.entries(quantities)
      .filter(function (entry) { return entry[1] > 0; })
      .map(function (entry) { return { name: entry[0], quantity: entry[1] }; });

    if (items.length === 0) return;

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing order...';

    try {
      var res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentUser, items: items }),
      });

      if (!res.ok) throw new Error('Failed to place order');

      showNotification('Order placed successfully!', 'success');
      resetQuantities();
    } catch (err) {
      showNotification('Failed to place order. Try again!', 'error');
      updateOrderButton();
    }
  }

  async function loadMyOrders() {
    var container = document.getElementById('my-orders-list');
    container.innerHTML = '<p class="loading">Loading orders...</p>';

    try {
      var res = await fetch('/api/orders?name=' + encodeURIComponent(currentUser));
      var orders = await res.json();
      renderOrders(container, orders, false);
    } catch (err) {
      container.innerHTML = '<p class="empty-message">Failed to load orders</p>';
    }
  }

  async function loadAllOrders() {
    var container = document.getElementById('all-orders-list');
    container.innerHTML = '<p class="loading">Loading orders...</p>';

    try {
      var res = await fetch('/api/orders');
      var orders = await res.json();
      // Filter out orders marked as done
      var activeOrders = orders.filter(function (o) { return !o.done; });
      renderOrders(container, activeOrders, true);
    } catch (err) {
      container.innerHTML = '<p class="empty-message">Failed to load orders</p>';
    }
  }

  function renderOrders(container, orders, showName) {
    if (!orders || orders.length === 0) {
      container.innerHTML = '<p class="empty-message">No orders yet</p>';
      return;
    }

    container.innerHTML = orders.map(function (order) {
      var itemsHtml = order.items.map(function (item) {
        var icon = itemIcons[item.name] || '';
        return '<span class="order-item">' + icon + ' ' + capitalize(item.name) + ' x' + item.quantity + '</span>';
      }).join('');

      var nameHtml = showName
        ? '<span class="order-name">' + escapeHtml(order.name) + '</span>'
        : '<span></span>';

      var doneClass = order.done ? ' order-done' : '';
      var doneBadge = order.done ? '<span class="done-badge">Served</span>' : '';

      var actionsHtml = '';
      if (showName) {
        // All Orders page - done button
        actionsHtml = '<button class="done-order-btn" data-id="' + escapeHtml(order.id) + '" title="Mark as done">&#10003; Done</button>';
      } else {
        // My Orders page - edit button (only if not done)
        actionsHtml = order.done ? '' : '<button class="edit-order-btn" data-id="' + escapeHtml(order.id) + '" title="Edit order">&#9998;</button>';
      }

      return '<div class="order-card' + doneClass + '">' +
        '<div class="order-header">' +
          nameHtml +
          doneBadge +
          '<span class="order-time">' + formatTime(order.timestamp) + '</span>' +
          actionsHtml +
        '</div>' +
        '<div class="order-items">' + itemsHtml + '</div>' +
      '</div>';
    }).join('');

    // Attach done handlers
    container.querySelectorAll('.done-order-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        markOrderDone(btn.dataset.id);
      });
    });

    // Attach edit handlers
    container.querySelectorAll('.edit-order-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var order = orders.find(function (o) { return o.id === btn.dataset.id; });
        if (order) openEditModal(order);
      });
    });
  }

  async function markOrderDone(orderId) {
    try {
      var res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId }),
      });
      if (!res.ok) throw new Error('Failed to mark as done');
      showNotification('Order marked as done', 'success');
      loadAllOrders();
    } catch (err) {
      showNotification('Failed to mark order as done', 'error');
    }
  }

  function openEditModal(order) {
    // Remove existing modal if any
    var existing = document.getElementById('edit-modal');
    if (existing) existing.remove();

    var validItems = ['toast', 'cola', 'fanta'];
    var editQty = {};
    validItems.forEach(function (name) { editQty[name] = 0; });
    order.items.forEach(function (item) { editQty[item.name] = item.quantity; });

    var modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal-content">' +
        '<h2>Edit Order</h2>' +
        validItems.map(function (name) {
          var icon = itemIcons[name] || '';
          return '<div class="edit-row" data-item="' + name + '">' +
            '<span>' + icon + ' ' + capitalize(name) + '</span>' +
            '<div class="quantity-control">' +
              '<button class="qty-btn edit-qty-btn" data-action="decrease">&minus;</button>' +
              '<span class="qty-value">' + editQty[name] + '</span>' +
              '<button class="qty-btn edit-qty-btn" data-action="increase">+</button>' +
            '</div>' +
          '</div>';
        }).join('') +
        '<div class="modal-buttons">' +
          '<button class="primary-btn" id="save-edit-btn">Save</button>' +
          '<button class="secondary-btn" id="cancel-edit-btn">Cancel</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelectorAll('.edit-qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.edit-row');
        var item = row.dataset.item;
        var display = row.querySelector('.qty-value');
        if (btn.dataset.action === 'increase') {
          editQty[item]++;
        } else if (editQty[item] > 0) {
          editQty[item]--;
        }
        display.textContent = editQty[item];
      });
    });

    document.getElementById('save-edit-btn').addEventListener('click', function () {
      saveEditOrder(order.id, editQty, modal);
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', function () {
      modal.remove();
    });
  }

  async function saveEditOrder(orderId, editQty, modal) {
    var items = Object.entries(editQty)
      .filter(function (e) { return e[1] > 0; })
      .map(function (e) { return { name: e[0], quantity: e[1] }; });

    if (items.length === 0) {
      showNotification('Order must have at least one item', 'error');
      return;
    }

    try {
      var res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, items: items }),
      });
      if (!res.ok) throw new Error('Failed to update');
      modal.remove();
      showNotification('Order updated', 'success');
      loadMyOrders();
    } catch (err) {
      showNotification('Failed to update order', 'error');
    }
  }

  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = 'notification ' + type;
    notification.hidden = false;
    setTimeout(function () { notification.hidden = true; }, 3000);
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
