"use client";

import Image from "next/image";
import { hasProductImage, productThumbnailInitial } from "@/lib/product-image";

export type ProductThumbnailSize = "xs" | "sm" | "md" | "lg" | "tile";

const BOX: Record<Exclude<ProductThumbnailSize, "tile">, string> = {
  xs: "h-8 w-8 rounded-md text-xs",
  sm: "h-10 w-10 rounded-lg text-sm",
  md: "h-14 w-14 rounded-lg text-lg",
  lg: "h-20 w-20 rounded-xl text-2xl",
};

type ProductThumbnailProps = {
  name: string;
  imageUrl?: string | null;
  size?: ProductThumbnailSize;
  className?: string;
};

export function ProductThumbnail({
  name,
  imageUrl,
  size = "md",
  className = "",
}: ProductThumbnailProps) {
  const showImage = hasProductImage(imageUrl);
  const boxClass =
    size === "tile"
      ? `h-full w-full text-2xl md:text-3xl ${className}`
      : `${BOX[size]} ${className}`;

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br from-amber-50 to-gray-100 ${boxClass}`}
      aria-hidden
    >
      {showImage ? (
        <Image
          src={imageUrl!.trim()}
          alt=""
          fill
          className="object-cover"
          sizes={size === "xs" ? "32px" : size === "sm" ? "40px" : size === "md" ? "56px" : "80px"}
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-servora-yellow/80">
          {productThumbnailInitial(name)}
        </span>
      )}
    </div>
  );
}
