import { Response } from "express";

/* =========================================================
   📦 SUCCESS RESPONSE (PRODUCTION STANDARD)
========================================================= */
export const success = (
  res: Response,
  data: any = null,
  message = "success",
  meta: Record<string, any> = {}
) => {
  return res.status(200).json({
    success: true,
    message,
    data: data ?? null,
    meta,
    timestamp: new Date().toISOString(),
  });
};

/* =========================================================
   ❌ ERROR RESPONSE (STANDARDIZED)
========================================================= */
export const fail = (
  res: Response,
  message = "Something went wrong",
  code = 500,
  meta: Record<string, any> = {}
) => {
  return res.status(code).json({
    success: false,
    message,
    data: null,
    meta,
    timestamp: new Date().toISOString(),
  });
};

/* =========================================================
   ⚠️ VALIDATION ERROR (SPECIAL CASE)
========================================================= */
export const validationFail = (
  res: Response,
  errors: any,
  message = "Validation failed"
) => {
  return res.status(400).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/* =========================================================
   🧠 NOT FOUND RESPONSE
========================================================= */
export const notFound = (
  res: Response,
  message = "Resource not found"
) => {
  return res.status(404).json({
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  });
};