import fs from "fs-extra";

export async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export function getOutputFilePath(inputFilePath) {
  const lastDotIndex = inputFilePath.lastIndexOf(".");
  const name = inputFilePath.substring(0, lastDotIndex);
  const extension = inputFilePath.substring(lastDotIndex + 1);
  return `${name}_compressed.${extension}`;
}
