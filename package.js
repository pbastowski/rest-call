Package.describe({
    name:          'pbastowski:rest-call',
    version:       '0.1.2',
    summary:       'RestCall annotation for angular2-now',
    git:           'https://github.com/pbastowski/rest-call',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.1.0.2');
    api.use('pbastowski:angular2-now', {weak:true});
    api.addFiles('rest-call.js', ['client'], {transpile:false});
});
