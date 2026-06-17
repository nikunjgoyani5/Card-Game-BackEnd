export const handleError = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ status: false, message: err.message || 'Server Error' });
};
