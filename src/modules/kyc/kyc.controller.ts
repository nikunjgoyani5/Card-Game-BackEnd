import { Request, Response } from "express";
import kycService from "./kyc.service";
import { asyncHandler } from "../../utils/asyncHandler.utility";
import { success } from "../../utils/apiResponse.utility";
import { KYC_ERROR } from "../../utils/constants.utility";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = (req as any).user?._id.toString();
    const uploadDir = path.join(__dirname, "../../../public/kyc", userId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const fieldname = file.fieldname; // front, back, or selfie
    cb(null, `${fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

class KYCController {
  /**
   * Initiate KYC verification
   * POST /api/kyc/initiate
   */
  initiateKYC = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { idType, country } = req.body;

    const result = await kycService.initiateKYC(userId, idType, country);

    return success(
      res,
      "KYC verification initiated. Please upload your documents.",
      result.data
    );
  });

  /**
   * Upload KYC documents
   * POST /api/kyc/upload
   */
  uploadDocuments = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id.toString();
    const { verificationId } = req.body;
    const files = req.files as any;
    console.log("Filesss", files);

    if (!files || (!files.front && !files.selfie)) {
      return res.status(400).json({
        success: false,
        message: "At least front ID and selfie are required",
      });
    }

    const result = await kycService.uploadDocuments(userId, verificationId, {
      front: files.front?.[0],
      back: files.back?.[0],
      selfie: files.selfie?.[0],
    });

    return success(res, "Documents uploaded successfully", result.data);
  });

  /**
   * Submit KYC documents
   * POST /api/kyc/submit
   */
  submitKYC = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id.toString();
    const { kycId, idNumber, documentUrls, personalInfo } = req.body;

    const result = await kycService.submitKYC(
      userId,
      kycId,
      idNumber,
      documentUrls,
      personalInfo
    );

    return success(res, "KYC documents submitted successfully", result.data);
  });

  /**
   * Get KYC status
   * GET /api/kyc/status
   */
  getKYCStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    const result = await kycService.getKYCStatus(userId);

    return success(res, "KYC status retrieved successfully", result.data);
  });

  /**
   * Handle KYC provider webhook
   * POST /api/kyc/webhook/:provider
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const payload = req.body;

    const result = await kycService.handleKYCWebhook(provider, payload);

    return res.status(200).json({ received: true });
  });
}

export default new KYCController();
