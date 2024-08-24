import type { ExportContext, MigrationContext } from "./context.js";

export interface Migration {
  /**
   * run関数でマイグレーションを実行する際に利用するエクスポートデータを作成します。
   * DynamnoDBテーブルのキーが変更される場合にはDynamoDBテーブルがreplaceされるので、
   * この関数でデータをエクスポートしておき、run関数でそれを利用して新しいテーブルにデータをインポートします。
   * この関数はDynamoDBに変更が加えられる前（デプロイ前）に実行されます。
   *
   * @return モデル名を属性名としてエクスポートされたデータのS3キーを値とするオブジェクト
   */
  export(context: ExportContext): Promise<Record<string, string>>;
  /**
   * データのマイグレーションを実行します。
   * export関数でスキーマ変更前のテーブルデータをエクスポートしている場合は、そのデータを利用することもできます。
   */
  run(context: MigrationContext): Promise<void>;
}
