const DB_NAME = "rent-collection-db";
const DB_STORE = "kv";
const DB_KEY = "app-state";
const NOTIFY_KEY = "rent-collection-last-notified";
const DRIVE_FOLDER_KEY = "drive-folder-handle";
const DRIVE_META_KEY = "drive-backup-meta";
const AUTO_BACKUP_DIRECTORY = "Rent Collection Auto Backup";
const AUTO_BACKUP_LATEST_FILE = "rent-collection-latest.json";
const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024;
const AUTO_BACKUP_DELAY_MS = 1200;
const APP_TABS = ["overview", "tenants", "collections", "reminders", "settings"];
const PUBLIC_SITE_FALLBACK_URL = "https://krishna-residency-rent.netlify.app";

const BRAND_LOGO_WEB_PATH = "assets/branding/krishna-residency-logo.png";
const RECEIPT_LOGO_PDF_PATH = "assets/branding/krishna-residency-logo-receipt.jpg";
const SECTION_TAB_MAP = {
  tenantEntry: "tenants",
  collectionEntry: "collections"
};
const DRIVE_BACKUP_README = [
  "Rent Collection Auto Backup",
  "",
  "This folder is managed by the local rent collection app.",
  "Keep this folder in a safe location if you use it for backup copies.",
  "The latest JSON file is overwritten after each save in the app."
].join("\n");

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const ui = {
  tenantFilter: "all",
  tenantSearch: "",
  selectedTenantId: null,
  activeTab: "overview",
  isMobileNavOpen: false,
  autoBackupTimer: null,
  dialogResolver: null,
  activeReceiptContext: null,
  installPrompt: null,
  toastTimer: null,

  pendingImportedAadhaarDocument: null,

  pendingProfileLogoDataUrl: null
};

let dbPromise = null;
let state = createDefaultState();
let driveFolderHandle = null;
let driveBackupMeta = createDefaultDriveBackupMeta();
let receiptLogoPdfPromise = null;
let elements = {};
let isPinUnlocked = false;

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    showToast("The app could not finish loading. Please refresh the page.");
  });
});

async function init() {
  cacheElements();
  checkLocalPin();
  bindEvents();
  await loadState();

  syncLocalPinFromState();
  await loadDriveBackupState();
  ui.activeTab = getInitialTab();
  ensureSelectedTenant();
  populateProfileForm();
  renderAll();
  switchTab(ui.activeTab, { scroll: false, syncHash: false });
  syncMobileNavState();
  scrollToInitialHashTarget();
  registerInstallPrompt();
  await registerServiceWorker();

  checkLocalPin();

  maybeSendDueNotifications();

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      autoSync();
    }
  });
  setInterval(autoSync, 15000);
}



function cacheElements() {
  elements = {
    appShell: document.getElementById("appShell"),
    pinOverlay: document.getElementById("pinOverlay"),
    pinForm: document.getElementById("pinForm"),
    pinInput: document.getElementById("pinInput"),
    pinError: document.getElementById("pinError"),
    profileForm: document.getElementById("profileForm"),
    profileOwnerName: document.getElementById("profileOwnerName"),
    profilePropertyName: document.getElementById("profilePropertyName"),
    profileLogoPreview: document.getElementById("profileLogoPreview"),
    profileLogoFile: document.getElementById("profileLogoFile"),
    clearProfileLogoBtn: document.getElementById("clearProfileLogoBtn"),
    profileCity: document.getElementById("profileCity"),
    profileDueDay: document.getElementById("profileDueDay"),
    profileReminderTime: document.getElementById("profileReminderTime"),
    profileUpiId: document.getElementById("profileUpiId"),
    profileOwnerWhatsapp: document.getElementById("profileOwnerWhatsapp"),
    profileAppPin: document.getElementById("profileAppPin"),
    profileGithubToken: document.getElementById("profileGithubToken"),
    profileGithubGistId: document.getElementById("profileGithubGistId"),

    tenantForm: document.getElementById("tenantForm"),
    tenantId: document.getElementById("tenantId"),
    tenantName: document.getElementById("tenantName"),
    tenantMobile: document.getElementById("tenantMobile"),
    tenantTotalMembers: document.getElementById("tenantTotalMembers"),
    tenantAadhaarNumber: document.getElementById("tenantAadhaarNumber"),
    tenantRoomNumber: document.getElementById("tenantRoomNumber"),
    tenantFloor: document.getElementById("tenantFloor"),
    tenantStartDate: document.getElementById("tenantStartDate"),
    tenantDueDay: document.getElementById("tenantDueDay"),
    tenantMonthlyRent: document.getElementById("tenantMonthlyRent"),
    tenantWaterBill: document.getElementById("tenantWaterBill"),
    tenantAdvancePaid: document.getElementById("tenantAdvancePaid"),
    tenantAddress: document.getElementById("tenantAddress"),
    tenantNotes: document.getElementById("tenantNotes"),
    tenantAadhaarFile: document.getElementById("tenantAadhaarFile"),
    tenantAadhaarCapture: document.getElementById("tenantAadhaarCapture"),
    captureAadhaarBtn: document.getElementById("captureAadhaarBtn"),
    aadhaarFileHint: document.getElementById("aadhaarFileHint"),
    existingDocumentHint: document.getElementById("existingDocumentHint"),
    
    
    
    
    resetTenantFormBtn: document.getElementById("resetTenantFormBtn"),
    scrollToCollectionBtn: document.getElementById("scrollToCollectionBtn"),
    paymentForm: document.getElementById("paymentForm"),
    collectionTenantId: document.getElementById("collectionTenantId"),
    collectionMonth: document.getElementById("collectionMonth"),
    collectionRentAmount: document.getElementById("collectionRentAmount"),
    collectionElectricityPreviousReading: document.getElementById("collectionElectricityPreviousReading"),
    collectionElectricityCurrentReading: document.getElementById("collectionElectricityCurrentReading"),
    collectionElectricityUnits: document.getElementById("collectionElectricityUnits"),
    collectionElectricityRate: document.getElementById("collectionElectricityRate"),
    collectionElectricityBill: document.getElementById("collectionElectricityBill"),
    collectionWaterBill: document.getElementById("collectionWaterBill"),
    collectionOtherCharge: document.getElementById("collectionOtherCharge"),
    collectionAdvanceUsed: document.getElementById("collectionAdvanceUsed"),
    collectionFullPaid: document.getElementById("collectionFullPaid"),
    collectionCalculatedTotal: document.getElementById("collectionCalculatedTotal"),
    collectionPaidAmount: document.getElementById("collectionPaidAmount"),
    collectionPaymentDate: document.getElementById("collectionPaymentDate"),
    collectionPaymentMode: document.getElementById("collectionPaymentMode"),
    collectionNotes: document.getElementById("collectionNotes"),
    collectionModeLabel: document.getElementById("collectionModeLabel"),
    availableAdvanceHint: document.getElementById("availableAdvanceHint"),
    electricityCalcHint: document.getElementById("electricityCalcHint"),
    previewTotalAmount: document.getElementById("previewTotalAmount"),
    previewPaidAmount: document.getElementById("previewPaidAmount"),
    previewBalanceAmount: document.getElementById("previewBalanceAmount"),
    receiptPanelTitle: document.getElementById("receiptPanelTitle"),
    receiptPanelNote: document.getElementById("receiptPanelNote"),
    generateReceiptBtn: document.getElementById("generateReceiptBtn"),
    sendSmsReceiptBtn: document.getElementById("sendSmsReceiptBtn"),
    sendReceiptWhatsappBtn: document.getElementById("sendReceiptWhatsappBtn"),
    paymentRequestPanel: document.getElementById("paymentRequestPanel"),
    paymentRequestNote: document.getElementById("paymentRequestNote"),
    paymentRequestAmount: document.getElementById("paymentRequestAmount"),
    paymentRequestTenant: document.getElementById("paymentRequestTenant"),
    paymentRequestMonth: document.getElementById("paymentRequestMonth"),
    paymentRequestUpiId: document.getElementById("paymentRequestUpiId"),
    paymentRequestQrImage: document.getElementById("paymentRequestQrImage"),
    paymentRequestQrEmpty: document.getElementById("paymentRequestQrEmpty"),
    sendPaymentRequestBtn: document.getElementById("sendPaymentRequestBtn"),
    tenantPortalNote: document.getElementById("tenantPortalNote"),
    copyTenantPortalLinkBtn: document.getElementById("copyTenantPortalLinkBtn"),
    shareTenantPortalWhatsappBtn: document.getElementById("shareTenantPortalWhatsappBtn"),
    
    
    
    deleteSavedPaymentBtn: document.getElementById("deleteSavedPaymentBtn"),
    paymentSubmitBtn: document.getElementById("paymentSubmitBtn"),
    resetPaymentFormBtn: document.getElementById("resetPaymentFormBtn"),
    summaryGrid: document.getElementById("summaryGrid"),
    appSidebar: document.getElementById("appSidebar"),
    mobileMenuBtn: document.getElementById("mobileMenuBtn"),
    mobileNavBackdrop: document.getElementById("mobileNavBackdrop"),
    sidebarBrandLogo: document.getElementById("sidebarBrandLogo"),
    sidebarPropertyName: document.getElementById("sidebarPropertyName"),
    sidebarTenantCount: document.getElementById("sidebarTenantCount"),
    sidebarDueCount: document.getElementById("sidebarDueCount"),
    sidebarReceivedValue: document.getElementById("sidebarReceivedValue"),
    sidebarReminderTime: document.getElementById("sidebarReminderTime"),
    overviewOwnerValue: document.getElementById("overviewOwnerValue"),
    overviewPropertyValue: document.getElementById("overviewPropertyValue"),
    overviewCityValue: document.getElementById("overviewCityValue"),
    overviewReminderValue: document.getElementById("overviewReminderValue"),
    heroMonthLabel: document.getElementById("heroMonthLabel"),
    heroCollectionValue: document.getElementById("heroCollectionValue"),
    heroCollectionNote: document.getElementById("heroCollectionNote"),
    heroDueCount: document.getElementById("heroDueCount"),
    heroPendingValue: document.getElementById("heroPendingValue"),
    heroAdvanceValue: document.getElementById("heroAdvanceValue"),
    heroTenantValue: document.getElementById("heroTenantValue"),
    globalSearchInput: document.getElementById("globalSearchInput"),
    downloadDataBtn: document.getElementById("downloadDataBtn"),
    lockAppBtn: document.getElementById("lockAppBtn"),
    topbarPropertyName: document.getElementById("topbarPropertyName"),
    topbarBackupLabel: document.getElementById("topbarBackupLabel"),
    topbarOwnerBadge: document.getElementById("topbarOwnerBadge"),
    topbarOwnerLogoImage: document.getElementById("topbarOwnerLogoImage"),
    topbarOwnerBadgeText: document.getElementById("topbarOwnerBadgeText"),
    driveBackupStatus: document.getElementById("driveBackupStatus"),
    driveFolderName: document.getElementById("driveFolderName"),
    driveLastBackupAt: document.getElementById("driveLastBackupAt"),
    connectDriveFolderBtn: document.getElementById("connectDriveFolderBtn"),
    runDriveBackupNowBtn: document.getElementById("runDriveBackupNowBtn"),
    disconnectDriveFolderBtn: document.getElementById("disconnectDriveFolderBtn"),
    driveSupportNote: document.getElementById("driveSupportNote"),
    dueList: document.getElementById("dueList"),
    tenantDirectory: document.getElementById("tenantDirectory"),
    tenantDetail: document.getElementById("tenantDetail"),
    tenantSearchInput: document.getElementById("tenantSearchInput"),
    tenantFilters: document.getElementById("tenantFilters"),
    installAppBtn: document.getElementById("installAppBtn"),
    enableNotificationsBtn: document.getElementById("enableNotificationsBtn"),
    exportDataBtn: document.getElementById("exportDataBtn"),
    copyDueSummaryBtn: document.getElementById("copyDueSummaryBtn"),
    createOwnerReminderBtn: document.getElementById("createOwnerReminderBtn"),
    importDataBtn: document.getElementById("importDataBtn"),
    importFileInput: document.getElementById("importFileInput"),
    loadDemoBtn: document.getElementById("loadDemoBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    appModal: document.getElementById("appModal"),
    appModalTitle: document.getElementById("appModalTitle"),
    appModalBody: document.getElementById("appModalBody"),
    appModalCloseBtn: document.getElementById("appModalCloseBtn"),
    appModalCancelBtn: document.getElementById("appModalCancelBtn"),
    appModalConfirmBtn: document.getElementById("appModalConfirmBtn"),
    receiptModal: document.getElementById("receiptModal"),
    receiptModalTitle: document.getElementById("receiptModalTitle"),
    receiptModalContent: document.getElementById("receiptModalContent"),
    receiptModalCloseBtn: document.getElementById("receiptModalCloseBtn"),
    receiptModalSecondaryBtn: document.getElementById("receiptModalSecondaryBtn"),
    receiptModalPrintBtn: document.getElementById("receiptModalPrintBtn"),
    receiptModalShareBtn: document.getElementById("receiptModalShareBtn"),
    appToast: document.getElementById("appToast")
  };
}

function bindEvents() {
  document.addEventListener("click", handleAppChromeClick);
  document.addEventListener("keydown", handleGlobalKeydown);
  if (elements.pinForm) {
    elements.pinForm.addEventListener("submit", verifyPin);
  }
  if (elements.lockAppBtn) {
    elements.lockAppBtn.addEventListener("click", handleLockApp);
  }
  if (elements.downloadDataBtn) {
    elements.downloadDataBtn.addEventListener("click", forceManualSync);
  }
  
  elements.profileForm.addEventListener("submit", handleProfileSave);
  elements.tenantForm.addEventListener("submit", handleTenantSave);
  elements.paymentForm.addEventListener("submit", handlePaymentSave);
  elements.resetTenantFormBtn.addEventListener("click", resetTenantForm);
  elements.scrollToCollectionBtn.addEventListener("click", () => scrollToSection("collectionEntry"));
  elements.resetPaymentFormBtn.addEventListener("click", () => hydratePaymentForm());
  elements.collectionTenantId.addEventListener("change", () => {
    ui.selectedTenantId = elements.collectionTenantId.value || ui.selectedTenantId;
    ensureSelectedTenant();
    renderAll();
    hydratePaymentForm();
  });
  elements.collectionMonth.addEventListener("change", hydratePaymentForm);
  [
    elements.collectionElectricityPreviousReading,
    elements.collectionElectricityCurrentReading,
    elements.collectionElectricityRate
  ].forEach((field) =>
    field.addEventListener("input", updateElectricityCalculation)
  );
  elements.collectionFullPaid.addEventListener("change", updatePaymentPreview);
  [
    elements.collectionRentAmount,
    elements.collectionElectricityBill,
    elements.collectionWaterBill,
    elements.collectionOtherCharge,
    elements.collectionAdvanceUsed,
    elements.collectionPaidAmount
  ].forEach((field) => field.addEventListener("input", updatePaymentPreview));
  elements.collectionPaymentMode.addEventListener("change", updatePaymentPreview);
  elements.tenantAadhaarFile.addEventListener("change", () => handleAadhaarInputChange("upload"));
  if (elements.tenantAadhaarCapture) {
    elements.tenantAadhaarCapture.addEventListener("change", () => handleAadhaarInputChange("capture"));
  }
  if (elements.captureAadhaarBtn) {
    elements.captureAadhaarBtn.addEventListener("click", openAadhaarCapture);
  }
  if (elements.profileLogoFile) {
    elements.profileLogoFile.addEventListener("change", handleProfileLogoSelection);
  }
  if (elements.clearProfileLogoBtn) {
    elements.clearProfileLogoBtn.addEventListener("click", clearProfileLogoSelection);
  }
  if (elements.tenantSearchInput) {
    elements.tenantSearchInput.addEventListener("input", (event) => {
      ui.tenantSearch = cleanString(event.target.value).toLowerCase();
      elements.globalSearchInput.value = cleanString(event.target.value);
      renderTenantDirectory();
    });
  }
  elements.globalSearchInput.addEventListener("input", handleGlobalSearchInput);
  if (elements.tenantFilters) {
    elements.tenantFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) {
        return;
      }

      ui.tenantFilter = button.dataset.filter;
      renderTenantDirectory();
      renderFilterChips();
    });
  }
  if (elements.tenantDirectory) {
    elements.tenantDirectory.addEventListener("click", handleTenantDirectoryClick);
  }
  elements.dueList.addEventListener("click", handleDueListClick);
  if (elements.tenantDetail) {
    elements.tenantDetail.addEventListener("click", handleTenantDetailClick);
  }
  
  if (elements.enableNotificationsBtn) {
    elements.enableNotificationsBtn.addEventListener("click", requestNotificationPermission);
  }
  if (elements.installAppBtn) {
    elements.installAppBtn.addEventListener("click", installApplication);
  }
  if (elements.exportDataBtn) {
    elements.exportDataBtn.addEventListener("click", exportState);
  }
  elements.copyDueSummaryBtn.addEventListener("click", copyDueSummary);
  elements.createOwnerReminderBtn.addEventListener("click", createOwnerReminder);
  elements.generateReceiptBtn.addEventListener("click", generateCurrentReceipt);
  elements.sendSmsReceiptBtn.addEventListener("click", sendCurrentSmsReceipt);
  elements.sendReceiptWhatsappBtn.addEventListener("click", sendCurrentWhatsappReceipt);
  if (elements.sendPaymentRequestBtn) {
    elements.sendPaymentRequestBtn.addEventListener("click", sendCurrentPaymentRequest);
  }
  if (elements.copyTenantPortalLinkBtn) {
    elements.copyTenantPortalLinkBtn.addEventListener("click", copyTenantPortalLink);
  }
  if (elements.shareTenantPortalWhatsappBtn) {
    elements.shareTenantPortalWhatsappBtn.addEventListener("click", shareTenantPortalWhatsapp);
  }
  if (elements.copyTenantIntakeLinkBtn) {
    elements.copyTenantIntakeLinkBtn.addEventListener("click", copyTenantIntakeLink);
  }
  if (elements.openTenantIntakeLinkBtn) {
    elements.openTenantIntakeLinkBtn.addEventListener("click", openTenantIntakeLink);
  }
  
  if (elements.deleteSavedPaymentBtn) {
    elements.deleteSavedPaymentBtn.addEventListener("click", deleteCurrentSavedPayment);
  }
  if (elements.connectDriveFolderBtn) {
    elements.connectDriveFolderBtn.addEventListener("click", connectDriveFolder);
  }
  if (elements.runDriveBackupNowBtn) {
    elements.runDriveBackupNowBtn.addEventListener("click", runDriveBackupNow);
  }
  if (elements.disconnectDriveFolderBtn) {
    elements.disconnectDriveFolderBtn.addEventListener("click", disconnectDriveFolder);
  }
  elements.importDataBtn.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", importStateFile);
  elements.loadDemoBtn.addEventListener("click", loadDemoData);
  elements.clearAllBtn.addEventListener("click", clearAllData);
  elements.appModal.addEventListener("click", handleAppModalClick);
  elements.appModalCloseBtn.addEventListener("click", () => closeAppModal(false));
  elements.appModalCancelBtn.addEventListener("click", () => closeAppModal(false));
  elements.appModalConfirmBtn.addEventListener("click", () => closeAppModal(true));
  elements.receiptModal.addEventListener("click", handleReceiptModalClick);
  elements.receiptModalCloseBtn.addEventListener("click", closeReceiptModal);
  elements.receiptModalSecondaryBtn.addEventListener("click", closeReceiptModal);
  elements.receiptModalPrintBtn.addEventListener("click", printReceiptModal);
  elements.receiptModalShareBtn.addEventListener("click", shareActiveReceiptPdf);
  window.addEventListener("afterprint", clearReceiptPrintState);
  window.addEventListener("resize", handleViewportChange);
}

