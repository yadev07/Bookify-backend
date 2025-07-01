const rateLimit = require('express-rate-limit');

app.set('trust proxy', 1);  // ✅ Important: To fix X-Forwarded-For Error

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
  standardHeaders: true,    // ✅ Good practice
  legacyHeaders: false,     // ✅ Good practice
}));
