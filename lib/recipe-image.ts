export function recipeThumbnailInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function hasRecipeImage(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl?.trim());
}
