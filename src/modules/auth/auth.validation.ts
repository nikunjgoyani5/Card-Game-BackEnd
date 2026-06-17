import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  location: Joi.string().required(),
  state: Joi.string().required(),
  phone: Joi.string().required(),
  street: Joi.string().required(),
  city: Joi.string().required(),
  zipcode: Joi.string().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
export const googleLoginSchema = Joi.object({
  googleId: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
});

export const profileUpdateSchema = Joi.object({
  email: Joi.string().email().optional(),
  location: Joi.string().optional(),
  state: Joi.string().optional(),
  phone: Joi.string().optional(),
  street: Joi.string().optional(),
  city: Joi.string().optional(),
  zipcode: Joi.string().optional(),
});
