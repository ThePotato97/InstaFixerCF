import axios from 'axios';
import fetchAdapter from '@haverstack/axios-fetch-adapter';
import { urlSegmentToInstagramId } from 'instagram-id-to-url-segment';
import { MediaInfoResponseRootObject } from './postInfoResponseType';

const client = axios.create({
  adapter: fetchAdapter,
});

interface Env {
  COOKIE: string;
  XIGAPPID: string;
}

interface GetPostInfoResponse {
  username: string;
  caption: string;
  imageUrls: string[];
  videoUrl: string;
  likeCount: number;
  commentCount: number;
  playCount: number;
  pages?: number;
  json: string;
}

const getInfo = async (id: string, env: Env) => client.get<MediaInfoResponseRootObject>(
  `https://i.instagram.com/api/v1/media/${urlSegmentToInstagramId(id)}/info/`,
  {
    headers: {
      'user-agent': 'Instagram 219.0.0.12.117 Android',
      cookie: env.COOKIE,
      'x-ig-app-id': env.XIGAPPID,
    },
  },
);

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export default async (
  id: string,
  index: string,
  env: Env,
): Promise<GetPostInfoResponse> => {
  const currentPage = Number(index) - 1;
  const res = await getInfo(id, env);
  const { data } = res;
  if (data.items.length === 0) throw new Error('No items found');
  const { items } = data;
  const { carousel_media: carouselMedia } = items[0];

  const item = items[0];
  let postItem;
  if (
    carouselMedia
    && carouselMedia[clamp(currentPage, 0, item.carousel_media.length) ?? 0]
  ) {
    postItem = carouselMedia[clamp(currentPage, 0, item.carousel_media.length) ?? 0];
  } else {
    postItem = item;
  }
  const imageUrls = carouselMedia
    ?.map((media) => media.image_versions2?.candidates?.[0]?.url)
    .filter(Boolean);
  const { caption, like_count: likeCount, comment_count: commentCount } = item;
  const {
    image_versions2: imageVersions2,
    play_count: playCount,
    video_versions: videoVersions,
  } = postItem;
  console.log('item', postItem);
  return {
    username: items[0].user.username,
    caption: caption?.text,
    videoUrl: videoVersions?.[0]?.url,
    imageUrls: index
      ? [postItem.image_versions2?.candidates?.[0]?.url]
      : imageUrls ?? [imageVersions2?.candidates?.[0]?.url],
    likeCount,
    commentCount,
    playCount,
    pages: carouselMedia?.length,
    json: JSON.stringify(data),
  };
};
