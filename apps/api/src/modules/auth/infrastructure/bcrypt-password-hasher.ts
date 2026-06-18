import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PasswordHasher } from '../domain/password-hasher';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(value: string): Promise<string> {
    return hash(value, 12);
  }

  compare(value: string, passwordHash: string): Promise<boolean> {
    return compare(value, passwordHash);
  }
}
