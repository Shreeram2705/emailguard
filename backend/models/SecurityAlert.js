import mongoose from 'mongoose';
const schema=new mongoose.Schema({analysisId:{type:mongoose.Schema.Types.ObjectId,ref:'EmailAnalysis',required:true},alertType:String,severity:{type:String,enum:['LOW','MEDIUM','HIGH']},description:String,detectedPattern:String,status:{type:String,enum:['OPEN','RESOLVED'],default:'OPEN'}},{timestamps:true});
export default mongoose.model('SecurityAlert',schema);
