import { goBack } from '../../lib/nav';

test('tarix bor → back', () => {
  const r = { canGoBack: () => true, back: jest.fn(), replace: jest.fn() };
  goBack(r as any);
  expect(r.back).toHaveBeenCalled();
  expect(r.replace).not.toHaveBeenCalled();
});

test('tarix yo\'q → bosh sahifa', () => {
  const r = { canGoBack: () => false, back: jest.fn(), replace: jest.fn() };
  goBack(r as any);
  expect(r.replace).toHaveBeenCalledWith('/(tabs)');
  expect(r.back).not.toHaveBeenCalled();
});
