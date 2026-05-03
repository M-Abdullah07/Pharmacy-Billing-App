import { ShadowFacade } from './ShadowFacade';
import { legacyApi } from '../ports/legacyApi';
import { modularApi } from '../ports/modularApi';

export const facade = new ShadowFacade({
  oldApi: legacyApi,
  newApi: modularApi,
});
