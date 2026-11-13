import express from 'express';
import SecurityAlert from '../models/SecurityAlert.js';
import {databaseAvailable,listInMemoryAlerts,updateInMemoryAlert,deleteInMemoryAlert} from '../services/memoryStore.js';
const router=express.Router();
router.get('/',async(req,res,next)=>{try{const items=databaseAvailable()?await SecurityAlert.find().sort({createdAt:-1}).limit(200).lean():listInMemoryAlerts();res.json({items});}catch(e){next(e);}});
router.put('/:id',async(req,res,next)=>{try{if(!/^[a-f\d]{24}$/i.test(req.params.id))return res.status(400).json({error:'Invalid alert id'});if(!['OPEN','RESOLVED'].includes(req.body?.status))return res.status(400).json({error:'Invalid alert status'});const item=databaseAvailable()?await SecurityAlert.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true,runValidators:true}).lean():updateInMemoryAlert(req.params.id,{status:req.body.status});if(!item)return res.status(404).json({error:'Alert not found'});res.json({alert:item});}catch(e){next(e);}});
router.delete('/:id',async(req,res,next)=>{try{if(!/^[a-f\d]{24}$/i.test(req.params.id))return res.status(400).json({error:'Invalid alert id'});if(databaseAvailable()){const item=await SecurityAlert.findByIdAndDelete(req.params.id);if(!item)return res.status(404).json({error:'Alert not found'});}else if(!deleteInMemoryAlert(req.params.id))return res.status(404).json({error:'Alert not found'});res.json({deleted:true});}catch(e){next(e);}});
export default router;
