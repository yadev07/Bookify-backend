const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
};

module.exports = errorHandler; 