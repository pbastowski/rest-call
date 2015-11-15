Package.describe({
    name:          'pbastowski:rest-call',
    version:       '1.0.0',
    summary:       'RestCall annotation for angular2-now',
    git:           'https://github.com/pbastowski/rest-call',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.2.0.1');
    //api.use('pbastowski:angular2-now@0.2.9');
    //api.use('pbastowski:ng2now');
    api.use('pbastowski:typescript');
    api.addFiles('rest-call.ts', ['client']);
});
