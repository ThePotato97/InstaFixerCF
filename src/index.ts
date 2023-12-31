import {
  error, // creates error responses
  json, // creates JSON responses
  html, // creates HTML responses
  Router // the ~440 byte router itself
} from "itty-router";
import he from 'he';
import Constants from "./constants";
import fetchFromPAPI from "./util/fetchFromPAPI.js";
import scrapePostData from "./util/scrapePostData";
import getGraphQLData from "./util/getGraphQLData";

// create a new Router
const router = Router();

async function handleGeneric(req, _env, event) {
  const { encodedUrl } = req.params;
  const mediaUrl = decodeURIComponent(encodedUrl);
  const urls = mediaUrl.split(",");

  if (urls.length === 0) return error(400);

  // validate the URLs

  const invalidUrls = urls.filter((media) => {
    const url = new URL(media);
    const parts = url.hostname.split(".");
    const domain = parts.length > 1 ? parts[parts.length - 2] : null;
    return domain !== "cdninstagram";
  });

  if (invalidUrls.length > 0) {
    return json({
      error: "Invalid domain",
      message: "Please use a valid Instagram CDN URL",
      urls: invalidUrls
    });
  }

  const cache = caches.default;
  const cacheKey = req;
  let res = await cache.match(cacheKey);
  console.log("urls", urls);
  if (res) {
    console.log("image cache hit");
    return res;
  }
  const { create_mosaic } = await import("../collage");
  const images = await Promise.all(
    urls.map(async (url) => {
      const imageResponse = await fetch(url, {
        cf: {
          cacheEverything: true,
          cacheTtl: 31536000
        }
      });
      const isCached = imageResponse.headers.get("CF-Cache-Status");
      console.log(`Image Cache status: ${isCached}`);
      const blob = await imageResponse.blob();
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    })
  );
  let image: ArrayBufferLike;
  if (images.length > 1) {
    console.log("creating mosaic");
    const layout = create_mosaic(images);
    console.log("created mosaic");
    image = await layout.buffer;
  } else {
    image = await images[0].buffer;
  }
  res = new Response(image, {
    headers: {
      "Content-Type": "image/jpeg"
    }
  });
  event.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

const fetchFromProxy = (url: string, proxy: "video" | "image") => {
  const encodedUrl = encodeURIComponent(url);

  return `https://gginstagram.com/${proxy}/${encodedUrl}`;
};

const allowedCountries = ["US", "GB", "CA"];

const allowedASNs = [396982];

async function tempRedirect(url) {
  console.error("sending elsewhere");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "bot"
    }
  });
  const body = await response.text();
  const replacedVideos = body.replace(
    /\/videos\//g,
    "https://ddinstagram.com/videos/"
  );
  const replacedImages = replacedVideos.replace(
    /\/images\//g,
    "https://ddinstagram.com/images/"
  );

  return html(replacedImages);
}

const fetchData = async (event: FetchEvent, id, env) => {
  try {
    console.log("fetching scrape");
    const data = await scrapePostData(event, id);
    return data;
  } catch (e) {
    console.error("scrape error", e);
    Promise.reject(e);
  }
  try {
    console.log("fetching graphql");
    const data = await getGraphQLData(event, id);
    return data;
  } catch (e) {
    console.error("graphql error", e);
    Promise.reject(e);
  }
  try {
    console.log("fetching papi");
    const data = await fetchFromPAPI(event, id, env);
    return data;
  } catch (e) {
    console.error("papi error", e);
    Promise.reject(e);
  }
  return {
    imageUrls: null,
    caption: null,
    likeCount: null,
    commentCount: null,
    username: null,
    videoUrl: null,
    extractedPages: null,
    provider: null
  };
};

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max);

