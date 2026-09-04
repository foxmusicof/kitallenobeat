const API_BASE = "https://foxmusicof-foxmusic-gifthub-backend.contatozoh.workers.dev";

const PRODUCT_INFO = {
  bass: { name: "BASS LOOP — ALLÊ NO BEAT", amount: 34.99, amountLabel: "R$ 34,99", qr: "assets/pix-bass.png" },
  gtr: { name: "GTR LOOP — ALLÊ NO BEAT", amount: 34.99, amountLabel: "R$ 34,99", qr: "assets/pix-gtr.png" },
  bateria: { name: "BATERIA LOOP — ALLÊ NO BEAT", amount: 49.99, amountLabel: "R$ 49,99", qr: "assets/pix-bateria.png" },
  sanfona: { name: "SANFONA LOOP — ALLÊ NO BEAT", amount: 34.99, amountLabel: "R$ 34,99", qr: "assets/pix-sanfona.png" },
  sax: { name: "SAX — ALLÊ NO BEAT", amount: 24.99, amountLabel: "R$ 24,99", qr: "assets/pix-sax.png" },
  todos: { name: "TODOS OS KITS — ALLÊ NO BEAT", amount: 129.00, amountLabel: "R$ 129,00", qr: "assets/pix-todos.png" }
};

const accessButtons = document.querySelectorAll(".access-btn");
const toast = document.getElementById("toast");
const modal = document.getElementById("loginModal");
const closeLogin = document.getElementById("closeLogin");
const clientAreaBtn = document.getElementById("clientAreaBtn");
const loginForm = document.getElementById("loginForm");
const passwordForm = document.getElementById("passwordForm");
const accountArea = document.getElementById("accountArea");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const registerEmail = document.getElementById("registerEmail");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const createPasswordBtn = document.getElementById("createPasswordBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const loginMessage = document.getElementById("loginMessage");
const modalStatus = document.getElementById("modalStatus");
const accountEmail = document.getElementById("accountEmail");
const accessList = document.getElementById("accessList");
const logoutBtn = document.getElementById("logoutBtn");

let pendingProduct = null;
let currentEmail = "";

function setStatus(message, error = false) {
  modalStatus.textContent = message;
  modalStatus.classList.toggle("error", error);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__foxToastTimer);
  window.__foxToastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  let data = {};
  try { data = await response.json(); }
  catch { data = { ok: false, error: "Resposta inválida do servidor." }; }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Erro ${response.status}`);
  }
  return data;
}

function getStoredSession() {
  return {
    token: localStorage.getItem("fox_music_session") || "",
    email: localStorage.getItem("fox_music_email") || ""
  };
}

function saveSession(data, email) {
  localStorage.setItem("fox_music_session", data.token);
  localStorage.setItem("fox_music_email", email);
  currentEmail = email;
}

function clearSession() {
  localStorage.removeItem("fox_music_session");
  localStorage.removeItem("fox_music_email");
  currentEmail = "";
}

function resetForms() {
  loginForm.hidden = false;
  passwordForm.hidden = true;
  accountArea.hidden = true;
  loginMessage.textContent = "Entre com o e-mail usado na compra e sua senha.";
  const savedEmail = localStorage.getItem("fox_music_email") || "";
  loginEmail.value = savedEmail;
  loginPassword.value = "";
  registerEmail.value = savedEmail;
  newPassword.value = "";
  confirmPassword.value = "";
}

function openModal(productKey = null) {
  pendingProduct = productKey;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  setStatus("");

  const { token, email } = getStoredSession();
  if (token && email) {
    currentEmail = email;
    loadAccount();
    return;
  }

  resetForms();
  setTimeout(() => loginEmail.focus(), 50);
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  pendingProduct = null;
  setStatus("");
}

function normalizeProducts(data) {
  const list = data.products || data.entitlements || data.access || [];
  return Array.isArray(list) ? list : [];
}

function productKeyFromItem(item) {
  return String(item.product_key || item.key || item.product || "").toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAccess(products) {
  accessList.innerHTML = "";
  if (!products.length) {
    accessList.innerHTML = `<div class="empty-access">Nenhum kit com acesso ativo encontrado.</div>`;
    return;
  }

  const unique = new Map();
  for (const item of products) {
    const key = productKeyFromItem(item);
    if (key && PRODUCT_INFO[key]) unique.set(key, item);
  }

  for (const [key, item] of unique) {
    const name = item.product_name || PRODUCT_INFO[key].name;
    const row = document.createElement("div");
    row.className = "access-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(name)}</strong>
        <small>Acesso liberado</small>
      </div>
      <button type="button">DOWNLOAD</button>
    `;
    row.querySelector("button").addEventListener("click", () => downloadProduct(key));
    accessList.appendChild(row);
  }
}

