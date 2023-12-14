/**
 * A fetch wrapper that caches responses using Cloudflare Workers.
 * @param event The fetch event.
 * @param request The request or URL to fetch.
 * @param init Optional fetch initialization parameters.
 * @param [cacheTTL=86400] The time-to-live (TTL) for the cache, in seconds.
 * @returns The response from cache or fetched from the server.
 */
async function cachedFetch(
  event: FetchEvent,
  request: Request | string | URL,
  init?: RequestInit,
  cacheTTL: number = 86400
): Promise<Response> {
  let cacheUrl: URL;

  if (request instanceof Request) {
    cacheUrl = new URL(request.url);
  } else if (request instanceof URL) {
    cacheUrl = request;
  } else {
    // it's a string
    cacheUrl = new URL(request);
  }

  const cacheKey = new Request(
    cacheUrl.toString(),
    request instanceof Request ? request : init
  );
  const cache = caches.default;

  try {
    let response = await cache.match(cacheKey);
    if (response) {
      console.log("Cache hit for:", cacheUrl.toString());
      return response;
    }

    console.log("Cache miss for:", cacheUrl.toString());
    response = await fetch(request, init);

    if (response.ok) {
      const clonedResponse = response.clone();

      const cachedResponse = new Response(clonedResponse.body, response);
      cachedResponse.headers.append("Cache-Control", `s-maxage=${cacheTTL}`);
      event.waitUntil(cache.put(cacheKey, cachedResponse));
    }

    return response;
  } catch (error) {
    console.error("Error during fetch or cache operation:", error);
    return new Response("An error occurred", { status: 500 });
  }
}

export default cachedFetch;
