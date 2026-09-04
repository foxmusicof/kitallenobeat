(function () {
  "use strict";

  const PRODUCTS = {
    bass:    { name: "BASS LOOP — ALLÊ NO BEAT", amount: "R$ 34,99", qr: "assets/pix-bass.png" },
    gtr:     { name: "GTR LOOP — ALLÊ NO BEAT", amount: "R$ 34,99", qr: "assets/pix-gtr.png" },
    bateria: { name: "BATERIA LOOP — ALLÊ NO BEAT", amount: "R$ 49,99", qr: "assets/pix-bateria.png" },
    sanfona: { name: "SANFONA LOOP — ALLÊ NO BEAT", amount: "R$ 34,99", qr: "assets/pix-sanfona.png" },
    sax:     { name: "SAX — ALLÊ NO BEAT", amount: "R$ 24,99", qr: "assets/pix-sax.png" },
    todos:   { name: "TODOS OS KITS — ALLÊ NO BEAT", amount: "R$ 129,00", qr: "assets/pix-todos.png" }
  };

  const DRIVE_LINKS = {
    todos: "", sax: "", sanfona: "", bateria: "", gtr: "", bass: ""
  };

  function initPurchaseButtons() {
    const modal = document.getElementById("purchaseModal");
    if (!modal) return;

    const formArea = document.getElementById("purchaseFormArea");
    const form = document.getElementById("purchaseForm");
    const pixStep = document.getElementById("pixStep");
    const paymentSent = document.getElementById("paymentSent");
    const title = document.getElementById("purchaseProduct");
    const pixProduct = document.getElementById("pixProduct");
    const pixAmount = document.getElementById("pixAmount");
    const pixQr = document.getElementById("pixQr");
    const pixCopy = document.getElementById("pixCopy");
    const copyBtn = document.getElementById("copyPixBtn");
    const paidBtn = document.getElementById("paidBtn");
    const backBtn = document.getElementById("backPurchaseBtn");
    const finishBtn = document.getElementById("finishPurchaseBtn");
    const accessArea = document.getElementById("productAccessArea");
    const closeBtn = document.getElementById("closePurchase");
    const buyerName = document.getElementById("buyerName");
    const buyerPhone = document.getElementById("buyerPhone");
    const buyerEmail = document.getElementById("buyerEmail");

    let selected = null;

    function openPurchase(key) {
      const p = PRODUCTS[key];
      if (!p) return;

      selected = key;
      modal.hidden = false;
      document.body.classList.add("modal-open");

      formArea.hidden = false;
      form.hidden = false;
      pixStep.hidden = true;
      paymentSent.hidden = true;
      title.textContent = p.name + " — " + p.amount;

      try {
        const saved = JSON.parse(localStorage.getItem("fox_purchase_buyer") || "{}");
        buyerName.value = saved.name || "";
        buyerPhone.value = saved.phone || "";
        buyerEmail.value = saved.email || "";
      } catch (_) {}

      setTimeout(function () { buyerName.focus(); }, 50);
    }

    function closePurchase() {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      selected = null;
    }

    function showPix() {
      const p = PRODUCTS[selected];
      if (!p) return;

      localStorage.setItem("fox_purchase_buyer", JSON.stringify({
        name: buyerName.value.trim(),
        phone: buyerPhone.value.trim(),
        email: buyerEmail.value.trim().toLowerCase()
      }));

      pixProduct.textContent = p.name;
      pixAmount.textContent = p.amount;
      pixQr.src = p.qr;

      const payloads = window.FOX_PIX_PAYLOADS || {};
      pixCopy.value = payloads[selected] || "";
      form.hidden = true;
      pixStep.hidden = false;
      paymentSent.hidden = true;
    }

    function showPaid() {
      const p = PRODUCTS[selected];
      if (!p) return;

      let purchases = [];
      try { purchases = JSON.parse(localStorage.getItem("fox_local_purchases") || "[]"); } catch (_) {}

      if (!purchases.some(function (x) { return x.productKey === selected; })) {
        purchases.push({
          productKey: selected,
          name: p.name,
          email: buyerEmail.value.trim().toLowerCase(),
          savedAt: new Date().toISOString()
        });
        localStorage.setItem("fox_local_purchases", JSON.stringify(purchases));
      }

      accessArea.innerHTML = "";
      const card = document.createElement("div");
      card.className = "product-access-card";

      const strong = document.createElement("strong");
      strong.textContent = p.name;
      card.appendChild(strong);

      const drive = DRIVE_LINKS[selected];
      if (drive) {
        const link = document.createElement("a");
        link.href = drive;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "ACESSAR MEU KIT";
        card.appendChild(link);
      } else {
        const missing = document.createElement("div");
        missing.className = "drive-missing";
        missing.textContent = "O link do Google Drive deste produto ainda não foi configurado.";
        card.appendChild(missing);
      }

      accessArea.appendChild(card);
      pixStep.hidden = true;
      paymentSent.hidden = false;
    }

    document.querySelectorAll(".buy-btn[data-buy-product]").forEach(function (button) {
      button.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPurchase(button.getAttribute("data-buy-product"));
      };
    });

    closeBtn.onclick = closePurchase;

    modal.onclick = function (event) {
      if (event.target === modal) closePurchase();
    };

    form.onsubmit = function (event) {
      event.preventDefault();
      if (form.checkValidity()) showPix();
      else form.reportValidity();
    };

    copyBtn.onclick = async function () {
      if (!pixCopy.value) return;
      try {
        await navigator.clipboard.writeText(pixCopy.value);
      } catch (_) {
        pixCopy.focus();
        pixCopy.select();
        document.execCommand("copy");
      }
      copyBtn.textContent = "COPIADO!";
      setTimeout(function () { copyBtn.textContent = "COPIAR"; }, 1600);
    };

    paidBtn.onclick = showPaid;

    backBtn.onclick = function () {
      pixStep.hidden = true;
      form.hidden = false;
    };

    finishBtn.onclick = closePurchase;

    window.openPurchase = openPurchase;

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) closePurchase();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPurchaseButtons);
  } else {
    initPurchaseButtons();
  }
})();