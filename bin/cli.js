#!/usr/bin/env node
import { Command } from "commander";
import { compressVideo } from "../src/index.js";
import fs from "fs-extra";
import path from "path";
import { isVideoFile } from "../src/utils/file-utils.js"; // Import new function

const program = new Command();

program
  .version("1.0.0")
  .description("Compresses a video using FFmpeg with minimal quality loss.")
  .argument(
    "<input>",
    'Path to the input video file or "." for current directory.'
  )
  .action(async (input) => {
    try {
      const resolvedPath = path.resolve(input);
      const stats = await fs.stat(resolvedPath);

      if (input === ".") {
        // Process all video files in the current directory
        const files = await fs.readdir(resolvedPath);
        const videoFiles = files.filter(isVideoFile);

        if (videoFiles.length === 0) {
          console.log("No video files found in the current directory.");
          return; // Exit gracefully if no video files
        }

        for (const file of videoFiles) {
          const filePath = path.join(resolvedPath, file); // Full path to each file
          console.log(`Compressing: ${file}`);
          await compressVideo(filePath); // Compress each video file
        }
      } else if (stats.isFile()) {
        // Process a single file (as before)
        await compressVideo(resolvedPath);
      } else {
        console.error(
          'Error: Input must be a video file or "." for the current directory.'
        );
        process.exit(1);
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        console.error("Error: Input file or directory does not exist.");
      } else {
        console.error("An error occurred during compression:", error);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
