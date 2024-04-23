import { IRsn, IUserData } from '../interfaces';

export const userDelayCache: {
  cache: { [domainUser: string]: number }, // timestamp of the next available authentication challenge
  set: (userData: Partial<IUserData>, rsn: IRsn) => void,
  get: (userData: Partial<IUserData>) => number, // Number of seconds until next login attempt
} = {
  cache: {},
  set (userData: Partial<IUserData>, rsn: IRsn) {
    this.cache[`${userData.domain}\${${userData.username}}`] = Date.now() + rsn.options.getAuthDelay(rsn);
  },
  get (userData: Partial<IUserData>) {
    const id = `${userData.domain}\${${userData.username}}`;
    let n = this.cache[id] || 0;
    if (n) {
      n = Math.floor(Math.max(0, (n - Date.now()) / 1000));
    }
    if (!n) {
      delete this.cache[id];
    }
    return n;
  },
};
