declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    [key: string]: any;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string
  ): any;
}