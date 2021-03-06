// @flow
import varint from 'varint';
import { encryptionV1, encryptionV2, encryptionV3, encryptionV4, encryptionV5, type Key, random, tcrypto, generichash } from '@tanker/crypto';

import { InvalidArgument } from '@tanker/errors';

export type Resource = {
  resourceId: Uint8Array,
  key: Key,
}

// The maximum byte size of a resource encrypted with the "simple" algorithms
// (different from v4) is obtained by summing the sizes of:
//  - the version: 1 byte (varint < 128)
//  - the MAC: 16 bytes
//  - the IV: 24 bytes
//  - the data: 5 megabytes (libsodium's hard limit)
//
// By reading an input up to this size, we're sure to be able to extract the resource ID.
export const SAFE_EXTRACTION_LENGTH = 1 + 16 + 24 + 5 * (1024 * 1024);

type EncryptionFormatDescription = {
  version: number,
  encryptedChunkSize?: number,
};

export function makeResource(): Resource {
  const key = random(tcrypto.SYMMETRIC_KEY_SIZE);
  const resourceId = generichash(key, tcrypto.MAC_SIZE);
  return { key, resourceId };
}

export const getSimpleEncryption = () => encryptionV3;

export const getSimpleEncryptionWithFixedResourceId = () => encryptionV5;

export const getStreamEncryptionFormatDescription = (): EncryptionFormatDescription => ({
  version: 4,
  encryptedChunkSize: encryptionV4.defaultMaxEncryptedChunkSize,
});

const encryptionFormats = [null, encryptionV1, encryptionV2, encryptionV3, encryptionV4, encryptionV5];

export const getClearSize = (encryptionFormatDescription: EncryptionFormatDescription, encryptedSize: number): number => {
  const encryption: Object = encryptionFormats[encryptionFormatDescription.version];
  if (!encryption)
    throw new InvalidArgument(`Unhandled format version ${encryptionFormatDescription.version} used in encryptedData`);

  return encryption.getClearSize(encryptedSize, encryptionFormatDescription.encryptedChunkSize);
};

export const extractEncryptionFormat = (encryptedData: Uint8Array) => {
  let version;
  try {
    version = varint.decode(encryptedData);
  } catch (e) {
    throw new InvalidArgument('Could not decode encryption version from encryptedData');
  }

  const encryption = encryptionFormats[version];

  if (!encryption)
    throw new InvalidArgument(`Unhandled format version ${version} used in encryptedData`);

  if (encryptedData.length < encryption.overhead)
    throw new InvalidArgument(`Truncated encrypted data. Length should be at least ${encryption.overhead} with encryption format v${encryption.version}`);

  return encryption;
};
