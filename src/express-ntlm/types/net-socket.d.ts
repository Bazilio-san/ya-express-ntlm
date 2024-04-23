declare module 'net' {
  import { IUserData } from '../../interfaces';

  export interface Socket {
    id: string;
    ntlm: IUserData,
    _host: string; // VVR
  }
}