function checkLocalPin() {
  const pin = readStorageValue(window.localStorage, "local_app_pin");
  const appShell = elements.appShell || document.getElementById("appShell");
  const pinOverlay = elements.pinOverlay || document.getElementById("pinOverlay");

  if (pin && !isPinUnlocked) {
    setElementDisplay(pinOverlay, "flex");
    setElementDisplay(appShell, "none");
    return;
  }

  setElementDisplay(pinOverlay, "none");
  setElementDisplay(appShell, "flex");
}

function syncLocalPinFromState() {
  const savedPin = cleanDigits(state && state.profile ? state.profile.appPin : "");
  if (savedPin) {
    writeStorageValue(window.localStorage, "local_app_pin", savedPin);
    return;
  }

  removeStorageValue(window.localStorage, "local_app_pin");
}

function verifyPin(event) {
  if (event) {
    event.preventDefault();
  }

  const pinInput = elements.pinInput || document.getElementById("pinInput");
  const pinError = elements.pinError || document.getElementById("pinError");
  const pin = readStorageValue(window.localStorage, "local_app_pin");
  const input = pinInput ? pinInput.value : "";

  if (input === pin) {
    isPinUnlocked = true;
    checkLocalPin();
    return;
  }

  setElementDisplay(pinError, "block");
  if (pinInput) {
    pinInput.value = "";
  }
}

function handleLockApp() {
  isPinUnlocked = false;
  if (elements.pinInput) {
    elements.pinInput.value = "";
  }
  checkLocalPin();
}

function setElementDisplay(element, display) {
  if (element) {
    element.style.display = display;
  }
}

function readStorageValue(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function writeStorageValue(storage, key, value) {
  try {
    if (storage) {
      storage.setItem(key, value);
    }
  } catch (error) {
    console.error(error);
  }
}

function removeStorageValue(storage, key) {
  try {
    if (storage) {
      storage.removeItem(key);
    }
  } catch (error) {
    console.error(error);
  }
}

window.checkLocalPin = checkLocalPin;
window.verifyPin = verifyPin;
window.handleLockApp = handleLockApp;

function handleAppChromeClick(event) {
  const mobileNavTrigger = event.target.closest("[data-mobile-nav]");
  if (mobileNavTrigger) {
    if (mobileNavTrigger.dataset.mobileNav === "toggle") {
      toggleMobileNav();
      return;
    }

    closeMobileNav();
    return;
  }

  const tabTrigger = event.target.closest("[data-tab]");
  if (!tabTrigger) {
    return;
  }

  switchTab(tabTrigger.dataset.tab);

  if (isMobileNavViewport()) {
    closeMobileNav();
  }
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && !elements.receiptModal.hidden) {
    closeReceiptModal();
    return;
  }

  if (event.key === "Escape" && !elements.appModal.hidden) {
    closeAppModal(false);
    return;
  }

  if (event.key === "Escape" && ui.isMobileNavOpen) {
    closeMobileNav();
  }
}

function handleAppModalClick(event) {
  if (event.target.dataset.modalClose === "backdrop") {
    closeAppModal(false);
  }
}

function handleGlobalSearchInput(event) {
  const value = cleanString(event.target.value);
  ui.tenantSearch = value.toLowerCase();
  if (elements.tenantSearchInput) {
    elements.tenantSearchInput.value = value;
  }
  if (value && elements.tenantSearchInput) {
    switchTab("tenants", { scroll: false });
  }
  renderTenantDirectory();
}

function handleReceiptModalClick(event) {
  if (event.target.dataset.receiptClose === "backdrop") {
    closeReceiptModal();
  }
}

function createDefaultState() {
  return {
    profile: {
      ownerName: "",
      propertyName: "",
      city: "",
      defaultDueDay: 5,
      reminderTime: "09:00",
      upiId: "",
      ownerWhatsapp: "",
      appPin: "",
      githubToken: "",
      githubGistId: "",
      brandLogoDataUrl: "",
      requestInboxId: "",
      requestAdminKey: ""
    },
    tenants: []
  };
}

function createDefaultDriveBackupMeta() {
  return {
    folderName: "",
    lastBackupAt: "",
    lastBackupFile: "",
    lastSnapshotDay: ""
  };
}

function createDemoState() {
  const demo = createDefaultState();
  demo.profile = {
    ownerName: "Amit Kumar",
    propertyName: "Shiv Residency",
    city: "Kendrapara",
    defaultDueDay: 5,
    reminderTime: "08:30",
    upiId: "amitkumar@upi",
    ownerWhatsapp: "9876501234"
  };
  demo.tenants = [
    normalizeTenant({
      id: "tenant-demo-1",
      fullName: "Rakesh Das",
      mobile: "9876543210",
      roomNumber: "101",
      floor: "Ground Floor",
      startDate: "2026-01-12",
      dueDay: 5,
      monthlyRent: 4500,
      defaultWaterBill: 250,
      advancePaid: 6000,
      address: "Near bus stand, single room",
      notes: "Meter reading 2380",
      payments: [
        {
          id: "pay-demo-1",
          monthKey: previousMonthKey(),
          rentAmount: 4500,
          electricityUnits: 60,
          electricityRate: 7,
          electricityBill: 420,
          waterBill: 250,
          otherCharge: 0,
          advanceUsed: 0,
          paidAmount: 5170,
          paymentDate: previousMonthPaymentDate(),
          paymentMode: "upi",
          notes: "Paid full"
        },
        {
          id: "pay-demo-2",
          monthKey: currentMonthKey(),
          rentAmount: 4500,
          electricityUnits: 60,
          electricityRate: 8.5,
          electricityBill: 510,
          waterBill: 250,
          otherCharge: 0,
          advanceUsed: 0,
          paidAmount: 3000,
          paymentDate: getTodayIso(),
          paymentMode: "cash",
          notes: "Partial payment"
        }
      ]
    }),
    normalizeTenant({
      id: "tenant-demo-2",
      fullName: "Mina Sahoo",
      mobile: "9123456780",
      roomNumber: "202",
      floor: "First Floor",
      startDate: "2026-03-03",
      dueDay: 7,
      monthlyRent: 5200,
      defaultWaterBill: 300,
      advancePaid: 7000,
      address: "Double room, family stay",
      notes: "Aadhaar pending",
      payments: [
        {
          id: "pay-demo-3",
          monthKey: previousMonthKey(),
          rentAmount: 5200,
          electricityUnits: 65,
          electricityRate: 10,
          electricityBill: 650,
          waterBill: 300,
          otherCharge: 0,
          advanceUsed: 500,
          paidAmount: 5650,
          paymentDate: previousMonthPaymentDate(),
          paymentMode: "bank",
          notes: "Advance adjusted"
        }
      ]
    })
  ];

  return demo;
}

async function loadState() {
  const saved = await readFromDb(DB_KEY);
  const source = saved && saved.state ? saved.state : saved;
  state = normalizeState(source || createDefaultState());
  if (ensureProfileAccessKeys()) {
    await persistState();
  }
}

let isAutoSyncing = false;

async function autoSync() {
  if (isAutoSyncing) return;
  const config = await getGithubSyncConfig();
  if (!config) return;
  isAutoSyncing = true;
  try {
    const db = await getDb();
    let oldLocalValue = await new Promise((resolve) => {
      const transaction = db.transaction(DB_STORE, "readonly");
      const request = transaction.objectStore(DB_STORE).get(DB_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    const oldTimestamp = oldLocalValue ? oldLocalValue._timestamp : 0;
    
    await loadState();
    
    let newLocalValue = await new Promise((resolve) => {
      const transaction = db.transaction(DB_STORE, "readonly");
      const request = transaction.objectStore(DB_STORE).get(DB_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    const newTimestamp = newLocalValue ? newLocalValue._timestamp : 0;
    
    if (newTimestamp > oldTimestamp) {
      console.log("State synced from cloud.");
      populateProfileForm();
      renderAll();
      showToast("Data synced from other device");
    }
  } catch (error) {
    console.error("Auto sync failed", error);
  } finally {
    isAutoSyncing = false;
  }
}

async function forceManualSync(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
  }
  
  try {
    const config = await getGithubSyncConfig();
    if (!config) {
      showToast("GitHub sync is not configured. Add your token in Setup.");
      return;
    }
    
    showToast("Fetching from GitHub Gist...");
    
    const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
      headers: {
        "Authorization": `token ${config.token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (response.ok) {
      const gist = await response.json();
      const filename = `${DB_KEY}.json`;
      if (gist.files && gist.files[filename]) {
        const cloudData = JSON.parse(gist.files[filename].content);
        if (cloudData && cloudData.value) {
          // Preserve local token and gist ID
          const localToken = config.token;
          const localGistId = config.gistId;
          
          let newValue = cloudData.value;
          if (newValue && newValue.state && newValue.state.profile) {
            if (localToken) newValue.state.profile.githubToken = localToken;
            if (localGistId) newValue.state.profile.githubGistId = localGistId;
          } else if (newValue && newValue.profile) {
            if (localToken) newValue.profile.githubToken = localToken;
            if (localGistId) newValue.profile.githubGistId = localGistId;
          }
          
          // Force overwrite local DB with cloud data
          newValue._timestamp = Date.now();
          await writeToLocalDb(DB_KEY, newValue);
          console.log("Forced gist sync completed.");
        }
      }
    } else {
      console.warn("Gist data not found or fetch failed during forced sync.");
    }
    
    await loadState();
    populateProfileForm();
    renderAll();
    showToast("Data synced successfully!");
  } catch (error) {
    console.error("Manual sync failed", error);
    showToast("Failed to sync data.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  }
}

async function loadDriveBackupState() {
  driveFolderHandle = null;
  driveBackupMeta = createDefaultDriveBackupMeta();
  clearTimeout(ui.autoBackupTimer);
  await deleteFromDb(DRIVE_FOLDER_KEY);
  await deleteFromDb(DRIVE_META_KEY);
}

async function persistState() {
  await writeToDb(DB_KEY, {
    savedAt: new Date().toISOString(),
    state
  });
}

function normalizeState(source) {
  const normalized = createDefaultState();
  const profile = source && source.profile ? source.profile : {};
  normalized.profile = {
    ownerName: cleanString(profile.ownerName),
    propertyName: cleanString(profile.propertyName),
    city: cleanString(profile.city),
    defaultDueDay: clampNumber(profile.defaultDueDay, 1, 28, 5),
    reminderTime: isValidTime(profile.reminderTime) ? profile.reminderTime : "09:00",
    upiId: cleanString(profile.upiId),
    ownerWhatsapp: cleanDigits(profile.ownerWhatsapp),
    appPin: cleanDigits(profile.appPin),
    brandLogoDataUrl: normalizeImageDataUrl(profile.brandLogoDataUrl),
    requestInboxId: cleanString(profile.requestInboxId),
    requestAdminKey: cleanString(profile.requestAdminKey),
    githubToken: cleanString(profile.githubToken),
    githubGistId: cleanString(profile.githubGistId)
  };
  normalized.tenants = Array.isArray(source && source.tenants) ? source.tenants.map(normalizeTenant) : [];
  normalized.tenants.sort(sortTenants);
  return normalized;
}

function normalizeTenant(source) {
  const tenant = {
    id: cleanString(source.id) || makeId("tenant"),
    fullName: cleanString(source.fullName),
    mobile: cleanDigits(source.mobile),
    totalMembers: toWholeNumber(source.totalMembers),
    aadhaarNumber: cleanDigits(source.aadhaarNumber).slice(0, 12),
    roomNumber: cleanString(source.roomNumber),
    floor: cleanString(source.floor),
    startDate: isValidDate(source.startDate) ? source.startDate : getTodayIso(),
    dueDay: clampNumber(source.dueDay, 1, 28, state.profile ? state.profile.defaultDueDay : 5),
    monthlyRent: toMoney(source.monthlyRent),
    defaultWaterBill: toMoney(source.defaultWaterBill),
    advancePaid: toMoney(source.advancePaid),
    address: cleanString(source.address),
    notes: cleanString(source.notes),
    aadhaarDocument: normalizeDocument(source.aadhaarDocument),
    payments: []
  };

  const seenMonths = new Map();
  const payments = Array.isArray(source.payments) ? source.payments.map(normalizePayment) : [];

  payments.forEach((payment) => {
    seenMonths.set(payment.monthKey, payment);
  });

  tenant.payments = Array.from(seenMonths.values()).sort((left, right) => right.monthKey.localeCompare(left.monthKey));
  return tenant;
}

function normalizeDocument(source) {
  if (!source || !source.dataUrl) {
    return null;
  }

  return {
    name: cleanString(source.name) || "aadhaar-copy",
    type: cleanString(source.type) || "application/octet-stream",
    size: Number(source.size) || 0,
    dataUrl: String(source.dataUrl),
    updatedAt: isValidDateTime(source.updatedAt) ? source.updatedAt : new Date().toISOString()
  };
}

function normalizePayment(source) {
  const electricityPreviousReading = roundMoney(Number(source.electricityPreviousReading) || 0);
  const electricityCurrentReading = roundMoney(Number(source.electricityCurrentReading) || 0);
  const hasMeterReadings = electricityPreviousReading > 0 || electricityCurrentReading > 0;
  const derivedElectricityUnits = roundMoney(electricityCurrentReading - electricityPreviousReading);
  const electricityUnits =
    hasMeterReadings && derivedElectricityUnits >= 0
      ? derivedElectricityUnits
      : roundMoney(Number(source.electricityUnits) || 0);
  const electricityRate = toMoney(source.electricityRate);
  const calculatedElectricityBill =
    electricityUnits > 0 && electricityRate > 0 ? roundMoney(electricityUnits * electricityRate) : 0;

  return {
    id: cleanString(source.id) || makeId("payment"),
    monthKey: isValidMonthKey(source.monthKey) ? source.monthKey : currentMonthKey(),
    rentAmount: toMoney(source.rentAmount),
    electricityPreviousReading,
    electricityCurrentReading,
    electricityUnits,
    electricityRate,
    electricityBill: toMoney(source.electricityBill || calculatedElectricityBill),
    waterBill: toMoney(source.waterBill),
    otherCharge: toMoney(source.otherCharge),
    advanceUsed: toMoney(source.advanceUsed),
    paidAmount: toMoney(source.paidAmount),
    paymentDate: isValidDate(source.paymentDate) ? source.paymentDate : "",
    paymentMode: cleanString(source.paymentMode) || "cash",
    notes: cleanString(source.notes)
  };
}

function populateProfileForm() {
  elements.profileOwnerName.value = state.profile.ownerName;
  elements.profilePropertyName.value = state.profile.propertyName;
  elements.profileCity.value = state.profile.city;
  elements.profileDueDay.value = state.profile.defaultDueDay;
  elements.profileReminderTime.value = state.profile.reminderTime;
  if (elements.profileUpiId) {
    elements.profileUpiId.value = state.profile.upiId || "";
  }
  if (elements.profileOwnerWhatsapp) {
    elements.profileOwnerWhatsapp.value = state.profile.ownerWhatsapp || "";
  }
  if (elements.profileAppPin) {
    elements.profileAppPin.value = state.profile.appPin || "";
  }
  if (elements.profileGithubToken) {
    elements.profileGithubToken.value = state.profile.githubToken || "";
  }
  if (elements.profileGithubGistId) {
    elements.profileGithubGistId.value = state.profile.githubGistId || "e6074ee14fc1506ed012f42f894a16d7";
  }
  renderLogoPreview();
}

function renderAll() {
  ensureSelectedTenant();
  elements.globalSearchInput.value = ui.tenantSearch;
  if (elements.tenantSearchInput) {
    elements.tenantSearchInput.value = ui.tenantSearch;
  }
  renderSummary();
  renderProfileSnapshot();
  renderPaymentTenantOptions();
  renderDueList();
  renderTenantDirectory();
  renderTenantDetail();
  renderFilterChips();
  renderTenantDocumentHint();

  hydratePaymentForm(true);
  renderReceiptPanel();
  renderPaymentRequestPanel();
  renderTenantPortalPanel();
  renderTenantIntakePanel();
  renderDriveBackupPanel();
}

function renderSummary() {
  const metrics = getSummaryMetrics();
  const monthLabel = formatMonthLabel(currentMonthKey());
  elements.summaryGrid.innerHTML = [
    createMetricCard("Total Tenants", metrics.totalTenants, "Active room records", "accent"),
    createMetricCard("This Month Received", formatMoney(metrics.collectedThisMonth), `${metrics.paidTenantCount} tenant updated`, "warm"),
    createMetricCard("Current Pending", formatMoney(metrics.currentPending), `${metrics.dueTenantCount} tenant pending`, "accent"),
    createMetricCard("Advance Balance", formatMoney(metrics.advanceBalance), `${metrics.documentMissingCount} document pending`, "warm")
  ].join("");
  elements.sidebarTenantCount.textContent = String(metrics.totalTenants);
  elements.sidebarDueCount.textContent = String(metrics.dueTenantCount);
  elements.sidebarReceivedValue.textContent = formatMoney(metrics.collectedThisMonth);

  if (elements.heroMonthLabel) {
    elements.heroMonthLabel.textContent = monthLabel;
  }

  if (elements.heroCollectionValue) {
    elements.heroCollectionValue.textContent = formatMoney(metrics.collectedThisMonth);
  }

  if (elements.heroCollectionNote) {
    elements.heroCollectionNote.textContent =
      metrics.dueTenantCount > 0
        ? `${metrics.dueTenantCount} room${metrics.dueTenantCount === 1 ? "" : "s"} still have an open balance.`
        : "All current rooms are clear for this billing month.";
  }

  if (elements.heroDueCount) {
    elements.heroDueCount.textContent = String(metrics.dueTenantCount);
  }

  if (elements.heroPendingValue) {
    elements.heroPendingValue.textContent = formatMoney(metrics.currentPending);
  }

  if (elements.heroAdvanceValue) {
    elements.heroAdvanceValue.textContent = formatMoney(metrics.advanceBalance);
  }

  if (elements.heroTenantValue) {
    elements.heroTenantValue.textContent = String(metrics.totalTenants);
  }
}

function renderProfileSnapshot() {
  const propertyName = state.profile.propertyName || "Krishna Residency";
  const rawOwnerName = cleanString(state.profile.ownerName);
  const ownerName = rawOwnerName || "Owner not set";
  const city = state.profile.city || "Area not set";
  const reminderTime = state.profile.reminderTime || "09:00";
  const ownerInitials = getInitials(rawOwnerName, "KR");
  const brandLogoSrc = getBrandLogoSrc();

  elements.sidebarReminderTime.textContent = reminderTime;
  if (elements.sidebarPropertyName) {
    elements.sidebarPropertyName.textContent = propertyName;
  }
  if (elements.topbarPropertyName) {
    elements.topbarPropertyName.textContent = propertyName;
  }
  elements.overviewOwnerValue.textContent = ownerName;
  elements.overviewPropertyValue.textContent = propertyName;
  elements.overviewCityValue.textContent = city;
  elements.overviewReminderValue.textContent = reminderTime;
  elements.topbarOwnerBadge.title = ownerName;
  if (elements.sidebarBrandLogo) {
    elements.sidebarBrandLogo.src = brandLogoSrc;
    elements.sidebarBrandLogo.alt = `${propertyName} logo`;
  }
  if (elements.topbarOwnerLogoImage) {
    elements.topbarOwnerLogoImage.src = brandLogoSrc;
    elements.topbarOwnerLogoImage.alt = `${propertyName} logo`;
    elements.topbarOwnerLogoImage.hidden = false;
  }
  if (elements.topbarOwnerBadgeText) {
    elements.topbarOwnerBadgeText.textContent = brandLogoSrc ? "" : ownerInitials;
    elements.topbarOwnerBadgeText.hidden = Boolean(brandLogoSrc);
  }
  if (elements.topbarOwnerBadge) {
    elements.topbarOwnerBadge.classList.toggle("has-logo", Boolean(brandLogoSrc));
  }
}

function renderDriveBackupPanel() {
  if (elements.topbarBackupLabel) {
    elements.topbarBackupLabel.textContent = "Local";
  }
}

function toggleMobileNav(forceState) {
  const nextState = typeof forceState === "boolean" ? forceState : !ui.isMobileNavOpen;
  ui.isMobileNavOpen = nextState && isMobileNavViewport();
  syncMobileNavState();
}

function closeMobileNav() {
  if (!ui.isMobileNavOpen && !isMobileNavViewport()) {
    return;
  }

  ui.isMobileNavOpen = false;
  syncMobileNavState();
}

function syncMobileNavState() {
  const isMobile = isMobileNavViewport();
  const isOpen = isMobile && ui.isMobileNavOpen;

  document.body.classList.toggle("is-mobile-nav-open", isOpen);

  if (elements.mobileMenuBtn) {
    elements.mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
  }

  if (elements.mobileNavBackdrop) {
    elements.mobileNavBackdrop.setAttribute("aria-hidden", String(!isOpen));
  }

  if (elements.appSidebar) {
    elements.appSidebar.setAttribute("aria-hidden", String(isMobile ? !isOpen : false));
  }
}

function handleViewportChange() {
  if (!isMobileNavViewport() && ui.isMobileNavOpen) {
    ui.isMobileNavOpen = false;
  }

  syncMobileNavState();
}

function switchTab(tabName, options = {}) {
  if (!APP_TABS.includes(tabName)) {
    return;
  }

  ui.activeTab = tabName;

  document.querySelectorAll(".nav-tab, .dock-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });

  if (options.syncHash !== false && window.location.hash !== `#${tabName}`) {
    history.replaceState(null, "", `#${tabName}`);
  }

  if (options.scroll === false) {
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: isLikelyMobileDevice() ? "smooth" : "auto"
  });
}

function getInitialTab() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return "overview";
  }

  if (APP_TABS.includes(hash)) {
    return hash;
  }

  return SECTION_TAB_MAP[hash] || "overview";
}

function scrollToInitialHashTarget() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || APP_TABS.includes(hash)) {
    return;
  }

  const target = document.getElementById(hash);
  if (!target) {
    return;
  }

  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "auto", block: "start" });
  });
}

