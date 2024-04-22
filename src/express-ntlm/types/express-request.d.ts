import { Express } from 'express';
import * as http from 'http';

export interface IWebApp {
  app: Express;
  server: http.Server
}

declare global {
  namespace Express {
    export interface Request {
      ntlm: {
        username?: string,
        domain?: string,
        workstation?: string,
        isAuthenticated?: boolean,
        uri?: string, // For debug
        token?: string,
      },
    }
  }
}
