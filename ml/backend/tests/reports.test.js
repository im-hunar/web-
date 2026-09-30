const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const store = require('../src/db/store');
const { UserModel, ROLES } = require('../src/models/user.model');
const { CaregiverPermissionModel } = require('../src/models/caregiverPermission.model');
const { storageDir } = require('../src/middleware/upload.middleware');

describe('Secure Medical Report Management & AI Summary API Tests', () => {
  let patientAUser, patientBUser, caregiverUser;
  let patientACookie, patientBCookie, caregiverCookie;
  let testPdfBuffer, testJpgBuffer, testPngBuffer;

  beforeAll(() => {
    // Generate valid test file buffers with real magic bytes
    // 1. PDF magic bytes: %PDF-1.4 ... %%EOF
    testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    // 2. JPEG magic bytes: FF D8 FF E0 ... FF D9
    testJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9]);

    // 3. PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A ...
    testPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]);
  });

  beforeEach(async () => {
    store.reset();

    // 1. Patient A
    patientAUser = await UserModel.create({
      id: 'patient_a_id',
      email: 'patienta@example.com',
      password: 'Password123!',
      name: 'Alice Patient',
      role: ROLES.PATIENT
    });
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patienta@example.com', password: 'Password123!' });
    patientACookie = loginA.headers['set-cookie'];

    // 2. Patient B
    patientBUser = await UserModel.create({
      id: 'patient_b_id',
      email: 'patientb@example.com',
      password: 'Password123!',
      name: 'Bob Patient',
      role: ROLES.PATIENT
    });
    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patientb@example.com', password: 'Password123!' });
    patientBCookie = loginB.headers['set-cookie'];

    // 3. Caregiver
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
  });

  describe('Secure Report Upload Validation', () => {
    it('should successfully upload a valid PDF report with metadata', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .field('title', 'Echocardiogram Clinical Study')
        .field('date', '2026-09-20')
        .field('reportType', 'Echocardiogram')
        .attach('file', testPdfBuffer, 'echo_study.pdf');

      expect(res.statusCode).toBe(201);
      expect(res.body.report).toHaveProperty('id');
      expect(res.body.report.title).toBe('Echocardiogram Clinical Study');
      expect(res.body.report.reportType).toBe('Echocardiogram');
      expect(res.body.report.mimeType).toBe('application/pdf');
      expect(res.body.report.fileName).toBe('echo_study.pdf');

      // Verify stored filename on disk is random UUID, NEVER user-provided name
      expect(res.body.report.storedFileName).not.toBe('echo_study.pdf');
      expect(res.body.report.storedFileName.startsWith('rep_')).toBe(true);
      expect(res.body.report.storedFileName.endsWith('.pdf')).toBe(true);

      // Verify file exists in private storage directory
      const filePath = path.join(storageDir, res.body.report.storedFileName);
      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up
      try { fs.unlinkSync(filePath); } catch (e) {}
    });

    it('should accept valid JPG and PNG reports', async () => {
      // Test JPG
      const jpgRes = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .field('title', 'ECG Rhythm Strip')
        .field('reportType', 'ECG')
        .attach('file', testJpgBuffer, 'ecg_strip.jpg');

      expect(jpgRes.statusCode).toBe(201);
      expect(jpgRes.body.report.mimeType).toBe('image/jpeg');

      // Test PNG
      const pngRes = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .field('title', 'Chest X-Ray Snapshot')
        .field('reportType', 'Imaging')
        .attach('file', testPngBuffer, 'xray.png');

      expect(pngRes.statusCode).toBe(201);
      expect(pngRes.body.report.mimeType).toBe('image/png');

      // Cleanup
      try {
        fs.unlinkSync(path.join(storageDir, jpgRes.body.report.storedFileName));
        fs.unlinkSync(path.join(storageDir, pngRes.body.report.storedFileName));
      } catch (e) {}
    });

    it('should reject invalid extensions and MIME types (e.g. .txt, .js, .exe, .sh)', async () => {
      const maliciousBuffer = Buffer.from('console.log("malicious code");');

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .attach('file', maliciousBuffer, 'exploit.js');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid file extension');
    });

    it('should reject disguised files where extension does not match magic bytes', async () => {
      // A plain text file renamed to .pdf
      const fakePdfBuffer = Buffer.from('Just plain text pretending to be a PDF file');

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .attach('file', fakePdfBuffer, { filename: 'fake.pdf', contentType: 'application/pdf' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Magic byte header does not match declared MIME format');
    });

    it('Caregiver cannot upload medical records', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', caregiverCookie)
        .attach('file', testPdfBuffer, 'caregiver_upload.pdf');

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Caregivers cannot upload or modify medical records');
    });
  });

  describe('Report View, Download, and Authorization Controls', () => {
    let uploadedReport;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .field('title', 'Lipid Panel Laboratory Report')
        .field('reportType', 'Blood Test')
        .attach('file', testPdfBuffer, 'lipid_panel.pdf');

      uploadedReport = res.body.report;
    });

    afterEach(() => {
      if (uploadedReport?.storedFileName) {
        try {
          fs.unlinkSync(path.join(storageDir, uploadedReport.storedFileName));
        } catch (e) {}
      }
    });

    it('should allow Patient A to view and download their own medical report', async () => {
      // 1. View
      const viewRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}/view`)
        .set('Cookie', patientACookie);

      expect(viewRes.statusCode).toBe(200);
      expect(viewRes.headers['content-type']).toBe('application/pdf');
      expect(viewRes.headers['x-content-type-options']).toBe('nosniff');
      expect(viewRes.headers['content-disposition']).toBe('inline');

      // 2. Download
      const dlRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}/download`)
        .set('Cookie', patientACookie);

      expect(dlRes.statusCode).toBe(200);
      expect(dlRes.headers['content-disposition']).toContain('attachment');
      expect(dlRes.headers['content-disposition']).toContain('lipid_panel.pdf');
    });

    it('should block Patient B from viewing or downloading Patient A report (IDOR Protection)', async () => {
      const viewRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}/view`)
        .set('Cookie', patientBCookie);

      expect(viewRes.statusCode).toBe(403);
      expect(viewRes.body.error).toContain('You are not authorized');

      const dlRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}/download`)
        .set('Cookie', patientBCookie);

      expect(dlRes.statusCode).toBe(403);
    });

    it('Caregiver access requires explicit reports permission', async () => {
      // 1. Initially NO ACCESS granted
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      const deniedRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}/view`)
        .set('Cookie', caregiverCookie);

      expect(deniedRes.statusCode).toBe(403);

      // 2. Patient explicitly grants reports: true
      await request(app)
        .put(`/api/privacy/caregivers/${caregiverUser.id}/permissions`)
        .set('Cookie', patientACookie)
        .send({
          permissions: { reports: true }
        });

      const allowedRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}/view`)
        .set('Cookie', caregiverCookie);

      expect(allowedRes.statusCode).toBe(200);
    });
  });

  describe('Report Deletion Controls', () => {
    let uploadedReport;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Cookie', patientACookie)
        .field('title', 'Routine Checkup Summary')
        .attach('file', testPdfBuffer, 'checkup.pdf');

      uploadedReport = res.body.report;
    });

    it('Caregiver cannot delete medical reports', async () => {
      const res = await request(app)
        .delete(`/api/reports/${uploadedReport.id}`)
        .set('Cookie', caregiverCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Caregivers cannot modify or delete medical records');
    });

    it('Patient B cannot delete Patient A medical report (IDOR Protection)', async () => {
      const res = await request(app)
        .delete(`/api/reports/${uploadedReport.id}`)
        .set('Cookie', patientBCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('You cannot delete another patient\'s medical report');
    });

    it('Patient A can delete their own medical report and purge it from private storage', async () => {
      const res = await request(app)
        .delete(`/api/reports/${uploadedReport.id}`)
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(200);

      // Verify file is removed from disk
      const filePath = path.join(storageDir, uploadedReport.storedFileName);
      expect(fs.existsSync(filePath)).toBe(false);

      // Subsequent fetch returns 404
      const getRes = await request(app)
        .get(`/api/reports/${uploadedReport.id}`)
        .set('Cookie', patientACookie);
      expect(getRes.statusCode).toBe(404);
    });
  });

  describe('AI Medical Record Summary', () => {
    beforeEach(async () => {
      // Seed a clinical report
      await store.createReport({
        patientId: patientAUser.id,
        title: 'Cardiovascular Comprehensive Evaluation',
        doctorName: 'Dr. House',
        date: '2026-09-18',
        reportType: 'Consultation',
        summary: 'Cardiac status reviewed. Borderline blood pressure elevation observed.',
        diagnosis: 'Stage 1 Hypertension',
        vitals: { restingBP: 135, heartRate: 76, cholesterol: 215 },
        recommendations: 'Dietary sodium reduction, regular aerobic activity.'
      });
    });

    it('should generate an AI summary with mandatory label and strict non-diagnostic rules', async () => {
      const res = await request(app)
        .get('/api/reports/ai-summary')
        .set('Cookie', patientACookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.summary).toHaveProperty('label');
      expect(res.body.summary.label).toBe(
        'AI-generated summary — verify information with a qualified healthcare professional.'
      );
      expect(res.body.summary.clinicalSafetyNotice).toContain('AI cannot diagnose, prescribe, or make medical decisions');
      expect(res.body.summary.rulesCompliance).toEqual({
        neverDiagnose: true,
        neverPrescribe: true,
        neverFabricate: true,
        neverInventMedicalHistory: true,
        labeledAiContent: true,
        dataMinimizationApplied: true
      });

      // Data minimization check: direct PII excluded
      expect(res.body.summary.patientReference).toBe('PT-A_ID');
      expect(res.body.summary.physicianDocumentedDiagnoses[0].diagnosis).toBe('Stage 1 Hypertension');
      expect(res.body.summary.physicianDocumentedRecommendations[0].recommendation).toContain('Dietary sodium reduction');
    });

    it('should enforce authorization on AI summary access', async () => {
      // Patient B cannot view Patient A summary
      const resB = await request(app)
        .get(`/api/reports/ai-summary?patientId=${patientAUser.id}`)
        .set('Cookie', patientBCookie);
      expect(resB.statusCode).toBe(403);

      // Caregiver without reports permission cannot view summary
      await request(app)
        .post('/api/privacy/caregivers/invite')
        .set('Cookie', patientACookie)
        .send({ email: 'john.doe@example.com', name: 'John Doe' });

      const cgRes = await request(app)
        .get(`/api/reports/ai-summary?patientId=${patientAUser.id}`)
        .set('Cookie', caregiverCookie);
      expect(cgRes.statusCode).toBe(403);
      expect(cgRes.body.error).toContain('reports');
    });
  });
});