function isDriveAutoBackupSupported() {
  return Boolean(window.isSecureContext && window.showDirectoryPicker);
}

function scheduleDriveAutoBackup() {
  if (!driveFolderHandle) {
    return;
  }

  clearTimeout(ui.autoBackupTimer);
  ui.autoBackupTimer = window.setTimeout(() => {
    backupStateToDrive({ manual: false }).catch((error) => {
      console.error(error);
    });
  }, AUTO_BACKUP_DELAY_MS);
}

async function connectDriveFolder() {
  if (!isDriveAutoBackupSupported()) {
    showToast("Automatic folder backup is available only in Chrome or Edge desktop.");
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: "readwrite"
    });

    const granted = await ensureDirectoryPermission(handle, true, true);
    if (!granted) {
      showToast("Folder access is required to continue.");
      return;
    }

    driveFolderHandle = handle;
    driveBackupMeta = {
      ...driveBackupMeta,
      folderName: handle.name
    };
    await writeToDb(DRIVE_FOLDER_KEY, handle);
    await writeToDb(DRIVE_META_KEY, driveBackupMeta);
    renderDriveBackupPanel();
    await backupStateToDrive({ manual: true });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }
    console.error(error);
    showToast("The Drive folder could not be connected.");
  }
}

async function runDriveBackupNow() {
  const success = await backupStateToDrive({ manual: true });
  if (success) {
    showToast("Backup was updated.");
  }
}

async function disconnectDriveFolder() {
  if (!driveFolderHandle) {
    return;
  }

  const shouldDisconnect = await openConfirmDialog({
    title: "Disconnect backup folder",
    body: "This will remove the linked backup folder from the software. Existing files will remain there, but new saves will stop syncing automatically.",
    confirmText: "Disconnect",
    cancelText: "Keep Connected",
    tone: "danger"
  });
  if (!shouldDisconnect) {
    return;
  }

  driveFolderHandle = null;
  driveBackupMeta = createDefaultDriveBackupMeta();
  clearTimeout(ui.autoBackupTimer);
  await deleteFromDb(DRIVE_FOLDER_KEY);
  await deleteFromDb(DRIVE_META_KEY);
  renderDriveBackupPanel();
  showToast("Drive auto backup was disconnected.");
}

async function backupStateToDrive({ manual }) {
  if (!driveFolderHandle) {
    if (manual) {
      showToast("Connect a backup folder first.");
    }
    return false;
  }

  const permitted = await ensureDirectoryPermission(driveFolderHandle, true, manual);
  if (!permitted) {
    renderDriveBackupPanel();
    if (manual) {
      showToast("Folder permission was not granted.");
    }
    return false;
  }

  const backupDirectory = await driveFolderHandle.getDirectoryHandle(AUTO_BACKUP_DIRECTORY, { create: true });
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      state
    },
    null,
    2
  );
  const latestFileName = AUTO_BACKUP_LATEST_FILE;
  const snapshotDay = getTodayIso();
  const snapshotNeeded = manual || driveBackupMeta.lastSnapshotDay !== snapshotDay;

  await writeTextFile(backupDirectory, "README.txt", DRIVE_BACKUP_README);
  await writeTextFile(backupDirectory, latestFileName, payload);

  let snapshotFileName = latestFileName;
  if (snapshotNeeded) {
    snapshotFileName = `rent-collection-drive-backup-${getTimestampSlug()}.json`;
    await writeTextFile(backupDirectory, snapshotFileName, payload);
  }

  driveBackupMeta = {
    folderName: driveFolderHandle.name,
    lastBackupAt: new Date().toISOString(),
    lastBackupFile: snapshotFileName,
    lastSnapshotDay: snapshotDay
  };
  await writeToDb(DRIVE_META_KEY, driveBackupMeta);
  renderDriveBackupPanel();
  return true;
}

async function ensureDirectoryPermission(handle, writeAccess, allowPrompt) {
  if (!handle) {
    return false;
  }

  const options = {
    mode: writeAccess ? "readwrite" : "read"
  };

  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }

  if (!allowPrompt) {
    return false;
  }

  return (await handle.requestPermission(options)) === "granted";
}

