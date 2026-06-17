import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { fail } from "../utils/apiResponse.utility";

export const validate =
  (schema: ObjectSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req.method === "GET" ? req.query : req.body; // Use query for GET, body for others
    const { error, value } = schema.validate(dataToValidate);
    if (error) {
      return fail(res, error.details[0].message, 400, {});
    }
    // Apply validated values with defaults back to req
    if (req.method === "GET") {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };

export const validateParams =
  (schema: ObjectSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return fail(res, error.details[0].message, 400, {});
    }
    next();
  };
