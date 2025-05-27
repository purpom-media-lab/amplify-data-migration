import {
  DynamoDBExportKey,
  ExportContext,
  Migration,
  MigrationContext,
  ModelTransformer,
} from "@purpom-media-lab/amplify-data-migration";

export default class ChangeBookKey_1725285846600 implements Migration {
  readonly name = "change_book_key";
  readonly timestamp = 1725285846600;

  async export(
    context: ExportContext
  ): Promise<Record<string, DynamoDBExportKey>> {
    // Export Book table to S3 bucket with Point-in-Time Recovery
    const key = await context.modelClient.exportModel("Book");
    return { Book: key };
  }

  async run(context: MigrationContext) {
    type OldBook = { id: string; author: string; title: string };
    type NewBook = { author: string; title: string };
    const newKeys: string[] = [];
    const transformer: ModelTransformer<OldBook, NewBook> = async (
      oldModel
    ) => {
      const { id, ...newModel } = oldModel;
      if (newKeys.includes(`${newModel.author}:${newModel.title}`)) {
        // Skip if the same key already exists.
        return null;
      }
      newKeys.push(`${newModel.author}:${newModel.title}`);
      return newModel;
    };
    // Import exported data to new Book table.
    await context.modelClient.runImport("Book", transformer);
  }
}