async function writeTextFile(directoryHandle, name, content) {
  const fileHandle = await directoryHandle.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

function createMetricCard(label, value, note, tone) {
  return `
    <article class="metric-card" data-tone="${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `;
}

function getSummaryMetrics() {
  let collectedThisMonth = 0;
  let currentPending = 0;
  let advanceBalance = 0;
  let paidTenantCount = 0;
  let dueTenantCount = 0;
  let documentMissingCount = 0;
  const monthKey = currentMonthKey();

  state.tenants.forEach((tenant) => {
    const snapshot = getMonthSnapshot(tenant, monthKey);
    const advance = getAdvanceBalance(tenant);
    advanceBalance += advance;
    currentPending += snapshot.outstanding;
    collectedThisMonth += snapshot.paidAmount;

    if (snapshot.outstanding > 0) {
      dueTenantCount += 1;
    } else if (snapshot.total > 0) {
      paidTenantCount += 1;
    }

    if (!tenant.aadhaarDocument) {
      documentMissingCount += 1;
    }
  });

  return {
    totalTenants: state.tenants.length,
    collectedThisMonth,
    currentPending,
    advanceBalance,
    paidTenantCount,
    dueTenantCount,
    documentMissingCount
  };
}

function renderPaymentTenantOptions() {
  const currentValue = elements.collectionTenantId.value;
  const options = [`<option value="">Select tenant</option>`]
    .concat(
      state.tenants.map(
        (tenant) =>
          `<option value="${escapeHtml(tenant.id)}">${escapeHtml(tenant.fullName)} - Room ${escapeHtml(
            tenant.roomNumber || "-"
          )}</option>`
      )
    )
    .join("");

  elements.collectionTenantId.innerHTML = options;
  const nextValue = currentValue || ui.selectedTenantId || "";

  if (state.tenants.some((tenant) => tenant.id === nextValue)) {
    elements.collectionTenantId.value = nextValue;
  } else if (state.tenants[0]) {
    elements.collectionTenantId.value = state.tenants[0].id;
  } else {
    elements.collectionTenantId.value = "";
  }
}

function hydratePaymentForm(keepManualMonth = true) {
  if (!keepManualMonth || !elements.collectionMonth.value) {
    elements.collectionMonth.value = currentMonthKey();
  }

  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  const monthKey = isValidMonthKey(elements.collectionMonth.value) ? elements.collectionMonth.value : currentMonthKey();

  if (!tenant) {
    elements.collectionModeLabel.textContent = "Add a tenant first, then save a collection record.";
    elements.availableAdvanceHint.textContent = "Available advance: Rs 0";
    elements.paymentSubmitBtn.disabled = true;
    resetPaymentFieldsOnly();
    elements.collectionFullPaid.checked = false;
    elements.collectionFullPaid.disabled = true;
    setFullPaidMode(false);
    updatePaymentPreview();
    renderReceiptPanel();
    return;
  }

  elements.paymentSubmitBtn.disabled = false;
  elements.collectionFullPaid.disabled = false;
  const record = getPaymentByMonth(tenant, monthKey);
  const recordSummary = record ? getPaymentSummary(record) : null;
  const availableAdvance = getAvailableAdvanceForMonth(tenant, monthKey);
  const moveInLabel = tenant.startDate ? ` Move-in date: ${formatDateLabel(tenant.startDate)}.` : "";

  if (record) {
    elements.collectionModeLabel.textContent = `Editing the saved record for ${formatMonthLabel(monthKey)}.${moveInLabel}`;
  } else {
    elements.collectionModeLabel.textContent = `Create a new collection entry for ${formatMonthLabel(monthKey)}.${moveInLabel}`;
  }

  elements.availableAdvanceHint.textContent = `Available advance: ${formatMoney(availableAdvance)}`;
  elements.collectionRentAmount.value = record ? record.rentAmount : tenant.monthlyRent || "";
  elements.collectionElectricityPreviousReading.value =
    record && record.electricityPreviousReading ? record.electricityPreviousReading : "";
  elements.collectionElectricityCurrentReading.value =
    record && record.electricityCurrentReading ? record.electricityCurrentReading : "";
  elements.collectionElectricityUnits.value = record && record.electricityUnits ? record.electricityUnits : "";
  elements.collectionElectricityRate.value = record && record.electricityRate ? record.electricityRate : "";
  elements.collectionElectricityBill.value = record ? record.electricityBill : "";
  elements.collectionWaterBill.value = record ? record.waterBill : tenant.defaultWaterBill || "";
  elements.collectionOtherCharge.value = record ? record.otherCharge : "";
  elements.collectionAdvanceUsed.value = record ? record.advanceUsed : "";
  elements.collectionPaidAmount.value = record ? record.paidAmount : "";
  elements.collectionFullPaid.checked = Boolean(recordSummary && recordSummary.total > 0 && recordSummary.outstanding === 0);
  setFullPaidMode(elements.collectionFullPaid.checked);
  elements.collectionPaymentDate.value = record ? record.paymentDate : getTodayIso();
  elements.collectionPaymentMode.value = record ? record.paymentMode : "cash";
  if (elements.collectionNotes) {
    elements.collectionNotes.value = record ? record.notes : "";
  }
  updateElectricityCalculation();
  updatePaymentPreview();
  renderReceiptPanel();
  renderPaymentRequestPanel();
  renderTenantPortalPanel();
}

function resetPaymentFieldsOnly() {
  [
    elements.collectionRentAmount,
    elements.collectionElectricityPreviousReading,
    elements.collectionElectricityCurrentReading,
    elements.collectionElectricityUnits,
    elements.collectionElectricityRate,
    elements.collectionElectricityBill,
    elements.collectionWaterBill,
    elements.collectionOtherCharge,
    elements.collectionAdvanceUsed,
    elements.collectionPaidAmount,
    elements.collectionPaymentDate,
    elements.collectionNotes
  ]
    .filter(Boolean)
    .forEach((field) => {
      field.value = "";
    });
  elements.collectionPaymentMode.value = "cash";
  elements.collectionFullPaid.checked = false;
  setFullPaidMode(false);
}

function updatePaymentPreview() {
  const values = getPaymentFormValues();
  const total = roundMoney(values.rentAmount + values.electricityBill + values.waterBill + values.otherCharge - values.advanceUsed);
  const safeTotal = Math.max(0, total);
  elements.collectionCalculatedTotal.value = formatMoney(safeTotal);

  if (elements.collectionFullPaid.checked) {
    elements.collectionPaidAmount.value = safeTotal > 0 ? String(safeTotal) : "";
  }

  setFullPaidMode(elements.collectionFullPaid.checked);
  const safePaid = Math.max(0, toMoney(elements.collectionPaidAmount.value));
  const balance = Math.max(0, roundMoney(safeTotal - safePaid));
  elements.previewTotalAmount.textContent = formatMoney(safeTotal);
  elements.previewPaidAmount.textContent = formatMoney(safePaid);
  elements.previewBalanceAmount.textContent = formatMoney(balance);
  renderPaymentRequestPanel();
  renderTenantPortalPanel();
}

function setFullPaidMode(isFullPaid) {
  elements.collectionPaidAmount.readOnly = Boolean(isFullPaid);
  elements.collectionPaidAmount.classList.toggle("is-locked", Boolean(isFullPaid));
  elements.collectionPaidAmount.setAttribute("aria-readonly", isFullPaid ? "true" : "false");
}

function getPaymentFormValues() {
  const previousReadingRaw = elements.collectionElectricityPreviousReading.value;
  const currentReadingRaw = elements.collectionElectricityCurrentReading.value;
  const electricityPreviousReading = roundMoney(Number(previousReadingRaw) || 0);
  const electricityCurrentReading = roundMoney(Number(currentReadingRaw) || 0);
  const hasPreviousReading = previousReadingRaw !== "";
  const hasCurrentReading = currentReadingRaw !== "";
  const hasAnyMeterReading = hasPreviousReading || hasCurrentReading;
  const hasCompleteMeterReading = hasPreviousReading && hasCurrentReading;
  const calculatedUnits = hasCompleteMeterReading
    ? roundMoney(electricityCurrentReading - electricityPreviousReading)
    : roundMoney(Number(elements.collectionElectricityUnits.value) || 0);

  return {
    rentAmount: toMoney(elements.collectionRentAmount.value),
    electricityPreviousReading,
    electricityCurrentReading,
    hasAnyMeterReading,
    hasCompleteMeterReading,
    electricityUnits: calculatedUnits,
    electricityRate: toMoney(elements.collectionElectricityRate.value),
    electricityBill: toMoney(elements.collectionElectricityBill.value),
    waterBill: toMoney(elements.collectionWaterBill.value),
    otherCharge: toMoney(elements.collectionOtherCharge.value),
    advanceUsed: toMoney(elements.collectionAdvanceUsed.value),
    paidAmount: toMoney(elements.collectionPaidAmount.value)
  };
}

function updateElectricityCalculation() {
  const values = getPaymentFormValues();
  const existingBillValue = cleanString(elements.collectionElectricityBill.value);

  if (values.hasCompleteMeterReading) {
    if (values.electricityUnits < 0) {
      elements.collectionElectricityUnits.value = "";
      elements.collectionElectricityBill.value = "";
      elements.electricityCalcHint.textContent = "Current reading must be greater than or equal to the previous reading.";
    } else {
      const unitLabel = formatReadingValue(values.electricityUnits);
      elements.collectionElectricityUnits.value = unitLabel;

      if (values.electricityRate > 0) {
        const bill = roundMoney(values.electricityUnits * values.electricityRate);
        elements.collectionElectricityBill.value = bill;
        elements.electricityCalcHint.textContent = `${formatReadingValue(
          values.electricityCurrentReading
        )} - ${formatReadingValue(values.electricityPreviousReading)} = ${unitLabel} units | ${unitLabel} x ${formatMoney(
          values.electricityRate
        )} = ${formatMoney(bill)}`;
      } else {
        elements.collectionElectricityBill.value = "";
        elements.electricityCalcHint.textContent = `${formatReadingValue(values.electricityCurrentReading)} - ${formatReadingValue(
          values.electricityPreviousReading
        )} = ${unitLabel} units`;
      }
    }
  } else if (values.hasAnyMeterReading) {
    elements.collectionElectricityUnits.value = "";
    elements.collectionElectricityBill.value = "";
    elements.electricityCalcHint.textContent = "";
  } else if (values.electricityUnits > 0 && values.electricityRate > 0) {
    elements.collectionElectricityUnits.value = formatReadingValue(values.electricityUnits);
    const bill = roundMoney(values.electricityUnits * values.electricityRate);
    elements.collectionElectricityBill.value = bill;
    elements.electricityCalcHint.textContent = `${formatReadingValue(values.electricityUnits)} units x ${formatMoney(
      values.electricityRate
    )} = ${formatMoney(bill)}`;
  } else if (values.electricityUnits > 0 || values.electricityRate > 0) {
    elements.collectionElectricityBill.value = "";
    elements.electricityCalcHint.textContent = "";
  } else if (existingBillValue) {
    elements.electricityCalcHint.textContent = "";
  } else {
    elements.electricityCalcHint.textContent = "";
  }

  updatePaymentPreview();
}

function renderDueList() {
  const dueItems = collectOutstandingItems();

  if (!dueItems.length) {
    elements.dueList.innerHTML = createEmptyState(
      "No tenants are pending",
      "All records for the current month are clear. Reminder cards will appear here when a new month becomes due."
    );
    return;
  }

  elements.dueList.innerHTML = dueItems
    .map((item) => {
      const tone = getStatusTone(item);
      const hint = item.isEstimated ? "Estimated from monthly rent + default water" : "Saved collection record";
      return `
        <article class="due-item">
          <div class="tenant-topline">
            <div>
              <div class="tenant-name">${escapeHtml(item.tenant.fullName)}</div>
              <div class="tenant-subline">
                Room ${escapeHtml(item.tenant.roomNumber || "-")} • ${escapeHtml(formatMonthLabel(item.monthKey))}
              </div>
            </div>
            <span class="status-chip" data-tone="${tone}">${escapeHtml(getStatusLabel(item))}</span>
          </div>

          <div class="metric-strip">
            <div class="detail-metric">
              <span>Total</span>
              <strong>${escapeHtml(formatMoney(item.total))}</strong>
            </div>
            <div class="detail-metric">
              <span>Paid</span>
              <strong>${escapeHtml(formatMoney(item.paidAmount))}</strong>
            </div>
            <div class="detail-metric">
              <span>Balance</span>
              <strong>${escapeHtml(formatMoney(item.outstanding))}</strong>
            </div>
          </div>

          <div class="section-note">${escapeHtml(hint)} • Due day ${escapeHtml(String(getTenantDueDay(item.tenant)))}</div>

          <div class="tenant-actions">
            <button class="mini-button" data-action="select-tenant" data-tenant-id="${escapeHtml(item.tenant.id)}" type="button">Open</button>
            <button class="mini-button" data-action="collect" data-tenant-id="${escapeHtml(item.tenant.id)}" data-month-key="${escapeHtml(
              item.monthKey
            )}" type="button">Collect</button>
            <button class="mini-button" data-action="whatsapp" data-tenant-id="${escapeHtml(item.tenant.id)}" data-month-key="${escapeHtml(
              item.monthKey
            )}" type="button">WhatsApp Request</button>
            <button class="mini-button" data-action="reminder" data-tenant-id="${escapeHtml(item.tenant.id)}" data-month-key="${escapeHtml(
              item.monthKey
            )}" type="button">Phone Reminder</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTenantDirectory() {
  if (!elements.tenantDirectory) {
    return;
  }

  const tenants = state.tenants.filter(matchesTenantSearchAndFilter);

  if (!tenants.length) {
    elements.tenantDirectory.innerHTML = createEmptyState(
      "No tenant found",
      "Clear the search or filters, or add a new tenant."
    );
    return;
  }

  elements.tenantDirectory.innerHTML = tenants
    .map((tenant) => {
      const current = getMonthSnapshot(tenant, currentMonthKey());
      const totalOutstanding = getTenantOutstandingTotal(tenant);
      const documentTag = tenant.aadhaarDocument
        ? `<span class="tag">Aadhaar saved</span>`
        : `<span class="tag" data-tone="danger">Aadhaar pending</span>`;
      const mobileTag = tenant.mobile
        ? `<span class="tag" data-tone="warm">${escapeHtml(formatMobileForCard(tenant.mobile))}</span>`
        : `<span class="tag" data-tone="danger">Mobile missing</span>`;
      return `
        <article class="tenant-card ${tenant.id === ui.selectedTenantId ? "is-selected" : ""}" tabindex="0" data-card-tenant-id="${escapeHtml(
        tenant.id
      )}">
          <div class="tenant-topline">
            <div>
              <div class="tenant-name">${escapeHtml(tenant.fullName)}</div>
              <div class="tenant-subline">
                Room ${escapeHtml(tenant.roomNumber || "-")} • ${escapeHtml(tenant.floor || "Floor not set")}
              </div>
            </div>
            <span class="status-chip" data-tone="${getStatusTone(current)}">${escapeHtml(getStatusLabel(current))}</span>
          </div>

          <div class="detail-copy">
            <div>Monthly rent: <strong>${escapeHtml(formatMoney(tenant.monthlyRent))}</strong></div>
            <div>Current pending: <strong>${escapeHtml(formatMoney(current.outstanding))}</strong></div>
            <div>Total open balance: <strong>${escapeHtml(formatMoney(totalOutstanding))}</strong></div>
          </div>

          <div class="filter-row">
            ${documentTag}
            ${mobileTag}
            <span class="tag">Advance ${escapeHtml(formatMoney(getAdvanceBalance(tenant)))}</span>
          </div>

          <div class="tenant-actions">
            <button class="mini-button" data-action="edit" data-tenant-id="${escapeHtml(tenant.id)}" type="button">Edit</button>
            <button class="mini-button" data-action="collect" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
              currentMonthKey()
            )}" type="button">Collect</button>
            <button class="mini-button" data-action="whatsapp" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
              currentMonthKey()
            )}" type="button">WhatsApp Request</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTenantDetail() {
  if (!elements.tenantDetail) {
    return;
  }

  const tenant = getTenantById(ui.selectedTenantId);

  if (!tenant) {
    elements.tenantDetail.innerHTML = createEmptyState(
      "Select a tenant",
      "Click any tenant card to view that tenant's ledger and Aadhaar document here."
    );
    return;
  }

  const current = getMonthSnapshot(tenant, currentMonthKey());
  const openItems = collectOutstandingItems().filter((item) => item.tenant.id === tenant.id);
  const ledgerRows = tenant.payments
    .sort((left, right) => right.monthKey.localeCompare(left.monthKey))
    .map((payment) => {
      const summary = getPaymentSummary(payment);
      return `
        <tr>
          <td>${escapeHtml(formatMonthLabel(payment.monthKey))}</td>
          <td>${escapeHtml(formatMoney(summary.total))}</td>
          <td>${escapeHtml(formatMoney(summary.paidAmount))}</td>
          <td>${escapeHtml(formatMoney(summary.outstanding))}</td>
          <td>${escapeHtml(payment.paymentDate || "-")}</td>
          <td>${escapeHtml(payment.paymentMode || "-")}</td>
          <td>
            <div class="tenant-actions">
              <button class="mini-button" data-action="collect" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
        payment.monthKey
      )}" type="button">Edit</button>
              <button class="mini-button" data-action="receipt" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
        payment.monthKey
      )}" type="button">Receipt</button>
              <button class="mini-button" data-action="sms-receipt" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
        payment.monthKey
      )}" type="button">SMS</button>
              <button class="mini-button" data-action="delete-payment" data-tenant-id="${escapeHtml(
                tenant.id
              )}" data-month-key="${escapeHtml(payment.monthKey)}" data-tone="danger" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.tenantDetail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-hero field-wide">
        <div>
          <span class="eyebrow">Room ${escapeHtml(tenant.roomNumber || "-")}</span>
          <h3>${escapeHtml(tenant.fullName)}</h3>
          <div class="tenant-subline">${escapeHtml(tenant.floor || "Floor not set")} • Start ${escapeHtml(
    tenant.startDate
  )}</div>
        </div>

        <div class="detail-actions">
          <button class="mini-button" data-action="edit" data-tenant-id="${escapeHtml(tenant.id)}" type="button">Edit Tenant</button>
          <button class="mini-button" data-action="collect" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
    currentMonthKey()
  )}" data-tone="accent" type="button">Collect</button>
          <button class="mini-button" data-action="whatsapp" data-tenant-id="${escapeHtml(tenant.id)}" data-month-key="${escapeHtml(
    currentMonthKey()
  )}" type="button">WhatsApp Request</button>
          <button class="mini-button" data-action="delete-tenant" data-tenant-id="${escapeHtml(
            tenant.id
          )}" data-tone="danger" type="button">Delete</button>
        </div>
      </div>

      <div class="detail-metric">
        <span>Current pending</span>
        <strong>${escapeHtml(formatMoney(current.outstanding))}</strong>
      </div>

      <div class="detail-metric">
        <span>Total open balance</span>
        <strong>${escapeHtml(formatMoney(getTenantOutstandingTotal(tenant)))}</strong>
      </div>

      <div class="detail-metric">
        <span>Advance balance</span>
        <strong>${escapeHtml(formatMoney(getAdvanceBalance(tenant)))}</strong>
      </div>

      <div class="doc-card">
        <strong>Contact & Notes</strong>
        <div class="detail-copy">
          <div>Mobile: ${escapeHtml(tenant.mobile || "Not saved")}</div>
          <div>Due day: ${escapeHtml(String(getTenantDueDay(tenant)))}</div>
          <div>Address: ${escapeHtml(tenant.address || "No address note")}</div>
          <div>Notes: ${escapeHtml(tenant.notes || "No notes")}</div>
        </div>
      </div>

      ${renderDocumentCard(tenant)}

      <div class="doc-card field-wide">
        <strong>Pending items</strong>
        ${
          openItems.length
            ? `<div class="filter-row">${openItems
                .map(
                  (item) =>
                    `<span class="tag" data-tone="${getStatusTone(item) === "paid" ? "warm" : "danger"}">${escapeHtml(
                      `${formatMonthLabel(item.monthKey)} • ${formatMoney(item.outstanding)}`
                    )}</span>`
                )
                .join("")}</div>`
            : `<p>No open balance. Current records are clear.</p>`
        }
      </div>

      <div class="ledger-table-wrap field-wide">
        ${
          ledgerRows
            ? `<table class="ledger-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Payment Date</th>
                    <th>Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>${ledgerRows}</tbody>
              </table>`
            : createEmptyState("Ledger is empty", "No month-wise collection record has been saved for this tenant yet.")
        }
      </div>
    </div>
  `;
}

function renderDocumentCard(tenant) {
  if (!tenant.aadhaarDocument) {
    return `
      <div class="doc-card">
        <strong>Aadhaar Copy</strong>
        <p>No document has been uploaded yet. Edit the tenant and save an image or PDF.</p>
      </div>
    `;
  }

  const doc = tenant.aadhaarDocument;
  const isImage = doc.type.startsWith("image/");
  const preview = isImage
    ? `<div class="doc-preview"><img src="${doc.dataUrl}" alt="Aadhaar preview for ${escapeHtml(tenant.fullName)}" /></div>`
    : `<div class="doc-preview">
        <div class="empty-state">
          <strong>PDF saved</strong>
          <p>${escapeHtml(doc.name)}</p>
        </div>
      </div>`;

  return `
    <div class="doc-card">
      <strong>Aadhaar Copy</strong>
      ${preview}
      <p>${escapeHtml(doc.name)} • ${escapeHtml(formatFileSize(doc.size))}</p>
      <div class="tenant-actions">
        <a class="mini-button" href="${doc.dataUrl}" target="_blank" rel="noopener">Open File</a>
        <button class="mini-button" data-action="remove-document" data-tenant-id="${escapeHtml(tenant.id)}" data-tone="danger" type="button">Remove</button>
      </div>
    </div>
  `;
}

function renderFilterChips() {
  if (!elements.tenantFilters) {
    return;
  }

  Array.from(elements.tenantFilters.querySelectorAll("[data-filter]")).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === ui.tenantFilter);
  });
}

function openAadhaarCapture() {
  if (!elements.tenantAadhaarCapture) {
    return;
  }

  elements.tenantAadhaarCapture.click();
}

function handleAadhaarInputChange(source) {
  if (source === "upload" && elements.tenantAadhaarFile.files[0] && elements.tenantAadhaarCapture) {
    elements.tenantAadhaarCapture.value = "";
  }

  if (source === "capture" && elements.tenantAadhaarCapture?.files[0]) {
    elements.tenantAadhaarFile.value = "";
  }

  updateAadhaarHint();
}

function getSelectedAadhaarFile() {
  return elements.tenantAadhaarCapture?.files[0] || elements.tenantAadhaarFile.files[0] || null;
}

function renderTenantDocumentHint() {
  const tenant = getTenantById(elements.tenantId.value);
  const file = getSelectedAadhaarFile();

  if (file) {
    elements.existingDocumentHint.textContent = `${file.name} selected • ${formatFileSize(file.size)}`;
    return;
  }

  if (ui.pendingImportedAadhaarDocument) {
    elements.existingDocumentHint.textContent = `Intake request document loaded: ${ui.pendingImportedAadhaarDocument.name}`;
    return;
  }

  if (tenant && tenant.aadhaarDocument) {
    elements.existingDocumentHint.textContent = `Current file: ${tenant.aadhaarDocument.name}`;
    return;
  }

  elements.existingDocumentHint.textContent = "";
}

