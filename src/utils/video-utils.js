import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import * as ffprobe from "ffprobe-static"; // Import the entire module
import fs from "fs";
import path from "path";

export async function getVideoDuration(inputFilePath) {
  return new Promise((resolve, reject) => {
    let ffprobePath;

    try {
      // Use ffprobe-static's path property if available.
      if (ffprobe.path) {
        ffprobePath = ffprobe.path;
      } else {
        ffprobePath = require
          .resolve("ffprobe-static")
          .replace("index.js", "ffprobe.exe");
      }
    } catch (e) {
      console.warn(
        "ffprobe-static not found or path property unavailable, falling back to ffmpegPath (may not work)."
      );
      ffprobePath = ffmpegPath; // Fallback (less reliable)
    }

    // Check if the fallback path (ffmpegPath) actually contains ffprobe.exe
    if (ffprobePath === ffmpegPath) {
      const ffmpegDir = path.dirname(ffmpegPath);
      const potentialFfprobePath = path.join(ffmpegDir, "ffprobe.exe");
      if (fs.existsSync(potentialFfprobePath)) {
        ffprobePath = potentialFfprobePath;
      } else {
        //Still no ffprobe?  Reject with a clearer error
        return reject(
          new Error(
            "Could not find ffprobe. Please ensure ffprobe-static is installed correctly, or that ffprobe.exe is in the same directory as ffmpeg.exe."
          )
        );
      }
    }

    console.log("ffprobePath:", ffprobePath);

    const ffprobeProcess = spawn(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputFilePath,
    ]);

    let duration = "";

    ffprobeProcess.stdout.on("data", (data) => {
      duration += data.toString();
    });

    ffprobeProcess.on("close", (code) => {
      if (code === 0) {
        const durationInSeconds = parseFloat(duration.trim());
        if (!isNaN(durationInSeconds)) {
          resolve(durationInSeconds);
        } else {
          reject(new Error("Could not parse video duration."));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });

    ffprobeProcess.on("error", (err) => {
      reject(err);
    });
  });
}
