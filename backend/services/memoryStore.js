import mongoose from 'mongoose';

const analyses = new Map();
const alerts = new Map();
const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

export const databaseAvailable = () => mongoose.connection.readyState === 1;
export function saveInMemoryAnalysis(data) {
  const now = new Date();
  const analysis = {
    _id: new mongoose.Types.ObjectId().toString(), ...data,
    reviewStatus: 'NEW', createdAt: now, updatedAt: now,
  };
  analyses.set(analysis._id, analysis);
  if (analysis.classification !== 'SAFE') {
    const alert = {
      _id: new mongoose.Types.ObjectId().toString(), analysisId: analysis._id,
      alertType: analysis.classification,
      severity: analysis.classification === 'SPAM' ? 'HIGH' : 'MEDIUM',
      description: `${analysis.classification} email detected with risk score ${analysis.riskScore}.`,
      detectedPattern: analysis.detectedPatterns.join('; '), status: 'OPEN',
      createdAt: now, updatedAt: now,
    };
    alerts.set(alert._id, alert);
  }
  return analysis;
}
export function listInMemoryAnalyses({classification, search} = {}) {
  const term = search ? String(search).toLowerCase() : '';
  return [...analyses.values()].filter(item =>
    (!classification || item.classification === classification) &&
    (!term || ['sender','recipient','subject','messageBody'].some(k => String(item[k] || '').toLowerCase().includes(term)))
  ).sort(newestFirst);
}
export const getInMemoryAnalysis = id => analyses.get(id) || null;
export function updateInMemoryAnalysis(id, patch) {
  const item = analyses.get(id);
  if (!item) return null;
  Object.assign(item, patch, {updatedAt: new Date()});
  return item;
}
export function deleteInMemoryAnalysis(id) {
  const removed = analyses.delete(id);
  for (const [alertId, alert] of alerts) if (String(alert.analysisId) === id) alerts.delete(alertId);
  return removed;
}
export function inMemoryDashboard() {
  const items = listInMemoryAnalyses();
  const counts = {SAFE:0,SUSPICIOUS:0,SPAM:0};
  for (const item of items) counts[item.classification]++;
  return {total:items.length,counts,recent:items.slice(0,5)};
}
export const listInMemoryAlerts = () => [...alerts.values()].sort(newestFirst).slice(0,200);
export function updateInMemoryAlert(id, patch) {
  const item = alerts.get(id);
  if (!item) return null;
  Object.assign(item, patch, {updatedAt:new Date()});
  return item;
}
export const deleteInMemoryAlert = id => alerts.delete(id);
