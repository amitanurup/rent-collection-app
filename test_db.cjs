const state = {
  profile: {
    serverUrl: "http://example.com/sync.php",
    serverKey: "Amit@1234",
    ownerName: "Amit"
  }
};

const value = { savedAt: "now", state };
value._timestamp = Date.now();

let safeState = JSON.parse(JSON.stringify(value));
if (safeState && safeState.state && safeState.state.profile) {
  delete safeState.state.profile.serverUrl;
  delete safeState.state.profile.serverKey;
}

const payload = JSON.stringify({
  value: safeState,
  _timestamp: value._timestamp
});

const cloudData = JSON.parse(payload);
let localValue = cloudData.value;
if (localValue && localValue.state && localValue.state.profile) {
  localValue.state.profile.serverUrl = "http://example.com/sync.php";
  localValue.state.profile.serverKey = "Amit@1234";
}

console.log(JSON.stringify(localValue, null, 2));
