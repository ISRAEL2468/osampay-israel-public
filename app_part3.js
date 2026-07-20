// Validation & Resolve
async function checkTransferValidation() {
  const acc = document.getElementById('transfer-acc-no').value.trim();
  const bank = state.transferFlow.bank;
  const box = document.getElementById('transfer-resolve-box');
  const btn = document.getElementById('transfer-next-btn');

  if (acc.length === 10 && bank) {
    box.className = "p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-400 flex items-center space-x-2";
    box.innerHTML = "Resolving account name...";
    box.classList.remove('hidden');
    
    try {
      const res = await fetch(`/api/resolve-account?account_number=${acc}&bank_code=${bank.code}`);
      const data = await res.json();
      if (data.success) {
        box.className = "p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold flex items-center space-x-2";
        box.innerHTML = `<span>✓</span><span>${data.name}</span>`;
        state.transferFlow.account = acc;
        state.transferFlow.name = data.name;
        btn.disabled = false;
      } else {
        box.className = "p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-xs font-bold flex items-center space-x-2";
        box.innerHTML = `<span>⚠️</span><span>${data.error}</span>`;
        btn.disabled = true;
      }
    } catch (err) {
      box.innerHTML = "Error contacting API";
      btn.disabled = true;
    }
  } else {
    box.classList.add('hidden');
    btn.disabled = true;
  }
}

// Attach event listener
setTimeout(() => {
  const transAccInput = document.getElementById('transfer-acc-no');
  if (transAccInput) {
    transAccInput.addEventListener('input', checkTransferValidation);
  }
}, 500);

function handleTransferNext() {
  document.getElementById('amount-recipient-name').innerText = state.transferFlow.name;
  document.getElementById('amount-recipient-desc').innerText = `${state.transferFlow.account} ${state.transferFlow.bank.name}`;
  document.getElementById('amount-recipient-logo').innerText = state.transferFlow.bank.initials;
  document.getElementById('amount-recipient-logo').style.backgroundColor = state.transferFlow.bank.bg;
  document.getElementById('amount-recipient-logo').style.color = '#ffffff';
  
  document.getElementById('transfer-amount').value = '';
  document.getElementById('transfer-remark').value = '';
  document.getElementById('transfer-confirm-btn').disabled = true;
  
  changeScreen('amount-input');
}

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

function setQuickRemark(rem) {
  document.getElementById('transfer-remark').value = rem;
}

// Modal Reminders
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
  openPaymentSummaryModal();
}

// Payment Summary
function openPaymentSummaryModal() {
  const amt = state.transferFlow.amount;
  document.getElementById('sum-amount-header').innerText = formatCurrency(amt);
  document.getElementById('sum-bank').innerText = state.transferFlow.bank.name;
  document.getElementById('sum-acc-no').innerText = state.transferFlow.account;
  document.getElementById('sum-name').innerText = state.transferFlow.name;
  document.getElementById('sum-balance-label').innerText = `Available Balance (${formatCurrency(state.user.balance)})`;
  document.getElementById('sum-owealth-deduction').innerText = `OWealth (${formatCurrency(state.user.balance)}) -${formatCurrency(amt)}`;

  document.getElementById('modal-payment-summary').classList.remove('hidden');
}

function closePaymentSummaryModal() {
  document.getElementById('modal-payment-summary').classList.add('hidden');
}

// PIN Entry
function openPinModal() {
  closePaymentSummaryModal();
  state.currentPin = '';
  updatePinDots();
  document.getElementById('modal-pin-entry').classList.remove('hidden');
}

function closePinModal() {
  document.getElementById('modal-pin-entry').classList.add('hidden');
}

function typePinDigit(digit) {
  if (state.currentPin.length < 4) {
    state.currentPin += digit;
    updatePinDots();
    if (state.currentPin.length === 4) {
      setTimeout(executeTransfer, 300);
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
    if (i <= state.currentPin.length) {
      dot.innerText = '●';
      dot.classList.add('border-[#00b073]', 'bg-emerald-50');
    } else {
      dot.innerText = '';
      dot.classList.remove('border-[#00b073]', 'bg-emerald-50');
    }
  }
}

function executeTransfer() {
  if (state.currentPin !== state.user.pin) {
    alert("Incorrect Payment PIN! Please try again.");
    state.currentPin = '';
    updatePinDots();
    return;
  }

  closePinModal();
  const amt = state.transferFlow.amount;
  state.user.balance -= amt;
  
  const txNo = '2607' + Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
  const sessionID = '100004' + Math.floor(10000000000000000000 + Math.random() * 9000000000000000000).toString();
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
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
  
  const bonus = {
    title: "OWealth Interest Earned",
    amount: 0.09,
    date: dateStr,
    status: "Successful"
  };
  state.user.balance += 0.09;
  state.user.transactions.unshift(bonus);

  state.registeredUsers[state.user.phone] = state.user;
  saveUsers();

  document.getElementById('success-amount').innerText = formatCurrency(amt).substring(1);
  
  document.getElementById('td-transfer-header').innerText = `Transfer to ${state.transferFlow.name}`;
  document.getElementById('td-amount').innerText = formatCurrency(amt);
  document.getElementById('td-recipient-details').innerHTML = `${state.transferFlow.name}<br>${state.transferFlow.bank.name} | ${state.transferFlow.account}`;
  document.getElementById('td-trans-no').innerText = txNo;
  document.getElementById('td-session-id').innerText = sessionID;
  document.getElementById('td-date').innerText = dateStr;
  document.getElementById('td-logo').innerText = state.transferFlow.bank.initials;
  document.getElementById('td-logo').style.backgroundColor = state.transferFlow.bank.bg;

  document.getElementById('receipt-amount').innerText = formatCurrency(amt);
  document.getElementById('receipt-time').innerText = dateStr;
  document.getElementById('receipt-recipient').innerHTML = `${state.transferFlow.name}<br>${state.transferFlow.bank.name} | ${state.transferFlow.account}`;
  document.getElementById('receipt-sender').innerHTML = `${state.user.name}<br>OPay | ${state.user.phone.substring(0, 3)}****${state.user.phone.substring(7)}`;
  document.getElementById('receipt-trans-no').innerText = txNo;
  document.getElementById('receipt-session-id').innerText = sessionID;

  changeScreen('success');
}

function resetTransferFlow() {
  changeScreen('dashboard');
}

// Render History
function renderHistory() {
  const container = document.getElementById('history-items-container');
  const txs = state.user ? (state.user.transactions || []) : [];
  
  let totalIn = 0;
  let totalOut = 0;
  let html = '';

  if (txs.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-gray-400 font-bold">No transactions found</div>`;
    document.getElementById('history-total-in').innerText = formatCurrency(0);
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
      <div class="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg">${icon}</div>
          <div>
            <h4 class="text-xs font-bold text-gray-800">${t.title}</h4>
            <p class="text-[10px] text-gray-400 mt-0.5">${t.date}</p>
          </div>
        </div>
        <div class="text-right">
          <h4 class="text-sm font-extrabold ${color}">${sign}${formatCurrency(absAmt).substring(1)}</h4>
          <span class="inline-block bg-emerald-50 text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5">Successful</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.getElementById('history-total-in').innerText = formatCurrency(totalIn);
  document.getElementById('history-total-out').innerText = formatCurrency(totalOut);
}