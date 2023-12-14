module.exports = {
    env: {
        'browser': true,
        'es2021': true
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    plugins: ['prettier'],
    parserOptions: {
        'ecmaVersion': 'latest',
        'sourceType': 'module',
        'project': './tsconfig.json'
    },
}
