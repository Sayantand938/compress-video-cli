#!/usr/bin/env node
import { Command } from "commander";
import { compressVideo } from "../src/index.js";
import { fileExists } from "../src/utils/file-utils.js";

const program = new Command();

program
  .version("1.0.0")
  .description("Compresses a video using FFmpeg with minimal quality loss.")
  .argument("<input>", "Path to the input video file.")
  .action(async (input) => {
    if (!(await fileExists(input))) {
      console.error("Error: Input file does not exist.");
      process.exit(1);
    }
    try {
      await compressVideo(input);
    } catch (error) {
      console.error("An error occurred during compression:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
