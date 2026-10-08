export interface EInvoiceDocument {
  uuid: string;
  invoiceNumber: string;
  issueDate: string;
  senderTaxNumber: string;
  receiverTaxNumber: string;
  currency: string;
  payableAmount: number;
  ublXml?: string;
}

export interface EInvoiceSendResult {
  success: boolean;
  uuid: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
  statusDescription?: string;
  gibTrackCode?: string;
}

export interface IInvoiceProvider {
  name: string;
  validateCredentials(): Promise<boolean>;
  sendInvoice(invoice: EInvoiceDocument): Promise<EInvoiceSendResult>;
  queryStatus(uuid: string): Promise<EInvoiceSendResult>;
  getInvoiceHtml(uuid: string): Promise<string>;
}

export class MockGIBInvoiceProvider implements IInvoiceProvider {
  name = 'GIB & Uyumsoft/Logo Mock Provider';

  async validateCredentials(): Promise<boolean> {
    return true;
  }

  async sendInvoice(invoice: EInvoiceDocument): Promise<EInvoiceSendResult> {
    return {
      success: true,
      uuid: invoice.uuid,
      status: 'ACCEPTED',
      statusDescription: 'GİB e-Fatura merkezine başarıyla iletildi.',
      gibTrackCode: 'GIB' + Date.now(),
    };
  }

  async queryStatus(uuid: string): Promise<EInvoiceSendResult> {
    return {
      success: true,
      uuid,
      status: 'ACCEPTED',
      statusDescription: 'Alıcıya ulaştı ve 1300 kodu ile onaylandı.',
    };
  }

  async getInvoiceHtml(uuid: string): Promise<string> {
    return `<div>E-Fatura Önizleme - Belge UUID: ${uuid}</div>`;
  }
}
