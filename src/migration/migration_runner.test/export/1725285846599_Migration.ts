import { DynamoDBExportKey } from "../../../export/types/dynamodb_table_exporter.js";
import {
  ExportContext,
  Migration,
  MigrationContext,
  ModelTransformer,
} from "../../../types/index.js";

export default class Migration1 implements Migration {
  name = "migration_export_1";
  timestamp = 1725285846599;

  async export(
    context: ExportContext
  ): Promise<Record<string, DynamoDBExportKey>> {
    return { Todo: await context.modelClient.exportModel("Todo") };
  }

  async run(context: MigrationContext) {}
}
