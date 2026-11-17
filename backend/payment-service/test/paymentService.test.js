
const {
  calculateAmounts
} = require('../src/services/paymentService');

describe('Payment Service - Commission', () => {

  test('should calculate 5% commission correctly', () => {
    const result = calculateAmounts(45000, 5);

    expect(result.commissionAmount).toBe(2250);
    expect(result.netAmount).toBe(42750);
  });

  test('should calculate zero commission', () => {
    const result = calculateAmounts(45000, 0);

    expect(result.commissionAmount).toBe(0);
    expect(result.netAmount).toBe(45000);
  });

  test('should calculate 10% commission', () => {
    const result = calculateAmounts(100000, 10);

    expect(result.commissionAmount).toBe(10000);
    expect(result.netAmount).toBe(90000);
  });

});
