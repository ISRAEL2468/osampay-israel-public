// App State
let state = {
  user: null,
  registeredUsers: JSON.parse(localStorage.getItem('opay_users')) || {
    "7047945145": { phone: "7047945145", email: "israel@opay.com", name: "ISRAEL OSAMWONYI", password: "password", pin: "1234", balance: 500000, transactions: [] }
  },
  eyeClosed: false,
  recentTransactionsOnHomepage: JSON.parse(localStorage.getItem('opay_recent_home')) || false,
  transferFlow: { bank: null, account: '', name: '', amount: 0, remark: '' },
  currentPin: ''
};

// Utilities
function saveUsers() {
  localStorage.setItem('opay_users', JSON.stringify(state.registeredUsers));
}

function formatCurrency(amount) {
  return "₦" + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function changeScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screenId);
  if (target) {
    target.classList.add('active');
    if (screenId === 'dashboard') renderDashboard();
    if (screenId === 'settings') renderSettings();
    if (screenId === 'homepage-settings') renderHomepageSettings();
    if (screenId === 'transfer-bank') renderTransferBank();
    if (screenId === 'history') renderHistory();
  }
}

// Initial Loading Transition
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    changeScreen('logged-out');
  }, 3000);
});

// Auth Handlers
const regPhoneInput = document.getElementById('reg-phone');
if (regPhoneInput) {
  regPhoneInput.addEventListener('input', async (e) => {
    const val = e.target.value.trim();
    const lookupBox = document.getElementById('reg-api-lookup');
    const submitBtn = document.getElementById('reg-submit-btn');
    
    if (val.length === 10) {
      lookupBox.className = "p-3 rounded-xl border text-xs font-semibold bg-gray-50 text-gray-500 border-gray-200";
      lookupBox.innerHTML = "Verifying number with API...";
      lookupBox.classList.remove('hidden');
      
      try {
        const res = await fetch(`/api/resolve-account?account_number=${val}&bank_code=opay`);
        const data = await res.json();
        if (data.success) {
          lookupBox.className = "p-3 rounded-xl border text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-100";
          lookupBox.innerHTML = `✓ Verified OPay Account: ${data.name}`;
          state.transferFlow.resolvedRegisterName = data.name;
          submitBtn.disabled = false;
        } else {
          lookupBox.className = "p-3 rounded-xl border text-xs font-semibold bg-orange-50 text-orange-700 border-orange-100";
          lookupBox.innerHTML = `⚠️ API Key not yet configured on this number`;
          submitBtn.disabled = true;
        }
      } catch (err) {
        lookupBox.innerHTML = "Error contacting API";
      }
    } else {
      lookupBox.classList.add('hidden');
      submitBtn.disabled = true;
    }
  });
}

function handleRegisterSubmit() {
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const pin = document.getElementById('reg-pin').value.trim();
  const name = state.transferFlow.resolvedRegisterName || "NEW USER";

  if (!phone || !email || !password || !pin) {
    alert("Please fill in all fields.");
    return;
  }

  state.registeredUsers[phone] = { phone, email, password, pin, name, balance: 500000, transactions: [] };
  saveUsers();
  alert("Registration Successful! Please log in.");
  changeScreen('login');
}

function handleLoginSubmit() {
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const user = state.registeredUsers[phone];
  if (user && user.password === password) {
    state.user = user;
    changeScreen('dashboard');
  } else {
    alert("Invalid phone number or password.");
  }
}

function logoutUser() {
  state.user = null;
  changeScreen('logged-out');
}

// Render Dashboard
function renderDashboard() {
  if (!state.user) return;
  document.getElementById('dashboard-username').innerText = state.user.name.split(' ')[0];
  updateBalanceDisplay();
  
  const recentBox = document.getElementById('homepage-recent-box');
  if (state.recentTransactionsOnHomepage) {
    recentBox.classList.remove('hidden');
    const txs = state.user.transactions || [];
    if (txs.length === 0) {
      recentBox.innerHTML = `<p class="text-[10px] opacity-75 text-center py-2">No transactions yet</p>`;
    } else {
      let html = '';
      txs.slice(0, 2).forEach(tx => {
        const isOut = tx.amount < 0;
        const color = isOut ? 'text-white' : 'text-emerald-100';
        const sign = isOut ? '-' : '+';
        const absAmt = Math.abs(tx.amount);
        html += `
          <div class="flex justify-between items-center text-[10px] py-1">
            <div>
              <p class="font-bold">${tx.title}</p>
              <p class="text-[8px] opacity-75">${tx.date}</p>
            </div>
            <div class="text-right">
              <p class="font-extrabold ${color}">${sign}${formatCurrency(absAmt)}</p>
              <p class="text-[8px] text-emerald-100 opacity-90">${tx.status}</p>
            </div>
          </div>
        `;
      });
      recentBox.innerHTML = html;
    }
  } else {
    recentBox.classList.add('hidden');
  }
}

