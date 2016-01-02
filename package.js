Package.describe({
    name:          'pbastowski:rest-call',
    version:       '0.2.0',
    summary:       'RestCall annotation for angular2-now',
    git:           'https://github.com/pbastowski/rest-call',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.2.0.1');
    api.use('pbastowski:angular2-now@1.0.1');
    api.addFiles('rest-call.es6.js', ['client']);
});
