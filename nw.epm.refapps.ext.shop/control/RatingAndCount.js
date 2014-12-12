jQuery.sap.declare("nw.epm.refapps.ext.shop.control.RatingAndCount");
sap.ui.core.Control.extend("nw.epm.refapps.ext.shop.control.RatingAndCount", {

	// The rating indicator and the rating count are combined in one control in order to be able to put
	// them in one table column instead of having to let them occupy one column each.                                 

	// API:
	metadata: {
		properties: {
			"maxRatingValue": "int",
			"value": "string",
			"enabled": "boolean",
			"iconSize": "string",
			"ratingCount": "string",
			"verticalAlignContent": "boolean",
			"verticalAdjustment": "int"
		},
		events: {
			"press": {}
		},
		aggregations: {
			"ratingCountLink": {
				type: "sap.m.Link",
				multiple: false,
				visibility: "hidden"
			},
			"ratingCountLabel": {
				type: "sap.m.Label",
				multiple: false,
				visibility: "hidden"
			},
			"ratingIndicator": {
				type: "sap.m.RatingIndicator",
				multiple: false,
				visibility: "hidden"
			}
		}

	},
	init: function() {
		this._oRating = new sap.m.RatingIndicator(this.getId() + "-rating");
		this._oRating.setEnabled(false);
		this.setAggregation("ratingIndicator", this._oRating, true);
		// The decision on whether the rating count is an sap.m.Link or an 
		// sap.m.Text can only be made once we know if a press handler is provided
		this._oRatingCountLink = new sap.m.Link(this.getId() + "-ratingCountLink");
		this.setAggregation("ratingCountLink", this._oRatingCountLink, true);
		this._oRatingCountLabel = new sap.m.Label(this.getId() + "-ratingCountLabel");
		this._oRatingCountLabel.addStyleClass("noColonLabelInForm");
		this.setAggregation("ratingCountLabel", this._oRatingCountLabel, true);
	},

	onclick: function() {
		if (this.getEnabled() === true) {
			this.firePress({
				source: this._oRatingCountLink
			});
		}
	},

	// Overwriting the setter method is done in order to hand down the values to the
	// inner control. The setter method is used by the binding to update the
	// control's value.
	setValue: function(sValue) {
		this._oRating.setValue(sValue);
		return this.setProperty("value", sValue);
	},

	// Overwriting the setter method is done in order to hand down the values to the
	// inner control. The setter method is used by the binding to update the
	// control's value.
	setMaxRatingValue: function(sMaxRatingValue) {
		this._oRating.setMaxValue(sMaxRatingValue);
		return this.setProperty("maxRatingValue", sMaxRatingValue);
	},

	// Overwriting the setter method is done in order to hand down the values to the
	// inner control. The setter method is used by the binding to update the
	// control's value.
	setIconSize: function(sIconSize) {
		this._oRating.setIconSize(sIconSize);
		return this.setProperty("iconSize", sIconSize);
	},

	// Overwriting the setter method is done in order to hand down the values to the
	// inner control. The setter method is used by the binding to update the
	// control's value.
	// Note that two controls are potentially affected in this case.
	setRatingCount: function(sRatingCount) {
		this._oRatingCountLabel.setText("(" + sRatingCount + ")");
		this._oRatingCountLink.setText("(" + sRatingCount + ")");
		return this.setProperty("ratingCount", sRatingCount);
	},

	// creating the HTML:
	renderer: function(oRm, oControl) {
		var oRatingCount = oControl.hasListeners("press") ? oControl.getAggregation("ratingCountLink") : oControl.getAggregation(
			"ratingCountLabel");
		var sOuterDivStyle = "";
		if (oControl.getVerticalAdjustment() && oControl.getVerticalAdjustment() !== 0) {
			if (sOuterDivStyle === "") {
				sOuterDivStyle = " style ='";
			}
			sOuterDivStyle += "-webkit-transform:translateY(" + oControl.getVerticalAdjustment() + "%);";
			sOuterDivStyle += "-ms-transform:translateY(" + oControl.getVerticalAdjustment() + "%);";
			sOuterDivStyle += "transform:translateY(" + oControl.getVerticalAdjustment() + "%);";
		}
		if (oControl.getVerticalAlignContent()) {
			if (sOuterDivStyle === "") {
				sOuterDivStyle = " style ='";
			}
			sOuterDivStyle += "line-height:" + oControl.getIconSize();
			oRatingCount.addStyleClass("nwEpmRefappsLibraryRatingAndCountVAlign");
		}
		if (sOuterDivStyle !== "") {
			sOuterDivStyle += "'";
		}
		oRm.write("<div");
		oRm.writeControlData(oControl); // write the Control ID and enable event
		// handling
		oRm.write(sOuterDivStyle);
		oRm.write(">");
		oRm.renderControl(oControl.getAggregation("ratingIndicator"));
		oRm.renderControl(oRatingCount);
		oRm.write("</div>");
	}
});