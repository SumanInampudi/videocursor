export function productThumbnailInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function hasProductImage(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl?.trim());
}
