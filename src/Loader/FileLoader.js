import { dirname } from 'path';

const FileLoaderLoadException = Jymfony.Component.Config.Exception.FileLoaderLoadException;
const FileLoaderImportCircularReferenceException = Jymfony.Component.Config.Exception.FileLoaderImportCircularReferenceException;
const FileLocatorFileNotFoundException = Jymfony.Component.Config.Exception.FileLocatorFileNotFoundException;
const GlobResource = Jymfony.Component.Config.Resource.GlobResource;
const Loader = Jymfony.Component.Config.Loader.Loader;

/**
 * FileLoader is the abstract class used by all built-in loaders that are file based.
 *
 * @memberOf Jymfony.Component.Config.Loader
 *
 * @abstract
 */
export default class FileLoader extends Loader {
    /**
     * Constructor
     *
     * @param {Jymfony.Component.Config.FileLocatorInterface} locator
     * @param {string | null} [env = null]
     */
    __construct(locator, env = null) {
        super.__construct(env);

        /**
         * @type {Jymfony.Component.Config.FileLocatorInterface}
         *
         * @protected
         */
        this._locator = locator;

        /**
         * @type {undefined|string}
         *
         * @private
         */
        this._currentDir = undefined;
    }

    /**
     * Gets the current directory.
     *
     * @returns {string}
     */
    get currentDir() {
        return this._currentDir;
    }

    /**
     * Sets the current directory.
     *
     * @param {string} dir
     */
    set currentDir(dir) {
        this._currentDir = dir;
    }

    /**
     * Returns the file locator used by this loader.
     *
     * @returns {Jymfony.Component.Config.FileLocatorInterface}
     */
    get locator() {
        return this._locator;
    }

    /**
     * Imports a resource.
     *
     * @param {*} resource
     * @param {undefined|string} [type]
     * @param {boolean} [ignoreErrors = false]
     * @param {undefined|string} [sourceResource]
     *
     * @returns {*}
     *
     * @throws {Jymfony.Component.Config.Exception.FileLoaderLoadException}
     * @throws {Jymfony.Component.Config.Exception.FileLoaderImportCircularReferenceException}
     * @throws {Jymfony.Component.Config.Exception.FileLocatorFileNotFoundException}
     */
    importResource(resource, type = undefined, ignoreErrors = false, sourceResource = undefined) {
        let i;
        if (isString(resource) && resource.length !== (i = __jymfony.strcspn(resource, '*?{['))) {
            const ret = [];
            let isSubpath = 0 !== i && -1 !== resource.substr(0, i).indexOf('/');

            for (const path of this._glob(resource, false, ignoreErrors || !isSubpath)) {
                let res;
                if (undefined !== (res = this._doImport(path, type, ignoreErrors, sourceResource))) {
                    ret.push(res);
                }

                isSubpath = true;
            }
            if (isSubpath) {
                return ret[1] ? ret : ret[0];
            }
        }

        return this._doImport(resource, type, ignoreErrors, sourceResource);
    }

    /**
     * @protected
     *
     * @internal
     */
    _glob(pattern, recursive, ignoreErrors = false, forExclusion = false, excluded = []) {
        let i, prefix;
        if (pattern.length === (i = __jymfony.strcspn(pattern, '*?{['))) {
            prefix = pattern;
            pattern = '';
        } else if (0 === i || -1 === pattern.substring(0, i).indexOf('/')) {
            prefix = '.';
            pattern = '/'+pattern;
        } else {
            prefix = dirname(pattern.substring(0, 1 + i));
            pattern = pattern.substring(prefix.length);
        }

        try {
            prefix = this._locator.locate(prefix, this._currentDir, true);
        } catch (e) {
            if (!(e instanceof FileLocatorFileNotFoundException) || !ignoreErrors) {
                throw e;
            }
        }

        return new GlobResource(prefix, pattern, recursive, forExclusion, excluded);
    }

    /**
     * @param {*} resource
     * @param {undefined|string} [type]
     * @param {boolean} [ignoreErrors = false]
     * @param {undefined|string} [sourceResource]
     *
     * @returns {*}
     *
     * @private
     */
    _doImport(resource, type = undefined, ignoreErrors = false, sourceResource = undefined) {
        try {
            const loader = this.resolve(resource, type);
            let ret;

            if (loader instanceof FileLoader && undefined !== this._currentDir) {
                resource = loader.locator.locate(resource, this._currentDir, false);
            }

            const resources = isArray(resource) ? resource : [ resource ];
            for (let i = 0; i < resources.length; ++i) {
                if (FileLoader.loading.has(resources[i])) {
                    if (i === resources.length - 1) {
                        throw new FileLoaderImportCircularReferenceException(Array.from(FileLoader.loading));
                    }
                } else {
                    resource = resources[i];
                    break;
                }
            }

            FileLoader.loading.add(resource);
            try {
                ret = loader.load(resource, type);
            } finally {
                FileLoader.loading.delete(resource);
            }

            return ret;
        } catch (e) {
            if (e instanceof FileLoaderImportCircularReferenceException) {
                throw e;
            }
            if (!ignoreErrors) {
                // Prevent embedded imports from nesting multiple exceptions
                if (e instanceof FileLoaderLoadException) {
                    throw e;
                }

                throw new FileLoaderLoadException(resource, sourceResource, undefined, e, type);
            }
        }
    }
}

FileLoader.loading = new Set();
