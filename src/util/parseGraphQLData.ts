import { DataStructure } from "./dataStructure";
import { Data } from "./post";

type ParsedGraphQLData = Omit<DataStructure, "provider">;

export default (graphQLData: Data): ParsedGraphQLData => {
  const { shortcode_media } = graphQLData;

  if (!shortcode_media) {
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

  const extractedImages =
    edge_sidecar_to_children?.edges !== undefined
      ? edge_sidecar_to_children.edges.map((edge) => edge.node.display_url)
      : [shortcode_media.display_url];

  const extractedPages = edge_sidecar_to_children?.edges.map((edge) => ({
    mediaUrl: edge.node.video_url ?? edge.node.display_url,
    isVideo: edge.node.is_video,
    height: edge.node.dimensions.height,
    width: edge.node.dimensions.width
  }));

  return {
    caption,
    username: owner.username,
    imageUrls: extractedImages,
    extractedPages: extractedPages,
    videoUrl: video_url,
    likeCount: edge_media_preview_like?.count,
    commentCount: edge_media_to_comment?.count
  };
};
