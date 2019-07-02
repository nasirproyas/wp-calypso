/** @format */

/**
 * External dependencies
 */
import { loadScript } from '@automattic/load-script';
import debugFactory from 'debug';
import React, { useEffect } from 'react';
import { localize } from 'i18n-calypso';

const debug = debugFactory( 'calypso:stripe-elements-payment-box' );

// TODO: move this to somewhere else
const stripeJsUrl = 'https://js.stripe.com/v3/';

function useStripeJs( url ) {
	useEffect( () => {
		if ( window.Stripe ) {
			debug( 'stripe.js already loaded' );
			return;
		}
		debug( 'loading stripe.js...' );
		loadScript( url, function( error ) {
			if ( error ) {
				debug( 'stripe.js script ' + error.src + ' failed to load.' );
				return;
			}
			debug( 'stripe.js loaded!' );
		} );
	}, [ url ] );
}

export function StripeElementsPaymentBox() {
	useStripeJs( stripeJsUrl );
	return <em>Stripe stuff here</em>;
}

export default localize( StripeElementsPaymentBox );
