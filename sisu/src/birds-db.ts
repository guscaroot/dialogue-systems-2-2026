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
      vectors: {
        dense: {
          size: 384,
          distance: "Cosine"}
      },
      sparse_vectors: {
        bm25: {}
      } 
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
        const text = bird.description
        const embedding = await embed(text);
        return {
          id: bird.species_id,
          vector: {
            dense: embedding,
            bm25: {text, model: "qdrant/bm25"},
          },
          payload: { 
            commonName: bird.common_name.toLowerCase(),
            scientificName: bird.scientific_name.toLowerCase(),
            distribution: bird.countries.map(country => country.toLowerCase()),
            habitat: bird.habitats.map(country => country.toLowerCase()),
            conservationStatus: bird.conservation_status.toLowerCase(),
            description: bird.description.toLowerCase(),
            wikiImageURL: bird.wiki_image_url
          },            
        };
      }),
    );
    await client.upsert(collection, { wait: true, points: points });
    console.log(`Succesfully added ${birdsDB.length} points into collection: ${collection}`);
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

program
  .command("addBirdURLs")
  .description("Add Wikipedia image URLs to existing bird points")
  .argument("<collection>", "collection name")
  .action(async (collection) => {
    await Promise.all(
      birdsDB.map(async (bird) => {
        await client.setPayload(collection, {
          points: [bird.species_id],
          payload: {wikiImageURL: bird.wiki_image_url,},
          wait: true,
        });
      })
    );
    console.log(`Successfully added image URLs for ${birdsDB.length} birds to collection: ${collection}`);
  });

program.parse();