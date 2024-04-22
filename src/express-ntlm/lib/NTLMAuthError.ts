export class NTLMAuthError extends Error {
  constructor (message) {
    super(`ntlm:auth:ERROR: ${message}`);
    this.name = 'NTLMAuthError';
  }
}
