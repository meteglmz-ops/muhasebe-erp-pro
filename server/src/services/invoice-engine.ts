export interface RawInvoiceItem {
  id?: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  vatRate: number;
  withholdingRate?: number; // e.g. 50 for 5/10 (%50 of VAT)
}

export interface CalculatedInvoiceItem extends RawInvoiceItem {
  grossAmount: number;
  calculatedDiscount: number;
  netAmount: number;
  calculatedVat: number;
  calculatedWithholding: number;
  totalAmount: number;
}

export interface InvoiceCalculationResult {
  items: CalculatedInvoiceItem[];
  subtotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  withholdingTotal: number;
  exciseTotal: number;
  grandTotal: number;
  grandTotalTRY: number;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export class InvoiceEngine {
  public static calculate(
    items: RawInvoiceItem[],
    exchangeRate: number = 1.0,
    exciseTotal: number = 0.0
  ): InvoiceCalculationResult {
    let subtotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;
    let withholdingTotal = 0;

    const calculatedItems: CalculatedInvoiceItem[] = items.map((item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unitPrice ?? (item as any).unit_price) || 0);
      const productId = item.productId || (item as any).product_id;
      const discountPercent = Number(item.discountPercent ?? (item as any).discount_percent) || 0;
      const discountAmount = Number(item.discountAmount ?? (item as any).discount_amount) || 0;
      const vatRate = Math.max(0, Number(item.vatRate ?? (item as any).vat_rate) || 0);
      const withholdingRate = Math.max(0, Number(item.withholdingRate ?? (item as any).withholding_rate) || 0);
      const gross = round2(quantity * unitPrice);

      let lineDiscount = 0;
      if (discountPercent > 0) {
        lineDiscount = round2(gross * (discountPercent / 100));
      } else if (discountAmount > 0) {
        lineDiscount = round2(Math.min(gross, discountAmount));
      }

      const net = round2(gross - lineDiscount);
      const vat = round2(net * (vatRate / 100));
      const withholding = round2(vat * (withholdingRate / 100));

      const lineTotal = round2(net + vat - withholding);

      subtotal = round2(subtotal + gross);
      discountTotal = round2(discountTotal + lineDiscount);
      vatTotal = round2(vatTotal + vat);
      withholdingTotal = round2(withholdingTotal + withholding);

      return {
        ...item,
        productId,
        name: item.name || (item as any).title || '',
        quantity,
        unitPrice,
        unit: item.unit || 'Adet',
        discountPercent,
        discountAmount,
        vatRate,
        withholdingRate,
        grossAmount: gross,
        calculatedDiscount: lineDiscount,
        netAmount: net,
        calculatedVat: vat,
        calculatedWithholding: withholding,
        totalAmount: lineTotal,
      };
    });

    const netTotal = round2(subtotal - discountTotal);
    const grandTotal = round2(netTotal + vatTotal - withholdingTotal + exciseTotal);
    const grandTotalTRY = round2(grandTotal * (exchangeRate || 1.0));

    return {
      items: calculatedItems,
      subtotal,
      discountTotal,
      netTotal,
      vatTotal,
      withholdingTotal,
      exciseTotal,
      grandTotal,
      grandTotalTRY,
    };
  }
}
