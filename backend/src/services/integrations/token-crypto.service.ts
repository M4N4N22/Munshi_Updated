import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class TokenCryptoService {
  private key(): Buffer {
    const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
    if (!raw) {
      throw new InternalServerErrorException(
        'INTEGRATION_TOKEN_ENCRYPTION_KEY is not configured',
      );
    }
    return createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new InternalServerErrorException('Cannot encrypt empty token');
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64url'),
      encrypted.toString('base64url'),
      tag.toString('base64url'),
    ].join('.');
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new InternalServerErrorException('Cannot decrypt empty token');
    }
    const [ivPart, encPart, tagPart] = ciphertext.split('.');
    if (!ivPart || !encPart || !tagPart) {
      throw new InternalServerErrorException('Invalid encrypted token format');
    }
    const iv = Buffer.from(ivPart, 'base64url');
    const encrypted = Buffer.from(encPart, 'base64url');
    const tag = Buffer.from(tagPart, 'base64url');
    const decipher = createDecipheriv(ALGORITHM, this.key(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
