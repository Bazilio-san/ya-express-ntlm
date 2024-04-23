import { Buffer } from 'buffer';

export const concatBuffer = (...args: Buffer[]): Buffer => {
  const buffersArray = Array.prototype.slice.call(args, 0);
  let totalLength = 0;
  let i: number;
  let offset = 0;

  for (i = 0; i < buffersArray.length; i++) {
    totalLength += buffersArray[i].length;
  }

  const finalBuf = Buffer.alloc(totalLength);

  for (i = 0; i < buffersArray.length; i++) {
    buffersArray[i].copy(finalBuf, offset);
    offset += buffersArray[i].length;
  }

  return finalBuf;
};

export const toBinary = (int: string): number => parseInt(int, 2);

export const isFlagSet = (field: number, flag: number): boolean => (field & flag) === flag;

export const UUIDv4 = (): string => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export const sanitizeText = (msg?: Buffer) => (msg || '')
  .toString('utf-8')
  .replace(/\s+/sg, ' ')
  .replace(/[^\w. -]/g, '♦')
  .replace(/([\w.-])♦([\w.-])/g, '$1$2')
  .replace(/([\w.-])♦([\w.-])/g, '$1$2')
  .replace(/[♦\s]{2,}/sg, ' ');

export const transferExistingProps = <T = Record<string, any>> (src: Partial<T>, dest: Partial<T>): Partial<T> => {
  Object.entries(src).forEach(([k, v]) => {
    if (v) {
      dest[k] = v;
    }
  });
  return dest;
};