async function loadAccount() {
  loginForm.hidden = true;
  passwordForm.hidden = true;
  accountArea.hidden = false;
  accountEmail.textContent = currentEmail;
  loginMessage.textContent = "Seus produtos com acesso ativo:";

  try {
    const data = await api("/api/access", {
      headers: { Authorization: `Bearer ${localStorage.getItem("fox_music_session")}` }
    });
    const products = normalizeProducts(data);
    renderAccess(products);

    if (pendingProduct) {
      const available = products.some(item => productKeyFromItem(item) === pendingProduct);
      if (available) await downloadProduct(pendingProduct);
      else setStatus("Este kit não está liberado para este e-mail.", true);
    }
  } catch (error) {
    clearSession();
    resetForms();
    setStatus("Sua sessão expirou. Entre novamente com sua senha.", true);
  }
}

function downloadProduct(productKey) {
  const drive = DRIVE_LINKS[productKey];
  if (drive) {
    window.open(drive, "_blank", "noopener,noreferrer");
  } else {
    setStatus("O link do Google Drive deste produto ainda não foi configurado.", true);
  }
}

// ===== COMPRA COM PIX ESTÁTICO =====
// Nesta etapa o pagamento é Pix estático. A confirmação bancária não é automática.
// Os links do Google Drive devem ser preenchidos em DRIVE_LINKS quando forem fornecidos.
const DRIVE_LINKS = {
  todos: "",
  sax: "",
  sanfona: "",
  bateria: "",
  gtr: "",
  bass: ""
};

const purchaseModal = document.getElementById("purchaseModal");
const closePurchase = document.getElementById("closePurchase");
const purchaseForm = document.getElementById("purchaseForm");
const pixStep = document.getElementById("pixStep");
const paymentSent = document.getElementById("paymentSent");
const purchaseProduct = document.getElementById("purchaseProduct");
const pixProduct = document.getElementById("pixProduct");
const pixAmount = document.getElementById("pixAmount");
const pixQr = document.getElementById("pixQr");
const pixCopy = document.getElementById("pixCopy");
const copyPixBtn = document.getElementById("copyPixBtn");
const paidBtn = document.getElementById("paidBtn");
const backPurchaseBtn = document.getElementById("backPurchaseBtn");
const finishPurchaseBtn = document.getElementById("finishPurchaseBtn");
const productAccessArea = document.getElementById("productAccessArea");
const purchaseFormArea = document.getElementById("purchaseFormArea");
const buyerName = document.getElementById("buyerName");
const buyerPhone = document.getElementById("buyerPhone");
const buyerEmail = document.getElementById("buyerEmail");
let purchaseProductKey = null;

function openPurchase(productKey){
  const p = PRODUCT_INFO[productKey];
  if (!p || !purchaseModal) return;
  purchaseProductKey = productKey;
  purchaseModal.hidden = false;
  document.body.classList.add("modal-open");
  purchaseFormArea.hidden = false;
  purchaseForm.hidden = false;
  pixStep.hidden = true;
  paymentSent.hidden = true;
  purchaseProduct.textContent = `${p.name} — ${p.amountLabel}`;

  try {
    const saved = JSON.parse(localStorage.getItem("fox_purchase_buyer") || "{}");
    buyerName.value = saved.name || "";
    buyerPhone.value = saved.phone || "";
    buyerEmail.value = saved.email || "";
  } catch {
    buyerName.value = buyerPhone.value = buyerEmail.value = "";
  }
  setTimeout(() => buyerName.focus(), 50);
}

