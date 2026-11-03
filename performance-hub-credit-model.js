// Airtable payment rows are separate ledgers, not automatically additive packages.
export function formatCreditBalance(value,precision=2){
  const digits=Number.isInteger(precision)&&precision>=0&&precision<=6?precision:2;
  const rounded=Number(value.toFixed(digits));
  return new Intl.NumberFormat('en-GB',{maximumFractionDigits:digits}).format(Object.is(rounded,-0)?0:rounded);
}
export function creditSummary(event){
  const seen=new Set(),balances=[];
  for(const item of event.credit?.credits||[]){
    if(item.source_payment_id&&seen.has(item.source_payment_id))continue;
    if(item.source_payment_id)seen.add(item.source_payment_id);
    const service=String(item.service||'Sessions'),unknown=typeof item.remaining!=='number'||!Number.isFinite(item.remaining);
    balances.push({...item,service,unknown,label:`${service}${item.shared?' · Shared balance':''}`});
  }
  if(balances.length>1)for(const b of balances)if(b.payment_name)b.label=`${b.payment_name} · ${b.label}`;
  const label=!balances.length?(event.player_id||event.account_pending||event.credit?'Balance pending':'Not linked'):
    balances.length>1?'View balances':balances[0].unknown?'Under review':`${formatCreditBalance(balances[0].remaining,balances[0].display_precision)} left${balances[0].shared?' · shared':''}`;
  return{balances,label};
}
