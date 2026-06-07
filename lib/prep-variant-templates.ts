/** Default sell-pack suggestions for batch prep items (owner sets prices). */
export type PrepVariantTemplate = {
  label: string;
  outputQuantity: number;
  sortOrder: number;
};

export const PREP_VARIANT_TEMPLATE_SET: PrepVariantTemplate[] = [
  { label: "Single Plate", outputQuantity: 0.35, sortOrder: 10 },
  { label: "Mini Plate", outputQuantity: 0.2, sortOrder: 20 },
  { label: "Family Pack", outputQuantity: 1.4, sortOrder: 30 },
];
