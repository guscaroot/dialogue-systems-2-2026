#!/usr/bin/env node

import { Command } from "commander";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { Move } from "./types";
import { WHQ } from "./utils";
import { bird, birdsDB } from "./birds-database"

const client = new QdrantClient({ host: "localhost", port: 6333 });

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1/",
  apiKey: "ollama",
  dangerouslyAllowBrowser: true,
});

const program = new Command();
program.name("npx tsx src/main.ts").description("Qdrant CLI").version("1.0.0");




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
            speciesname: bird.speciesname,
            scientificname: bird.scientificname,
            location: bird.location,
            habitat: bird.habitat,
            size: bird.size,
            status: bird.status,
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