function renderReceiptPanel() {
  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  const monthKey = elements.collectionMonth.value;
  const record = tenant && isValidMonthKey(monthKey) ? getPaymentByMonth(tenant, monthKey) : null;

  if (!tenant || !record) {
    elements.receiptPanelTitle.textContent = "Receipt Actions";
    elements.receiptPanelNote.textContent =
      "Save a collection to unlock receipt, SMS, and WhatsApp PDF tools.";
    [elements.generateReceiptBtn, elements.sendSmsReceiptBtn, elements.sendReceiptWhatsappBtn].forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  const summary = getPaymentSummary(record);
  elements.receiptPanelTitle.textContent = "Receipt Actions";
  elements.receiptPanelNote.textContent = `${tenant.fullName} • ${formatMonthLabel(monthKey)} • Paid ${formatMoney(
    summary.paidAmount
  )} • Balance ${formatMoney(summary.outstanding)}`;
  elements.generateReceiptBtn.disabled = summary.paidAmount <= 0;
  elements.sendSmsReceiptBtn.disabled = summary.paidAmount <= 0 || !tenant.mobile;
  elements.sendReceiptWhatsappBtn.disabled = summary.paidAmount <= 0;
}

function renderPaymentRequestPanel() {
  if (!elements.paymentRequestPanel) {
    return;
  }

  const context = getActiveCollectionPaymentRequestContext();
  const qrImage = elements.paymentRequestQrImage;
  const qrEmpty = elements.paymentRequestQrEmpty;
  const requestButton = elements.sendPaymentRequestBtn;

  if (!context) {
    elements.paymentRequestNote.textContent = "Add a tenant and your UPI ID to prepare a WhatsApp payment request.";
    elements.paymentRequestAmount.textContent = formatMoney(0);
    elements.paymentRequestTenant.textContent = "-";
    elements.paymentRequestMonth.textContent = "-";
    elements.paymentRequestUpiId.textContent = state.profile.upiId || "Not set";
    if (qrImage) {
      qrImage.hidden = true;
      qrImage.removeAttribute("src");
    }
    if (qrEmpty) {
      qrEmpty.hidden = false;
    }
    if (requestButton) {
      requestButton.disabled = true;
    }
    return;
  }

  elements.paymentRequestAmount.textContent = formatMoney(context.amountDue);
  elements.paymentRequestTenant.textContent = context.tenant.fullName;
  elements.paymentRequestMonth.textContent = formatMonthLabel(context.snapshot.monthKey);
  elements.paymentRequestUpiId.textContent = context.upiId || "Not set";

  if (!context.upiId) {
    elements.paymentRequestNote.textContent = "Add your UPI ID in Settings to turn on the QR payment request.";
    if (qrImage) {
      qrImage.hidden = true;
      qrImage.removeAttribute("src");
    }
    if (qrEmpty) {
      qrEmpty.hidden = false;
    }
    if (requestButton) {
      requestButton.disabled = true;
    }
    return;
  }

  if (!context.tenant.mobile) {
    elements.paymentRequestNote.textContent = "Save the tenant mobile number before sending a WhatsApp request.";
    if (requestButton) {
      requestButton.disabled = true;
    }
  } else if (context.amountDue <= 0) {
    elements.paymentRequestNote.textContent = "No pending amount is left for this month.";
    if (requestButton) {
      requestButton.disabled = true;
    }
  } else {
    elements.paymentRequestNote.textContent = `${context.amountLabel} payment request with UPI QR is ready to send on WhatsApp.`;
    if (requestButton) {
      requestButton.disabled = false;
    }
  }

  if (qrImage) {
    if (context.qrUrl) {
      qrImage.hidden = true;
      if (qrEmpty) {
        qrEmpty.hidden = false;
      }
      qrImage.onload = () => {
        qrImage.hidden = false;
        if (qrEmpty) {
          qrEmpty.hidden = true;
        }
      };
      qrImage.onerror = () => {
        qrImage.hidden = true;
        qrImage.removeAttribute("src");
        if (qrEmpty) {
          qrEmpty.hidden = false;
        }
      };
      qrImage.src = context.qrUrl;
    } else {
      qrImage.hidden = true;
      qrImage.removeAttribute("src");
      if (qrEmpty) {
        qrEmpty.hidden = false;
      }
    }
  }
}

function handleTenantDirectoryClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    runAction(actionButton.dataset.action, actionButton.dataset.tenantId, actionButton.dataset.monthKey);
    return;
  }

  const card = event.target.closest("[data-card-tenant-id]");
  if (!card) {
    return;
  }

  ui.selectedTenantId = card.dataset.cardTenantId;
  renderTenantDirectory();
  renderTenantDetail();
}

function handleDueListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  runAction(button.dataset.action, button.dataset.tenantId, button.dataset.monthKey);
}

function handleTenantDetailClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  runAction(button.dataset.action, button.dataset.tenantId, button.dataset.monthKey);
}

async function runAction(action, tenantId, monthKey) {
  const tenant = getTenantById(tenantId);

  if (!tenant && action !== "select-tenant") {
    return;
  }

  if (action === "select-tenant") {
    ui.selectedTenantId = tenantId;
    switchTab("tenants", { scroll: false });
    renderTenantDirectory();
    renderTenantDetail();
    return;
  }

  if (action === "edit") {
    switchTab("tenants", { scroll: false });
    fillTenantForm(tenant);
    scrollToSection("tenantEntry");
    return;
  }

  if (action === "collect") {
    ui.selectedTenantId = tenant.id;
    switchTab("collections", { scroll: false });
    elements.collectionTenantId.value = tenant.id;
    elements.collectionMonth.value = isValidMonthKey(monthKey) ? monthKey : currentMonthKey();
    renderTenantDirectory();
    renderTenantDetail();
    hydratePaymentForm(true);
    scrollToSection("collectionEntry");
    return;
  }

  if (action === "whatsapp") {
    switchTab("reminders", { scroll: false });
    openWhatsAppReminder(tenant, monthKey);
    return;
  }

  if (action === "receipt") {
    switchTab("collections", { scroll: false });
    openReceiptWindow(tenant, monthKey);
    return;
  }

  if (action === "sms-receipt") {
    switchTab("collections", { scroll: false });
    sendSmsReceipt(tenant, monthKey);
    return;
  }

  if (action === "reminder") {
    switchTab("reminders", { scroll: false });
    createReminderForTenant(tenant, monthKey);
    return;
  }

  if (action === "delete-payment") {
    await deletePaymentRecord(tenant, monthKey);
    return;
  }

  if (action === "remove-document") {
    const confirmDelete = await openConfirmDialog({
      title: "Remove Aadhaar document",
      body: "This will remove the saved Aadhaar file from this tenant record.",
      confirmText: "Remove File",
      cancelText: "Keep File",
      tone: "danger"
    });
    if (!confirmDelete) {
      return;
    }

    tenant.aadhaarDocument = null;
    await persistState();
    renderAll();
    showToast("The Aadhaar file was removed.");
    return;
  }

  if (action === "delete-tenant") {
    const confirmDelete = await openConfirmDialog({
      title: "Delete tenant record",
      body: `Delete the full record for ${tenant.fullName}? This also removes the saved ledger history for this tenant.`,
      confirmText: "Delete Tenant",
      cancelText: "Keep Tenant",
      tone: "danger"
    });
    if (!confirmDelete) {
      return;
    }

    state.tenants = state.tenants.filter((item) => item.id !== tenant.id);
    if (ui.selectedTenantId === tenant.id) {
      ui.selectedTenantId = state.tenants[0] ? state.tenants[0].id : null;
    }
    await persistState();
    resetTenantForm();
    renderAll();
    showToast("The tenant record was deleted.");
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  const nextLogoDataUrl =
    ui.pendingProfileLogoDataUrl === null ? state.profile.brandLogoDataUrl || "" : ui.pendingProfileLogoDataUrl || "";
  const appPin = elements.profileAppPin ? elements.profileAppPin.value.trim() : "";
  const githubToken = elements.profileGithubToken ? elements.profileGithubToken.value.trim() : "";
  const githubGistId = elements.profileGithubGistId ? elements.profileGithubGistId.value.trim() : "";
  const tokenChanged = cleanString(githubToken) !== state.profile.githubToken;
  const gistChanged = cleanString(githubGistId) !== state.profile.githubGistId;

  state.profile = {
    ownerName: cleanString(elements.profileOwnerName.value),
    propertyName: cleanString(elements.profilePropertyName.value),
    city: cleanString(elements.profileCity.value),
    defaultDueDay: clampNumber(elements.profileDueDay.value, 1, 28, 5),
    reminderTime: isValidTime(elements.profileReminderTime.value) ? elements.profileReminderTime.value : "09:00",
    upiId: cleanString(elements.profileUpiId ? elements.profileUpiId.value : ""),
    ownerWhatsapp: cleanDigits(elements.profileOwnerWhatsapp ? elements.profileOwnerWhatsapp.value : ""),
    appPin: cleanDigits(appPin),
    githubToken: cleanString(githubToken),
    githubGistId: cleanString(githubGistId),
    brandLogoDataUrl: nextLogoDataUrl,
    requestInboxId: state.profile.requestInboxId,
    requestAdminKey: state.profile.requestAdminKey
  };
  ensureProfileAccessKeys();
  ui.pendingProfileLogoDataUrl = null;
  receiptLogoPdfPromise = null;
  
  if (elements.profileAppPin) {
    localStorage.setItem("local_app_pin", cleanDigits(elements.profileAppPin.value));
  }

  state.tenants = state.tenants.map((tenant) =>
    normalizeTenant({
      ...tenant,
      dueDay: tenant.dueDay || state.profile.defaultDueDay
    })
  );

  if (tokenChanged || gistChanged) {
    showToast("Sync settings updated.");
  }

  await persistState();
  renderAll();

  showToast("Setup was saved.");
}

async function handleTenantSave(event) {
  event.preventDefault();
  const fullName = cleanString(elements.tenantName.value);
  const roomNumber = cleanString(elements.tenantRoomNumber.value);

  if (!fullName || !roomNumber) {
    showToast("Tenant name and room number are required.");
    return;
  }

  const tenantId = cleanString(elements.tenantId.value) || makeId("tenant");
  const existing = getTenantById(tenantId);
  const file = getSelectedAadhaarFile();
  let document = existing ? existing.aadhaarDocument : ui.pendingImportedAadhaarDocument;

  if (file) {
    if (file.size > MAX_DOCUMENT_SIZE) {
      showToast("Keep the Aadhaar file under 4 MB.");
      return;
    }

    document = await fileToDocument(file);
  }

  const tenant = normalizeTenant({
    id: tenantId,
    fullName,
    mobile: elements.tenantMobile.value,
    totalMembers: elements.tenantTotalMembers ? elements.tenantTotalMembers.value : "",
    aadhaarNumber: elements.tenantAadhaarNumber ? elements.tenantAadhaarNumber.value : "",
    roomNumber,
    floor: elements.tenantFloor.value,
    startDate: elements.tenantStartDate.value || getTodayIso(),
    dueDay: clampNumber(elements.tenantDueDay.value, 1, 28, state.profile.defaultDueDay),
    monthlyRent: elements.tenantMonthlyRent.value,
    defaultWaterBill: elements.tenantWaterBill.value,
    advancePaid: elements.tenantAdvancePaid.value,
    address: elements.tenantAddress.value,
    notes: elements.tenantNotes.value,
    aadhaarDocument: document,
    payments: existing ? existing.payments : []
  });

  const otherTenants = state.tenants.filter((item) => item.id !== tenantId);
  otherTenants.push(tenant);
  otherTenants.sort(sortTenants);
  state.tenants = otherTenants;
  ui.selectedTenantId = tenant.id;

  await persistState();

  resetTenantForm();
  renderAll();
  showToast(existing ? "Tenant record was updated." : "A new tenant was saved.");
}

async function handlePaymentSave(event) {
  event.preventDefault();
  updateElectricityCalculation();
  const tenant = getTenantById(elements.collectionTenantId.value);
  const monthKey = elements.collectionMonth.value;

  if (!tenant) {
    showToast("Select a tenant first.");
    return;
  }

  if (!isValidMonthKey(monthKey)) {
    showToast("Select a valid billing month.");
    return;
  }

  const payment = normalizePayment({
    id: getPaymentByMonth(tenant, monthKey)?.id || makeId("payment"),
    monthKey,
    rentAmount: elements.collectionRentAmount.value || tenant.monthlyRent,
    electricityPreviousReading: elements.collectionElectricityPreviousReading.value,
    electricityCurrentReading: elements.collectionElectricityCurrentReading.value,
    electricityUnits: elements.collectionElectricityUnits.value,
    electricityRate: elements.collectionElectricityRate.value,
    electricityBill: elements.collectionElectricityBill.value,
    waterBill: elements.collectionWaterBill.value || tenant.defaultWaterBill,
    otherCharge: elements.collectionOtherCharge.value,
    advanceUsed: elements.collectionAdvanceUsed.value,
    paidAmount: elements.collectionPaidAmount.value,
    paymentDate: elements.collectionPaymentDate.value,
    paymentMode: elements.collectionPaymentMode.value,
    notes: elements.collectionNotes ? elements.collectionNotes.value : getPaymentByMonth(tenant, monthKey)?.notes || ""
  });
  const hasPreviousReading = cleanString(elements.collectionElectricityPreviousReading.value) !== "";
  const hasCurrentReading = cleanString(elements.collectionElectricityCurrentReading.value) !== "";

  if (hasPreviousReading !== hasCurrentReading) {
    showToast("Enter both previous and current meter readings, or leave both blank.");
    return;
  }

  if (hasPreviousReading && payment.electricityCurrentReading < payment.electricityPreviousReading) {
    showToast("Current meter reading cannot be lower than the previous reading.");
    return;
  }

  const availableAdvance = getAvailableAdvanceForMonth(tenant, monthKey);
  const summary = getPaymentSummary(payment);

  if (payment.advanceUsed > availableAdvance) {
    showToast(`Advance used cannot be more than the available balance of ${formatMoney(availableAdvance)}.`);
    return;
  }

  if (summary.total < 0) {
    showToast("Advance used cannot be more than the total bill.");
    return;
  }

  if (payment.paidAmount > summary.total) {
    showToast("Paid amount cannot be greater than the total bill.");
    return;
  }

  tenant.payments = tenant.payments.filter((item) => item.monthKey !== monthKey);
  tenant.payments.push(payment);
  tenant.payments.sort((left, right) => right.monthKey.localeCompare(left.monthKey));
  ui.selectedTenantId = tenant.id;

  await persistState();
  renderAll();
  showToast(`${tenant.fullName}'s record for ${formatMonthLabel(monthKey)} was saved. The receipt panel is ready.`);

  if (payment.paidAmount > 0 && tenant.mobile && isLikelyMobileDevice()) {
    const shouldOpenSms = await openConfirmDialog({
      title: "Open SMS receipt",
      body: "The collection was saved successfully. Do you want to open the SMS receipt now?",
      confirmText: "Open SMS",
      cancelText: "Later"
    });
    if (shouldOpenSms) {
      sendSmsReceipt(tenant, monthKey);
    }
  }
}

function resetTenantForm() {
  elements.tenantForm.reset();
  elements.tenantId.value = "";
  elements.tenantStartDate.value = getTodayIso();
  elements.tenantDueDay.value = state.profile.defaultDueDay;
  if (elements.tenantTotalMembers) {
    elements.tenantTotalMembers.value = "";
  }
  if (elements.tenantAadhaarNumber) {
    elements.tenantAadhaarNumber.value = "";
  }
  elements.tenantAadhaarFile.value = "";
  if (elements.tenantAadhaarCapture) {
    elements.tenantAadhaarCapture.value = "";
  }

  updateAadhaarHint();
}

function fillTenantForm(tenant) {
  elements.tenantId.value = tenant.id;
  elements.tenantName.value = tenant.fullName;
  elements.tenantMobile.value = tenant.mobile;
  if (elements.tenantTotalMembers) {
    elements.tenantTotalMembers.value = tenant.totalMembers || "";
  }
  if (elements.tenantAadhaarNumber) {
    elements.tenantAadhaarNumber.value = tenant.aadhaarNumber || "";
  }
  elements.tenantRoomNumber.value = tenant.roomNumber;
  elements.tenantFloor.value = tenant.floor;
  elements.tenantStartDate.value = tenant.startDate;
  elements.tenantDueDay.value = getTenantDueDay(tenant);
  elements.tenantMonthlyRent.value = tenant.monthlyRent;
  elements.tenantWaterBill.value = tenant.defaultWaterBill;
  elements.tenantAdvancePaid.value = tenant.advancePaid;
  elements.tenantAddress.value = tenant.address;
  elements.tenantNotes.value = tenant.notes;
  elements.tenantAadhaarFile.value = "";
  if (elements.tenantAadhaarCapture) {
    elements.tenantAadhaarCapture.value = "";
  }

  renderTenantDocumentHint();
}

function updateAadhaarHint() {
  const file = getSelectedAadhaarFile();
  if (file) {
    elements.aadhaarFileHint.textContent = `${file.name} • ${formatFileSize(file.size)}`;
  } else {
    elements.aadhaarFileHint.textContent = "Image or PDF, max 4 MB.";
  }
  renderTenantDocumentHint();
}

function ensureSelectedTenant() {
  if (!state.tenants.length) {
    ui.selectedTenantId = null;
    return;
  }

  const exists = state.tenants.some((tenant) => tenant.id === ui.selectedTenantId);
  if (!exists) {
    ui.selectedTenantId = state.tenants[0].id;
  }
}

function matchesTenantSearchAndFilter(tenant) {
  const current = getMonthSnapshot(tenant, currentMonthKey());
  const searchHaystack = [tenant.fullName, tenant.roomNumber, tenant.mobile, tenant.floor].join(" ").toLowerCase();
  const matchesSearch = !ui.tenantSearch || searchHaystack.includes(ui.tenantSearch);

  if (!matchesSearch) {
    return false;
  }

  if (ui.tenantFilter === "due") {
    return getTenantOutstandingTotal(tenant) > 0;
  }

  if (ui.tenantFilter === "paid") {
    return current.total > 0 && current.outstanding === 0;
  }

  if (ui.tenantFilter === "attention") {
    return !tenant.aadhaarDocument || !tenant.mobile || getTenantOutstandingTotal(tenant) > 0;
  }

  return true;
}

function getTenantOutstandingTotal(tenant) {
  const recorded = tenant.payments.reduce((sum, payment) => sum + getPaymentSummary(payment).outstanding, 0);
  const currentMonth = currentMonthKey();
  const hasCurrent = tenant.payments.some((payment) => payment.monthKey === currentMonth);
  const currentEstimated = hasCurrent ? 0 : getMonthSnapshot(tenant, currentMonth).outstanding;
  return roundMoney(recorded + currentEstimated);
}

function getPaymentSummary(payment) {
  const total = roundMoney(
    payment.rentAmount + payment.electricityBill + payment.waterBill + payment.otherCharge - payment.advanceUsed
  );
  const safeTotal = Math.max(0, total);
  const paidAmount = Math.max(0, toMoney(payment.paidAmount));
  const outstanding = Math.max(0, roundMoney(safeTotal - paidAmount));
  return {
    total: safeTotal,
    paidAmount,
    outstanding,
    status: outstanding <= 0 ? "paid" : paidAmount > 0 ? "partial" : "due"
  };
}

function getMonthSnapshot(tenant, monthKey) {
  const record = getPaymentByMonth(tenant, monthKey);
  const dueDate = buildDueDate(monthKey, getTenantDueDay(tenant));

  if (record) {
    const summary = getPaymentSummary(record);
    return {
      ...record,
      ...summary,
      dueDate,
      tenant,
      isEstimated: false
    };
  }

  if (!isTenantActiveForMonth(tenant, monthKey)) {
    return {
      monthKey,
      total: 0,
      paidAmount: 0,
      outstanding: 0,
      dueDate,
      tenant,
      status: "inactive",
      isEstimated: true
    };
  }

  const total = roundMoney(tenant.monthlyRent + tenant.defaultWaterBill);
  const today = startOfDay(new Date());
  const tone = total === 0 ? "inactive" : today > dueDate ? "due" : "upcoming";
  return {
    id: makeId("estimate"),
    monthKey,
    rentAmount: tenant.monthlyRent,
    electricityPreviousReading: 0,
    electricityCurrentReading: 0,
    electricityUnits: 0,
    electricityRate: 0,
    electricityBill: 0,
    waterBill: tenant.defaultWaterBill,
    otherCharge: 0,
    advanceUsed: 0,
    paidAmount: 0,
    paymentDate: "",
    paymentMode: "pending",
    notes: "",
    total,
    outstanding: total,
    dueDate,
    tenant,
    status: tone,
    isEstimated: true
  };
}

function collectOutstandingItems() {
  const items = [];
  const currentKey = currentMonthKey();

  state.tenants.forEach((tenant) => {
    tenant.payments.forEach((payment) => {
      const summary = getPaymentSummary(payment);
      if (summary.outstanding > 0) {
        items.push({
          ...payment,
          ...summary,
          dueDate: buildDueDate(payment.monthKey, getTenantDueDay(tenant)),
          tenant,
          isEstimated: false,
          status: summary.status
        });
      }
    });

    if (!tenant.payments.some((payment) => payment.monthKey === currentKey)) {
      const current = getMonthSnapshot(tenant, currentKey);
      if (current.outstanding > 0) {
        items.push(current);
      }
    }
  });

  return items.sort((left, right) => {
    if (left.dueDate.getTime() !== right.dueDate.getTime()) {
      return left.dueDate.getTime() - right.dueDate.getTime();
    }

    return right.outstanding - left.outstanding;
  });
}

function getStatusTone(item) {
  if (!item || item.outstanding <= 0 || item.status === "paid") {
    return "paid";
  }

  if (item.status === "partial") {
    return startOfDay(new Date()) > item.dueDate ? "due" : "soon";
  }

  if (item.status === "upcoming") {
    return "neutral";
  }

  return startOfDay(new Date()) > item.dueDate ? "due" : "soon";
}

function getStatusLabel(item) {
  if (!item || item.outstanding <= 0 || item.status === "paid") {
    return "Paid";
  }

  if (item.status === "partial") {
    return "Part Paid";
  }

  if (item.status === "upcoming") {
    return "Upcoming";
  }

  if (startOfDay(new Date()) > item.dueDate) {
    return "Overdue";
  }

  return "Due Soon";
}

function getTenantById(tenantId) {
  return state.tenants.find((tenant) => tenant.id === tenantId) || null;
}

function getPaymentByMonth(tenant, monthKey) {
  return tenant.payments.find((payment) => payment.monthKey === monthKey) || null;
}

function getAdvanceBalance(tenant) {
  const used = tenant.payments.reduce((sum, payment) => sum + toMoney(payment.advanceUsed), 0);
  return Math.max(0, roundMoney(tenant.advancePaid - used));
}

function getAvailableAdvanceForMonth(tenant, monthKey) {
  const usedOtherMonths = tenant.payments
    .filter((payment) => payment.monthKey !== monthKey)
    .reduce((sum, payment) => sum + toMoney(payment.advanceUsed), 0);
  return Math.max(0, roundMoney(tenant.advancePaid - usedOtherMonths));
}

function getTenantDueDay(tenant) {
  return clampNumber(tenant.dueDay, 1, 28, state.profile.defaultDueDay || 5);
}

function buildDueDate(monthKey, dueDay) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, Math.min(Math.max(dueDay, 1), 28));
  date.setHours(9, 0, 0, 0);
  return date;
}

