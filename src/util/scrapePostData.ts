import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import fetchAdapter from "@haverstack/axios-fetch-adapter";
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

const getCommentCount = (root: HTMLElement): number => {
  const caption = root.querySelector(".Caption");
  if (!caption) return 0;
  const commentCount = caption.querySelector(".CaptionComments");
  if (!commentCount) return 0;
  const commentCountText = commentCount?.textContent;
  const regexMatches = commentCountText.match(/\d+/g);
  return regexMatches ? Number(regexMatches[0]) : 0;
};

const getLikeCount = (root: HTMLElement): number => {
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

interface ScrapeResponse {
  context: {
    likes_count: number;
    commenter_count: number;
  };
  gql_data: Data;
}

const getContextJSON = (root: HTMLElement): ScrapeResponse => {
  const regex = /(?<="contextJSON":).*?\}"/; // Replace with your actual regex

  const scripts = root.getElementsByTagName("script");
  const scriptsArray = Array.from(scripts); // Convert HTMLCollection to an array

  const matchingScript = scriptsArray.find((script) =>
    regex.test(script.textContent)
  );
  if (matchingScript) {
    const matchResult = regex.exec(matchingScript.textContent)[0];
    // handle double-encoded json
    const doubleEncoded = JSON.parse(matchResult);
    return JSON.parse(doubleEncoded);
  } else {
    throw new Error("No matching script found");
  }
};

const fetchPostData = async (id: string) => {
  try {
    const response = await fetch(
      `https://www.instagram.com/p/${id}/embed/captioned`,
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Mode": "navigate",
          Referer: `https://www.instagram.com/p/${id}/`,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          Connection: "close"
        }
      }
    );
    return await response.text();
  } catch {
    throw new Error("Error fetching data");
  }
};

export default async (
  event: FetchEvent,
  id: string
): Promise<DataStructure> => {
  const url = `https://www.instagram.com/p/${id}/embed/captioned`;
  const cache = caches.default;
  const cacheKey = new Request(url);

  let cacheData = await cache.match(cacheKey);

  if (cacheData) {
    console.log("SCRAPE cache hit");
    return await cacheData.json();
  }

  const body = await fetchPostData(id);
  let extractedData: DataStructure;
  const root = parse(body);

  try {
    const contextJSON = getContextJSON(root);

    const { gql_data, context } = contextJSON;

    console.log("json", contextJSON);

    const parseGQLData = parseGraphQLData(gql_data);

    extractedData = {
      ...parseGQLData,
      likeCount: context.likes_count,
      commentCount: context.commenter_count,
      provider: "SCRAPE"
    };
  } catch (e) {
    console.log("error", e);
  }
  try {
    checkForError(root);
    const username = getUsername(root);
    const caption = getCaption(root);
    const commentCount = getCommentCount(root);
    const imageUrls = getImageUrls(root);
    const likeCount = getLikeCount(root);

    extractedData = {
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

  if (!extractedData) {
    throw new Error("No data found");
  }

  const response = new Response(JSON.stringify(extractedData), {
    headers: {
      "content-type": "application/json",
      "Cache-Control": "s-maxage=86400"
    }
  });

  event.waitUntil(cache.put(cacheKey, response.clone()));

  return extractedData;
};
