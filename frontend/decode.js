const StellarSdk = require('@stellar/stellar-sdk');
try {
  let result = StellarSdk.xdr.TransactionResult.fromXDR("AAAAAAAaOKL///7AAAAAA==", "base64");
  console.log(JSON.stringify(result, null, 2));
} catch(e) { console.error(e); }