function closePurchaseModal(){
  if (!purchaseModal) return;
  purchaseModal.hidden = true;
  document.body.classList.remove("modal-open");
  purchaseProductKey = null;
}

function showPix(){
  const p = PRODUCT_INFO[purchaseProductKey];
  if (!p) return;

  const buyer = {
    name: buyerName.value.trim(),
    phone: buyerPhone.value.trim(),
    email: buyerEmail.value.trim().toLowerCase()
  };
  localStorage.setItem("fox_purchase_buyer", JSON.stringify(buyer));

  pixProduct.textContent = p.name;
  pixAmount.textContent = p.amountLabel;
  pixQr.src = p.qr;
  pixCopy.value = (window.FOX_PIX_PAYLOADS || {})[purchaseProductKey] || "";
  purchaseFormArea.hidden = false;
  purchaseForm.hidden = true;
  pixStep.hidden = false;
  paymentSent.hidden = true;
}

function showPaymentSent(){
  const p = PRODUCT_INFO[purchaseProductKey];
  if (!p) return;

  const purchases = JSON.parse(localStorage.getItem("fox_local_purchases") || "[]");
  if (!purchases.some(x => x.productKey === purchaseProductKey)) {
    purchases.push({
      productKey: purchaseProductKey,
      name: p.name,
      email: buyerEmail.value.trim().toLowerCase(),
      savedAt: new Date().toISOString()
    });
    localStorage.setItem("fox_local_purchases", JSON.stringify(purchases));
  }

  productAccessArea.innerHTML = "";
  const card = document.createElement("div");
  card.className = "product-access-card";
  const title = document.createElement("strong");
  title.textContent = p.name;
  card.appendChild(title);

  const drive = DRIVE_LINKS[purchaseProductKey];
  if (drive) {
    const a = document.createElement("a");
    a.href = drive;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "ACESSAR MEU KIT";
    card.appendChild(a);
  } else {
    const missing = document.createElement("div");
    missing.className = "drive-missing";
    missing.textContent = "O link do Google Drive deste produto ainda não foi configurado.";
    card.appendChild(missing);
  }

  productAccessArea.appendChild(card);
  pixStep.hidden = true;
  paymentSent.hidden = false;
}

accessButtons.forEach(button => {
  button.addEventListener("click", () => openModal(button.dataset.product));
});

clientAreaBtn.addEventListener("click", () => openModal());
closeLogin.addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) closeModal(); });

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;
  if (!email || !password) return;

  const submit = loginForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setStatus("Entrando...");
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (!data.token) throw new Error("O servidor não retornou a sessão de acesso.");
    saveSession(data, email);
    await loadAccount();
    setStatus("Login realizado com sucesso.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

createPasswordBtn.addEventListener("click", () => {
  const email = loginEmail.value.trim().toLowerCase();
  registerEmail.value = email;
  loginForm.hidden = true;
  passwordForm.hidden = false;
  accountArea.hidden = true;
  loginMessage.textContent = "CRIAR SENHA — PRIMEIRO ACESSO";
  setStatus("");
  setTimeout(() => registerEmail.focus(), 50);
});

backToLoginBtn.addEventListener("click", () => {
  resetForms();
  setStatus("");
  setTimeout(() => loginEmail.focus(), 50);
});

passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = registerEmail.value.trim().toLowerCase();
  const password = newPassword.value;
  const confirmation = confirmPassword.value;

  if (password !== confirmation) {
    setStatus("As senhas não coincidem.", true);
    return;
  }
  if (password.length < 8) {
    setStatus("A senha precisa ter pelo menos 8 caracteres.", true);
    return;
  }

  const submit = passwordForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setStatus("Criando sua senha...");
  try {
    const data = await api("/api/set-password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (!data.token) throw new Error("O servidor não retornou a sessão de acesso.");
    saveSession(data, email);
    await loadAccount();
    setStatus("Senha criada com sucesso.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  const token = localStorage.getItem("fox_music_session");
  if (token) {
    try {
      await api("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
  }
  clearSession();
  resetForms();
  setStatus("Você saiu da sua conta.");
});

window.addEventListener("load", () => {
  const { token, email } = getStoredSession();
  if (token && email) currentEmail = email;
});
