import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { getOutputFilePath } from "./utils/file-utils.js";
import { SingleBar, Presets } from "cli-progress";
import { getVideoDuration } from "./utils/video-utils.js";

async function getBestEncoder() {
  // Check for NVENC
  try {
    const nvencTest = spawn(ffmpegPath, [
      "-f",
      "lavfi",
      "-i",
      "nullsrc",
      "-c:v",
      "h264_nvenc",
      "-t",
      "1",
      "-y",
      "NUL",
    ]);
    await new Promise((resolve, reject) => {
      nvencTest.on("close", (code) => (code === 0 ? resolve() : reject()));
    });
    console.log("Using NVENC for hardware acceleration.");
    return { codec: "h264_nvenc", crfParam: "-cq", preset: "p5" };
  } catch (e) {}

  // Check for QSV
  try {
    const qsvTest = spawn(ffmpegPath, [
      "-f",
      "lavfi",
      "-i",
      "nullsrc",
      "-c:v",
      "h264_qsv",
      "-t",
      "1",
      "-y",
      "NUL",
    ]);
    await new Promise((resolve, reject) => {
      qsvTest.on("close", (code) => (code === 0 ? resolve() : reject()));
    });
    console.log("Using QSV for hardware acceleration.");
    return {
      codec: "h264_qsv",
      crfParam: "-global_quality",
      preset: "veryfast",
    };
  } catch (e) {}

  // Check for AMF
  try {
    const amfTest = spawn(ffmpegPath, [
      "-f",
      "lavfi",
      "-i",
      "nullsrc",
      "-c:v",
      "h264_amf",
      "-t",
      "1",
      "-y",
      "NUL",
    ]);
    await new Promise((resolve, reject) => {
      amfTest.on("close", (code) => (code === 0 ? resolve() : reject()));
    });

    console.log("Using AMF for hardware acceleration.");
    return { codec: "h264_amf", crfParam: "-qp", preset: "balanced" };
  } catch (e) {}

  // Fallback to libx264
  console.log("No hardware acceleration available, using libx264.");
  return { codec: "libx264", crfParam: "-crf", preset: "veryfast" };
}

export async function compressVideo(inputFilePath) {
  const outputFilePath = getOutputFilePath(inputFilePath);
  const duration = await getVideoDuration(inputFilePath);
  const encoder = await getBestEncoder();

  return new Promise((resolve, reject) => {
    const progressBar = new SingleBar({}, Presets.shades_classic);
    progressBar.start(100, 0);

    const ffmpegProcess = spawn(ffmpegPath, [
      "-y", // Add the -y option here to overwrite output files
      "-i",
      inputFilePath,
      "-c:v",
      encoder.codec,
      encoder.crfParam,
      "23",
      "-c:a",
      "copy",
      "-preset",
      encoder.preset,
      outputFilePath,
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
      const output = data.toString();
      // console.error(`stderr: ${output}`); // Keep for debugging

      const timeMatch = output.match(/time=([\d:.]+)/);
      if (timeMatch) {
        const timeString = timeMatch[1];
        const [hours, minutes, seconds] = timeString.split(":").map(parseFloat);
        const currentTimeInSeconds = hours * 3600 + minutes * 60 + seconds;

        const progress = Math.min(
          100,
          Math.round((currentTimeInSeconds / duration) * 100)
        );
        progressBar.update(progress);
      }
    });

    ffmpegProcess.on("close", (code) => {
      progressBar.stop();
      if (code === 0) {
        console.log(`Video compressed successfully to: ${outputFilePath}`);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpegProcess.on("error", (err) => {
      progressBar.stop();
      reject(err);
    });
  });
}
