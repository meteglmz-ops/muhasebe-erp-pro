import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoicePdfData {
  company: {
    name: string;
    legalTitle?: string;
    taxOffice?: string;
    taxNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    iban?: string;
    bankInfo?: string;
  };
  customer: {
    title: string;
    taxOffice?: string;
    taxNumber?: string;
    address?: string;
    phone?: string;
  };
  invoice: {
    invoiceNo: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    subtotal: number;
    discountTotal: number;
    vatTotal: number;
    withholdingTotal: number;
    grandTotal: number;
    notes?: string;
    paymentMethod?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    totalAmount: number;
  }>;
}

function cleanTR(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

export class PdfService {
  public static async generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.08, 0.35, 0.65); // Modern Navy Blue
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.5, 0.5, 0.5);
    const lineGray = rgb(0.85, 0.85, 0.85);

    // Header Background Accent Bar
    page.drawRectangle({
      x: 0,
      y: height - 10,
      width: width,
      height: 10,
      color: primaryColor,
    });

    // Company Header Left
    let cursorY = height - 50;
    page.drawText(cleanTR(data.company.name || 'BeeCursor ERP'), {
      x: 40,
      y: cursorY,
      size: 16,
      font: fontBold,
      color: primaryColor,
    });

    cursorY -= 15;
    if (data.company.legalTitle) {
      page.drawText(cleanTR(data.company.legalTitle).substring(0, 50), {
        x: 40,
        y: cursorY,
        size: 8,
        font: fontRegular,
        color: darkGray,
      });
      cursorY -= 12;
    }

    const companyDetails = [
      data.company.address || '',
      `V.D.: ${data.company.taxOffice || '-'}  V.No: ${data.company.taxNumber || '-'}`,
      `Tel: ${data.company.phone || '-'}  E-posta: ${data.company.email || '-'}`,
    ];

    for (const line of companyDetails) {
      if (line) {
        page.drawText(cleanTR(line).substring(0, 60), {
          x: 40,
          y: cursorY,
          size: 8,
          font: fontRegular,
          color: lightGray,
        });
        cursorY -= 12;
      }
    }

    // Invoice Meta Right Box
    const metaX = 400;
    let metaY = height - 50;
    page.drawText('E-FATURA / FATURA', {
      x: metaX,
      y: metaY,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });
    metaY -= 16;

    page.drawText(cleanTR(`Fatura No: ${data.invoice.invoiceNo}`), {
      x: metaX,
      y: metaY,
      size: 9,
      font: fontBold,
      color: darkGray,
    });
    metaY -= 14;

    page.drawText(cleanTR(`Tarih: ${data.invoice.issueDate}`), {
      x: metaX,
      y: metaY,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });
    metaY -= 12;

    page.drawText(cleanTR(`Vade: ${data.invoice.dueDate}`), {
      x: metaX,
      y: metaY,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });

    // Customer Info Card
    cursorY = height - 140;
    page.drawRectangle({
      x: 40,
      y: cursorY - 60,
      width: 515,
      height: 70,
      borderColor: lineGray,
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.99),
    });

    page.drawText('SAYIN (MUSTERI BILGILERI):', {
      x: 50,
      y: cursorY - 5,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(cleanTR(data.customer.title).substring(0, 65), {
      x: 50,
      y: cursorY - 20,
      size: 10,
      font: fontBold,
      color: darkGray,
    });

    const custSub = `${data.customer.address || ''} | V.D: ${data.customer.taxOffice || '-'} V.No: ${data.customer.taxNumber || '-'}`;
    page.drawText(cleanTR(custSub).substring(0, 90), {
      x: 50,
      y: cursorY - 35,
      size: 8,
      font: fontRegular,
      color: lightGray,
    });

    // Items Table Header
    let tableY = cursorY - 90;
    page.drawRectangle({
      x: 40,
      y: tableY - 5,
      width: 515,
      height: 20,
      color: primaryColor,
    });

    page.drawText('#', { x: 45, y: tableY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Urun / Hizmet Aciklamasi', { x: 70, y: tableY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Miktar', { x: 300, y: tableY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Birim Fiyat', { x: 360, y: tableY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('KDV', { x: 440, y: tableY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Toplam', { x: 490, y: tableY, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    // Items Rows
    let itemY = tableY - 22;
    data.items.forEach((item, index) => {
      // Row zebra background
      if (index % 2 === 1) {
        page.drawRectangle({
          x: 40,
          y: itemY - 4,
          width: 515,
          height: 18,
          color: rgb(0.97, 0.97, 0.97),
        });
      }

      page.drawText(String(index + 1), { x: 45, y: itemY, size: 8, font: fontRegular, color: darkGray });
      page.drawText(cleanTR(item.name).substring(0, 45), { x: 70, y: itemY, size: 8, font: fontRegular, color: darkGray });
      page.drawText(cleanTR(`${item.quantity} ${item.unit}`), { x: 300, y: itemY, size: 8, font: fontRegular, color: darkGray });
      page.drawText(`${item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, { x: 360, y: itemY, size: 8, font: fontRegular, color: darkGray });
      page.drawText(`%${item.vatRate}`, { x: 440, y: itemY, size: 8, font: fontRegular, color: darkGray });
      page.drawText(`${item.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cleanTR(data.invoice.currency)}`, { x: 485, y: itemY, size: 8, font: fontBold, color: darkGray });

      itemY -= 20;
    });

    // Divider
    page.drawLine({
      start: { x: 40, y: itemY },
      end: { x: 555, y: itemY },
      color: lineGray,
      thickness: 1,
    });

    // Totals Box
    const totalBoxY = itemY - 20;
    const totalsX = 380;
    const valuesX = 490;

    page.drawText('Ara Toplam:', { x: totalsX, y: totalBoxY, size: 8, font: fontRegular, color: darkGray });
    page.drawText(`${data.invoice.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cleanTR(data.invoice.currency)}`, { x: valuesX, y: totalBoxY, size: 8, font: fontRegular, color: darkGray });

    page.drawText('Iskonto Toplami:', { x: totalsX, y: totalBoxY - 14, size: 8, font: fontRegular, color: darkGray });
    page.drawText(`-${data.invoice.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cleanTR(data.invoice.currency)}`, { x: valuesX, y: totalBoxY - 14, size: 8, font: fontRegular, color: darkGray });

    page.drawText('Hesaplanan KDV:', { x: totalsX, y: totalBoxY - 28, size: 8, font: fontRegular, color: darkGray });
    page.drawText(`${data.invoice.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cleanTR(data.invoice.currency)}`, { x: valuesX, y: totalBoxY - 28, size: 8, font: fontRegular, color: darkGray });

    if (data.invoice.withholdingTotal > 0) {
      page.drawText('Tevkifat / Stopaj:', { x: totalsX, y: totalBoxY - 42, size: 8, font: fontRegular, color: darkGray });
      page.drawText(`-${data.invoice.withholdingTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cleanTR(data.invoice.currency)}`, { x: valuesX, y: totalBoxY - 42, size: 8, font: fontRegular, color: darkGray });
    }

    // Grand Total Accent Box
    const grandY = totalBoxY - (data.invoice.withholdingTotal > 0 ? 62 : 48);
    page.drawRectangle({
      x: totalsX - 10,
      y: grandY - 6,
      width: 185,
      height: 22,
      color: primaryColor,
    });

    page.drawText('GENEL TOPLAM:', { x: totalsX, y: grandY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`${data.invoice.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cleanTR(data.invoice.currency)}`, { x: valuesX - 10, y: grandY, size: 9, font: fontBold, color: rgb(1, 1, 1) });

    // Bank / IBAN Info Left Bottom
    let bottomY = totalBoxY - 30;
    if (data.company.iban) {
      page.drawText('Banka Odeme Bilgileri:', { x: 40, y: bottomY, size: 8, font: fontBold, color: primaryColor });
      bottomY -= 12;
      page.drawText(cleanTR(`Banka: ${data.company.bankInfo || 'Ticari Hesap'}`), { x: 40, y: bottomY, size: 8, font: fontRegular, color: darkGray });
      bottomY -= 12;
      page.drawText(cleanTR(`IBAN: ${data.company.iban}`), { x: 40, y: bottomY, size: 8, font: fontBold, color: darkGray });
      bottomY -= 16;
    }

    if (data.invoice.notes) {
      page.drawText(cleanTR(`Not: ${data.invoice.notes}`).substring(0, 80), { x: 40, y: bottomY, size: 8, font: fontRegular, color: lightGray });
    }

    // Stamp & Signature Area
    page.drawRectangle({
      x: 400,
      y: 60,
      width: 150,
      height: 60,
      borderColor: lineGray,
      borderWidth: 1,
    });
    page.drawText('Kase / Yetkili Imza', { x: 435, y: 105, size: 8, font: fontRegular, color: lightGray });

    // Footer
    page.drawText('Bu belge BeeCursor ERP Muhasebe ve Finans Sistemi tarafindan otomatik uretilmistir.', {
      x: 140,
      y: 30,
      size: 7,
      font: fontRegular,
      color: lightGray,
    });

    return await pdfDoc.save();
  }
}
