import Joi from "joi";
import { KYC_STATUS } from "../../utils/constants.utility";

// Validation schema for initiating KYC
export const initiateKYCSchema = Joi.object({
  idType: Joi.string()
    .valid("DRIVERS_LICENSE", "PASSPORT", "NATIONAL_ID")
    .required()
    .messages({
      "any.only": "Invalid ID type",
      "any.required": "ID type is required",
    }),
  country: Joi.string().length(2).uppercase().required().messages({
    "string.length": "Country must be a 2-letter ISO code",
    "any.required": "Country is required",
  }),
});

// Validation schema for uploading documents
export const uploadDocumentsSchema = Joi.object({
  verificationId: Joi.string().required().messages({
    "any.required": "Verification ID is required",
  }),
});

// Validation schema for submitting KYC documents
export const submitKYCSchema = Joi.object({
  kycId: Joi.string().required().messages({
    "any.required": "KYC ID is required",
  }),
  idNumber: Joi.string().required().messages({
    "any.required": "ID number is required",
  }),
  documentUrls: Joi.object({
    front: Joi.string().uri().required(),
    back: Joi.string().uri().optional(),
    selfie: Joi.string().uri().required(),
  })
    .required()
    .messages({
      "any.required": "Document URLs are required",
    }),
  personalInfo: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.date().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().optional(),
    postalCode: Joi.string().required(),
    country: Joi.string().length(2).uppercase().required(),
  }).required(),
});

// Validation schema for getting KYC status
export const getKYCStatusSchema = Joi.object({
  userId: Joi.string().optional(),
});

// Validation schema for KYC webhook
export const kycWebhookSchema = Joi.object({
  provider: Joi.string().valid("onfido", "jumio").required(),
});
