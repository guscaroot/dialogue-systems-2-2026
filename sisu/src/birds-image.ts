import { bird } from "./types"

export async function displayBirdImage(identifiedBird: bird): Promise<void> {
  const heading = document.querySelector<HTMLHeadingElement>("#bird-commonName");
  const image = document.querySelector<HTMLImageElement>("#bird-image");
  if (heading) {
    heading.textContent = identifiedBird.commonName;
  }
  if (!image) {
    return
  }
  // Use Wikipedia image as fallback
  let imageUrl = identifiedBird.wikiImageURL;
  try {
    const response = await fetch(
      `https://ornithophile.vercel.app/api/birds?scientific_name=${encodeURIComponent(identifiedBird.scientificName)}`
    );
    if (!response.ok) {
      throw new Error(`[BIRD IMAGE] Ornithophile API error: ${response.status}`);
    }
    const data = await response.json();
    const bird = data?.[0];
    // Use Ornithophile API image when available
    if (bird?.male_image) {
      imageUrl = bird.male_image;
    }
  } catch (error) {
    console.log("[BIRD IMAGE] Ornithophile API failed, falling back to Wikipedia image", error)
  }
  if (imageUrl) {
    if (imageUrl.startsWith("//upload.wikimedia.org")) {
      imageUrl = "https:" + imageUrl;
    }
    image.src = imageUrl;
    image.alt = identifiedBird.commonName
    image.style.display = "block";
  } else {
    console.log("[BIRD IMAGE] No image URL available");
  }
}
