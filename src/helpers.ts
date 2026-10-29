import {Config} from "@/config";

export const shouldIgnoreTax = (): boolean => {
  return Config.ignore_tax;
}

export const formatValue = (value: number | string): number => {
  return parseFloat(parseFloat(value + '').toFixed(2));
}

export const calculateTotalTaxValue = (
  sgst?: number | string,
  cgst?: number | string
): number => {
  if (shouldIgnoreTax()) return 0;

  const sgstValue: number = parseFloat(sgst + '') || 0;
  const cgstValue: number = parseFloat(cgst + '') || 0;

  return formatValue(sgstValue + cgstValue);
}

export const calculateTotalTaxPriceValue = (
  price?: number | string,
  sgst?: number | string,
  cgst?: number | string,
  quantity?: number | string,
): number => {
  const priceValue: number = parseFloat(price + '');
  const quantityValue: number = parseFloat((quantity ?? 1) + '');

  return calculateTotalTaxValue(sgst, cgst) * priceValue * quantityValue / 100;
}

export const calculateTotalValue = (
  price: number | string,
  sgst?: number | string,
  cgst?: number | string,
  quantity?: number | string,
): number => {
  const priceValue: number = parseFloat(price + '');
  const quantityValue: number = parseFloat((quantity ?? 1) + '');

  const itemTotal: number = calculateTotalTaxPriceValue(priceValue, sgst, cgst) + priceValue;
  return formatValue(itemTotal * quantityValue);
}
// Ends the app session and, for SSO users, the identity provider session in the background.
export const LOGOUT_EVENT: string = 'thlush:logout';

export const logout = async (): Promise<void> => {
  // AppShell listens for this and shows a full-screen loader until we navigate away.
  window.dispatchEvent(new Event(LOGOUT_EVENT));

  try {
    const response: Response = await fetch('/api/logout', {method: 'POST'});
    const data: { success: boolean; data?: { idp_logout_url: string | null } } = await response.json();
    const idpLogoutUrl: string | null | undefined = data.data?.idp_logout_url;

    if (idpLogoutUrl) {
      // Cross-site request carrying the IdP session cookie; the response is opaque and not needed.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      await fetch(idpLogoutUrl, {mode: 'no-cors', credentials: 'include', signal: controller.signal})
        .catch(() => undefined)
        .finally(() => clearTimeout(timeout));
    }
  } catch {
    // fall through to the login page
  }

  window.location.href = '/login';
}
