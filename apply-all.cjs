const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

// 1. Add elements
code = code.replace(/profileAppPin: document\.getElementById\("profileAppPin"\),/g, 'profileAppPin: document.getElementById("profileAppPin"),\n    profileServerUrl: document.getElementById("profileServerUrl"),\n    profileServerKey: document.getElementById("profileServerKey"),\n    downloadDataBtn: document.getElementById("downloadDataBtn"),');

// 2. Add event listener
code = code.replace(/if\s*\(elements\.deleteSavedPaymentBtn\)/g, 'if (elements.downloadDataBtn) {\n    elements.downloadDataBtn.addEventListener("click", forceManualSync);\n  }\n  if (elements.deleteSavedPaymentBtn)');

// 3. Add autoSync in init()
code = code.replace(/syncMobileNavState\(\);\r?\n/g, 'syncMobileNavState();\n\n  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {\n    autoSync();\n  }\n  setInterval(autoSync, 15000);\n');

// 4. Add state properties
code = code.replace(/requestAdminKey:\s*cleanString\(profile\.requestAdminKey\)/g, 'requestAdminKey: cleanString(profile.requestAdminKey),\n    serverUrl: cleanString(profile.serverUrl),\n    serverKey: cleanString(profile.serverKey)');
code = code.replace(/requestAdminKey:\s*""/g, 'requestAdminKey: "",\n      serverUrl: "",\n      serverKey: ""');

// 5. Populate profile form
code = code.replace(/if\s*\(elements\.profileAppPin\)\s*\{\s*elements\.profileAppPin\.value\s*=\s*state\.profile\.appPin\s*\|\|\s*"";\s*\}/g, 'if (elements.profileAppPin) {\n    elements.profileAppPin.value = state.profile.appPin || "";\n  }\n  if (elements.profileServerUrl) {\n    elements.profileServerUrl.value = state.profile.serverUrl || "";\n  }\n  if (elements.profileServerKey) {\n    elements.profileServerKey.value = state.profile.serverKey || "";\n  }');

// 6. Handle profile save
const saveReplacement = \
  const appPin = elements.profileAppPin ? elements.profileAppPin.value.trim() : "";
  const serverUrl = elements.profileServerUrl ? elements.profileServerUrl.value.trim() : "";
  const serverKey = elements.profileServerKey ? elements.profileServerKey.value.trim() : "";
  const urlChanged = cleanString(serverUrl) !== state.profile.serverUrl;
  const keyChanged = cleanString(serverKey) !== state.profile.serverKey;

  state.profile = {
    ownerName: cleanString(elements.profileOwnerName.value),
    propertyName: cleanString(elements.profilePropertyName.value),
    city: cleanString(elements.profileCity.value),
    defaultDueDay: clampNumber(elements.profileDueDay.value, 1, 28, 5),
    reminderTime: isValidTime(elements.profileReminderTime.value) ? elements.profileReminderTime.value : "09:00",
    upiId: cleanString(elements.profileUpiId ? elements.profileUpiId.value : ""),
    ownerWhatsapp: cleanDigits(elements.profileOwnerWhatsapp ? elements.profileOwnerWhatsapp.value : ""),
    appPin: cleanDigits(appPin),
    serverUrl: cleanString(serverUrl),
    serverKey: cleanString(serverKey),\;
code = code.replace(/const\s+appPin\s*=\s*elements\.profileAppPin\s*\?[\s\S]*?appPin:\s*cleanDigits\(appPin\),/g, saveReplacement);
code = code.replace(/ensureProfileAccessKeys\(\);\r?\n/g, 'ensureProfileAccessKeys();\n  if (urlChanged || keyChanged) showToast("Sync settings updated.");\n');


// 7. DB Logic
const newLogic = fs.readFileSync('new_logic.txt', 'utf8');
const regex = /async function readFromDb\(key\) \{[\s\S]*?async function deleteFromDb/g;
code = code.replace(regex, newLogic + '\nasync function deleteFromDb');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Applied node script!');
