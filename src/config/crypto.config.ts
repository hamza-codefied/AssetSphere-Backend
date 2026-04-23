export const cryptoConfig = () => ({
  crypto: {
    masterKeyBase64: process.env.CRYPTO_MASTER_KEY ?? '',
  },
});
