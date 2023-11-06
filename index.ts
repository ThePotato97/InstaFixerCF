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

const embed = async (req, env) => {
  const { id, index } = req.params;

  const userAgent = req.headers.get("User-Agent") || "";
  const isBotUA = userAgent.match(Constants.BOT_UA_REGEX) !== null;
  const url = new URL(req.url);
  const targetUrl = `https://www.instagram.com${url.pathname}`;
  if (!isBotUA) {
    return Response.redirect(targetUrl, 302);
  }

  const {
    videoUrl,
    imageUrl,
    caption,
    likeCount,
    commentCount,
    username,
    json,
  } = (await getPostInfo(id, index, env)) ?? {};
  const truncatedCaption = caption ? caption.split("\n")[0] : "";
  const headers = [
    `<link rel="canonical" href="${targetUrl}"/>`,
    `<meta property="og:url" content="${targetUrl}"/>`,
    `<meta property="theme-color" content="#E1306C"/>`,
    `<meta property="twitter:site" content="@${username}"/>`,
    `<meta property="twitter:creator" content="@${username}"/>`,
    `<meta property="twitter:title" content="@${username}"/>`,
    `<meta property="og:description" content="${truncatedCaption}"/>`,
    `<meta property="og:site_name" content="PotatoInstaFix"/>`,
  ];

  if (videoUrl) {
    headers.push(`<meta property="og:video" content="${videoUrl}"/>`);
    headers.push(`<meta property="og:video:type" content="video/mp4"/>`);
    headers.push(`<meta property="twitter:player" content="${videoUrl}"/>`);
    headers.push(`<meta property="twitter:player:width" content="0"/>`);
    headers.push(`<meta property="twitter:player:height" content="0"/>`);
    headers.push(
      `<meta property="twitter:player:stream" content="${videoUrl}"/>`
    );
    headers.push(
      `<meta property="twitter:player:stream:content_type" content="video/mp4"/>`
    );
    headers.push(`<meta name="twitter:card" content="player"/>`);
  } else {
    headers.push(`<meta property="og:image" content="${imageUrl}"/>`);
    headers.push(`<meta property="twitter:image" content="${imageUrl}"/>`);
    headers.push(`<meta name="twitter:card" content="summary_large_image"/>`);
  }

  return html(`
    <html>
   <head>
   ${headers.join("\n")}
   </head>
      </html>
        `);
};

router.get("/p/:id/:index", embed);
router.get("/p/:id", embed);
router.get("/reel/:id", embed);
router.all("*", () => error(404));

export default {
  fetch: (request, ...args) =>
    router
      .handle(request, ...args)
      .then(json) // send as JSON
      .catch(error), // catch errors
};
