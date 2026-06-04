let dbStore = {};
let serverData = { value: { state: { tenants: [{id:1, name:'John'}] } }, _timestamp: 100 };

async function readFromDb(key, allowSync = true) {
  let localValue = dbStore[key];
  if (allowSync) {
    let cloudData = JSON.parse(JSON.stringify(serverData));
    const cloudTs = cloudData._timestamp || cloudData.value._timestamp || 0;
    const localTs = localValue && localValue._timestamp ? localValue._timestamp : 0;
    
    if (cloudTs > localTs || !localValue || !localValue.state) {
      localValue = cloudData.value;
      if (!localValue) localValue = { state: { profile: {} } };
      if (localValue.state) {
        if (!localValue.state.profile) localValue.state.profile = {};
        localValue.state.profile.serverUrl = 'test';
        localValue.state.profile.serverKey = 'test';
      }
      localValue._timestamp = cloudTs;
      dbStore[key] = JSON.parse(JSON.stringify(localValue));
    }
  }
  return localValue;
}

function normalizeState(s) {
  return { tenants: Array.isArray(s?.tenants) ? s.tenants : [], profile: s?.profile || {} };
}

function ensureProfileAccessKeys(state) {
  let changed = false;
  if (!state.profile.requestAdminKey) { state.profile.requestAdminKey = 'x'; changed = true; }
  return changed;
}

async function run() {
  console.log('--- REFRESH ---');
  let currentDbTimestamp = 0;
  let state = {};
  
  // loadState
  const saved = await readFromDb('key');
  currentDbTimestamp = saved && saved._timestamp ? saved._timestamp : 0;
  const source = saved && saved.state ? saved.state : saved;
  state = normalizeState(source);
  
  console.log('After loadState, tenants:', state.tenants.length);
  
  if (ensureProfileAccessKeys(state)) {
    // persistState
    let obj = { state };
    obj._timestamp = Date.now();
    serverData = { value: obj, _timestamp: obj._timestamp }; // writeToDb
    dbStore['key'] = obj;
  }
  
  console.log('After ensure, tenants:', state.tenants.length);
  
  // autoSync
  const saved2 = await readFromDb('key', true);
  const newTs = saved2 && saved2._timestamp ? saved2._timestamp : 0;
  
  if (newTs >= currentDbTimestamp || state.tenants.length === 0) {
    currentDbTimestamp = newTs;
    const source2 = saved2 && saved2.state ? saved2.state : saved2;
    state = normalizeState(source2);
    console.log('autoSync rendered tenants:', state.tenants.length);
  }
}

run();
