import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCommercialProposalHtml } from "../src/proposals/commercial-proposal-template.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const inputPath = resolve(process.argv[2] || resolve(projectRoot, "examples/commercial-proposal.json"));
const outputPath = resolve(process.argv[3] || resolve(projectRoot, "output/pdf/commercial-proposal.html"));

const raw = await readFile(inputPath, "utf8");
const input = JSON.parse(raw);
const html = renderCommercialProposalHtml(input);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");

console.log(`Commercial proposal HTML generated: ${outputPath}`);

