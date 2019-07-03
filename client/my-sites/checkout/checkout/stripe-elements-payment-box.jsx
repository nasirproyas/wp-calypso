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

async function submitPaymentForm( stripe, paymentDetails ) {
	debug( 'creating payment method...', paymentDetails );
	const { paymentMethod, error } = await stripe.createPaymentMethod( 'card', {
		billing_details: paymentDetails,
	} );
	debug( 'payment method creation complete', paymentMethod, error );
	// TODO: handle errors
	// TODO: send paymentMethod to server
}

function StripeElementsForm( { stripe, cart } ) {
	const [ cardholderName, setCardholderName ] = useState( '' );
	const onNameChange = event => setCardholderName( event.target.value );
	const handleSubmit = event => {
		event.preventDefault();
		submitPaymentForm( stripe, {
			name: cardholderName,
		} );
	};

	/* eslint-disable jsx-a11y/label-has-associated-control */
	// TODO: add country
	// TODO: add subscription length toggle
	// TODO: add TOS
	// TODO: add chat help link
	// TODO: localize these strings
	return (
		<form onSubmit={ handleSubmit }>
			<label>
				Cardholder Name (as written on card)
				<input
					type="text"
					placeholder="Jane Doe"
					value={ cardholderName }
					onChange={ onNameChange }
					required
				/>
			</label>
			<label>
				Card Details
				<CardElement />
			</label>
			<button className="stripe-elements-payment-box__pay-button">
				Pay { cart.total_cost_display }
			</button>
		</form>
	);
	/* eslint-enable jsx-a11y/label-has-associated-control */
}

const InjectedStripeElementsForm = injectStripe( StripeElementsForm );

export function StripeElementsPaymentBox( { cart } ) {
	const stripeJs = useStripeJs( stripeJsUrl, stripeApiKey );
	return (
		<StripeProvider stripe={ stripeJs }>
			<Elements>
				<InjectedStripeElementsForm cart={ cart } />
			</Elements>
		</StripeProvider>
	);
}

export default localize( StripeElementsPaymentBox );
