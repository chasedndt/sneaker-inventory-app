/* why-did-you-render setup */
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    // Uncomment if you want to ignore certain components
    // trackExtraHooks: [[require('react-redux/lib'), 'useSelector']],
  });
}
