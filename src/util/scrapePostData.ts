import { HTMLElement } from "node-html-parser";
import { DataStructure } from "./dataStructure";
import { Data } from "./post";
import parseGraphQLData from "./parseGraphQLData";

const getCaption = (root: HTMLElement): string | undefined => {
  const caption = root.querySelector(".Caption");
  if (!caption) return undefined;
  caption.querySelector(".CaptionUsername")?.remove();
  caption.querySelector(".CaptionComments")?.remove();
  return caption?.textContent;
};

const getCommentCount = (root: HTMLElement): number | undefined => {
  const caption = root.querySelector(".Caption");
  if (!caption) return 0;
  const commentCount = caption.querySelector(".CaptionComments");
  if (!commentCount) return 0;
  const commentCountText = commentCount?.textContent;
  const regexMatches = commentCountText.match(/\d+/g);
  return regexMatches ? Number(regexMatches[0]) : undefined;
};

const getLikeCount = (root: HTMLElement): number | undefined => {
  const likeCount = root.querySelector(".SocialProof > a");
  if (!likeCount) return 0;
  const likeCountText = likeCount?.textContent;
  const likes = likeCountText.replace(" likes", "").replace(",", "");
  return Number(likes);
};

const getUsername = (root: HTMLElement): string => {
  const username = root.querySelector(".UsernameText");
  return username?.textContent;
};

const getImageUrls = (root: HTMLElement): string[] => {
  const image = root.querySelector(".EmbeddedMediaImage");
  const imageUrl = image?.getAttribute("src");
  if (!imageUrl) return [];
  return [imageUrl];
};

const checkForError = (root: HTMLElement) => {
  const error = root.querySelector(".EmbedIsBroken");
  if (error) {
    throw new Error("Embed blocked");
  }
};

const checkIfVideo = (root: HTMLElement): boolean => {
  const video = root.querySelector(".Embed");
  // check if element has the tag data-media-type
  const mediaType = video?.getAttribute("data-media-type");
  return mediaType === "GraphVideo";
}

interface ScrapeResponse {
  context: {
    likes_count: number;
    commenter_count: number;
    comments_count: number;
  };
  gql_data: Data;
}

const getContextJSON = (body: string): ScrapeResponse => {
  const regex = /(?<="contextJSON":).*?\}"/; // Replace with your actual regex
  const matchResult = regex.exec(body)?.[0];
  if (!matchResult) {
    throw new Error("No matching script found");
  }
  // handle double-encoded json
  const doubleEncoded = JSON.parse(matchResult);
  return JSON.parse(doubleEncoded);
};

const fetchPostData = async (id: string) => {
  try {
    const response = await fetch(
      `https://www.instagram.com/p/${id}/embed/captioned?_fb_noscript=1`,
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Mode": "navigate",
          Referer: `https://www.instagram.com/p/${id}/`,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          Connection: "close",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Site": "same-origin",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0"
        }
      }
    );
    return await response.text();
  } catch {
    throw new Error("Error fetching data");
  }
};

const extractData = async (body: string) => {
  const { parse } = await import("node-html-parser");
  const root = parse(body);
  checkForError(root);
  try {
    const contextJSON = getContextJSON(body);

    const { gql_data, context } = contextJSON;

    const parseGQLData = parseGraphQLData(gql_data);
    return {
      ...parseGQLData,
      likeCount: context.likes_count,
      commentCount: context.commenter_count ?? context.comments_count,
      provider: "SCRAPE(GQL)"
    };
  } catch (e) {
    console.log("error", e);
  }
  try {
    const isVideo = checkIfVideo(root);
    if (isVideo) {
      throw new Error("Video not supported by SCRAPE");
    }
    const username = getUsername(root);
    const commentCount = getCommentCount(root);
    const caption = getCaption(root);
    const imageUrls = getImageUrls(root);
    const likeCount = getLikeCount(root);
    return {
      caption,
      username,
      videoUrl: undefined,
      imageUrls,
      extractedPages: imageUrls.map((url) => ({
        mediaUrl: url,
        isVideo: false
      })),
      likeCount,
      commentCount,
      provider: "SCRAPE"
    };
  } catch (e) {
    console.log("error", e);
  }
}

export default async (
  event: FetchEvent,
  id: string
): Promise<DataStructure> => {
  const url = `https://www.instagram.com/p/${id}/embed/captioned`;
  const cache = caches.default;
  const cacheKey = new Request(url);

  let cacheData = await cache.match(cacheKey);

  if (cacheData) {
    const cfCacheStatus = cacheData.headers.get("cf-cache-status");
    console.log(`SCRAPE cache status: ${cfCacheStatus}`);
    return await cacheData.json();
  }

  const body = await fetchPostData(id);
  ;
  


  const extractedData = await extractData(body);

  if (!extractedData) {
    throw new Error("No data found");
  }

  const response = new Response(JSON.stringify(extractedData), {
    headers: {
      "content-type": "application/json",
      "Cache-Control": "s-maxage=86400"
    }
  });

  event.waitUntil(cache.put(cacheKey, response));

  return extractedData;
};
