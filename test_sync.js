const DB_KEY = "rent_collection_data";
let indexedDB = {}; // mock DB

// Mock state
let state = {
  profile: {
    serverUrl: "",
    serverKey: "",
    ownerName: ""
  },
  tenants: []
};

function Date_now() { return 1000; }

async function writeToDb(key, value) {
  if (typeof value === "object" && value !== null) {
    value._timestamp = Date_now();
  }
  indexedDB[key] = JSON.parse(JSON.stringify(value)); // mock writeToLocalDb
  
  if (key === DB_KEY) {
    // mock getServerSyncConfig
    const config = (indexedDB[DB_KEY]?.state?.profile?.serverUrl) 
      ? { url: indexedDB[DB_KEY].state.profile.serverUrl, key: indexedDB[DB_KEY].state.profile.serverKey }
      : null;
      
    if (config) {
      let safeState = JSON.parse(JSON.stringify(value));
      delete safeState.state.profile.serverUrl;
      delete safeState.state.profile.serverKey;
      
      // mock fetch POST (saves to server)
      global.serverDb = { value: safeState, _timestamp: value._timestamp };
    }
  }
}

async function readFromDb(key) {
  let localValue = indexedDB[key];
  
  if (key === DB_KEY) {
    const config = (localValue?.state?.profile?.serverUrl) 
      ? { url: localValue.state.profile.serverUrl, key: localValue.state.profile.serverKey }
      : null;
      
    if (config) {
      // mock fetch GET
      const cloudData = global.serverDb;
      if (cloudData && cloudData.value) {
        if (!localValue || !localValue._timestamp || (cloudData._timestamp && cloudData._timestamp > localValue._timestamp)) {
          const localUrl = config.url;
          const localKey = config.key;
          
          localValue = cloudData.value;
          if (!localValue) localValue = { state: { profile: {} } };
          if (localValue.state) {
            if (!localValue.state.profile) localValue.state.profile = {};
            localValue.state.profile.serverUrl = localUrl;
            localValue.state.profile.serverKey = localKey;
          }
          indexedDB[key] = JSON.parse(JSON.stringify(localValue));
        }
      }
    }
  }
  return localValue;
}

async function runTest() {
  // 1. User enters data
  state.profile.ownerName = "Amit";
  state.profile.serverUrl = "http://test.com";
  state.profile.serverKey = "key123";
  
  // 2. User hits Save Setup
  await writeToDb(DB_KEY, { savedAt: "now", state });
  
  console.log("After save, indexedDB:", indexedDB[DB_KEY].state.profile.serverUrl); // should be "http://test.com"
  console.log("After save, server:", global.serverDb.value.state.profile.serverUrl); // should be undefined
  
  // 3. User refreshes page
  const saved = await readFromDb(DB_KEY);
  console.log("After refresh, returned from DB:", saved.state.profile.serverUrl); // should be "http://test.com"
}
runTest();
