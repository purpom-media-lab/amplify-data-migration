import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { createMigrationClassContent } from "../../create/create_migration_file_content.js";

type CreateCommandOptionsCamelCase = {
  migrationsDir: string;
  name: string;
};

/**
 * Represents the CreateCommand class.
 */
export class CreateCommand
  implements CommandModule<object, CreateCommandOptionsCamelCase>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates top level entry point for generate command.
   */
  constructor() {
    this.command = "create";
    this.describe = "Create a migration file.";
  }

  /**
   * @inheritDoc
   */
  async handler(args: ArgumentsCamelCase<CreateCommandOptionsCamelCase>) {
    const { migrationsDir, name } = args;
    const timestamp = Date.now();
    const fileContent = createMigrationClassContent(name, timestamp);
    await fsp.writeFile(
      path.join(migrationsDir, `${timestamp}_${name}.ts`),
      fileContent,
      "utf-8"
    );
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<CreateCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("migrationsDir", {
        describe: "Path to migration files directory",
        demandOption: true,
        type: "string",
        array: false,
      })
      .option("name", {
        describe: "Name of the migration file",
        demandOption: true,
        type: "string",
        array: false,
      });
  }
}
