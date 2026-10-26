#!/usr/bin/env node

import { Command } from "commander";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import birdsDB from "..//birds.json"

const client = new QdrantClient({ host: "localhost", port: 6333 });

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1/",
  apiKey: "ollama",
  dangerouslyAllowBrowser: true,
});

const program = new Command();
program.name("npx tsx src/birds-db.ts").description("Qdrant CLI").version("1.0.0");


const instruction = 
  "Represent the following bird description for fine-grained bird identification. Emphasize distinctive characteristics that differentiate this species from other bird species. De-emphasize generic characteristics shared by most birds."

  
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
        const text = `${instruction}\nBird description: ${bird.description}`
        const embedding = await embed(bird.description);
        return {
          id: bird.species_id,
          vector: embedding,
          payload: { 
            commonName: bird.common_name.toLowerCase(),
            scientificName: bird.scientific_name.toLowerCase(),
            distribution: bird.countries.map(country => country.toLowerCase()),
            habitat: bird.habitats.map(country => country.toLowerCase()),
            conservationStatus: bird.conservation_status.toLowerCase(),
            description: bird.description.toLowerCase()},
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





const buildBird = async (url: string) => {
  const prompt = `
Based only on the following Wikipedia article, generate a bird object.
Return only a valid JSON object, with no explanation or markdown.

Wikipedia article URL: ${url}

The object must follow this structure:
{
  "id": uuidv4(),
  "commonName": "string",
  "scientificName": "string",
  "distribution": [],
  "habitat": [],
  "size": "string",
  "conservationStatus": "string",
  "description": "string"
}

Allowed distribution values:
 - "northern europe" // to use only for Sweden, Norway, Finland, Denmark, Iceland and the Baltic countries
 - "non-northern europe" // to use only for all remaining European regions
 - "north africa" // to use only for Morocco to Egypt
 - "sub-saharan africa" // to use only for Africa south of the Sahara
 - "middle-east and western asia" // to use only for Anatolia, Caucasus, Levant, Cyprus, Iraq, Iran and Arabian Peninsula
 - "central and south asia" // to use only for Central Asian countries and the Indian subcontinent
 - "east asia" // to use only for China, Mongolia, Korea and Japan
 - "southeast asia" // to use only for Mainland and island Southeast Asia
 - "north america" // to use only for Greenland, Canada, the United States, Mexico, Central America and the Caribbean
 - "south america" // to use only for all countries and territories in South America, including the Falkland Islands
 - "australia and oceania" // to use only for Australia, New Zealand and Pacific islands

Allowed habitat values:
 - "forest" // to use for forest, woods, woodland, forest edges and similar
 - "shrubland" // to use for scrub, shrubland, thickets, shrubby vegetation and similar
 - "grassland" // to use for grassland, meadows, pastures, open grassy areas and similar
 - "agricultural land" // to use for farmland, cultivated fields, arable land, agricultural landscapes and similar
 - "urban and suburban" // to use for gardens, parks, towns, cities, residential areas and similar
 - "freshwater wetlands" // to use for marshes, swamps, reed beds, bogs and other freshwater wetland
 - "freshwater bodies" // to use for lakes, ponds, rivers, streams, reservoirs and other freshwater bodies
 - "coastal and marine" // to use for seashores, beaches, estuaries, tidal flats, coastal waters and marine environments
 - "tundra and heathland" // to use for arctic tundra, heathland, moorland and similar open environments
 - "mountains and rocky habitats" // to use for mountains, cliffs, rocky slopes and other rocky environments
 - "sparsely vegetated terrain" // to use for bare sand, dunes, gravel flats and other areas with little vegetation, for inland areas only

Allowed size values:
 - 'XS' // approximately size of sparrow, tit
 - 'S' // approximately size of blackbird, starling, dove
 - 'M' // approximately size of pigeon, crow, mallard, buzzard
 - 'L' // approximately size of heron, swan, stork

Allowed conservation status values:
 - "critically endangered"
 - "endangered"
 - "vulnerable"
 - "near threatened"
 - "conservation dependent"
 - "least concern"

Use only allowed values for distribution, habitat, size, and conservation status. Omit vagrancy records from distribution.
For the description field, describe the adult male only, from the subspecies found in Sweden if any, without mentioning it is male or subspecies. Use only the "Description" section of the Wikipedia article. Include every explicitly documented visible physical characteristic of the adult male. Include size, colors, markings, plumage patterns, bill, eyes, legs, wings, and tail when described in the source. Do not include habitat, distribution, behavior, diet, or other information. Do not infer or add traits that are not explicitly stated in that section. If a trait is not described there, omit it.
Use only lowercase, except for the size values.
`
  const result = await openai.chat.completions
  .create({
        messages:[{ role:  "user" , content: prompt }],
        model:'llama3.1:latest',
        temperature: 0.2,
        response_format: { type: "json_object" },
      })
  
  return JSON.parse(result.choices[0].message.content!)
}

program
  .command("buildBird")
  .description("Build a bird object from a url")
  .argument("<url>", "url link to wikipedia article")
  .action(async (url) => {
    const result = await buildBird(url)
    console.log(result);
  });

program.parse();