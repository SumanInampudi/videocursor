"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatBarcodeDisplay } from "@/lib/barcode";

type RecipeBarcodeProps = {
  barcode: string;
  className?: string;
};

export function RecipeBarcode({ barcode, className = "" }: RecipeBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !barcode) return;
    try {
      JsBarcode(svgRef.current, barcode, {
        format: "EAN13",
        displayValue: true,
        fontSize: 14,
        height: 60,
        margin: 8,
      });
    } catch {
      JsBarcode(svgRef.current, barcode.replace(/\D/g, "").slice(0, 12), {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 60,
        margin: 8,
      });
    }
  }, [barcode]);

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg ref={svgRef} role="img" aria-label={`Barcode ${barcode}`} />
      <p className="mt-1 text-xs text-gray-500">{formatBarcodeDisplay(barcode)}</p>
    </div>
  );
}
