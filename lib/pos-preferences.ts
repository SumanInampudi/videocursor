export const POS_STAY_AFTER_CHECKOUT_KEY = "servora-pos-stay-after-checkout";

export function getStayOnPosAfterCheckout(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(POS_STAY_AFTER_CHECKOUT_KEY) !== "false";
}

export function setStayOnPosAfterCheckout(stay: boolean) {
  localStorage.setItem(POS_STAY_AFTER_CHECKOUT_KEY, stay ? "true" : "false");
}
