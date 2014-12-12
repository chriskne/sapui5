jQuery.sap.declare("nw.epm.refapps.ext.shop.model.mockRequests");
// In mock mode, the mock server intercepts HTTP calls and provides fake output to the
// client without involving a backend system. But special backend logic, such as that 
// performed by function imports, is not automatically known to the mock server. To handle
// such cases, the app needs to define specific mock requests that simulate the backend 
// logic using standard HTTP requests (that are again interpreted by the mock server) as 
// shown below. 

// Please note:
// The usage of synchronous calls is only allowed in this context because the requests are
// handled by a latency-free client-side mock server. In production coding, asynchronous
// calls are mandatory.

nw.epm.refapps.ext.shop.model.mockRequests = {};

nw.epm.refapps.ext.shop.model.mockRequests.mockDeleteItem = function() {
	// This mock request updates the totals on the shopping cart when a
	// shopping cart item is deleted. This
	// is necessary because the the calculation of the totals and the update
	// of the shopping cart is not
	// directly triggered by a http request. Instead the back end does it
	// automatically during the
	// processing of a http delete request for a shopping cart item
	var oMockRequest = nw.epm.refapps.ext.shop.model.mockRequests._calcCartTotalsFromItems();
	oMockRequest.method = "DELETE";
	return oMockRequest;
};

