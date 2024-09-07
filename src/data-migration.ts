#!/usr/bin/env node
import yargs, { Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import * as path from "node:path";
import * as fsp from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createInitCommand } from "./commands/init/index.js";
import { createDestroyCommand } from "./commands/destroy/index.js";
import { createMigrateCommand } from "./commands/migrate/index.js";
import { createExportCommand } from "./commands/export/index.js";

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
    .command(createDestroyCommand())
    .command(createMigrateCommand())
    .command(createExportCommand())
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
