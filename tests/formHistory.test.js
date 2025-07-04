// tests/formHistory.test.js
const request = require('supertest');
const app = require('../app');

describe('Form History API', () => {
  it('should return form history by runner ID', async () => {
    const runnerId = '991654'; // ✅ Replace with a known valid runnerId
    const res = await request(app)
      .get(`/api/form-history/${runnerId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('runnerId');
    }
  });

  it('should support searching form history by name/date range', async () => {
    const query = {
      name: 'king', // ✅ Make sure this keyword exists in pf_form_history.name
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31'
    };

    const res = await request(app)
      .get('/api/form-history')
      .query(query)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const item = res.body[0];
      expect(item).toHaveProperty('meetingDate');
      expect(item).toHaveProperty('name');
      expect(item.name.toLowerCase()).toContain('king');
    }
  });
});
