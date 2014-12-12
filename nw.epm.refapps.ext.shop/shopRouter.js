jQuery.sap.require("sap.ui.core.routing.Router");
jQuery.sap.declare("nw.epm.refapps.ext.shop.shopRouter");

sap.ui.core.routing.Router.extend("nw.epm.refapps.ext.shop.shopRouter", {

    /**
     * Navigates back in the browser history, if the entry was created by this app. If not, it navigates to a route
     * passed to this function.
     * 
     * @public
     * @param {string}
     *            sRoute the name of the route if there is no history entry
     * @param {object}
     *            mData the parameters of the route, if the route does not need parameters, it may be omitted.
     */
    onBack : function(sRoute, mData) {
        var oHistory = sap.ui.core.routing.History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        // The history contains a previous entry
        if (sPreviousHash !== undefined) {
            window.history.go(-1);
        } else {
            var bReplace = true; // otherwise we go backwards with a forward history
            this.navTo(sRoute, mData, bReplace);
        }
    }
});