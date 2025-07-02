/* why-did-you-render setup */
import React from 'react';

if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_RENDERS === 'true') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: false,
    // Only track specific components when debugging
    trackExtraHooks: [],
  });
}
