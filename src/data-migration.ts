#!/usr/bin/env node
import yargs, { Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { createInitCommand } from "./commands/init/index.js";
import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { fileURLToPath } from "node:url";

const packageJson = JSON.parse(
  await fsp.readFile(
    fileURLToPath(new URL("../package.json", import.meta.url)),
    "utf-8"
  )
);
const libraryVersion = packageJson.version;

/**
 * Creates main parser.
 */
export const createMainParser = (libraryVersion: string): Argv => {
  const parser = yargs()
    .version(libraryVersion)
    .strict()
    .scriptName(path.parse(process.argv[1]).name)
    .command(createInitCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands()
    .fail(false);

  return parser;
};

const parser = createMainParser(libraryVersion);

try {
  await parser.parseAsync(hideBin(process.argv));
} catch (e) {
  console.error(e);
  process.exit(1);
}
