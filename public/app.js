(function () {
  // State
  let currentUser = localStorage.getItem('mckollefacelan-user');
  const quantities = { toast: 0, soda: 0, water: 0 };
  const itemEmojis = { toast: '\u{1F35E}', soda: '\u{1F964}', water: '\u{1F4A7}' };

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
      renderOrders(container, orders, true);
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
        var emoji = itemEmojis[item.name] || '';
        return '<span class="order-item">' + emoji + ' ' + capitalize(item.name) + ' x' + item.quantity + '</span>';
      }).join('');

      var nameHtml = showName
        ? '<span class="order-name">' + escapeHtml(order.name) + '</span>'
        : '<span></span>';

      return '<div class="order-card">' +
        '<div class="order-header">' +
          nameHtml +
          '<span class="order-time">' + formatTime(order.timestamp) + '</span>' +
        '</div>' +
        '<div class="order-items">' + itemsHtml + '</div>' +
      '</div>';
    }).join('');
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
