import type { Tractor, User } from './schema';

// Hakamlarga ko'rsatish uchun namunaviy ma'lumot (2023-yil Mingbuloq tumani buzilishlar jadvalidan).
// PIN-kodlar oson va bir martalik: kirgandan keyin admin "Foydalanuvchilar" ekranida almashtiradi.
export const DEMO_USERS: (Omit<User, 'id' | 'createdAt' | 'pinHash'> & { pin: string })[] = [
  { name: 'Ilxomjon Xolmirzayev', role: 'admin', active: true, title: 'Asosiy muallif, bosh dasturchi', phone: '+998 99 977 7555', pin: '1111' },
  { name: 'Inomjonov Mansurbek', role: 'technician', active: true, title: 'Mexanik', phone: null, pin: '2222' },
  { name: 'Yodgoraliyev Nozimjon', role: 'technician', active: true, title: 'Mexanik', phone: null, pin: '3333' },
  { name: 'Rahmatov Islomjon', role: 'technician', active: true, title: 'Mexanik', phone: null, pin: '4444' },
];

export const DEMO_TRACTORS: Pick<Tractor, 'model' | 'serialNumber' | 'location' | 'operatorName'>[] = [
  { model: 'Claas Arion 630', serialNumber: 'A2003495', location: 'Mingbuloq', operatorName: 'Inomjonov Mansurbek' },
  { model: 'Claas Arion 630C', serialNumber: 'A2003707', location: 'Mingbuloq', operatorName: 'Inomjonov Mansurbek' },
  { model: 'Claas Arion 630C', serialNumber: 'A2004017', location: 'Mingbuloq', operatorName: 'Yodgoraliyev Nozimjon' },
  { model: 'Claas Arion 630C', serialNumber: 'A2004100', location: 'Mingbuloq', operatorName: 'Rahmatov Islomjon' },
];
