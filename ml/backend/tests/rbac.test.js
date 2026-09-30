const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');

describe('Role-Based Access Control (RBAC) Tests', () => {
  let patientCookie;
  let adminCookie;

  beforeEach(async () => {
    store.reset();

    // 1. Create Patient User
    await UserModel.create({
      email: 'patient_rbac@example.com',
      password: 'Password123!',
      name: 'Patient User',
      role: ROLES.PATIENT
    });

    const patientLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient_rbac@example.com', password: 'Password123!' });
    patientCookie = patientLogin.headers['set-cookie'];

    // 2. Create Admin User
    await UserModel.create({
      email: 'admin_rbac@example.com',
      password: 'Password123!',
      name: 'Admin User',
      role: ROLES.ADMIN
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_rbac@example.com', password: 'Password123!' });
    adminCookie = adminLogin.headers['set-cookie'];
  });

  describe('GET /api/admin/dashboard', () => {
    it('Test Scenario: Wrong role - should return 403 Forbidden when PATIENT attempts to access ADMIN route', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Cookie', patientCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("Role 'PATIENT' is not authorized");
    });

    it('should allow access to ADMIN user', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Cookie', adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Admin dashboard metrics retrieved successfully');
      expect(res.body.stats).toBeDefined();
    });
  });
});
