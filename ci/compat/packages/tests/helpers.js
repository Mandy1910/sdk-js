// @flow

import { tankerUrl } from '../../../../packages/functional-tests/src/Helpers';
import { fromBase64, toBase64 } from '../../../../packages/client-node';
import { getPublicIdentity } from '../../../../packages/identity';

const password = 'plop';

class BaseUser {
  constructor(tanker) {
    this._tanker = tanker;
  }

  async encrypt(message, userIds, groupIds) {
    return toBase64(await this._tanker.encrypt(message, { shareWithUsers: userIds, shareWithGroups: groupIds }));
  }

  async decrypt(encryptedData) {
    return this._tanker.decrypt(fromBase64(encryptedData));
  }

  async createGroup(ids) {
    return this._tanker.createGroup(ids);
  }

  async revokeDevice(deviceId) {
    return this._tanker.revokeDevice(deviceId);
  }

  get deviceId() {
    return this._tanker.deviceId;
  }
}

class UserV1 extends BaseUser {
  constructor(tanker, id, token) {
    super(tanker);
    this._token = token;
    this._id = id;
  }

  get id() {
    return this._id;
  }

  async open() {
    await this._tanker.open(this._id, this._token);
  }

  async create() {
    await this.open();
    if (!await this._tanker.hasRegisteredUnlockMethods()) {
      await this._tanker.registerUnlock({ password });
    }
  }

  async close() {
    await this._tanker.close();
  }

  get token() {
    return this._token;
  }

  getRevocationPromise() {
    return new Promise(resolve => this._tanker.once('revoked', resolve));
  }
}

class UserV2 extends BaseUser {
  constructor(tanker, identity) {
    super(tanker);
    this._identity = identity;
  }


  async start() {
    const status = await this._tanker.start(this._identity);
    if (status === this._tanker.constructor.statuses.IDENTITY_VERIFICATION_NEEDED) {
      await this._tanker.verifyIdentity({ passphrase: password });
    } else if (status === this._tanker.constructor.statuses.IDENTITY_REGISTRATION_NEEDED) {
      await this._tanker.registerIdentity({ passphrase: password });
    }
  }

  async stop() {
    await this._tanker.stop();
  }

  get identity() {
    return this._identity;
  }

  get id() {
    return getPublicIdentity(this._identity);
  }

  getRevocationPromise() {
    return new Promise(resolve => this._tanker.once('deviceRevoked', resolve));
  }

  async upload(file) {
    return this._tanker.upload(file);
  }

  async download(fileId) {
    return this._tanker.download(fileId);
  }

  async share(resourceId, userId) {
    return this._tanker.share([resourceId], { shareWithUsers: [userId] });
  }
}

function makeTanker(Tanker, adapter, appId, prefix) {
  return new Tanker({
    appId,
    trustchainId: appId, // set trustchainId because old version only understand this param
    url: tankerUrl,
    sdkType: 'test',
    dataStore: {
      adapter,
      prefix,
    },
  });
}

export function makeV1User(opts) {
  const tanker = makeTanker(opts.Tanker, opts.adapter, opts.appId, opts.prefix);
  tanker.on('unlockRequired', async () => {
    await tanker.unlockCurrentDevice({ password });
  });
  return new UserV1(tanker, opts.userId, opts.token);
}

export function makeV2User(opts) {
  const tanker = makeTanker(opts.Tanker, opts.adapter, opts.appId, opts.prefix);
  return new UserV2(tanker, opts.identity);
}

export function makeCurrentUser(opts) {
  const Tanker = require('../../../../packages/client-node').default; // eslint-disable-line global-require
  const adapter = require('../../../../packages/datastore/pouchdb-memory').default; // eslint-disable-line global-require
  const tanker = makeTanker(Tanker, adapter, opts.appId, opts.prefix);
  return new UserV2(tanker, opts.identity);
}