function updateBalanceDisplay() {
  const balEl = document.getElementById('dashboard-balance');
  if (state.eyeClosed) {
    balEl.innerText = '****';
  } else {
    balEl.innerText = formatCurrency(state.user.balance);
  }
}

// Balance Eye
function toggleBalanceEye() {
  state.eyeClosed = !state.eyeClosed;
  document.getElementById('balance-eye-btn').innerText = state.eyeClosed ? '🙈' : '👁️';
  updateBalanceDisplay();
}

// Settings Handlers
function renderSettings() {
  // settings rendering is static
}

function renderHomepageSettings() {
  document.getElementById('homepage-toggle').checked = state.recentTransactionsOnHomepage;
}

function toggleHomepageRecentTransactions() {
  state.recentTransactionsOnHomepage = document.getElementById('homepage-toggle').checked;
  localStorage.setItem('opay_recent_home', JSON.stringify(state.recentTransactionsOnHomepage));
}

// Bank selection
function openBankModal() {
  document.getElementById('modal-bank-selector').classList.remove('hidden');
}

function closeBankModal() {
  document.getElementById('modal-bank-selector').classList.add('hidden');
}

function selectBank(code, name, initials, bg) {
  state.transferFlow.bank = { code, name, initials, bg };
  const logo = document.getElementById('selected-bank-logo');
  logo.innerText = initials;
  logo.style.backgroundColor = bg;
  logo.style.color = '#ffffff';
  document.getElementById('selected-bank-name').innerText = name;
  closeBankModal();
  checkTransferValidation();
}

function renderTransferBank() {
  state.transferFlow = { bank: null, account: '', name: '', amount: 0, remark: '' };
  document.getElementById('transfer-acc-no').value = '';
  const logo = document.getElementById('selected-bank-logo');
  logo.innerText = '?';
  logo.style.backgroundColor = '';
  logo.style.color = '';
  document.getElementById('selected-bank-name').innerText = 'Select Bank';
  document.getElementById('transfer-resolve-box').classList.add('hidden');
  document.getElementById('transfer-next-btn').disabled = true;

  const container = document.getElementById('recents-list-container');
  const txs = state.user ? (state.user.transactions || []) : [];
  const recents = [];
  const seen = new Set();
  txs.forEach(t => {
    if (t.amount < 0 && !seen.has(t.account)) {
      seen.add(t.account);
      recents.push(t);
    }
  });

  if (recents.length === 0) {
    recents.push({ name: 'MIRACLE EDOYIN', account: '8275811964', bank: 'MONIE POINT' });
    recents.push({ name: 'ISRAEL OSAMWONYI', account: '9162114195', bank: 'MONIE POINT' });
  }

  let html = '';
  recents.slice(0, 5).forEach(r => {
    html += `
      <div onclick="clickRecent('${r.account}', '${r.bank}')" class="p-3 bg-white rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 border border-gray-100">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-emerald-50 text-[#00b073] flex items-center justify-center font-extrabold text-xs">${r.bank[0]}</div>
          <div>
            <h4 class="text-xs font-bold text-gray-800">${r.name}</h4>
            <p class="text-[10px] text-gray-400">${r.account} ${r.bank}</p>
          </div>
        </div>
        <span class="text-xs text-gray-400 font-bold">&gt;</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function clickRecent(acc, bankName) {
  document.getElementById('transfer-acc-no').value = acc;
  let code = '50515';
  if (bankName.includes('UBA')) code = '033';
  if (bankName.includes('OPAY')) code = '999992';
  selectBank(code, bankName, bankName[0], bankName.includes('UBA') ? '#b91c1c' : '#00b073');
  checkTransferValidation();
}