import React from 'react';
import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <span>@yme/api</span>,
  project: {
    link: 'https://github.com/minosss/api',
  },
  chat: {},
  docsRepositoryBase: 'https://github.com/minosss/api/docs',
  footer: {
    component: null,
  },
  search: {
    component: null,
  },
};

export default config;
