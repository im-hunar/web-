const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');

describe('Authentication API Tests', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with hashed password and return user object without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'patient1@example.com',
          password: 'securePassword123',
          name: 'John Patient',
          role: ROLES.PATIENT
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('patient1@example.com');
      expect(res.body.user.role).toBe(ROLES.PATIENT);
      expect(res.body.user.password).toBeUndefined(); // Never expose password in response!

      // Verify stored password is hashed, not plaintext
      const storedUser = await store.findUserByEmail('patient1@example.com');
      expect(storedUser.password).not.toBe('securePassword123');
      expect(storedUser.password.startsWith('$2a$') || storedUser.password.startsWith('$2b$')).toBe(true);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
          name: 'Invalid User'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await UserModel.create({
        email: 'validuser@example.com',
        password: 'correctPassword123',
        name: 'Valid User',
        role: ROLES.PATIENT
      });
    });

    it('Test Scenario: Valid login - should authenticate and set HTTP-only cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'validuser@example.com',
          password: 'correctPassword123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user.email).toBe('validuser@example.com');
      expect(res.body.user.password).toBeUndefined();

      // Check HTTP-only auth_token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find(c => c.startsWith('auth_token='));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
    });

    it('Test Scenario: Invalid login - should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'validuser@example.com',
          password: 'wrongPassword123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('Test Scenario: Invalid login - should reject non-existent user email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'somePassword123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the HTTP-only auth_token cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find(c => c.startsWith('auth_token='));
      expect(authCookie).toContain('auth_token=;'); // Cookie cleared
    });
  });

  describe('GET /api/auth/me (Protected route test)', () => {
    it('Test Scenario: Protected route - should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('Test Scenario: Protected route - should allow authenticated request with valid cookie', async () => {
      const createdUser = await UserModel.create({
        email: 'loggeduser@example.com',
        password: 'Password123!',
        name: 'Logged User',
        role: ROLES.PATIENT
      });

      // Login to get cookie
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loggeduser@example.com',
          password: 'Password123!'
        });

      const cookies = loginRes.headers['set-cookie'];

      // Access protected route passing cookie
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(meRes.statusCode).toBe(200);
      expect(meRes.body.user.email).toBe('loggeduser@example.com');
      expect(meRes.body.user.id).toBe(createdUser.id);
    });
  });
});
