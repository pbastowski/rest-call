Package.describe({
    name:          'pbastowski:rest-call',
    version:       '0.0.10',
    summary:       'RestCall annotation for angular2-now',
    git:           'https://github.com/pbastowski/rest-call',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.1.0.2');
    api.use('pbastowski:angular2-now@0.2.9');
    api.addFiles('rest-call.es6.js', ['client']);
});
