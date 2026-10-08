// Client-side Gmail Service for Hashtag Pizza Birgunj
// Adheres to AI Studio rule: Google Workspace OAuth must be client-side only (no server-side redirect flows or client secrets)

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyText: string;
  htmlBody?: string;
}

export const gmailService = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('google_workspace_access_token');
  },

  hasGmailAccess(): boolean {
    return !!this.getAccessToken();
  },

  /**
   * Encodes email headers and body into base64url format required by Gmail API
   */
  encodeMessage(to: string, from: string, subject: string, bodyText: string, htmlBody?: string): string {
    const boundary = 'hashtag_pizza_mail_boundary_' + Date.now().toString(36);
    
    let rawMail = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      htmlBody
        ? `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n` +
          `--${boundary}\r\n` +
          'Content-Type: text/plain; charset="UTF-8"\r\n\r\n' +
          `${bodyText}\r\n\r\n` +
          `--${boundary}\r\n` +
          'Content-Type: text/html; charset="UTF-8"\r\n\r\n' +
          `${htmlBody}\r\n\r\n` +
          `--${boundary}--`
        : 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n' + bodyText,
    ].join('\r\n');

    // Base64URL encode without padding
    return btoa(unescape(encodeURIComponent(rawMail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  },

  /**
   * Sends an email directly via the official Gmail API (users.messages.send)
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const token = this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: 'Please sign in with Google to grant Gmail authorization.',
      };
    }

    try {
      const raw = this.encodeMessage(
        params.to,
        'me',
        params.subject,
        params.bodyText,
        params.htmlBody
      );

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMessage = errorData?.error?.message || response.statusText;
        console.warn('Gmail API request failed:', errMessage);
        return { success: false, error: errMessage };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (err: any) {
      console.error('Failed to send email via Gmail API:', err);
      return { success: false, error: err?.message || 'Network error while contacting Gmail' };
    }
  },

  /**
   * Helper to send Order Receipt to customer and store
   */
  async sendOrderConfirmationEmail(orderData: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    serviceType: string;
    itemsSummary: string;
    total: number;
    deliveryAddress?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const subject = `Order Confirmation #${orderData.orderId} — Hashtag Pizza Birgunj`;
    const bodyText = `
Namaste ${orderData.customerName},

Thank you for your order at Hashtag Pizza Birgunj!

Order ID: ${orderData.orderId}
Service Mode: ${orderData.serviceType}
Items: ${orderData.itemsSummary}
Total Payable: Rs. ${orderData.total}
${orderData.deliveryAddress ? `Delivery Address: ${orderData.deliveryAddress}` : ''}
Phone: ${orderData.customerPhone}

Our conveyor oven kitchen is firing up your order!
Location: Shop No. 01, Ground Floor, RB Complex, Loharpatti, Adarshnagar, Birgunj
Contact: 9861370721 / 051-591718

Think Food, Think Hashtag Pizza!
    `.trim();

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <div style="background: #164699; padding: 16px; border-radius: 8px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Hashtag Pizza Birgunj</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #ffd700;">Think Food, Think Hashtag Pizza</p>
        </div>
        <div style="padding: 20px 0;">
          <h2 style="color: #111827; font-size: 18px; margin-top: 0;">Order Confirmed! #${orderData.orderId}</h2>
          <p style="color: #4b5563; font-size: 14px;">Namaste <strong>${orderData.customerName}</strong>, your order has been received by our kitchen.</p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0; font-size: 13px;"><strong>Mode:</strong> ${orderData.serviceType}</p>
            <p style="margin: 5px 0; font-size: 13px;"><strong>Items:</strong> ${orderData.itemsSummary}</p>
            ${orderData.deliveryAddress ? `<p style="margin: 5px 0; font-size: 13px;"><strong>Delivery Location:</strong> ${orderData.deliveryAddress}</p>` : ''}
            <p style="margin: 5px 0; font-size: 13px;"><strong>Phone:</strong> ${orderData.customerPhone}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;" />
            <p style="margin: 5px 0; font-size: 16px; color: #e31b23; font-weight: bold;"><strong>Total Payable:</strong> Rs. ${orderData.total}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px;">RB Complex, Loharpatti, Adarshnagar, Birgunj · Hotline: 9861370721 / 051-591718</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: orderData.customerEmail,
      subject,
      bodyText,
      htmlBody,
    });
  },
};