nw.epm.refapps.ext.shop.model.mockRequests.mockAddProductToShoppingCart = function() {
	return {
		// This mock request is used by the mock server to replace the backend
		// function "AddProductToShoppingCart"
		// The following steps are usually performed by the original function:
		// - Create a shopping cart for the user if none exists yet. This is
		// not done here because the built-in mock
		// data already contains a shopping cart.
		// - Update the total quantity property of the shopping cart
		// - Create a new shopping cart item if there is no item yet that
		// contains the added material. If such an
		// item already exists, update its quantity and value accordingly.
		// These steps are simulated here using "POST" and "PUT" requests that
		// are intercepted and handled by the mock server.
		// The mock server has no latency so you can use synchronous calls.
		method: "POST",
		path: new RegExp("AddProductToShoppingCart\\?ProductId=(.*)"),
		response: function(oXhr, sUrlProductId) {
			var aItemIds = [];
			var oResponseGetTotalQuantity = null;
			var oResponseGetProduct = null;
			var oResponseGetShoppingCartItems = null;
			var oMatchingItem = null;
			var oProduct = null;
			var sProductId = decodeURIComponent(sUrlProductId);
			sProductId = sProductId.substring(1, sProductId.length - 1);
			var oShoppingCart;
			var sErrorTxt = "",
				bError = false;

			// get total quantity of shopping cart items
			oResponseGetTotalQuantity = jQuery.sap.sjax({
				url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)",
				type: "GET"
			});
			if (oResponseGetTotalQuantity.success) {
				oShoppingCart = oResponseGetTotalQuantity.data.d;
			} else {
				// If this request fails, it means the mock data was set up
				// incorrectly or the mock server is not working.
				bError = true;
				sErrorTxt = "Error: Mocking function import AddProductToShoppingCart failed";
				jQuery.sap.log.error("Error: Mocking function import AddProductToShoppingCart failed");
			}

			if (!bError) {
				// get the product details
				oResponseGetProduct = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Products('" + sProductId + "')",
					type: "GET"
				});
				if (oResponseGetProduct.success) {
					oProduct = oResponseGetProduct.data.d;
				} else {
					// If this request fails, it means the mock data was set up
					// incorrectly or the mock server is not working.
					bError = true;
					sErrorTxt = "Error: Mocking function import AddProductToShoppingCart failed";
					jQuery.sap.log.error("Error: Mocking function import AddProductToShoppingCart failed");
				}
			}

			if (!bError) {
				// Get shopping cart items
				oResponseGetShoppingCartItems = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)/ShoppingCartItems",
					type: "GET"
				});
				if (oResponseGetShoppingCartItems.success) {
					// check whether or not there is an item for the current
					// material and collect the Ids of the existing items if a new
					// item needs to be created we need to make sure that it gets a
					// new Id
					var i = 0;
					while (i < oResponseGetShoppingCartItems.data.d.results.length && !oMatchingItem) {
						if (oResponseGetShoppingCartItems.data.d.results[i].ProductId === sProductId) {
							oMatchingItem = oResponseGetShoppingCartItems.data.d.results[i];
							aItemIds.length = 0;
						} else {
							aItemIds.push(oResponseGetShoppingCartItems.data.d.results[i].Id);
						}
						i++;
					}
				} else {
					// If this request fails, it means the mock data was set up
					// incorrectly or the mock server is not working.
					bError = true;
					sErrorTxt = "Error: Mocking function import AddProductToShoppingCart failed";
					jQuery.sap.log.error("Error: Mocking function import AddProductToShoppingCart failed");
				}
			}
			if (!bError) {
				// Create a new shopping cart item or update an existing one
				var oNewItemData = {};
				var oResponseShoppingCartItem = {};
				if (oMatchingItem) {
					// There is already an item for this product -> just update the
					// quantity and value
					oNewItemData = {
						Id: oMatchingItem.Id,
						ProductId: oMatchingItem.ProductId,
						CurrencyCode: oMatchingItem.CurrencyCode,
						Product: oMatchingItem.Product,
						Quantity: +oMatchingItem.Quantity + 1,
						ShoppingCartId: oMatchingItem.ShoppingCartId,
						SubTotal: +oMatchingItem.SubTotal + +oProduct.Price,
						Unit: oMatchingItem.Unit
					};

					oResponseShoppingCartItem = jQuery.sap.sjax({
						url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCartItems('" + oMatchingItem.Id + "')",
						type: "PUT",
						data: JSON.stringify(oNewItemData)
					});

				} else {
					// create a new item for this product
					oNewItemData = {
						Id: nw.epm.refapps.ext.shop.model.mockRequests._getNewId(aItemIds),
						ProductId: oProduct.Id,
						CurrencyCode: oProduct.CurrencyCode,
						Product: oProduct.Name,
						Quantity: 1,
						ShoppingCartId: -1,
						SubTotal: oProduct.Price,
						Unit: oProduct.QuantityUnit
					};

					oResponseShoppingCartItem = jQuery.sap.sjax({
						url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCartItems('" + oNewItemData.Id + "')",
						type: "POST",
						data: JSON.stringify(oNewItemData)
					});
				}
				if (!oResponseShoppingCartItem.success) {
					bError = true;
					sErrorTxt = "Error: Mocking function import AddProductToShoppingCart failed";
					jQuery.sap.log.error("Error: Mocking function import AddProductToShoppingCart failed");
				}
			}
			// Update the new total quantity and total value on the shopping
			// cart
			if (!bError) {
				oShoppingCart.TotalQuantity = +oShoppingCart.TotalQuantity + 1;
				oShoppingCart.Total = +oShoppingCart.Total + +oProduct.Price;
				oResponseGetTotalQuantity = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)",
					type: "PUT",
					data: JSON.stringify(oShoppingCart)
				});
				if (!oResponseGetTotalQuantity.success) {
					bError = true;
					sErrorTxt = "Error: Could not update shopping cart mock data";
					jQuery.sap.log.error("Error: Could not update shopping cart mock data");
				}
			}
			if (bError) {
				oXhr.respond(400, null, sErrorTxt);
			} else {
				oXhr.respondJSON(200, {}, JSON.stringify({
					d: {
						ProductId: sProductId
					}
				}));
			}
		}
	};
};

