/**
 * Generic Neon Model Delegate.
 * Implements CRUD, relations, aggregates, transactions, and JSON/array mappings over Neon PostgreSQL.
 */

import { randomUUID } from "node:crypto";
import {
  SCHEMA_META,
  type ModelMeta,
  type RelationMeta,
} from "./schema-meta";
import {
  createParamCollector,
  escapeIdentifier,
  buildWhereClause,
  buildOrderByClause,
  normalizeRow,
  serializeValue,
} from "./query-builder";

export interface SqlExecutor {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<R[]>;
}

function generateId(): string {
  return "c" + randomUUID().replace(/-/g, "").slice(0, 24);
}

export class ModelDelegate<TModel extends Record<string, unknown> = Record<string, unknown>> {
  constructor(
    public readonly modelName: string,
    public readonly meta: ModelMeta,
    private readonly executor: SqlExecutor,
    private readonly getDelegate: (name: string) => ModelDelegate
  ) {}

  async findMany(args: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: unknown;
    take?: number;
    skip?: number;
    distinct?: string[];
  } = {}): Promise<TModel[]> {
    const collector = createParamCollector();
    const whereSql = buildWhereClause(args.where, this.meta, collector);
    const orderSql = buildOrderByClause(args.orderBy);

    let sql = `SELECT * FROM ${escapeIdentifier(this.meta.table)}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;
    if (orderSql) sql += ` ${orderSql}`;
    if (args.take !== undefined) sql += ` LIMIT ${Number(args.take)}`;
    if (args.skip !== undefined) sql += ` OFFSET ${Number(args.skip)}`;

    const rawRows = await this.executor.query<Record<string, unknown>>(sql, collector.params);
    const rows = rawRows.map((r) => normalizeRow(r, this.meta));

    // Handle include / select relations
    if (args.include || args.select) {
      await this.resolveRelations(rows, args.include ?? args.select, Boolean(args.select));
    }

    return rows as TModel[];
  }

  async findFirst(args: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: unknown;
    skip?: number;
  } = {}): Promise<TModel | null> {
    const list = await this.findMany({ ...args, take: 1 });
    return list[0] ?? null;
  }

  async findFirstOrThrow(args: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: unknown;
  } = {}): Promise<TModel> {
    const row = await this.findFirst(args);
    if (!row) throw new Error(`No ${this.modelName} found matching query.`);
    return row;
  }

  async findUnique(args: {
    where: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TModel | null> {
    return this.findFirst(args);
  }

  async findUniqueOrThrow(args: {
    where: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TModel> {
    const row = await this.findUnique(args);
    if (!row) throw new Error(`No ${this.modelName} found with given unique identifier.`);
    return row;
  }

  async create(args: {
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TModel> {
    const data = { ...args.data };
    if (!data[this.meta.primaryKey] && this.meta.primaryKey === "id") {
      data.id = generateId();
    }
    if ("createdAt" in data === false) {
      data.createdAt = new Date();
    }
    if ("updatedAt" in data === false) {
      data.updatedAt = new Date();
    }

    // Separate direct scalar columns from nested relations
    const columns: string[] = [];
    const placeholders: string[] = [];
    const collector = createParamCollector();
    const deferredRelations: Array<() => Promise<void>> = [];

    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;

      const rel = this.meta.relations[key];
      if (rel) {
        if (typeof val === "object" && val !== null) {
          const nested = val as Record<string, unknown>;
          if ("create" in nested && nested.create) {
            deferredRelations.push(async () => {
              const targetDelegate = this.getDelegate(rel.model);
              if (Array.isArray(nested.create)) {
                for (const item of nested.create) {
                  await targetDelegate.create({
                    data: { ...item, [rel.foreignKey]: data[this.meta.primaryKey] },
                  });
                }
              } else {
                await targetDelegate.create({
                  data: {
                    ...(nested.create as Record<string, unknown>),
                    [rel.foreignKey]: data[this.meta.primaryKey],
                  },
                });
              }
            });
          }
        }
        continue;
      }

      columns.push(escapeIdentifier(key));
      placeholders.push(collector.add(serializeValue(val, key, this.meta)));
    }

    const sql = `INSERT INTO ${escapeIdentifier(this.meta.table)} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const rows = await this.executor.query<Record<string, unknown>>(sql, collector.params);
    const created = normalizeRow(rows[0], this.meta);

    for (const action of deferredRelations) {
      await action();
    }

    if (args.include || args.select) {
      await this.resolveRelations([created], args.include ?? args.select, Boolean(args.select));
    }

    return created as TModel;
  }

  async createMany(args: {
    data: Record<string, unknown>[];
    skipDuplicates?: boolean;
  }): Promise<{ count: number }> {
    if (!args.data || args.data.length === 0) return { count: 0 };

    let count = 0;
    for (const item of args.data) {
      try {
        await this.create({ data: item });
        count++;
      } catch (err) {
        if (!args.skipDuplicates) throw err;
      }
    }
    return { count };
  }

  async update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TModel> {
    const existing = await this.findFirst({ where: args.where });
    if (!existing) {
      throw new Error(`Record to update not found in ${this.modelName}`);
    }

    const pkVal = existing[this.meta.primaryKey];
    const collector = createParamCollector();
    const setClauses: string[] = [];

    const data = { ...args.data };
    if ("updatedAt" in data === false && "updatedAt" in existing) {
      data.updatedAt = new Date();
    }

    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;

      const rel = this.meta.relations[key];
      if (rel) {
        // Relation updates if needed
        continue;
      }

      const col = escapeIdentifier(key);

      if (typeof val === "object" && val !== null && !(val instanceof Date) && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        if ("increment" in obj) {
          const p = collector.add(obj.increment);
          setClauses.push(`${col} = ${col} + ${p}`);
          continue;
        }
        if ("decrement" in obj) {
          const p = collector.add(obj.decrement);
          setClauses.push(`${col} = ${col} - ${p}`);
          continue;
        }
        if ("set" in obj) {
          const p = collector.add(serializeValue(obj.set, key, this.meta));
          setClauses.push(`${col} = ${p}`);
          continue;
        }
      }

      const p = collector.add(serializeValue(val, key, this.meta));
      setClauses.push(`${col} = ${p}`);
    }

    if (setClauses.length === 0) {
      if (args.include || args.select) {
        await this.resolveRelations([existing], args.include ?? args.select, Boolean(args.select));
      }
      return existing;
    }

    const pkPlaceholder = collector.add(pkVal);
    const sql = `UPDATE ${escapeIdentifier(this.meta.table)} SET ${setClauses.join(", ")} WHERE ${escapeIdentifier(this.meta.primaryKey)} = ${pkPlaceholder} RETURNING *`;
    const rows = await this.executor.query<Record<string, unknown>>(sql, collector.params);
    const updated = normalizeRow(rows[0], this.meta);

    if (args.include || args.select) {
      await this.resolveRelations([updated], args.include ?? args.select, Boolean(args.select));
    }

    return updated as TModel;
  }

  async updateMany(args: {
    where?: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const list = await this.findMany({ where: args.where });
    if (list.length === 0) return { count: 0 };

    let count = 0;
    for (const item of list) {
      await this.update({
        where: { [this.meta.primaryKey]: item[this.meta.primaryKey] },
        data: args.data,
      });
      count++;
    }
    return { count };
  }

  async upsert(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TModel> {
    const existing = await this.findFirst({ where: args.where });
    if (existing) {
      return this.update({
        where: { [this.meta.primaryKey]: existing[this.meta.primaryKey] },
        data: args.update,
        select: args.select,
        include: args.include,
      });
    } else {
      return this.create({
        data: args.create,
        select: args.select,
        include: args.include,
      });
    }
  }

  async delete(args: {
    where: Record<string, unknown>;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<TModel> {
    const existing = await this.findFirst({ where: args.where });
    if (!existing) {
      throw new Error(`Record to delete not found in ${this.modelName}`);
    }

    const pkVal = existing[this.meta.primaryKey];
    const collector = createParamCollector();
    const pkPlaceholder = collector.add(pkVal);

    const sql = `DELETE FROM ${escapeIdentifier(this.meta.table)} WHERE ${escapeIdentifier(this.meta.primaryKey)} = ${pkPlaceholder} RETURNING *`;
    const rows = await this.executor.query<Record<string, unknown>>(sql, collector.params);
    const deleted = normalizeRow(rows[0] ?? existing, this.meta);

    if (args.include || args.select) {
      await this.resolveRelations([deleted], args.include ?? args.select, Boolean(args.select));
    }

    return deleted as TModel;
  }

  async deleteMany(args: {
    where?: Record<string, unknown>;
  } = {}): Promise<{ count: number }> {
    const collector = createParamCollector();
    const whereSql = buildWhereClause(args.where, this.meta, collector);
    let sql = `DELETE FROM ${escapeIdentifier(this.meta.table)}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    const rows = await this.executor.query<Record<string, unknown>>(`${sql} RETURNING ${escapeIdentifier(this.meta.primaryKey)}`, collector.params);
    return { count: rows.length };
  }

  async count(args: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
  } = {}): Promise<number | Record<string, number>> {
    const collector = createParamCollector();
    const whereSql = buildWhereClause(args.where, this.meta, collector);
    let sql = `SELECT COUNT(*)::int AS count FROM ${escapeIdentifier(this.meta.table)}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    const rows = await this.executor.query<{ count: number }>(sql, collector.params);
    return Number(rows[0]?.count ?? 0);
  }

  async aggregate(args: {
    where?: Record<string, unknown>;
    _count?: boolean | Record<string, boolean>;
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
  }): Promise<Record<string, unknown>> {
    const collector = createParamCollector();
    const whereSql = buildWhereClause(args.where, this.meta, collector);
    const selects: string[] = [];

    if (args._count) {
      selects.push(`COUNT(*)::int AS _count_all`);
    }
    if (args._sum) {
      for (const col of Object.keys(args._sum)) {
        selects.push(`COALESCE(SUM(${escapeIdentifier(col)}), 0) AS ${escapeIdentifier(`_sum_${col}`)}`);
      }
    }
    if (args._avg) {
      for (const col of Object.keys(args._avg)) {
        selects.push(`AVG(${escapeIdentifier(col)}) AS ${escapeIdentifier(`_avg_${col}`)}`);
      }
    }
    if (args._min) {
      for (const col of Object.keys(args._min)) {
        selects.push(`MIN(${escapeIdentifier(col)}) AS ${escapeIdentifier(`_min_${col}`)}`);
      }
    }
    if (args._max) {
      for (const col of Object.keys(args._max)) {
        selects.push(`MAX(${escapeIdentifier(col)}) AS ${escapeIdentifier(`_max_${col}`)}`);
      }
    }

    if (selects.length === 0) {
      selects.push("COUNT(*)::int AS _count_all");
    }

    let sql = `SELECT ${selects.join(", ")} FROM ${escapeIdentifier(this.meta.table)}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;

    const rows = await this.executor.query<Record<string, unknown>>(sql, collector.params);
    const row = rows[0] ?? {};

    const result: Record<string, unknown> = {};
    if (args._count) {
      result._count = typeof args._count === "object" ? { _all: Number(row._count_all ?? 0) } : Number(row._count_all ?? 0);
    }
    if (args._sum) {
      const s: Record<string, unknown> = {};
      for (const col of Object.keys(args._sum)) {
        const val = row[`_sum_${col}`];
        s[col] = this.meta.bigintFields?.has(col) ? (val ? BigInt(String(val)) : BigInt(0)) : Number(val ?? 0);
      }
      result._sum = s;
    }
    if (args._avg) {
      const a: Record<string, number> = {};
      for (const col of Object.keys(args._avg)) {
        a[col] = Number(row[`_avg_${col}`] ?? 0);
      }
      result._avg = a;
    }
    if (args._min) {
      const m: Record<string, unknown> = {};
      for (const col of Object.keys(args._min)) {
        m[col] = row[`_min_${col}`];
      }
      result._min = m;
    }
    if (args._max) {
      const m: Record<string, unknown> = {};
      for (const col of Object.keys(args._max)) {
        m[col] = row[`_max_${col}`];
      }
      result._max = m;
    }

    return result;
  }

  async groupBy(args: {
    by: string[];
    where?: Record<string, unknown>;
    _count?: boolean | Record<string, boolean>;
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
    orderBy?: unknown;
    take?: number;
    skip?: number;
  }): Promise<Record<string, unknown>[]> {
    const collector = createParamCollector();
    const whereSql = buildWhereClause(args.where, this.meta, collector);
    const selects: string[] = args.by.map((col) => escapeIdentifier(col));

    if (args._count) {
      selects.push(`COUNT(*)::int AS _count_all`);
    }
    if (args._sum) {
      for (const col of Object.keys(args._sum)) {
        selects.push(`COALESCE(SUM(${escapeIdentifier(col)}), 0) AS ${escapeIdentifier(`_sum_${col}`)}`);
      }
    }
    if (args._avg) {
      for (const col of Object.keys(args._avg)) {
        selects.push(`AVG(${escapeIdentifier(col)}) AS ${escapeIdentifier(`_avg_${col}`)}`);
      }
    }

    let sql = `SELECT ${selects.join(", ")} FROM ${escapeIdentifier(this.meta.table)}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;
    sql += ` GROUP BY ${args.by.map((col) => escapeIdentifier(col)).join(", ")}`;

    if (args.orderBy) {
      sql += ` ${buildOrderByClause(args.orderBy)}`;
    }
    if (args.take !== undefined) sql += ` LIMIT ${Number(args.take)}`;
    if (args.skip !== undefined) sql += ` OFFSET ${Number(args.skip)}`;

    const rawRows = await this.executor.query<Record<string, unknown>>(sql, collector.params);

    return rawRows.map((r) => {
      const res: Record<string, unknown> = {};
      for (const col of args.by) {
        res[col] = r[col];
      }
      if (args._count) {
        res._count = typeof args._count === "object" ? { _all: Number(r._count_all ?? 0) } : Number(r._count_all ?? 0);
      }
      if (args._sum) {
        const s: Record<string, unknown> = {};
        for (const col of Object.keys(args._sum)) {
          const val = r[`_sum_${col}`];
          s[col] = this.meta.bigintFields?.has(col) ? (val ? BigInt(String(val)) : BigInt(0)) : Number(val ?? 0);
        }
        res._sum = s;
      }
      if (args._avg) {
        const a: Record<string, number> = {};
        for (const col of Object.keys(args._avg)) {
          a[col] = Number(r[`_avg_${col}`] ?? 0);
        }
        res._avg = a;
      }
      return res;
    });
  }

  private async resolveRelations(
    rows: Record<string, unknown>[],
    includeOrSelect: Record<string, unknown> | undefined,
    isSelect = false
  ): Promise<void> {
    if (rows.length === 0 || !includeOrSelect) return;

    for (const [key, value] of Object.entries(includeOrSelect)) {
      if (!value) continue;

      if (key === "_count") {
        if (typeof value === "object" && value !== null) {
          const countSpec = (value as Record<string, unknown>).select as Record<string, boolean> | undefined;
          if (countSpec) {
            for (const countRel of Object.keys(countSpec)) {
              const rel = this.meta.relations[countRel];
              if (rel) {
                const targetDelegate = this.getDelegate(rel.model);
                const ids = rows.map((r) => r[this.meta.primaryKey]).filter(Boolean);
                const grouped = await targetDelegate.groupBy({
                  by: [rel.foreignKey],
                  where: { [rel.foreignKey]: { in: ids } },
                  _count: { _all: true },
                });
                const countMap = new Map<unknown, number>();
                for (const g of grouped) {
                  const fk = g[rel.foreignKey];
                  const c = (g._count as { _all?: number })?._all ?? 0;
                  countMap.set(fk, c);
                }
                for (const r of rows) {
                  if (!r._count) r._count = {};
                  (r._count as Record<string, number>)[countRel] = countMap.get(r[this.meta.primaryKey]) ?? 0;
                }
              }
            }
          }
        }
        continue;
      }

      const rel = this.meta.relations[key];
      if (!rel) continue;

      const targetDelegate = this.getDelegate(rel.model);
      const subArgs = typeof value === "object" ? (value as Record<string, unknown>) : {};

      if (rel.type === "one") {
        const foreignKeyVals = rows
          .map((r) => (rel.targetKey === this.meta.primaryKey ? r[this.meta.primaryKey] : r[rel.targetKey]))
          .filter((v) => v !== null && v !== undefined);

        if (foreignKeyVals.length > 0) {
          const relatedRows = await targetDelegate.findMany({
            where: { [rel.foreignKey]: { in: foreignKeyVals }, ...(subArgs.where as Record<string, unknown> || {}) },
            select: subArgs.select as Record<string, unknown> | undefined,
            include: subArgs.include as Record<string, unknown> | undefined,
            orderBy: subArgs.orderBy,
          });

          const relMap = new Map<unknown, Record<string, unknown>>();
          for (const rr of relatedRows) {
            relMap.set(rr[rel.foreignKey], rr);
          }

          for (const r of rows) {
            const keyVal = rel.targetKey === this.meta.primaryKey ? r[this.meta.primaryKey] : r[rel.targetKey];
            r[key] = relMap.get(keyVal) ?? null;
          }
        } else {
          for (const r of rows) {
            r[key] = null;
          }
        }
      } else {
        // One-to-many
        const primaryKeyVals = rows.map((r) => r[rel.targetKey]).filter((v) => v !== null && v !== undefined);

        if (primaryKeyVals.length > 0) {
          const relatedRows = await targetDelegate.findMany({
            where: { [rel.foreignKey]: { in: primaryKeyVals }, ...(subArgs.where as Record<string, unknown> || {}) },
            select: subArgs.select as Record<string, unknown> | undefined,
            include: subArgs.include as Record<string, unknown> | undefined,
            orderBy: subArgs.orderBy,
            take: subArgs.take as number | undefined,
            skip: subArgs.skip as number | undefined,
          });

          const relListMap = new Map<unknown, Record<string, unknown>[]>();
          for (const rr of relatedRows) {
            const fk = rr[rel.foreignKey];
            if (!relListMap.has(fk)) relListMap.set(fk, []);
            relListMap.get(fk)!.push(rr);
          }

          for (const r of rows) {
            const pk = r[rel.targetKey];
            r[key] = relListMap.get(pk) ?? [];
          }
        } else {
          for (const r of rows) {
            r[key] = [];
          }
        }
      }
    }
  }
}
