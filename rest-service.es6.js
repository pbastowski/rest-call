var ng2nRestCall = function() {
    var {Service} = angular2now;

    /**
     * restOptions are the global options for rest calls. These can be overridden
     * by using the options argument in the RestCall itself.
     *
     * - spinner        object = exposes show() and hide() methods
     * - showError      truthy = show the error dialog, falsy = don't show it
     * - ignoreErrors   array of error/status codes to pass through to the caller
     * - baseUrl        string = for example '/rest/'
     * - errorHandler   string = angular service name or function to call when an $HTTP error occurs
     */
    var ng2nOptions = angular2now.options();
    var restOptions = {
        baseUrl:    '',
        jsonPrefix:   '',
        showError:    1,
        ignoreErrors: [],
        errorHandler: null,
        method:       'GET',
        spinner:      angular2now.options().spinner,
    };
    var currentModule = ng2nOptions.currentModule();

    // Get $http and $log from angular
    var $http = angular.injector(['ng']).get('$http');
    var $q = angular.injector(['ng']).get('$q');
    var $log = angular.injector(['ng']).get('$log');

    /**
     * RestConfig annotation sets the base URL (baseUrl) and other options for the rest api calls.
     */

    function RestConfig(options) {
        return function (target) {
            angular.merge(restOptions, options);
            return target;
        }
    }

    function RestCall(apiTemplate, _options) {
        var options = angular.merge({}, restOptions, _options);
        var spinner = options.spinner || {show: angular.noop, hide: angular.noop};
        //$log.log('@RestCall: options: ', options);

        return function (target, name, descriptor) {

            target[name] = function () {
                var api = apiTemplate;
                var REGEX = /\${(\w+)}/g;

                if (typeof spinner === 'string') {
                    spinner = angular.injector(['ng', currentModule]).get(spinner);
                    options.spinner = spinner;
                    window.sp = spinner;
                }

                var args = Array.prototype.slice.call(arguments);

                // Get parameter names from apiTemplate
                var apiArgs = apiTemplate.match(REGEX) || [];

                // Interpolate the parameters in the apiTemplate
                apiArgs.forEach(function (name, index) {
                    api = api.replace(name, args[index]);
                });
                args.splice(0, apiArgs.length);

                spinner.show();

                // Call optional ioHooks.beforeCall()
                if (options.ioHooks && ng2nOptions.ioHooks.beforeCall)
                    ng2nOptions.ioHooks.beforeCall();

                // todo: should call Meteor after resolution of promise returned by beforeCall()
                // Call the restService
                var promise = restService(api, options.method, args[0], options);

                // Do post call tasks
                promise.finally(function () {
                    spinner.hide();

                    // Call optional ioHooks.afterCall()
                    if (ng2nOptions.ioHooks && ng2nOptions.ioHooks.afterCall)
                        ng2nOptions.ioHooks.afterCall();
                });

                return promise;

            }

            return target;
        }
    }

    function restService(api, method, args, _options) {
        var options = angular.merge({}, restOptions, _options);

        //$log.log('restService: options: ', options);

        if (!checkParameters()) return;

        // Call the REST API
        var pr = $http({
            url:               options.baseUrl + api,
            data:              args,
            method:            method,
            transformResponse: function (data) {
                return stripJsonVulnerabilityPrefix(data, options.jsonPrefix);
            }
        }).then(success, failed);

        return pr;

        function checkParameters() {
            if (!angular.isString(api))
                throw new Error('restService: api parameter empty');

            // UPPER CASE and trim method name, for doing comparisons
            method = (method || '').toUpperCase().trim();

            // Default method is GET.
            if (!method) method = 'GET';

            // Only GET, POST, DELETE, UPDATE and PUT are allowed
            if (!/^(GET|POST|DELETE|UPDATE|PUT)$/.test(method))
                return false;

            // All is good, parameter checks passed.
            return true;
        }

        function success(data) {
            return data.data;
        }

        // global API failure handler
        function failed(data) {

            // Get error handler
            if (toptions.errorHandler === 'string')

            // Status code 400 is now actually a data validation error, so, no default messages for it any more.
            // Perhaps, one day it may be moved to the success side of the equation and passed in as an error object.
            // see: http://stackoverflow.com/questions/3290182/rest-http-status-codes-for-failed-validation-or-invalid-duplicate
            if (data.status !== 400) {

                var er = 'An unexpected error was encountered. The details are below.\n\n';

                // 404 = not found (ex: API method does not exist)
                if (data.status === 404) er = 'Method ' + api + ' does not exist.\n\n';
                // 403 = forbidden (ex: user already logged in, so, can't log in again)
                if (data.status === 403) er = 'Method ' + api + ' is not allowed in this context.\n\n';
                // 401 = authorization required (ex: logout when logged out already)
                if (data.status === 401) er = 'Method ' + api + ' requires authorization.\n\n';

                // log the error, showing the submitted data and the returned data
                $log.warn('Error: ', method, api, '\n', args, '\n', data.data);

                if (options.showError && !(options.ignoreErrors && options.ignoreErrors.indexOf(data.status) > -1)) {
                    // handle options.ignoreErrors array, if present
                    alert(
                        (options.errorMsg ? options.errorMsg + '\n' : '')
                        + er
                        + 'Status code: ' + data.status + '\n\n'
                        + (data.data ? JSON.stringify(data.data) : '')
                    );
                }
            }

            // Reject using a new promise. Otherwise, if we just return data, it will come in through
            // the success side of the chain.
            return $q.reject(data);
        }

        function stripJsonVulnerabilityPrefix(data, jsonPrefix) {
            if (jsonPrefix && 'string' === typeof data) {
                // Remove the leading JSON vulnerability prefix
                if (data.indexOf(jsonPrefix) > -1)
                    data = angular.fromJson(data.slice(8));
            }
            return data;
        }
    }

/*
    // Defer the creation of this angular service until angular has been bootstrapped
    // because then we will be able to create them in the same module as the
    // main app;
    angular.element(document).ready( createService );

    function createService() {

        console.log('@rest-service: ', currentModule);
        angular.module(currentModule)
            .service('restService', restService);

    }
*/

    return {
      RestConfig: RestConfig,
      RestCall:   RestCall
    };
}();

// Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ng2nRestCall;
}

// AMD / RequireJS
else if (typeof define !== 'undefined' && define.amd) {
    define('ng2nRestCall', [], function () {
        return ng2nRestCall;
    });
}

// included directly
else {
    this.ng2nRestCall = ng2nRestCall;
}
