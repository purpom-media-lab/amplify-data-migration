export const createMigrationClassContent = (
  migrationName: string,
  timestamp: number
) => {
  const className = toPascalCase(migrationName);
  return `import {
  DynamoDBExportKey,
  ExportContext,
  Migration,
  MigrationContext,
  ModelTransformer,
} from "@purpom-media-lab/ampify-data-migration";

export default class ${className}_${timestamp} implements Migration {
  readonly name = "${migrationName}";
  readonly timestamp = ${timestamp};

  // You should implement export method if you want to export data from the table.
  // async export(
  //   context: ExportContext
  // ): Promise<Record<string, DynamoDBExportKey>> {
  //   // Export table to S3 bucket with Point-in-Time Recovery
  //   const key = await context.modelClient.exportModel("<Your Model name>");
  //   return { <Your Model name>: key };
  // }

  async run(context: MigrationContext) {
    // type OldModel = {};
    // type NewModel = {};
    // const transformer: ModelTransformer<OldModel, NewModel> = async (
    //   oldModel
    // ) => {
    //   return oldModel;
    // };
    // If you run import exported data to new a table, you can use this code.
    // await context.modelClient.runImport("<Your Model name>", transformer);
    // If you run update table, you can use this code.
    // await context.modelClient.updateTable("<Your Model name>", transformer);
  }
}
`;
};

const toPascalCase = (str: string) =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.map((x: string) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
    ?.join("");
