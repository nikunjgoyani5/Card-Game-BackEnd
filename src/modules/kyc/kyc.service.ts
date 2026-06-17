import mongoose from "mongoose";
import KYCVerification from "../../models/KYCVerification.model";
import UserModel from "../../models/User.model";
import { CustomError } from "../../utils/customError.utility";
import { KYC_ERROR, KYC_STATUS } from "../../utils/constants.utility";

const ObjectId = mongoose.Types.ObjectId;

class KYCService {
  /**
   * Initiate KYC verification process
   * Creates KYC record and prepares for document upload
   */
  async initiateKYC(userId: string, idType: string, country: string) {
    try {
      // Check if user already has KYC in progress
      const existingKYC = await KYCVerification.findOne({ userId });

      if (existingKYC && existingKYC.status === "PENDING") {
        const error: any = new Error("KYC verification already in progress");
        error.code = KYC_ERROR.PENDING_VERIFICATION;
        throw error;
      }

      if (existingKYC && existingKYC.status === "APPROVED") {
        // Check if still valid
        if (existingKYC.expiresAt && existingKYC.expiresAt > new Date()) {
          const error: any = new Error(
            "KYC verification already approved and valid"
          );
          error.code = KYC_ERROR.ALREADY_VERIFIED;
          throw error;
        }
      }

      // Create or update KYC record
      let kycRecord;
      if (existingKYC) {
        existingKYC.status = "PENDING";
        existingKYC.submittedAt = undefined;
        existingKYC.reviewedAt = undefined;
        existingKYC.expiresAt = undefined;
        await existingKYC.save();
        kycRecord = existingKYC;
      } else {
        kycRecord = await KYCVerification.create({
          userId: new ObjectId(userId),
          level: "BASIC",
          status: "PENDING",
          emailVerified: false,
          phoneVerified: false,
          documents: [],
          dailyWithdrawalLimit: 5000,
          monthlyWithdrawalLimit: 50000,
          lifetimeWithdrawalLimit: 500000,
        });
      }

      return {
        success: true,
        data: {
          verificationId: kycRecord._id.toString(),
          idType,
          country,
          message: "KYC verification initiated. Please upload your documents.",
        },
      };
    } catch (error: any) {
      console.error("Error in initiateKYC:", error);
      throw error;
    }
  }

  /**
   * Upload KYC documents to local storage
   * Saves files to public/kyc/{userId}/ folder
   */
  async uploadDocuments(
    userId: string,
    verificationId: string,
    files: { front?: any; back?: any; selfie?: any }
  ) {
    try {
      const kycRecord = await KYCVerification.findOne({
        _id: new ObjectId(verificationId),
        userId: new ObjectId(userId),
      });

      if (!kycRecord) {
        const error: any = new Error("KYC record not found");
        error.code = "KYC_NOT_FOUND";
        throw error;
      }

      if (kycRecord.status === "APPROVED") {
        const error: any = new Error("KYC already approved");
        error.code = KYC_ERROR.ALREADY_VERIFIED;
        throw error;
      }

      // Build document URLs from uploaded files
      const documentUrls: any = {};
      const baseUrl = `${
        process.env.BASE_URL || "http://localhost:3000"
      }/kyc/${userId}`;

      if (files.front) {
        documentUrls.front = `${baseUrl}/${files.front.filename}`;
      }
      if (files.back) {
        documentUrls.back = `${baseUrl}/${files.back.filename}`;
      }
      if (files.selfie) {
        documentUrls.selfie = `${baseUrl}/${files.selfie.filename}`;
      }

      // Add documents to KYC record
      (kycRecord.documents as any) = [];
      if (documentUrls.front) {
        (kycRecord.documents as any).push({
          type: "ID_CARD",
          fileUrl: documentUrls.front,
          uploadedAt: new Date(),
        });
      }
      if (documentUrls.back) {
        (kycRecord.documents as any).push({
          type: "ID_CARD",
          fileUrl: documentUrls.back,
          uploadedAt: new Date(),
        });
      }
      if (documentUrls.selfie) {
        (kycRecord.documents as any).push({
          type: "ID_CARD",
          fileUrl: documentUrls.selfie,
          uploadedAt: new Date(),
        });
      }

      await kycRecord.save();

      return {
        success: true,
        data: {
          verificationId: kycRecord._id.toString(),
          documentUrls,
          message: "Documents uploaded successfully",
        },
      };
    } catch (error: any) {
      console.error("Error in uploadDocuments:", error);
      throw error;
    }
  }

