const API_BASE = "https://foxmusicof-foxmusic-gifthub-backend.contatozoh.workers.dev";

const PRODUCT_INFO = {
  bass: { name: "BASS LOOP — ALLÊ NO BEAT" },
  gtr: { name: "GTR LOOP — ALLÊ NO BEAT" },
  bateria: { name: "BATERIA LOOP — ALLÊ NO BEAT" },
  sanfona: { name: "SANFONA LOOP — ALLÊ NO BEAT" },
  sax: { name: "SAX — ALLÊ NO BEAT" },
  todos: { name: "TODOS OS KITS — ALLÊ NO BEAT" }
};

const accessButtons = document.querySelectorAll(".access-btn");
const toast = document.getElementById("toast");
const modal = document.getElementById("loginModal");
const closeLogin = document.getElementById("closeLogin");
const clientAreaBtn = document.getElementById("clientAreaBtn");
const emailForm = document.getElementById("emailForm");
const codeForm = document.getElementById("codeForm");
const accountArea = document.getElementById("accountArea");
const loginEmail = document.getElementById("loginEmail");
const loginCode = document.getElementById("loginCode");
const loginMessage = document.getElementById("loginMessage");
const modalStatus = document.getElementById("modalStatus");
const accountEmail = document.getElementById("accountEmail");
const accessList = document.getElementById("accessList");
const resendCode = document.getElementById("resendCode");
const logoutBtn = document.getElementById("logoutBtn");

let pendingProduct = null;
let currentEmail = "";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__foxToastTimer);
  window.__foxToastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

function setStatus(message, error = false) {
  modalStatus.textContent = message;
  modalStatus.classList.toggle("error", error);
}

function openModal(productKey = null) {
  pendingProduct = productKey;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  setStatus("");

  const token = localStorage.getItem("fox_music_session");
  const savedEmail = localStorage.getItem("fox_music_email");

  if (token && savedEmail) {
    currentEmail = savedEmail;
    loadAccount();
    return;
  }

  emailForm.hidden = false;
  codeForm.hidden = true;
  accountArea.hidden = true;
  loginMessage.textContent = "Digite o e-mail usado na compra para receber um código de acesso.";
  loginEmail.value = savedEmail || "";
  setTimeout(() => loginEmail.focus(), 50);
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  pendingProduct = null;
  setStatus("");
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
  try {
    data = await response.json();
  } catch {
    data = { ok: false, error: "Resposta inválida do servidor." };
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

async function requestAccess(email) {
  return api("/api/request-access", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

async function verifyAccess(email, code) {
  return api("/api/verify-access", {
    method: "POST",
    body: JSON.stringify({ email, code })
  });
}

async function getAccess() {
  const token = localStorage.getItem("fox_music_session");
  return api("/api/access", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function logout() {
  const token = localStorage.getItem("fox_music_session");
  if (token) {
    try {
      await api("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
  }
  localStorage.removeItem("fox_music_session");
  localStorage.removeItem("fox_music_email");
  currentEmail = "";
}

function normalizeProducts(data) {
  const list = data.products || data.entitlements || data.access || [];
  if (Array.isArray(list)) return list;
  return [];
}

function productKeyFromItem(item) {
  return String(item.product_key || item.key || item.product || "").toLowerCase();
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
      <button type="button" data-download="${escapeHtml(key)}">DOWNLOAD</button>
    `;
    row.querySelector("button").addEventListener("click", () => downloadProduct(key));
    accessList.appendChild(row);
  }
}

async function loadAccount() {
  emailForm.hidden = true;
  codeForm.hidden = true;
  accountArea.hidden = false;
  accountEmail.textContent = currentEmail;
  loginMessage.textContent = "Seus produtos com acesso ativo:";

  try {
    const data = await getAccess();
    renderAccess(normalizeProducts(data));

    if (pendingProduct) {
      const available = normalizeProducts(data).some(
        item => productKeyFromItem(item) === pendingProduct
      );

      if (available) {
        await downloadProduct(pendingProduct);
      } else {
        setStatus("Este kit não está liberado para este e-mail.", true);
      }
    }
  } catch (error) {
    localStorage.removeItem("fox_music_session");
    accountArea.hidden = true;
    emailForm.hidden = false;
    codeForm.hidden = true;
    setStatus("Sua sessão expirou. Solicite um novo código.", true);
  }
}

async function downloadProduct(productKey) {
  const token = localStorage.getItem("fox_music_session");
  if (!token) {
    openModal(productKey);
    return;
  }

  setStatus("Preparando seu download...");

  try {
    const response = await fetch(
      `${API_BASE}/api/download?product=${encodeURIComponent(productKey)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await response.json();

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Não foi possível liberar o download.");
    }

    if (!data.download_url) {
      throw new Error("O servidor não retornou o link de download.");
    }

    window.location.href = data.download_url;
    setStatus("Download liberado.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

accessButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openModal(button.dataset.product);
  });
});

clientAreaBtn.addEventListener("click", () => openModal());

closeLogin.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = loginEmail.value.trim().toLowerCase();
  if (!email) return;

  const submit = emailForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setStatus("Enviando seu código...");

  try {
    await requestAccess(email);
    currentEmail = email;
    localStorage.setItem("fox_music_email", email);

    emailForm.hidden = true;
    codeForm.hidden = false;
    loginMessage.textContent = `Enviamos um código para ${email}.`;
    loginCode.value = "";
    loginCode.focus();
    setStatus("Código enviado. Confira seu e-mail.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = currentEmail || loginEmail.value.trim().toLowerCase();
  const code = loginCode.value.trim();

  if (!email || !/^\d{6}$/.test(code)) {
    setStatus("Digite o código de 6 números recebido por e-mail.", true);
    return;
  }

  const submit = codeForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setStatus("Validando código...");

  try {
    const data = await verifyAccess(email, code);

    if (!data.token) {
      throw new Error("O servidor não retornou a sessão de acesso.");
    }

    localStorage.setItem("fox_music_session", data.token);
    localStorage.setItem("fox_music_email", email);
    currentEmail = email;

    await loadAccount();
    setStatus("Login realizado com sucesso.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

resendCode.addEventListener("click", async () => {
  const email = currentEmail || loginEmail.value.trim().toLowerCase();
  if (!email) return;

  resendCode.disabled = true;
  setStatus("Enviando um novo código...");

  try {
    await requestAccess(email);
    loginCode.value = "";
    loginCode.focus();
    setStatus("Novo código enviado. Use somente o código mais recente.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setTimeout(() => {
      resendCode.disabled = false;
    }, 2500);
  }
});

logoutBtn.addEventListener("click", async () => {
  await logout();
  emailForm.hidden = false;
  codeForm.hidden = true;
  accountArea.hidden = true;
  loginEmail.value = "";
  loginCode.value = "";
  loginMessage.textContent = "Digite o e-mail usado na compra para receber um código de acesso.";
  setStatus("Você saiu da sua conta.");
});

window.addEventListener("load", () => {
  const token = localStorage.getItem("fox_music_session");
  const email = localStorage.getItem("fox_music_email");
  if (token && email) {
    currentEmail = email;
  }
});
