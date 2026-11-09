const https = require("https");
const fs = require("fs");
const path = require("path");

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseFeed(xml, defaultArtist, defaultCategoryLabel, coverUrl, showTag) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches.slice(0, 20)) {
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
    const audioMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"/);
    const durationMatch = itemXml.match(/<itunes:duration>(.*?)<\/itunes:duration>/);
    const imageMatch = itemXml.match(/<itunes:image[^>]*href="([^"]+)"/);

    if (titleMatch && audioMatch) {
      const title = titleMatch[1].trim();
      const audioUrl = audioMatch[1].trim();
      let durationSec = 1200;
      if (durationMatch) {
        const parts = durationMatch[1].trim().split(":").map(Number);
        if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
      }

      const img = imageMatch ? imageMatch[1].trim() : coverUrl;

      items.push({
        title,
        artist: defaultArtist,
        category: "podcast",
        categoryLabel: defaultCategoryLabel,
        durationSec,
        audioUrl,
        streamUrl: audioUrl,
        streamsCount: "Podcast Episode",
        tiktokUsage: "Podcast",
        tags: ["#podcast", `#${showTag}`, "#podcastindo", "#komedi"],
        coverImage: img,
        coverGradient: "from-amber-600 via-orange-600 to-purple-700",
        accentColor: "#f59e0b",
        verifiedOriginal: true
      });
    }
  }
  return items;
}

(async () => {
  try {
    console.log("Fetching GJLS RSS...");
    const gjlsXml = await fetchXml("https://anchor.fm/s/2c478df4/podcast/rss");
    const gjlsEpisodes = parseFeed(
      gjlsXml,
      "Podcast GJLS (Rigen, Rispo, Hifdzi)",
      "Podcast GJLS",
      "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/7328869/7328869-1721389864054-07bbed34b0133.jpg",
      "gjls"
    );

    console.log("Fetching Mendoan RSS...");
    const mendoanXml = await fetchXml("https://anchor.fm/s/e05e0fc/podcast/rss");
    const mendoanEpisodes = parseFeed(
      mendoanXml,
      "Podcast MENDOAN (Dono & Tian)",
      "Podcast Mendoan",
      "https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/2252663/2252663-1719541818945-beb7bce0dd537.jpg",
      "mendoan"
    );

    const allPodcasts = [...gjlsEpisodes, ...mendoanEpisodes].map((item, idx) => ({
      id: `podcast-${idx + 1}`,
      ...item,
      rank: idx + 1
    }));

    console.log(`Parsed ${allPodcasts.length} podcast episodes total.`);

    const targets = [
      path.resolve(__dirname, "../../frontend-v2/public/audio/tiktok/tracks.json"),
      path.resolve(__dirname, "../public/tracks.json")
    ];

    for (const target of targets) {
      if (fs.existsSync(target)) {
        const raw = fs.readFileSync(target, "utf8");
        const json = JSON.parse(raw);
        json.tracks = json.tracks.filter(t => t.category !== "podcast");
        json.tracks = [...allPodcasts, ...json.tracks];
        json.totalTracks = json.tracks.length;
        json.lastUpdated = new Date().toISOString();
        fs.writeFileSync(target, JSON.stringify(json, null, 2), "utf8");
        console.log(`Updated ${target} with ${allPodcasts.length} podcast episodes.`);
      }
    }
  } catch (err) {
    console.error("Error updating podcasts:", err);
  }
})();