  /**
   * Generate S3 presigned URLs for document upload
   * DEPRECATED: Now using local file upload
   */
  private async generateUploadUrls(
    kycId: string,
    idType: string
  ): Promise<any> {
    try {
      // In production, use AWS S3 SDK to generate presigned URLs
      // const s3 = new AWS.S3();
      // const uploadUrl = await s3.getSignedUrlPromise('putObject', {
      //   Bucket: process.env.S3_BUCKET,
      //   Key: `kyc/${kycId}/front.jpg`,
      //   Expires: 3600,
      //   ContentType: 'image/jpeg'
      // });

      // Mock URLs for development
      return {
        front: `https://s3.amazonaws.com/kyc-docs/${kycId}/front.jpg?presigned=true`,
        back:
          idType !== "PASSPORT"
            ? `https://s3.amazonaws.com/kyc-docs/${kycId}/back.jpg?presigned=true`
            : undefined,
        selfie: `https://s3.amazonaws.com/kyc-docs/${kycId}/selfie.jpg?presigned=true`,
      };
    } catch (error: any) {
      console.error("Error generating upload URLs:", error);
      throw error;
    }
  }

  /**
   * Submit KYC verification for review
   * Sends documents to KYC provider (Onfido/Jumio)
   */
  async submitKYC(
    userId: string,
    verificationId: string,
    idNumber: string,
    documentUrls: any,
    personalInfo: any
  ) {
    try {
      const kycRecord = await KYCVerification.findOne({
        _id: new ObjectId(verificationId),
        userId: new ObjectId(userId),
      });

      if (!kycRecord) {
        const error: any = new Error("KYC record not found");
        error.code = "KYC_NOT_FOUND";
        throw error;
      }

      if (kycRecord.status === "APPROVED") {
        const error: any = new Error("KYC already approved");
        error.code = KYC_ERROR.ALREADY_VERIFIED;
        throw error;
      }

      if (kycRecord.status === "IN_REVIEW") {
        return {
          success: true,
          data: {
            verificationId: kycRecord._id.toString(),
            status: "IN_REVIEW",
            message:
              "KYC documents submitted for review. This usually takes 24-48 hours.",
          },
        };
      }

      // Submit to KYC provider (Onfido/Jumio)
      const providerResult = await this.submitToKYCProvider(
        verificationId,
        idNumber,
        documentUrls,
        personalInfo
      );

      // Update KYC record with documents
      kycRecord.status = "IN_REVIEW";
      kycRecord.submittedAt = new Date();
      kycRecord.verifiedFirstName = personalInfo.firstName;
      kycRecord.verifiedLastName = personalInfo.lastName;
      kycRecord.verifiedDateOfBirth = personalInfo.dateOfBirth;
      kycRecord.verifiedAddress = {
        street: personalInfo.address,
        city: personalInfo.city,
        state: personalInfo.state || "",
        zipcode: personalInfo.postalCode,
        country: personalInfo.country,
      };

      // Add documents to KYC record
      (kycRecord.documents as any) = [];
      if (documentUrls.front) {
        (kycRecord.documents as any).push({
          type: "ID_CARD",
          fileUrl: documentUrls.front,
          uploadedAt: new Date(),
        });
      }
      if (documentUrls.back) {
        (kycRecord.documents as any).push({
          type: "ID_CARD",
          fileUrl: documentUrls.back,
          uploadedAt: new Date(),
        });
      }
      if (documentUrls.selfie) {
        (kycRecord.documents as any).push({
          type: "ID_CARD",
          fileUrl: documentUrls.selfie,
          uploadedAt: new Date(),
        });
      }

      await kycRecord.save();

      return {
        success: true,
        data: {
          verificationId: kycRecord._id.toString(),
          status: "IN_REVIEW",
          message:
            "KYC documents submitted for review. This usually takes 24-48 hours.",
        },
      };
    } catch (error: any) {
      console.error("Error in submitKYC:", error);
      throw error;
    }
  }

  /**
   * Submit documents to KYC provider (Onfido/Jumio)
   */
  private async submitToKYCProvider(
    verificationId: string,
    idNumber: string,
    documentUrls: any,
    personalInfo: any
  ): Promise<any> {
    try {
      // In production, integrate with Onfido or Jumio API
      // Example with Onfido:
      // const onfido = new Onfido({ apiToken: process.env.ONFIDO_API_KEY });
      // const applicant = await onfido.applicant.create({
      //   firstName: personalInfo.firstName,
      //   lastName: personalInfo.lastName,
      //   dob: personalInfo.dateOfBirth,
      //   address: {
      //     street: personalInfo.address,
      //     town: personalInfo.city,
      //     postcode: personalInfo.postalCode,
      //     country: personalInfo.country,
      //   }
      // });
      // const check = await onfido.check.create({
      //   applicantId: applicant.id,
      //   reportNames: ['identity', 'document'],
      // });

      // Mock response for development
      return {
        verificationId: `VERIFY_${Date.now()}`,
        provider: "ONFIDO",
        status: "pending",
      };
    } catch (error: any) {
      console.error("Error submitting to KYC provider:", error);
      throw error;
    }
  }

