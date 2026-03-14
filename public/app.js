(function () {
  // State
  let currentUser = localStorage.getItem('mckollefacelan-user');
  const quantities = { toast: 0, cola: 0, fanta: 0, xray: 0 };
  const itemIcons = {
    toast: '\u{1F35E}',
    cola: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#d32f2f"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34" text-anchor="middle" font-size="9" font-weight="bold" font-family="Georgia,serif" fill="#d32f2f" font-style="italic">CC</text></svg>',
    fanta: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#f57c00"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial,sans-serif" fill="#f57c00">F</text></svg>',
    xray: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#0288d1"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="9" font-weight="bold" font-family="Arial,sans-serif" fill="#0288d1">X-Ray</text></svg>'
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
      chatWidget.hidden = true;
      if (chatPollTimer) clearInterval(chatPollTimer);
      chatOpen = false;
      chatPanel.hidden = true;
      showLogin();
    });

    document.querySelectorAll('.nav-btn[data-tab]').forEach(function (btn) {
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
    // Only show "All Orders" tab and Kitchen link for Kitchen user
    var allOrdersBtn = document.querySelector('.nav-btn[data-tab="all-orders"]');
    if (allOrdersBtn) {
      allOrdersBtn.style.display = (currentUser === 'Kitchen') ? '' : 'none';
    }
    var kitchenLink = document.getElementById('kitchen-link');
    if (kitchenLink) {
      kitchenLink.style.display = (currentUser === 'Kitchen') ? '' : 'none';
    }
    resetQuantities();
    switchTab('shop');
    setupChat();
  }

  function switchTab(tab) {
    document.querySelectorAll('.nav-btn[data-tab]').forEach(function (btn) {
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
    // Show/hide toast toppings
    if (item === 'toast') {
      var toppingsDiv = card.querySelector('.toast-toppings');
      if (toppingsDiv) {
        toppingsDiv.hidden = quantities[item] === 0;
      }
    }
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
    // Reset toast toppings
    var toppingsDiv = document.querySelector('.toast-toppings');
    if (toppingsDiv) {
      toppingsDiv.hidden = true;
      toppingsDiv.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    }
    updateOrderButton();
  }

  function getSelectedToppings() {
    var toppings = [];
    document.querySelectorAll('.toast-toppings input[type="checkbox"]:checked').forEach(function (cb) {
      toppings.push(cb.value);
    });
    return toppings;
  }

  async function placeOrder() {
    var items = Object.entries(quantities)
      .filter(function (entry) { return entry[1] > 0; })
      .map(function (entry) {
        var item = { name: entry[0], quantity: entry[1] };
        if (entry[0] === 'toast') {
          var toppings = getSelectedToppings();
          if (toppings.length > 0) item.toppings = toppings;
        }
        return item;
      });

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
        var toppingsHtml = '';
        if (item.toppings && item.toppings.length > 0) {
          toppingsHtml = '<div class="order-toppings">' + item.toppings.map(function (t) {
            return '<span class="topping-tag">' + escapeHtml(t) + '</span>';
          }).join('') + '</div>';
        }
        return '<span class="order-item">' + icon + ' ' + capitalize(item.name) + ' x' + item.quantity + toppingsHtml + '</span>';
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

  var allToppings = ['Veggie pålæg', 'Hamburgerryg', 'Ketchup', 'Sennep', 'Mayo', 'Remoulade', 'Oregano', 'Ost', 'Cornichonner'];

  function openEditModal(order) {
    // Remove existing modal if any
    var existing = document.getElementById('edit-modal');
    if (existing) existing.remove();

    var validItems = ['toast', 'cola', 'fanta', 'xray'];
    var editQty = {};
    var editToppings = [];
    validItems.forEach(function (name) { editQty[name] = 0; });
    order.items.forEach(function (item) {
      editQty[item.name] = item.quantity;
      if (item.name === 'toast' && item.toppings) {
        editToppings = item.toppings.slice();
      }
    });

    var modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal-content">' +
        '<h2>Edit Order</h2>' +
        validItems.map(function (name) {
          var icon = itemIcons[name] || '';
          var toppingsHtml = '';
          if (name === 'toast') {
            toppingsHtml = '<div class="edit-toppings" style="' + (editQty.toast > 0 ? '' : 'display:none;') + 'padding:0.5rem 0;">' +
              allToppings.map(function (t) {
                var checked = editToppings.indexOf(t) >= 0 ? ' checked' : '';
                return '<label class="topping-option"><input type="checkbox" value="' + escapeHtml(t) + '"' + checked + '> ' + escapeHtml(t) + '</label>';
              }).join('') +
            '</div>';
          }
          return '<div class="edit-row" data-item="' + name + '">' +
            '<span>' + icon + ' ' + capitalize(name) + '</span>' +
            '<div class="quantity-control">' +
              '<button class="qty-btn edit-qty-btn" data-action="decrease">&minus;</button>' +
              '<span class="qty-value">' + editQty[name] + '</span>' +
              '<button class="qty-btn edit-qty-btn" data-action="increase">+</button>' +
            '</div>' +
          '</div>' + toppingsHtml;
        }).join('') +
        '<div class="modal-buttons">' +
          '<button class="primary-btn" id="save-edit-btn">Save</button>' +
          '<button class="secondary-btn" id="cancel-edit-btn">Cancel</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var editToppingsDiv = modal.querySelector('.edit-toppings');

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
        // Show/hide toppings for toast
        if (item === 'toast' && editToppingsDiv) {
          editToppingsDiv.style.display = editQty.toast > 0 ? '' : 'none';
        }
      });
    });

    document.getElementById('save-edit-btn').addEventListener('click', function () {
      // Collect toppings from edit modal
      var toppings = [];
      if (editToppingsDiv) {
        editToppingsDiv.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
          toppings.push(cb.value);
        });
      }
      saveEditOrder(order.id, editQty, toppings, modal);
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', function () {
      modal.remove();
    });
  }

  async function saveEditOrder(orderId, editQty, toppings, modal) {
    var items = Object.entries(editQty)
      .filter(function (e) { return e[1] > 0; })
      .map(function (e) {
        var item = { name: e[0], quantity: e[1] };
        if (e[0] === 'toast' && toppings && toppings.length > 0) {
          item.toppings = toppings;
        }
        return item;
      });

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
    if (str === 'xray') return 'X-Ray';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Kitchen Chat =====
  var chatWidget = document.getElementById('chat-widget');
  var chatToggle = document.getElementById('chat-toggle');
  var chatPanel = document.getElementById('chat-panel');
  var chatClose = document.getElementById('chat-close');
  var chatMessages = document.getElementById('chat-messages');
  var chatInput = document.getElementById('chat-input');
  var chatSendBtn = document.getElementById('chat-send');
  var chatUnread = document.getElementById('chat-unread');
  var chatOpen = false;
  var chatPollTimer = null;
  var lastSeenCount = 0;
  var chatSetupDone = false;

  function setupChat() {
    // Don't show chat widget for Kitchen user
    if (currentUser === 'Kitchen') {
      chatWidget.hidden = true;
      return;
    }
    chatWidget.hidden = false;
    lastSeenCount = 0;

    if (chatSetupDone) {
      loadChatMessages();
      return;
    }
    chatSetupDone = true;

    chatToggle.addEventListener('click', function () {
      chatOpen = !chatOpen;
      chatPanel.hidden = !chatOpen;
      if (chatOpen) {
        loadChatMessages();
        chatUnread.hidden = true;
        chatInput.focus();
      }
    });

    chatClose.addEventListener('click', function () {
      chatOpen = false;
      chatPanel.hidden = true;
    });

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendChatMessage();
    });

    // Poll for new messages
    chatPollTimer = setInterval(function () {
      loadChatMessages();
    }, 4000);

    loadChatMessages();
  }

  async function loadChatMessages() {
    try {
      var res = await fetch('/api/chat?type=dm&user=' + encodeURIComponent(currentUser));
      var messages = await res.json();
      renderChatMessages(messages);

      // Unread badge when panel closed
      if (!chatOpen && messages.length > lastSeenCount) {
        var newCount = messages.length - lastSeenCount;
        chatUnread.textContent = newCount > 9 ? '9+' : newCount;
        chatUnread.hidden = false;
      }
      if (chatOpen) {
        lastSeenCount = messages.length;
        chatUnread.hidden = true;
      }
    } catch (err) {
      // silent fail on poll
    }
  }

  function renderChatMessages(messages) {
    if (!messages || messages.length === 0) {
      chatMessages.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem;font-size:0.85rem;">No messages yet. Say hi to the kitchen!</p>';
      return;
    }

    var wasAtBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 20;

    chatMessages.innerHTML = messages.map(function (msg) {
      var isSent = msg.from === currentUser;
      var cls = isSent ? 'sent' : 'received';
      var time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<div class="chat-msg ' + cls + '">' +
        '<div>' + escapeHtml(msg.message) + '</div>' +
        '<div class="chat-msg-meta">' + time + '</div>' +
      '</div>';
    }).join('');

    if (wasAtBottom || chatOpen) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  async function sendChatMessage() {
    var text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatSendBtn.disabled = true;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dm',
          from: currentUser,
          to: 'Kitchen',
          message: text,
        }),
      });
      await loadChatMessages();
    } catch (err) {
      showNotification('Failed to send message', 'error');
    }

    chatSendBtn.disabled = false;
    chatInput.focus();
  }

  init();
})();
