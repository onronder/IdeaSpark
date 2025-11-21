describe('Jest Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should handle TypeScript', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(2, 3)).toBe(5);
  });

  it('should have React Native Testing Library available', () => {
    const { render } = require('@testing-library/react-native');
    expect(render).toBeDefined();
  });
});