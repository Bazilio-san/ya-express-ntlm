declare module 'net' {
  export interface Socket {
    id: string;
    _host: string;
  }
}
