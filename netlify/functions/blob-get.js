import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
  }

  try {
    const store = getStore("rent_collection_sync");
    const data = await store.get(key, { type: "json" });
    
    if (data) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
