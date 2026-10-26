import assert from 'node:assert/strict';
import { getWorkshopConfirmationWhatsAppUrl, MAKERLAB_MAPS_URL } from './workshops';

const url = getWorkshopConfirmationWhatsAppUrl({
  parentName: 'Mme Exemple', childName: 'Yazan', phone: '06 12 34 56 78',
  title: 'Atelier découverte', date: '2026-10-26', startTime: '18:00', endTime: '19:30',
  organizationName: 'MakerLab Academy',
});
assert.ok(url);
const parsed = new URL(url);
assert.equal(parsed.hostname, 'wa.me');
assert.equal(parsed.pathname, '/212612345678');
const message = parsed.searchParams.get('text') || '';
assert.match(message, /lundi 26 octobre 2026/);
assert.match(message, /18:00 à 19:30/);
assert.match(message, /Yazan/);
assert.ok(message.includes(MAKERLAB_MAPS_URL));
assert.equal(getWorkshopConfirmationWhatsAppUrl({
  parentName: 'Test', childName: 'Kid', phone: '123', title: 'Lab', date: '2026-10-26',
  startTime: '10:00', endTime: '11:00', organizationName: 'Other School',
}), null);
console.log('Workshop confirmation URL smoke passed');
