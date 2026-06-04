const PUBLIC_SITE_FALLBACK_URL = "https://etechworld.in/rent%20app";
const PUBLIC_DOCUMENT_SIZE_LIMIT = 4 * 1024 * 1024;

const publicMoneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

document.addEventListener("DOMContentLoaded", () => {
  initPublicPage().catch((error) => {
    console.error(error);
    setStatus("This page could not finish loading. Please open the link again.");
  });
});

async function initPublicPage() {
  const page = document.body.dataset.page;
  const payload = readSharePayload();

  if (!payload) {
    setStatus("This link is incomplete or could not be opened. Please ask the owner to send a fresh link.");
    return;
  }

  if (page === "portal") {
    await initPortalPage(payload);
    return;
  }

  if (page === "intake") {
    await initIntakePage(payload);
  }
}

async function initPortalPage(payload) {
  if (payload.t !== "portal" || !payload.pp || !payload.tn || !payload.b) {
    setStatus("This private tenant portal link is not valid.");
    return;
  }

  const model = await hydratePublicBrandProfile(mapPortalPayload(payload), "Private Rent Portal");

  if (!model.mobile) {
    setStatus("The owner needs to save your mobile number before this private portal can be opened.");
    return;
  }

  setStatus("This link is ready. Enter your mobile number to open your room record.");
  showElement("unlockCard");

  const unlockForm = document.getElementById("unlockForm");
  const unlockInput = document.getElementById("unlockMobileInput");
  const unlockError = document.getElementById("unlockError");

  unlockForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const entered = cleanDigits(unlockInput.value);
    if (!entered || entered !== model.mobile) {
      unlockError.hidden = false;
      unlockError.textContent = "This mobile number does not match the saved tenant record.";
      return;
    }

    unlockError.hidden = true;
    hideElement("unlockCard");
    showElement("portalCard");
    setStatus("Private tenant record opened.");
    renderPortal(model);
  });
}

