/** @format */

/**
 * External dependencies
 */
import { loadScript } from '@automattic/load-script';
import debugFactory from 'debug';
import React, { useEffect, useState } from 'react';
import { localize } from 'i18n-calypso';
import { StripeProvider, Elements, injectStripe, CardElement } from 'react-stripe-elements';

const debug = debugFactory( 'calypso:stripe-elements-payment-box' );

// TODO: move this to somewhere else
const stripeJsUrl = 'https://js.stripe.com/v3/';
// TODO: move this to somewhere else
const stripeApiKey = 'pk_test_12345';

function useStripeJs( url, apiKey ) {
	const [ stripeJs, setStripeJs ] = useState( null );
	useEffect( () => {
		if ( window.Stripe ) {
			debug( 'stripe.js already loaded' );
			setStripeJs( window.Stripe( apiKey ) );
			return;
		}
		debug( 'loading stripe.js...' );
		loadScript( url, function( error ) {
			if ( error ) {
				debug( 'stripe.js script ' + error.src + ' failed to load.' );
				return;
			}
			debug( 'stripe.js loaded!' );
			setStripeJs( window.Stripe( apiKey ) );
		} );
	}, [ url, apiKey ] );
	return stripeJs;
}

async function submitPaymentForm( stripe ) {
	debug( 'creating payment method...' );
	const { paymentMethod, error } = await stripe.createPaymentMethod();
	debug( 'payment method creation complete', paymentMethod, error );
	// TODO: handle errors
	// TODO: send paymentMethod to server
}

function StripeElementsForm( { stripe } ) {
	const handleSubmit = event => {
		event.preventDefault();
		debug( 'ready to submit form' );
		submitPaymentForm( stripe );
	};
	/* eslint-disable jsx-a11y/label-has-associated-control */
	// TODO: add the rest of the form fields
	// TODO: add total payment amount
	return (
		<form onSubmit={ handleSubmit }>
			<label>
				Card details
				<CardElement />
			</label>
			<button className="stripe-elements-payment-box__pay-button">Pay</button>
		</form>
	);
	/* eslint-enable jsx-a11y/label-has-associated-control */
}

const InjectedStripeElementsForm = injectStripe( StripeElementsForm );

export function StripeElementsPaymentBox() {
	const stripeJs = useStripeJs( stripeJsUrl, stripeApiKey );
	return (
		<StripeProvider stripe={ stripeJs }>
			<Elements>
				<InjectedStripeElementsForm />
			</Elements>
		</StripeProvider>
	);
}

export default localize( StripeElementsPaymentBox );
