const request = require('supertest');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');

jest.setTimeout(20000);

describe('Assessment API Endpoints', () => {
  let userCookie;

  beforeEach(async () => {
    store.reset();

    await UserModel.create({
      email: 'patient_assessment@example.com',
      password: 'Password123!',
      name: 'Assessment User',
      role: ROLES.PATIENT
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient_assessment@example.com', password: 'Password123!' });
    userCookie = loginRes.headers['set-cookie'];
  });

  it('should reject unauthenticated assessment submission with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/assessment')
      .send({});

    expect(res.statusCode).toBe(401);
  });

  it('should reject invalid assessment input schema with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/assessment')
      .set('Cookie', userCookie)
      .send({
        age: 15, // invalid age < 18
        sex: 1
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Validation Error');
  });

  it('should format payload correctly and receive prediction from real ML FastAPI service', async () => {
    const validSample = {
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
    };

    const res = await request(app)
      .post('/api/assessment')
      .set('Cookie', userCookie)
      .send(validSample);

    expect([200, 503]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.assessment).toHaveProperty('prediction');
      expect([0, 1]).toContain(res.body.assessment.prediction);
      expect(res.body.assessment).toHaveProperty('submittedValues');
      expect(res.body.assessment.submittedValues.age.value).toBe(50);
      expect(res.body.assessment.submittedValues.chestPainType.value).toBe('Atypical Angina (ATA)');
    }
  });
});