async function initIntakePage(payload) {
  if (payload.t !== "intake" || !payload.pp) {
    setStatus("This tenant intake link is not valid.");
    return;
  }

  const model = await hydratePublicBrandProfile(mapIntakePayload(payload), "Tenant Intake Form");

  if (!model.requestInboxId) {
    setStatus("This intake link is not active yet. Please ask the owner for a fresh link.");
    return;
  }

  setStatus("Fill your move-in details and submit them directly to the owner dashboard.");
  showElement("intakeCard");

  const intro = document.getElementById("intakeIntroCopy");
  if (intro) {
    intro.textContent = `This form sends your details straight to ${model.ownerName} for ${model.propertyName}.`;
  }

  const captureButton = document.getElementById("intakeCaptureBtn");
  const fileInput = document.getElementById("intakeAadhaarFile");
  const captureInput = document.getElementById("intakeAadhaarCapture");
  const form = document.getElementById("intakeForm");
  const submitButton = form.querySelector('button[type="submit"]');

  if (captureButton && captureInput) {
    captureButton.addEventListener("click", () => captureInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files[0] && captureInput) {
        captureInput.value = "";
      }
      updateIntakeDocumentHint();
    });
  }

  if (captureInput) {
    captureInput.addEventListener("change", () => {
      if (captureInput.files[0] && fileInput) {
        fileInput.value = "";
      }
      updateIntakeDocumentHint();
    });
  }

  updateIntakeDocumentHint();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = {
      fullName: cleanString(document.getElementById("intakeName").value),
      mobile: cleanDigits(document.getElementById("intakeMobile").value),
      moveInDate: cleanString(document.getElementById("intakeMoveInDate").value),
      totalMembers: toWholeNumber(document.getElementById("intakeTotalMembers").value),
      aadhaarNumber: cleanDigits(document.getElementById("intakeIdNumber").value).slice(0, 12),
      address: cleanString(document.getElementById("intakeAddress").value),
      notes: cleanString(document.getElementById("intakeNotes").value)
    };

    if (!data.fullName || !data.mobile || !data.moveInDate) {
      setStatus("Please fill your name, mobile number, and move-in date before submitting.");
      return;
    }

    const selectedFile = getSelectedIntakeDocument();
    let aadhaarDocument = null;

    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setStatus("Please upload an image file for the Aadhaar photo.");
        return;
      }

      if (selectedFile.size > PUBLIC_DOCUMENT_SIZE_LIMIT) {
        setStatus("Please keep the Aadhaar photo under 4 MB.");
        return;
      }

      aadhaarDocument = await fileToRequestDocument(selectedFile);
    }

    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      await requestTenantService({
        action: "submit_request",
        inboxId: model.requestInboxId,
        request: {
          fullName: data.fullName,
          mobile: data.mobile,
          moveInDate: data.moveInDate,
          totalMembers: data.totalMembers,
          aadhaarNumber: data.aadhaarNumber,
          address: data.address,
          notes: data.notes,
          aadhaarDocument
        }
      });

      form.reset();
      if (captureInput) {
        captureInput.value = "";
      }
      if (fileInput) {
        fileInput.value = "";
      }
      updateIntakeDocumentHint();
      setStatus("Your request was sent to the owner dashboard. The owner will review it before creating your tenant record.");
    } catch (error) {
      console.error(error);
      setStatus("The request could not be submitted right now. Please try again after a moment.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
}

function renderPortal(model) {
  document.getElementById("portalMonthValue").textContent = formatMonthLabel(model.monthKey);
  document.getElementById("portalRoomTitle").textContent = `${model.fullName} - Room ${model.roomNumber || "-"}`;
  document.getElementById("portalIntroCopy").textContent = `This private link shows only Room ${model.roomNumber || "-"} for ${model.propertyName}.`;
  document.getElementById("portalDueValue").textContent = formatMoney(model.outstanding);
  document.getElementById("portalTotalValue").textContent = formatMoney(model.total);
  document.getElementById("portalPaidValue").textContent = formatMoney(model.paidAmount);
  document.getElementById("portalRoomValue").textContent = buildRoomLabel(model);
  document.getElementById("portalStartDateValue").textContent = formatDateLabel(model.startDate);
  document.getElementById("portalDueDayValue").textContent = model.dueDay ? `Day ${model.dueDay}` : "-";
  document.getElementById("portalModeValue").textContent = formatPaymentMode(model.paymentMode);
  document.getElementById("portalUpiId").textContent = model.upiId || "UPI not set";

  const badge = document.getElementById("portalStatusBadge");
  const isPaid = model.outstanding <= 0;
  badge.textContent = isPaid ? "Paid" : "Due";
  badge.dataset.tone = isPaid ? "paid" : "due";

  const meterCopy = document.getElementById("portalMeterCopy");
  const usageCopy = getMeterCopy(model);
  meterCopy.textContent = usageCopy || "Line items for this month";

  const breakdown = [
    createBreakdownItem("Rent", formatMoney(model.rentAmount)),
    model.electricityBill > 0 ? createBreakdownItem("Electricity", formatMoney(model.electricityBill), usageCopy) : "",
    model.waterBill > 0 ? createBreakdownItem("Water", formatMoney(model.waterBill)) : "",
    model.otherCharge > 0 ? createBreakdownItem("Other Charge", formatMoney(model.otherCharge)) : "",
    model.advanceUsed > 0 ? createBreakdownItem("Advance Used", `- ${formatMoney(model.advanceUsed)}`) : "",
    createBreakdownItem("Total Bill", formatMoney(model.total)),
    createBreakdownItem("Paid", formatMoney(model.paidAmount)),
    createBreakdownItem("Balance Due", formatMoney(model.outstanding))
  ]
    .filter(Boolean)
    .join("");

  document.getElementById("portalBreakdownList").innerHTML = breakdown;

  const portalPaymentNote = document.getElementById("portalPaymentNote");
  const portalQrImage = document.getElementById("portalQrImage");
  const portalQrEmpty = document.getElementById("portalQrEmpty");
  const portalPayNowBtn = document.getElementById("portalPayNowBtn");
  const portalProofBtn = document.getElementById("portalProofBtn");

  const upiLink = buildUpiPaymentLink(model);
  const qrUrl = buildQrUrl(upiLink);

  portalPayNowBtn.onclick = null;
  portalProofBtn.onclick = null;

  if (model.upiId && model.outstanding > 0 && upiLink) {
    portalPaymentNote.textContent = `Pay ${formatMoney(model.outstanding)} directly by UPI or scan the QR code.`;
    portalQrImage.hidden = true;
    portalQrEmpty.hidden = false;
    portalQrImage.onload = () => {
      portalQrImage.hidden = false;
      portalQrEmpty.hidden = true;
    };
    portalQrImage.onerror = () => {
      portalQrImage.hidden = true;
      portalQrImage.removeAttribute("src");
      portalQrEmpty.hidden = false;
      portalPaymentNote.textContent = `Pay ${formatMoney(model.outstanding)} directly by UPI with the button if the QR image does not load.`;
    };
    portalQrImage.src = qrUrl;
    portalPayNowBtn.disabled = false;
    portalPayNowBtn.onclick = () => {
      window.location.href = upiLink;
    };
  } else if (!model.upiId) {
    portalPaymentNote.textContent = "The owner has not added a UPI ID yet. Please contact the owner for payment details.";
    portalQrImage.hidden = true;
    portalQrImage.removeAttribute("src");
    portalQrEmpty.hidden = false;
    portalPayNowBtn.disabled = true;
  } else {
    portalPaymentNote.textContent = "This bill is already marked paid in the current record.";
    portalQrImage.hidden = true;
    portalQrImage.removeAttribute("src");
    portalQrEmpty.hidden = false;
    portalPayNowBtn.disabled = true;
  }

  if (model.ownerWhatsapp) {
    portalProofBtn.disabled = false;
    portalProofBtn.onclick = () => {
      openWhatsapp(model.ownerWhatsapp, buildPaymentProofMessage(model));
    };
  } else {
    portalProofBtn.disabled = true;
  }
}

function mapPortalPayload(payload) {
  return {
    propertyName: cleanString(payload.pp.p) || "Krishna Residency",
    ownerName: cleanString(payload.pp.o) || "Owner",
    city: cleanString(payload.pp.c),
    upiId: cleanString(payload.pp.u),
    ownerWhatsapp: cleanDigits(payload.pp.w),
    requestInboxId: cleanString(payload.pp.i),
    fullName: cleanString(payload.tn.n),
    mobile: cleanDigits(payload.tn.m),
    roomNumber: cleanString(payload.tn.r),
    floor: cleanString(payload.tn.f),
    startDate: cleanString(payload.tn.s),
    dueDay: Number(payload.tn.d) || 0,
    monthKey: cleanString(payload.b.m),
    rentAmount: toMoney(payload.b.ra),
    previousReading: toMoney(payload.b.pr),
    currentReading: toMoney(payload.b.cr),
    electricityUnits: toMoney(payload.b.eu),
    electricityRate: toMoney(payload.b.er),
    electricityBill: toMoney(payload.b.eb),
    waterBill: toMoney(payload.b.wb),
    otherCharge: toMoney(payload.b.oc),
    advanceUsed: toMoney(payload.b.au),
    paidAmount: toMoney(payload.b.pa),
    total: toMoney(payload.b.tt),
    outstanding: toMoney(payload.b.ou),
    paymentDate: cleanString(payload.b.pd),
    paymentMode: cleanString(payload.b.pm) || "pending",
    status: cleanString(payload.b.st) || "due",
    logoDataUrl: ""
  };
}

function mapIntakePayload(payload) {
  return {
    propertyName: cleanString(payload.pp.p) || "Krishna Residency",
    ownerName: cleanString(payload.pp.o) || "Owner",
    city: cleanString(payload.pp.c),
    requestInboxId: cleanString(payload.pp.i),
    logoDataUrl: ""
  };
}

async function hydratePublicBrandProfile(model, title) {
  if (model.requestInboxId) {
    try {
      const remoteProfile = await requestTenantService({
        action: "get_public_profile",
        inboxId: model.requestInboxId
      });
      const publicProfile = remoteProfile.profile || {};
      model.propertyName = cleanString(publicProfile.propertyName) || model.propertyName;
      model.ownerName = cleanString(publicProfile.ownerName) || model.ownerName;
      model.city = cleanString(publicProfile.city) || model.city;
      model.logoDataUrl = cleanString(publicProfile.logoDataUrl);
    } catch (error) {
      console.error(error);
    }
  }

  setBrand(model.propertyName, title, model.logoDataUrl);
  return model;
}

function buildPaymentProofMessage(model) {
  return [
    `Hello ${model.ownerName},`,
    `I am sharing the payment proof for ${formatMonthLabel(model.monthKey)}.`,
    `Tenant: ${model.fullName}`,
    `Room: ${buildRoomLabel(model)}`,
    `Amount paid: ${formatMoney(model.outstanding > 0 ? model.outstanding : model.total)}`,
    "Please check the screenshot or transaction in this chat."
  ].join("\n");
}

function buildUpiPaymentLink(model) {
  if (!model.upiId || model.outstanding <= 0) {
    return "";
  }

  const params = new URLSearchParams({
    pa: model.upiId,
    pn: model.ownerName || model.propertyName,
    am: model.outstanding.toFixed(2),
    tn: `${model.propertyName} ${formatMonthLabel(model.monthKey)} Room ${model.roomNumber || "-"}`,
    cu: "INR"
  });
  return `upi://pay?${params.toString()}`;
}

function buildQrUrl(upiLink) {
  if (!upiLink) {
    return "";
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}`;
}

function getMeterCopy(model) {
  if ((model.previousReading > 0 || model.currentReading > 0) && model.currentReading >= model.previousReading) {
    const units = model.currentReading - model.previousReading;
    return `${formatReading(model.currentReading)} - ${formatReading(model.previousReading)} = ${formatReading(units)} units`;
  }

  if (model.electricityUnits > 0) {
    return `${formatReading(model.electricityUnits)} units`;
  }

  return "";
}

function createBreakdownItem(label, value, note = "") {
  return `
    <article class="breakdown-item">
      <div>
        <span>${escapeHtml(label)}</span>
        ${note ? `<small>${escapeHtml(note)}</small>` : ""}
      </div>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function getSelectedIntakeDocument() {
  const captureFile = document.getElementById("intakeAadhaarCapture");
  const uploadFile = document.getElementById("intakeAadhaarFile");
  return captureFile?.files?.[0] || uploadFile?.files?.[0] || null;
}

function updateIntakeDocumentHint() {
  const hint = document.getElementById("intakeDocumentHint");
  if (!hint) {
    return;
  }

  const file = getSelectedIntakeDocument();
  if (!file) {
    hint.textContent = "Upload or capture a clear Aadhaar photo.";
    return;
  }

  hint.textContent = `${file.name} - ${formatFileSize(file.size)}`;
}

async function fileToRequestDocument(file) {
  const dataUrl = await resizeImageFileToDataUrl(file, 1600, 0.86);
  return {
    name: file.name || "aadhaar-photo.jpg",
    type: "image/jpeg",
    size: estimateDataUrlBytes(dataUrl),
    dataUrl,
    updatedAt: new Date().toISOString()
  };
}

async function resizeImageFileToDataUrl(file, maxDimension = 1600, quality = 0.86) {
  const originalDataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const largestSide = Math.max(image.naturalWidth, image.naturalHeight) || 1;
        const scale = Math.min(1, maxDimension / largestSide);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          reject(new Error("Canvas is not available"));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = originalDataUrl;
  });
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File could not be read"));
    reader.readAsDataURL(file);
  });
}

