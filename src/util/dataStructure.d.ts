export interface DataStructure {
    caption: string;
    username: string;
    imageUrls: string[];
    extractedPages: {
        mediaUrl: string;
        isVideo: boolean;
    }[];
    videoUrl: string;
    likeCount: number;
    commentCount: number;
    provider: string;
}