import mongoose from 'mongoose';
const patternSchema=new mongoose.Schema({name:String,description:String,matches:[String],count:Number,accepted:Boolean},{_id:false});
const ruleSchema=new mongoose.Schema({id:String,label:String,contribution:Number},{_id:false});
const emailSchema=new mongoose.Schema({sender:{type:String,required:true},recipient:String,subject:{type:String,default:''},messageBody:{type:String,default:''},classification:{type:String,enum:['SAFE','SUSPICIOUS','SPAM'],required:true},riskScore:{type:Number,min:0,max:100,required:true},rules:[ruleSchema],detectedPatterns:[String],regexResults:[patternSchema],dfaResults:mongoose.Schema.Types.Mixed,extractedUrls:[String],reviewStatus:{type:String,enum:['NEW','REVIEWED','FALSE_POSITIVE'],default:'NEW'}},{timestamps:true});
export default mongoose.model('EmailAnalysis',emailSchema);
