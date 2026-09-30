const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');

describe('Resource Ownership Authorization Tests', () => {
  let patientACookie;
  let patientBCookie;
  let doctorCookie;
  let patientAUser;
  let patientBUser;

  beforeEach(async () => {
    store.reset();

    // Create Patient A
    patientAUser = await UserModel.create({
      id: 'patient_alpha_id',
      email: 'patientA@example.com',
      password: 'Password123!',
      name: 'Patient Alpha',
      role: ROLES.PATIENT
    });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patientA@example.com', password: 'Password123!' });
    patientACookie = loginA.headers['set-cookie'];

    // Create Patient B
    patientBUser = await UserModel.create({
      id: 'patient_beta_id',
      email: 'patientB@example.com',
      password: 'Password123!',
      name: 'Patient Beta',
      role: ROLES.PATIENT
    });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patientB@example.com', password: 'Password123!' });
    patientBCookie = loginB.headers['set-cookie'];

    // Create Doctor
    await UserModel.create({
      id: 'doctor_id',
      email: 'doctor@example.com',
      password: 'Password123!',
      name: 'Dr. House',
      role: ROLES.DOCTOR
    });

    const loginDoc = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@example.com', password: 'Password123!' });
    doctorCookie = loginDoc.headers['set-cookie'];
  });

  describe('GET /api/patients/:patientId/data', () => {
    it('should allow Patient A to access their own patient data', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientAUser.id}/data`)
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Patient data retrieved successfully');
      expect(res.body.data.patientId).toBe(patientAUser.id);
    });

    it('Test Scenario: Unauthorized resource access - should deny Patient A from accessing Patient B data with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientBUser.id}/data`)
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('You are not authorized to access another patient\'s data');
    });

    it('should allow DOCTOR to access any patient data', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientBUser.id}/data`)
        .set('Cookie', doctorCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.patientId).toBe(patientBUser.id);
    });
  });
});
