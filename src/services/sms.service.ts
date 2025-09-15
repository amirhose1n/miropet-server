import axios from "axios";

interface SMSResponse {
  status: boolean;
  message: string;
  data?: any;
}

interface SendOTPResponse {
  status: boolean;
  message: string;
  data?: {
    messageId: string;
    cost: number;
    payback: number;
  };
}

class SMSService {
  private apiKey: string;
  private templateId: string;
  private baseURL: string = "https://api.sms.ir/v1";

  constructor() {
    this.apiKey =
      process.env.SMS_IR_API_KEY ||
      "cQCicmk3DounGa8l6THCbCxUaMqtQSYtqlCHB9FPbaLfk5mF";
    this.templateId = process.env.SMS_IR_TEMPLATE_ID || "905649";
  }

  /**
   * Generate a random 5-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  /**
   * Validate Iranian mobile number format
   */
  private validateMobileNumber(mobile: string): boolean {
    // Remove any non-digit characters
    const cleanMobile = mobile.replace(/\D/g, "");

    // Check if it's a valid Iranian mobile number
    // Iranian mobile numbers start with 09 and are 11 digits long
    const iranianMobileRegex = /^09\d{9}$/;

    return iranianMobileRegex.test(cleanMobile);
  }

  /**
   * Format mobile number to standard Iranian format
   */
  private formatMobileNumber(mobile: string): string {
    const cleanMobile = mobile.replace(/\D/g, "");

    // If it starts with +98, replace with 0
    if (cleanMobile.startsWith("98")) {
      return "0" + cleanMobile.substring(2);
    }

    // If it starts with 9, add 0 prefix
    if (cleanMobile.startsWith("9") && cleanMobile.length === 10) {
      return "0" + cleanMobile;
    }

    return cleanMobile;
  }

  /**
   * Send OTP to mobile number
   */
  async sendOTP(mobile: string): Promise<{
    success: boolean;
    otp?: string;
    message: string;
    messageId?: string;
  }> {
    try {
      const formattedMobile = this.formatMobileNumber(mobile);

      if (!this.validateMobileNumber(formattedMobile)) {
        return {
          success: false,
          message: "شماره موبایل وارد شده معتبر نیست",
        };
      }

      const otp = this.generateOTP();

      const response = await axios.post<SendOTPResponse>(
        `${this.baseURL}/send/verify`,
        {
          mobile: formattedMobile,
          templateId: this.templateId,
          parameters: [
            {
              name: "code",
              value: otp,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-api-key": this.apiKey,
          },
          timeout: 10000, // 10 seconds timeout
        }
      );

      if (response.data.status) {
        return {
          success: true,
          otp: otp, // In production, you might want to hash this or store it securely
          message: "کد تایید با موفقیت ارسال شد",
          messageId: response.data.data?.messageId,
        };
      } else {
        return {
          success: false,
          message: response.data.message || "خطا در ارسال پیامک",
        };
      }
    } catch (error: any) {
      console.error("SMS Service Error:", error);

      if (error.response) {
        // API returned an error response
        const errorMessage =
          error.response.data?.message || "خطا در ارتباط با سرویس پیامک";
        return {
          success: false,
          message: errorMessage,
        };
      } else if (error.request) {
        // Network error
        return {
          success: false,
          message: "خطا در ارتباط با سرویس پیامک",
        };
      } else {
        // Other error
        return {
          success: false,
          message: "خطا در ارسال پیامک",
        };
      }
    }
  }

  /**
   * Verify OTP (this is a simple comparison since SMS.ir doesn't provide verification endpoint)
   * In a real application, you should store OTPs securely and verify them
   */
  verifyOTP(sentOTP: string, receivedOTP: string): boolean {
    return sentOTP === receivedOTP;
  }

  /**
   * Get account balance (optional utility method)
   */
  async getBalance(): Promise<{
    success: boolean;
    balance?: number;
    message: string;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/account/balance`, {
        headers: {
          Accept: "text/plain",
          "x-api-key": this.apiKey,
        },
      });

      if (response.data.status) {
        return {
          success: true,
          balance: response.data.data?.balance,
          message: "موجودی دریافت شد",
        };
      } else {
        return {
          success: false,
          message: response.data.message || "خطا در دریافت موجودی",
        };
      }
    } catch (error: any) {
      console.error("SMS Balance Error:", error);
      return {
        success: false,
        message: "خطا در دریافت موجودی",
      };
    }
  }
}

export const smsService = new SMSService();
export default smsService;
