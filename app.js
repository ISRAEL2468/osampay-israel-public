// Live Persistent InstantDB Integration
const INSTANTDB_APP_ID = "ef91959e-b620-4ef1-9873-ee5e4dad300f";

let state = {
  user: null,
  eyeClosed: false,
  recentTransactionsOnHomepage: JSON.parse(localStorage.getItem('opay_recent_home')) || false,
  transferFlow: { bank: null, account: '', name: '', amount: 0, remark: '' },
  currentPin: '',
  currentLoginPin: ''
};

// Format utilities
function formatCurrency(amount) {
  return "₦" + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// InstantDB DB Helpers
async function dbQuery(entityName, whereClause = {}) {
  try {
    const res = await fetch('https://api.instantdb.com/runtime/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: INSTANTDB_APP_ID,
        querys: {
          [entityName]: {
            $: {
              where: whereClause
            }
          }
        }
      })
    });
    const data = await res.json();
    return data[entityName] || [];
  } catch (err) {
    console.error(`InstantDB Query failed on ${entityName}:`, err);
    return [];
  }
}

async function dbTransact(steps) {
  try {
    const res = await fetch('https://api.instantdb.com/runtime/transact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: INSTANTDB_APP_ID,
        steps: steps
      })
    });
    return await res.json();
  } catch (err) {
    console.error("InstantDB Transact failed:", err);
    return null;
  }
}

// Seed the default Israel Osamwonyi profile if not exists
async function seedDefaultUser() {
  console.log("Checking and seeding default profile...");
  const users = await dbQuery('users', { phone: '7047945145' });
  if (users.length === 0) {
    console.log("Seeding default user profile into InstantDB...");
    await dbTransact([
      ["update", "users", "7047945145", {
        phone: "7047945145",
        email: "israel@opay.com",
        name: "ISRAEL OSAMWONYI",
        password: "password",
        pin: "1234",
        balance: 500000,
        transactions: []
      }]
    ]);
  }
}

// Global Screen Transitions
function changeScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById('screen-' + screenId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
    
    // Auto renders
    if (screenId === 'dashboard') {
      renderDashboard();
      switchTab('home');
    }
  }
}

// Initial Loading Transition
window.addEventListener('DOMContentLoaded', async () => {
  // Seed database
  await seedDefaultUser();
  
  // Splash Screen stays for 2.5 seconds, then reveals Lock Screen login
  setTimeout(() => {
    changeScreen('login');
    resetLoginPin();
  }, 2500);
});

// NATIVE LOCK SCREEN PIN KEYPAD HANDLERS
function typeLoginDigit(digit) {
  if (state.currentLoginPin.length < 4) {
    state.currentLoginPin += digit;
    updateLoginPinDots();
    if (state.currentLoginPin.length === 4) {
      setTimeout(handlePinLogin, 250);
    }
  }
}

function deleteLoginDigit() {
  if (state.currentLoginPin.length > 0) {
    state.currentLoginPin = state.currentLoginPin.slice(0, -1);
    updateLoginPinDots();
  }
}

function resetLoginPin() {
  state.currentLoginPin = '';
  updateLoginPinDots();
}

function updateLoginPinDots() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById('login-dot-' + i);
    if (dot) {
      if (i <= state.currentLoginPin.length) {
        dot.classList.add('bg-[#00b073]', 'border-[#00b073]', 'scale-110');
        dot.classList.remove('border-gray-200');
      } else {
        dot.classList.remove('bg-[#00b073]', 'border-[#00b073]', 'scale-110');
        dot.classList.add('border-gray-200');
      }
    }
  }
}

async function handlePinLogin() {
  const phone = "7047945145"; // Default active profile
  const users = await dbQuery('users', { phone: phone });
  const user = users[0];
  
  if (user && state.currentLoginPin === user.pin) {
    state.user = user;
    changeScreen('dashboard');
  } else {
    alert("Incorrect Lock Screen PIN! (Hint: use 1234 to unlock)");
    resetLoginPin();
  }
}

function handleForgotPassword() {
  alert("For security purposes, use the default PIN: 1234 to login.");
}

// UNIFIED TAB SWITCHER LOGIC
function switchTab(tabId) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  
  // Show target tab
  const targetTab = document.getElementById('tab-' + tabId);
  if (targetTab) {
    targetTab.classList.remove('hidden');
  }

  // Handle Tab updates
  if (tabId === 'home') renderDashboard();
  if (tabId === 'settings') renderSettings();
  if (tabId === 'history') renderHistory();

  // Highlight Bottom Nav
  const tabs = ['home', 'rewards', 'finance', 'cards', 'me'];
  tabs.forEach(t => {
    const navEl = document.getElementById('nav-' + t);
    if (navEl) {
      if (t === tabId || (tabId === 'history' && t === 'home') || (tabId === 'settings' && t === 'home')) {
        navEl.classList.add('text-[#00b073]');
        navEl.classList.remove('text-gray-400');
      } else {
        navEl.classList.remove('text-[#00b073]');
        navEl.classList.add('text-gray-400');
      }
    }
  });
}

