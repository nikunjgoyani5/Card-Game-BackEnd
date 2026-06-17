export const success = (res, message = 'Success', data = {}, code = 200) =>
  res.status(code).json({ status: true, message, data });

export const fail = (res, message = 'Failure', code = 400, data = {}) =>
  res.status(code).json({ status: false, message, data });
