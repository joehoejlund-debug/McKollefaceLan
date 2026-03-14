(function () {
  var itemIcons = {
    toast: '\u{1F35E}',
    cola: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#d32f2f"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34" text-anchor="middle" font-size="9" font-weight="bold" font-family="Georgia,serif" fill="#d32f2f" font-style="italic">CC</text></svg>',
    colazero: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#111"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34" text-anchor="middle" font-size="7" font-weight="bold" font-family="Georgia,serif" fill="#111" font-style="italic">Zero</text></svg>',
    tuborgsport: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#0288d1"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="7" font-weight="bold" font-family="Arial,sans-serif" fill="#0288d1">Sport</text></svg>',
    tuborgsquash: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#f57c00"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="7" font-weight="bold" font-family="Arial,sans-serif" fill="#f57c00">Squash</text></svg>',
    fanta: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#f57c00"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial,sans-serif" fill="#f57c00">F</text></svg>',
    xray: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#0288d1"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="9" font-weight="bold" font-family="Arial,sans-serif" fill="#0288d1">X-Ray</text></svg>'
  };
  var container = document.getElementById('orders-container');
  var orderCountEl = document.getElementById('order-count');
  var orderCountBadge = document.getElementById('order-count-badge');
  var msgCountBadge = document.getElementById('msg-count-badge');
  var POLL_INTERVAL = 5000;

  function capitalize(str) {
    if (str === 'xray') return 'X-Ray';
    if (str === 'colazero') return 'Cola Zero';
    if (str === 'tuborgsport') return 'Tuborg Sport';
    if (str === 'tuborgsquash') return 'Tuborg Squash';
    if (str === 'fanta') return 'Tuborg Squash'; // legacy alias for existing orders
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(timestamp) {
    var diff = Date.now() - new Date(timestamp).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    return mins + ' min ago';
  }

  // ===== Tab Navigation =====
  var currentTab = 'orders';
  document.querySelectorAll('.kitchen-nav .nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.kitchen-nav .nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.tab === currentTab);
      });
      document.getElementById('tab-orders').hidden = currentTab !== 'orders';
      document.getElementById('tab-messages').hidden = currentTab !== 'messages';
      if (currentTab === 'messages') {
        loadConversations();
        msgCountBadge.hidden = true;
      }
    });
  });

  // ===== Orders =====
  function renderOrders(orders) {
    // Filter out finished orders
    orders = orders.filter(function (o) { return !o.done; });

    if (!orders || orders.length === 0) {
      container.innerHTML = '<p class="empty-message">No orders yet - waiting for customers...</p>';
      orderCountEl.textContent = '0 orders';
      orderCountBadge.textContent = '0';
      return;
    }

    orders.sort(function (a, b) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    orderCountEl.textContent = orders.length + ' order' + (orders.length !== 1 ? 's' : '');
    orderCountBadge.textContent = orders.length;

    container.innerHTML = orders.map(function (order, index) {
      var itemsHtml = order.items.map(function (item) {
        var icon = itemIcons[item.name] || '';
        var lines = [];
        for (var i = 0; i < item.quantity; i++) {
          var toppingsHtml = '';
          if (item.name === 'toast' && item.toppings && item.toppings.length > 0) {
            toppingsHtml = '<div class="kitchen-item-toppings">' + item.toppings.map(function (t) {
              return '<span class="topping-tag">' + escapeHtml(t) + '</span>';
            }).join('') + '</div>';
          }
          lines.push('<div class="kitchen-item">' + icon + ' ' + capitalize(item.name) + toppingsHtml + '</div>');
        }
        return lines.join('');
      }).join('');

      return '<div class="kitchen-card">' +
        '<div class="kitchen-card-header">' +
          '<span class="kitchen-number">#' + (index + 1) + '</span>' +
          '<span class="kitchen-name">' + escapeHtml(order.name) + '</span>' +
          '<span class="kitchen-time">' + timeAgo(order.timestamp) + '</span>' +
        '</div>' +
        '<div class="kitchen-items">' + itemsHtml + '</div>' +
        '<div class="kitchen-card-footer">' +
          '<button class="kitchen-done-btn" data-id="' + escapeHtml(order.id) + '">&#10003; Finish Order</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Attach finish handlers
    container.querySelectorAll('.kitchen-done-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        markOrderDone(btn.dataset.id);
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
      if (!res.ok) throw new Error('Failed');
      loadOrders();
    } catch (err) {
      // silent
    }
  }

  async function loadOrders() {
    try {
      var res = await fetch('/api/orders');
      var orders = await res.json();
      renderOrders(orders);
    } catch (err) {
      container.innerHTML = '<p class="empty-message">Failed to load orders</p>';
    }
  }

  loadOrders();
  setInterval(loadOrders, POLL_INTERVAL);

  // ===== Messenger =====
  var messengerSidebar = document.getElementById('messenger-sidebar');
  var convoList = document.getElementById('messenger-convo-list');
  var messengerChat = document.getElementById('messenger-chat');
  var messengerChatHeader = document.getElementById('messenger-chat-header');
  var messengerChatName = document.getElementById('messenger-chat-name');
  var messengerMessages = document.getElementById('messenger-messages');
  var messengerInputBar = document.getElementById('messenger-input-bar');
  var messengerInput = document.getElementById('messenger-input');
  var messengerSend = document.getElementById('messenger-send');
  var messengerBack = document.getElementById('messenger-back');
  var activeConvo = null;
  var prevTotalMsgs = 0;

  messengerSend.addEventListener('click', sendReply);
  messengerInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendReply();
  });

  messengerBack.addEventListener('click', function () {
    activeConvo = null;
    messengerSidebar.classList.remove('hidden-mobile');
    messengerChatName.textContent = 'Select a conversation';
    messengerInputBar.hidden = true;
    messengerBack.hidden = true;
    messengerMessages.innerHTML = '<p class="empty-message" style="padding:3rem;font-size:0.9rem;">Select a conversation to view messages</p>';
    // Remove active state from sidebar items
    convoList.querySelectorAll('.messenger-convo-item').forEach(function (el) {
      el.classList.remove('active');
    });
    loadConversations();
  });

  async function loadConversations() {
    try {
      var res = await fetch('/api/chat?type=dm-all');
      var conversations = await res.json();
      var users = Object.keys(conversations);

      // Count total messages for badge
      var total = 0;
      users.forEach(function (u) { total += conversations[u].length; });

      if (currentTab !== 'messages' && total > prevTotalMsgs) {
        var diff = total - prevTotalMsgs;
        msgCountBadge.textContent = diff > 9 ? '9+' : diff;
        msgCountBadge.hidden = false;
      }
      prevTotalMsgs = total;

      if (users.length === 0) {
        convoList.innerHTML = '<p class="empty-message" style="padding:2rem;font-size:0.9rem;">No messages yet</p>';
        return;
      }

      convoList.innerHTML = users.map(function (user) {
        var msgs = conversations[user];
        var last = msgs[msgs.length - 1];
        var preview = last ? escapeHtml(last.message).slice(0, 40) : '';
        var isActive = activeConvo === user;
        return '<div class="messenger-convo-item' + (isActive ? ' active' : '') + '" data-user="' + escapeHtml(user) + '">' +
          '<div class="messenger-convo-name">' + escapeHtml(user) + '</div>' +
          '<div class="messenger-convo-preview">' + preview + '</div>' +
        '</div>';
      }).join('');

      convoList.querySelectorAll('.messenger-convo-item').forEach(function (el) {
        el.addEventListener('click', function () {
          openConversation(el.dataset.user);
        });
      });

      if (activeConvo) {
        loadMessages(activeConvo);
      }
    } catch (err) {
      // silent
    }
  }

  function openConversation(user) {
    activeConvo = user;
    messengerChatName.textContent = user;
    messengerInputBar.hidden = false;
    messengerBack.hidden = false;
    messengerSidebar.classList.add('hidden-mobile');
    convoList.querySelectorAll('.messenger-convo-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.user === user);
    });
    loadMessages(user);
  }

  async function loadMessages(user) {
    try {
      var res = await fetch('/api/chat?type=dm-all');
      var conversations = await res.json();
      var messages = conversations[user] || [];

      if (messages.length === 0) {
        messengerMessages.innerHTML = '<p class="empty-message" style="padding:2rem;font-size:0.9rem;">No messages yet</p>';
        return;
      }

      messengerMessages.innerHTML = messages.map(function (msg) {
        var isSent = msg.from === 'Kitchen';
        var cls = isSent ? 'sent' : 'received';
        var time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return '<div class="chat-msg ' + cls + '">' +
          '<div>' + escapeHtml(msg.message) + '</div>' +
          '<div class="chat-msg-meta">' + (isSent ? 'Kitchen' : msg.from) + ' · ' + time + '</div>' +
        '</div>';
      }).join('');

      messengerMessages.scrollTop = messengerMessages.scrollHeight;
    } catch (err) {
      // silent
    }
  }

  async function sendReply() {
    var text = messengerInput.value.trim();
    if (!text || !activeConvo) return;

    messengerInput.value = '';
    messengerSend.disabled = true;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dm',
          from: 'Kitchen',
          to: activeConvo,
          message: text,
        }),
      });
      loadMessages(activeConvo);
    } catch (err) {
      // silent
    }

    messengerSend.disabled = false;
    messengerInput.focus();
  }

  setInterval(loadConversations, POLL_INTERVAL);
})();
