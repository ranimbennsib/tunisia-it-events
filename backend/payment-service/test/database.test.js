require('dotenv').config();

const { buildConfig } = require('../src/config');
const { createPool } = require('../src/db/pool');

const pool = createPool(buildConfig().db);

describe('Payment Database', () => {

  afterAll(async () => {
    await pool.end();
  });

  test('should connect to PostgreSQL', async () => {
    const result = await pool.query('SELECT NOW()');

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].now).toBeDefined();
  });

  test('should find the payment table', async () => {
    const result = await pool.query(`
      SELECT to_regclass('public.payment') AS table_name
    `);

    expect(result.rows[0].table_name).toBe('payment');
  });

});