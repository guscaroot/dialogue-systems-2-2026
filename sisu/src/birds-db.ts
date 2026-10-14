#!/usr/bin/env node

import { Command } from "commander";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { Move } from "./types";
import { WHQ } from "./utils";


const client = new QdrantClient({ host: "localhost", port: 6333 });

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1/",
  apiKey: "ollama",
  dangerouslyAllowBrowser: true,
});

const program = new Command();
program.name("npx tsx src/main.ts").description("Qdrant CLI").version("1.0.0");

export type distributionCat =
   | "northern europe" // Sweden, Norway, Finland, Denmark, Iceland and the Baltic countries
   | "non-northern europe" // All remaining European regions
   | "north africa" // Morocco to Egypt
   | "sub-saharan africa" // Africa south of the Sahara
   | "middle-east and western asia" // Anatolia, Caucasus, Levant, Cyprus, Iraq, Iran and Arabian Peninsula
   | "central and south asia" // Central Asian countries and the Indian subcontinent
   | "east asia" // China, Mongolia, Korea and Japan
   | "southeast asia" // Mainland and island Southeast Asia
   | "north america" // Greenland, Canada, the United States, Mexico, Central America and the Caribbean
   | "south america" // All countries and territories in South America, including the Falkland Islands
   | "australia and oceania" //Australia, New Zealand and Pacific islands

export type habitatCat =
    | "forest" // Forest, woodland, coniferous forest, deciduous forest, mixed forest and forest edges
    | "shrubland" // Scrub, shrubland, thickets and shrubby vegetation
    | "grassland" // Grassland, meadows, pastures and open grassy areas
    | "agricultural land" // Farmland, cultivated fields, arable land and agricultural landscapes
    | "urban and suburban" // Gardens, parks, towns, cities and residential areas
    | "freshwater wetlands" // Marshes, swamps, reed beds, bogs and other freshwater wetland habitats
    | "freshwater bodies" // Lakes, ponds, rivers, streams and reservoirs 
    | "coastal and marine" // Seashores, beaches, estuaries, tidal flats, coastal waters and marine environments
    | "tundra and heathland" // Arctic tundra, heathland, moorland and similar open environments
    | "mountains and rocky habitats" // Mountains, cliffs, rocky slopes and other rocky environments
    | "sparsely vegetated terrain" // Bare sand, dunes, gravel flats and other areas with little vegetation, for inland areas only

export type conservationStatusCat =
    | 'critically endangered'
    | 'endangered'
    | 'vulnerable'
    | 'near threatened'
    | 'conservation dependent'
    | 'least concern'

export type sizeCat =
    | 'XS'
    | 'S'
    | 'M'
    | 'L'

export type bird = {
    id: number,
    commonName: string,
    scientificName: string,
    distribution: distributionCat[],
    habitat: habitatCat[],
    size: sizeCat,
    conservationStatus: conservationStatusCat,
    description: string,
};


const eurasianBlueTit: bird = {
    id: 1,
    commonName: "eurasian blue tit",
    scientificName: "cyanistes caeruleus",
    distribution: [
        "northern europe",
        "non-northern europe",
        "middle-east and western asia",
    ],
    habitat: [
        "forest",
        "urban and suburban"
    ],
    size: "XS",
    conservationStatus: 'least concern',
    description: "Usually 10.5–12 cm long, with a wingspan of 17.5–20 cm and a weight of about 11 g. The male has an intensely blue crown, a dark blue line through the eye and around the white cheeks and chin, a white forehead and wing bar, blue nape, wings and tail, and a yellowish-green back. The underparts are mostly sulphur-yellow with a dark line down the abdomen. It has a black bill, bluish-grey legs and dark-brown irises. The male's crown is a brighter, more intense blue than that of the female or chick, particularly under ultraviolet light."
}