function isTenantActiveForMonth(tenant, monthKey) {
  return tenant.startDate.slice(0, 7) <= monthKey;
}

function buildDraftCollectionSnapshot(tenant, monthKey = currentMonthKey()) {
  const values = getPaymentFormValues();
  const rentAmount = toMoney(elements.collectionRentAmount.value || tenant.monthlyRent);
  const electricityBill = toMoney(elements.collectionElectricityBill.value);
  const waterBill = toMoney(elements.collectionWaterBill.value || tenant.defaultWaterBill);
  const otherCharge = toMoney(elements.collectionOtherCharge.value);
  const advanceUsed = toMoney(elements.collectionAdvanceUsed.value);
  const paidAmount = toMoney(elements.collectionPaidAmount.value);
  const total = Math.max(0, roundMoney(rentAmount + electricityBill + waterBill + otherCharge - advanceUsed));
  const outstanding = Math.max(0, roundMoney(total - paidAmount));

  return {
    monthKey,
    rentAmount,
    electricityPreviousReading: values.electricityPreviousReading,
    electricityCurrentReading: values.electricityCurrentReading,
    electricityUnits: Math.max(0, values.electricityUnits),
    electricityRate: values.electricityRate,
    electricityBill,
    waterBill,
    otherCharge,
    advanceUsed,
    paidAmount,
    total,
    outstanding,
    paymentDate: elements.collectionPaymentDate.value || getTodayIso(),
    paymentMode: elements.collectionPaymentMode.value || "pending",
    notes: "",
    tenant,
    status: outstanding <= 0 ? "paid" : paidAmount > 0 ? "partial" : "due",
    isEstimated: false
  };
}

function getUpiPayeeName() {
  return state.profile.ownerName || state.profile.propertyName || "Krishna Residency";
}

function buildUpiPaymentLink({ amount, tenant, monthKey }) {
  const upiId = cleanString(state.profile.upiId);
  if (!upiId || amount <= 0) {
    return "";
  }

  const property = state.profile.propertyName || "Property";
  const note = `${property} ${formatMonthLabel(monthKey)} Room ${tenant.roomNumber || "-"}`;
  const params = new URLSearchParams({
    pa: upiId,
    pn: getUpiPayeeName(),
    am: amount.toFixed(2),
    tn: note,
    cu: "INR"
  });
  return `upi://pay?${params.toString()}`;
}

function buildUpiQrUrl(upiLink) {
  if (!upiLink) {
    return "";
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}`;
}

function getShareBaseUrl() {
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

function getServiceBaseUrl() {
  return getShareBaseUrl();
}

function isHostedRuntime() {
  const origin = window.location.origin || "";
  return !(
    window.location.protocol === "file:" ||
    !origin ||
    origin === "null" ||
    /localhost|127\.0\.0\.1/i.test(origin)
  );
}

function encodeSharePayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildShareUrl(pageName, payload) {
  return `${getShareBaseUrl()}/${pageName}#data=${encodeSharePayload(payload)}`;
}

function buildTenantPortalPayload(tenant, snapshot) {
  return {
    v: 1,
    t: "portal",
    ca: new Date().toISOString(),
    pp: {
      p: state.profile.propertyName || "Krishna Residency",
      o: state.profile.ownerName || "Owner",
      c: state.profile.city || "",
      u: cleanString(state.profile.upiId),
      w: cleanDigits(state.profile.ownerWhatsapp),
      i: cleanString(state.profile.requestInboxId)
    },
    tn: {
      n: tenant.fullName,
      m: tenant.mobile,
      r: tenant.roomNumber,
      f: tenant.floor,
      s: tenant.startDate,
      d: getTenantDueDay(tenant)
    },
    b: {
      m: snapshot.monthKey,
      ra: toMoney(snapshot.rentAmount),
      pr: toMoney(snapshot.electricityPreviousReading),
      cr: toMoney(snapshot.electricityCurrentReading),
      eu: toMoney(snapshot.electricityUnits),
      er: toMoney(snapshot.electricityRate),
      eb: toMoney(snapshot.electricityBill),
      wb: toMoney(snapshot.waterBill),
      oc: toMoney(snapshot.otherCharge),
      au: toMoney(snapshot.advanceUsed),
      pa: toMoney(snapshot.paidAmount),
      tt: toMoney(snapshot.total),
      ou: Math.max(0, toMoney(snapshot.outstanding)),
      pd: snapshot.paymentDate || "",
      pm: snapshot.paymentMode || "pending",
      st: snapshot.status || "due"
    }
  };
}



function buildTenantPortalLink(tenant, snapshot) {
  return buildShareUrl("tenant-portal.html", buildTenantPortalPayload(tenant, snapshot));
}



function buildPaymentRequestContext(tenant, snapshot) {
  const amountDue = Math.max(0, roundMoney(snapshot.outstanding));
  const upiId = cleanString(state.profile.upiId);
  const upiLink = buildUpiPaymentLink({
    amount: amountDue,
    tenant,
    monthKey: snapshot.monthKey
  });

  return {
    tenant,
    snapshot,
    amountDue,
    amountLabel: snapshot.outstanding > 0 ? "Balance due" : "Total due",
    upiId,
    upiLink,
    qrUrl: buildUpiQrUrl(upiLink),
    portalLink: buildTenantPortalLink(tenant, snapshot),
    propertyName: state.profile.propertyName || "Property",
    ownerName: state.profile.ownerName || "Owner",
    ownerWhatsapp: cleanDigits(state.profile.ownerWhatsapp)
  };
}

function getActiveCollectionPaymentRequestContext() {
  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  const monthKey = isValidMonthKey(elements.collectionMonth.value) ? elements.collectionMonth.value : currentMonthKey();

  if (!tenant) {
    return null;
  }

  return buildPaymentRequestContext(tenant, buildDraftCollectionSnapshot(tenant, monthKey));
}

function buildPaymentRequestMessage(context) {
  const usageDetails = getElectricityUsageDetails(context.snapshot);
  const lines = [
    `Hello ${context.tenant.fullName},`,
    `Payment request from ${context.propertyName} for ${formatMonthLabel(context.snapshot.monthKey)}.`,
    `Room: ${context.tenant.roomNumber || "-"}`,
    `Rent: ${formatMoney(context.snapshot.rentAmount || context.tenant.monthlyRent)}`,
    `Electricity: ${formatMoney(context.snapshot.electricityBill || 0)}`,
    `Water: ${formatMoney(context.snapshot.waterBill || context.tenant.defaultWaterBill)}`,
    `Other charge: ${formatMoney(context.snapshot.otherCharge || 0)}`,
    `Advance adjusted: ${formatMoney(context.snapshot.advanceUsed || 0)}`,
    `Total bill: ${formatMoney(context.snapshot.total)}`,
    `Paid: ${formatMoney(context.snapshot.paidAmount || 0)}`,
    `${context.amountLabel}: ${formatMoney(context.amountDue)}`
  ];

  if (usageDetails) {
    lines.splice(4, 0, `${usageDetails.label}: ${usageDetails.value}`);
  }

  if (context.upiId) {
    lines.push(`UPI ID: ${context.upiId}`);
  }
  if (context.upiLink) {
    lines.push(`UPI Pay Link: ${context.upiLink}`);
  }
  if (context.qrUrl) {
    lines.push(`UPI QR Code: ${context.qrUrl}`);
  }
  if (context.portalLink) {
    lines.push(`Private rent link: ${context.portalLink}`);
  }

  lines.push(`- ${context.ownerName}`);
  return lines.join("\n");
}

function buildTenantPortalShareMessage(context) {
  const lines = [
    `Hello ${context.tenant.fullName},`,
    `Open your private ${context.propertyName} rent link for ${formatMonthLabel(context.snapshot.monthKey)}.`,
    `Enter your saved mobile number to view only your room bill and payment options.`,
    `Room: ${context.tenant.roomNumber || "-"}`,
    `Current balance: ${formatMoney(context.amountDue)}`,
    `Private link: ${context.portalLink}`
  ];

  if (!context.upiId) {
    lines.push("UPI payment will appear after the owner adds the UPI ID.");
  }

  lines.push(`- ${context.ownerName}`);
  return lines.join("\n");
}



function openWhatsappShare(message, phone = "") {
  const normalizedPhone = phone ? normalizeWhatsappNumber(phone) : "";
  const target = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(target, "_blank", "noopener");
}

function renderTenantPortalPanel() {
  if (!elements.tenantPortalNote || !elements.copyTenantPortalLinkBtn || !elements.shareTenantPortalWhatsappBtn) {
    return;
  }

  const context = getActiveCollectionPaymentRequestContext();
  if (!context) {
    elements.tenantPortalNote.textContent = "Select a tenant to create that tenant's private rent portal link.";
    elements.copyTenantPortalLinkBtn.disabled = true;
    elements.shareTenantPortalWhatsappBtn.disabled = true;
    return;
  }

  if (!context.tenant.mobile) {
    elements.tenantPortalNote.textContent = "Save the tenant mobile number first so the private portal can lock to that number.";
    elements.copyTenantPortalLinkBtn.disabled = true;
    elements.shareTenantPortalWhatsappBtn.disabled = true;
    return;
  }

  const amountNote =
    context.amountDue > 0
      ? `${formatMoney(context.amountDue)} is currently due for ${formatMonthLabel(context.snapshot.monthKey)}.`
      : `This link will open the ${formatMonthLabel(context.snapshot.monthKey)} bill as paid.`;
  const paymentNote = context.upiId
    ? "The pay button and UPI QR will appear inside the link."
    : "Add a UPI ID in Settings if you want the tenant to pay from the link.";

  elements.tenantPortalNote.textContent = `Private link ready for ${context.tenant.fullName}. ${amountNote} ${paymentNote}`;
  elements.copyTenantPortalLinkBtn.disabled = false;
  elements.shareTenantPortalWhatsappBtn.disabled = false;
}



function renderLogoPreview() {
  if (!elements.profileLogoPreview) {
    return;
  }

  const propertyName = state.profile.propertyName || "Krishna Residency";
  elements.profileLogoPreview.src = getBrandLogoSrc();
  elements.profileLogoPreview.alt = `${propertyName} logo preview`;
}



















async function handleProfileLogoSelection(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    ui.pendingProfileLogoDataUrl = null;
    renderLogoPreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("Choose an image file for the property logo.");
    event.target.value = "";
    return;
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    showToast("Keep the logo file under 4 MB.");
    event.target.value = "";
    return;
  }

  try {
    ui.pendingProfileLogoDataUrl = await imageFileToSquareDataUrl(file, 320, 0.92);
    renderLogoPreview();
  } catch (error) {
    console.error(error);
    showToast("The logo file could not be prepared.");
    event.target.value = "";
  }
}

function clearProfileLogoSelection() {
  if (elements.profileLogoFile) {
    elements.profileLogoFile.value = "";
  }
  ui.pendingProfileLogoDataUrl = "";
  renderLogoPreview();
  showToast("Default logo will be used after you save setup.");
}

function getBrandLogoSrc() {
  if (ui.pendingProfileLogoDataUrl !== null) {
    return ui.pendingProfileLogoDataUrl || BRAND_LOGO_WEB_PATH;
  }

  return state.profile.brandLogoDataUrl || BRAND_LOGO_WEB_PATH;
}



async function copyTenantPortalLink() {
  const context = getActiveCollectionPaymentRequestContext();
  if (!context) {
    showToast("Select a tenant first.");
    return;
  }

  if (!context.tenant.mobile) {
    showToast("Save the tenant mobile number first.");
    return;
  }

  await copyText(context.portalLink);
  showToast("The tenant portal link was copied.");
}

function shareTenantPortalWhatsapp() {
  const context = getActiveCollectionPaymentRequestContext();
  if (!context) {
    showToast("Select a tenant first.");
    return;
  }

  if (!context.tenant.mobile) {
    showToast("Save the tenant mobile number first.");
    return;
  }

  openWhatsappShare(buildTenantPortalShareMessage(context), context.tenant.mobile);
}





function openWhatsAppReminder(tenant, monthKey = currentMonthKey(), snapshotOverride = null) {
  if (!tenant.mobile) {
    showToast("No mobile number is saved for this tenant.");
    return;
  }

  const snapshot = snapshotOverride || getMonthSnapshot(tenant, isValidMonthKey(monthKey) ? monthKey : currentMonthKey());
  const context = buildPaymentRequestContext(tenant, snapshot);

  if (!context.upiId) {
    showToast("Add your UPI ID in Settings first.");
    return;
  }

  if (context.amountDue <= 0) {
    showToast("No pending amount is left for this month.");
    return;
  }

  const message = buildPaymentRequestMessage(context);
  openWhatsappShare(message, tenant.mobile);
}

async function copyDueSummary() {
  const dueItems = collectOutstandingItems();
  if (!dueItems.length) {
    showToast("There is no pending summary to copy.");
    return;
  }

  const lines = dueItems.map(
    (item) =>
      `${item.tenant.fullName} | Room ${item.tenant.roomNumber || "-"} | ${formatMonthLabel(item.monthKey)} | Balance ${formatMoney(
        item.outstanding
      )}`
  );
  const heading = `${state.profile.propertyName || "Property"} pending summary`;
  const text = [heading, ...lines].join("\n");
  await copyText(text);
  showToast("The due summary was copied.");
}

function createOwnerReminder() {
  const dueItems = collectOutstandingItems();
  if (!dueItems.length) {
    showToast("There is no pending entry to create a reminder for.");
    return;
  }

  const description = dueItems
    .slice(0, 10)
    .map(
      (item) =>
        `${item.tenant.fullName} | Room ${item.tenant.roomNumber || "-"} | ${formatMonthLabel(item.monthKey)} | ${formatMoney(
          item.outstanding
        )}`
    )
    .join("\\n");

  downloadReminderFile({
    title: `${state.profile.propertyName || "Property"} due collection follow-up`,
    description,
    date: nextReminderDate()
  });
  showToast("The phone reminder file is ready.");
}

