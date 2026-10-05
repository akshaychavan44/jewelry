/**
 * SQL Query Builder and Row Transformer for Neon PostgreSQL.
 */

import { SCHEMA_META, type ModelMeta } from "./schema-meta";

export interface ParamCollector {
  params: unknown[];
  add(val: unknown): string;
}

export function createParamCollector(): ParamCollector {
  const params: unknown[] = [];
  return {
    params,
    add(val: unknown): string {
      params.push(val);
      return `$${params.length}`;
    },
  };
}

export function escapeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function normalizeRow(row: Record<string, unknown>, meta?: ModelMeta): Record<string, unknown> {
  if (!row) return row;
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      result[key] = val;
      continue;
    }

    // Convert stringified integers from Postgres INT8 / BigInt columns to BigInt
    if (meta?.bigintFields?.has(key)) {
      try {
        result[key] = typeof val === "bigint" ? val : BigInt(String(val));
      } catch {
        result[key] = val;
      }
      continue;
    }

    // If jsonField was returned as string, parse it
    if (meta?.jsonFields?.has(key) && typeof val === "string") {
      try {
        result[key] = JSON.parse(val);
        continue;
      } catch {
        result[key] = val;
        continue;
      }
    }

    // If arrayField was returned as Postgres string format e.g. "{GIA,IGI}", parse it into string[]
    if (meta?.arrayFields?.has(key)) {
      if (Array.isArray(val)) {
        result[key] = val;
      } else if (typeof val === "string") {
        try {
          result[key] = JSON.parse(val);
        } catch {
          if (val.startsWith("{") && val.endsWith("}")) {
            result[key] = val.slice(1, -1).split(",").filter(Boolean);
          } else {
            result[key] = [val];
          }
        }
      } else {
        result[key] = [];
      }
      continue;
    }

    // Ensure Dates are real Date objects
    if (val instanceof Date) {
      result[key] = val;
      continue;
    }

    result[key] = val;
  }

  return result;
}

export function serializeValue(val: unknown, key: string, meta?: ModelMeta): unknown {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === "bigint") return val.toString();
  if (meta?.jsonFields?.has(key) && typeof val === "object" && !(val instanceof Date)) {
    return JSON.stringify(val);
  }
  return val;
}

