import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EncryptedValue } from './crypto.types';

@Injectable()
export class CryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(plainText: string): EncryptedValue {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  decrypt(encrypted: EncryptedValue): string {
    const key = this.getKey();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private getKey(): Buffer {
    const base64 = this.configService.get<string>('crypto.masterKeyBase64');
    if (!base64) {
      throw new InternalServerErrorException('CRYPTO_MASTER_KEY is missing');
    }

    const key = Buffer.from(base64, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException('CRYPTO_MASTER_KEY must be a 32-byte base64 value');
    }
    return key;
  }
}