const houseSparrow:  bird = {
    id: 2,
    commonName: "house sparrow",
    scientificName: "passer domesticus",
    distribution: [
        "northern europe",
        "non-northern europe",
        "north africa",
        "sub-saharan africa",
        "middle-east and western asia",
        "central and south asia",
        "east asia",
        "north america",
        "south america",
        "australia and oceania"
    ],
    habitat: [
        "urban and suburban",
        "agricultural land",
        "grassland"
    ],
    conservationStatus: "least concern",
    size: "XS",
    description: "Typically about 16 cm long, ranging from 14 to 18 cm, with a wingspan of 19–25 cm and a mass of 24–39.5 g. The house sparrow is a compact bird with a full chest and a large, rounded head. Its bill is stout and conical, and its tail is short. The male has boldly coloured head markings, a reddish-brown back and grey underparts. Its crown is dark grey, with chestnut brown on the sides of the head. It has black around the bill, on the throat and between the bill and eyes, with a small white stripe between the lores and crown and small white spots behind the eyes. The cheeks and underparts are pale grey or white. The upper back and mantle are warm brown with broad black streaks, while the lower back, rump and upper tail coverts are greyish brown. In fresh nonbreeding plumage, the male is duller, with whitish feather tips. The black throat and chest patch, called the bib or badge, becomes more exposed with wear and preening. The male's bill is dark grey, becoming black in the breeding season."
}

const greyHeron: bird = {
    id: 3,
    commonName: "grey heron",
    scientificName: "ardea cinerea",
    distribution: [
        "northern europe",
        "non-northern europe",
        "north africa",
        "sub-saharan africa",
        "middle-east and western asia",
        "central and south asia",
        "east asia",
        "southeast asia"
    ],
    habitat: [
        "freshwater bodies",
        "freshwater wetlands",
        "coastal and marine",
        "grassland",
    ],
    conservationStatus: "least concern",
    size: "L",
    description: "A large, long-legged wading bird standing up to 100 cm tall and measuring 84–102 cm long, with a wingspan of 155–195 cm and a body weight of 1.02–2.08 kg. Its plumage is largely ashy-grey above and greyish-white below, with some black on the flanks. Adults have a white head and neck with a broad black stripe extending from the eye to a slender, dangling crest, and bluish-black streaks on the front of the neck. The scapular feathers and feathers at the base of the neck are somewhat elongated. Its beak is long, straight and powerful, pinkish-yellow and brighter in breeding adults. The iris is yellow and the legs are brown and very long. Immature birds have a grey head stripe, a paler grey face, a smaller dark grey crest and are generally duller in appearance."
};

const greatTit: bird = {
    id: 4,
    commonName: "great tit",
    scientificName: "Parus major",
    distribution: [
        "northern europe",
        "non-northern europe",
        "north africa",
        "middle-east and western asia",
        "central and south asia",
        "east asia"
    ],
    habitat: [
        "forest",
        "urban and suburban",
        "shrubland"
    ],
    conservationStatus: "least concern",
    size: "XS",
    description: "Usually 12.5–14 cm long. The male has a bluish-black crown, black neck, throat, bib and head, with prominent white cheeks and ear coverts. The breast is bright lemon-yellow, with a broad black stripe running down the middle from the bib to the vent. There is a dull white spot on the neck that turns greenish-yellow on the upper nape. The rest of the nape and back are green tinged with olive. The wing-coverts are green, while the rest of the wing is bluish-grey with a white wing-bar. The tail is bluish-grey with white outer tips. The male's plumage is typically bright, although coloration varies among subspecies."
}

export const birdsDB: bird[] = [eurasianBlueTit, houseSparrow, greyHeron, greatTit]


const embed = async (input: string) =>
  openai.embeddings
    .create({
      model: "qwen3-embedding",
      input: input,
      dimensions: 384,
    })
    .then((result) => result.data[0].embedding);

program
  .command("createCollection")
  .description("Create a collection")
  .argument("<name>", "collection name")
  .action(async (name) => {
    await client.createCollection(name, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log(`Succesfully created collection: ${name}`);
  });

program
  .command("addBirdData")
  .description("add data to a collection")
  .argument("<collection>", "collection name")
  .action(async (collection) => {
    const points = await Promise.all(
      birdsDB.map(async (bird) => {
        const embedding = await embed(bird.description);
        return {
          id: bird.id,
          vector: embedding,
          payload: { 
            commonName: bird.commonName,
            scientificName: bird.scientificName,
            distribution: bird.distribution,
            habitat: bird.habitat,
            size: bird.size,
            conservationStatus: bird.conservationStatus,
            description: bird.description},
        };
      }),
    );
    await client.upsert(collection, { wait: true, points: points });
    console.log(
    `Succesfully added ${birdsDB.length} points into collection: ${collection}`,
    );
  });


program
  .command("queryCollection")
  .description("Query the collection")
  .argument("<collection>", "collection name")
  .argument("<query>", "text of the query")
  .action(async (collection, query) => {
    const embedding = await embed(query);
    const results = await client.query(collection, {
      with_payload: true,
      query: embedding,
      limit: 1,
    });
    console.log(results.points);
  });

program.parse();
