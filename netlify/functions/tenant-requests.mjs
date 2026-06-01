import { connectLambda, getStore } from "@netlify/blobs";

const MAX_BODY_BYTES = 6 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  if ((event.body || "").length > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, error: "Payload is too large" });
  }

  try {
    const stores = getTenantStores(event);
    const payload = JSON.parse(event.body || "{}");
    const action = cleanString(payload.action);

    if (action === "submit_request") {
      return await handleSubmitRequest(payload, stores);
    }

    if (action === "list_requests") {
      return await handleListRequests(payload, stores);
    }

    if (action === "remove_request") {
      return await handleRemoveRequest(payload, stores);
    }

    if (action === "upsert_profile") {
      return await handleUpsertProfile(payload, stores);
    }

    if (action === "get_public_profile") {
      return await handleGetPublicProfile(payload, stores);
    }

    return jsonResponse(400, { ok: false, error: "Unsupported action" });
  } catch (error) {
    console.error(error);
    return jsonResponse(Number(error && error.statusCode) || 500, {
      ok: false,
      error: cleanString(error && error.message) || "Internal server error"
    });
  }
}

function getTenantStores(event) {
  connectLambda(event);
  return {
    requestStore: getStore({ name: "krishna-residency-tenant-requests" }),
    profileStore: getStore({ name: "krishna-residency-public-profiles" })
  };
}

async function handleSubmitRequest(payload, { requestStore }) {
  const inboxId = validateInboxId(payload.inboxId);
  const request = normalizeRequest(payload.request || {});
  const requestId = makeId("request");
  const now = new Date().toISOString();

  if (!request.fullName || !request.mobile || !request.moveInDate) {
    return jsonResponse(400, { ok: false, error: "Name, mobile, and move-in date are required" });
  }

  await requestStore.setJSON(`${inboxId}/${requestId}.json`, {
    ...request,
    id: requestId,
    createdAt: now,
    updatedAt: now
  });

  return jsonResponse(200, {
    ok: true,
    requestId
  });
}

async function handleListRequests(payload, stores) {
  const inboxId = validateInboxId(payload.inboxId);
  const profile = await requireProfileAccess(inboxId, payload.adminKey, stores);
  const { requestStore } = stores;
  const listed = await requestStore.list({ prefix: `${inboxId}/` });
  const keys = Array.isArray(listed?.blobs) ? listed.blobs.map((item) => item.key).filter(Boolean) : [];
  const requests = [];

  for (const key of keys) {
    const record = await requestStore.get(key, { type: "json" });
    if (record) {
      requests.push(record);
    }
  }

  return jsonResponse(200, {
    ok: true,
    inboxId,
    ownerName: profile.ownerName || "Owner",
    requests
  });
}

async function handleRemoveRequest(payload, stores) {
  const inboxId = validateInboxId(payload.inboxId);
  await requireProfileAccess(inboxId, payload.adminKey, stores);
  const { requestStore } = stores;
  const requestId = validateRequestId(payload.requestId);
  await requestStore.delete(`${inboxId}/${requestId}.json`);
  return jsonResponse(200, { ok: true });
}

async function handleUpsertProfile(payload, { profileStore }) {
  const inboxId = validateInboxId(payload.inboxId);
  const adminKey = validateAdminKey(payload.adminKey);
  const profile = normalizeProfile(payload.profile || {});
  const existing = await profileStore.get(`${inboxId}.json`, { type: "json" });

  if (existing && cleanString(existing.adminKey) && cleanString(existing.adminKey) !== adminKey) {
    return jsonResponse(403, { ok: false, error: "Admin key mismatch" });
  }

  await profileStore.setJSON(`${inboxId}.json`, {
    adminKey,
    propertyName: profile.propertyName,
    ownerName: profile.ownerName,
    city: profile.city,
    logoDataUrl: profile.logoDataUrl,
    updatedAt: new Date().toISOString()
  });

  return jsonResponse(200, { ok: true });
}

async function handleGetPublicProfile(payload, { profileStore }) {
  const inboxId = validateInboxId(payload.inboxId);
  const profile = await profileStore.get(`${inboxId}.json`, { type: "json" });
  return jsonResponse(200, {
    ok: true,
    profile: profile
      ? {
          propertyName: cleanString(profile.propertyName),
          ownerName: cleanString(profile.ownerName),
          city: cleanString(profile.city),
          logoDataUrl: normalizeImageDataUrl(profile.logoDataUrl)
        }
      : {}
  });
}

async function requireProfileAccess(inboxId, adminKey, { profileStore }) {
  const validAdminKey = validateAdminKey(adminKey);
  const profile = await profileStore.get(`${inboxId}.json`, { type: "json" });

  if (!profile) {
    throw new Error("Profile setup is not synced yet");
  }

  if (cleanString(profile.adminKey) !== validAdminKey) {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  return profile;
}

function normalizeRequest(source) {
  return {
    fullName: cleanString(source.fullName).slice(0, 120),
    mobile: cleanDigits(source.mobile).slice(0, 15),
    moveInDate: cleanDate(source.moveInDate),
    totalMembers: toWholeNumber(source.totalMembers),
    aadhaarNumber: cleanDigits(source.aadhaarNumber).slice(0, 12),
    address: cleanString(source.address).slice(0, 400),
    notes: cleanString(source.notes).slice(0, 700),
    aadhaarDocument: normalizeDocument(source.aadhaarDocument)
  };
}

function normalizeProfile(source) {
  return {
    propertyName: cleanString(source.propertyName).slice(0, 120) || "Krishna Residency",
    ownerName: cleanString(source.ownerName).slice(0, 120) || "Owner",
    city: cleanString(source.city).slice(0, 120),
    logoDataUrl: normalizeImageDataUrl(source.logoDataUrl)
  };
}

function normalizeDocument(source) {
  if (!source || !cleanString(source.dataUrl)) {
    return null;
  }

  const dataUrl = normalizeImageDataUrl(source.dataUrl);
  if (!dataUrl) {
    return null;
  }

  return {
    name: cleanString(source.name).slice(0, 120) || "aadhaar-photo.jpg",
    type: "image/jpeg",
    size: Math.min(Number(source.size) || 0, MAX_BODY_BYTES),
    dataUrl,
    updatedAt: cleanDateTime(source.updatedAt)
  };
}

function validateInboxId(value) {
  const inboxId = cleanString(value);
  if (!/^[a-z0-9-]{8,120}$/i.test(inboxId)) {
    throw new Error("Invalid inbox id");
  }
  return inboxId;
}

function validateRequestId(value) {
  const requestId = cleanString(value);
  if (!/^[a-z0-9-]{8,120}$/i.test(requestId)) {
    throw new Error("Invalid request id");
  }
  return requestId;
}

function validateAdminKey(value) {
  const adminKey = cleanString(value);
  if (adminKey.length < 12) {
    throw new Error("Invalid admin key");
  }
  return adminKey;
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function cleanDate(value) {
  const dateValue = cleanString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : new Date().toISOString().slice(0, 10);
}

function cleanDateTime(value) {
  const dateValue = cleanString(value);
  return Number.isNaN(Date.parse(dateValue)) ? new Date().toISOString() : new Date(dateValue).toISOString();
}

function toWholeNumber(value) {
  const number = Math.floor(Number(value) || 0);
  return number > 0 ? number : 0;
}

function normalizeImageDataUrl(value) {
  const normalized = cleanString(value);
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(normalized)) {
    return "";
  }
  return normalized;
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders
    },
    body: JSON.stringify(body)
  };
}
