declare module 'src/@node-ntlm-core/des.js.js' {

  interface Des {
    update (message: string | Buffer): number[];
  }

  export declare const DES: {
    create (options: { type: 'encrypt', key: Buffer }): Des;
  };
}
