import type { DatabaseModels, DatabaseRelations, JsonValue } from "./model-types";

type ModelName = keyof DatabaseModels;
type WriteShape<M> = { [K in keyof M]?: M[K] extends bigint ? bigint | number : M[K] };
type Row<M extends ModelName> = DatabaseModels[M];
type Rel<M extends ModelName> = DatabaseRelations[M];
type IncludeOption = boolean | { where?: Record<string, unknown>; orderBy?: unknown; take?: number; skip?: number; include?: Record<string, IncludeOption>; select?: Record<string, boolean | IncludeOption> };
export type IncludeSpec<M extends ModelName> = Partial<Record<keyof Rel<M> | "_count", IncludeOption>>;
export type SelectSpec<M extends ModelName> = Partial<Record<keyof Row<M> | keyof Rel<M> | "_count", boolean | IncludeOption>>;
export type QueryArgs<M extends ModelName> = {
  where?: Record<string, unknown>;
  select?: SelectSpec<M>;
  include?: IncludeSpec<M>;
  orderBy?: unknown;
  take?: number;
  skip?: number;
  distinct?: string[];
};
type Enabled<S> = { [K in keyof S as S[K] extends false | undefined ? never : K]: S[K] };
type RelatedValue<R, O> = R extends (infer Item)[] ? RelatedItem<Item, O>[] : null extends R ? RelatedItem<Exclude<R, null>, O> | null : RelatedItem<R, O>;
type ModelKey<R> = { [M in ModelName]: [R] extends [Row<M>] ? [Row<M>] extends [R] ? M : never : never }[ModelName];
type RelatedItem<R, O> = ModelKey<R> extends infer M ? M extends ModelName ? O extends { select: infer S } ? Selected<M, S> : Row<M> & (O extends { include: infer I } ? IncludeResult<M, I> : {}) : never : never;
type Selected<M extends ModelName, S> = {
  [K in keyof Enabled<S>]: K extends keyof Row<M> ? Row<M>[K] : K extends keyof Rel<M> ? RelatedValue<Rel<M>[K], S[K]> : K extends "_count" ? Record<string, number> : unknown
};
type IncludeResult<M extends ModelName, I> = {
  [K in keyof Enabled<I> as K extends keyof Rel<M> | "_count" ? K : never]: K extends keyof Rel<M> ? RelatedValue<Rel<M>[K], I[K]> : K extends "_count" ? Record<string, number> : never
};
export type QueryResult<M extends ModelName, A> = A extends { select: infer S } ? Selected<M, S> : Row<M> & (A extends { include: infer I } ? IncludeResult<M, I> : {});
type CountResult<C> = C extends true ? number : C extends Record<string, boolean> ? { [K in keyof C]: number } : number;
type NumericMap<M extends ModelName, S, Average extends boolean = false> = {
  [K in keyof S]: K extends keyof Row<M> ? Average extends true ? number | null : Row<M>[K] extends bigint | null ? bigint : number : number
};
export type AggregateArgs<M extends ModelName> = {
  where?: Record<string, unknown>;
  _count?: boolean | Record<string, boolean>;
  _sum?: Partial<Record<keyof Row<M>, boolean>>;
  _avg?: Partial<Record<keyof Row<M>, boolean>>;
  _min?: Partial<Record<keyof Row<M>, boolean>>;
  _max?: Partial<Record<keyof Row<M>, boolean>>;
};
export type AggregateResult<M extends ModelName, A> =
  (A extends { _count: infer C } ? { _count: CountResult<C> } : {}) &
  (A extends { _sum: infer S } ? { _sum: NumericMap<M, S> } : {}) &
  (A extends { _avg: infer S } ? { _avg: NumericMap<M, S, true> } : {}) &
  (A extends { _min: infer S } ? { _min: NumericMap<M, S> } : {}) &
  (A extends { _max: infer S } ? { _max: NumericMap<M, S> } : {});

export namespace DbQueryTypes {
  export type InputJsonValue = JsonValue;
  export type ProductWhereInput = Record<string, unknown>;
  export type SellerProfileWhereInput = Record<string, unknown>;
  export type ConversationWhereInput = Record<string, unknown>;
  export type DisputeWhereInput = Record<string, unknown>;
  export type UserWhereInput = Record<string, unknown>;
  export type OrderWhereInput = Record<string, unknown>;
  export type AuditLogWhereInput = Record<string, unknown>;
  export type PayoutWhereInput = Record<string, unknown>;
  export type EnumPaymentStatusFilter = { equals?: import("@/lib/domain-enums").PaymentStatus };
  export type ProductOrderByWithRelationInput = Record<string, unknown>;
  export type SellerProfileOrderByWithRelationInput = Record<string, unknown>;
  export type ProductInclude = IncludeSpec<"Product">;
  export type ProductSelect = SelectSpec<"Product">;
  export type CartInclude = IncludeSpec<"Cart">;
  export type ProductUncheckedCreateInput = WriteShape<Row<"Product">> & Record<string, unknown>;
  export type InventorySyncEventUncheckedCreateInput = WriteShape<Row<"InventorySyncEvent">> & Record<string, unknown>;
  export type LedgerEntryCreateManyInput = WriteShape<Row<"LedgerEntry">> & Record<string, unknown>;
  export type NotificationCreateInput = WriteShape<Row<"Notification">> & Record<string, unknown>;
  export type ConversationCreateInput = WriteShape<Row<"Conversation">> & Record<string, unknown>;
  export type ServiceEventCreateManyInput = WriteShape<Row<"ServiceEvent">> & Record<string, unknown>;
  export type AnalyticsEventCreateManyInput = WriteShape<Row<"AnalyticsEvent">> & Record<string, unknown>;
  export type ProductGetPayload<A = unknown> = QueryResult<"Product", A>;
  export type CartGetPayload<A = unknown> = QueryResult<"Cart", A>;
  export type ShipmentGetPayload<A = unknown> = QueryResult<"Shipment", A>;
  export type SellerOrderGetPayload<A = unknown> = QueryResult<"SellerOrder", A>;
  export type OrderGetPayload<A = unknown> = QueryResult<"Order", A>;
}
