const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');
const { CaregiverPermissionModel } = require('../src/models/caregiverPermission.model');

describe('Caregiver Access and Privacy Controls API Tests', () => {
  let patientAUser, patientBUser, caregiverUser, unauthorizedCaregiver;
  let patientACookie, patientBCookie, caregiverCookie, unauthorizedCaregiverCookie;

  beforeEach(async () => {
    store.reset();

    // 1. Create Patient A
    patientAUser = await UserModel.create({
      id: 'patient_a_id',
      email: 'patientA@example.com',
      password: 'Password123!',
      name: 'Alice Patient',
      role: ROLES.PATIENT
    });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patientA@example.com', password: 'Password123!' });
    patientACookie = loginA.headers['set-cookie'];

    // 2. Create Patient B
    patientBUser = await UserModel.create({
      id: 'patient_b_id',
      email: 'patientB@example.com',
      password: 'Password123!',
      name: 'Bob Patient',
      role: ROLES.PATIENT
    });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patientB@example.com', password: 'Password123!' });
    patientBCookie = loginB.headers['set-cookie'];

    // 3. Create Caregiver (John Doe)
    caregiverUser = await UserModel.create({
      id: 'caregiver_john_id',
      email: 'john.doe@example.com',
      password: 'Password123!',
      name: 'John Doe',
      role: ROLES.CAREGIVER
    });

    const loginCaregiver = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.doe@example.com', password: 'Password123!' });
    caregiverCookie = loginCaregiver.headers['set-cookie'];

    // 4. Create an unrelated Caregiver
    unauthorizedCaregiver = await UserModel.create({
      id: 'caregiver_unauthorized_id',
      email: 'unauthorized@example.com',
      password: 'Password123!',
      name: 'Stranger Caregiver',
      role: ROLES.CAREGIVER
    });

    const loginUnauthorized = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unauthorized@example.com', password: 'Password123!' });
    unauthorizedCaregiverCookie = loginUnauthorized.headers['set-cookie'];

    // Seed medical data for Patient A
    await store.createAssessment({
      patientId: 'patient_a_id',
      modelInputs: { age: 52, sex: 1, restingBP: 130, cholesterol: 210, fastingBS: 0, maxHR: 145, exerciseAngina: 0, oldpeak: 1.0, chestPainType: 'ATA', stSlope: 'Up' },
      prediction: 0,
      probability: { '0': 0.82, '1': 0.18 },
      timestamp: new Date().toISOString()
    });

    await store.createAlert({
      patientId: 'patient_a_id',
      alertLevel: 'NOTICE',
      triggerType: 'BP_ELEVATION',
      reason: 'Systolic blood pressure elevated to 130 mm Hg.'
    });

    await store.createReminder({
      patientId: 'patient_a_id',
      title: 'Take Blood Pressure Medication',
      dueDate: new Date().toISOString(),
      type: 'Medication'
    });

    await store.createReport({
      patientId: 'patient_a_id',
      title: 'Cardiac Evaluation Summary',
      doctorName: 'Dr. Specialist',
      date: new Date().toISOString(),
      summary: 'Patient cardiovascular indicators are stable.',
      diagnosis: 'Pre-hypertension'
    });
  });

  describe('Caregiver Invitation & Default Permission (NO ACCESS)', () => {
    it('should allow patient to invite trusted caregiver with default NO ACCESS permissions', async () => {
      const res = await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({
          email: 'john.doe@example.com',
          name: 'John Doe'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.permission).toHaveProperty('id');
      expect(res.body.permission.caregiverName).toBe('John Doe');
      expect(res.body.permission.status).toBe('ACTIVE');

      // Default permission: NO ACCESS
      expect(res.body.permission.permissions).toEqual({
        assessments: false,
        trends: false,
        alerts: false,
        reminders: false,
        reports: false
      });
    });

    it('should enforce NO ACCESS by default across all resources for invited caregiver', async () => {
      // Invite John Doe with default NO ACCESS
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      // 1. Caregiver attempts to access Assessments -> 403
      const asmRes = await request(app)
        .get(`/api/history?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(asmRes.statusCode).toBe(403);
      expect(asmRes.body.error).toContain('assessments');

      // 2. Caregiver attempts to access Trends -> 403
      const trendsRes = await request(app)
        .get(`/api/trends?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(trendsRes.statusCode).toBe(403);
      expect(trendsRes.body.error).toContain('trends');

      // 3. Caregiver attempts to access Alerts -> 403
      const alertsRes = await request(app)
        .get(`/api/alerts?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(alertsRes.statusCode).toBe(403);
      expect(alertsRes.body.error).toContain('alerts');

      // 4. Caregiver attempts to access Reminders -> 403
      const remindersRes = await request(app)
        .get(`/api/reminders?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(remindersRes.statusCode).toBe(403);
      expect(remindersRes.body.error).toContain('Reminders');

      // 5. Caregiver attempts to access Medical Reports -> 403
      const reportsRes = await request(app)
        .get(`/api/reports?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(reportsRes.statusCode).toBe(403);
      expect(reportsRes.body.error).toContain('Medical Reports');
    });
  });

  describe('Explicit Permission Granting (Patient Controls What Caregiver Can See)', () => {
    beforeEach(async () => {
      // Invite caregiver first
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });
    });

    it('should grant Assessments and Trends while keeping Reports denied (✓ Assessments, ✓ Trends, ✗ Reports)', async () => {
      // Patient explicitly grants Assessments and Trends
      const updateRes = await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientACookie)
        .send({
          permissions: {
            assessments: true,
            trends: true,
            reports: false,
            alerts: false,
            reminders: false
          }
        });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.permission.permissions.assessments).toBe(true);
      expect(updateRes.body.permission.permissions.trends).toBe(true);
      expect(updateRes.body.permission.permissions.reports).toBe(false);

      // Caregiver CAN access Assessments
      const asmRes = await request(app)
        .get(`/api/history?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(asmRes.statusCode).toBe(200);
      expect(asmRes.body.records).toBeDefined();

      // Caregiver CAN access Trends
      const trendsRes = await request(app)
        .get(`/api/trends?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(trendsRes.statusCode).toBe(200);
      expect(trendsRes.body.trends).toBeDefined();

      // Caregiver CANNOT access Reports (reports: false)
      const reportsRes = await request(app)
        .get(`/api/reports?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(reportsRes.statusCode).toBe(403);
      expect(reportsRes.body.error).toContain('Medical Reports');
    });
  });

  describe('Revoking Access at Any Time', () => {
    beforeEach(async () => {
      // Invite and grant assessments
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientACookie)
        .send({
          permissions: { assessments: true, trends: true }
        });
    });

    it('should allow patient to revoke caregiver access at any time', async () => {
      // Revoke access
      const revokeRes = await request(app)
        .post(`/api/privacy/caregivers/${caregiverUser.id}/revoke`)
        .set('Cookie', patientACookie);

      expect(revokeRes.statusCode).toBe(200);
      expect(revokeRes.body.permission.status).toBe('REVOKED');
      expect(revokeRes.body.permission.permissions.assessments).toBe(false);

      // Verify immediate revocation enforcement
      const asmRes = await request(app)
        .get(`/api/history?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(asmRes.statusCode).toBe(403);
      expect(asmRes.body.error).toContain('assessments');
    });
  });

  describe('Caregiver Prohibitions (Caregiver Cannot)', () => {
    beforeEach(async () => {
      // Grant permissions to caregiver
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientACookie)
        .send({
          permissions: { assessments: true, trends: true, reports: true, alerts: true, reminders: true }
        });
    });

    it('Caregiver cannot run assessments on behalf of patient', async () => {
      const res = await request(app)
        .post('/api/assessment')
        .set('Cookie', caregiverCookie)
        .send({
          age: 50,
          sex: 1,
          restingBP: 120,
          cholesterol: 200,
          fastingBS: 0,
          maxHR: 150,
          exerciseAngina: 0,
          oldpeak: 1.0,
          chestPainType: 'ATA',
          stSlope: 'Up'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Caregivers cannot run assessments on behalf of patients');
    });

    it('Caregiver cannot modify medical records or create reports', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', caregiverCookie)
        .send({
          patientId: patientAUser.id,
          title: 'Forged Medical Report',
          summary: 'Attempted record tampering'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Caregivers cannot modify medical records');
    });

    it('Caregiver cannot change patient information or alert configurations', async () => {
      const res = await request(app)
        .put('/api/alerts/config')
        .set('Cookie', caregiverCookie)
        .send({
          patientId: patientAUser.id,
          systolicBPThreshold: 180
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Caregivers cannot change patient information');
    });

    it('Caregiver cannot grant permissions to others', async () => {
      const res = await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', caregiverCookie)
        .send({
          email: 'thirdparty@example.com',
          name: 'Third Party'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Caregivers cannot grant permissions to others');
    });
  });

  describe('Audit Logging', () => {
    it('Every permission change, invite, and revocation must create an audit log', async () => {
      // 1. Invite
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      // 2. Update permissions
      await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientACookie)
        .send({
          permissions: { assessments: true, trends: true }
        });

      // 3. Revoke access
      await request(app)
        .post(`/api/privacy/caregivers/${caregiverUser.id}/revoke`)
        .set('Cookie', patientACookie);

      // Verify audit logs
      const auditRes = await request(app)
        .get('/api/privacy/audit-logs')
        .set('Cookie', patientACookie);

      expect(auditRes.statusCode).toBe(200);
      expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(3);

      const actions = auditRes.body.logs.map(l => l.action);
      expect(actions).toContain('CAREGIVER_INVITED');
      expect(actions).toContain('CAREGIVER_PERMISSIONS_UPDATED');
      expect(actions).toContain('CAREGIVER_ACCESS_REVOKED');
    });
  });

  describe('IDOR & Unauthorized Resource Access Protection', () => {
    beforeEach(async () => {
      // Grant John Doe permission ONLY for Patient A
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientACookie)
        .send({
          permissions: { assessments: true, trends: true }
        });
    });

    it('should deny caregiver from accessing Patient B data when only authorized for Patient A (IDOR Protection)', async () => {
      // Caregiver John Doe attempts to access Patient B assessments
      const res = await request(app)
        .get(`/api/history?patientId=${patientBUser.id}`)
        .set('Cookie', caregiverCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should deny unauthorized caregiver from accessing Patient A data', async () => {
      // Unauthorized caregiver attempts to access Patient A assessments
      const res = await request(app)
        .get(`/api/history?patientId=${patientAUser.id}`)
        .set('Cookie', unauthorizedCaregiverCookie);

      expect(res.statusCode).toBe(403);
    });

    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/privacy/caregivers');
      expect(res.statusCode).toBe(401);
    });

    it('should deny Patient B from modifying Patient A caregiver permissions', async () => {
      const res = await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientBCookie)
        .send({
          permissions: { assessments: true }
        });

      expect(res.statusCode).toBe(404); // Patient B does not have this caregiver relationship
    });
  });
});
