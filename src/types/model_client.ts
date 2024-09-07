import type { AttributeValue } from "@aws-sdk/client-dynamodb";

/**
 * データマイグレーションでのデータの変換を行う関数
 */
export interface ModelTransformer<
  OldModel extends {} = {},
  NewModel extends {} = {}
> {
  (oldModel: OldModel): Promise<NewModel>;
}

/**
 * データマイグレーションで実際にデータを変更する処理を提供するクラスです。
 * ModelClientが提供する機能以外で必要なマイグレーション処理はAWS SDKを直接利用して実装してください。
 */
export interface ModelClient {
  /**
   * 指定したモデルのレコードを更新します。
   * @param modelName モデル名
   * @param transformer フィールドの値を変換する
   * @param options オプション
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
   * exportされたモデル（テーブル）のデータをインポートします。
   * @param modelName モデル名
   * @param transformer モデルを変換する
   * @param options オプション
   */
  runImport(modelName: string, transformer: ModelTransformer): Promise<void>;
}
