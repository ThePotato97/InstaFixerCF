import {
  error, // creates error responses
  json, // creates JSON responses
  html, // creates HTML responses
  Router, // the ~440 byte router itself
} from "itty-router";
import Constants from "./constants";
import { getPostInfo } from "./util/requests.js";

// create a new Router
const router = Router();

async function handleRequest(req, _env, event) {
  const { encodedUrl } = req.params;
  const mediaUrl = decodeURIComponent(encodedUrl);
  const url = new URL(mediaUrl);

  if (!url) return error(400);

  const parts = url.hostname.split(".");
  const domain = parts.length > 1 ? parts[parts.length - 2] : null;
  console.log("domain", domain);
  if (domain !== "cdninstagram")
    return json({
      error: "Invalid domain",
      message: "Please use a valid Instagram CDN URL",
      url: mediaUrl,
      domain: domain,
    });

  const cache = caches.default;
  const cacheKey = req;
  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  } else {
    response = await fetch(mediaUrl);

    event.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
}

const fetchFromProxy = (url) => {
  const encodedUrl = encodeURIComponent(url);

  return `https://gginstagram.com/media/${encodedUrl}`;
};

const embed = async (req, env, event) => {
  const { id, index } = req.params;
  const { bypass } = req.query;
  const url = new URL(req.url);

  const userAgent = req.headers.get("User-Agent") || "";
  const isBotUA = userAgent.match(Constants.BOT_UA_REGEX) !== null;

  const targetUrl = `https://www.instagram.com${url.pathname}`;
  if (!isBotUA && !bypass) {
    return Response.redirect(targetUrl, 302);
  }

  const cacheKey = req;
  const cache = caches.default;
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  const {
    videoUrl,
    imageUrl,
    caption,
    likeCount,
    commentCount,
    username,
    pages,
    json,
  } = (await getPostInfo(id, index, env)) ?? {};
  const truncatedCaption = caption ? caption.split("\n")[0] : "";
  const text = encodeURIComponent(
    `${
      pages && pages > 1 ? `${index ?? 1}/${pages} 🖼️` : ``
    } ${likeCount} ❤️  ${commentCount} 💬`
  );
  const headers = [
    `<meta charset="utf-8"/>`,
    `<link rel="canonical" href="${targetUrl}"/>`,
    `<meta property="og:url" content="${targetUrl}"/>`,
    `<meta property="theme-color" content="#E1306C"/>`,
    `<meta property="twitter:site" content="@${username}"/>`,
    `<meta property="twitter:creator" content="@${username}"/>`,
    `<meta property="twitter:title" content="@${username}"/>`,
    `<meta property="og:description" content="${truncatedCaption}"/>`,
    `	<link rel="alternate"
		href="https://gginstagram.com/faux?text=${text}&url=${url.pathname}"
		type="application/json+oembed" title=@${username}>`,
    `<meta property="og:site_name" content="PotatoInstaFix"/>`,
  ];

  if (videoUrl) {
    const proxyVideo = fetchFromProxy(videoUrl);
    headers.push(`<meta property="og:video" content="${proxyVideo}"/>`);
    headers.push(`<meta property="og:video:type" content="video/mp4"/>`);
    headers.push(`<meta property="twitter:player" content="${proxyVideo}"/>`);
    headers.push(`<meta property="twitter:player:width" content="0"/>`);
    headers.push(`<meta property="twitter:player:height" content="0"/>`);
    headers.push(
      `<meta property="twitter:player:stream" content="${proxyVideo}"/>`
    );
    headers.push(
      `<meta property="twitter:player:stream:content_type" content="video/mp4"/>`
    );
    headers.push(`<meta name="twitter:card" content="player"/>`);
  } else {
    const proxyImage = fetchFromProxy(imageUrl);
    headers.push(`<meta property="og:image" content="${proxyImage}"/>`);
    headers.push(`<meta property="twitter:image" content="${proxyImage}"/>`);
    headers.push(`<meta name="twitter:card" content="summary_large_image"/>`);
  }

  const response = html(`
  <!DOCTYPE html>
    <html>
   <head>
   ${headers.join("\n")}
   </head>
      </html>
        `);
  event.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
};

const generateFakeEmbed = async (req) => {
  const { text, url } = req.query;
  if (!text || !url) return error(400);
  return json({
    author_name: decodeURIComponent(text),
    author_url: `https://instagram.com${decodeURIComponent(url)}`,
    provider_name: "PotatoInstaFix",
    provider_url: "https://github.com/ThePotato97/InstaFixerCF",
    title: "Instagram",
    type: "link",
    version: "1.0",
  });
};

router.get("/media/:encodedUrl", handleRequest);
router.get("/p/:id/:index", embed);
router.get("/p/:id", embed);
router.get("/faux/", generateFakeEmbed);
router.get("/reel/:id", embed);
router.all("*", () => error(404));

const handleError = (error) => {
  console.error(error); // Log the error for server-side visibility
  const code = error.status || 500;
  // Return a generic error message
  const htmlResponse = `
    <!DOCTYPE html>
    <html>
      <head>
      	<meta charset="utf-8" />
	      <meta name="theme-color" content="#CE0071" />
	      <meta name="twitter:title" content="PotatoInstaFix" />
	      <meta property="og:url" content="https://instagram.com/reel/CzqaXfT6qdk6/" />
        <meta name="description" content="An error occurred: ${code}">
        <meta property="og:title" content="Error ${code}">
        <meta property="og:description" content="Post might not be available ${code}">
      </head>
      <body>
        <h1>Internal Server Error</h1>
        <!-- Additional HTML content for the error page -->
      </body>
    </html>
  `;
  return html(htmlResponse);
};

// Fetch event listener
export default {
  fetch: (request, ...args) =>
    router.handle(request, ...args).catch(handleError),
};
