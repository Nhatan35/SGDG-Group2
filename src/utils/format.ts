export const formatMoney=(value:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value)
export const formatDateTime=(value:string)=>new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
export function timeLabel(status:string,value:string){if(status==='LIVE')return`Còn ${Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/60000))} phút`;if(status==='COMPLETED'||status==='CLOSED')return`Kết thúc ${formatDateTime(value)}`;return`Bắt đầu ${formatDateTime(value)}`}
