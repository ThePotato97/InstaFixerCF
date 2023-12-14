export interface Post {
    data:       Data;
    extensions: Extensions;
    status:     string;
}

export interface Data {
    shortcode_media: ShortcodeMedia;
}

export interface ShortcodeMedia {
    __typename:                      string;
    id:                              string;
    shortcode:                       string;
    dimensions:                      Dimensions;
    gating_info:                     null;
    fact_check_overall_rating:       null;
    fact_check_information:          null;
    sensitivity_friction_info:       null;
    sharing_friction_info:           SharingFrictionInfo;
    media_overlay_info:              null;
    media_preview:                   null | string;
    display_url:                     string;
    display_resources:               DisplayResource[];
    accessibility_caption?:          null | string;
    dash_info?:                      DashInfo;
    has_audio?:                      boolean;
    video_url?:                      string;
    video_view_count?:               number;
    video_play_count?:               number;
    is_video:                        boolean;
    tracking_token:                  string;
    upcoming_event:                  null;
    edge_media_to_tagged_user:       EdgeMediaToCaptionClass;
    edge_media_to_caption:           EdgeMediaToCaptionClass;
    can_see_insights_as_brand:       boolean;
    caption_is_edited:               boolean;
    has_ranked_comments:             boolean;
    like_and_view_counts_disabled:   boolean;
    edge_media_to_comment:           EdgeMediaToComment;
    comments_disabled:               boolean;
    commenting_disabled_for_viewer:  boolean;
    taken_at_timestamp:              number;
    edge_media_preview_like:         EdgeMediaPreviewLike;
    edge_media_to_sponsor_user:      EdgeMediaToCaptionClass;
    is_affiliate:                    boolean;
    is_paid_partnership:             boolean;
    location:                        null;
    nft_asset_info:                  null;
    viewer_has_liked:                boolean;
    viewer_has_saved:                boolean;
    viewer_has_saved_to_collection:  boolean;
    viewer_in_photo_of_you:          boolean;
    viewer_can_reshare:              boolean;
    owner:                           Owner;
    is_ad:                           boolean;
    edge_web_media_to_related_media: EdgeMediaToCaptionClass;
    coauthor_producers:              any[];
    pinned_for_users:                PinnedForUser[];
    encoding_status?:                null;
    is_published?:                   boolean;
    product_type?:                   string;
    title?:                          string;
    video_duration?:                 number;
    thumbnail_src?:                  string;
    clips_music_attribution_info?:   ClipsMusicAttributionInfo;
    edge_related_profiles:           EdgeMediaToCaptionClass;
    edge_sidecar_to_children?:       EdgeSidecarToChildren;
}

export interface ClipsMusicAttributionInfo {
    artist_name:              string;
    song_name:                string;
    uses_original_audio:      boolean;
    should_mute_audio:        boolean;
    should_mute_audio_reason: string;
    audio_id:                 string;
}

export interface DashInfo {
    is_dash_eligible:    boolean;
    video_dash_manifest: string;
    number_of_qualities: number;
}

export interface Dimensions {
    height: number;
    width:  number;
}

export interface DisplayResource {
    src:           string;
    config_width:  number;
    config_height: number;
}

export interface EdgeMediaPreviewLike {
    count: number;
    edges: EdgeMediaPreviewLikeEdge[];
}

export interface EdgeMediaPreviewLikeEdge {
    node: PinnedForUser;
}

export interface PinnedForUser {
    id:              string;
    is_verified:     boolean;
    profile_pic_url: string;
    username:        string;
}

export interface EdgeMediaToCaptionClass {
    edges: EdgeMediaToCaptionEdge[];
}

export interface EdgeMediaToCaptionEdge {
    node: PurpleNode;
}

export interface PurpleNode {
    created_at: string;
    text:       string;
}

export interface EdgeMediaToComment {
    count:     number;
    page_info: PageInfo;
    edges:     any[];
}

export interface PageInfo {
    has_next_page: boolean;
    end_cursor:    string;
}

export interface EdgeSidecarToChildren {
    edges: EdgeSidecarToChildrenEdge[];
}

export interface EdgeSidecarToChildrenEdge {
    node: FluffyNode;
}

export interface FluffyNode {
    __typename:                string;
    id:                        string;
    shortcode:                 string;
    dimensions:                Dimensions;
    gating_info:               null;
    fact_check_overall_rating: null;
    fact_check_information:    null;
    sensitivity_friction_info: null;
    sharing_friction_info:     SharingFrictionInfo;
    media_overlay_info:        null;
    media_preview:             string;
    display_url:               string;
    display_resources:         DisplayResource[];
    accessibility_caption:     null | string;
    dash_info?:                DashInfo;
    has_audio?:                boolean;
    video_url?:                string;
    video_view_count?:         number;
    video_play_count?:         null;
    is_video:                  boolean;
    tracking_token:            string;
    upcoming_event:            null;
    edge_media_to_tagged_user: EdgeMediaToCaptionClass;
}

export interface SharingFrictionInfo {
    should_have_sharing_friction: boolean;
    bloks_app_url:                null;
}

export interface Owner {
    id:                           string;
    is_verified:                  boolean;
    profile_pic_url:              string;
    username:                     string;
    blocked_by_viewer:            boolean;
    restricted_by_viewer:         boolean;
    followed_by_viewer:           boolean;
    full_name:                    string;
    has_blocked_viewer:           boolean;
    is_embeds_disabled:           boolean;
    is_private:                   boolean;
    is_unpublished:               boolean;
    requested_by_viewer:          boolean;
    pass_tiering_recommendation:  boolean;
    edge_owner_to_timeline_media: EdgeFollowedByClass;
    edge_followed_by:             EdgeFollowedByClass;
}

export interface EdgeFollowedByClass {
    count: number;
}

export interface Extensions {
    is_final: boolean;
}
