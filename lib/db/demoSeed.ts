import type { Tractor, User } from './schema';

// Boshlang'ich ma'lumot (2023-yil Mingbuloq tumani buzilishlar jadvalidan).
// PIN-kodlar oson va bir martalik: kirgandan keyin admin "Foydalanuvchilar" ekranida almashtiradi.
export const DEMO_USERS: (Omit<User, 'id' | 'createdAt' | 'pinHash'> & { pin: string })[] = [
  { name: 'Ilxomjon Xolmirzayev', role: 'admin', active: true, title: 'Asosiy muallif, bosh dasturchi', phone: '+998 99 977 7555', pin: '1111' },
  { name: 'Inomjonov Mansurbek', role: 'technician', active: true, title: 'Mexanik', phone: null, pin: '2222' },
  { name: 'Yodgoraliyev Nozimjon', role: 'technician', active: true, title: 'Mexanik', phone: null, pin: '3333' },
  { name: 'Rahmatov Islomjon', role: 'technician', active: true, title: 'Mexanik', phone: null, pin: '4444' },
  { name: "Ulug'bek", role: 'operator', active: true, title: 'Traktorchi', phone: '+998 90 693 53 50', pin: '5555' },
  { name: 'Adhamjon', role: 'operator', active: true, title: 'Traktorchi', phone: '+998 91 178 31 01', pin: '6666' },
  { name: 'Islomjon', role: 'operator', active: true, title: 'Traktorchi', phone: '+998 99 977 55 25', pin: '7777' },
  { name: 'Akrombek', role: 'operator', active: true, title: 'Traktorchi', phone: '+998 90 215 31 91', pin: '8888' },
];

// startReading: jonli ish boshlanadigan hisoblagich (algoritmning turli nuqtalari).
export const DEMO_TRACTORS: (Pick<Tractor, 'model' | 'serialNumber' | 'location' | 'operatorName'> & { startReading: number })[] = [
  { model: 'Claas Arion 630', serialNumber: 'A2003495', location: 'Mingbuloq', operatorName: "Ulug'bek", startReading: 180 },
  { model: 'Claas Arion 630C', serialNumber: 'A2003707', location: 'Mingbuloq', operatorName: 'Adhamjon', startReading: 238 },
  { model: 'Claas Arion 630C', serialNumber: 'A2004017', location: 'Mingbuloq', operatorName: 'Islomjon', startReading: 248 },
  { model: 'Claas Arion 630C', serialNumber: 'A2004100', location: 'Mingbuloq', operatorName: 'Akrombek', startReading: 262 },
];

// Obkatka (50/100) ro'yxatgacha bajarilgan deb olinadi.
export const DEMO_INITIAL_READING = 100;
