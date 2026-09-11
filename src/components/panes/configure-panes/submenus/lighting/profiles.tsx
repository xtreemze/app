import {useEffect, useMemo, useState} from 'react';
import type {FC} from 'react';
import styled from 'styled-components';

import {AccentButton, PrimaryAccentButton} from 'src/components/inputs/accent-button';
import {AccentRange} from 'src/components/inputs/accent-range';
import {AccentSelect} from 'src/components/inputs/accent-select';
import {ColorPicker} from 'src/components/inputs/color-picker';
import {ControlRow, Detail, Label} from 'src/components/panes/grid';
import {getSelectedKeyboardAPI} from 'src/store/devicesSlice';
import {useAppSelector} from 'src/store/hooks';
import {
  RGBModifierProfile,
  RGBProfile,
  RGBProfileCapabilities,
  RGBProfileScope,
  RGB_PROFILE_UNASSIGNED,
  cancelRGBProfilePreview,
  clearRGBProfile,
  getRGBComboDuration,
  getRGBProfile,
  isRGBProfileAssigned,
  previewRGBProfile,
  probeRGBProfileCapabilities,
  saveRGBProfiles,
  setRGBComboDuration,
  setRGBProfile,
} from 'src/utils/rgb-profile-api';

const Section = styled.section`
  width: 100%;
  max-width: 960px;
`;

const Heading = styled.h2`
  color: var(--color_label-highlighted);
  font-size: 24px;
  font-weight: 400;
  margin: 24px 5px 8px;
`;

const Help = styled.p`
  color: var(--color_label);
  font-size: 16px;
  line-height: 1.45;
  margin: 8px 5px 18px;
`;

const Status = styled.span`
  color: var(--color_label);
  font-size: 16px;
  margin-left: 12px;
`;

const ButtonRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 18px 5px 26px;
`;

type Option<T extends number> = {value: T; label: string};

const scopeOptions: Option<RGBProfileScope>[] = [
  {value: RGBProfileScope.Global, label: 'Global / default'},
  {value: RGBProfileScope.Layer, label: 'Layer'},
  {value: RGBProfileScope.Modifier, label: 'Modifier'},
  {value: RGBProfileScope.Combo, label: 'Combo'},
];

const modifierNames: Record<RGBModifierProfile, string> = {
  [RGBModifierProfile.Control]: 'Control',
  [RGBModifierProfile.GUI]: 'GUI / Command',
  [RGBModifierProfile.Shift]: 'Shift',
  [RGBModifierProfile.Alt]: 'Alt / Option',
};

const defaultProfile: RGBProfile = {
  mode: 1,
  hue: 0,
  saturation: 0,
  brightness: 128,
  speed: 128,
};

const targetOptions = (
  scope: RGBProfileScope,
  capabilities: RGBProfileCapabilities,
): Option<number>[] => {
  switch (scope) {
    case RGBProfileScope.Global:
      return [{value: 0, label: 'Default'}];
    case RGBProfileScope.Layer:
      return Array.from({length: capabilities.layerCount}, (_, index) => ({
        value: index,
        label: `Layer ${index}`,
      }));
    case RGBProfileScope.Modifier:
      return Array.from({length: capabilities.modifierCount}, (_, index) => ({
        value: index,
        label:
          modifierNames[index as RGBModifierProfile] ?? `Modifier ${index + 1}`,
      }));
    case RGBProfileScope.Combo:
      return Array.from({length: capabilities.comboCount}, (_, index) => ({
        value: index,
        label: `Combo ${index + 1}`,
      }));
  }
};

const modeOptions = (maximumMode: number): Option<number>[] => [
  {value: 0, label: 'Off'},
  ...Array.from({length: maximumMode}, (_, index) => ({
    value: index + 1,
    label: `QMK effect ${index + 1}`,
  })),
];

const updateProfile = (
  profile: RGBProfile,
  patch: Partial<RGBProfile>,
): RGBProfile => ({...profile, ...patch});

export const ProfilesPane: FC = () => {
  const keyboardApi = useAppSelector(getSelectedKeyboardAPI);
  const [capabilities, setCapabilities] =
    useState<RGBProfileCapabilities | null>(null);
  const [scope, setScope] = useState(RGBProfileScope.Global);
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<RGBProfile | null>(null);
  const [comboDuration, setComboDuration] = useState(2000);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCapabilities(null);
    setProfile(null);
    setStatus('');

    if (!keyboardApi) {
      return;
    }

    void (async () => {
      const result = await probeRGBProfileCapabilities(keyboardApi);
      if (cancelled || !result) {
        return;
      }
      setCapabilities(result);
      try {
        const duration = await getRGBComboDuration(keyboardApi);
        if (!cancelled) {
          setComboDuration(duration);
        }
      } catch {
        // Profile editing remains usable if an older protocol omits duration.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyboardApi]);

  useEffect(() => {
    let cancelled = false;
    if (!keyboardApi || !capabilities) {
      return;
    }

    const options = targetOptions(scope, capabilities);
    const safeIndex = options.some((option) => option.value === index)
      ? index
      : options[0]?.value ?? 0;
    if (safeIndex !== index) {
      setIndex(safeIndex);
      return;
    }

    setProfile(null);
    setStatus('');
    void getRGBProfile(keyboardApi, scope, safeIndex)
      .then((value) => {
        if (!cancelled) {
          setProfile(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('Could not read this profile from the keyboard.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [keyboardApi, capabilities, scope, index]);

  const targets = useMemo(
    () => (capabilities ? targetOptions(scope, capabilities) : []),
    [capabilities, scope],
  );
  const modes = useMemo(
    () => (capabilities ? modeOptions(capabilities.maximumMode) : []),
    [capabilities],
  );

  if (!keyboardApi || !capabilities) {
    return (
      <Section>
        <Heading>RGB Profiles</Heading>
        <Help>
          This keyboard does not expose the extended RGB profile capability, or
          the capability probe is still in progress.
        </Help>
      </Section>
    );
  }

  const assigned = profile ? isRGBProfileAssigned(profile) : false;
  const selectedScope = scopeOptions.find((option) => option.value === scope);
  const selectedTarget = targets.find((option) => option.value === index);
  const selectedMode = modes.find((option) => option.value === profile?.mode);

  const createOverride = async () => {
    setIsBusy(true);
    setStatus('');
    try {
      const inherited = await getRGBProfile(
        keyboardApi,
        RGBProfileScope.Global,
        0,
      );
      setProfile(
        isRGBProfileAssigned(inherited) ? inherited : defaultProfile,
      );
      setStatus('Override prepared. Save to persist it.');
    } catch {
      setProfile(defaultProfile);
      setStatus('Override prepared from defaults. Save to persist it.');
    } finally {
      setIsBusy(false);
    }
  };

  const save = async () => {
    if (!profile || !assigned) {
      return;
    }
    setIsBusy(true);
    setStatus('');
    try {
      await setRGBProfile(keyboardApi, scope, index, profile);
      await setRGBComboDuration(keyboardApi, comboDuration);
      await saveRGBProfiles(keyboardApi);
      setStatus('Saved to keyboard.');
    } catch {
      setStatus('Save failed. The keyboard rejected the requested profile.');
    } finally {
      setIsBusy(false);
    }
  };

  const clear = async () => {
    if (scope === RGBProfileScope.Global) {
      return;
    }
    setIsBusy(true);
    setStatus('');
    try {
      await clearRGBProfile(
        keyboardApi,
        scope as Exclude<RGBProfileScope, RGBProfileScope.Global>,
        index,
      );
      await saveRGBProfiles(keyboardApi);
      setProfile({
        mode: RGB_PROFILE_UNASSIGNED,
        hue: 0,
        saturation: 0,
        brightness: 0,
        speed: 0,
      });
      setStatus('Override cleared; this target now inherits.');
    } catch {
      setStatus('Could not clear the override.');
    } finally {
      setIsBusy(false);
    }
  };

  const preview = async () => {
    if (!profile || !assigned) {
      return;
    }
    setIsBusy(true);
    setStatus('');
    try {
      await previewRGBProfile(keyboardApi, profile);
      setStatus('Previewing temporarily on the keyboard.');
    } catch {
      setStatus('Preview was rejected by the keyboard.');
    } finally {
      setIsBusy(false);
    }
  };

  const cancelPreview = async () => {
    setIsBusy(true);
    try {
      await cancelRGBProfilePreview(keyboardApi);
      setStatus('Preview cancelled.');
    } catch {
      setStatus('Could not cancel the preview.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Section>
      <Heading>RGB Profiles</Heading>
      <Help>
        Profiles are resolved by precedence: combo → Control → GUI/Command →
        Shift → Alt/Option → layer → global. Clearing an override restores
        inheritance. Global is the required final fallback.
      </Help>

      <ControlRow>
        <Label>Profile scope</Label>
        <Detail>
          <AccentSelect
            options={scopeOptions}
            value={selectedScope}
            onChange={(option: any) => {
              if (option) {
                setScope(option.value as RGBProfileScope);
                setIndex(0);
              }
            }}
          />
        </Detail>
      </ControlRow>

      <ControlRow>
        <Label>Target</Label>
        <Detail>
          <AccentSelect
            options={targets}
            value={selectedTarget}
            onChange={(option: any) => option && setIndex(Number(option.value))}
          />
        </Detail>
      </ControlRow>

      {!profile ? (
        <Help>Reading profile…</Help>
      ) : !assigned ? (
        <>
          <Help>
            This target has no override and currently inherits from the next
            applicable profile in the precedence chain.
          </Help>
          <ButtonRow>
            <PrimaryAccentButton disabled={isBusy} onClick={createOverride}>
              Create Override
            </PrimaryAccentButton>
            {status && <Status>{status}</Status>}
          </ButtonRow>
        </>
      ) : (
        <>
          <ControlRow>
            <Label>Effect</Label>
            <Detail>
              <AccentSelect
                options={modes}
                value={selectedMode}
                onChange={(option: any) =>
                  option &&
                  setProfile(
                    updateProfile(profile, {mode: Number(option.value)}),
                  )
                }
              />
            </Detail>
          </ControlRow>

          <ControlRow>
            <Label>Color</Label>
            <Detail>
              <ColorPicker
                color={{hue: profile.hue, sat: profile.saturation}}
                setColor={(hue, saturation) =>
                  setProfile(updateProfile(profile, {hue, saturation}))
                }
              />
            </Detail>
          </ControlRow>

          <ControlRow>
            <Label>Brightness</Label>
            <Detail>
              <AccentRange
                min={0}
                max={capabilities.maximumBrightness}
                value={profile.brightness}
                onChange={(brightness) =>
                  setProfile(updateProfile(profile, {brightness}))
                }
              />
            </Detail>
          </ControlRow>

          <ControlRow>
            <Label>Effect speed</Label>
            <Detail>
              <AccentRange
                min={0}
                max={255}
                value={profile.speed}
                onChange={(speed) =>
                  setProfile(updateProfile(profile, {speed}))
                }
              />
            </Detail>
          </ControlRow>

          {scope === RGBProfileScope.Combo && (
            <ControlRow>
              <Label>Combo highlight duration (ms)</Label>
              <Detail>
                <AccentRange
                  min={250}
                  max={10000}
                  step={50}
                  value={comboDuration}
                  onChange={setComboDuration}
                />
              </Detail>
            </ControlRow>
          )}

          <ButtonRow>
            <PrimaryAccentButton disabled={isBusy} onClick={save}>
              Save to Keyboard
            </PrimaryAccentButton>
            <AccentButton disabled={isBusy} onClick={preview}>
              Preview
            </AccentButton>
            <AccentButton disabled={isBusy} onClick={cancelPreview}>
              Cancel Preview
            </AccentButton>
            {scope !== RGBProfileScope.Global && (
              <AccentButton disabled={isBusy} onClick={clear}>
                Clear Override
              </AccentButton>
            )}
            {status && <Status>{status}</Status>}
          </ButtonRow>
        </>
      )}
    </Section>
  );
};
