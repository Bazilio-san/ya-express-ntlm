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
