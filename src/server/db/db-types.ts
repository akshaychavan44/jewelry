import type { ModelDelegate } from "./model-delegate";
import type { DatabaseModels } from "./model-types";

export type NeonDbClient = {
  [Model in keyof DatabaseModels as Uncapitalize<Model>]: ModelDelegate<Model>;
} & {
  $queryRaw<T = unknown>(stringsOrSql: TemplateStringsArray | string, ...values: unknown[]): Promise<T>;
  $executeRaw(stringsOrSql: TemplateStringsArray | string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(sql: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (tx: NeonDbClient) => Promise<T>): Promise<T>;
  $disconnect(): Promise<void>;
};
