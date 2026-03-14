(function () {
  var itemIcons = {
    toast: '\u{1F35E}',
    cola: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#d32f2f"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34" text-anchor="middle" font-size="9" font-weight="bold" font-family="Georgia,serif" fill="#d32f2f" font-style="italic">CC</text></svg>',
    fanta: '<svg viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle"><rect x="18" y="8" width="28" height="48" rx="4" fill="#f57c00"/><rect x="20" y="24" width="24" height="14" rx="2" fill="#fff" opacity=".95"/><text x="32" y="34.5" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial,sans-serif" fill="#f57c00">F</text></svg>'
  };
  var container = document.getElementById('orders-container');
  var orderCountEl = document.getElementById('order-count');
  var POLL_INTERVAL = 5000;

  function capitalize(str) {
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

  function renderOrders(orders) {
    if (!orders || orders.length === 0) {
      container.innerHTML = '<p class="empty-message">No orders yet - waiting for customers...</p>';
      orderCountEl.textContent = '0 orders';
      return;
    }

    // Sort oldest first (FIFO - first in, first to serve)
    orders.sort(function (a, b) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    orderCountEl.textContent = orders.length + ' order' + (orders.length !== 1 ? 's' : '');

    container.innerHTML = orders.map(function (order, index) {
      var itemsHtml = order.items.map(function (item) {
        var icon = itemIcons[item.name] || '';
        var lines = [];
        for (var i = 0; i < item.quantity; i++) {
          lines.push('<div class="kitchen-item">' + icon + ' ' + capitalize(item.name) + '</div>');
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
      '</div>';
    }).join('');
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

  // Initial load
  loadOrders();

  // Auto-refresh every 5 seconds
  setInterval(loadOrders, POLL_INTERVAL);
})();
