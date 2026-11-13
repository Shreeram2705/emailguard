import express from 'express';
import multer from 'multer';
import { simpleParser } from 'mailparser';
import mongoose from 'mongoose';
import EmailAnalysis from '../models/EmailAnalysis.js';
import SecurityAlert from '../models/SecurityAlert.js';
import { classifyEmail } from '../algorithms/classificationEngine.js';
import {
  databaseAvailable, saveInMemoryAnalysis, listInMemoryAnalyses,
  getInMemoryAnalysis, updateInMemoryAnalysis, deleteInMemoryAnalysis,
} from '../services/memoryStore.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => /\.(eml|txt)$/i.test(file.originalname)
    ? cb(null, true) : cb(new Error('Only .eml and .txt files are allowed')),
});
const safeId = id => /^[a-f\d]{24}$/i.test(id);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function saveAnalysis(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw Object.assign(new Error('Email data must be an object'), {status: 400});
  }
  if (typeof data.sender !== 'string' || !data.sender.trim() || data.sender.length > 254) {
    throw Object.assign(new Error('A sender address of at most 254 characters is required'), {status: 400});
  }
  if (typeof (data.subject || '') !== 'string' || (data.subject || '').length > 998 ||
      typeof (data.messageBody || '') !== 'string' || (data.messageBody || '').length > 50000) {
    throw Object.assign(new Error('Subject or message body is invalid or too long'), {status: 400});
  }
  if (data.recipient && (typeof data.recipient !== 'string' || data.recipient.length > 254)) {
    throw Object.assign(new Error('Recipient must be a string of at most 254 characters'), {status: 400});
  }

  const record = {...data, ...classifyEmail(data)};
  if (databaseAvailable()) {
    try {
      const saved = await EmailAnalysis.create(record);
      if (saved.classification !== 'SAFE') {
        await SecurityAlert.create({
          analysisId: saved._id, alertType: saved.classification,
          severity: saved.classification === 'SPAM' ? 'HIGH' : 'MEDIUM',
          description: `${saved.classification} email detected with risk score ${saved.riskScore}.`,
          detectedPattern: saved.detectedPatterns.join('; '),
        }).catch(error => console.error(`Could not create security alert: ${error.message}`));
      }
      return {analysis: saved, storageMode: 'mongodb'};
    } catch (error) {
      console.error(`MongoDB save failed; using in-memory analysis: ${error.message}`);
    }
  }
  return {analysis: saveInMemoryAnalysis(record), storageMode: 'memory'};
}

router.post('/analyze', async (req, res, next) => {
  try {
    const result = await saveAnalysis(req.body);
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({error: 'Select a .eml or .txt file'});
    const text = req.file.buffer.toString('utf8');
    let email;
    if (/\.eml$/i.test(req.file.originalname)) {
      const parsed = await simpleParser(text, {skipHtmlToText: true, skipTextToHtml: true});
      email = {
        sender: parsed.from?.value?.[0]?.address || '',
        recipient: parsed.to?.value?.[0]?.address || '',
        subject: parsed.subject || '', messageBody: parsed.text || '',
      };
    } else {
      email = {sender: req.body.sender || '', recipient: req.body.recipient || '',
        subject: req.body.subject || '', messageBody: text};
    }
    if (!email.sender) return res.status(400).json({error: 'Sender address could not be extracted; provide a sender for .txt files'});
    const result = await saveAnalysis(email);
    res.status(201).json({...result, extractedEmail: email});
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const classification = ['SAFE','SUSPICIOUS','SPAM'].includes(req.query.classification) ? req.query.classification : undefined;
    if (databaseAvailable()) {
      const filter = {};
      if (classification) filter.classification = classification;
      if (req.query.search) {
        const term = escapeRegex(String(req.query.search).slice(0,100));
        filter.$or = ['sender','recipient','subject','messageBody'].map(key => ({[key]: {$regex:term,$options:'i'}}));
      }
      const [items,total] = await Promise.all([
        EmailAnalysis.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),
        EmailAnalysis.countDocuments(filter),
      ]);
      return res.json({items,total,page,limit});
    }
    const all = listInMemoryAnalyses({classification,search:req.query.search});
    res.json({items:all.slice((page-1)*limit,page*limit),total:all.length,page,limit});
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({error:'Invalid analysis id'});
    const item = databaseAvailable() ? await EmailAnalysis.findById(req.params.id).lean() : getInMemoryAnalysis(req.params.id);
    if (!item) return res.status(404).json({error:'Analysis not found'});
    res.json({analysis:item});
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({error:'Invalid analysis id'});
    const status = req.body?.reviewStatus;
    if (!['NEW','REVIEWED','FALSE_POSITIVE'].includes(status)) return res.status(400).json({error:'Invalid review status'});
    const item = databaseAvailable()
      ? await EmailAnalysis.findByIdAndUpdate(req.params.id,{reviewStatus:status},{new:true,runValidators:true}).lean()
      : updateInMemoryAnalysis(req.params.id,{reviewStatus:status});
    if (!item) return res.status(404).json({error:'Analysis not found'});
    res.json({analysis:item});
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({error:'Invalid analysis id'});
    if (databaseAvailable()) {
      const item = await EmailAnalysis.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({error:'Analysis not found'});
      await SecurityAlert.deleteMany({analysisId:item._id});
    } else if (!deleteInMemoryAnalysis(req.params.id)) {
      return res.status(404).json({error:'Analysis not found'});
    }
    res.json({deleted:true});
  } catch (error) { next(error); }
});

export {router as emailRouter, saveAnalysis};