  /**
   * Get KYC verification status
   */
  async getKYCStatus(userId: string) {
    try {
      const kycRecord = await KYCVerification.findOne({ userId }).lean();

      if (!kycRecord) {
        return {
          success: true,
          data: {
            status: "NONE",
            level: "NONE",
            message: "KYC verification not started",
            canWithdraw: false,
          },
        };
      }

      // Check if expired
      if (
        kycRecord.expiresAt &&
        kycRecord.expiresAt < new Date() &&
        kycRecord.status === "APPROVED"
      ) {
        return {
          success: true,
          data: {
            status: "EXPIRED",
            level: kycRecord.level,
            message: "KYC verification expired. Please re-verify.",
            canWithdraw: false,
            expiresAt: kycRecord.expiresAt,
          },
        };
      }

      return {
        success: true,
        data: {
          verificationId: kycRecord._id.toString(),
          status: kycRecord.status,
          level: kycRecord.level,
          submittedAt: kycRecord.submittedAt,
          reviewedAt: kycRecord.reviewedAt,
          expiresAt: kycRecord.expiresAt,
          dailyWithdrawalLimit: kycRecord.dailyWithdrawalLimit,
          monthlyWithdrawalLimit: kycRecord.monthlyWithdrawalLimit,
          lifetimeWithdrawalLimit: kycRecord.lifetimeWithdrawalLimit,
          canWithdraw: kycRecord.status === "APPROVED",
          rejectionReason: kycRecord.rejectionReason,
        },
      };
    } catch (error: any) {
      console.error("Error in getKYCStatus:", error);
      throw error;
    }
  }

  /**
   * Handle KYC provider webhook
   * Called when KYC provider completes verification
   */
  async handleKYCWebhook(provider: string, payload: any) {
    try {
      let verificationId: string;
      let verificationStatus: string;
      let rejectionReason: string | undefined;

      // Parse webhook based on provider
      if (provider === "onfido") {
        verificationId = payload.resource?.verificationId;
        const checkStatus = payload.resource?.status;
        verificationStatus =
          checkStatus === "complete" ? "APPROVED" : "REJECTED";
        rejectionReason =
          checkStatus === "complete" ? undefined : payload.resource?.result;
      } else if (provider === "jumio") {
        verificationId = payload.customerId;
        verificationStatus =
          payload.status === "APPROVED" ? "APPROVED" : "REJECTED";
        rejectionReason =
          payload.status === "APPROVED" ? undefined : payload.rejectReason;
      } else {
        throw new CustomError("Unsupported KYC provider", 400);
      }

      // Find and update KYC record
      const kycRecord = await KYCVerification.findById(verificationId);

      if (!kycRecord) {
        console.error(`KYC record not found for ID: ${verificationId}`);
        return { success: false };
      }

      kycRecord.status = verificationStatus as any;
      kycRecord.reviewedAt = new Date();

      if (verificationStatus === "APPROVED") {
        // Set expiry to 2 years from now
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);
        kycRecord.expiresAt = expiryDate;
      } else {
        kycRecord.rejectionReason = rejectionReason;
      }

      await kycRecord.save();

      // Notify user via socket
      this.notifyKYCStatusUpdate(kycRecord.userId.toString(), {
        status: verificationStatus,
        verificationId,
        rejectionReason,
      });

      console.log(`KYC ${verificationId} updated to ${verificationStatus}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error handling KYC webhook:", error);
      throw error;
    }
  }

  /**
   * Notify user of KYC status update via socket
   */
  private notifyKYCStatusUpdate(userId: string, data: any) {
    try {
      const { emitKYCStatusUpdated } = require("../../socket/index");
      emitKYCStatusUpdated(userId, data);

      // Send notification
      const notificationService =
        require("../notification/notification.service").default;
      if (data.status === "APPROVED") {
        notificationService
          .sendNotification(userId, {
            type: "KYC_APPROVED",
            title: "Identity Verified",
            message:
              "Your identity has been verified. You can now withdraw funds.",
            data: {
              verificationId: data.verificationId,
            },
            priority: "HIGH",
          })
          .catch((err: any) => {
            console.error("Error sending KYC approved notification:", err);
          });
      } else {
        notificationService
          .sendNotification(userId, {
            type: "KYC_REJECTED",
            title: "Identity Verification Failed",
            message:
              data.rejectionReason ||
              "Your verification was not successful. Please contact support.",
            data: {
              verificationId: data.verificationId,
              reason: data.rejectionReason,
            },
            priority: "HIGH",
          })
          .catch((err: any) => {
            console.error("Error sending KYC rejected notification:", err);
          });
      }
    } catch (error) {
      console.error("Error emitting KYC status update:", error);
    }
  }
}

export default new KYCService();
