const ResourceCheckerConfigCache = Jymfony.Component.Config.ResourceCheckerConfigCache;
const SelfCheckingResourceChecker = Jymfony.Component.Config.Resource.SelfCheckingResourceChecker;
const fs = require('fs');

/**
 * @memberOf Jymfony.Component.Config
 */
class ConfigCache extends ResourceCheckerConfigCache {
    /**
     * Creates a ConfigCache class
     *
     * @param {string} file
     * @param {boolean} debug
     */
    __construct(file, debug) {
        let checkers = [];
        if (debug) {
            checkers = [ new SelfCheckingResourceChecker() ];
        }

        super.__construct(file, checkers);
        this._debug = debug;
    }

    /**
     * {@inheritDoc}
     */
    isFresh() {
        if (! this._debug && fs.existsSync(this._file)) {
            return true;
        }

        return super.isFresh();
    }
}

module.exports = ConfigCache;
