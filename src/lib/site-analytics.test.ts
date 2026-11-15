import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsAccepted, analyticsPath, deviceCategory, countryCode } from './site-analytics';
test('análise só registra após aceite explícito', () => {
  assert.equal(analyticsAccepted(null), false); assert.equal(analyticsAccepted('essential'), false); assert.equal(analyticsAccepted('accepted'), true);
});
test('dispositivos distinguem celular, computador e tablet', () => {
  assert.equal(deviceCategory('iPhone Mobile'), 'mobile'); assert.equal(deviceCategory('Windows NT'), 'desktop'); assert.equal(deviceCategory('Android Tablet'), 'tablet'); assert.equal(deviceCategory('Macintosh', 5), 'tablet');
});
test('país desconhecido não vira Brasil por padrão', () => {
  assert.equal(countryCode(undefined), 'Unknown'); assert.equal(countryCode('XX'), 'Unknown'); assert.equal(countryCode('US'), 'US');
});
test('rotas privadas e identificadores não entram nas visualizações públicas', () => {
  assert.equal(analyticsPath('/docs'), true); assert.equal(analyticsPath('/admin'), false); assert.equal(analyticsPath('/assistente/secret'), false); assert.equal(analyticsPath('/api/public/v1/messages'), false);
});