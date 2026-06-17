import { Router } from "express";
import kycController, { upload } from "./kyc.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  initiateKYCSchema,
  submitKYCSchema,
  getKYCStatusSchema,
  kycWebhookSchema,
  uploadDocumentsSchema,
} from "./kyc.validation";

const router = Router();

/**
 * POST /api/kyc/initiate
 * Initiate KYC verification process
 */
router.post(
  "/initiate",
  authMiddleware,
  validate(initiateKYCSchema),
  kycController.initiateKYC
);

/**
 * POST /api/kyc/upload
 * Upload KYC documents (front, back, selfie)
 */
router.post(
  "/upload",
  authMiddleware,
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  validate(uploadDocumentsSchema),
  kycController.uploadDocuments
);

/**
 * POST /api/kyc/submit
 * Submit KYC documents for verification
 */
router.post(
  "/submit",
  authMiddleware,
  validate(submitKYCSchema),
  kycController.submitKYC
);

/**
 * GET /api/kyc/status
 * Get KYC verification status
 */
router.get("/status", authMiddleware, kycController.getKYCStatus);

/**
 * POST /api/kyc/webhook/:provider
 * Webhook endpoint for KYC providers (Onfido, Jumio)
 * No authentication required
 */
router.post("/webhook/:provider", kycController.handleWebhook);

export default router;
