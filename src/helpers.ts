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