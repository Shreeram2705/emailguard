import axios from 'axios';
const configuredApiUrl=(import.meta.env.VITE_API_URL||(import.meta.env.PROD?'/api':'http://localhost:4000')).replace(/\/+$/,'');
const apiBaseUrl=configuredApiUrl.endsWith('/api')?configuredApiUrl:`${configuredApiUrl}/api`;
export const api=axios.create({baseURL:apiBaseUrl,timeout:15000});
export const requestEvents=[];
api.interceptors.request.use(config=>{config.metadata={requestedAt:new Date()};return config;});
api.interceptors.response.use(response=>{const e={method:response.config.method?.toUpperCase(),endpoint:response.config.url,requestedAt:response.config.metadata?.requestedAt?.toISOString(),respondedAt:new Date().toISOString(),status:response.status,durationMs:Date.now()-new Date(response.config.metadata?.requestedAt||Date.now()).getTime()};requestEvents.unshift(e);requestEvents.splice(30);return response;},error=>{const c=error.config;if(c){requestEvents.unshift({method:c.method?.toUpperCase(),endpoint:c.url,requestedAt:c.metadata?.requestedAt?.toISOString(),respondedAt:new Date().toISOString(),status:error.response?.status||'NETWORK ERROR',durationMs:Date.now()-new Date(c.metadata?.requestedAt||Date.now()).getTime()});requestEvents.splice(30);}return Promise.reject(error);});
