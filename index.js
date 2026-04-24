const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

app.get("/analyze", async (req, res) => {
  const url = req.query.url;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $("title").text();

    const meta = $('meta[name="description"]').attr("content") || "";

    const h1 = $("h1").map((i, el) => $(el).text().trim()).get();
    const h2 = $("h2").map((i, el) => $(el).text().trim()).get();
    const h3 = $("h3").map((i, el) => $(el).text().trim()).get();

   const images = $("img")
  .map((i, el) => ({
    src: $(el).attr("src"),
    alt: $(el).attr("alt") || null
  }))
  .get();

const keywords = extractKeywords($);

function cleanText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëîïôöùûüç]/gi, "")
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function extractKeywords($) {
  const scores = {};

  function add(text, weight) {
    const words = cleanText(text);
    words.forEach(word => {
      scores[word] = (scores[word] || 0) + weight;
    });
  }

  add($("title").text(), 5);

  $("h1").each((i, el) => add($(el).text(), 4));
  $("h2").each((i, el) => add($(el).text(), 3));
  $("h3").each((i, el) => add($(el).text(), 2));
  $("p").each((i, el) => add($(el).text(), 1));

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, score]) => ({ word, score }));
}

const alerts = [];

// H1
if (h1.length === 0) {
  alerts.push("❌ Pas de H1");
}
if (h1.length > 1) {
  alerts.push("⚠️ Plusieurs H1");
}

// Meta description
if (!meta) {
  alerts.push("❌ Meta description absente");
}

// Images ALT
const imagesWithoutAlt = images.filter(img => !img.alt);
if (imagesWithoutAlt.length > 0) {
  alerts.push(`⚠️ ${imagesWithoutAlt.length} image(s) sans ALT`);
}

 res.json({
      title,
      meta,
      h1,
      h2,
      h3,
images,
alerts,
keywords
    });

  } catch (error) {
    res.status(500).json({ error: "Erreur récupération page" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé");
});