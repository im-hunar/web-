const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');

describe('History & Health Trends API Tests', () => {
  let patientACookie;
  let patientBCookie;
  let patientAUser;
  let patientBUser;

  beforeEach(async () => {
    store.reset();

    patientAUser = await UserModel.create({
      id: 'patient_a_id',
      email: 'history_a@example.com',
      password: 'Password123!',
      name: 'History Patient A',
      role: ROLES.PATIENT
    });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'history_a@example.com', password: 'Password123!' });
    patientACookie = loginA.headers['set-cookie'];

    patientBUser = await UserModel.create({
      id: 'patient_b_id',
      email: 'history_b@example.com',
      password: 'Password123!',
      name: 'History Patient B',
      role: ROLES.PATIENT
    });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'history_b@example.com', password: 'Password123!' });
    patientBCookie = loginB.headers['set-cookie'];

    // Seed assessments for Patient A
    await store.createAssessment({
      patientId: 'patient_a_id',
      modelInputs: { age: 50, sex: 1, restingBP: 120, cholesterol: 200, fastingBS: 0, maxHR: 150, exerciseAngina: 0, oldpeak: 1.0, chestPainType: 'ATA', stSlope: 'Up' },
      prediction: 0,
      probability: { '0': 0.85, '1': 0.15 },
      timestamp: new Date('2026-09-01T10:00:00Z').toISOString()
    });

    await store.createAssessment({
      patientId: 'patient_a_id',
      modelInputs: { age: 50, sex: 1, restingBP: 135, cholesterol: 230, fastingBS: 1, maxHR: 140, exerciseAngina: 1, oldpeak: 2.1, chestPainType: 'ASY', stSlope: 'Flat' },
      prediction: 1,
      probability: { '0': 0.20, '1': 0.80 },
      timestamp: new Date('2026-09-15T10:00:00Z').toISOString()
    });

    // Seed assessment for Patient B
    await store.createAssessment({
      patientId: 'patient_b_id',
      modelInputs: { age: 62, sex: 0, restingBP: 140, cholesterol: 260, fastingBS: 0, maxHR: 130, exerciseAngina: 0, oldpeak: 0.5, chestPainType: 'NAP', stSlope: 'Up' },
      prediction: 0,
      timestamp: new Date('2026-09-20T10:00:00Z').toISOString()
    });
  });

  describe('GET /api/history', () => {
    it('should return paginated history records for Patient A', async () => {
      const res = await request(app)
        .get('/api/history')
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.records).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.records[0].patientId).toBe('patient_a_id');
    });

    it('should respect sorting (newest vs oldest)', async () => {
      const resNewest = await request(app)
        .get('/api/history?sort=newest')
        .set('Cookie', patientACookie);

      expect(resNewest.statusCode).toBe(200);
      expect(new Date(resNewest.body.records[0].timestamp).getTime()).toBeGreaterThan(
        new Date(resNewest.body.records[1].timestamp).getTime()
      );

      const resOldest = await request(app)
        .get('/api/history?sort=oldest')
        .set('Cookie', patientACookie);

      expect(resOldest.statusCode).toBe(200);
      expect(new Date(resOldest.body.records[0].timestamp).getTime()).toBeLessThan(
        new Date(resOldest.body.records[1].timestamp).getTime()
      );
    });

    it('Test Scenario: Resource ownership - Patient A cannot see Patient B history records', async () => {
      const res = await request(app)
        .get('/api/history')
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(200);
      const bRecords = res.body.records.filter(r => r.patientId === 'patient_b_id');
      expect(bRecords).toHaveLength(0);
    });
  });

  describe('GET /api/trends', () => {
    it('should return aggregated longitudinal metrics for Patient A', async () => {
      const res = await request(app)
        .get('/api/trends?timeframe=all')
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.trends).toHaveLength(2);
      expect(res.body.trends[0]).toHaveProperty('restingBP');
      expect(res.body.trends[0]).toHaveProperty('maxHR');
      expect(res.body.trends[0]).toHaveProperty('cholesterol');
    });
  });
});
