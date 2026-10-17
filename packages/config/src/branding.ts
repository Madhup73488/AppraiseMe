export const BRAND = {
  name: 'AppraiseMe',
  shortName: 'appraiseme',
  scope: '@appraiseme',
  description: 'Privacy-oriented, AI-assisted professional work-memory',
  domain: 'appraiseme.com',
  desktopIdentifier: 'com.appraiseme.desktop',
  defaultTheme: 'appraiseme',
} as const

export type Brand = typeof BRAND