export function buildWhereClause(
  where: Record<string, unknown> | undefined,
  meta: ModelMeta,
  collector: ParamCollector,
  tableAlias?: string
): string {
  if (!where || Object.keys(where).length === 0) return "";

  const prefix = tableAlias ? `${escapeIdentifier(tableAlias)}.` : "";
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === "AND") {
      const andList = Array.isArray(value) ? value : [value];
      const andClauses = andList
        .map((sub) => buildWhereClause(sub, meta, collector, tableAlias))
        .filter(Boolean);
      if (andClauses.length > 0) {
        conditions.push(`(${andClauses.join(" AND ")})`);
      }
      continue;
    }

    if (key === "OR") {
      const orList = Array.isArray(value) ? value : [value];
      const orClauses = orList
        .map((sub) => buildWhereClause(sub, meta, collector, tableAlias))
        .filter(Boolean);
      if (orClauses.length > 0) {
        conditions.push(`(${orClauses.join(" OR ")})`);
      }
      continue;
    }

    if (key === "NOT") {
      const notList = Array.isArray(value) ? value : [value];
      for (const notSub of notList) {
        const clause = buildWhereClause(notSub, meta, collector, tableAlias);
        if (clause) conditions.push(`NOT (${clause})`);
      }
      continue;
    }

    const relation = meta.relations[key];
    if (relation) {
      const targetMeta = SCHEMA_META[relation.model];
      if (targetMeta && typeof value === "object" && value !== null) {
        const relObj = value as Record<string, unknown>;
        if ("some" in relObj && relObj.some) {
          const subAlias = `rel_${key}_${collector.params.length}`;
          const subWhere = buildWhereClause(relObj.some as Record<string, unknown>, targetMeta, collector, subAlias);
          const link = `${escapeIdentifier(subAlias)}.${escapeIdentifier(relation.foreignKey)} = ${prefix}${escapeIdentifier(relation.targetKey)}`;
          conditions.push(`EXISTS (SELECT 1 FROM ${escapeIdentifier(targetMeta.table)} AS ${escapeIdentifier(subAlias)} WHERE ${link}${subWhere ? ` AND (${subWhere})` : ""})`);
        } else if ("none" in relObj && relObj.none) {
          const subAlias = `rel_${key}_${collector.params.length}`;
          const subWhere = buildWhereClause(relObj.none as Record<string, unknown>, targetMeta, collector, subAlias);
          const link = `${escapeIdentifier(subAlias)}.${escapeIdentifier(relation.foreignKey)} = ${prefix}${escapeIdentifier(relation.targetKey)}`;
          conditions.push(`NOT EXISTS (SELECT 1 FROM ${escapeIdentifier(targetMeta.table)} AS ${escapeIdentifier(subAlias)} WHERE ${link}${subWhere ? ` AND (${subWhere})` : ""})`);
        } else if ("is" in relObj && relObj.is) {
          const subAlias = `rel_${key}_${collector.params.length}`;
          const subWhere = buildWhereClause(relObj.is as Record<string, unknown>, targetMeta, collector, subAlias);
          const link = `${escapeIdentifier(subAlias)}.${escapeIdentifier(relation.foreignKey)} = ${prefix}${escapeIdentifier(relation.targetKey)}`;
          conditions.push(`EXISTS (SELECT 1 FROM ${escapeIdentifier(targetMeta.table)} AS ${escapeIdentifier(subAlias)} WHERE ${link}${subWhere ? ` AND (${subWhere})` : ""})`);
        } else if ("isNot" in relObj && relObj.isNot) {
          const subAlias = `rel_${key}_${collector.params.length}`;
          const subWhere = buildWhereClause(relObj.isNot as Record<string, unknown>, targetMeta, collector, subAlias);
          const link = `${escapeIdentifier(subAlias)}.${escapeIdentifier(relation.foreignKey)} = ${prefix}${escapeIdentifier(relation.targetKey)}`;
          conditions.push(`NOT EXISTS (SELECT 1 FROM ${escapeIdentifier(targetMeta.table)} AS ${escapeIdentifier(subAlias)} WHERE ${link}${subWhere ? ` AND (${subWhere})` : ""})`);
        } else {
          // Direct nested relation filter
          const subAlias = `rel_${key}_${collector.params.length}`;
          const subWhere = buildWhereClause(relObj, targetMeta, collector, subAlias);
          const link = `${escapeIdentifier(subAlias)}.${escapeIdentifier(relation.foreignKey)} = ${prefix}${escapeIdentifier(relation.targetKey)}`;
          conditions.push(`EXISTS (SELECT 1 FROM ${escapeIdentifier(targetMeta.table)} AS ${escapeIdentifier(subAlias)} WHERE ${link}${subWhere ? ` AND (${subWhere})` : ""})`);
        }
      }
      continue;
    }

    const col = `${prefix}${escapeIdentifier(key)}`;

    if (value === null) {
      conditions.push(`${col} IS NULL`);
    } else if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;

      for (const [op, opVal] of Object.entries(obj)) {
        if (opVal === undefined) continue;

        if (op === "equals") {
          if (opVal === null) {
            conditions.push(`${col} IS NULL`);
          } else {
            const p = collector.add(serializeValue(opVal, key, meta));
            conditions.push(`${col} = ${p}`);
          }
        } else if (op === "not") {
          if (opVal === null) {
            conditions.push(`${col} IS NOT NULL`);
          } else if (typeof opVal === "object" && !(opVal instanceof Date)) {
            // sub filter
            const subClause = buildWhereClause({ [key]: opVal }, meta, collector, tableAlias);
            if (subClause) conditions.push(`NOT (${subClause})`);
          } else {
            const p = collector.add(serializeValue(opVal, key, meta));
            conditions.push(`(${col} != ${p} OR ${col} IS NULL)`);
          }
        } else if (op === "in") {
          const list = Array.isArray(opVal) ? opVal : [opVal];
          if (list.length === 0) {
            conditions.push("1 = 0");
          } else {
            const placeholders = list.map((v) => collector.add(serializeValue(v, key, meta)));
            conditions.push(`${col} IN (${placeholders.join(", ")})`);
          }
        } else if (op === "notIn") {
          const list = Array.isArray(opVal) ? opVal : [opVal];
          if (list.length > 0) {
            const placeholders = list.map((v) => collector.add(serializeValue(v, key, meta)));
            conditions.push(`(${col} NOT IN (${placeholders.join(", ")}) OR ${col} IS NULL)`);
          }
        } else if (op === "gt") {
          const p = collector.add(serializeValue(opVal, key, meta));
          conditions.push(`${col} > ${p}`);
        } else if (op === "gte") {
          const p = collector.add(serializeValue(opVal, key, meta));
          conditions.push(`${col} >= ${p}`);
        } else if (op === "lt") {
          const p = collector.add(serializeValue(opVal, key, meta));
          conditions.push(`${col} < ${p}`);
        } else if (op === "lte") {
          const p = collector.add(serializeValue(opVal, key, meta));
          conditions.push(`${col} <= ${p}`);
        } else if (op === "contains") {
          const mode = obj.mode === "insensitive" ? "ILIKE" : "LIKE";
          const p = collector.add(`%${opVal}%`);
          conditions.push(`${col} ${mode} ${p}`);
        } else if (op === "startsWith") {
          const mode = obj.mode === "insensitive" ? "ILIKE" : "LIKE";
          const p = collector.add(`${opVal}%`);
          conditions.push(`${col} ${mode} ${p}`);
        } else if (op === "endsWith") {
          const mode = obj.mode === "insensitive" ? "ILIKE" : "LIKE";
          const p = collector.add(`%${opVal}`);
          conditions.push(`${col} ${mode} ${p}`);
        } else if (op === "has") {
          const p = collector.add(serializeValue(opVal, key, meta));
          conditions.push(`${p} = ANY(${col})`);
        } else if (op === "hasSome") {
          const list = Array.isArray(opVal) ? opVal : [opVal];
          const p = collector.add(list);
          conditions.push(`${col} && ${p}`);
        } else if (op === "hasEvery") {
          const list = Array.isArray(opVal) ? opVal : [opVal];
          const p = collector.add(list);
          conditions.push(`${col} @> ${p}`);
        } else if (op === "mode") {
          // handled in contains / startsWith
        }
      }
    } else {
      const p = collector.add(serializeValue(value, key, meta));
      conditions.push(`${col} = ${p}`);
    }
  }

  return conditions.length > 0 ? conditions.join(" AND ") : "";
}

export function buildOrderByClause(
  orderBy: unknown,
  tableAlias?: string
): string {
  if (!orderBy) return "";
  const prefix = tableAlias ? `${escapeIdentifier(tableAlias)}.` : "";
  const orders: string[] = [];

  const list = Array.isArray(orderBy) ? orderBy : [orderBy];

  for (const item of list) {
    if (typeof item !== "object" || !item) continue;
    for (const [col, dir] of Object.entries(item)) {
      if (typeof dir === "string") {
        const direction = dir.toUpperCase() === "DESC" ? "DESC" : "ASC";
        orders.push(`${prefix}${escapeIdentifier(col)} ${direction}`);
      } else if (typeof dir === "object" && dir !== null) {
        // e.g. { _count: 'desc' }
        const sub = dir as Record<string, string>;
        if (sub.sort) {
          const direction = sub.sort.toUpperCase() === "DESC" ? "DESC" : "ASC";
          orders.push(`${prefix}${escapeIdentifier(col)} ${direction}`);
        }
      }
    }
  }

  return orders.length > 0 ? `ORDER BY ${orders.join(", ")}` : "";
}
