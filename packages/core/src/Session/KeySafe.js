// @flow
import { tcrypto, utils, type b64string } from '@tanker/crypto';

import { type UserKeys } from '../Blocks/payloads';
import * as EncryptorV1 from '../DataProtection/Encryptors/v1';

export type ProvisionalUserKeyPairs = {|
  id: string,
  appEncryptionKeyPair: tcrypto.SodiumKeyPair,
  tankerEncryptionKeyPair: tcrypto.SodiumKeyPair,
|};

export type IndexedProvisionalUserKeyPairs = { [id: string]: ProvisionalUserKeyPairs };

export type DeviceKeys = {|
  deviceId: ?b64string,
  signaturePair: tcrypto.SodiumKeyPair,
  encryptionPair: tcrypto.SodiumKeyPair,
|};

export type KeySafe = {|
  ...DeviceKeys,
  userSecret: Uint8Array,
  userKeys: Array<tcrypto.SodiumKeyPair>,
  encryptedUserKeys: Array<UserKeys>,
  provisionalUserKeys: IndexedProvisionalUserKeyPairs,
|};

function startsWith(haystack: string, needle: string) {
  if (String.prototype.startsWith)
    return haystack.startsWith(needle);

  return haystack.substr(0, needle.length) === needle;
}

const base64Prefix = '__BASE64__';

async function encryptObject(key: Uint8Array, plainObject: Object): Promise<Uint8Array> {
  const json = JSON.stringify(plainObject, (_k, v) => {
    if (v instanceof Uint8Array) {
      return base64Prefix + utils.toBase64(v);
    }
    return v;
  });
  return EncryptorV1.encrypt(key, utils.fromString(json));
}

async function decryptObject(key: Uint8Array, ciphertext: Uint8Array): Promise<Object> {
  const jsonBytes = EncryptorV1.decrypt(key, ciphertext);
  return JSON.parse(utils.toString(jsonBytes), (_k, v) => {
    if (typeof v === 'string' && startsWith(v, base64Prefix))
      return utils.fromBase64(v.substring(base64Prefix.length));
    return v;
  });
}

export function generateKeySafe(userSecret: Uint8Array): KeySafe {
  return {
    deviceId: null,
    userSecret,
    signaturePair: tcrypto.makeSignKeyPair(),
    encryptionPair: tcrypto.makeEncryptionKeyPair(),
    userKeys: [],
    encryptedUserKeys: [],
    provisionalUserKeys: {},
  };
}

export async function serializeKeySafe(keySafe: KeySafe): Promise<b64string> {
  const encrypted = await encryptObject(keySafe.userSecret, keySafe);
  return utils.toBase64(encrypted);
}

export async function deserializeKeySafe(serializedSafe: b64string, userSecret: Uint8Array): Promise<KeySafe> {
  const encryptedSafe = utils.fromBase64(serializedSafe);
  const safe = await decryptObject(userSecret, encryptedSafe);

  // Validation
  if (!safe || typeof safe !== 'object') {
    throw new Error('Invalid key safe');
  }

  // Migrations
  if (safe.provisionalUserKeys instanceof Array) {
    // Format migration for device created with SDKs in the v2.0.0-alpha series:
    for (const puk of safe.provisionalUserKeys) {
      safe.provisionalUserKeys[puk.id] = puk;
    }
  } else if (!safe.provisionalUserKeys) {
    // Add an empty default for devices created before SDK v2.0.0
    safe.provisionalUserKeys = {};
  }

  // Validation of keys
  if (!safe.signaturePair || !safe.encryptionPair || !safe.userSecret || !safe.userKeys || !safe.encryptedUserKeys || !safe.provisionalUserKeys) {
    throw new Error('Invalid key safe');
  }

  return safe;
}
