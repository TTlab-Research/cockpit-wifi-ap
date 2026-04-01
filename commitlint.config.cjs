module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'perf', 'refactor', 'docs', 'chore', 'ci', 'revert'],
        ],
        'subject-case': [2, 'always', 'lower-case'],
        'header-max-length': [2, 'always', 100],
    },
}
