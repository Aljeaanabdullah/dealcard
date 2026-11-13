// المرحلة 0: اختبار تجريبي يثبت أن Jest و TypeScript شغالين.
describe('إعداد المشروع', () => {
  it('Jest يشغّل اختبارات TypeScript', () => {
    const total: number = 1 + 1;
    expect(total).toBe(2);
  });
});
