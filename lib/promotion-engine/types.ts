import type {
  OrderChannel,
  OrderPaymentMethod,
  PromotionApplication,
  PromotionKind,
  PromotionScope,
  PromotionTargetRole,
  PromotionTargetType,
  StackingPolicy,
} from "@prisma/client";
import type { CustomerSegmentConfig, CustomerSegmentType } from "@/lib/promotion-engine/segments";

export type PromotionLine = {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitSalePrice: number;
  revenue: number;
  /** Auto-added free companion — excluded from promo targeting. */
  isIncluded?: boolean;
};

export type PromotionTargetDef = {
  role: PromotionTargetRole;
  targetType: PromotionTargetType;
  productId: string | null;
  category: string | null;
};

export type BogoConfig = {
  buyQuantity: number;
  getQuantity: number;
  getDiscountPercent: number;
  applyToCheapest: boolean;
};

export type ComboConfig = {
  comboPrice: number;
};

export type PromotionTierValueType = "PERCENT" | "FIXED";

export type PromotionTierDef = {
  thresholdAmount: number | null;
  thresholdQty: number | null;
  valueType: PromotionTierValueType;
  value: number;
  sortOrder: number;
};

export type TieredConfig = {
  tiers: PromotionTierDef[];
};

export type PromotionHint = {
  promotionId: string;
  name: string;
  kind: PromotionKind;
  message: string;
};

export type ScheduleWindow = {
  daysOfWeek: number[];
  start: string;
  end: string;
  label?: string;
};

export type PromotionSchedule = {
  windows: ScheduleWindow[];
};

export type PromotionDefinition = {
  id: string;
  code: string;
  name: string;
  kind: PromotionKind;
  application: PromotionApplication;
  scope: PromotionScope;
  stackingPolicy: StackingPolicy;
  priority: number;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  schedule: PromotionSchedule | null;
  channels: OrderChannel[];
  paymentMethods: OrderPaymentMethod[];
  targets: PromotionTargetDef[];
  bogoConfig: BogoConfig | null;
  comboConfig: ComboConfig | null;
  tieredConfig: TieredConfig | null;
  customerSegmentConfig: CustomerSegmentConfig | null;
};

export type LineAllocation = {
  productId: string;
  discountAmount: number;
  grossRevenue: number;
  netRevenue: number;
};

export type ManagerOpenDiscountInput = {
  mode: "FIXED" | "PERCENT";
  value: number;
  reason: string;
};

export type CompLineInput = {
  productId: string;
  reason: string;
};

export type ManagerAdjustmentsInput = {
  openDiscount?: ManagerOpenDiscountInput;
  compLines?: CompLineInput[];
};

export type AppliedPromotion = {
  discountId: string | null;
  code: string | null;
  name: string;
  kind: PromotionKind;
  discountAmount: number;
  lineAllocations: LineAllocation[];
  configSnapshot: Record<string, unknown>;
  reason?: string | null;
  appliedByUserId?: string | null;
};

export type PromotionApplyResult = {
  discountId: string | null;
  discountCode: string | null;
  discountTotal: number;
  linePayloads: PromotionLine[];
  appliedPromotions: AppliedPromotion[];
};

export type PromotionEvaluateContext = {
  channel: OrderChannel;
  codes?: string[];
  includeAuto?: boolean;
  at?: Date;
  paymentMethod?: OrderPaymentMethod | null;
  customerId?: string | null;
  customerSegments?: CustomerSegmentType[];
  deliveredOrderCount?: number;
};