nw.epm.refapps.ext.shop.model.mockRequests.mockBuyShoppingCart = function() {
	return {
		// This mock request simulates the function import "BuyShoppingCart",
		// which is triggered when the "Buy Now" button is chosen on the
		// Checkout view.
		// It removes all items from the shopping cart and sets the totals on
		// the shopping cart to 0.
		method: "POST",
		path: new RegExp("BuyShoppingCart"),
		response: function(oXhr) {
			var oResponseGetShoppingCartItems = null;
			var oResponseGetShoppingCart = null;
			var oResponsePutShoppingCart = null;
			var i, bError = false,
				sErrorTxt = "";

			// Get shopping cart
			oResponseGetShoppingCart = jQuery.sap.sjax({
				url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)",
				type: "GET"
			});
			if (oResponseGetShoppingCart.success) {
				var oNewShoppingCartData = oResponseGetShoppingCart.data.d;
				oNewShoppingCartData.Total = "0";
				oNewShoppingCartData.TotalQuantity = "0";
				oResponsePutShoppingCart = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)",
					type: "PUT",
					data: JSON.stringify(oNewShoppingCartData)
				});
				if (!oResponsePutShoppingCart.success) {
					jQuery.sap.log.error("Error: Could not update shopping cart mock data");
				}
			} else {
				// If this request fails, it means the mock data was set up
				// incorrectly or the mock server is not working.
				jQuery.sap.log.error("Error: shopping cart could not be read from mock data");
				sErrorTxt = "Error: shopping cart could not be read from mock data";
				bError = true;
			}

			if (!bError) {
				// Get all shopping cart items (the ID is needed to delete them
				// later on) Get shopping cart items
				oResponseGetShoppingCartItems = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)/ShoppingCartItems",
					type: "GET"
				});
				if (oResponseGetShoppingCartItems.success) {
					// Delete the shopping cart items from the shopping cart.
					var oDelResult = {};
					for (i = 0; i < oResponseGetShoppingCartItems.data.d.results.length; i++) {
						oDelResult = jQuery.sap.sjax({
							url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCartItems('" + oResponseGetShoppingCartItems.data.d.results[i].Id + "')",
							type: "DELETE"
						});
						if (!oDelResult.success) {
							jQuery.sap.log.error("Error: shopping cart items could not be removed from mock data");
							bError = true;
						}
					}

				} else {
					// If this request fails, it means the mock data was set up
					// incorrectly or the mock server is not working.
					jQuery.sap.log.error("Error: shopping cart items could not be read from mock data");
					sErrorTxt = "Error: shopping cart items could not be read from mock data";
					bError = true;
				}
			}

			if (!bError) {
				oXhr.respondJSON(200, {}, JSON.stringify({
					d: {
						results: []
					}
				}));
			} else {
				oXhr.respond(400, null, sErrorTxt);
			}
		}
	};
};

nw.epm.refapps.ext.shop.model.mockRequests.mockChangeItemQuantity = function() {
	// This mock request updates the totals on the shopping cart when the
	// quantity field in of a shopping cart item is manually changed. This
	// is necessary because the the calculation of the totals and the update
	// of the shopping cart is not directly triggered by a http request.
	// Instead the back end does it automatically during the processing of a
	// http merge request for a shopping cart item
	var oMockRequest = nw.epm.refapps.ext.shop.model.mockRequests._calcCartTotalsFromItems();
	oMockRequest.method = "MERGE";
	return oMockRequest;
};

