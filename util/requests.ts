import axios, { AxiosHeaders } from "axios";
import fetchAdapter from "@haverstack/axios-fetch-adapter";
import { urlSegmentToInstagramId } from "instagram-id-to-url-segment";
import { Env } from "../env";
import { MediaInfoResponseRootObject } from "./postInfoResponseType";

const client = axios.create({
  adapter: fetchAdapter,
});

interface Env {
  COOKIE: string;
  XIGAPPID: string;
}

declare const env: Env;

interface getPostInfoResponse {
  username: string;
  caption: string;
  imageUrl: string;
  videoUrl: string;
  likeCount: number;
  commentCount: number;
  pages?: number;
  json: string;
}

const getInfo = async (id: string, env) => {
  return client.get<MediaInfoResponseRootObject>(
    `https://i.instagram.com/api/v1/media/${urlSegmentToInstagramId(id)}/info/`,
    {
      headers: {
        "user-agent": "Instagram 219.0.0.12.117 Android",
        cookie: env.COOKIE,
        "x-ig-app-id": env.XIGAPPID,
      },
    }
  );
};

const clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};

export const getPostInfo = async (
  id: string,
  index: string,
  env
): Promise<getPostInfoResponse> => {
  const currentPage = Number(index) - 1;
  const res = await getInfo(id, env);
  const { data } = res;
  if (data.items.length === 0) throw new Error("No items found");
  const { items } = data;
  const { carousel_media } = items[0];
  const item = items[0];
  let postItem;
  if (
    carousel_media &&
    carousel_media[clamp(currentPage, 0, item.carousel_media.length) ?? 0]
  ) {
    postItem =
      carousel_media[clamp(currentPage, 0, item.carousel_media.length) ?? 0];
  } else {
    postItem = item;
  }
  const {
    caption,
    image_versions2,
    like_count,
    comment_count,
    video_versions,
  } = postItem;

  return {
    username: items[0].user.username,
    caption: caption?.text,
    videoUrl: video_versions?.[0]?.url,
    imageUrl: image_versions2?.candidates?.[0]?.url,
    likeCount: like_count,
    commentCount: comment_count,
    pages: carousel_media?.length,
    json: JSON.stringify(data),
  };
};