// Auth Handlers (Sign Up)
setTimeout(() => {
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
            lookupBox.innerHTML = `⚠️ No registered user with this phone number on record`;
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
}, 500);

async function handleRegisterSubmit() {
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const pin = document.getElementById('reg-pin').value.trim();
  const name = state.transferFlow.resolvedRegisterName || "NEW USER";

  if (!phone || !email || !password || !pin) {
    alert("Please fill in all fields.");
    return;
  }

  await dbTransact([
    ["update", "users", phone, {
      phone,
      email,
      password,
      pin,
      name,
      balance: 500000,
      transactions: []
    }]
  ]);
  
  // Dynamic header avatar update
  const bubble = document.querySelector('.w-9.h-9.rounded-full');
  if (bubble) bubble.innerText = name.split(' ').map(n=>n[0]).join('');
  
  alert("Registration Successful! Please enter your PIN to login.");
  changeScreen('login');
}

function logoutUser() {
  state.user = null;
  changeScreen('login');
  resetLoginPin();
}

// Render Dashboard (Home)
async function renderDashboard() {
  if (!state.user) return;
  
  // Fetch fresh user state from InstantDB to show real balance
  const users = await dbQuery('users', { phone: state.user.phone });
  if (users[0]) {
    state.user = users[0];
  }

  const firstName = state.user.name.split(' ')[0];
  document.getElementById('dashboard-username').innerText = firstName;
  document.getElementById('profile-name').innerText = state.user.name;
  document.getElementById('profile-phone').innerText = `${state.user.phone} | Tier 3 Account`;
  
  // Update header initials
  const initials = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2);
  const bubbles = document.querySelectorAll('.rounded-full');
  bubbles.forEach(b => {
    if (b.innerText === 'IO' || b.innerText === 'NEW') b.innerText = initials;
  });

  updateBalanceDisplay();
  renderMiniHistoryOnHome();
}

function updateBalanceDisplay() {
  const balEl = document.getElementById('dashboard-balance');
  if (state.eyeClosed) {
    balEl.innerText = '****';
  } else {
    balEl.innerText = formatCurrency(state.user.balance);
  }
}

function toggleBalanceEye() {
  state.eyeClosed = !state.eyeClosed;
  document.getElementById('balance-eye-btn').innerText = state.eyeClosed ? '🙈' : '👁️';
  updateBalanceDisplay();
}

// Mini-History display toggle helper
function renderMiniHistoryOnHome() {
  const recentBox = document.getElementById('homepage-recent-box');
  const recentItems = document.getElementById('homepage-recent-items');
  
  if (state.recentTransactionsOnHomepage && state.user) {
    recentBox.classList.remove('hidden');
    const txs = state.user.transactions || [];
    if (txs.length === 0) {
      recentItems.innerHTML = `<p class="text-[10px] opacity-75 text-center py-2 font-bold">No transactions display yet</p>`;
    } else {
      let html = '';
      txs.slice(0, 3).forEach(tx => {
        const isOut = tx.amount < 0;
        const color = isOut ? 'text-white' : 'text-emerald-100';
        const sign = isOut ? '-' : '+';
        html += `
          <div class="flex justify-between items-center text-[10px] py-1 border-b border-emerald-700 last:border-0 border-opacity-35">
            <div>
              <p class="font-bold">${tx.title}</p>
              <p class="text-[8px] opacity-75 font-semibold">${tx.date}</p>
            </div>
            <div class="text-right">
              <p class="font-black ${color}">${sign}${formatCurrency(Math.abs(tx.amount))}</p>
              <p class="text-[8px] text-emerald-100 opacity-90 font-bold">${tx.status}</p>
            </div>
          </div>
        `;
      });
      recentItems.innerHTML = html;
    }
  } else {
    recentBox.classList.add('hidden');
  }
}

// Settings handlers
function renderSettings() {
  document.getElementById('homepage-toggle').checked = state.recentTransactionsOnHomepage;
}

function toggleHomepageRecentTransactions() {
  state.recentTransactionsOnHomepage = document.getElementById('homepage-toggle').checked;
  localStorage.setItem('opay_recent_home', JSON.stringify(state.recentTransactionsOnHomepage));
  renderMiniHistoryOnHome();
}