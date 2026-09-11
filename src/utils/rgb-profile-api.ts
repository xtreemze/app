import type {KeyboardAPI} from './keyboard-api';

export const RGB_PROFILE_COMMAND = 0xf0;
export const RGB_PROFILE_PROTOCOL_VERSION = 1;
export const RGB_PROFILE_UNASSIGNED = 0xff;

export enum RGBProfileScope {
  Global = 0,
  Layer = 1,
  Modifier = 2,
  Combo = 3,
}

export enum RGBModifierProfile {
  Control = 0,
  GUI = 1,
  Shift = 2,
  Alt = 3,
}

export type RGBProfile = Readonly<{
  mode: number;
  hue: number;
  saturation: number;
  brightness: number;
  speed: number;
}>;

export type RGBProfileCapabilities = Readonly<{
  protocolVersion: number;
  scopeFlags: number;
  layerCount: number;
  modifierCount: number;
  comboCount: number;
  maximumBrightness: number;
  maximumMode: number;
  fieldFlags: number;
  precedenceVersion: number;
}>;

enum RGBProfileOperation {
  GetCapabilities = 0x01,
  GetProfile = 0x02,
  SetProfile = 0x03,
  Save = 0x04,
  Preview = 0x05,
  GetComboDuration = 0x06,
  SetComboDuration = 0x07,
  CancelPreview = 0x08,
}

const assertByte = (label: string, value: number): number => {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`${label} must be an unsigned byte`);
  }
  return value;
};

const assertUInt16 = (label: string, value: number): number => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${label} must be an unsigned 16-bit integer`);
  }
  return value;
};

const profileBytes = (profile: RGBProfile): number[] => [
  assertByte('mode', profile.mode),
  assertByte('hue', profile.hue),
  assertByte('saturation', profile.saturation),
  assertByte('brightness', profile.brightness),
  assertByte('speed', profile.speed),
];

const scopeIndex = (scope: RGBProfileScope, index: number): number[] => [
  assertByte('scope', scope),
  assertByte('index', index),
];

export const isRGBProfileAssigned = (profile: RGBProfile): boolean =>
  profile.mode !== RGB_PROFILE_UNASSIGNED;

export const probeRGBProfileCapabilities = async (
  keyboardApi: KeyboardAPI,
): Promise<RGBProfileCapabilities | null> => {
  try {
    const response = await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
      RGBProfileOperation.GetCapabilities,
    ]);
    const capabilities: RGBProfileCapabilities = {
      protocolVersion: response[2],
      scopeFlags: response[3],
      layerCount: response[4],
      modifierCount: response[5],
      comboCount: response[6],
      maximumBrightness: response[7],
      maximumMode: response[8],
      fieldFlags: response[9],
      precedenceVersion: response[10],
    };

    if (
      capabilities.protocolVersion !== RGB_PROFILE_PROTOCOL_VERSION ||
      capabilities.layerCount <= 0 ||
      capabilities.modifierCount <= 0 ||
      capabilities.maximumMode <= 0
    ) {
      return null;
    }
    return capabilities;
  } catch {
    return null;
  }
};

export const getRGBProfile = async (
  keyboardApi: KeyboardAPI,
  scope: RGBProfileScope,
  index: number,
): Promise<RGBProfile> => {
  const response = await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
    RGBProfileOperation.GetProfile,
    ...scopeIndex(scope, index),
  ]);

  return {
    mode: response[4],
    hue: response[5],
    saturation: response[6],
    brightness: response[7],
    speed: response[8],
  };
};

export const setRGBProfile = async (
  keyboardApi: KeyboardAPI,
  scope: RGBProfileScope,
  index: number,
  profile: RGBProfile,
): Promise<void> => {
  await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
    RGBProfileOperation.SetProfile,
    ...scopeIndex(scope, index),
    ...profileBytes(profile),
  ]);
};

export const clearRGBProfile = async (
  keyboardApi: KeyboardAPI,
  scope: Exclude<RGBProfileScope, RGBProfileScope.Global>,
  index: number,
): Promise<void> => {
  await setRGBProfile(keyboardApi, scope, index, {
    mode: RGB_PROFILE_UNASSIGNED,
    hue: 0,
    saturation: 0,
    brightness: 0,
    speed: 0,
  });
};

export const saveRGBProfiles = async (
  keyboardApi: KeyboardAPI,
): Promise<void> => {
  await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [RGBProfileOperation.Save]);
};

export const previewRGBProfile = async (
  keyboardApi: KeyboardAPI,
  profile: RGBProfile,
): Promise<void> => {
  await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
    RGBProfileOperation.Preview,
    ...profileBytes(profile),
  ]);
};

export const cancelRGBProfilePreview = async (
  keyboardApi: KeyboardAPI,
): Promise<void> => {
  await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
    RGBProfileOperation.CancelPreview,
  ]);
};

export const getRGBComboDuration = async (
  keyboardApi: KeyboardAPI,
): Promise<number> => {
  const response = await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
    RGBProfileOperation.GetComboDuration,
  ]);
  return (response[2] << 8) | response[3];
};

export const setRGBComboDuration = async (
  keyboardApi: KeyboardAPI,
  durationMs: number,
): Promise<void> => {
  const value = assertUInt16('combo duration', durationMs);
  await keyboardApi.hidCommand(RGB_PROFILE_COMMAND, [
    RGBProfileOperation.SetComboDuration,
    value >> 8,
    value & 0xff,
  ]);
};
