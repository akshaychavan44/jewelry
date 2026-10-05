/**
 * Neon Database Client & Query Engine for PostgreSQL.
 * Powers all marketplace queries and transactions using @neondatabase/serverless.
 */

import { Pool, neon } from "@neondatabase/serverless";
import { SCHEMA_META, type ModelMeta } from "./schema-meta";
import { ModelDelegate, type SqlExecutor } from "./model-delegate";

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function createNeonDbClient(connectionString?: string) {
  const connStr = connectionString || process.env.DATABASE_URL || "";
  let pool: Pool | null = null;

  function getPool(): Pool {
    if (!pool) {
      if (!connStr) {
        throw new Error("DATABASE_URL is not configured. Please set DATABASE_URL in your .env file.");
      }
      pool = new Pool({
        connectionString: connStr,
        max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      });
    }
    return pool;
  }

  const baseExecutor: SqlExecutor = {
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
      const p = getPool();
      const res = await p.query(sql, params as any[]);
      return (res.rows ?? []) as R[];
    },
  };

  function buildDbInstance(executor: SqlExecutor) {
    const delegates: Record<string, ModelDelegate> = {};

    function getDelegate(name: string): ModelDelegate {
      const modelMeta = SCHEMA_META[name];
      if (!modelMeta) throw new Error(`Unknown model: ${name}`);
      const camel = toCamelCase(name);
      if (!delegates[camel]) {
        delegates[camel] = new ModelDelegate(name, modelMeta, executor, getDelegate);
      }
      return delegates[camel];
    }

    const dbInstance: Record<string, any> = {
      $queryRaw: async <T = unknown>(stringsOrSql: TemplateStringsArray | string, ...values: unknown[]): Promise<T> => {
        let sqlText = "";
        let params: unknown[] = [];

        if (Array.isArray(stringsOrSql) && "raw" in stringsOrSql) {
          // Tagged template literal
          const strings = stringsOrSql as TemplateStringsArray;
          sqlText = strings[0] ?? "";
          for (let i = 0; i < values.length; i++) {
            params.push(values[i]);
            sqlText += `$${params.length}` + (strings[i + 1] ?? "");
          }
        } else {
          sqlText = String(stringsOrSql);
          params = values;
        }

        const rows = await executor.query(sqlText, params);
        return rows as T;
      },

      $executeRaw: async (stringsOrSql: TemplateStringsArray | string, ...values: unknown[]): Promise<number> => {
        let sqlText = "";
        let params: unknown[] = [];

        if (Array.isArray(stringsOrSql) && "raw" in stringsOrSql) {
          const strings = stringsOrSql as TemplateStringsArray;
          sqlText = strings[0] ?? "";
          for (let i = 0; i < values.length; i++) {
            params.push(values[i]);
            sqlText += `$${params.length}` + (strings[i + 1] ?? "");
          }
        } else {
          sqlText = String(stringsOrSql);
          params = values;
        }

        const rows = await executor.query(sqlText, params);
        return rows.length;
      },

      $queryRawUnsafe: async <T = unknown>(sql: string, ...values: unknown[]): Promise<T> => {
        const rows = await executor.query(sql, values);
        return rows as T;
      },

      $executeRawUnsafe: async (sql: string, ...values: unknown[]): Promise<number> => {
        const rows = await executor.query(sql, values);
        return rows.length;
      },

      $transaction: async <T>(
        fnOrArray: ((tx: any) => Promise<T>) | Promise<unknown>[]
      ): Promise<T> => {
        if (Array.isArray(fnOrArray)) {
          return Promise.all(fnOrArray) as unknown as T;
        }

        const p = getPool();
        const client = await p.connect();
        try {
          await client.query("BEGIN");

          const txExecutor: SqlExecutor = {
            async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
              const res = await client.query(sql, params as any[]);
              return (res.rows ?? []) as R[];
            },
          };

          const txDb = buildDbInstance(txExecutor);
          const result = await fnOrArray(txDb);
          await client.query("COMMIT");
          return result;
        } catch (err) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // ignore rollback error
          }
          throw err;
        } finally {
          client.release();
        }
      },
    };

    // Instantiate all model delegates
    for (const [modelName, meta] of Object.entries(SCHEMA_META)) {
      const camel = toCamelCase(modelName);
      dbInstance[camel] = new ModelDelegate(modelName, meta, executor, getDelegate);
    }

    return dbInstance;
  }

  return buildDbInstance(baseExecutor);
}
