/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: [
    'master',
    { name: 'main', channel: 'next', prerelease: 'beta' },
    { name: 'v1', channel: '1.x', range: '1.x' }
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
        { release: 'major', breaking: true },
        { release: 'minor', type: 'feat' },
        { release: 'patch', revert: true },
        { release: 'patch', type: 'build' },
        { release: 'patch', type: 'fix' },
        { release: 'patch', type: 'perf' },
        { release: 'patch', type: 'refactor' },
        { type: 'ci', release: false },
        { type: 'docs', release: false },
        { type: 'chore', release: false },
        { type: 'test', release: false },
        { type: 'style', release: false },
        { subject: '*skip release*', release: false },
      ],
      parserOpts: {
        noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES"]
      }
    }],
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: [
          {
            type: "revert",
            section: "Reverts",
            hidden: false,
          },
          {
            type: "feat",
            section: "Features",
            hidden: false,
          },
          {
            type: "fix",
            section: "Bug Fixes",
            hidden: false,
          },
          {
            type: "perf",
            section: "Performance improvements",
            hidden: false,
          },
          {
            type: "refactor",
            section: "Refactors",
            hidden: false,
          },
          {
            type: "build",
            section: "Build System",
            hidden: false,
          },
          {
            type: "docs",
            section: "Documentation",
            hidden: false,
          },
          { type: "chore", hidden: true },
          { type: "test", hidden: true },
          { type: "ci", hidden: true },
          { type: "style", hidden: true },
        ]
      },
      parserOpts: {
        noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES"]
      }
    }],
    ['@semantic-release/npm'],
    ['@semantic-release/github']
  ]
}