async function requestTenantService(payload) {
  console.warn("Tenant request service is disabled.");
  return { ok: false, error: "Service unavailable" };
}

function getServiceBaseUrl() {
  const origin = window.location.origin || "";
  if (
    window.location.protocol === "file:" ||
    !origin ||
    origin === "null" ||
    /localhost|127\.0\.0\.1/i.test(origin)
  ) {
    return PUBLIC_SITE_FALLBACK_URL;
  }

  return origin.replace(/\/+$/, "");
}

function readSharePayload() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const params = new URLSearchParams(hash);
  const data = params.get("data");
  if (!data) {
    return null;
  }

  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function setBrand(propertyName, title, logoSrc = "") {
  document.title = `${propertyName} ${title}`;
  const brandName = document.getElementById("publicBrandName");
  if (brandName) {
    brandName.textContent = propertyName;
  }
  const brandLogo = document.getElementById("publicBrandLogo");
  if (brandLogo && cleanString(logoSrc)) {
    brandLogo.src = logoSrc;
    brandLogo.alt = `${propertyName} logo`;
  }
}

function setStatus(message) {
  const statusMessage = document.getElementById("publicStatusMessage");
  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

function showElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.hidden = false;
  }
}

function hideElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.hidden = true;
  }
}

function openWhatsapp(phone, message) {
  const digits = cleanDigits(phone);
  const formatted = digits.length === 10 ? `91${digits}` : digits;
  window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function formatMoney(value) {
  return publicMoneyFormatter.format(Number(value) || 0).replace("₹", "Rs ");
}

function formatMonthLabel(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey || "")) {
    return "-";
  }

  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function formatDateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatPaymentMode(value) {
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) {
    return "Pending";
  }

  return normalized
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReading(value) {
  const amount = Number(value) || 0;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function buildRoomLabel(model) {
  const room = model.roomNumber || "-";
  return model.floor ? `Room ${room} - ${model.floor}` : `Room ${room}`;
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function toWholeNumber(value) {
  const amount = Math.floor(Number(value) || 0);
  return amount > 0 ? amount : 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
