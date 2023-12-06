module.exports = {
    'env': {
        'browser': true,
        'es2021': true
    },
    'extends': ['airbnb', 'airbnb-typescript/base'],
    'parserOptions': {
        'ecmaVersion': 'latest',
        'sourceType': 'module',
        'project': './tsconfig.json'
    },
}
