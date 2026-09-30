const jwt = require('jsonwebtoken');
const { UserModel } = require('../models/user.model');
const config = require('../config/config');

const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email address' });
    }

    const user = await UserModel.create({ email, password, name, role });

    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await UserModel.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    // Set secure HTTP-only cookie
    const isProd = config.nodeEnv === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      token, // Exposed for client convenience/API calls if needed, primary auth via HTTP-only cookie
      user: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const isProd = config.nodeEnv === 'production';
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax'
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

const demoSwitch = async (req, res, next) => {
  try {
    const { role = 'PATIENT' } = req.body;
    const store = require('../db/store');
    let targetEmail = role === 'CAREGIVER' ? 'john.doe@example.com' : 'patienta@example.com';
    let user = await UserModel.findByEmail(targetEmail);
    if (!user) {
      await store.seedDefaultData();
      user = await UserModel.findByEmail(targetEmail);
    }

    if (!user) {
      return res.status(404).json({ error: `User with role ${role} not found` });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    const isProd = config.nodeEnv === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: `Switched session to ${user.name} (${user.role})`,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  demoSwitch
};
