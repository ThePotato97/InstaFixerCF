async function parseGQLData(postID) {
    const url = new URL("https://www.instagram.com/graphql/query/");
    url.searchParams.append("query_hash", "b3055c01b4b222b8a47dc12b090e4e64");
    url.searchParams.append("variables", JSON.stringify({ shortcode: postID }));

    const headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "close",
        "Sec-Fetch-Mode": "navigate",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Referer": `https://www.instagram.com/p/${postID}/`
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

console.log(await parseGQLData("Cv7eRvhJXi2"))