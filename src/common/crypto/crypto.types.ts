export interface EncryptedValue {
  iv: string;
  tag: string;
  ciphertext: string;
}
