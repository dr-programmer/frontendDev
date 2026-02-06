(function () {
  'use strict';

  const DB_NAME = 'FinanceTrackerDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'transactions';

  // Some magic for the icons, couldn't do it without them haha
  const ICONS = {
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    recurring: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>'
  };

  const DEFAULT_EXPENSE_CATEGORIES = [
    { name: 'Храна', color: '#e74c3c' },
    { name: 'Транспорт', color: '#e67e22' },
    { name: 'Жилище', color: '#9b59b6' },
    { name: 'Комунални', color: '#3498db' },
    { name: 'Забавления', color: '#1abc9c' },
    { name: 'Здраве', color: '#e91e63' },
    { name: 'Дрехи', color: '#ff9800' },
    { name: 'Образование', color: '#607d8b' },
    { name: 'Други', color: '#95a5a6' }
  ];

  const DEFAULT_INCOME_CATEGORIES = [
    { name: 'Заплата', color: '#2ecc71' },
    { name: 'Фрийланс', color: '#27ae60' },
    { name: 'Инвестиции', color: '#16a085' },
    { name: 'Подаръци', color: '#f39c12' },
    { name: 'Други', color: '#7f8c8d' }
  ];

  // State
  let db = null;
  let allTransactions = [];
  let deleteTargetId = null;
  let focusAfterClose = null; // element to restore focus to after modal closes

  // DOM Reference
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elBalance = $('#total-balance');
  const elIncome = $('#total-income');
  const elExpenses = $('#total-expenses');
  const elTxList = $('#transactions-list');
  const elEmptyMsg = $('#empty-msg');
  const elFilterType = $('#filter-type');
  const elFilterPeriod = $('#filter-period');
  const elFilterCategory = $('#filter-category');

  // Modals
  const elModalTx = $('#modal-transaction');
  const elModalSettings = $('#modal-settings');
  const elModalConfirm = $('#modal-confirm');

  // Form
  const elFormTx = $('#form-transaction');
  const elTxId = $('#tx-id');
  const elTxType = $('#tx-type');
  const elTxAmount = $('#tx-amount');
  const elTxCategory = $('#tx-category');
  const elTxDate = $('#tx-date');
  const elTxDesc = $('#tx-description');
  const elTxRecurring = $('#tx-recurring');
  const elModalTitle = $('#modal-title');

  // Charts
  const elChartCanvas = $('#category-chart');
  const elChartLegend = $('#chart-legend');
  const elChartEmpty = $('#chart-empty');
  const elIncomeChartCanvas = $('#income-chart');
  const elIncomeChartLegend = $('#income-chart-legend');
  const elIncomeChartEmpty = $('#income-chart-empty');

  // Settings
  const elSettingCurrency = $('#setting-currency');
  const elSettingDefaultPeriod = $('#setting-default-period');
  const elExpenseCatList = $('#expense-categories-list');
  const elIncomeCatList = $('#income-categories-list');

  // Last visited
  const elLastVisited = $('#last-visited');

  // Cookie Helpers
  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // localStorage Settings
  function getSettings() {
    const defaults = {
      currency: 'лв.',
      defaultPeriod: 'all',
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      incomeCategories: DEFAULT_INCOME_CATEGORIES,
      darkTheme: false
    };
    try {
      const stored = localStorage.getItem('financeSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaults, ...parsed };
      }
    } catch (e) { /* ignore */ }
    return defaults;
  }

  function saveSettings(settings) {
    localStorage.setItem('financeSettings', JSON.stringify(settings));
  }

  // sessionStorage Filters
  function getSessionFilters() {
    try {
      const stored = sessionStorage.getItem('financeFilters');
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return null;
  }

  function saveSessionFilters() {
    const filters = {
      type: elFilterType.value,
      period: elFilterPeriod.value,
      category: elFilterCategory.value
    };
    sessionStorage.setItem('financeFilters', JSON.stringify(filters));
  }

  // IndexedDB
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  function dbGetAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbAdd(transaction) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(transaction);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbPut(transaction) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(transaction);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function dbClear() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Formatting Helpers
  function formatAmount(amount) {
    const settings = getSettings();
    return `${amount.toFixed(2)} ${settings.currency}`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function getCategoryColor(categoryName, type) {
    const settings = getSettings();
    const cats = type === 'income' ? settings.incomeCategories : settings.expenseCategories;
    const found = cats.find(c => c.name === categoryName);
    return found ? found.color : '#888';
  }

  // Filtering
  function getFilteredTransactions() {
    const typeFilter = elFilterType.value;
    const periodFilter = elFilterPeriod.value;
    const categoryFilter = elFilterCategory.value;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay() + (startOfDay.getDay() === 0 ? -6 : 1));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allTransactions.filter(t => {
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Period filter
      if (periodFilter !== 'all') {
        const txDate = new Date(t.date);
        if (periodFilter === 'day' && txDate < startOfDay) return false;
        if (periodFilter === 'week' && txDate < startOfWeek) return false;
        if (periodFilter === 'month' && txDate < startOfMonth) return false;
      }

      return true;
    });
  }

  // Render Summary
  function renderSummary(filtered) {
    let income = 0, expense = 0;
    filtered.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    const balance = income - expense;

    elBalance.textContent = formatAmount(balance);
    elIncome.textContent = `+${formatAmount(income)}`;
    elExpenses.textContent = `-${formatAmount(expense)}`;

    // Update color of balance
    elBalance.classList.remove('positive', 'negative');
    if (balance > 0) elBalance.classList.add('positive');
    else if (balance < 0) elBalance.classList.add('negative');
  }

  // Render Transactions
  function renderTransactions(filtered) {
    // Sort by date descending
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      elEmptyMsg.hidden = false;
      // Remove all transaction items but keep empty msg
      elTxList.querySelectorAll('.transaction-item').forEach(el => el.remove());
      return;
    }

    elEmptyMsg.hidden = true;

    const fragment = document.createDocumentFragment();
    sorted.forEach(t => {
      const article = document.createElement('article');
      article.className = `transaction-item ${t.type === 'income' ? 'income-item' : 'expense-item'}`;
      article.setAttribute('role', 'listitem');
      article.dataset.id = t.id;

      const color = getCategoryColor(t.category, t.type);
      const sign = t.type === 'income' ? '+' : '-';
      const amountClass = t.type === 'income' ? 'positive' : 'negative';
      const recurringBadge = t.recurring ? `<span class="tx-recurring-badge"><span class="icon" aria-hidden="true">${ICONS.recurring}</span> Месечно</span>` : '';

      article.innerHTML = `
        <div class="tx-info">
          <div class="tx-top-row">
            <span class="tx-category" style="background:${color}">${escapeHTML(t.category)}</span>
            <span class="tx-date">${formatDate(t.date)}</span>
            ${recurringBadge}
          </div>
          <div class="tx-description">${escapeHTML(t.description || '—')}</div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${amountClass}">${sign}${formatAmount(t.amount)}</span>
          <div class="tx-actions">
            <button class="btn-icon btn-edit" data-id="${t.id}" title="Редактиране" aria-label="Редактиране на транзакция: ${escapeHTML(t.description || t.category)}">${ICONS.edit}</button>
            <button class="btn-icon btn-delete" data-id="${t.id}" title="Изтриване" aria-label="Изтриване на транзакция: ${escapeHTML(t.description || t.category)}">${ICONS.trash}</button>
          </div>
        </div>
      `;
      fragment.appendChild(article);
    });

    // Clear old items and append new
    elTxList.querySelectorAll('.transaction-item').forEach(el => el.remove());
    elTxList.appendChild(fragment);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Chart (Canvas)
  function drawPieChart(canvas, legendEl, emptyEl, entries, type) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const total = entries.reduce((sum, [, val]) => sum + val, 0);

    if (entries.length === 0 || total === 0) {
      canvas.hidden = true;
      legendEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }

    canvas.hidden = false;
    emptyEl.hidden = true;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    let startAngle = -Math.PI / 2;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    entries.forEach(([category, amount]) => {
      const sliceAngle = (amount / total) * 2 * Math.PI;
      const color = getCategoryColor(category, type);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = isDark ? '#1e1e35' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = startAngle + sliceAngle / 2;
      const pct = ((amount / total) * 100).toFixed(1);
      if (sliceAngle > 0.2) {
        const labelX = centerX + Math.cos(midAngle) * (radius * 0.65);
        const labelY = centerY + Math.sin(midAngle) * (radius * 0.65);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, labelX, labelY);
      }

      startAngle += sliceAngle;
    });

    legendEl.innerHTML = entries.map(([category, amount]) => {
      const color = getCategoryColor(category, type);
      const pct = ((amount / total) * 100).toFixed(1);
      return `
        <div class="legend-item">
          <span class="legend-color" style="background:${color}"></span>
          <span>${escapeHTML(category)} — ${formatAmount(amount)} (${pct}%)</span>
        </div>
      `;
    }).join('');
  }

  function renderChart(filtered) {
    // Expense chart
    const expenseData = {};
    filtered.forEach(t => {
      if (t.type === 'expense') {
        expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
      }
    });
    const expenseEntries = Object.entries(expenseData).sort((a, b) => b[1] - a[1]);
    drawPieChart(elChartCanvas, elChartLegend, elChartEmpty, expenseEntries, 'expense');

    // Income chart
    const incomeData = {};
    filtered.forEach(t => {
      if (t.type === 'income') {
        incomeData[t.category] = (incomeData[t.category] || 0) + t.amount;
      }
    });
    const incomeEntries = Object.entries(incomeData).sort((a, b) => b[1] - a[1]);
    drawPieChart(elIncomeChartCanvas, elIncomeChartLegend, elIncomeChartEmpty, incomeEntries, 'income');
  }

  // Populate Filter Categories
  function populateFilterCategories() {
    const settings = getSettings();
    const allCats = [...settings.expenseCategories, ...settings.incomeCategories];
    const unique = [...new Set(allCats.map(c => c.name))];

    const current = elFilterCategory.value;
    elFilterCategory.innerHTML = '<option value="all">Всички</option>';
    unique.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      elFilterCategory.appendChild(opt);
    });
    elFilterCategory.value = current || 'all';
  }

  // Populate Form Category Select
  function populateFormCategories() {
    const settings = getSettings();
    const type = elTxType.value;
    const cats = type === 'income' ? settings.incomeCategories : settings.expenseCategories;

    const current = elTxCategory.value;
    elTxCategory.innerHTML = '';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      elTxCategory.appendChild(opt);
    });

    // Restore selection if possible
    if (cats.find(c => c.name === current)) {
      elTxCategory.value = current;
    }
  }

  // Refresh UI
  function refreshUI() {
    const filtered = getFilteredTransactions();
    renderSummary(filtered);
    renderTransactions(filtered);
    renderChart(filtered);
    saveSessionFilters();
  }

  // Modal Management
  function openModal(modalEl) {
    focusAfterClose = document.activeElement;
    modalEl.hidden = false;
    // Focus the first focusable element inside
    const focusable = modalEl.querySelector('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) setTimeout(() => focusable.focus(), 50);
    // Trap focus
    modalEl.addEventListener('keydown', trapFocus);
  }

  function closeModal(modalEl) {
    modalEl.hidden = true;
    modalEl.removeEventListener('keydown', trapFocus);
    if (focusAfterClose) focusAfterClose.focus();
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const modal = e.currentTarget;
    const focusables = modal.querySelectorAll('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Transaction CRUD
  function openAddModal() {
    elTxId.value = '';
    elTxType.value = 'expense';
    elTxAmount.value = '';
    elTxDate.value = new Date().toISOString().split('T')[0];
    elTxDesc.value = '';
    elTxRecurring.checked = false;
    elModalTitle.textContent = 'Добави транзакция';
    $('#btn-save-tx').textContent = 'Запази';
    populateFormCategories();
    clearFormErrors();
    openModal(elModalTx);
  }

  function openEditModal(id) {
    const tx = allTransactions.find(t => t.id === id);
    if (!tx) return;

    elTxId.value = tx.id;
    elTxType.value = tx.type;
    populateFormCategories();
    elTxCategory.value = tx.category;
    elTxAmount.value = tx.amount;
    elTxDate.value = tx.date;
    elTxDesc.value = tx.description || '';
    elTxRecurring.checked = tx.recurring || false;
    elModalTitle.textContent = 'Редактиране на транзакция';
    $('#btn-save-tx').textContent = 'Обнови';
    clearFormErrors();
    openModal(elModalTx);
  }

  function clearFormErrors() {
    $$('#form-transaction .error').forEach(el => el.classList.remove('error'));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    // Validation
    let valid = true;
    if (!elTxAmount.value || parseFloat(elTxAmount.value) <= 0) {
      elTxAmount.classList.add('error');
      valid = false;
    }
    if (!elTxDate.value) {
      elTxDate.classList.add('error');
      valid = false;
    }
    if (!elTxCategory.value) {
      elTxCategory.classList.add('error');
      valid = false;
    }

    if (!valid) return;

    const txData = {
      id: elTxId.value || crypto.randomUUID(),
      type: elTxType.value,
      amount: parseFloat(parseFloat(elTxAmount.value).toFixed(2)),
      category: elTxCategory.value,
      date: elTxDate.value,
      description: elTxDesc.value.trim(),
      recurring: elTxRecurring.checked,
      createdAt: elTxId.value
        ? (allTransactions.find(t => t.id === elTxId.value)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    try {
      if (elTxId.value) {
        // Update
        await dbPut(txData);
        const idx = allTransactions.findIndex(t => t.id === txData.id);
        if (idx !== -1) allTransactions[idx] = txData;
      } else {
        // Add
        await dbAdd(txData);
        allTransactions.push(txData);
      }
    } catch (err) {
      console.error('DB save error:', err);
      return;
    }

    closeModal(elModalTx);
    refreshUI();
  }

  async function handleDelete(id) {
    try {
      await dbDelete(id);
      allTransactions = allTransactions.filter(t => t.id !== id);
      refreshUI();
    } catch (err) {
      console.error('DB delete error:', err);
    }
  }

  // Import / Export
  function exportJSON() {
    const data = {
      transactions: allTransactions,
      settings: getSettings(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.transactions || !Array.isArray(data.transactions)) {
        alert('Невалиден JSON файл. Очаква се масив от транзакции.');
        return;
      }

      // Validate each transaction
      const valid = data.transactions.every(t =>
        t.id && t.type && t.amount && t.category && t.date
      );
      if (!valid) {
        alert('Някои транзакции в JSON файла са с невалидни данни.');
        return;
      }

      // Clear existing and import
      await dbClear();
      for (const t of data.transactions) {
        await dbAdd(t);
      }
      allTransactions = data.transactions;

      // Import settings if present
      if (data.settings) {
        saveSettings(data.settings);
        applySettings();
      }

      refreshUI();
      populateFilterCategories();
      alert(`Успешно импортирани ${data.transactions.length} транзакции.`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Грешка при импортиране на файла.');
    }
  }

  // Settings
  function openSettingsModal() {
    const settings = getSettings();
    elSettingCurrency.value = settings.currency;
    elSettingDefaultPeriod.value = settings.defaultPeriod;
    renderCategoryList(elExpenseCatList, settings.expenseCategories, 'expense');
    renderCategoryList(elIncomeCatList, settings.incomeCategories, 'income');
    openModal(elModalSettings);
  }

  function renderCategoryList(container, categories, type) {
    container.innerHTML = categories.map((cat, i) => `
      <div class="category-item" data-type="${type}" data-index="${i}">
        <input type="color" class="cat-color" value="${cat.color}" data-type="${type}" data-index="${i}" aria-label="Цвят за ${cat.name}">
        <span class="cat-name">${escapeHTML(cat.name)}</span>
        <button type="button" class="btn-remove-cat" data-type="${type}" data-index="${i}" aria-label="Премахни категория ${cat.name}">✕</button>
      </div>
    `).join('');
  }

  function handleSettingsSave() {
    // Gather categories from DOM
    const expenseCats = [];
    elExpenseCatList.querySelectorAll('.category-item').forEach(el => {
      const name = el.querySelector('.cat-name').textContent;
      const color = el.querySelector('.cat-color').value;
      expenseCats.push({ name, color });
    });

    const incomeCats = [];
    elIncomeCatList.querySelectorAll('.category-item').forEach(el => {
      const name = el.querySelector('.cat-name').textContent;
      const color = el.querySelector('.cat-color').value;
      incomeCats.push({ name, color });
    });

    const settings = {
      currency: elSettingCurrency.value,
      defaultPeriod: elSettingDefaultPeriod.value,
      expenseCategories: expenseCats,
      incomeCategories: incomeCats,
      darkTheme: document.documentElement.getAttribute('data-theme') === 'dark'
    };

    saveSettings(settings);
    closeModal(elModalSettings);
    populateFilterCategories();
    populateFormCategories();
    refreshUI();
  }

  function addCategory(type) {
    const nameInput = type === 'expense' ? $('#new-expense-cat') : $('#new-income-cat');
    const colorInput = type === 'expense' ? $('#new-expense-color') : $('#new-income-color');
    const container = type === 'expense' ? elExpenseCatList : elIncomeCatList;

    const name = nameInput.value.trim();
    if (!name) return;

    const settings = getSettings();
    const cats = type === 'expense' ? settings.expenseCategories : settings.incomeCategories;

    // Check duplicate
    if (cats.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Тази категория вече съществува.');
      return;
    }

    cats.push({ name, color: colorInput.value });
    renderCategoryList(container, cats, type);
    nameInput.value = '';
  }

  function removeCategory(type, index) {
    const settings = getSettings();
    const cats = type === 'expense' ? settings.expenseCategories : settings.incomeCategories;
    const container = type === 'expense' ? elExpenseCatList : elIncomeCatList;

    cats.splice(index, 1);
    renderCategoryList(container, cats, type);
  }

  // Dark Theme
  function toggleDarkTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    const btn = $('#btn-dark-theme');
    btn.setAttribute('aria-pressed', String(!isDark));
    btn.querySelector('.icon').innerHTML = isDark ? ICONS.moon : ICONS.sun;

    const settings = getSettings();
    settings.darkTheme = !isDark;
    saveSettings(settings);

    // Re-render chart with correct border colors
    const filtered = getFilteredTransactions();
    renderChart(filtered);
  }

  function applySettings() {
    const settings = getSettings();

    // Apply dark theme
    if (settings.darkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
      $('#btn-dark-theme').setAttribute('aria-pressed', 'true');
      $('#btn-dark-theme .icon').innerHTML = ICONS.sun;
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      $('#btn-dark-theme').setAttribute('aria-pressed', 'false');
      $('#btn-dark-theme .icon').innerHTML = ICONS.moon;
    }

    // Apply default period from settings if no session filter
    const sessionFilters = getSessionFilters();
    if (sessionFilters) {
      elFilterType.value = sessionFilters.type || 'all';
      elFilterPeriod.value = sessionFilters.period || 'all';
      elFilterCategory.value = sessionFilters.category || 'all';
    } else {
      elFilterPeriod.value = settings.defaultPeriod || 'all';
    }

    // Currency
    elSettingCurrency.value = settings.currency;
  }

  // Recurring Transactions
  async function processRecurringTransactions() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const recurring = allTransactions.filter(t => t.recurring);

    for (const t of recurring) {
      const txDate = new Date(t.date);

      const expectedMonth = today.getMonth();
      const expectedYear = today.getFullYear();

      const alreadyExists = allTransactions.some(existing =>
        existing.recurring &&
        existing.category === t.category &&
        existing.type === t.type &&
        Math.abs(existing.amount - t.amount) < 0.01 &&
        new Date(existing.date).getMonth() === expectedMonth &&
        new Date(existing.date).getFullYear() === expectedYear
      );

      if (!alreadyExists && (txDate.getMonth() !== expectedMonth || txDate.getFullYear() !== expectedYear)) {
        const newTx = {
          ...t,
          id: crypto.randomUUID(),
          date: todayStr,
          createdAt: new Date().toISOString()
        };
        try {
          await dbAdd(newTx);
          allTransactions.push(newTx);
        } catch (err) {
          console.error('Error creating recurring transaction:', err);
        }
      }
    }
  }

  // Cookie: Last Visited
  function updateLastVisited() {
    const lastVisited = getCookie('lastVisited');
    const now = new Date();

    if (lastVisited) {
      const d = new Date(lastVisited);
      elLastVisited.textContent = d.toLocaleString('bg-BG');
      elLastVisited.setAttribute('datetime', d.toISOString());
    } else {
      elLastVisited.textContent = 'Първо посещение';
    }

    setCookie('lastVisited', now.toISOString(), 30);
  }

  // Event Listeners
  function bindEvents() {
    // Add transaction
    $('#btn-add-transaction').addEventListener('click', openAddModal);

    // Close transaction modal
    $('#btn-close-modal').addEventListener('click', () => closeModal(elModalTx));
    $('#btn-cancel-tx').addEventListener('click', () => closeModal(elModalTx));

    // Form submit
    elFormTx.addEventListener('submit', handleFormSubmit);

    // Type change -> update categories
    elTxType.addEventListener('change', populateFormCategories);

    // Filters
    elFilterType.addEventListener('change', refreshUI);
    elFilterPeriod.addEventListener('change', refreshUI);
    elFilterCategory.addEventListener('change', refreshUI);

    // Transaction list: edit & delete (event delegation)
    elTxList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (editBtn) {
        openEditModal(editBtn.dataset.id);
      } else if (deleteBtn) {
        deleteTargetId = deleteBtn.dataset.id;
        openModal(elModalConfirm);
      }
    });

    // Confirm delete
    $('#btn-confirm-yes').addEventListener('click', async () => {
      if (deleteTargetId) {
        await handleDelete(deleteTargetId);
        deleteTargetId = null;
      }
      closeModal(elModalConfirm);
    });
    $('#btn-confirm-no').addEventListener('click', () => {
      deleteTargetId = null;
      closeModal(elModalConfirm);
    });

    // Export
    $('#btn-export').addEventListener('click', exportJSON);

    // Import
    $('#file-import').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importJSON(e.target.files[0]);
        e.target.value = ''; // reset
      }
    });

    // Import label keyboard support
    $('label[for="file-import"]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('#file-import').click();
      }
    });

    // Dark theme toggle
    $('#btn-dark-theme').addEventListener('click', toggleDarkTheme);

    // Settings
    $('#btn-settings').addEventListener('click', openSettingsModal);
    $('#btn-close-settings').addEventListener('click', () => closeModal(elModalSettings));
    $('#btn-save-settings').addEventListener('click', handleSettingsSave);

    // Add category buttons
    $('#btn-add-expense-cat').addEventListener('click', () => addCategory('expense'));
    $('#btn-add-income-cat').addEventListener('click', () => addCategory('income'));

    // Enter in category name input
    $('#new-expense-cat').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCategory('expense'); }
    });
    $('#new-income-cat').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCategory('income'); }
    });

    // Remove category
    elExpenseCatList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-cat');
      if (btn) removeCategory('expense', parseInt(btn.dataset.index));
    });
    elIncomeCatList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-cat');
      if (btn) removeCategory('income', parseInt(btn.dataset.index));
    });

    // Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!elModalTx.hidden) closeModal(elModalTx);
        if (!elModalSettings.hidden) closeModal(elModalSettings);
        if (!elModalConfirm.hidden) {
          deleteTargetId = null;
          closeModal(elModalConfirm);
        }
      }
    });

    // Click outside modal to close
    [elModalTx, elModalSettings, elModalConfirm].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === elModalConfirm) deleteTargetId = null;
          closeModal(modal);
        }
      });
    });
  }

  // Initialization
  async function init() {
    try {
      await openDB();
      allTransactions = await dbGetAll();
    } catch (err) {
      console.error('Failed to initialize DB:', err);
      allTransactions = [];
    }

    applySettings();
    populateFilterCategories();
    populateFormCategories();
    updateLastVisited();
    await processRecurringTransactions();
    refreshUI();
    bindEvents();
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
