import { urlSegmentToInstagramId } from "instagram-id-to-url-segment";
import { MediaInfoResponseRootObject } from "./postInfoResponseType";
import { DataStructure } from "./dataStructure";


interface Env {
  COOKIE: string;
  XIGAPPID: string;
}

const commonInstagramHeaders = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "X-Ig-App-Id": "936619743392459",
  "X-Asbd-Id": "129477",
  "x-requested-with": "XMLHttpRequest",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "upgrade-insecure-requests": "1",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "en-US,en;q=0.9,en;q=0.8"
};

const getInfo = async (id: string, env: Env): Promise<MediaInfoResponseRootObject> => {
  const res = await fetch(
    `https://i.instagram.com/api/v1/media/${urlSegmentToInstagramId(id)}/info/`,
    {
      headers: {
        cookie: env.COOKIE,
        ...commonInstagramHeaders
      }
    }
  );
  if (!res.ok) throw new Error(`PAPI Failed to fetch ${res.status}`);
  return await res.json();
}


export default async (event: FetchEvent, postId: string, env: Env): Promise<DataStructure> => {

  const cacheKey = new Request(`https://www.instagram.com/p/${postId}/papi`);
  const cache = caches.default;

  let cacheRes = await cache.match(cacheKey);
  if (cacheRes) {
    console.log("PAPI cache hit");
    return await cacheRes.json();
  }

  const res = await getInfo(postId, env);
  
  const { items } = res;


  if (items.length === 0) throw new Error("No items found");
  const { carousel_media: carouselMedia } = items[0];

  const item = items[0];

  const extractedPages = carouselMedia?.map((media) => ({
    mediaUrl:
      media.video_versions?.[0]?.url ??
      media.image_versions2?.candidates?.[0]?.url,
    isVideo: !!media.video_versions?.[0]?.url
  }));

  const imageUrls = carouselMedia
    ?.map((media) => media.image_versions2?.candidates?.[0]?.url)
    .filter(Boolean);

  const { caption, like_count, comment_count, image_versions2, video_versions } = item;
  const extractedData = {
    caption: caption?.text,
    username: items[0].user.username,
    imageUrls: imageUrls ?? [ image_versions2.candidates[0].url ],
    extractedPages: extractedPages,
    videoUrl: video_versions?.[0]?.url,
    likeCount: like_count,
    commentCount: comment_count,
    provider: "PAPI"
  };
  const extractedDataResponse = new Response(JSON.stringify(extractedData), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "Cache-Control": "s-maxage=86400"
    }
  });
  console.log("PAPI cache miss");
  event.waitUntil(cache.put(cacheKey, extractedDataResponse.clone()));
  return extractedData
};
