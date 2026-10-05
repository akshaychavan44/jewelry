/**
 * Standalone runtime types and helper utilities (replaces @prisma/client/runtime/client).
 */

export namespace Types {
  export namespace Extensions {
    export type DefaultArgs = { result: {}; model: {}; query: {}; client: {} };
    export type InternalArgs = { result: {}; model: {}; query: {}; client: {} };
    export type GetPayloadResult<Point, ExtArgs = any> = Point;
    export type GetSelect<Base, Select> = Base;
    export type GetInclude<Base, Include> = Base;
    export type GetOmit<Base, Omit> = Base;
    export type DynamicClientExtensionThis<T, E, B> = T;
    export type DynamicQueryExtensionArgs<T, E> = T;
    export type DynamicModelExtensionThis<T, E, B> = T;
    export type ExtendsHook<A, B, C, D> = any;
  }

  export namespace Result {
    export type DefaultSelection<P> = P extends { scalars: infer S }
      ? (S extends Extensions.GetPayloadResult<infer ActualS, any> ? ActualS : S)
      : P;

    type ResolveTarget<Target, Config> = Target extends Array<infer Elem>
      ? "include" extends keyof Config
        ? ResolvePayload<Elem, { include: Config["include"] }>[]
        : "select" extends keyof Config
        ? ResolvePayload<Elem, { select: Config["select"] }>[]
        : DefaultSelection<Elem>[]
      : null extends Target
      ? "include" extends keyof Config
        ? ResolvePayload<NonNullable<Target>, { include: Config["include"] }> | null
        : "select" extends keyof Config
        ? ResolvePayload<NonNullable<Target>, { select: Config["select"] }> | null
        : DefaultSelection<NonNullable<Target>> | null
      : "include" extends keyof Config
      ? ResolvePayload<Target, { include: Config["include"] }>
      : "select" extends keyof Config
      ? ResolvePayload<Target, { select: Config["select"] }>
      : DefaultSelection<Target>;

    export type ResolvePayload<P, A> = "include" extends keyof A
      ? DefaultSelection<P> & {
          [K in keyof A["include"] as A["include"][K] extends false | undefined | null ? never : K]: K extends "_count"
            ? A["include"][K] extends { select: infer CS }
              ? { [CK in keyof CS as CS[CK] extends false | undefined | null ? never : CK]: number }
              : Record<string, number>
            : P extends { objects: infer Obj }
            ? K extends keyof Obj
              ? ResolveTarget<Obj[K], A["include"][K]>
              : any
            : any;
        }
      : "select" extends keyof A
      ? {
          [K in keyof A["select"] as A["select"][K] extends false | undefined | null ? never : K]: K extends "_count"
            ? A["select"][K] extends { select: infer CS }
              ? { [CK in keyof CS as CS[CK] extends false | undefined | null ? never : CK]: number }
              : Record<string, number>
            : K extends keyof DefaultSelection<P>
            ? DefaultSelection<P>[K]
            : P extends { objects: infer Obj }
            ? K extends keyof Obj
              ? ResolveTarget<Obj[K], A["select"][K]>
              : any
            : any;
        }
      : DefaultSelection<P>;

    export type GetResult<P, A, O extends string = "findUnique", G = any> =
      O extends "findMany"
        ? ResolvePayload<P, A>[]
        : O extends "count"
        ? (A extends { select: any } ? Record<string, number> : number)
        : O extends "groupBy"
        ? any[]
        : O extends "aggregate"
        ? any
        : ResolvePayload<P, A>;

    export type FieldRef<Model, FieldType> = {
      readonly modelName: Model;
      readonly name: string;
      readonly typeName: FieldType;
      readonly isList: boolean;
    };
  }

  export namespace Utils {
    export type PayloadToResult<P> = Result.DefaultSelection<P>;
    export type JsPromise<T> = Promise<T>;
    export type EmptyToOptional<T> = T;
    export type LegacyExact<A, W = unknown> = A;
    export type Cast<A, B> = A extends B ? A : B;
    export type Record<K extends keyof any, T> = { [P in K]: T };
    export type UnwrapPromise<P> = P extends Promise<infer R> ? R : P;
    export type UnwrapTuple<Tuple extends readonly unknown[]> = {
      [K in keyof Tuple]: Tuple[K] extends Promise<infer R> ? R : Tuple[K];
    };
    export type Call<Fn, Args> = any;
  }

  export namespace Public {
    export type PrismaPromise<T> = Promise<T>;
    export type Operation = string;
    export type Exact<A, W> = A extends unknown ? (W extends A ? { [K in keyof A]: K extends keyof W ? Exact<A[K], W[K]> : never } : W) : never;
  }
}

export type ITXClientDenyList = "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends";

export type DMMF = any;

export class Decimal {
  constructor(public value: string | number) {}
  toString() { return String(this.value); }
  toNumber() { return Number(this.value); }
  toJSON() { return String(this.value); }
}

export class PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  clientVersion: string;
  constructor(message: string, { code, clientVersion, meta }: { code: string; clientVersion?: string; meta?: Record<string, unknown> } = { code: "" }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.clientVersion = clientVersion || "7.10.0";
    this.meta = meta;
  }
}

export class PrismaClientUnknownRequestError extends Error {
  clientVersion: string;
  constructor(message: string, { clientVersion }: { clientVersion?: string } = {}) {
    super(message);
    this.name = "PrismaClientUnknownRequestError";
    this.clientVersion = clientVersion || "7.10.0";
  }
}

export class PrismaClientRustPanicError extends Error {
  clientVersion: string;
  constructor(message: string, { clientVersion }: { clientVersion?: string } = {}) {
    super(message);
    this.name = "PrismaClientRustPanicError";
    this.clientVersion = clientVersion || "7.10.0";
  }
}

export class PrismaClientInitializationError extends Error {
  clientVersion: string;
  errorCode?: string;
  constructor(message: string, clientVersion?: string, errorCode?: string) {
    super(message);
    this.name = "PrismaClientInitializationError";
    this.clientVersion = clientVersion || "7.10.0";
    this.errorCode = errorCode;
  }
}

export class PrismaClientValidationError extends Error {
  override name = "PrismaClientValidationError";
}

export class Sql {
  strings: string[];
  values: unknown[];
  constructor(strings: string[], values: unknown[]) {
    this.strings = strings;
    this.values = values;
  }
}

export function sqltag(strings: TemplateStringsArray, ...values: unknown[]): Sql {
  return new Sql(Array.from(strings), values);
}

export const empty = new Sql([""], []);

export function join(values: unknown[], separator = ","): Sql {
  return new Sql(values.map(() => ""), values);
}

export function raw(value: string): Sql {
  return new Sql([value], []);
}

export type GetPrismaClientConfig = any;

export function getPrismaClient(config: any) {
  return class StandaloneClient {};
}
