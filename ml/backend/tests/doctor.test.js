const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');
const { DoctorModel } = require('../src/models/doctor.model');

describe('Doctor Dashboard Backend API Tests', () => {
  let doctorCookie;
  let patientACookie;
  let doctorUser;
  let patientAUser;
  let patientBUser;

  beforeEach(async () => {
    store.reset();

    doctorUser = await UserModel.create({
      id: 'doc_id_101',
      email: 'doctor101@example.com',
      password: 'Password123!',
      name: 'Dr. Strange',
      role: ROLES.DOCTOR
    });

    const loginDoc = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor101@example.com', password: 'Password123!' });
    doctorCookie = loginDoc.headers['set-cookie'];

    patientAUser = await UserModel.create({
      id: 'patient_authorized_a',
      email: 'patient_doc_a@example.com',
      password: 'Password123!',
      name: 'Authorized Patient A',
      role: ROLES.PATIENT
    });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient_doc_a@example.com', password: 'Password123!' });
    patientACookie = loginA.headers['set-cookie'];

    patientBUser = await UserModel.create({
      id: 'patient_unauthorized_b',
      email: 'patient_doc_b@example.com',
      password: 'Password123!',
      name: 'Unauthorized Patient B',
      role: ROLES.PATIENT
    });

    // Grant Doctor access ONLY to Patient A
    await DoctorModel.setPermission({
      doctorId: doctorUser.id,
      patientId: patientAUser.id,
      status: 'AUTHORIZED'
    });
  });

  describe('GET /api/doctor/patients', () => {
    it('should return only authorized patients for the logged-in doctor', async () => {
      const res = await request(app)
        .get('/api/doctor/patients')
        .set('Cookie', doctorCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.patients[0].id).toBe(patientAUser.id);
    });

    it('should support patient search filtering by name', async () => {
      const res = await request(app)
        .get('/api/doctor/patients?search=Authorized')
        .set('Cookie', doctorCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);

      const resEmpty = await request(app)
        .get('/api/doctor/patients?search=NonExistent')
        .set('Cookie', doctorCookie);

      expect(resEmpty.statusCode).toBe(200);
      expect(resEmpty.body.count).toBe(0);
    });
  });

  describe('GET /api/doctor/patients/:patientId/summary (Backend Auth Check)', () => {
    it('Test Scenario: Authorized Doctor access - should return patient summary for authorized patient', async () => {
      const res = await request(app)
        .get(`/api/doctor/patients/${patientAUser.id}/summary`)
        .set('Cookie', doctorCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.patient.id).toBe(patientAUser.id);
      expect(res.body).toHaveProperty('assessments');
      expect(res.body).toHaveProperty('trends');
      expect(res.body).toHaveProperty('alerts');
    });

    it('Test Scenario: Backend Authorization Enforced - should return 403 Forbidden for unauthorized patient', async () => {
      const res = await request(app)
        .get(`/api/doctor/patients/${patientBUser.id}/summary`)
        .set('Cookie', doctorCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Doctor is not authorized to access this patient\'s records');
    });
  });

  describe('POST /api/doctor/patients/:patientId/consultations', () => {
    it('should record consultation notes and follow-up date for authorized patient', async () => {
      const res = await request(app)
        .post(`/api/doctor/patients/${patientAUser.id}/consultations`)
        .set('Cookie', doctorCookie)
        .send({
          notes: 'Patient resting parameters within target clinical range. Routine review completed.',
          followUpDate: '2026-10-15',
          observations: 'Observed normal S1/S2 heart sounds with no peripheral edema.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.consultation).toHaveProperty('id');
      expect(res.body.consultation.notes).toContain('Patient resting parameters within target');
      expect(res.body.consultation.followUpDate).toBe('2026-10-15');
    });

    it('should reject consultation creation for unauthorized patient with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/doctor/patients/${patientBUser.id}/consultations`)
        .set('Cookie', doctorCookie)
        .send({
          notes: 'Attempting unauthorized note write'
        });

      expect(res.statusCode).toBe(403);
    });
  });
});
