import net, { Socket } from 'net';
import tls, { TLSSocket } from 'tls';
import { ConnectionOptions } from 'node:tls';
import { Buffer } from 'buffer';
import { lBlue, magenta, rs, yellow, reset } from 'af-color';
import { LDAPContext } from '../lib/LDAPContext';
import { debugNtlmLdapProxy } from '../debug';
import { sanitizeText } from '../lib/utils';
import { arrowRR, LLarrow } from '../lib/constants';

export interface NTLMProxyOptions {
  id: string, // Domain Name
  host: string,
  port: any,
  tlsOptions?: ConnectionOptions,
}

export class NTLMProxy {
  public id: string;

  private socket: TLSSocket | Socket | null;

  private ldapContext = new LDAPContext(); // stub initialization

  private readonly host: string;

  private readonly port: number;

  private readonly tlsOptions: ConnectionOptions | undefined;

  public readonly coloredAddress: string;

  constructor (opts: NTLMProxyOptions) {
    this.id = opts.id;
    this.host = opts.host;
    this.port = Number(opts.port) || (opts.tlsOptions ? 636 : 389);
    this.tlsOptions = opts.tlsOptions;
    this.socket = null;
    this.coloredAddress = `${magenta}${this.host}:${this.port}${rs}`;
  }

  close () {
    if (this.socket?.readyState === 'open') {
      debugNtlmLdapProxy(`Close connection to ${this.coloredAddress}`);
      this.socket?.end();
    }
  }

  private openConnection (resolve: (data: Buffer) => void, reject: (err: Error) => void) {
    // @ts-ignore
    const isSameConnectionOpened = this.socket?._host === this.host && this.socket?.readyState === 'open';
    if (isSameConnectionOpened) {
      debugNtlmLdapProxy(`connection to ${this.coloredAddress} already opened`);
    } else {
      this.close();
      this.socket = this.tlsOptions
        ? tls.connect(this.port, this.host, this.tlsOptions)
        : net.createConnection(this.port, this.host);
      this.socket.setTimeout(5000);
      this.socket.setKeepAlive(true);
      debugNtlmLdapProxy(`Opened connection to ${this.coloredAddress}`);
    }
    this.socket?.once('data', resolve);
    this.socket?.once('error', reject);
  }

  private socketWrite (msgBuf: Buffer, operationType: string): void {
    if (!this.socket) {
      throw new Error('Transaction on closed socket.');
    }
    if (debugNtlmLdapProxy.enabled) {
      debugNtlmLdapProxy(`${arrowRR} ${operationType} Send to ${this.coloredAddress}:\t${yellow}${sanitizeText(msgBuf)}`);
    }
    this.socket.write(msgBuf);
  }

  async negotiate (messageType1: Buffer): Promise<Buffer | undefined> {
    const operationType = `${lBlue}[negotiate]${reset}`;
    return new Promise<Buffer | undefined>((resolve, reject) => {
      this.openConnection((data) => {
        try {
          const { serverSaslCreds } = this.ldapContext?.parseSessionSetupRESP(data) || {};
          resolve(serverSaslCreds);
          debugNtlmLdapProxy(`${LLarrow} ${operationType} Receive ${this.coloredAddress}:\t${lBlue}${sanitizeText(serverSaslCreds)}`);
        } catch (err: Error | any) {
          reject(err);
        }
      }, reject);

      this.ldapContext = new LDAPContext();

      const msg = this.ldapContext.makeSessionSetupREQ(messageType1, 1);
      this.socketWrite(msg, operationType);
    });
  }

  async authenticate (messageType3: Buffer): Promise<boolean> {
    const operationType = `${lBlue}[authenticate]${reset}`;
    return new Promise<boolean>((resolve, reject) => {
      this.openConnection((data) => {
        try {
          const { isOk } = this.ldapContext?.parseSessionSetupRESP(data) || {};
          debugNtlmLdapProxy(`${LLarrow} ${operationType} Receive ${this.coloredAddress}:\t${lBlue}Authenticated = ${isOk}`);
          resolve(isOk);
        } catch (err: Error | any) {
          reject(err);
        }
      }, reject);
      const msg = this.ldapContext?.makeSessionSetupREQ(messageType3, 2);
      this.socketWrite(msg, operationType);
    });
  }
}
