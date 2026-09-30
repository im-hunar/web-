const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');
const { AlertModel } = require('../src/models/alert.model');

describe('Smart Health Alert Engine API Tests', () => {
  let patientACookie;
  let patientBCookie;
  let doctorCookie;

  beforeEach(async () => {
    store.reset();

    await UserModel.create({
      id: 'patient_alert_a',
      email: 'alert_a@example.com',
      password: 'Password123!',
      name: 'Alert Patient A',
      role: ROLES.PATIENT
    });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alert_a@example.com', password: 'Password123!' });
    patientACookie = loginA.headers['set-cookie'];

    await UserModel.create({
      id: 'patient_alert_b',
      email: 'alert_b@example.com',
      password: 'Password123!',
      name: 'Alert Patient B',
      role: ROLES.PATIENT
    });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alert_b@example.com', password: 'Password123!' });
    patientBCookie = loginB.headers['set-cookie'];

    await UserModel.create({
      id: 'doctor_alert_id',
      email: 'doctor_alert@example.com',
      password: 'Password123!',
      name: 'Dr. Gregory',
      role: ROLES.DOCTOR
    });

    const loginDoc = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor_alert@example.com', password: 'Password123!' });
    doctorCookie = loginDoc.headers['set-cookie'];
  });

  it('should generate REVIEW alert on repeated high-risk assessments', async () => {
    await store.createAssessment({
      patientId: 'patient_alert_a',
      modelInputs: { age: 55, sex: 1, restingBP: 120, cholesterol: 200, fastingBS: 0, maxHR: 140, exerciseAngina: 0, oldpeak: 1.0, chestPainType: 'ATA', stSlope: 'Up' },
      prediction: 1,
      timestamp: new Date(Date.now() - 5000).toISOString()
    });

    const newAssessment = await store.createAssessment({
      patientId: 'patient_alert_a',
      modelInputs: { age: 55, sex: 1, restingBP: 125, cholesterol: 210, fastingBS: 0, maxHR: 135, exerciseAngina: 0, oldpeak: 1.2, chestPainType: 'ATA', stSlope: 'Up' },
      prediction: 1,
      timestamp: new Date().toISOString()
    });

    const { AlertEngine } = require('../src/services/alertEngine.service');
    const generated = await AlertEngine.evaluateNewAssessment('patient_alert_a', newAssessment);

    expect(generated.length).toBeGreaterThan(0);
    expect(generated[0].alertLevel).toBe('REVIEW');
    expect(generated[0].reason).toContain('consecutive higher-risk scores');
  });

  it('should generate NOTICE alert on significant measurement change (BP change >= 20 mm Hg)', async () => {
    await store.createAssessment({
      patientId: 'patient_alert_a',
      modelInputs: { age: 50, sex: 1, restingBP: 110, cholesterol: 200, fastingBS: 0, maxHR: 150, exerciseAngina: 0, oldpeak: 1.0, chestPainType: 'ATA', stSlope: 'Up' },
      prediction: 0,
      timestamp: new Date(Date.now() - 5000).toISOString()
    });

    const newAssessment = await store.createAssessment({
      patientId: 'patient_alert_a',
      modelInputs: { age: 50, sex: 1, restingBP: 135, cholesterol: 200, fastingBS: 0, maxHR: 150, exerciseAngina: 0, oldpeak: 1.0, chestPainType: 'ATA', stSlope: 'Up' },
      prediction: 0,
      timestamp: new Date().toISOString()
    });

    const { AlertEngine } = require('../src/services/alertEngine.service');
    const generated = await AlertEngine.evaluateNewAssessment('patient_alert_a', newAssessment);

    const changeAlert = generated.find(a => a.triggerType === 'SIGNIFICANT_MEASUREMENT_CHANGE');
    expect(changeAlert).toBeDefined();
    expect(changeAlert.alertLevel).toBe('NOTICE');
    expect(changeAlert.reason).toContain('notable change');
  });

  it('Test Scenario: Resource ownership - Patient A cannot view or modify Patient B alerts', async () => {
    const bAlert = await AlertModel.create({
      patientId: 'patient_alert_b',
      alertLevel: 'INFO',
      triggerType: 'CONFIGURED_CONDITION',
      reason: 'Patient B info alert'
    });

    const res = await request(app)
      .patch(`/api/alerts/${bAlert.id}/read`)
      .set('Cookie', patientACookie);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('cannot access another patient\'s alerts');
  });

  it('should mark alert as read and record audit log entry', async () => {
    const alert = await AlertModel.create({
      patientId: 'patient_alert_a',
      alertLevel: 'NOTICE',
      triggerType: 'CONFIGURED_CONDITION',
      reason: 'Patient A notice alert'
    });

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/read`)
      .set('Cookie', patientACookie);

    expect(res.statusCode).toBe(200);
    expect(res.body.alert.read).toBe(true);
    expect(res.body.alert.auditLog.some(e => e.action === 'ALERT_MARKED_READ')).toBe(true);
  });

  it('should allow GET and PUT for alert configuration thresholds', async () => {
    const getRes = await request(app)
      .get('/api/alerts/config')
      .set('Cookie', patientACookie);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.config.systolicBPThreshold).toBe(140);

    const putRes = await request(app)
      .put('/api/alerts/config')
      .set('Cookie', patientACookie)
      .send({ systolicBPThreshold: 135 });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.config.systolicBPThreshold).toBe(135);
  });
});
