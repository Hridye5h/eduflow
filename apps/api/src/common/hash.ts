import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

export const hashPassword = (pwd: string) => bcrypt.hash(pwd, 10);
export const verifyPassword = (pwd: string, hash: string) => bcrypt.compare(pwd, hash);

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const randomOtp = (len = 6) => {
  const buf = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += (buf[i] % 10).toString();
  return out;
};
