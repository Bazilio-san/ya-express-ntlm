import { IRsn, IUserData } from '../interfaces';

class UserAuthDelayCache {
  // timestamp of the next available authentication challenge
  private cache: { [domainUser: string]: number } = {};

  set (userData: Partial<IUserData>, rsn: IRsn) {
    this.cache[`${userData.domain}\${${userData.username}}`] = Date.now() + rsn.options.getAuthDelay(rsn);
  }

  // Number of seconds until next login attempt
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
  }
}

export const userAuthDelayCache = new UserAuthDelayCache();
