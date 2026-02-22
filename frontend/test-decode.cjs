const { xdr } = require('@stellar/stellar-sdk');
try {
  let hex = Buffer.from('AAAAAAAaOKL///7AAAAAA==', 'base64').toString('hex');
  console.log("Hex:", hex);
  let res = xdr.TransactionResult.fromXDR('AAAAAAAaOKL///7AAAAAA==', 'base64');
  console.log("TxResultCode:", res.result().switch().name);
  let opRes = res.result().results()[0];
  console.log("OpResultCode:", opRes.tr().switch().name);
  let invokeRes = opRes.tr().invokeHostFunctionResult();
  console.log("InvokeResultCode:", invokeRes.switch().name);
} catch (e) {
  console.log(e);
}