function createReminderForTenant(tenant, monthKey = currentMonthKey()) {
  const snapshot = getMonthSnapshot(tenant, isValidMonthKey(monthKey) ? monthKey : currentMonthKey());
  const description = [
    `Tenant: ${tenant.fullName}`,
    `Room: ${tenant.roomNumber || "-"}`,
    `Month: ${formatMonthLabel(snapshot.monthKey)}`,
    `Balance: ${formatMoney(snapshot.outstanding)}`,
    `Mobile: ${tenant.mobile || "-"}`,
    `Property: ${state.profile.propertyName || "-"}`
  ].join("\\n");

  downloadReminderFile({
    title: `Collect from ${tenant.fullName}`,
    description,
    date: snapshot.dueDate
  });
  showToast("The tenant reminder file is ready.");
}

async function exportState() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `rent-collection-drive-backup-${getTodayIso()}.json`);
  showToast("Backup JSON was exported to your device.");
}

async function importStateFile(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const currentToken = state?.profile?.githubToken;
    const currentGistId = state?.profile?.githubGistId;
    
    state = normalizeState(parsed.state || parsed);
    
    // Preserve cloud sync credentials so they don't get overwritten by old backups
    if (currentToken) state.profile.githubToken = currentToken;
    if (currentGistId) state.profile.githubGistId = currentGistId;

    ensureProfileAccessKeys();
    receiptLogoPdfPromise = null;
    ensureSelectedTenant();
    await persistState();
    resetTenantForm();
    populateProfileForm();
    renderAll();

    showToast("Backup import completed.");
  } catch (error) {
    console.error(error);
    showToast("The backup file could not be read.");
  } finally {
    elements.importFileInput.value = "";
  }
}

async function loadDemoData() {
  const shouldLoad = await openConfirmDialog({
    title: "Load demo data",
    body: "This will replace the current saved data with demo records.",
    confirmText: "Load Demo Data",
    cancelText: "Keep Current Data",
    tone: "danger"
  });
  if (!shouldLoad) {
    return;
  }

  state = normalizeState(createDemoState());
  ensureProfileAccessKeys();
  receiptLogoPdfPromise = null;
  ui.selectedTenantId = state.tenants[0] ? state.tenants[0].id : null;
  await persistState();
  resetTenantForm();
  populateProfileForm();
  renderAll();

  showToast("Demo data was loaded.");
}

async function clearAllData() {
  const shouldClear = await openConfirmDialog({
    title: "Clear all rent data",
    body: "This permanently removes all tenant, payment, and setup data from this browser. This action cannot be undone.",
    confirmText: "Clear All Data",
    cancelText: "Keep Data",
    tone: "danger"
  });
  if (!shouldClear) {
    return;
  }

  state = createDefaultState();
  ensureProfileAccessKeys();
  receiptLogoPdfPromise = null;
  ui.selectedTenantId = null;
  await persistState();
  resetTenantForm();
  populateProfileForm();
  renderAll();

  showToast("All data was cleared.");
}

function generateCurrentReceipt() {
  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  if (!tenant) {
    showToast("Select a tenant first.");
    return;
  }

  openReceiptWindow(tenant, elements.collectionMonth.value || currentMonthKey());
}

function sendCurrentSmsReceipt() {
  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  if (!tenant) {
    showToast("Select a tenant first.");
    return;
  }

  sendSmsReceipt(tenant, elements.collectionMonth.value || currentMonthKey());
}

async function sendCurrentWhatsappReceipt() {
  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  if (!tenant) {
    showToast("Select a tenant first.");
    return;
  }

  await sendWhatsappReceipt(tenant, elements.collectionMonth.value || currentMonthKey());
}

function sendCurrentPaymentRequest() {
  const context = getActiveCollectionPaymentRequestContext();
  if (!context) {
    showToast("Select a tenant first.");
    return;
  }

  openWhatsAppReminder(context.tenant, context.snapshot.monthKey, context.snapshot);
}

async function deleteCurrentSavedPayment() {
  const tenant = getTenantById(elements.collectionTenantId.value || ui.selectedTenantId);
  if (!tenant) {
    showToast("Select a tenant first.");
    return;
  }

  await deletePaymentRecord(tenant, elements.collectionMonth.value || currentMonthKey());
}

async function deletePaymentRecord(tenant, monthKey) {
  const existing = getPaymentByMonth(tenant, monthKey);
  if (!existing) {
    showToast("No saved record was found for this month.");
    return;
  }

  const shouldDelete = await openConfirmDialog({
    title: "Delete monthly record",
    body: `Delete the saved record for ${tenant.fullName} in ${formatMonthLabel(monthKey)}?`,
    confirmText: "Delete Record",
    cancelText: "Keep Record",
    tone: "danger"
  });
  if (!shouldDelete) {
    return;
  }

  tenant.payments = tenant.payments.filter((payment) => payment.monthKey !== monthKey);
  await persistState();
  renderAll();
  showToast(`The record for ${formatMonthLabel(monthKey)} was deleted.`);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Notifications are not supported in this browser.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    showToast("Phone alert permission was granted.");
    maybeSendDueNotifications(true);
  } else {
    showToast("Notification permission was not granted.");
  }
}

async function maybeSendDueNotifications(force = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const dueItems = collectOutstandingItems();
  if (!dueItems.length) {
    return;
  }

  const todayKey = getTodayIso();
  if (!force && localStorage.getItem(NOTIFY_KEY) === todayKey) {
    return;
  }

  const preview = dueItems
    .slice(0, 3)
    .map((item) => `${item.tenant.fullName}: ${formatMoney(item.outstanding)}`)
    .join(", ");

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Rent collection reminder", {
        body: preview,
        icon: "assets/icons/rent-collection-icon.svg",
        badge: "assets/icons/rent-collection-icon.svg",
        tag: "rent-collection-reminder"
      });
    } else {
      // Fallback for browsers without service worker registration.
      new Notification("Rent collection reminder", {
        body: preview
      });
    }

    localStorage.setItem(NOTIFY_KEY, todayKey);
  } catch (error) {
    console.error(error);
  }
}

function buildReceiptContext(tenant, monthKey) {
  const record = getPaymentByMonth(tenant, monthKey);
  if (!record) {
    return null;
  }

  const snapshot = getMonthSnapshot(tenant, monthKey);
  return {
    tenant,
    record,
    snapshot,
    propertyName: state.profile.propertyName || "Property",
    ownerName: state.profile.ownerName || "Owner",
    city: state.profile.city || "",
    receiptNumber: `RC-${monthKey.replace("-", "")}-${slugify(tenant.roomNumber || tenant.fullName).toUpperCase() || "ROOM"}`
  };
}

function buildReceiptMessage(context) {
  const { tenant, snapshot, ownerName, receiptNumber } = context;
  const usageDetails = getElectricityUsageDetails(snapshot);
  const lines = [
    `Money Receipt: ${receiptNumber}`,
    `Tenant: ${tenant.fullName}`,
    `Room: ${tenant.roomNumber || "-"}`,
    `Month: ${formatMonthLabel(snapshot.monthKey)}`,
    `Received: ${formatMoney(snapshot.paidAmount)}`,
    `Total bill: ${formatMoney(snapshot.total)}`,
    `Balance: ${formatMoney(snapshot.outstanding)}`,
    `Mode: ${snapshot.paymentMode || "-"}`,
    `Date: ${snapshot.paymentDate || getTodayIso()}`,
    `Thanks - ${ownerName}`
  ];

  if (usageDetails) {
    const usageLines = [`${usageDetails.label}: ${usageDetails.value}`];
    if (snapshot.electricityRate > 0) {
      usageLines.push(`Rate per unit: ${formatMoney(snapshot.electricityRate)}`);
    }
    lines.splice(6, 0, ...usageLines);
  }

  return lines.join("\n");
}

function openReceiptWindow(tenant, monthKey) {
  const context = buildReceiptContext(tenant, isValidMonthKey(monthKey) ? monthKey : currentMonthKey());
  if (!context) {
    showToast("A saved month record is required before generating a receipt.");
    return;
  }

  if (context.snapshot.paidAmount <= 0) {
    showToast("A receipt is available only after a paid amount is saved.");
    return;
  }

  ui.activeReceiptContext = context;
  elements.receiptModalTitle.textContent = `${context.tenant.fullName} - ${formatMonthLabel(context.snapshot.monthKey)}`;
  elements.receiptModalContent.innerHTML = buildReceiptSheetMarkup(context);
  elements.receiptModal.hidden = false;
  elements.receiptModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    elements.receiptModalShareBtn.focus();
  });
}

function buildReceiptSheetMarkup(context) {
  const usageDetails = getElectricityUsageDetails(context.snapshot);
  const logoSrc = getBrandLogoSrc();
  return `
    <article class="receipt-sheet">
      <div class="receipt-sheet-watermark">PAID</div>
      <div class="receipt-sheet-topline">
        <div class="receipt-sheet-brand">
          <img class="receipt-sheet-logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(context.propertyName)} logo" />
          <div class="receipt-sheet-brand-copy">
            <h2>Money Receipt</h2>
            <div class="receipt-sheet-meta">
              <span>${escapeHtml(context.ownerName)}</span>
              <span>${escapeHtml(context.city || "City not set")}</span>
            </div>
          </div>
        </div>
        <div class="receipt-sheet-code">
          <strong>${escapeHtml(context.receiptNumber)}</strong>
          <span>${escapeHtml(context.snapshot.paymentDate || getTodayIso())}</span>
        </div>
      </div>

      <div class="receipt-sheet-card">
        <div class="receipt-sheet-row"><span>Tenant</span><strong>${escapeHtml(context.tenant.fullName)}</strong></div>
        <div class="receipt-sheet-row"><span>Room</span><strong>${escapeHtml(context.tenant.roomNumber || "-")}</strong></div>
        <div class="receipt-sheet-row"><span>Month</span><strong>${escapeHtml(formatMonthLabel(context.snapshot.monthKey))}</strong></div>
        <div class="receipt-sheet-row"><span>Payment Mode</span><strong>${escapeHtml(context.snapshot.paymentMode || "-")}</strong></div>
      </div>

      <div class="receipt-sheet-card">
        <div class="receipt-sheet-row"><span>Rent</span><strong>${escapeHtml(formatMoney(context.snapshot.rentAmount || context.tenant.monthlyRent))}</strong></div>
        ${
          usageDetails
            ? `<div class="receipt-sheet-row"><span>${escapeHtml(usageDetails.label)}</span><strong>${escapeHtml(
                usageDetails.value
              )}</strong></div>${
                context.snapshot.electricityRate > 0
                  ? `
        <div class="receipt-sheet-row"><span>Rate Per Unit</span><strong>${escapeHtml(formatMoney(context.snapshot.electricityRate))}</strong></div>`
                  : ""
              }`
            : ""
        }
        <div class="receipt-sheet-row"><span>Electricity</span><strong>${escapeHtml(formatMoney(context.snapshot.electricityBill || 0))}</strong></div>
        <div class="receipt-sheet-row"><span>Water</span><strong>${escapeHtml(formatMoney(context.snapshot.waterBill || context.tenant.defaultWaterBill))}</strong></div>
        <div class="receipt-sheet-row"><span>Other Charge</span><strong>${escapeHtml(formatMoney(context.snapshot.otherCharge || 0))}</strong></div>
        <div class="receipt-sheet-row"><span>Advance Used</span><strong>${escapeHtml(formatMoney(context.snapshot.advanceUsed || 0))}</strong></div>
      </div>

      <div class="receipt-sheet-total">
        <div class="receipt-sheet-row"><span>Total Bill</span><strong>${escapeHtml(formatMoney(context.snapshot.total))}</strong></div>
        <div class="receipt-sheet-row"><span>Received</span><strong>${escapeHtml(formatMoney(context.snapshot.paidAmount))}</strong></div>
        <div class="receipt-sheet-row"><span>Balance</span><strong>${escapeHtml(formatMoney(context.snapshot.outstanding))}</strong></div>
      </div>
    </article>
  `;
}

function closeReceiptModal() {
  if (elements.receiptModal.hidden) {
    return;
  }

  clearReceiptPrintState();
  ui.activeReceiptContext = null;
  elements.receiptModal.hidden = true;
  elements.receiptModal.setAttribute("aria-hidden", "true");
  elements.receiptModalContent.innerHTML = "";
}

function printReceiptModal() {
  if (elements.receiptModal.hidden) {
    return;
  }

  document.body.classList.add("is-printing-receipt");
  window.print();
}

function clearReceiptPrintState() {
  document.body.classList.remove("is-printing-receipt");
}

async function shareActiveReceiptPdf() {
  if (!ui.activeReceiptContext) {
    showToast("Open a saved receipt first.");
    return;
  }

  await shareReceiptPdf(ui.activeReceiptContext, { openWhatsappFallback: true });
}

function sendSmsReceipt(tenant, monthKey) {
  const context = buildReceiptContext(tenant, isValidMonthKey(monthKey) ? monthKey : currentMonthKey());
  if (!context) {
    showToast("A saved month record is required before opening an SMS receipt.");
    return;
  }

  if (!tenant.mobile) {
    showToast("Save a mobile number before sending an SMS receipt.");
    return;
  }

  const message = buildReceiptMessage(context);
  const smsLink = `sms:${normalizeSmsNumber(tenant.mobile)}?&body=${encodeURIComponent(message)}`;
  window.location.href = smsLink;
}

async function sendWhatsappReceipt(tenant, monthKey) {
  const context = buildReceiptContext(tenant, isValidMonthKey(monthKey) ? monthKey : currentMonthKey());
  if (!context) {
    showToast("A saved month record is required before sharing a WhatsApp PDF receipt.");
    return;
  }

  if (context.snapshot.paidAmount <= 0) {
    showToast("A paid amount is required before sharing a receipt PDF.");
    return;
  }

  await shareReceiptPdf(context, { openWhatsappFallback: true });
}

function registerInstallPrompt() {
  if (!elements.installAppBtn) {
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    ui.installPrompt = event;
    elements.installAppBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    ui.installPrompt = null;
    elements.installAppBtn.hidden = true;
    showToast("The app was installed.");
  });
}

async function installApplication() {
  if (!elements.installAppBtn) {
    return;
  }

  if (!ui.installPrompt) {
    showToast("This button becomes active when the browser offers app installation.");
    return;
  }

  ui.installPrompt.prompt();
  await ui.installPrompt.userChoice;
  ui.installPrompt = null;
  elements.installAppBtn.hidden = true;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (!isHostedRuntime()) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => /^rent-collection/i.test(key))
            .map((key) => caches.delete(key))
        );
      }
    } catch (error) {
      console.error(error);
    }
    return;
  }

  try {
    await navigator.serviceWorker.register("rent-collection-sw.js?v=20260525-intake-backend-fix-8", {
      updateViaCache: "none"
    });
  } catch (error) {
    console.error(error);
  }
}

