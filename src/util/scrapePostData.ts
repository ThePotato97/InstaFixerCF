import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";
import fetchAdapter from "@haverstack/axios-fetch-adapter";
import { DataStructure } from "./dataStructure";
import { Post } from "./post";

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

const getContextJSON = (root: HTMLElement): Post => {
  const regex = /(?<="contextJSON":).*?\}"/; // Replace with your actual regex

  const scripts = root.getElementsByTagName("script");
  const scriptsArray = Array.from(scripts); // Convert HTMLCollection to an array

  const matchingScript = scriptsArray.find((script) =>
    regex.test(script.textContent)
  );
  if (matchingScript) {
    const matchResult = regex.exec(matchingScript.textContent)[0];
    return JSON.parse(matchResult);
  } else {
    throw new Error("No matching script found");
  }
};

export default async (id: string): Promise<DataStructure> => {
  const url = `https://www.instagram.com/p/${id}/embed/captioned`;
  const cache = caches.default;
  const cacheKey = new Request(url);
  let res = await cache.match(cacheKey);

  if (!res) {
    res = await fetch(`https://www.instagram.com/p/${id}/embed/captioned`, {
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
    });
    cache.put(cacheKey, res.clone());
  } else {
    console.log("scrape cache hit");
  }

  if (!res.ok) {
    throw new Error(
      `HTTP error! status: ${res.status}  ${JSON.stringify(await res.json())}`
    );
  }

  const root = parse(await res.text());
  checkForError(root);
  const username = getUsername(root);
  const caption = getCaption(root);
  const commentCount = getCommentCount(root);
  const imageUrls = getImageUrls(root);
  const likeCount = getLikeCount(root);

  return {
    caption,
    username,
    videoUrl: undefined,
    imageUrls,
    extractedPages: imageUrls.map((url) => ({ mediaUrl: url, isVideo: false })),
    likeCount,
    commentCount,
    provider: "SCRAPE"
  };
};
