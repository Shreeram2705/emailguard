import express from 'express';
import EmailAnalysis from '../models/EmailAnalysis.js';
import {databaseAvailable,inMemoryDashboard,listInMemoryAnalyses} from '../services/memoryStore.js';
const router=express.Router();
router.get('/stats',async(req,res,next)=>{try{if(!databaseAvailable())return res.json(inMemoryDashboard());const [total,groups,recent]=await Promise.all([EmailAnalysis.countDocuments(),EmailAnalysis.aggregate([{$group:{_id:'$classification',count:{$sum:1}}}]),EmailAnalysis.find().sort({createdAt:-1}).limit(5).lean()]);const counts={SAFE:0,SUSPICIOUS:0,SPAM:0};groups.forEach(g=>counts[g._id]=g.count);res.json({total,counts,recent});}catch(e){next(e);}});
router.get('/recent',async(req,res,next)=>{try{const items=databaseAvailable()?await EmailAnalysis.find().sort({createdAt:-1}).limit(10).lean():listInMemoryAnalyses().slice(0,10);res.json({items});}catch(e){next(e);}});
export default router;
