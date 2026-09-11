import {useEffect, useState} from 'react';
import styled from 'styled-components';
import {OverflowCell, SubmenuCell, SubmenuRow} from '../grid';
import {CenterPane} from '../pane';
import {title, component} from '../../icons/lightbulb';
import {GeneralPane} from './submenus/lighting/general';
import {
  LayoutConfigValues,
  Pane as LayoutPane,
} from './submenus/lighting/layout';
import {
  AdvancedLightingValues,
  AdvancedPane,
} from './submenus/lighting/advanced';
import {ProfilesPane} from './submenus/lighting/profiles';
import {getLightingDefinition, isVIADefinitionV2} from '@the-via/reader';
import {useAppSelector} from 'src/store/hooks';
import {getSelectedDefinition} from 'src/store/definitionsSlice';
import {getSelectedKeyboardAPI} from 'src/store/devicesSlice';
import {probeRGBProfileCapabilities} from 'src/utils/rgb-profile-api';
import type {FC} from 'react';
import {useTranslation} from 'react-i18next';

export const Category = {
  General: {label: 'General', Menu: GeneralPane},
  Layout: {label: 'Layout', Menu: LayoutPane},
  Advanced: {label: 'Advanced', Menu: AdvancedPane},
  Profiles: {label: 'RGB Profiles', Menu: ProfilesPane},
};

const LightingPane = styled(CenterPane)`
  height: 100%;
  background: var(--color_dark_grey);
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 0 12px;
`;

const MenuContainer = styled.div`
  padding: 15px 20px 20px 10px;
`;

export const Pane: FC = () => {
  const {t} = useTranslation();
  const selectedDefinition = useAppSelector(getSelectedDefinition);
  const keyboardApi = useAppSelector(getSelectedKeyboardAPI);

  const [selectedCategory, setSelectedCategory] = useState(Category.General);
  const [hasRGBProfiles, setHasRGBProfiles] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasRGBProfiles(false);

    if (!keyboardApi) {
      return;
    }

    void probeRGBProfileCapabilities(keyboardApi).then((capabilities) => {
      if (!cancelled) {
        setHasRGBProfiles(capabilities !== null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [keyboardApi]);

  useEffect(() => {
    if (!hasRGBProfiles && selectedCategory === Category.Profiles) {
      setSelectedCategory(Category.General);
    }
  }, [hasRGBProfiles, selectedCategory]);

  const getMenus = () => {
    if (!isVIADefinitionV2(selectedDefinition)) {
      throw new Error(
        t('This lighting component is only compatible with v2 definitions'),
      );
    }

    const hasLayouts = LayoutConfigValues.some(
      (value) =>
        getLightingDefinition(
          selectedDefinition.lighting,
        ).supportedLightingValues.indexOf(value) !== -1,
    );
    const hasAdvanced = AdvancedLightingValues.some(
      (value) =>
        getLightingDefinition(
          selectedDefinition.lighting,
        ).supportedLightingValues.indexOf(value) !== -1,
    );

    return [
      Category.General,
      ...(hasLayouts ? [Category.Layout] : []),
      ...(hasAdvanced ? [Category.Advanced] : []),
      ...(hasRGBProfiles ? [Category.Profiles] : []),
    ].filter(({Menu}) => !!Menu);
  };

  return (
    <>
      <SubmenuCell>
        <MenuContainer>
          {getMenus().map((menu) => (
            <SubmenuRow
              $selected={selectedCategory === menu}
              onClick={() => setSelectedCategory(menu)}
              key={menu.label}
            >
              {t(menu.label)}
            </SubmenuRow>
          ))}
        </MenuContainer>
      </SubmenuCell>
      <OverflowCell>
        <LightingPane>
          <Container>
            <selectedCategory.Menu />
          </Container>
        </LightingPane>
      </OverflowCell>
    </>
  );
};

export const Icon = component;
export const Title = title;
