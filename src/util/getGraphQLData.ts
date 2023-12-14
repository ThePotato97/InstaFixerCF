import { DataStructure } from "./dataStructure";
import fetchWrapper from "./fetchWrapper";
import { Post } from "./post";
/**
 * 
 * @param postId The post id to fetch data for.
 * @returns The post data.
 */
const getGraphQLData = async (postId: string): Promise<Post> => {
  const url = new URL("https://www.instagram.com/graphql/query/");
  url.searchParams.append("query_hash", "b3055c01b4b222b8a47dc12b090e4e64");
  url.searchParams.append("variables", JSON.stringify({ shortcode: postId }));

  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    Connection: "close",
    "Sec-Fetch-Mode": "navigate",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    Referer: `https://www.instagram.com/p/${postId}/`
  };

    
  try {
    const response = await fetch(url, { headers });

    const cacheStatus = response.headers.get("CF-Cache-Status");
    console.log(`Cache status: ${cacheStatus}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}  ${JSON.stringify(await response.json())}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export default async (event: FetchEvent, postId: string): Promise<DataStructure> => {
  const cache = caches.default;
  const cacheKey = new Request(`https://www.instagram.com/p/${postId}/gql`);
  let res = await cache.match(cacheKey);
  if (res) {
    console.log("GQL cache hit");
    return await res.json();
  }
  const graphQLResponse = await getGraphQLData(postId);
  const { data } = graphQLResponse;
  const { shortcode_media } = data;
  if (!shortcode_media) {
    console.error("Invalid shortcode_media", graphQLResponse);
    throw new Error("Invalid shortcode_media");
  }
  const {
    edge_sidecar_to_children,
    edge_media_to_caption,
    edge_media_to_comment,
    edge_media_preview_like,
    video_url,
    owner
  } = shortcode_media;

  const caption = edge_media_to_caption?.edges[0]?.node.text;

  const extractedImages = edge_sidecar_to_children?.edges !== undefined
    ? edge_sidecar_to_children.edges.map((edge) => edge.node.display_url)
    : [shortcode_media.display_url];

  const extractedPages = edge_sidecar_to_children?.edges.map((edge) => ({
    mediaUrl: edge.node.video_url ?? edge.node.display_url,
    isVideo: edge.node.is_video,
    height: edge.node.dimensions.height,
    width: edge.node.dimensions.width
  }));
  const extractedData = {
    caption,
    username: owner.username,
    imageUrls: extractedImages,
    extractedPages: extractedPages,
    videoUrl: video_url,
    likeCount: edge_media_preview_like.count,
    commentCount: edge_media_to_comment.count,
    provider: "GQL",
  };
  const response = new Response(JSON.stringify(extractedData), {
    headers: { "content-type": "application/json", "Cache-Control": "s-maxage=86400"}
  });
  console.log("GQL cache miss");
  event.waitUntil(cache.put(cacheKey, response.clone()));
  return extractedData
};
