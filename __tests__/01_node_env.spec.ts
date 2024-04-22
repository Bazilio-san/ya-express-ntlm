describe('Testing environment should be set properly', () => {
  it('NODE_ENV should be "testing"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
