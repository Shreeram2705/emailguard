import 'dotenv/config';
import express from 'express';import cors from 'cors';import helmet from 'helmet';import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import {connectDatabase} from './config/database.js';import {emailRouter} from './routes/emails.js';import dashboard from './routes/dashboard.js';import alerts from './routes/alerts.js';import dfa from './routes/dfa.js';
const app=express();const allowedOrigins=new Set([process.env.CLIENT_ORIGIN||'http://localhost:5173','http://localhost:5173','http://127.0.0.1:5173']);
app.use(helmet());app.use(cors({origin(origin,callback){callback(null,!origin||allowedOrigins.has(origin));}}));
app.use((req,res,next)=>{const start=process.hrtime.bigint();const requestedAt=new Date();res.on('finish',()=>console.log(JSON.stringify({method:req.method,endpoint:req.originalUrl.split('?')[0],requestedAt:requestedAt.toISOString(),respondedAt:new Date().toISOString(),status:res.statusCode,durationMs:Number(process.hrtime.bigint()-start)/1e6})));next();});
app.use(express.json({limit:'128kb'}));app.use((req,res,next)=>{if(req.is('application/json')&&(!req.body||typeof req.body!=='object'||Array.isArray(req.body)))return res.status(400).json({error:'JSON request body must be an object'});next();});app.use(rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:true,legacyHeaders:false}));
app.get('/',(req,res)=>res.json({name:'EmailGuard API',status:'ok',health:'/api/health'}));
app.get('/api/health',(req,res)=>res.status(200).json({status:'ok',database:mongoose.connection.readyState===1?'connected':'disconnected',time:new Date().toISOString()}));
app.use('/api/emails',emailRouter);app.use('/api/dashboard',dashboard);app.use('/api/alerts',alerts);app.use('/api/dfa',dfa);
app.use((err,req,res,next)=>{console.error(err.message);if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON request body'});if(err.name==='ValidationError')return res.status(400).json({error:'Invalid request data'});if(err.name==='MulterError')return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'File exceeds 1 MB limit':'Invalid file upload'});const status=err.status||(/Only \.eml/i.test(err.message)?400:500);res.status(status).json({error:status<500?err.message:'Request could not be completed'});});
const port=Number(process.env.PORT)||4000;
if(process.env.NODE_ENV!=='test'){
  app.listen(port,()=>console.log(`EmailGuard API listening on ${port}`));
  connectDatabase().catch(err=>console.error(`MongoDB connection failed: ${err.message}; email analyses will use temporary in-memory storage.`));
}
export default app;
