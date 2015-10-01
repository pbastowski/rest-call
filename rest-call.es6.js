var ng2nRestCall = function () {
    // Get $http and $log from angular
    var $http = angular.injector(['ng']).get('$http');
    var $q = angular.injector(['ng']).get('$q');
    var $log = angular.injector(['ng']).get('$log');

    /**
     * restConfig sets the global options for rest calls annotated with @RestCall.
     * These options can be overridden by using the options argument in the RestCall itself.
     *
     * - baseUrl        string = for example '/rest/'
     * - method         string = 'GET', 'PUT', 'POST', 'DELETE', 'UPDATE' are valid, 'GET' is default
     * - jsonPrefix     string = optional JSON vulnerability prefix to automatically remove from returned data
     * - showError      truthy = show the error dialog, falsy = don't show it
     * - ignoreErrors   array  = error/status codes to pass through to the caller and not handle
     * - errorHandler   string = angular service name or function to call when an $HTTP error occurs.
     *                  Receives the following object as an argument: { data: {}, api: "", method: "", payload: {}, options: {} }
     * - errorMessage   string = custom error message to display at the top of the error dialog's text
     * - spinner        object = exposes show() and hide() methods
     * - events         object = exposes beforeCall() and afterCall(), which will be called before and after the ajax call
     */

    var restOptions = {
        baseUrl:      '',
        method:       'GET',
        jsonPrefix:   '',
        showError:    1,
        ignoreErrors: [],
        errorHandler: '',
        errorMessage: '',
        spinner:      {show: angular.noop, hide: angular.noop},
        events:       {beforeCall: angular.noop, afterCall: angular.noop}
    };

    if ("undefined" !== typeof angular2now) {
        var ng2nOptions = angular2now.options();
    }
    var currentModule;

    function getNg2nSettings() {
        currentModule = ng2nOptions.currentModule();

        return {
            events: ng2nOptions.events,
            spinner: ng2nOptions.spinner
        }
    }

    function restConfig(options) {
        angular.merge(restOptions, options);
    }

    function RestCall(apiTemplate, _options) {
        var options = angular.merge({}, restOptions, getNg2nSettings(), _options);

        var spinner = options.spinner || restOptions.spinner;
        var events = options.events || restOptions.events;

        return function (target, name, descriptor) {

            descriptor.value = function () {
                var api = apiTemplate;
                var REGEX = /\${(\w+)}/g;

                if (currentModule && typeof spinner === 'string') {
                    spinner = angular.injector(['ng', currentModule]).get(spinner);
                    options.spinner = spinner;
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

                events.beforeCall();  // Call optional events.beforeCall()

                // todo: should call Meteor after resolution of promise returned by beforeCall()
                // Call the restService
                var promise = restService(api, options.method, args[0], options);

                // Do post call tasks
                promise.finally(function () {
                    spinner.hide();

                    events.afterCall(); // Call optional events.afterCall()
                });

                return promise;

            };

            return descriptor;
        };
    }

    function restService(api, method, args, _options) {
        var options = angular.merge({}, restOptions, _options);
        var that = this;
        var headers = options.headers;
        var queryParams = '';

        if (!checkParameters()) return;

        // A GET call can optionally pass a data payload, in the form od a JS object literal,
        // through the args parameter. These args must be serialized, converted into a queryString,
        // and appended to the api parameter.
        if (args && method === 'GET') queryParams = '?' + urlEncode(args);

        // Prepare the HTTP call definition object
        var hdo = {
            url:               options.baseUrl + api + queryParams,
            data:              args,
            method:            method,
            transformResponse: function (data) {
                return stripJsonVulnerabilityPrefix(data, options.jsonPrefix);
            }
        };
        if (headers) hdo.headers = headers;

        // Call the REST API
        var pr = $http(hdo).then(success, errorHandler);

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
        function errorHandler(data) {

            if (options.errorHandler) {

                // Get instance of errorHandler service, if errorHandler was a string
                if (currentModule && typeof options.errorHandler === 'string') {
                    var inj = angular.injector(['ng', currentModule]);
                    if (inj.has(options.errorHandler))
                        options.errorHandler = inj.get(options.errorHandler);
                }

                options.errorHandler({data: data, api: api, method: method, payload: args, options: options});
            }
            else {

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
                    $log.debug('Error: ', method, api, '\n  args: ', args, '\n data: ', data.data);

                    if (options.showError && !(options.ignoreErrors && options.ignoreErrors.indexOf(data.status) > -1)) {
                        // handle options.ignoreErrors array, if present
                        alert([
                            (options.errorMsg ? options.errorMsg + '\n' : ''),
                            er,
                            'Status code: ' + data.status + '\n\n',
                            (data.data ? JSON.stringify(data.data) : '')
                        ].join(''));
                    }
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
                    data = data.slice(jsonPrefix.length);
            }
            return data;
        }

        /**
         * urlEncode
         *
         * Encoding a JS object into a URL string. If an array is passed in it will be expanded correctly.
         *
         * Usage: urlEncode(args)
         *
         * { a:1, b:2 } ---> "a=1&b=2".
         * { s1: 'hello', s2: 'world', abc: [1,2,3] } ---> "s1=hello&s2=world&abc=1&abc=2&abc=3"
         *
         * Object properties with empty string values or 0 length arrays are not included in the returned string.
         * { a:'', b:2, arr: [] }
         * encoded into the string "b=2".
         *
         * @param data A JavaScript object to be encoded into a URL string
         * @returns {*}
         */
        function urlEncode(data) {
            if (typeof data === 'undefined') return '';
            if (data instanceof String) return data;
            if (Object.keys(data).length === 0) return '';

            var url = '', i, v;
            for (i in data) {
                v = data[i];
                if (v instanceof Array && v.length)
                    url += (url ? '&' : '') + v.map(function(v) { return encodeURIComponent(i) + '=' + encodeURIComponent(v)}).join('&');
                else
                    if (v+'' !== '' && v+'' !== 'undefined') url += (url ? '&' : '') + encodeURIComponent(i) + '=' + encodeURIComponent(v);

            }
            return url;
        }

    }

    return {
        restConfig: restConfig,
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
