import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "DELETE") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
  }

  try {
    const store = getStore("rent_collection_sync");
    await store.delete(key);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
