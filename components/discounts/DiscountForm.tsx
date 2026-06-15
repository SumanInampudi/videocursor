"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { DiscountImpactEstimator } from "@/components/discounts/DiscountImpactEstimator";

type ProductOption = { id: string; name: string; category: string };

type PromotionKind =
  | "CHECK_PERCENT"
  | "CHECK_FIXED"
  | "ITEM_PERCENT"
  | "ITEM_FIXED"
  | "BOGO"
  | "COMBO_PRICE"
  | "TIERED_SPEND"
  | "TIERED_QUANTITY"
  | "MANAGER_OPEN"
  | "COMP_ITEM"
  | "CUSTOMER_SEGMENT";

type TierRow = {
  threshold: string;
  value: string;
  valueType: "PERCENT" | "FIXED";
};

type DiscountFormProps = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; success?: boolean }>;
  productOptions?: ProductOption[];
  categoryOptions?: string[];
  initialData?: {
    code: string;
    name: string;
    kind: PromotionKind;
    application?: "CODE" | "AUTO" | "MANAGER" | "PAYMENT_METHOD";
    value: number;
    minOrderAmount: number | null;
    maxDiscountAmount?: number | null;
    isActive: boolean;
    validFrom: string | null;
    validTo: string | null;
    channelsJson?: string[];
    scheduleJson?: { windows?: { daysOfWeek: number[]; start: string; end: string }[] };
    configJson?: {
      bogo?: { buyQuantity?: number; getQuantity?: number; applyToCheapest?: boolean };
      tiers?: {
        thresholdAmount?: number | null;
        thresholdQty?: number | null;
        valueType?: "PERCENT" | "FIXED";
        value?: number;
      }[];
      segment?: "FIRST_ORDER" | "BIRTHDAY_MONTH" | "RETURNING";
      valueType?: "PERCENT" | "FIXED";
      minVisitCount?: number;
    };
    paymentMethodsJson?: string[];
    targets?: { targetType: string; productId?: string | null; category?: string | null }[];
  };
  submitLabel?: string;
  discountId?: string;
};

const DAY_OPTIONS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "0", label: "Sun" },
];