const embed = async (req, env, event) => {
  const { id, index } = req.params;
  const { bypass, c } = req.query;
  const url = new URL(req.url);

  const userAgent = req.headers.get("User-Agent") || "";
  const isBotUA = userAgent.match(Constants.BOT_UA_REGEX) !== null;

  const { asn } = req.cf;
  const { country } = req.cf;

  const targetUrl = `https://www.instagram.com${url.pathname}`;
  if (!isBotUA && !bypass) {
    console.error("redirecting invalid user agent");
    return Response.redirect(targetUrl, 302);
  }

  const cacheUrl = new URL(`https://instagram.com/${url.pathname}`);

  const cacheKey = new Request(cacheUrl);
  console.log("cache key", cacheKey.url);
  const cache = caches.default;

  const cachedResponse = await cache.match(cacheKey);

  // if (cachedResponse) {
  //   console.log("embed cache hit");
  //   return cachedResponse;
  // }

  // const sendElseWhere = `https://ddinstagram.com${url.pathname}`;
  // if (!allowedASNs.includes(asn) || !allowedCountries.includes(country) || c) {
  //   tempRedirect(sendElseWhere);
  // }
  try {
    const {
      imageUrls,
      caption,
      likeCount,
      commentCount,
      username,
      videoUrl,
      extractedPages,
      provider
    } = await fetchData(event, id, env);

    if (!imageUrls && !videoUrl) {
      throw new Error("No media found");
    }

    const pages = extractedPages?.length;
    const formatter = Intl.NumberFormat("en", { notation: "compact" });
    const formattedLikeCount = likeCount
      ? formatter.format(likeCount)
      : undefined;
    const formattedCommentCount = commentCount
      ? formatter.format(commentCount)
      : undefined;

    const selectedPage = clamp(Number(index), 1, extractedPages?.length);

    const selectedPageData = extractedPages?.[selectedPage - 1];
    const selectedPageUrl = index ? selectedPageData?.mediaUrl : undefined;
    const selectedPageIsVideo = selectedPageData?.isVideo;

    const images = [...(imageUrls || [])].splice(0, 4);

    const strippedTags = caption?.replace(/#[^\s]+/g, "").trim();
    const truncatedCaption = strippedTags ? strippedTags.split("\n")[0] : "";
    const encodedCaption = he.encode(truncatedCaption);
    const statsArray = []
    if (pages && pages > 1) {
      statsArray.push(`${index ?? images.length}/${pages} 🖼️`);
    }
    if (formattedLikeCount) {
      statsArray.push(`${formattedLikeCount} ❤️`);
    }
    if (formattedCommentCount) {
      statsArray.push(`${formattedCommentCount} 💬`);
    }
    const stats = statsArray.join(" • ");

    const headers = [
      '<meta charset="utf-8"/>',
      `<link rel="canonical" href="${targetUrl}"/>`,
      `<meta property="og:url" content="${targetUrl}"/>`,
      '<meta property="theme-color" content="#E1306C"/>',
      `<meta property="twitter:site" content="@${username}"/>`,
      `<meta property="twitter:creator" content="@${username}"/>`,
      `<meta property="twitter:title" content="@${username}"/>`,
      `<meta property="og:description" content="${encodedCaption}"/>`,
      `<meta property="og:site_name" content="PotatoInstaFix (${provider})"/>`
    ];

    if (selectedPageIsVideo || videoUrl) {
      const proxyVideo = fetchFromProxy(selectedPageUrl ?? videoUrl, "video");
      const statsWithCaption = `${truncatedCaption}\n\n${stats}`;
      headers.push(`<link rel="alternate"
		href="https://gginstagram.com/faux?text=${encodeURIComponent(
      statsWithCaption
    )}&url=${url.pathname}&provider=${provider}"
		type="application/json+oembed" title=@${username}>`);
      headers.push(`<meta property="og:video" content="${proxyVideo}"/>`);
      headers.push('<meta property="og:video:type" content="video/mp4"/>');
      headers.push(`<meta property="twitter:player" content="${proxyVideo}"/>`);
      headers.push(`<meta property="twitter:player:width" content="0"/>`);
      headers.push(`<meta property="twitter:player:height" content="0"/>`);
      headers.push(
        `<meta property="twitter:player:stream" content="${proxyVideo}"/>`
      );
      headers.push(
        '<meta property="twitter:player:stream:content_type" content="video/mp4"/>'
      );
      headers.push('<meta name="twitter:card" content="player"/>');
    } else {
      const proxyImage = fetchFromProxy(
        selectedPageUrl ? selectedPageUrl : images.join(","),
        "image"
      );
      headers.push(`<link rel="alternate"
		href="https://gginstagram.com/faux?text=${encodeURIComponent(stats)}&url=${
        url.pathname
      }&provider=${provider}"
		type="application/json+oembed" title=@${username}>`);
      headers.push(`<meta property="og:image" content="${proxyImage}"/>`);
      headers.push(`<meta property="twitter:image" content="${proxyImage}"/>`);
      headers.push('<meta name="twitter:card" content="summary_large_image"/>');
      headers.push(`<meta property="og:image:width" content="${0}"/>`);
      headers.push(`<meta property="og:image:height" content="${0}"/>`);
      headers.push(`<meta property="twitter:image:height" content="${0}"/>`);
      headers.push(`<meta property="twitter:image:width" content="${0}"/>`);
    }

    const response = html(`
  <!DOCTYPE html>
    <html>
   <head>
   ${headers.join("\n")}
   </head>
      </html>
      <body>
      ${JSON.stringify({
        imageUrls,
        caption: truncatedCaption,
        likeCount,
        commentCount,
        username,
        extractedPages,
        provider
      })}
      </body>
        `);
    event.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (e) {
    // send elsewhere
    const sendElseWhere = `https://ddinstagram.com${url.pathname}`;
    return tempRedirect(sendElseWhere);
  }
};

const generateFakeEmbed = async (req) => {
  const { text, url, provider } = req.query;
  if (!text || !url) return error(400);
  return json({
    author_name: decodeURIComponent(text),
    author_url: `https://instagram.com${decodeURIComponent(url)}`,
    provider_name: `PotatoInstaFix (${provider}) ⭐`,
    provider_url: "https://github.com/ThePotato97/InstaFixerCF",
    title: "Instagram",
    type: "link",
    version: "1.0"
  });
};

const handleError = (e) => {
  console.error(e); // Log the error for server-side visibility
  const code = e.status || 500;
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

router.get("/video/:encodedUrl", handleGeneric);
router.get("/image/:encodedUrl", handleGeneric);
router.get("/p/:id/:index", embed);
router.get("/p/:id", embed);
router.get("/faux/", generateFakeEmbed);
router.get("/reel/:id", embed);
router.all("*", () =>
  Response.redirect("https://github.com/ThePotato97/InstaFixerCF", 302)
);

// Fetch event listener
export default {
  fetch: (request, ...args) =>
    router.handle(request, ...args).catch(handleError)
};