nw.epm.refapps.ext.shop.model.mockRequests.mockWriteAReview = function() {
	// [KM]
	// This mock request is used when the a review is created.
	// The following actions are performed:
	// for Product:
	// - set the bHasOwnReview indicator to true
	// - calculate and set the new average rating
	// - increase the RatingCount 1
	// for ReviewAggregation:
	// - increase the counter corresponding to the new rating by 1
	// for Review
	// - replace the dummy id with a correct Id
	// - complete the review data
	return {
		method: "POST",
		path: new RegExp("Products(.*)\/Reviews"),
		response: function(oXhr, sUrlProductId) {
			var oDate = new Date(); // date object is needed to create time stamp for the newly created
			var sErrorTxt = "",
				bError = false;
			var oResponseGetReviewSummary = {};
			var oResponseReviewAggr = {};
			var sProductId = decodeURIComponent(sUrlProductId);
			sProductId = sProductId.substring(2, sProductId.length - 2);

			// extract the needed data from the Review collection:
			// average rating of the material, data of newly added review, IDs currently in use (needed
			// to find a new Id for the new rating)
			oResponseGetReviewSummary = nw.epm.refapps.ext.shop.model._getReviewSummaryForProduct(sProductId, true);
			bError = oResponseGetReviewSummary.bError;
			sErrorTxt = oResponseGetReviewSummary.sErrorTxt;

			if (!bError) {
				//update review aggregates - first get the old ReviewAggregate data
				oResponseReviewAggr = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ReviewAggregates(ProductId='" + sProductId +
						"', Rating=" + oResponseGetReviewSummary.oReviewSummary.oNewReview.Rating + ")",
					type: "GET"
				});
				if (!oResponseReviewAggr.success) {
					bError = true;
					sErrorTxt = "Error: 'ReviewAggregates' could not be read from mock data";
				}
			}

			if (!bError) {
				//update review aggregates - secondly increase the rating counter by one
				oResponseReviewAggr = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ReviewAggregates(ProductId='" + sProductId +
						"', Rating=" + oResponseGetReviewSummary.oReviewSummary.oNewReview.Rating + ")",
					type: "PATCH",
					data: JSON.stringify({
						RatingCount: oResponseReviewAggr.data.d.RatingCount + 1,
						Rating: oResponseReviewAggr.data.d.Rating
					})
				});
				if (!oResponseReviewAggr.success) {
					bError = true;
					sErrorTxt = "Error: Could not update 'ReviewAggregates' mock data";
				}
			}

			// new reviews are not automatically created with all needed data - fill the gaps
			if (!bError && oResponseGetReviewSummary.oReviewSummary.oNewReview) {
				var oResponseReviewPatch = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Reviews(guid'" + oResponseGetReviewSummary.oReviewSummary.oNewReview.Id + "')",
					type: "PATCH",
					data: JSON.stringify({
						Id: "AAAAAAAA-BBBB-CCCC-DDDD-" + nw.epm.refapps.ext.shop.model.mockRequests._getNewId(oResponseGetReviewSummary.oReviewSummary.aUsedIds,
							0, 999999999999),
						ChangedAt: "\/Date(" + oDate.getTime() + ")\/",
						HelpfulCount: 0,
						HelpfulForCurrentUser: false,
						IsReviewOfCurrentUser: true,
						UserDisplayName: "Test User"
					})
				});
				if (!oResponseReviewPatch.success) {
					bError = true;
					sErrorTxt = "Error: Could not update 'Reviews' mock data";
				}
			}

			if (!bError) {
				// Update the Product with the data of the new rating
				var oResponseProductUpdate = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Products" + decodeURIComponent(sUrlProductId),
					type: "PATCH",
					data: JSON.stringify({
						AverageRating: oResponseGetReviewSummary.oReviewSummary.fAverageRating,
						bHasOwnReview: true,
						RatingCount: oResponseGetReviewSummary.oReviewSummary.iRatingForProductCount
					})
				});
				if (!oResponseProductUpdate.success) {

					bError = true;
					sErrorTxt = "Error: Could not update mock data of product " + sProductId;
				}
			}
			if (bError) {
				oXhr.respond(400, null, sErrorTxt);
			} else {
				oXhr.respondJSON(204);
			}
		}
	};
};

