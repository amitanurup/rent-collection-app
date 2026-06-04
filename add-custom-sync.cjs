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
code = code.replace(/requestAdminKey:\s*""/g, 'requestAdminKey: "",\n    serverUrl: "",\n    serverKey: ""');

// 5. Populate profile form
code = code.replace(/if\s*\(elements\.profileAppPin\)\s*\{\s*elements\.profileAppPin\.value\s*=\s*state\.profile\.appPin\s*\|\|\s*"";\s*\}/g, 'if (elements.profileAppPin) {\n    elements.profileAppPin.value = state.profile.appPin || "";\n  }\n  if (elements.profileServerUrl) {\n    elements.profileServerUrl.value = state.profile.serverUrl || "";\n  }\n  if (elements.profileServerKey) {\n    elements.profileServerKey.value = state.profile.serverKey || "";\n  }');

// 6. Handle profile save
code = code.replace(/state\.profile\.appPin\s*=\s*cleanString\(elements\.profileAppPin\.value\);/g, 'state.profile.appPin = cleanString(elements.profileAppPin.value);\n  const urlChanged = state.profile.serverUrl !== elements.profileServerUrl.value;\n  const keyChanged = state.profile.serverKey !== elements.profileServerKey.value;\n  state.profile.serverUrl = cleanString(elements.profileServerUrl.value);\n  state.profile.serverKey = cleanString(elements.profileServerKey.value);\n  if (urlChanged || keyChanged) showToast("Sync settings updated.");');

// 7. Implement server sync functions and replace DB functions
const newSyncLogic = \
let isAutoSyncing = false;

async function getServerSyncConfig() {
  const url = state?.profile?.serverUrl;
  const key = state?.profile?.serverKey;
  if (url && key) return { url, key };

  const db = await getDb();
  const localValue = await new Promise((resolve) => {
    const transaction = db.transaction(DB_STORE, "readonly");
    const request = transaction.objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  
  const stateObj = localValue && localValue.state ? localValue.state : localValue;
  const profile = stateObj && stateObj.profile ? stateObj.profile : {};
  if (profile.serverUrl && profile.serverKey) {
    return { url: profile.serverUrl, key: profile.serverKey };
  }
  return null;
}

async function autoSync() {
  if (isAutoSyncing) return;
  const config = await getServerSyncConfig();
  if (!config) return;

  isAutoSyncing = true;
  try {
    await readFromDb(DB_KEY);
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
    const config = await getServerSyncConfig();
    if (!config) {
      showToast("Server Sync is not configured. Add URL and Key in Setup.");
      return;
    }
    
    showToast("Fetching from your server...");
    
    const response = await fetch(config.url, {
      method: "GET",
      headers: {
        "X-Secret-Key": config.key,
        "Accept": "application/json"
      }
    });
    
    if (response.ok) {
      const cloudData = await response.json();
      if (cloudData && cloudData.value) {
        let newValue = cloudData.value;
        const localUrl = config.url;
        const localKey = config.key;
        
        if (newValue && newValue.state && newValue.state.profile) {
          newValue.state.profile.serverUrl = localUrl;
          newValue.state.profile.serverKey = localKey;
        } else if (newValue && newValue.profile) {
          newValue.profile.serverUrl = localUrl;
          newValue.profile.serverKey = localKey;
        }
        
        newValue._timestamp = Date.now();
        await writeToLocalDb(DB_KEY, newValue);
        console.log("Forced server sync completed.");
      } else {
        console.warn("Server data not found.");
      }
      
      await loadState();
      populateProfileForm();
      renderAll();
      showToast("Data synced successfully!");
    } else {
      console.error("Manual sync failed");
      showToast("Failed to sync data.");
    }
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

async function readFromDb(key) {
  try {
    const db = await getDb();
    let localValue = await new Promise((resolve) => {
      const transaction = db.transaction(DB_STORE, "readonly");
      const request = transaction.objectStore(DB_STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    if (key === DB_KEY) {
      const config = await getServerSyncConfig();
      if (config) {
        try {
          const response = await fetch(config.url, {
            method: "GET",
            headers: {
              "X-Secret-Key": config.key,
              "Accept": "application/json"
            }
          });
          
          if (response.ok) {
            const cloudData = await response.json();
            if (cloudData && cloudData.value) {
              if (!localValue || !localValue._timestamp || (cloudData._timestamp && cloudData._timestamp > localValue._timestamp)) {
                const localUrl = config.url;
                const localKey = config.key;
                
                localValue = cloudData.value;
                if (localValue && localValue.state && localValue.state.profile) {
                  localValue.state.profile.serverUrl = localUrl;
                  localValue.state.profile.serverKey = localKey;
                } else if (localValue && localValue.profile) {
                  localValue.profile.serverUrl = localUrl;
                  localValue.profile.serverKey = localKey;
                }
                await writeToLocalDb(key, localValue);
              }
            } else if (localValue) {
              console.log("Auto-uploading local data to server...");
              if (typeof localValue === "object" && localValue !== null && !localValue._timestamp) {
                localValue._timestamp = Date.now();
                await writeToLocalDb(key, localValue);
              }
              
              let safeState = JSON.parse(JSON.stringify(localValue));
              if (safeState && safeState.state && safeState.state.profile) {
                delete safeState.state.profile.serverUrl;
                delete safeState.state.profile.serverKey;
              } else if (safeState && safeState.profile) {
                delete safeState.profile.serverUrl;
                delete safeState.profile.serverKey;
              }
              
              await fetch(config.url, {
                method: "POST",
                headers: {
                  "X-Secret-Key": config.key,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  value: safeState,
                  _timestamp: localValue && localValue._timestamp ? localValue._timestamp : Date.now()
                })
              });
            }
          }
        } catch (e) {
          console.error("Server read error:", e);
        }
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
  
  if (key === DB_KEY) {
    const config = await getServerSyncConfig();
    if (config) {
      try {
        let safeState = JSON.parse(JSON.stringify(value));
        if (safeState && safeState.state && safeState.state.profile) {
          delete safeState.state.profile.serverUrl;
          delete safeState.state.profile.serverKey;
        } else if (safeState && safeState.profile) {
          delete safeState.profile.serverUrl;
          delete safeState.profile.serverKey;
        }
        
        await fetch(config.url, {
          method: "POST",
          headers: {
            "X-Secret-Key": config.key,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            value: safeState,
            _timestamp: value._timestamp
          })
        });
      } catch (e) {
        console.error("Server write error:", e);
      }
    }
  }
}
\;

// Replace readFromDb and writeToDb
const dbRegex = /async function readFromDb\(key\) \{[\s\S]*?async function deleteFromDb/g;
code = code.replace(dbRegex, newSyncLogic + '\nasync function deleteFromDb');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Custom Server sync logic added to JS');