export function DiscountForm({
  action,
  productOptions = [],
  categoryOptions = [],
  initialData,
  submitLabel = "Save discount",
  discountId,
}: DiscountFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [kind, setKind] = useState(initialData?.kind ?? "CHECK_PERCENT");
  const [targetType, setTargetType] = useState(
    initialData?.targets?.[0]?.targetType ?? "ALL_PRODUCTS"
  );
  const [targetCategory, setTargetCategory] = useState(
    initialData?.targets?.find((row) => row.category)?.category ?? ""
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialData?.targets
      ?.map((row) => row.productId)
      .filter((value): value is string => Boolean(value)) ?? []
  );

  const isItemLevel = kind === "ITEM_PERCENT" || kind === "ITEM_FIXED";
  const isBogo = kind === "BOGO";
  const isCombo = kind === "COMBO_PRICE";
  const isTieredSpend = kind === "TIERED_SPEND";
  const isTieredQuantity = kind === "TIERED_QUANTITY";
  const isTiered = isTieredSpend || isTieredQuantity;
  const isCustomerSegment = kind === "CUSTOMER_SEGMENT";
  const showItemTargeting = isItemLevel || isBogo;
  const showTieredTargeting = isTiered;
  const showComboProducts = isCombo;
  const bogoDefaults = initialData?.configJson?.bogo;
  const initialTierRows = useMemo<TierRow[]>(() => {
    const tiers = initialData?.configJson?.tiers ?? [];
    if (tiers.length === 0) {
      return [{ threshold: "", value: "", valueType: "PERCENT" }];
    }
    return tiers.map((tier) => ({
      threshold: String(tier.thresholdAmount ?? tier.thresholdQty ?? ""),
      value: String(tier.value ?? ""),
      valueType: tier.valueType === "FIXED" ? "FIXED" : "PERCENT",
    }));
  }, [initialData?.configJson?.tiers]);
  const [tierRows, setTierRows] = useState<TierRow[]>(initialTierRows);
  const [value, setValue] = useState(String(initialData?.value ?? ""));
  const [minOrderAmount, setMinOrderAmount] = useState(
    initialData?.minOrderAmount != null ? String(initialData.minOrderAmount) : ""
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    initialData?.maxDiscountAmount != null ? String(initialData.maxDiscountAmount) : ""
  );

  useEffect(() => {
    if (isItemLevel && targetType === "ALL_PRODUCTS" && !initialData?.targets?.length) {
      setTargetType("CATEGORY");
    }
    if (isBogo && targetType === "ALL_PRODUCTS" && !initialData?.targets?.length) {
      setTargetType("PRODUCT");
    }
  }, [isItemLevel, isBogo, targetType, initialData?.targets?.length]);
  const scheduleWindow = initialData?.scheduleJson?.windows?.[0];
  const initialDays = useMemo(
    () => (scheduleWindow?.daysOfWeek ?? [1, 2, 3, 4, 5]).map(String),
    [scheduleWindow]
  );
  const [scheduleDays, setScheduleDays] = useState<string[]>(initialDays);

  function toggleDay(day: string) {
    setScheduleDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day]
    );
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((value) => value !== productId)
        : [...current, productId]
    );
  }

  function addTierRow() {
    setTierRows((current) => [...current, { threshold: "", value: "", valueType: "PERCENT" }]);
  }

  function removeTierRow(index: number) {
    setTierRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function updateTierRow(index: number, patch: Partial<TierRow>) {
    setTierRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("scheduleDays", scheduleDays.join(","));
    formData.set("targetProductIds", selectedProductIds.join(","));
    if (targetType === "CATEGORY") {
      formData.set("targetCategories", targetCategory);
    }
    if (isTiered) {
      const tiers = tierRows
        .filter((row) => row.threshold && row.value)
        .map((row, index) => ({
          thresholdAmount: isTieredSpend ? Number(row.threshold) : null,
          thresholdQty: isTieredQuantity ? Number(row.threshold) : null,
          valueType: row.valueType,
          value: Number(row.value),
          sortOrder: index + 1,
        }));
      formData.set("tiersJson", JSON.stringify(tiers));
      const firstTierValue = tiers[0]?.value ?? 1;
      formData.set("value", String(firstTierValue));
    }
    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setErrors(result.error);
        toastError("Could not save discount");
        return;
      }
      success("Discount saved");
      router.push("/discounts");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-servora-charcoal">Basics</h2>
        <Input
          name="code"
          label="Code *"
          defaultValue={initialData?.code}
          error={errors.code?.[0]}
          placeholder="SUMMER20"
          required
        />
        <Input
          name="name"
          label="Display name *"
          defaultValue={initialData?.name}
          error={errors.name?.[0]}
          required
        />
        <Select
          name="application"
          label="How it applies"
          defaultValue={initialData?.application ?? "CODE"}
          options={[
            { value: "CODE", label: "Cashier enters code" },
            { value: "AUTO", label: "Auto-apply when cart qualifies" },
            { value: "PAYMENT_METHOD", label: "Auto-apply when payment method selected" },
          ]}
        />
        <Select
          name="kind"
          label="Discount type"
          value={kind}
          onChange={(event) => setKind(event.target.value as PromotionKind)}
          options={[
            { value: "CHECK_PERCENT", label: "Percent off entire bill" },
            { value: "CHECK_FIXED", label: "Fixed amount off bill (₹)" },
            { value: "ITEM_PERCENT", label: "Percent off matching items (e.g. Beverages)" },
            { value: "ITEM_FIXED", label: "Fixed amount off matching items (₹)" },
            { value: "BOGO", label: "Buy X get Y (BOGO)" },
            { value: "COMBO_PRICE", label: "Combo bundle price" },
            { value: "TIERED_SPEND", label: "Tiered spend (e.g. ₹500 → 5%)" },
            { value: "TIERED_QUANTITY", label: "Tiered quantity (e.g. 3 items → 10%)" },
            { value: "CUSTOMER_SEGMENT", label: "Customer segment (first order, birthday)" },
          ]}
        />
        {isItemLevel && (
          <p className="text-xs text-brand-800">
            Item targeting is enabled — pick a category, product, or all items in the next
            section.
          </p>
        )}
        {isBogo && (
          <p className="text-xs text-brand-800">
            Customer buys qualifying items and gets extra units discounted (e.g. buy 1 get 1 free).
          </p>
        )}
        {isCombo && (
          <p className="text-xs text-brand-800">
            Set a fixed bundle price when all selected products are in the cart (e.g. burger + fries
            for ₹199).
          </p>
        )}
        {isTiered && (
          <p className="text-xs text-brand-800">
            Add threshold rows — the best matching tier auto-applies at checkout. Use{" "}
            <strong>Auto-apply</strong> so cashiers see savings chips and upsell hints.
          </p>
        )}
        {!isItemLevel && !isBogo && !isCombo && !isTiered && (
          <p className="text-xs text-gray-500">
            To target a category like <strong>Beverages</strong>, choose{" "}
            <strong>Percent off matching items</strong> — the category picker appears below.
          </p>
        )}
        {isBogo && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="bogoBuyQuantity"
              label="Buy quantity"
              type="number"
              min="1"
              step="1"
              defaultValue={bogoDefaults?.buyQuantity ?? 1}
              required
            />
            <Input
              name="bogoGetQuantity"
              label="Get quantity"
              type="number"
              min="1"
              step="1"
              defaultValue={bogoDefaults?.getQuantity ?? 1}
              required
            />
          </div>
        )}
        {isCustomerSegment && (
          <section className="card-padded space-y-3 border-brand-200/60 bg-brand-50/20">
            <Select
              name="customerSegment"
              label="Customer segment"
              defaultValue={initialData?.configJson?.segment ?? "FIRST_ORDER"}
              options={[
                { value: "FIRST_ORDER", label: "First order (no prior delivered orders)" },
                { value: "BIRTHDAY_MONTH", label: "Birthday month (needs DOB on customer)" },
                { value: "RETURNING", label: "Returning guest (repeat visits)" },
              ]}
            />
            <Select
              name="segmentValueType"
              label="Discount type"
              defaultValue={initialData?.configJson?.valueType ?? "PERCENT"}
              options={[
                { value: "PERCENT", label: "Percent off bill" },
                { value: "FIXED", label: "Fixed amount off bill (₹)" },
              ]}
            />
            <Input
              name="segmentMinVisitCount"
              label="Minimum prior visits (returning only)"
              type="number"
              min="1"
              defaultValue={initialData?.configJson?.minVisitCount ?? 2}
            />
            <p className="text-xs text-gray-500">
              Customer must be selected at checkout. Set date of birth on the customer profile for
              birthday promos.
            </p>
          </section>
        )}

        {!isTiered && (
          <Input
            name="value"
            label={
              isBogo
                ? "Discount on get items (%) *"
                : isCombo
                  ? "Combo bundle price (₹) *"
                  : isCustomerSegment
                    ? "Discount value *"
                    : "Value *"
            }
            type="number"
            step={isBogo ? "1" : "0.01"}
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={errors.value?.[0]}
            required
          />
        )}
        {isBogo && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="bogoApplyToCheapest"
              defaultChecked={bogoDefaults?.applyToCheapest !== false}
            />
            Apply discount to cheapest matching units
          </label>
        )}
      </section>

      {isTiered && (
        <section className="card-padded space-y-3 border-brand-200/60 bg-brand-50/20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-servora-charcoal">Discount tiers</h2>
            <Button type="button" variant="secondary" onClick={addTierRow}>
              Add tier
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {isTieredSpend
              ? "When cart spend reaches each threshold, that tier's discount applies."
              : "When matching item count reaches each threshold, that tier's discount applies."}
          </p>
          <div className="space-y-3">
            {tierRows.map((row, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-4">
                <Input
                  label={isTieredSpend ? "Spend threshold (₹)" : "Item count"}
                  type="number"
                  min="1"
                  step={isTieredSpend ? "0.01" : "1"}
                  value={row.threshold}
                  onChange={(event) => updateTierRow(index, { threshold: event.target.value })}
                  required
                />
                <Select
                  label="Discount type"
                  value={row.valueType}
                  onChange={(event) =>
                    updateTierRow(index, {
                      valueType: event.target.value as "PERCENT" | "FIXED",
                    })
                  }
                  options={[
                    { value: "PERCENT", label: "Percent" },
                    { value: "FIXED", label: "Fixed ₹" },
                  ]}
                />
                <Input
                  label="Discount value"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.value}
                  onChange={(event) => updateTierRow(index, { value: event.target.value })}
                  required
                />
                <div className="flex items-end">
                  {tierRows.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => removeTierRow(index)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showComboProducts && (
        <section className="card-padded space-y-3 border-brand-200/60 bg-brand-50/20">
          <h2 className="text-sm font-semibold text-servora-charcoal">Combo products</h2>
          <p className="text-xs text-gray-500">
            Select at least two products that form the bundle. Discount applies when the cart has one
            or more of each.
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
            {productOptions.map((product) => (
              <label key={product.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                />
                {product.name}
                <span className="text-gray-400">({product.category})</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {showTieredTargeting && (
        <section className="card-padded space-y-3 border-brand-200/60 bg-brand-50/20">
          <h2 className="text-sm font-semibold text-servora-charcoal">Optional item targeting</h2>
          <p className="text-xs text-gray-500">
            Leave as all products for whole-cart tiers, or limit thresholds to a category or product
            list.
          </p>
          <Select
            name="targetType"
            label="Measure on"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            options={[
              { value: "ALL_PRODUCTS", label: "Entire cart" },
              { value: "CATEGORY", label: "Specific categories" },
              { value: "PRODUCT", label: "Specific products" },
            ]}
          />
          {targetType === "CATEGORY" && (
            <CategoryCombobox
              name="targetCategories"
              label="Product category"
              categories={categoryOptions}
              value={targetCategory}
              onChange={setTargetCategory}
              placeholder="Type or pick e.g. Beverages"
              required
            />
          )}
          {targetType === "PRODUCT" && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {productOptions.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  {product.name}
                  <span className="text-gray-400">({product.category})</span>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {showItemTargeting && (
        <section className="card-padded space-y-3 border-brand-200/60 bg-brand-50/20">
          <h2 className="text-sm font-semibold text-servora-charcoal">
            {isBogo ? "BOGO qualifying items" : "Item targeting"}
          </h2>
          <p className="text-xs text-gray-500">
            Match product categories from your menu (e.g. Beverages, Pizza). Products must use the
            same category name at <a href="/products" className="link-brand">/products</a>.
          </p>
          <Select
            name="targetType"
            label="Applies to"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            options={
              isBogo
                ? [
                    { value: "PRODUCT", label: "Specific products" },
                    { value: "CATEGORY", label: "Specific categories" },
                    { value: "ALL_PRODUCTS", label: "All products in cart" },
                  ]
                : [
                    { value: "CATEGORY", label: "Specific categories (e.g. Beverages)" },
                    { value: "PRODUCT", label: "Specific products" },
                    { value: "ALL_PRODUCTS", label: "All products in cart" },
                  ]
            }
          />
          {targetType === "CATEGORY" && (
            <>
              <CategoryCombobox
                name="targetCategories"
                label="Product category"
                categories={categoryOptions}
                value={targetCategory}
                onChange={setTargetCategory}
                placeholder="Type or pick e.g. Beverages"
                required
              />
              {categoryOptions.length === 0 && (
                <p className="text-xs text-amber-800">
                  No menu categories yet — type <strong>Beverages</strong> (or your category name)
                  above, then add products with that category so the promo can match at checkout.
                </p>
              )}
            </>
          )}
          {targetType === "PRODUCT" && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {productOptions.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  {product.name}
                  <span className="text-gray-400">({product.category})</span>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="card-padded space-y-3">
        <h2 className="text-sm font-semibold text-servora-charcoal">Schedule & channels</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="scheduleEnabled"
            defaultChecked={Boolean(scheduleWindow)}
          />
          Limit to time window (happy hour)
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            name="scheduleStart"
            label="Start time"
            type="time"
            defaultValue={scheduleWindow?.start ?? "16:00"}
          />
          <Input
            name="scheduleEnd"
            label="End time"
            type="time"
            defaultValue={scheduleWindow?.end ?? "19:00"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                scheduleDays.includes(day.value)
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="channelDineIn"
              defaultChecked={
                !initialData?.channelsJson?.length || initialData.channelsJson.includes("DINE_IN")
              }
            />
            Dine-in
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="channelOnline"
              defaultChecked={
                !initialData?.channelsJson?.length || initialData.channelsJson.includes("ONLINE")
              }
            />
            Online
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="w-full text-xs font-medium text-gray-600">Payment methods (optional)</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="paymentCash"
              defaultChecked={initialData?.paymentMethodsJson?.includes("CASH") ?? false}
            />
            Cash
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="paymentCard"
              defaultChecked={initialData?.paymentMethodsJson?.includes("CARD") ?? false}
            />
            Card
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="paymentPhonePe"
              defaultChecked={initialData?.paymentMethodsJson?.includes("PHONEPE") ?? false}
            />
            PhonePe
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Leave all unchecked to allow any payment. Use with{" "}
          <strong>Auto-apply when payment method selected</strong> for cash/card discounts at
          checkout.
        </p>
      </section>

      <section className="space-y-4">
        <Input
          name="minOrderAmount"
          label="Minimum order (₹)"
          type="number"
          step="0.01"
          min="0"
          value={minOrderAmount}
          onChange={(e) => setMinOrderAmount(e.target.value)}
        />
        <Input
          name="maxDiscountAmount"
          label="Maximum discount cap (₹)"
          type="number"
          step="0.01"
          min="0"
          value={maxDiscountAmount}
          onChange={(e) => setMaxDiscountAmount(e.target.value)}
        />
        <Input
          name="validFrom"
          label="Valid from"
          type="date"
          defaultValue={initialData?.validFrom?.slice(0, 10) ?? ""}
        />
        <Input
          name="validTo"
          label="Valid to"
          type="date"
          defaultValue={initialData?.validTo?.slice(0, 10) ?? ""}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={initialData?.isActive ?? true} />
          Active
        </label>
      </section>

      <DiscountImpactEstimator
        discountId={discountId}
        draft={{
          kind,
          value: Number(value) || 0,
          minOrderAmount: minOrderAmount.trim() ? Number(minOrderAmount) : null,
          maxDiscountAmount: maxDiscountAmount.trim() ? Number(maxDiscountAmount) : null,
        }}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