nw.epm.refapps.ext.shop.model.mockRequests.mockRateAsHelpful = function() {
	// [KM]
	// This mock request is used when the "Rate as Helpful" button of a review
	// is pressed. It increases the "Helpful" count of the review by 1 and sets
	// the HelpfulForCurrentUser indicator to true
	return {
		method: "MERGE",
		path: new RegExp("Reviews(.*)"),
		response: function(oXhr, sUrlReviewId) {
			var oResponseGetReview = null;
			var oResponsePutReview = null;
			var sReviewId = decodeURIComponent(sUrlReviewId); // format:"(guid'...')"
			oResponseGetReview = jQuery.sap.sjax({
				url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Reviews" + sReviewId,
				type: "GET"
			});
			if (oResponseGetReview.success) {
				// update the model with the new "helpfulCount"
				var oNewReviewData = oResponseGetReview.data.d;
				oNewReviewData.HelpfulCount = oResponseGetReview.data.d.HelpfulCount + 1;
				oNewReviewData.HelpfulForCurrentUser = true;
				oResponsePutReview = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Reviews" + sReviewId,
					type: "PUT",
					data: JSON.stringify(oNewReviewData)
				});
				if (oResponsePutReview.success) {
					oXhr.respondJSON(204);
				} else {
					jQuery.sap.log.error("Error: Could not update review mock data");
					oXhr.respond(400, null, "Error: Could not update review mock data");
				}
			} else {
				// If this request fails, it means the mock data was set up
				// incorrectly or the mock server is not working.
				oXhr.respond(400, null, "Error: Review could not be read from mock data");
				jQuery.sap.log.error("Error: Review could not be read from mock data");
			}
		}
	};
};
nw.epm.refapps.ext.shop.model.mockRequests.getRequests = function() {
	return [nw.epm.refapps.ext.shop.model.mockRequests.mockAddProductToShoppingCart(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockBuyShoppingCart(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockDeleteItem(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockRateAsHelpful(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockWriteAReview(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockChangeItemQuantity(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockDeleteAReview(),
            nw.epm.refapps.ext.shop.model.mockRequests.mockChangeAReview()
            ];
};

// [KM]
// This Method creates random numbers to be used as fake Ids for shopping cart items and as
// part of fak guids for reviews. In mock mode the Ids do not really need to be unique. So 
// it is sufficient to use random numbers and check that the new number is not already in 
// use (not technically necessary but duplicate IDs would look strange)
// aIdsInUse - is an arry containing the already used Ids. It is used to check for uniquness
// iMinRansom (optional) - is the minimal value of the random number, default is 0
// iMaxRandom (optional) - is the maximum value of the random number, default is 1000000
// returns a random number as a string
nw.epm.refapps.ext.shop.model.mockRequests._getNewId = function(aIdsInUse, iMinRandom, iMaxRandom) {
	var sNewId = null,
		i = 0,
		iMin = 0,
		iMax = 1000000;

	if (iMinRandom) {
		iMin = iMinRandom;
	}
	if (iMaxRandom) {
		iMax = iMaxRandom;
	}

	while (i < 100 && (sNewId === null || aIdsInUse.indexOf(sNewId) !== -1)) {
		sNewId = (Math.floor(Math.random() * (iMax - iMin + 1)) + iMin).toString();
		i++;
	}
	return sNewId;
};

nw.epm.refapps.ext.shop.model.mockRequests._calcCartTotalsFromItems = function() {
	// [KM]
	// In this mock function request the total on the shopping cart are updated
	// by adding up the the values of the shopping cart items. The http method
	// is not yet defined because the same logic is needed for "MERGE" and
	// "DELETE" calls. See function "mockDeleteItem" and
	// "mockChangeItemQuantity"
	return {
		path: new RegExp("ShoppingCartItems(.*)"),
		response: function(oXhr, sUrlShoppingCartItemId) {
			var i = 0,
				sErrorTxt = "",
				bError = false;
			var fTotalValue = 0;
			var fTotalQuantity = 0;
			var oResponseGetShoppingCartItems = null;
			var oResponseGetShoppingCart = null;
			var oResponsePutShoppingCart = null;
			var sShoppingCartItemId = decodeURIComponent(sUrlShoppingCartItemId);
			sShoppingCartItemId = sShoppingCartItemId.substring(2, sShoppingCartItemId.length - 2);

			// Get shopping cart items
			oResponseGetShoppingCartItems = jQuery.sap.sjax({
				url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)/ShoppingCartItems",
				type: "GET"
			});
			if (oResponseGetShoppingCartItems.success) {
				// Use the remaining items to add up the totals
				if (oResponseGetShoppingCartItems.data.d.results) {
					for (i = 0; i < oResponseGetShoppingCartItems.data.d.results.length; i++) {
						fTotalValue = fTotalValue + +oResponseGetShoppingCartItems.data.d.results[i].SubTotal;
						fTotalQuantity = fTotalQuantity + +oResponseGetShoppingCartItems.data.d.results[i].Quantity;
					}
				} else {
					// There is no item left so the totals are 0
					fTotalValue = 0;
					fTotalQuantity = 0;
				}
			} else {
				// If this request fails, it means the mock data was set up
				// incorrectly or the mock server is not working.
				jQuery.sap.log.error("Error: shopping cart items could not be read from mock data");
				bError = true;
				sErrorTxt = "Error: shopping cart items could not be read from mock data";
			}

			if (!bError) {
				// Get shopping cart
				oResponseGetShoppingCart = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)",
					type: "GET"
				});
				if (!oResponseGetShoppingCart.success) {
					bError = true;
					sErrorTxt = "Error: shopping cart could not be read from mock data";
				}
			}
			if (!bError) {
				var oNewShoppingCartData = oResponseGetShoppingCart.data.d;
				oNewShoppingCartData.Total = fTotalValue.toString();
				oNewShoppingCartData.TotalQuantity = fTotalQuantity.toString();
				oResponsePutShoppingCart = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ShoppingCarts(-1)",
					type: "PUT",
					data: JSON.stringify(oNewShoppingCartData)
				});
				if (!oResponsePutShoppingCart.success) {
					jQuery.sap.log.error("Error: Could not update shopping cart mock data");
					bError = true;
					sErrorTxt = "Error: Could not update shopping cart mock data";
				}
			}
			if (bError) {
				oXhr.respond(400, null, sErrorTxt);
			} else {
				oXhr.respondJSON(204);
			}
		}
	};
};
// The following actions need to be performed by the mock request function when a review 
// is deleted:
// - update the RatingCount and the AverageRating of the product
// - update the RatingCount of the ReviewAggregate
// since the content of the deleted review is not known anymore it is not possible to tell
// what product and what ReviewAggregate need updates. So Therefore the values have to be 
// recalculated for all products and all ReviewAggregates
nw.epm.refapps.ext.shop.model.mockRequests.mockDeleteAReview = function() {
	return {
		method: "DELETE",
		path: new RegExp("Reviews(.*)"),
		response: function(oXhr) {
			var i = 0,
				j = 0,
				sErrorTxt = "",
				bError = false;
			var sProductId = "";
			var oResponseGetReviewSummary = {};
			var oResponseGetProducts = {};
			var oResponseMergeProducts = {};
			var oResponseMergeReviewAggr = {};

			//1. get all Products
			oResponseGetProducts = jQuery.sap.sjax({
				url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Products",
				type: "GET"
			});
			if (!oResponseGetProducts.success) {
				bError = true;
				sErrorTxt = "";
			}

			//2. _getReviewSummaryForProduct for each Product
			while (i < oResponseGetProducts.data.d.results.length && bError === false) {
				// for (i = 0; i < oResponseGetProducts.data.d.results.length; i++) {
				sProductId = oResponseGetProducts.data.d.results[i].Id;
				oResponseGetReviewSummary = nw.epm.refapps.ext.shop.model._getReviewSummaryForProduct(sProductId);
				//      update the product with the data
				if (oResponseGetReviewSummary.bError) {
					bError = oResponseGetReviewSummary.bError;
					sErrorTxt = oResponseGetReviewSummary.sErrorTxt;
				}
				if (!bError) {
					oResponseMergeProducts = jQuery.sap.sjax({
						url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Products('" + sProductId + "')",
						type: "MERGE",
						data: JSON.stringify({
							RatingCount: oResponseGetReviewSummary.oReviewSummary.iRatingForProductCount,
							AverageRating: oResponseGetReviewSummary.oReviewSummary.fAverageRating
						})
					});
					if (!oResponseMergeProducts.success) {
						bError = true;
						sErrorTxt = "";
					}
				}

				// update the ReviewAggregate
				j = 0; // reset counter
				while (j < 5 && bError === false) {
					oResponseMergeReviewAggr = jQuery.sap.sjax({
						url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ReviewAggregates(ProductId='" + sProductId +
							"', Rating=" + (j + 1).toString() + ")",
						type: "MERGE",
						data: JSON.stringify({
							RatingCount: oResponseGetReviewSummary.oReviewSummary.aReviewAggregate[j],
							Rating: j + 1
						})
					});
					if (!oResponseMergeReviewAggr.success) {
						bError = true;
						sErrorTxt = "";
					}
					j++;
				}
				i++;
			}

			if (bError) {
				oXhr.respond(400, null, sErrorTxt);
			} else {
				oXhr.respondJSON(204);
			}
		}
	};
};

nw.epm.refapps.ext.shop.model.mockRequests.mockChangeAReview = function() {
	// [KM]
	// This mock request is used when the a review is changed.
	// The following actions are performed:
	// for Product:
	// - calculate and set the new average rating
	// for ReviewAggregation:
	// - update the number of ratings ()
	return {
		method: "PUT",
		path: new RegExp("Reviews(.*)"),
		// path : new RegExp("Reviews"),
		response: function(oXhr, sUrlRatingGuid) {
			var sErrorTxt = "",
				bError = false;
			var oResponseReviewAggregatesMerge = {};
			var sRatingGuid = decodeURIComponent(sUrlRatingGuid);
			sRatingGuid = sRatingGuid.substring(2, sRatingGuid.length - 2);
			var oResponseGetRating = {};
			var sProductId = "";
			var oResponseGetReviewSummary = {};

			// get the product id of the changed rating
			oResponseGetRating = jQuery.sap.sjax({
				url: oXhr.url,
				type: "GET"
			});
			if (oResponseGetRating.success) {
				sProductId = oResponseGetRating.data.d.ProductId;
			} else {
				bError = true;
				sErrorTxt = "Error: Reading 'Reviews' from mock data failed";
			}

			if (!bError) {
				// evaluate all ratings for the product in order to get the new average rating
				oResponseGetReviewSummary = nw.epm.refapps.ext.shop.model._getReviewSummaryForProduct(sProductId);
				bError = oResponseGetReviewSummary.bError;
				sErrorTxt = oResponseGetReviewSummary.sErrorTxt;
			}

			if (!bError) {
				//update review aggregates 
				for (var j = 0; j < 5; j++) {
					oResponseReviewAggregatesMerge = jQuery.sap.sjax({
						url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/ReviewAggregates(ProductId='" + sProductId +
							"', Rating=" + (j + 1).toString() + ")",
						type: "MERGE",
						data: JSON.stringify({
							RatingCount: oResponseGetReviewSummary.oReviewSummary.aReviewAggregate[j],
							Rating: j + 1
						})
					});
					if (!oResponseReviewAggregatesMerge.success) {
						bError = true;
						sErrorTxt = "Error: Updating 'ReviewAggregates' from mock data failed";
					}
				}
			}

			if (!bError) {
				// Update the Product with the data of the new rating
				var oResponseProductPatch = jQuery.sap.sjax({
					url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Products('" + sProductId + "')",
					type: "PATCH",
					data: JSON.stringify({
						AverageRating: oResponseGetReviewSummary.oReviewSummary.fAverageRating
					})
				});
				if (!oResponseProductPatch.success) {
					bError = true;
					sErrorTxt = "Error: Updating product " + sProductId + "from mock data failed";
				}
			}

			if (bError) {
				oXhr.respond(400, null, sErrorTxt);
			} else {
				oXhr.respondJSON(204);
			}

		}
	};
};
// This method is used to collect data from all reviews or for reviews of a given product.
// sProductId is the product to collect the data for
// bCollectIds (optional) if it is set to true all used review ids are collected
// An object containing the following data is returned:
//		aUsedIds (optional) - an array containing the used Review Ids
//		fAverageRating - the average rating for the product
//		iRatingForProductCount - the number of existing ratings for the product
//		oNewReview - the data of a newly created review (with Id = "0") or null if no new
//                      review exists
//		aReviewAggregate - array with 5 elements, the first element contains the number 
//                      of ratings with one star, the second one the number of ratings with 2 stars, ...
nw.epm.refapps.ext.shop.model._getReviewSummaryForProduct = function(sProductId, bCollectIds) {
	var i = 0,
		sErrorTxt = "",
		bError = false;
	var iRatingSum = 0;
	var oResponseGetReview = {};
	var oReviewSummary = {
		aUsedIds: [],
		fAverageRating: 0,
		iRatingForProductCount: 0,
		oNewReview: null,
		aReviewAggregate: [0, 0, 0, 0, 0]
	};
	var rGuidPattern = /.*-.*-.*-.*-.*/; //regular expression matching the pattern of review guids

	// if the used Ids need to be collected all reviews have to
	// be read otherwise it is enough to evaluate the reviews 
	// for the given product in order to calculate the new average
	// rating + ratingCount
	if (bCollectIds) {
		oResponseGetReview = jQuery.sap.sjax({
			url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Reviews",
			type: "GET"
		});
	} else {
		oResponseGetReview = jQuery.sap.sjax({
			url: "/sap/opu/odata/sap/EPM_REF_APPS_SHOP_SRV/Products('" + sProductId + "')/Reviews",
			type: "GET"
		});
	}
	if (oResponseGetReview.success) {
		// loop through all reviews to:
		// - find the new review 
		// - calculate the new average rating
		// - find all used Ids
		// - collect the ratings for sProductId to build the ReviewAggregate object
		for (i = 0; i < oResponseGetReview.data.d.results.length; i++) {
			oReviewSummary.aUsedIds.push(oResponseGetReview.data.d.results[i].Id.substring(24, 36));
			if (sProductId === oResponseGetReview.data.d.results[i].ProductId) {
				iRatingSum = iRatingSum + oResponseGetReview.data.d.results[i].Rating;
				oReviewSummary.iRatingForProductCount++;
				oReviewSummary.aReviewAggregate[oResponseGetReview.data.d.results[i].Rating - 1]++;
			}
			// newly created reviews have an intermediate key that does not contain yet the "-" of the a guid 
			if (!rGuidPattern.test(oResponseGetReview.data.d.results[i].Id)) {
				oReviewSummary.oNewReview = oResponseGetReview.data.d.results[i];
			}
		}
		if (oReviewSummary.iRatingForProductCount === 0) {
			oReviewSummary.fAverageRating = 0;
		} else {
			oReviewSummary.fAverageRating = iRatingSum / oReviewSummary.iRatingForProductCount;
		}
	} else {
		// If this request fails, it means the mock data was set up
		// incorrectly or the mock server is not working.
		bError = true;
		sErrorTxt = "Error: Reading 'Reviews' from mock data failed";
		jQuery.sap.log.error("Error: Reading 'Reviews' from mock data failed");
	}
	return {
		oReviewSummary: oReviewSummary,
		bError: bError,
		sErrorTxt: sErrorTxt
	};
};