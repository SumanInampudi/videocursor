"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  clearProductImage,
  updateProductImageUrl,
  uploadProductImage,
} from "@/app/actions/product-images";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type ProductMenuImageFieldsProps = {
  productId: string;
  productName: string;
  imageUrl: string | null;
};

export function ProductMenuImageFields({
  productId,
  productName,
  imageUrl,
}: ProductMenuImageFieldsProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(imageUrl ?? "");

  function refresh() {
    router.refresh();
  }

  function saveUrl() {
    startTransition(async () => {
      const result = await updateProductImageUrl(productId, url);
      if (result.success) {
        success("Image URL saved");
        refresh();
      } else toastError("Could not save URL");
    });
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (result.error) toastError(result.error);
      else {
        success("Image uploaded");
        refresh();
      }
      e.target.value = "";
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearProductImage(productId);
      setUrl("");
      success("Image removed");
      refresh();
    });
  }

  const preview = imageUrl || url.trim() || null;

  return (
    <section id="menu-image" className="mt-8 scroll-mt-24 card-padded">
      <h2 className="section-title">POS menu image</h2>
      <p className="mt-1 text-sm text-gray-500">
        Shown on register tiles for {productName}. JPG, PNG, or WebP up to 2 MB.
      </p>

      <div className="mt-4">
        <ProductThumbnail name={productName} imageUrl={preview} size="lg" />
      </div>

      <div className="mt-4 flex max-w-lg flex-col gap-3">
        <Input
          label="Image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… or /uploads/products/…"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={saveUrl} disabled={isPending}>
            Save URL
          </Button>
          <label className="inline-flex cursor-pointer items-center">
            <span className="touch-target inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Upload file
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={isPending}
              onChange={handleUpload}
            />
          </label>
          {(imageUrl || url) && (
            <Button type="button" variant="ghost" onClick={handleClear} disabled={isPending}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
