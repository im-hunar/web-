const { z } = require('zod');
const { ROLES } = require('../models/user.model');

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  name: z.string().min(1, { message: 'Name is required' }),
  role: z.nativeEnum(ROLES).optional().default(ROLES.PATIENT)
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(1, { message: 'Password is required' })
});

const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issueMessages = result.error.errors.map(err => err.message).join(', ');
    return res.status(400).json({
      error: `Validation Error: ${issueMessages}`,
      details: result.error.errors
    });
  }
  req.body = result.data;
  next();
};

module.exports = {
  validateRegister: validateBody(registerSchema),
  validateLogin: validateBody(loginSchema)
};
