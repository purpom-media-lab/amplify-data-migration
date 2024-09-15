import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import type { DynamoDBExportKey } from "./dynamodb_export_key.js";

/**
 * A function that converts data in data migration.
 * This function is used to convert the data of the old model to the data of the new model.
 *
 * @typeParam OldModel - The type of the old model
 * @typeParam NewModel - The type of the new model
 * @returns The new model or null. If null is returned, the record will be deleted.
 */
export interface ModelTransformer<
  OldModel extends {} = {},
  NewModel extends {} = {}
> {
  (oldModel: OldModel): Promise<NewModel | null>;
}

/**
 * This is a interface that provides processing to actually change data by data migration.
 *
 * @remarks
 * Any migration processing required other than the functionality provided by ModelClient should be implemented directly using the AWS SDK.
 */
export interface ModelClient {
  /**
   * Update the record of the specified model.
   *
   * @param modelName - Model name
   * @param transformer - function to convert the value of the field
   * @param options - option
   */
  updateModel(
    modelName: string,
    transformer: ModelTransformer<any, any>,
    options?: {
      filter?: {
        expression: string;
        attributeValues?: Record<string, AttributeValue>;
        attributeNames?: Record<string, string>;
      };
    }
  ): Promise<void>;

  /**
   * Export the data of the specified model (table).
   *
   * The exported data can be imported using the runImport method.
   *
   * @param modelName - Model name
   * @returns The key to the exported data
   */
  exportModel(modelName: string): Promise<DynamoDBExportKey>;

  /**
   * Import the data of the specified model (table).
   * The data to be imported must be exported using the exportModel method.
   * The data is transformed by the transformer function before being imported.
   * If the transformer function returns null, the record will be deleted.
   * If the transformer function returns a value, the record will be updated with the returned value.
   * If the transformer function throws an error, the import process will be aborted.
   * If the import process is aborted, the data may be partially imported.
   *
   * @param modelName - Model name
   * @param transformer - function to convert the value of the field
   * @param options - option
   */
  runImport(
    modelName: string,
    transformer: ModelTransformer<any, any>
  ): Promise<void>;
}
