// Supabase olib tashlandi. Eski ekranlar import qilishi mumkin, lekin ishlatilganda xato beradi.
const fail = (): never => {
  throw new Error('Supabase olib tashlandi');
};

export const supabase: any = new Proxy(function () {}, {
  get: () => fail(),
  apply: () => fail(),
});
