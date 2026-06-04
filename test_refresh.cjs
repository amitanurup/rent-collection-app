const DB_KEY = 'rent_collection_data';
let dbStore = {}; // IndexedDB mock

// Mock state
let state = { tenants: [] };
let currentDbTimestamp = 0;
let isAutoSyncing = false;

// Server mock
let serverData = {
  value: { state: { tenants: [{id: 1, name: 'John'}] } },
  _timestamp: 123456
};

async function readFromDb(key, allowSync = true) {
  let localValue = dbStore[key];
  if (allowSync && key === DB_KEY) {
    const cloudData = serverData; // mock fetch
    if (cloudData && cloudData.value) {
      const cloudTs = cloudData._timestamp || cloudData.value._timestamp || 0;
      const localTs = localValue && localValue._timestamp ? localValue._timestamp : 0;
      
      console.log('Comparing cloudTs:', cloudTs, 'localTs:', localTs);

      if (cloudTs > localTs || !localValue || !localValue.state) {
        localValue = JSON.parse(JSON.stringify(cloudData.value));
        if (!localValue) localValue = { state: { profile: {} } };
        if (localValue.state) {
          if (!localValue.state.profile) localValue.state.profile = {};
          localValue.state.profile.serverUrl = 'test';
          localValue.state.profile.serverKey = 'test';
        }
        localValue._timestamp = cloudTs;
        dbStore[key] = JSON.parse(JSON.stringify(localValue));
        console.log('Overwrote localDB with server data.');
      }
    }
  }
  return localValue;
}

function normalizeState(s) {
  return { tenants: Array.isArray(s?.tenants) ? s.tenants : [] };
}

async function loadState() {
  const saved = await readFromDb(DB_KEY);
  currentDbTimestamp = saved && saved._timestamp ? saved._timestamp : 0;
  const source = saved && saved.state ? saved.state : saved;
  state = normalizeState(source || { tenants: [] });
  console.log('loadState finished. State tenants:', state.tenants.length);
}

function renderAll() {
  console.log('RENDER ALL CALLED. Tenants:', state.tenants.length);
}

async function autoSync() {
  if (isAutoSyncing) return;
  isAutoSyncing = true;
  try {
    const saved = await readFromDb(DB_KEY, true);
    const newTs = saved && saved._timestamp ? saved._timestamp : 0;
    console.log('autoSync: newTs:', newTs, 'currentDbTimestamp:', currentDbTimestamp);
    
    if (newTs >= currentDbTimestamp || state.tenants.length === 0) {
      currentDbTimestamp = newTs;
      const source = saved && saved.state ? saved.state : saved;
      state = normalizeState(source || { tenants: [] });
      renderAll();
    }
  } finally {
    isAutoSyncing = false;
  }
}

async function runTest() {
  console.log('--- FIRST LOGIN ---');
  // PIN entered, autoSync called
  await autoSync();
  
  console.log('\n--- BROWSER REFRESH ---');
  // Session storage true, init() runs
  state = { tenants: [] }; // Reset state
  currentDbTimestamp = 0; // Reset runtime var
  
  await loadState();
  renderAll();
  await autoSync();
}

runTest();
