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