function downloadReminderFile({ title, description, date }) {
  const start = combineDateAndTime(date, state.profile.reminderTime || "09:00");
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Codex//RentCollection//EN",
    "BEGIN:VEVENT",
    `UID:${makeId("reminder")}@rent-collection`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  downloadBlob(blob, `${slugify(title)}.ics`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function shareReceiptPdf(context, { openWhatsappFallback = false } = {}) {
  const blob = await buildReceiptPdfBlob(context);
  const filename = getReceiptPdfFilename(context);
  const file = new File([blob], filename, {
    type: "application/pdf",
    lastModified: Date.now()
  });

  if (canShareReceiptFile(file)) {
    try {
      await navigator.share({
        title: `Money Receipt ${context.receiptNumber}`,
        text: `Money receipt for ${context.tenant.fullName} - ${formatMonthLabel(context.snapshot.monthKey)}`,
        files: [file]
      });
      showToast("PDF receipt is ready to send from your share sheet.");
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      console.error(error);
    }
  }

  downloadBlob(blob, filename);

  if (openWhatsappFallback && context.tenant.mobile) {
    const note = [
      `Money Receipt: ${context.receiptNumber}`,
      `The PDF receipt is downloaded on this device.`,
      `Attach the PDF in WhatsApp if the share sheet did not open automatically.`,
      `Received: ${formatMoney(context.snapshot.paidAmount)}`,
      `Balance: ${formatMoney(context.snapshot.outstanding)}`
    ].join("\n");
    const phone = normalizeWhatsappNumber(context.tenant.mobile);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(note)}`, "_blank", "noopener");
  }

  showToast("PDF receipt was downloaded. Attach it in WhatsApp if direct sharing is not available.");
}

function canShareReceiptFile(file) {
  if (!navigator.share || typeof navigator.canShare !== "function") {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch (error) {
    return false;
  }
}

function getReceiptPdfFilename(context) {
  return `${slugify(`money-receipt-${context.receiptNumber}`) || "money-receipt"}.pdf`;
}

async function buildReceiptPdfBlob(context) {
  const commands = [];
  let rowY = 718;
  const leftX = 54;
  const valueX = 330;
  const logoData = await loadReceiptLogoPdfData();

  pushPdfFill(commands, 0.95, 0.89, 0.89);
  commands.push("q");
  commands.push("BT /F2 88 Tf 0.707 0.707 -0.707 0.707 176 356 Tm (PAID) Tj ET");
  commands.push("Q");

  if (logoData) {
    commands.push("q");
    commands.push("90 0 0 90 54 734 cm /Im1 Do");
    commands.push("Q");
    pushPdfText(commands, "F2", 25, 160, 792, "Money Receipt");
    pushPdfText(commands, "F1", 11, 160, 772, sanitizePdfText(context.ownerName || "Owner"));
    pushPdfText(commands, "F1", 11, 160, 756, sanitizePdfText(context.city || "City not set"), [0.36, 0.42, 0.39]);
    rowY = 694;
  } else {
    pushPdfText(commands, "F2", 25, 54, 790, "Money Receipt");
    pushPdfText(commands, "F1", 11, 54, 770, sanitizePdfText(context.ownerName || "Owner"));
    pushPdfText(commands, "F1", 11, 54, 754, sanitizePdfText(context.city || "City not set"), [0.36, 0.42, 0.39]);
  }
  pushPdfText(commands, "F2", 11, 396, 790, sanitizePdfText(context.receiptNumber));
  pushPdfText(commands, "F1", 11, 396, 772, sanitizePdfText(context.snapshot.paymentDate || getTodayIso()), [0.36, 0.42, 0.39]);
  pushPdfStroke(commands, 0.84, 0.86, 0.89);
  commands.push("54 742 m 542 742 l S");

  rowY = pushPdfReceiptRow(commands, rowY, "Tenant", context.tenant.fullName, leftX, valueX, true);
  rowY = pushPdfReceiptRow(commands, rowY, "Room", context.tenant.roomNumber || "-", leftX, valueX, true);
  rowY = pushPdfReceiptRow(commands, rowY, "Month", formatMonthLabel(context.snapshot.monthKey), leftX, valueX, true);
  rowY = pushPdfReceiptRow(commands, rowY, "Payment Mode", context.snapshot.paymentMode || "-", leftX, valueX, true);

  rowY -= 8;
  rowY = pushPdfReceiptRow(commands, rowY, "Rent", formatPdfMoney(context.snapshot.rentAmount || context.tenant.monthlyRent), leftX, valueX);

  const usageDetails = getElectricityUsageDetails(context.snapshot);
  if (usageDetails) {
    rowY = pushPdfReceiptRow(commands, rowY, usageDetails.label, usageDetails.value, leftX, valueX);
    if (context.snapshot.electricityRate > 0) {
      rowY = pushPdfReceiptRow(commands, rowY, "Rate Per Unit", formatPdfMoney(context.snapshot.electricityRate), leftX, valueX);
    }
  }

  rowY = pushPdfReceiptRow(commands, rowY, "Electricity", formatPdfMoney(context.snapshot.electricityBill || 0), leftX, valueX);
  rowY = pushPdfReceiptRow(commands, rowY, "Water", formatPdfMoney(context.snapshot.waterBill || context.tenant.defaultWaterBill), leftX, valueX);
  rowY = pushPdfReceiptRow(commands, rowY, "Other Charge", formatPdfMoney(context.snapshot.otherCharge || 0), leftX, valueX);
  rowY = pushPdfReceiptRow(commands, rowY, "Advance Used", formatPdfMoney(context.snapshot.advanceUsed || 0), leftX, valueX);

  pushPdfFill(commands, 0.11, 0.48, 0.36);
  commands.push("48 118 500 92 re f");
  pushPdfText(commands, "F1", 11, 66, 182, "Total Bill", [1, 1, 1]);
  pushPdfText(commands, "F2", 17, 66, 160, formatPdfMoney(context.snapshot.total), [1, 1, 1]);
  pushPdfText(commands, "F1", 11, 246, 182, "Received", [1, 1, 1]);
  pushPdfText(commands, "F2", 17, 246, 160, formatPdfMoney(context.snapshot.paidAmount), [1, 1, 1]);
  pushPdfText(commands, "F1", 11, 408, 182, "Balance", [1, 1, 1]);
  pushPdfText(commands, "F2", 17, 408, 160, formatPdfMoney(context.snapshot.outstanding), [1, 1, 1]);

  const content = commands.join("\n");
  return buildPdfDocument(content, logoData);
}

function pushPdfReceiptRow(commands, y, label, value, leftX, valueX, compact = false) {
  pushPdfText(commands, "F1", 11, leftX, y, sanitizePdfText(label), [0.36, 0.42, 0.39]);
  pushPdfText(commands, compact ? "F2" : "F1", 11, valueX, y, sanitizePdfText(value), [0.12, 0.19, 0.16]);
  return y - 24;
}

function pushPdfText(commands, fontName, fontSize, x, y, text, color = [0.1, 0.19, 0.16]) {
  commands.push(`BT /${fontName} ${fontSize} Tf ${color.join(" ")} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
}

function pushPdfFill(commands, red, green, blue) {
  commands.push(`${red} ${green} ${blue} rg`);
}

function pushPdfStroke(commands, red, green, blue) {
  commands.push(`${red} ${green} ${blue} RG`);
}

function buildPdfDocument(content, logoData = null) {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);
  const resources = [`/Font << /F1 5 0 R /F2 6 0 R >>`];
  if (logoData) {
    resources.push(`/XObject << /Im1 7 0 R >>`);
  }

  const objects = [
    buildPdfTextObjectBytes(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    buildPdfTextObjectBytes(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    buildPdfTextObjectBytes(
      3,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << ${resources.join(
        " "
      )} >> /Contents 4 0 R >>`
    ),
    buildPdfStreamObjectBytes(4, "", contentBytes),
    buildPdfTextObjectBytes(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    buildPdfTextObjectBytes(6, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
  ];

  if (logoData) {
    objects.push(
      buildPdfStreamObjectBytes(
        7,
        `/Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        logoData.bytes
      )
    );
  }

  const chunks = [];
  const offsets = [0];
  let cursor = 0;

  const pushChunk = (chunk) => {
    chunks.push(chunk);
    cursor += chunk.byteLength;
  };

  pushChunk(encoder.encode("%PDF-1.4\n"));
  objects.forEach((objectBytes) => {
    offsets.push(cursor);
    pushChunk(objectBytes);
  });

  const xrefOffset = cursor;
  pushChunk(encoder.encode(`xref\n0 ${objects.length + 1}\n`));
  pushChunk(encoder.encode("0000000000 65535 f \n"));
  offsets.slice(1).forEach((offset) => {
    pushChunk(encoder.encode(`${String(offset).padStart(10, "0")} 00000 n \n`));
  });
  pushChunk(encoder.encode(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));

  return new Blob(chunks, { type: "application/pdf" });
}

function buildPdfTextObjectBytes(id, bodyText) {
  return new TextEncoder().encode(`${id} 0 obj ${bodyText} endobj\n`);
}

function buildPdfStreamObjectBytes(id, dictionaryText, streamBytes) {
  const encoder = new TextEncoder();
  const dictionary = dictionaryText ? `${dictionaryText} /Length ${streamBytes.length}` : `/Length ${streamBytes.length}`;
  return concatUint8Arrays([
    encoder.encode(`${id} 0 obj << ${dictionary} >> stream\n`),
    streamBytes,
    encoder.encode("\nendstream\nendobj\n")
  ]);
}

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  arrays.forEach((array) => {
    merged.set(array, offset);
    offset += array.byteLength;
  });

  return merged;
}

function loadReceiptLogoPdfData() {
  if (receiptLogoPdfPromise) {
    return receiptLogoPdfPromise;
  }

  receiptLogoPdfPromise = new Promise((resolve) => {
    const image = new Image();
    const source = state.profile.brandLogoDataUrl || new URL(RECEIPT_LOGO_PDF_PATH, window.location.href).toString();
    image.decoding = "async";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          resolve(null);
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        resolve({
          width: canvas.width,
          height: canvas.height,
          bytes: dataUrlToUint8Array(dataUrl)
        });
      } catch (error) {
        console.error(error);
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = source;
  });

  return receiptLogoPdfPromise;
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function escapePdfText(value) {
  return sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/\u20B9/g, "Rs ")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function formatPdfMoney(value) {
  return sanitizePdfText(formatMoney(value)).replace(/^Rs\s*/, "Rs ");
}

function createEmptyState(title, body) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function openConfirmDialog({ title, body, confirmText = "Confirm", cancelText = "Cancel", tone = "accent" }) {
  if (ui.dialogResolver) {
    const resolve = ui.dialogResolver;
    ui.dialogResolver = null;
    resolve(false);
  }

  elements.appModalTitle.textContent = title;
  elements.appModalBody.textContent = body;
  elements.appModalCancelBtn.textContent = cancelText;
  elements.appModalConfirmBtn.textContent = confirmText;
  elements.appModalConfirmBtn.dataset.tone = tone;
  elements.appModal.hidden = false;
  elements.appModal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    ui.dialogResolver = resolve;
    requestAnimationFrame(() => {
      elements.appModalConfirmBtn.focus();
    });
  });
}

function closeAppModal(result) {
  if (elements.appModal.hidden) {
    return;
  }

  elements.appModal.hidden = true;
  elements.appModal.setAttribute("aria-hidden", "true");
  const resolve = ui.dialogResolver;
  ui.dialogResolver = null;
  if (resolve) {
    resolve(Boolean(result));
  }
}

function showToast(message) {
  elements.appToast.textContent = message;
  elements.appToast.classList.add("is-visible");
  clearTimeout(ui.toastTimer);
  ui.toastTimer = window.setTimeout(() => {
    elements.appToast.classList.remove("is-visible");
  }, 2600);
}

function scrollToSection(id) {
  const target = document.getElementById(id);

  if (SECTION_TAB_MAP[id]) {
    switchTab(SECTION_TAB_MAP[id], { scroll: false });
  }

  if (target) {
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function formatMoney(value) {
  return formatter.format(Number(value) || 0);
}

function formatReadingValue(value) {
  const numericValue = roundMoney(value);
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue);
}

function getElectricityUsageDetails(record) {
  const previousReading = toMoney(record.electricityPreviousReading);
  const currentReading = toMoney(record.electricityCurrentReading);

  if ((previousReading > 0 || currentReading > 0) && currentReading >= previousReading) {
    const units = roundMoney(currentReading - previousReading);
    return {
      label: "Meter Reading",
      value: `${formatReadingValue(currentReading)} - ${formatReadingValue(previousReading)} = ${formatReadingValue(units)} units`
    };
  }

  const units = roundMoney(record.electricityUnits);
  if (units > 0) {
    return {
      label: "Electricity Units",
      value: `${formatReadingValue(units)} units`
    };
  }

  return null;
}

function formatDateLabel(value) {
  if (!isValidDate(value)) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatMonthLabel(monthKey) {
  if (!isValidMonthKey(monthKey)) {
    return "-";
  }

  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function getInitials(value, fallback = "NA") {
  const parts = cleanString(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return fallback;
  }

  return parts
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatMobileForCard(value) {
  if (!value) {
    return "-";
  }

  if (value.length === 10) {
    return `+91 ${value}`;
  }

  return value;
}

function normalizeWhatsappNumber(value) {
  const digits = cleanDigits(value);
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

function normalizeSmsNumber(value) {
  const digits = cleanDigits(value);
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function isLikelyMobileDevice() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

function isMobileNavViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function toMoney(value) {
  return roundMoney(Number(value) || 0);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function sortTenants(left, right) {
  const roomCompare = String(left.roomNumber || "").localeCompare(String(right.roomNumber || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
  if (roomCompare !== 0) {
    return roomCompare;
  }
  return String(left.fullName || "").localeCompare(String(right.fullName || ""));
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

function isValidMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ""));
}

function getTodayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function getTimestampSlug() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function previousMonthKey() {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previous.getFullYear()}-${pad(previous.getMonth() + 1)}`;
}

function previousMonthPaymentDate() {
  const previous = new Date();
  previous.setMonth(previous.getMonth() - 1);
  previous.setDate(Math.min(previous.getDate(), 25));
  return `${previous.getFullYear()}-${pad(previous.getMonth() + 1)}-${pad(previous.getDate())}`;
}

function nextReminderDate() {
  const today = new Date();
  const next = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  next.setDate(next.getDate() + 1);
  return next;
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function combineDateAndTime(date, time) {
  const [hours, minutes] = (time || "09:00").split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours || 9, minutes || 0, 0, 0);
  return value;
}

function formatIcsDate(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate())
  ].join("") +
    "T" +
    [pad(date.getUTCHours()), pad(date.getUTCMinutes()), pad(date.getUTCSeconds())].join("") +
    "Z";
}

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

async function fileToDocument(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
    updatedAt: new Date().toISOString()
  };
}



function ensureProfileAccessKeys() {
  let changed = false;
  if (!cleanString(state.profile.requestInboxId)) {
    state.profile.requestInboxId = makeId("inbox");
    changed = true;
  }
  if (!cleanString(state.profile.requestAdminKey)) {
    state.profile.requestAdminKey = `${makeId("admin")}${makeId("key")}`;
    changed = true;
  }
  return changed;
}

function normalizeImageDataUrl(value) {
  const normalized = cleanString(value);
  return /^data:image\//i.test(normalized) ? normalized : "";
}

function toWholeNumber(value) {
  const number = Math.floor(Number(value) || 0);
  return number > 0 ? number : 0;
}

function maskAadhaarNumber(value) {
  const digits = cleanDigits(value).slice(0, 12);
  if (!digits) {
    return "";
  }
  if (digits.length <= 4) {
    return digits;
  }
  return `xxxx xxxx ${digits.slice(-4)}`;
}

function formatDateTimeLabel(value) {
  if (!isValidDateTime(value)) {
    return "just now";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}



async function imageFileToSquareDataUrl(file, size = 320, quality = 0.92) {
  const dataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          reject(new Error("Canvas is not available"));
          return;
        }

        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = Math.floor((image.naturalWidth - sourceSize) / 2);
        const sourceY = Math.floor((image.naturalHeight - sourceSize) / 2);

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size, size);
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function writeToLocalDb(key, value) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    store.put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getGithubSyncConfig() {
  if (state && state.profile && state.profile.githubToken && state.profile.githubGistId) {
    return { token: state.profile.githubToken, gistId: state.profile.githubGistId };
  }
  const db = await getDb();
  const localValue = await new Promise((resolve) => {
    const transaction = db.transaction(DB_STORE, "readonly");
    const request = transaction.objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  
  const stateObj = localValue && localValue.state ? localValue.state : localValue;
  const profile = stateObj && stateObj.profile ? stateObj.profile : {};
  if (profile.githubToken && profile.githubGistId) {
    return { token: profile.githubToken, gistId: profile.githubGistId };
  }
  
  return null;
}

async function readFromDb(key) {
  try {
    const db = await getDb();
    let localValue = await new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readonly");
      const store = transaction.objectStore(DB_STORE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const config = await getGithubSyncConfig();
    if (config) {
      try {
        const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
          headers: {
            "Authorization": `token ${config.token}`,
            "Accept": "application/vnd.github.v3+json"
          }
        });
        if (response.ok) {
          const gist = await response.json();
          const filename = `${key}.json`;
          if (gist.files && gist.files[filename]) {
            const cloudData = JSON.parse(gist.files[filename].content);
            if (!localValue || !localValue._timestamp || (cloudData._timestamp && cloudData._timestamp > localValue._timestamp)) {
              const localToken = localValue?.state?.profile?.githubToken || localValue?.profile?.githubToken;
              const localGistId = localValue?.state?.profile?.githubGistId || localValue?.profile?.githubGistId;
              localValue = cloudData.value;
              if (localValue && localValue.state && localValue.state.profile) {
                if (localToken) localValue.state.profile.githubToken = localToken;
                if (localGistId) localValue.state.profile.githubGistId = localGistId;
              } else if (localValue && localValue.profile) {
                if (localToken) localValue.profile.githubToken = localToken;
                if (localGistId) localValue.profile.githubGistId = localGistId;
              }
              await writeToLocalDb(key, localValue);
            }
          } else if (localValue) {
            console.log("Auto-uploading existing local data to Gist...");
            if (typeof localValue === "object" && localValue !== null && !localValue._timestamp) {
              localValue._timestamp = Date.now();
              await writeToLocalDb(key, localValue);
            }
            // Strip secrets from cloud data to avoid GitHub Secret Scanner revoking tokens!
            let safeState = JSON.parse(JSON.stringify(localValue));
            if (safeState && safeState.state && safeState.state.profile) {
              delete safeState.state.profile.githubToken;
              delete safeState.state.profile.githubGistId;
            } else if (safeState && safeState.profile) {
              delete safeState.profile.githubToken;
              delete safeState.profile.githubGistId;
            }

            await fetch(`https://api.github.com/gists/${config.gistId}`, {
              method: "PATCH",
              headers: {
                "Authorization": `token ${config.token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                files: {
                  [filename]: {
                    content: JSON.stringify({
                      value: safeState,
                      _timestamp: localValue && localValue._timestamp ? localValue._timestamp : Date.now()
                    })
                  }
                }
              })
            });
          }
        }
      } catch (e) {
        console.error("Gist read error:", e);
      }
    }

    return localValue;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function writeToDb(key, value) {
  if (typeof value === "object" && value !== null) {
    value._timestamp = Date.now();
  }
  await writeToLocalDb(key, value);
  
  const config = await getGithubSyncConfig();
  if (config) {
    try {
      const filename = `${key}.json`;
      let safeState = JSON.parse(JSON.stringify(value));
      if (safeState && safeState.state && safeState.state.profile) {
        delete safeState.state.profile.githubToken;
        delete safeState.state.profile.githubGistId;
      } else if (safeState && safeState.profile) {
        delete safeState.profile.githubToken;
        delete safeState.profile.githubGistId;
      }

      await fetch(`https://api.github.com/gists/${config.gistId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `token ${config.token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: {
            [filename]: {
              content: JSON.stringify({
                value: safeState,
                _timestamp: Date.now()
              })
            }
          }
        })
      });
    } catch (e) {
      console.error("Gist write error:", e);
    }
  }
}

async function deleteFromDb(key) {
  const db = await getDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    store.delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  
  const config = await getGithubSyncConfig();
  if (config) {
    try {
      const filename = `${key}.json`;
      await fetch(`https://api.github.com/gists/${config.gistId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `token ${config.token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: {
            [filename]: null
          }
        })
      });
    } catch (e) {
      console.error("Blob delete error:", e);
    }
  }
}

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) {
          request.result.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}


