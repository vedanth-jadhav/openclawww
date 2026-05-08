import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";

export function GET() {
  const manifestPath = "pipeline/downloader/source_manifest.json";
  const samplePath = "pipeline/downloader/source_manifest.sample.json";
  const path = existsSync(manifestPath) ? manifestPath : samplePath;
  const manifest = JSON.parse(readFileSync(path, "utf-8"));
  const downloadLog = existsSync("pipeline/downloader/download_log.json")
    ? JSON.parse(readFileSync("pipeline/downloader/download_log.json", "utf-8"))
    : null;
  const extractionReport = existsSync("pipeline/extracted/extraction_report.json")
    ? JSON.parse(readFileSync("pipeline/extracted/extraction_report.json", "utf-8"))
    : null;

  return NextResponse.json({
    ...manifest,
    activePath: path,
    downloadLog,
    extractionReport
  });
}
