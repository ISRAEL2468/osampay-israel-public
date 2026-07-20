// DRIVER DRAWERS & MODAL MANAGEMENT (ANIMATION SUPPORTED)
function openTransferDrawer() {
  const drawer = document.getElementById('drawer-transfer');
  drawer.classList.remove('hidden');
  setTimeout(() => {
    drawer.classList.remove('drawer-hidden');
    drawer.classList.add('drawer-visible');
  }, 10);
  renderTransferBank();
}

function closeTransferDrawer() {
  const drawer = document.getElementById('drawer-transfer');
  drawer.classList.remove('drawer-visible');
  drawer.classList.add('drawer-hidden');
  setTimeout(() => {
    drawer.classList.add('hidden');
  }, 300);
}

// Bank selections
function openBankModal() {
  const modal = document.getElementById('modal-bank-selector');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('drawer-hidden');
    modal.classList.add('drawer-visible');
  }, 10);
}

function closeBankModal() {
  const modal = document.getElementById('modal-bank-selector');
  modal.classList.remove('drawer-visible');
  modal.classList.add('drawer-hidden');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
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

// INLINE REAL-TIME ACCOUNT RESOLUTION
async function checkTransferValidation() {
  const acc = document.getElementById('transfer-acc-no').value.trim();
  const bank = state.transferFlow.bank;
  const box = document.getElementById('transfer-resolve-box');
  const amountCard = document.getElementById('transfer-amount-card');
  const btn = document.getElementById('transfer-confirm-btn');

  if (acc.length === 10 && bank) {
    box.className = "p-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-400 flex items-center space-x-2";
    box.innerHTML = `<span>⏳</span><span>Verifying "${acc}" with ${bank.name} network...</span>`;
    box.classList.remove('hidden');
    
    try {
      const res = await fetch(`/api/resolve-account?account_number=${acc}&bank_code=${bank.code}`);
      const data = await res.json();
      if (data.success) {
        box.className = "p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[#00b073] text-[11px] font-black flex items-center space-x-2";
        box.innerHTML = `<span>✓ Verified:</span><span class="underline">${data.name}</span>`;
        state.transferFlow.account = acc;
        state.transferFlow.name = data.name;
        
        // REVEAL amount and remark inline in the drawer!
        amountCard.classList.remove('hidden');
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-remark').value = '';
        btn.disabled = true;
      } else {
        box.className = "p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-[11px] font-bold flex items-center space-x-2";
        box.innerHTML = `<span>⚠️ Network error:</span><span>${data.error}</span>`;
        amountCard.classList.add('hidden');
        btn.disabled = true;
      }
    } catch (err) {
      box.innerHTML = "Error contacting API";
      amountCard.classList.add('hidden');
      btn.disabled = true;
    }
  } else {
    box.classList.add('hidden');
    amountCard.classList.add('hidden');
    btn.disabled = true;
  }
}

// Add event listener at startup
setTimeout(() => {
  const transAccInput = document.getElementById('transfer-acc-no');
  if (transAccInput) {
    transAccInput.addEventListener('input', checkTransferValidation);
  }
}, 500);

function setQuickAmount(amt) {
  document.getElementById('transfer-amount').value = amt;
  checkAmountInput();
}

function checkAmountInput() {
  const val = parseFloat(document.getElementById('transfer-amount').value);
  const btn = document.getElementById('transfer-confirm-btn');
  if (val >= 100 && val <= 5000000 && state.user && state.user.balance >= val) {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// CONFIRMATION DETAILS MODAL
function openReminderModal() {
  const amt = parseFloat(document.getElementById('transfer-amount').value);
  state.transferFlow.amount = amt;
  state.transferFlow.remark = document.getElementById('transfer-remark').value.trim() || 'Transfer';

  document.getElementById('rem-name').innerText = state.transferFlow.name;
  document.getElementById('rem-acc-no').innerText = state.transferFlow.account;
  document.getElementById('rem-bank').innerText = state.transferFlow.bank.name;
  document.getElementById('rem-amount').innerText = formatCurrency(amt);

  document.getElementById('modal-reminder').classList.remove('hidden');
}

function closeReminderModal() {
  document.getElementById('modal-reminder').classList.add('hidden');
}

function confirmReminderModal() {
  closeReminderModal();
  openPinModal();
}

// PIN KEYPAD AND PAYMENT SUMMARY
function openPinModal() {
  const amt = state.transferFlow.amount;
  document.getElementById('sum-amount-header').innerText = formatCurrency(amt);
  document.getElementById('sum-bank').innerText = state.transferFlow.bank.name;
  document.getElementById('sum-acc-no').innerText = state.transferFlow.account;
  document.getElementById('sum-name').innerText = state.transferFlow.name;
  document.getElementById('sum-balance-label').innerText = `Available Wallet Balance (${formatCurrency(state.user.balance)})`;
  document.getElementById('sum-owealth-deduction').innerText = `OWealth Balance Deduct -${formatCurrency(amt)}`;

  state.currentPin = '';
  updatePinDots();
  
  const modal = document.getElementById('modal-pin-entry');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('drawer-hidden');
    modal.classList.add('drawer-visible');
  }, 10);
}

function closePinModal() {
  const modal = document.getElementById('modal-pin-entry');
  modal.classList.remove('drawer-visible');
  modal.classList.add('drawer-hidden');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

function typePinDigit(digit) {
  if (state.currentPin.length < 4) {
    state.currentPin += digit;
    updatePinDots();
    if (state.currentPin.length === 4) {
      setTimeout(executeTransfer, 350);
    }
  }
}

function deletePinDigit() {
  if (state.currentPin.length > 0) {
    state.currentPin = state.currentPin.slice(0, -1);
    updatePinDots();
  }
}

function updatePinDots() {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById('pin-dot-' + i);
    if (dot) {
      if (i <= state.currentPin.length) {
        dot.innerText = '●';
        dot.classList.add('border-[#00b073]', 'bg-emerald-50', 'text-[#00b073]');
      } else {
        dot.innerText = '';
        dot.classList.remove('border-[#00b073]', 'bg-emerald-50', 'text-[#00b073]');
      }
    }
  }
}

// EXECUTE SECURE DEDUCTION & GENERATE RECEIPT
function executeTransfer() {
  if (state.currentPin !== state.user.pin) {
    alert("Incorrect Security Payment PIN! Please try again.");
    state.currentPin = '';
    updatePinDots();
    return;
  }

  closePinModal();
  closeTransferDrawer();
  
  const amt = state.transferFlow.amount;
  state.user.balance -= amt;
  
  // Real-looking OPay Transaction numbers
  const txNo = '2607' + Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
  const sessionID = '100004' + Math.floor(10000000000000000000 + Math.random() * 9000000000000000000).toString();
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const timeOnly = new Date().toLocaleDateString('en-US') + ' ' + new Date().toTimeString().split(' ')[0];

  const transaction = {
    title: `Transfer to ${state.transferFlow.name}`,
    name: state.transferFlow.name,
    account: state.transferFlow.account,
    bank: state.transferFlow.bank.name,
    amount: -amt,
    date: dateStr,
    time: timeOnly,
    transNo: txNo,
    sessionId: sessionID,
    status: 'Successful'
  };

  state.user.transactions = state.user.transactions || [];
  state.user.transactions.unshift(transaction);
  
  // Add daily micro OWealth cashbacks!
  const cashback = {
    title: "OWealth Interest Earned",
    amount: 0.15,
    date: dateStr,
    status: "Successful"
  };
  state.user.balance += 0.15;
  state.user.transactions.unshift(cashback);

  state.registeredUsers[state.user.phone] = state.user;
  saveUsers();

  // Populate dynamic receipts elements
  document.getElementById('success-amount').innerText = amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  document.getElementById('receipt-amount').innerText = formatCurrency(amt);
  document.getElementById('receipt-time').innerText = dateStr;
  document.getElementById('receipt-recipient').innerHTML = `${state.transferFlow.name}<br><span class="opacity-60 text-[9px]">${state.transferFlow.bank.name} | ${state.transferFlow.account}</span>`;
  document.getElementById('receipt-sender').innerHTML = `${state.user.name}<br><span class="opacity-60 text-[9px]">OPay Account | ${state.user.phone.substring(0, 3)}****${state.user.phone.substring(7)}</span>`;
  document.getElementById('receipt-trans-no').innerText = txNo;
  document.getElementById('receipt-session-id').innerText = sessionID;

  // Reveal animated Success screen overlay
  const successScreen = document.getElementById('screen-success');
  successScreen.classList.remove('hidden');
  successScreen.classList.add('active');
}

function resetTransferFlow() {
  document.getElementById('screen-success').classList.add('hidden');
  document.getElementById('screen-success').classList.remove('active');
  renderDashboard();
  switchTab('home');
}

// Populates transfer drawer beneficiaries
function renderTransferBank() {
  state.transferFlow = { bank: null, account: '', name: '', amount: 0, remark: '' };
  document.getElementById('transfer-acc-no').value = '';
  const logo = document.getElementById('selected-bank-logo');
  logo.innerText = '?';
  logo.style.backgroundColor = '';
  logo.style.color = '';
  document.getElementById('selected-bank-name').innerText = 'Select Bank';
  document.getElementById('transfer-resolve-box').classList.add('hidden');
  document.getElementById('transfer-amount-card').classList.add('hidden');
  document.getElementById('transfer-confirm-btn').disabled = true;

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

  // Default suggestions if history is fresh
  if (recents.length === 0) {
    recents.push({ name: 'MIRACLE EDOYIN', account: '8275811964', bank: 'MONIEPOINT' });
    recents.push({ name: 'JENNIFER ISOKEN IDAHOSA', account: '2207814950', bank: 'UBA' });
  }

  let html = '';
  recents.slice(0, 4).forEach(r => {
    html += `
      <div onclick="clickRecent('${r.account}', '${r.bank}')" class="p-3 bg-white rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-50 border border-gray-100 transition shadow-sm">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-emerald-50 text-[#00b073] flex items-center justify-center font-extrabold text-xs">${r.bank[0]}</div>
          <div>
            <h4 class="text-xs font-bold text-gray-800">${r.name}</h4>
            <p class="text-[9px] text-gray-400 font-semibold">${r.account} • ${r.bank}</p>
          </div>
        </div>
        <span class="text-gray-400 font-bold text-xs">&gt;</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function clickRecent(acc, bankName) {
  document.getElementById('transfer-acc-no').value = acc;
  let code = '50515';
  let cleanBank = 'Moniepoint';
  if (bankName.toUpperCase().includes('UBA') || bankName.toUpperCase().includes('UNITED')) {
    code = '033';
    cleanBank = 'United Bank for Africa';
  }
  if (bankName.toUpperCase().includes('OPAY')) {
    code = '999992';
    cleanBank = 'OPay';
  }
  selectBank(code, cleanBank, cleanBank[0], code==='033' ? '#b91c1c' : '#00b073');
}

// Render dynamic transactions history tab
function renderHistory() {
  const container = document.getElementById('history-items-container');
  const txs = state.user ? (state.user.transactions || []) : [];
  
  let totalIn = 0;
  let totalOut = 0;
  let html = '';

  if (txs.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-gray-400 font-bold">No transactions found</div>`;
    document.getElementById('history-total-out').innerText = formatCurrency(0);
    return;
  }

  txs.forEach(t => {
    const isOut = t.amount < 0;
    const color = isOut ? 'text-gray-800' : 'text-emerald-500';
    const sign = isOut ? '-' : '+';
    const absAmt = Math.abs(t.amount);
    
    if (isOut) totalOut += absAmt;
    else totalIn += absAmt;

    let icon = '🎁';
    if (t.title.includes('Transfer')) icon = '⬆️';
    if (t.title.includes('OWealth')) icon = '⚡';

    html += `
      <div class="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg">${icon}</div>
          <div>
            <h4 class="text-xs font-bold text-gray-800">${t.title}</h4>
            <p class="text-[9px] text-gray-400 font-bold mt-0.5">${t.date}</p>
          </div>
        </div>
        <div class="text-right">
          <h4 class="text-xs font-black ${color}">${sign}${absAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          <span class="inline-block bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded mt-0.5">Successful</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.getElementById('history-total-out').innerText = formatCurrency(totalOut);
}